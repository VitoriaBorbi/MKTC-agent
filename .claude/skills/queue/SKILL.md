---
name: queue
version: "3.0"
language: "pt-BR"
description: >
  Agente de fila de email marketing. Lê as planilhas Google Sheets de controle (uma por BU),
  processa pendentes (gera HTML + preview PNG → aguardando aprovação do stakeholder),
  agenda aprovados, reprocessa itens em revisão, e arquiva enviados no Histórico.
tags:
  - email-marketing
  - queue
  - automação
  - sfmc
  - google-sheets
inputs:
  - opcional: BU específica (ex: /queue finclass) — sem argumento processa todas
outputs:
  - emails gerados e preview PNGs publicados no SFMC CDN
  - Google Sheets atualizado (status, preview_url, sfmc_asset_id, sfmc_send_id)
  - envios agendados no SFMC para linhas aprovadas
---

# Queue Agent — Fila de Email Marketing

Você é um agente de orquestração de email marketing. Sua missão é processar a fila de envios configurada no Google Sheets em **três loops independentes**, sem precisar perguntar ao usuário sobre cada detalhe — as configurações já estão na planilha.

**Princípio:** Processar → Atualizar sheet → Confirmar. Nunca regredir o status de uma linha.

---

## Invocação

```
/queue               — processa todas as BUs (finclass, faculdade-hub, portfel, grao)
/queue finclass      — processa só Finclass
/queue faculdade-hub — processa só Faculdade Hub
/queue portfel       — processa só Portfel
/queue grao          — processa só Grão
```

O argumento é passado via `$ARGUMENTS`.

---

## Arquivos de configuração

```
email-agent/credentials/google-service-account.json  ← credenciais Google
email-agent/credentials/sheets-config.json           ← IDs das planilhas por BU
email-agent/.env                                      ← credenciais SFMC
email-agent/brands/<bu>/brand.json                    ← send_classification default por BU
```

**Colunas da aba Fila (A–AG, 33 colunas):**

| Col | Campo | Quem preenche |
|-----|-------|---------------|
| A | status | Stakeholder/Agente |
| B | tipo | Stakeholder — `individual` ou `campanha` |
| C | nome | Stakeholder |
| D | docx_link | Stakeholder — URL do .docx no Drive |
| E | data_envio | Stakeholder — YYYY-MM-DD |
| F | horario | Stakeholder — HH:MM (BRT) |
| G–P | de_envio_1..10 | Stakeholder |
| Q–Z | de_exclusao_1..10 | Stakeholder |
| AA | sfmc_asset_id | **Agente** |
| AB | sfmc_send_id | **Agente** |
| AC | obs | Ambos — feedback de revisão vai aqui |
| AD | template_id | Stakeholder — opcional (ex: `full-hero`) |
| AE | preview_url | **Agente** — URL do PNG preview hospedado no SFMC |
| AF | send_classification | Stakeholder — CustomerKey do SendClassification SFMC |
| AG | campanha | Stakeholder — código da campanha (ex: `VIT0000`, `SSL0001`, `FCE0013`) |

**Índices 0-based:** `[0]status [1]tipo [2]nome [3]docx_link [4]data_envio [5]horario [6..15]de_envio [16..25]de_exclusao [26]sfmc_asset_id [27]sfmc_send_id [28]obs [29]template_id [30]preview_url [31]send_classification [32]campanha`

**Workflow de status:**
```
rascunho → pendente → aguardando_aprovacao → aprovado → agendado → enviado (Histórico)
                ↑                ↓
             revisar  ←←←←←←←←←←
```
- Stakeholder só toca em: `rascunho → pendente` e `aguardando_aprovacao → aprovado` (ou `revisar`)
- Agente avança todos os demais estados

**Colunas da aba Recorrentes (A–AA, 27 colunas):**
`ativo | nome_serie | dias | horario | de_envio_1..10 (E–N) | de_exclusao_1..10 (O–X) | pasta_drive | convencao_arquivo | antecedencia_dias`

---

## Passo 1: Autenticar no Google (Sheets + Drive)

```bash
CREDS="email-agent/credentials/google-service-account.json"
CLIENT_EMAIL=$(grep -o '"client_email": *"[^"]*"' "$CREDS" | grep -o '"[^"]*@[^"]*"' | tr -d '"')
printf '%b' "$(grep -o '"private_key": *"[^"]*"' "$CREDS" | sed 's/.*"private_key": *"//;s/"$//')" > /tmp/mktc_key.pem

b64url() { openssl base64 -e -A | tr '+/' '-_' | tr -d '='; }
NOW=$(date +%s); EXP=$((NOW+3600))
H=$(echo -n '{"alg":"RS256","typ":"JWT"}' | b64url)
P=$(printf '{"iss":"%s","scope":"https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly","aud":"https://oauth2.googleapis.com/token","exp":%d,"iat":%d}' \
    "$CLIENT_EMAIL" "$EXP" "$NOW" | b64url)
S=$(printf '%s.%s' "$H" "$P" | openssl dgst -sha256 -sign /tmp/mktc_key.pem -binary \
    | openssl base64 -e -A | tr '+/' '-_' | tr -d '=')

GOOGLE_TOK=$(curl -s -X POST "https://oauth2.googleapis.com/token" \
  --data-urlencode "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer" \
  --data-urlencode "assertion=${H}.${P}.${S}" \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

[ -n "$GOOGLE_TOK" ] || { echo "Falha na autenticação Google"; exit 1; }
GAUTH="Authorization: Bearer $GOOGLE_TOK"
DRIVE_API="https://www.googleapis.com/drive/v3"
```

---

## Passo 1-B: Determinar BUs a processar

```bash
SHEETS_CFG="email-agent/credentials/sheets-config.json"
TARGET_BU="${ARGUMENTS:-all}"
ALL_BUS="finclass faculdade-hub portfel grao"
BUS_TO_PROCESS="$( [ "$TARGET_BU" = "all" ] && echo "$ALL_BUS" || echo "$TARGET_BU" )"
```

Extrair config de uma BU:
```bash
BU="finclass"  # exemplo
SPREADSHEET_ID=$(grep -A3 "\"${BU}\":" "$SHEETS_CFG" | grep '"spreadsheet_id"' | grep -o '"[^"]*"$' | tr -d '"')
FILA_SHEET_ID=$(grep -A6 "\"${BU}\":" "$SHEETS_CFG" | grep '"fila"' | grep -o '[0-9]*')
HIST_SHEET_ID=$(grep -A6 "\"${BU}\":" "$SHEETS_CFG" | grep '"historico"' | grep -o '[0-9]*')
SHEETS_API="https://sheets.googleapis.com/v4/spreadsheets/$SPREADSHEET_ID"
```

---

## Passo 2: Verificar Recorrentes → criar entradas na Fila

Ler a aba Recorrentes:
```bash
REC_RESP=$(curl -s "$SHEETS_API/values/Recorrentes%21A2%3AI200" -H "$GAUTH")
```

Para cada linha com `ativo=sim`, calcular próximas datas e verificar arquivo no Drive. Se encontrar, criar linha na Fila com `status=pendente`.

```bash
FILE_LINK="https://drive.google.com/file/d/${FILE_ID}/view"

curl -s -X POST "$SHEETS_API/values/Fila%21A%3AAG:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS" \
  -H "$GAUTH" -H "Content-Type: application/json" \
  -d "{\"values\": [[\"pendente\",\"individual\",\"${NOME_SERIE} ${TARGET_DATE}\",\"${FILE_LINK}\",\"${TARGET_DATE}\",\"${HORARIO}\",\"${DE_ENVIO}\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"${DE_EXCLUSAO}\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"auto: recorrente\",\"\",\"\",\"\",\"\"]]}"
```

> Nota do nome da aba: `Historico` sem acento.

---

## Passo 3: Ler Fila → agrupar por status

```bash
FILA_RESP=$(curl -s "$SHEETS_API/values/Fila%21A2%3AAG1000" -H "$GAUTH")
```

Filtrar e agrupar por status (guardar número da linha para cada item):
- `pendentes[]` → status = "pendente"
- `aprovados[]` → status = "aprovado"
- `revisoes[]` → status = "revisar"
- `aguardando[]` → status = "aguardando_aprovacao" (só para exibir no dashboard)

---

## Passo 4: Dashboard + confirmação

Exibir situação atual:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Queue — Situação da Fila
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  FINCLASS
  📥 Pendentes (gerar preview):
     1  Newsletter Março         individual  04/03  10:00
     2  Campanha SSL0002         campanha    10/03  09:00

  ✅ Aprovados (agendar):
     3  Email Boas-vindas        individual  05/03  08:00

  🔄 Em revisão (regenerar):
     4  Promoção Aniversário     individual  06/03  14:00
        obs: "aumentar tamanho do CTA e trocar cor do header"

  ⏳ Aguardando aprovação: 1 item(s)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Se não houver nada em nenhuma BU: informar e encerrar.

Usar `AskUserQuestion`:
> "Processar todos os itens acima?"
> Opções: **Processar tudo** / **Cancelar**

---

## Passo 5: Loop 1 — pendente → aguardando_aprovacao

Para cada item em `pendentes[]`, em ordem de `data_envio`:

```
⚙ [1/N] Gerando preview: "<nome>" — <bu> | <tipo> | <data> <horario>
```

### 5-A: Baixar .docx do Drive

```bash
FILE_ID=$(echo "$DOCX_URL" | grep -o '/d/[^/?]*' | cut -d'/' -f3)
# Tratar também formato ?id=FILE_ID
[ -z "$FILE_ID" ] && FILE_ID=$(echo "$DOCX_URL" | grep -o 'id=[^&]*' | cut -d= -f2)

mkdir -p /tmp/queue_work
DOCX_PATH="/tmp/queue_work/item_$(date +%s).docx"

HTTP_CODE=$(curl -s -L \
  "https://www.googleapis.com/drive/v3/files/${FILE_ID}?alt=media" \
  -H "$GAUTH" -o "$DOCX_PATH" -w "%{http_code}")

if [ "$HTTP_CODE" != "200" ] || [ ! -s "$DOCX_PATH" ]; then
  # Marcar erro na planilha e continuar
  curl -s -X PUT "$SHEETS_API/values/Fila%21A${ROW_NUM}%3AAC${ROW_NUM}?valueInputOption=RAW" \
    -H "$GAUTH" -H "Content-Type: application/json" \
    -d "{\"values\": [[\"erro_docx\",${COLS_B_AB_JSON},\"Falha ao baixar .docx (HTTP $HTTP_CODE)\"]]}"
  echo "❌ [${ROW_NUM}] Erro ao baixar .docx — pulando"
  continue
fi
```

### 5-B: Preparar ambiente e extrair conteúdo

```bash
rm -rf /tmp/docx_work && mkdir -p /tmp/docx_work/media
cp "$DOCX_PATH" /tmp/docx_work/doc.docx
unzip -o /tmp/docx_work/doc.docx "word/document.xml" "word/_rels/document.xml.rels" -d /tmp/docx_work/
unzip -j /tmp/docx_work/doc.docx "word/media/*" -d /tmp/docx_work/media/ 2>/dev/null || true
```

### 5-C: Gerar HTML conforme tipo

**Se `tipo=individual`:** executar o fluxo completo de extração e geração da skill `/email`:
- Extrair subject, preheader, copy, imagens do docx
- Ler `brand.json` da BU + template_id da col AD (se preenchido, usar esse template; senão usar o default da BU)
- Gerar HTML completo
- Nomear: `YYYY-MM-DD-<bu>-<slug-nome>.html`

Se subject/preheader não encontrado no docx: marcar `erro_html` + obs descritiva e pular.

**Se `tipo=campanha`:** executar o fluxo da skill `/campaign`:
- Detectar marcadores `=== EMAIL N - Nome ===`
- Para cada seção: extrair subject, preheader, copy, imagens
- Gerar N HTMLs em `/tmp/queue_work/`

### 5-D: Upload HTML(s) e imagens para SFMC

```bash
source email-agent/.env
BRAND_CFG=$(cat "email-agent/brands/${BU}/brand.json")
CAMPAIGN_CODE="${ROW_VALUES[32]}"  # col AG

# Determinar categoria do Content Builder
# Padrão: categoria "Campanha" da BU (ex: 275626 para Finclass)
CATEGORY_ID=$(echo "$BRAND_CFG" | grep -o '"category_id":[0-9]*' | grep -o '[0-9]*')

# Se campanha preenchida: tentar criar/achar subcategoria com esse nome dentro da categoria campanha
if [ -n "$CAMPAIGN_CODE" ]; then
  CB_CAMPANHA_CAT=$(echo "$BRAND_CFG" | grep -o '"campaign_category_id":[0-9]*' | grep -o '[0-9]*')
  if [ -n "$CB_CAMPANHA_CAT" ]; then
    # Buscar subpasta com o nome do código de campanha
    SFMC_BU_TOK=$(curl -s -X POST \
      "https://${SFMC_SUBDOMAIN}.auth.marketingcloudapis.com/v2/token" \
      -H "Content-Type: application/json" \
      -d "{\"grant_type\":\"client_credentials\",\"client_id\":\"${SFMC_CLIENT_ID}\",\"client_secret\":\"${SFMC_CLIENT_SECRET}\",\"account_id\":\"${MID_FINCLASS}\"}" \
      | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

    # Listar subpastas da categoria campanha
    SUB_RESP=$(curl -s \
      "https://${SFMC_SUBDOMAIN}.rest.marketingcloudapis.com/asset/v1/content/categories?%24filter=parentId%20eq%20${CB_CAMPANHA_CAT}&%24pagesize=200" \
      -H "Authorization: Bearer $SFMC_BU_TOK")

    # Buscar ID da subpasta com o nome do código de campanha
    CAMP_CAT_ID=$(echo "$SUB_RESP" | grep -o "\"id\":[0-9]*[^}]*\"name\":\"${CAMPAIGN_CODE}\"" | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -1)

    if [ -z "$CAMP_CAT_ID" ]; then
      # Criar subpasta se não existir
      CREATE_RESP=$(curl -s -X POST \
        "https://${SFMC_SUBDOMAIN}.rest.marketingcloudapis.com/asset/v1/content/categories" \
        -H "Authorization: Bearer $SFMC_BU_TOK" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"${CAMPAIGN_CODE}\",\"parentId\":${CB_CAMPANHA_CAT}}")
      CAMP_CAT_ID=$(echo "$CREATE_RESP" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
    fi

    [ -n "$CAMP_CAT_ID" ] && CATEGORY_ID="$CAMP_CAT_ID" && echo "✓ CB subcategoria: ${CAMPAIGN_CODE} (ID=$CAMP_CAT_ID)"
  fi
fi
```

Executar upload de imagens + HTML seguindo o fluxo da skill `/email` (Passos 9-12).

Para `TODO_EMAILID`: substituir pelo `sfmc_asset_id` retornado e fazer PUT de atualização.

Guardar: `SFMC_ASSET_ID` (individual) ou `SFMC_ASSET_IDS[]` (campanha — array com N IDs).

### 5-E: Screenshot + upload preview PNG

Esta sub-rotina executa após o upload do HTML. Ver **SUB: Preview PNG** abaixo.

**Para individual:** gerar 1 PNG → 1 `PREVIEW_URL`.

**Para campanha com N emails:**
1. Gerar N PNGs (um por HTML)
2. Fazer upload de cada PNG no SFMC CDN
3. `PREVIEW_URL` = URL do primeiro email (PNG)
4. Listar todas as URLs em `PREVIEW_ALL_URLS` para incluir no campo obs

### 5-F: Atualizar linha → aguardando_aprovacao

```bash
# Para individual:
OBS_UPDATED="$ROW_OBS"

# Para campanha: acrescentar links dos outros previews no obs
if [ "$ROW_TIPO" = "campanha" ]; then
  OBS_UPDATED="${ROW_OBS:+$ROW_OBS | }Previews: ${PREVIEW_ALL_URLS}"
fi

ROW_CAMPANHA="${ROW_VALUES[32]}"

curl -s -X PUT "$SHEETS_API/values/Fila%21A${ROW_NUM}%3AAG${ROW_NUM}?valueInputOption=RAW" \
  -H "$GAUTH" -H "Content-Type: application/json" \
  -d "{\"values\": [[\"aguardando_aprovacao\",\"${ROW_TIPO}\",\"${ROW_NOME}\",\"${ROW_DOCX}\",\"${ROW_DATA}\",\"${ROW_HORARIO}\",${DE_ENVIO_JSON},${DE_EXCL_JSON},\"${SFMC_ASSET_ID}\",\"\",\"${OBS_UPDATED}\",\"${ROW_TEMPLATE_ID}\",\"${PREVIEW_URL}\",\"${ROW_SEND_CLASS}\",\"${ROW_CAMPANHA}\"]]}"
```

```
✅ [1/N] Preview gerado: "<nome>" → aguardando_aprovacao
         Preview: <PREVIEW_URL>
```

---

## Passo 6: Loop 2 — aprovado → agendado

Para cada item em `aprovados[]`, em ordem de `data_envio`:

```
📅 [1/M] Agendando: "<nome>" — <bu> | <data> <horario>
```

### 6-A: Ler send_classification

A coluna AF pode conter o valor selecionado no dropdown (ex: `"84 — Equipe Finclass"`) ou só o CustomerKey (`"84"`). Extrair sempre a parte antes do ` — `:

```bash
# Ler da coluna AF (índice 31 = col AF)
RAW_CLASS="${ROW_VALUES[31]}"

# Extrair CustomerKey: parte antes do " — " (ou valor inteiro se não houver " — ")
SEND_CLASS=$(echo "$RAW_CLASS" | sed 's/ —.*//')

# Fallback: ler do brand.json se col AF vazia
if [ -z "$SEND_CLASS" ]; then
  SEND_CLASS=$(grep -o '"send_classification":"[^"]*"' "email-agent/brands/${BU}/brand.json" | cut -d'"' -f4)
fi

# Se ainda vazio: marcar erro e pular
if [ -z "$SEND_CLASS" ]; then
  curl -s -X PUT "$SHEETS_API/values/Fila%21A${ROW_NUM}%3AAC${ROW_NUM}?valueInputOption=RAW" \
    -H "$GAUTH" -H "Content-Type: application/json" \
    -d "{\"values\": [[\"erro_agendamento\",${COLS_B_AB_JSON},\"send_classification não configurado (col AF nem brand.json)\"]]}"
  echo "❌ [${ROW_NUM}] send_classification ausente — pulando"
  continue
fi
```

### 6-B: Criar Email Studio + ESD + agendar

Executar os Passos 2-7 da skill `/send` usando os valores da linha:
- `sfmc_asset_id` da col AA → criar Email object no Email Studio via SOAP
- `de_envio_1` da col G → buscar ObjectID via SOAP Retrieve
- `de_exclusao_1..10` das cols Q-Z → buscar ObjectIDs via SOAP
- `data_envio` + `horario` → converter BRT→UTC (+3h)
- `send_classification` → `SEND_CLASS`

**Convenção de nome para o ESD:**
```bash
CAMPAIGN_CODE="${ROW_VALUES[32]}"  # col AG
ROW_SLUG=$(echo "$ROW_NOME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/[^a-z0-9-]//g' | cut -c1-30)
HORARIO_TAG=$(echo "$ROW_HORARIO" | sed 's/://g' | cut -c1-4)  # ex: 1000

if [ -n "$CAMPAIGN_CODE" ]; then
  ESD_KEY="${CAMPAIGN_CODE}-${ROW_SLUG}-${HORARIO_TAG}"
else
  ESD_KEY="${ROW_SLUG}-${HORARIO_TAG}"
fi
# Truncar para 36 chars máx (limite SFMC CustomerKey = 36)
ESD_KEY=$(echo "$ESD_KEY" | cut -c1-36)
```

```bash
SFMC_SEND_ID="$ESD_CUSTOMER_KEY"
```

**Para campanha:** o `sfmc_asset_id` contém o ID do primeiro email. Agendamentos de campanhas devem ser criados como múltiplos ESDs com intervalo conforme horário base + offset por email. Ler todos os IDs do campo obs se foram armazenados lá, ou usar a convenção de nome para reconstruir os IDs.

### 6-C: Atualizar linha → agendado

```bash
ROW_CAMPANHA="${ROW_VALUES[32]}"

curl -s -X PUT "$SHEETS_API/values/Fila%21A${ROW_NUM}%3AAG${ROW_NUM}?valueInputOption=RAW" \
  -H "$GAUTH" -H "Content-Type: application/json" \
  -d "{\"values\": [[\"agendado\",\"${ROW_TIPO}\",\"${ROW_NOME}\",\"${ROW_DOCX}\",\"${ROW_DATA}\",\"${ROW_HORARIO}\",${DE_ENVIO_JSON},${DE_EXCL_JSON},\"${SFMC_ASSET_ID}\",\"${SFMC_SEND_ID}\",\"${ROW_OBS}\",\"${ROW_TEMPLATE_ID}\",\"${ROW_PREVIEW_URL}\",\"${SEND_CLASS}\",\"${ROW_CAMPANHA}\"]]}"
```

```
✅ [1/M] Agendado: "<nome>" → <data> <horario> BRT | ESD: <SFMC_SEND_ID>
```

---

## Passo 7: Loop 3 — revisar → aguardando_aprovacao

Para cada item em `revisoes[]`:

```
🔄 [1/K] Regenerando: "<nome>" (feedback: "<obs>")
```

### 7-A: Baixar .docx (mesmo fluxo do Passo 5-A)

### 7-B: Ler feedback do campo obs

```bash
FEEDBACK="${ROW_VALUES[28]}"  # col AC
```

O agente deve incorporar o `FEEDBACK` como instruções adicionais ao gerar o HTML:
- Se o feedback mencionar cores, alterar no CSS inline
- Se mencionar tamanho de fonte, ajustar nos elementos relevantes
- Se mencionar estrutura (ex: "remover coluna lateral"), adaptar o layout
- Se mencionar CTA, ajustar texto/cor/tamanho do botão

### 7-C: Regenerar HTML com feedback aplicado

Mesmo fluxo do Passo 5-C, mas incluindo as instruções do `FEEDBACK` como modificações sobre o HTML gerado.

Após gerar, refazer o upload (novo POST ao Content Builder → novo `SFMC_ASSET_ID`).

### 7-D: Novo screenshot + upload preview

Executar **SUB: Preview PNG** com o novo HTML.

### 7-E: Atualizar linha → aguardando_aprovacao + limpar obs

```bash
ROW_CAMPANHA="${ROW_VALUES[32]}"

curl -s -X PUT "$SHEETS_API/values/Fila%21A${ROW_NUM}%3AAG${ROW_NUM}?valueInputOption=RAW" \
  -H "$GAUTH" -H "Content-Type: application/json" \
  -d "{\"values\": [[\"aguardando_aprovacao\",\"${ROW_TIPO}\",\"${ROW_NOME}\",\"${ROW_DOCX}\",\"${ROW_DATA}\",\"${ROW_HORARIO}\",${DE_ENVIO_JSON},${DE_EXCL_JSON},\"${NEW_SFMC_ASSET_ID}\",\"\",\"\",\"${ROW_TEMPLATE_ID}\",\"${NEW_PREVIEW_URL}\",\"${ROW_SEND_CLASS}\",\"${ROW_CAMPANHA}\"]]}"
# obs zerado → stakeholder pode escrever novo feedback se precisar
```

```
✅ [1/K] Regenerado: "<nome>" → aguardando_aprovacao (obs limpo)
         Preview atualizado: <NEW_PREVIEW_URL>
```

---

## SUB: Preview PNG

Sub-rotina chamada pelos Passos 5-E, 7-D. Recebe `$HTML_FILE` e retorna `$PREVIEW_URL`.

### Screenshot via Edge headless

```bash
MSEDGE=""
for P in "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
          "/c/Program Files/Microsoft/Edge/Application/msedge.exe"; do
  [ -f "$P" ] && MSEDGE="$P" && break
done

PNG_FILE="${HTML_FILE%.html}.png"
CWD=$(pwd)
ABS_HTML="${CWD}/${HTML_FILE}"; WIN_HTML="C:${ABS_HTML#/c}"; WIN_HTML="${WIN_HTML//\//\\}"
ABS_PNG="${CWD}/${PNG_FILE}";   WIN_PNG="C:${ABS_PNG#/c}";   WIN_PNG="${WIN_PNG//\//\\}"

if [ -n "$MSEDGE" ]; then
  "$MSEDGE" --headless --disable-gpu --no-sandbox \
    --window-size=640,1400 \
    --screenshot="$WIN_PNG" \
    "file:///$WIN_HTML" 2>/dev/null
fi

[ ! -f "$PNG_FILE" ] && echo "⚠ Screenshot falhou para $HTML_FILE" && PREVIEW_URL="" && return
```

### Upload PNG para SFMC CDN

Usar token **enterprise** (sem `account_id`) + categoria `273324`:

```bash
source email-agent/.env

SFMC_ENT_TOKEN=$(curl -s -X POST \
  "https://${SFMC_SUBDOMAIN}.auth.marketingcloudapis.com/v2/token" \
  -H "Content-Type: application/json" \
  -d "{\"grant_type\":\"client_credentials\",\"client_id\":\"${SFMC_CLIENT_ID}\",\"client_secret\":\"${SFMC_CLIENT_SECRET}\"}" \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

ASSET_NAME="queue-preview-${BU}-$(date +%s)"
B64=$(base64 -w 0 "$PNG_FILE")

printf '{"name":"%s","assetType":{"name":"png","id":28},"file":"%s","category":{"id":273324}}' \
  "$ASSET_NAME" "$B64" > /tmp/preview_upload.json

UPLOAD_RESP=$(curl -s -X POST \
  "https://${SFMC_SUBDOMAIN}.rest.marketingcloudapis.com/asset/v1/content/assets" \
  -H "Authorization: Bearer $SFMC_ENT_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/preview_upload.json)
rm -f /tmp/preview_upload.json

PREVIEW_URL=$(echo "$UPLOAD_RESP" | grep -o '"publishedURL":"[^"]*"' | cut -d'"' -f4)
[ -z "$PREVIEW_URL" ] && echo "⚠ Upload PNG falhou" || echo "✓ Preview: $PREVIEW_URL"
```

---

## Passo 8: Arquivar enviados no Histórico

Após os 3 loops, verificar linhas com `status=agendado` cuja `data_envio` já passou:

```bash
TODAY=$(date +%Y-%m-%d)
# Para cada linha agendada onde data_envio < TODAY:
#   1. Append na aba Historico com status=enviado
#   2. Deletar da Fila (deleteDimension — processar do índice maior para o menor)
```

**Append:**
```bash
curl -s -X POST "$SHEETS_API/values/Historico%21A%3AAG:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS" \
  -H "$GAUTH" -H "Content-Type: application/json" \
  -d "{\"values\": [[\"enviado\", ...resto_da_linha...]]}"
```

**Deletar da Fila:**
```bash
curl -s -X POST "$SHEETS_API:batchUpdate" \
  -H "$GAUTH" -H "Content-Type: application/json" \
  -d "{\"requests\": [{\"deleteDimension\": {\"range\": {\"sheetId\": $FILA_SHEET_ID, \"dimension\": \"ROWS\", \"startIndex\": $((ROW_NUM-1)), \"endIndex\": $ROW_NUM}}}]}"
```

> ⚠️ Deletar sempre do índice maior para o menor para evitar deslocamento de linhas.

---

## Passo 9: Resumo final

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Queue — Concluído
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  FINCLASS
  ✅ Newsletter Março       → aguardando_aprovacao (preview na planilha)
  ✅ Email Boas-vindas      → agendado 05/03 08:00 BRT | ESD: BWV-20260305
  🔄 Promoção Aniversário  → aguardando_aprovacao (regenerado com feedback)
  ❌ Campanha SSL0002       → erro_docx: falha ao baixar .docx

  Arquivadas no Histórico: 1 linha(s)
  Novas entradas de Recorrentes: 0

  Finclass:      https://docs.google.com/spreadsheets/d/1soiS9kihONG5jHNm0IxJ9jWVNUM39fYPH0F6PBnO9zE/edit
  Faculdade Hub: https://docs.google.com/spreadsheets/d/1BuIfkkILSg8X2Dr08xXF0KDOHPF76Rx2Dcr6Bi1gswA/edit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Limpar arquivos temporários:
```bash
rm -rf /tmp/queue_work /tmp/docx_work
rm -f /tmp/mktc_key.pem /tmp/preview_upload.json
```

---

## Extração de file_id de URLs do Google Drive

| Formato de URL | Como extrair |
|---|---|
| `drive.google.com/file/d/FILE_ID/view` | `grep -o '/d/[^/?]*' \| cut -d'/' -f3` |
| `drive.google.com/open?id=FILE_ID` | `grep -o 'id=[^&]*' \| cut -d= -f2` |
| `docs.google.com/document/d/FILE_ID/` | `grep -o '/d/[^/?]*' \| cut -d'/' -f3` |

---

## Tratamento de erros

| Situação | Status na planilha | Comportamento |
|---|---|---|
| Falha ao baixar .docx | `erro_docx` | Pular item; reportar no resumo |
| Subject/Preheader não encontrado | `erro_html` | Obs: "Subject não encontrado no docx" |
| Upload SFMC falha | `erro_upload_sfmc` | Retry uma vez; se persistir, marcar erro |
| send_classification ausente | `erro_agendamento` | Obs: mensagem descritiva |
| ESD/agendamento falha | `erro_agendamento` | Linha permanece; obs com detalhe do erro |
| HTML contém `TODO_EMAILID` | — | Substituir pelo sfmc_asset_id e fazer PUT automático |
| data_envio no passado | — | Avisar no resumo; processar normalmente (SFMC agenda no passado → envia imediatamente) |
| Recorrente sem arquivo no Drive | — | Silencioso — não cria entrada na Fila |
| BU não encontrada em `brands/` | `erro_html` | Marcar e pular |

---

## Regras de Ouro

1. **Nunca regredir status** — uma linha só avança; nunca volta de `agendado` para `pendente`
2. **Exceto `revisar`** — é o único estado que retrocede intencionalmente; stakeholder escreve o feedback no obs e muda para `revisar`; agente regenera e volta a `aguardando_aprovacao`
3. **Guardar IDs imediatamente** após cada upload — não esperar o loop terminar
4. **Processar em ordem de data_envio** — envios mais urgentes primeiro
5. **Obs zerado no revisar** — limpar o campo obs ao retornar a `aguardando_aprovacao` para não acumular feedbacks antigos
6. **Preview URL pública** — usar token enterprise para upload de preview PNGs (categoria 273324); nunca token BU
7. **Reautenticar antes de operações longas** — tokens Google expiram em 1h; SFMC em ~20min
8. **A BU é sempre implícita** — cada planilha pertence a uma única BU; não há coluna "bu"
9. **Ranges URL-encoded** — usar `%21` para `!` e `%3A` para `:` em todos os endpoints da Sheets API
