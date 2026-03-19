---
name: queue
version: "4.0"
language: "pt-BR"
description: >
  Agente de fila de email marketing. Lê as planilhas Google Sheets de controle (uma por BU),
  processa pendentes (slot-filling nos templates fixos + preview PNG → aguardando aprovação),
  agenda aprovados com sender/tracking/naming automáticos, reprocessa revisões, e arquiva enviados.
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

| Col | Índice | Campo | Quem preenche | Valores válidos |
|-----|--------|-------|---------------|-----------------|
| A | 0 | status | Stakeholder/Agente | ver workflow abaixo |
| B | 1 | tipo | Stakeholder | `individual` \| `campanha` |
| C | 2 | nome | Stakeholder | nome livre |
| D | 3 | docx_link | Stakeholder | URL do .docx no Drive |
| E | 4 | data_envio | Stakeholder | DD/MM/YYYY |
| F | 5 | horario | Stakeholder | HH:MM ou HHh (BRT) |
| G–P | 6–15 | de_envio_1..10 | Stakeholder | uma DE por célula |
| Q–Z | 16–25 | de_exclusao_1..10 | Stakeholder | uma DE por célula |
| AA | 26 | sfmc_asset_id | **Agente** | ID do asset no CB |
| AB | 27 | sfmc_send_id | **Agente** | CustomerKey do ESD |
| AC | 28 | obs | Ambos | feedback de revisão |
| AD | 29 | template_id | Stakeholder | `news` \| `campanha` \| `conteudo` \| `relatorio` \| `comunicado` \| `consultor-elite` |
| AE | 30 | preview_url | **Agente** | URL do PNG preview no SFMC |
| AF | 31 | send_classification | Stakeholder/Agente | CustomerKey da send class |
| AG | 32 | campanha | Stakeholder | código da campanha (ex: `CARN0004`, `SSL0001`) |
| AH | 33 | sender_profile | Stakeholder/Agente | override do sender (ex: `297 — Bruno Perini`) |
| AI | 34 | tracking_category | Stakeholder/Agente | override da tracking category (ex: `316407 — Newsletter`) |

**Índices 0-based:** `[0]status [1]tipo [2]nome [3]docx [4]data [5]horario [6..15]de_envio_1..10 [16..25]de_exclusao_1..10 [26]asset_id [27]send_id [28]obs [29]template_id [30]preview [31]send_class [32]campanha [33]sender_profile [34]tracking_category`

> **Distinção importante — coluna B vs coluna AD:**
> - **Coluna B (`tipo`)** = tipo de **workflow**: `individual` (1 email do docx) | `campanha` (N emails com marcadores `=== EMAIL N ===`)
> - **Coluna AD (`template_id`)** = tipo de **template**: qual layout usar — determina automaticamente sender, CB category e tracking
>
> **Regra DEs (colunas G–P e Q–Z):** uma DE por célula, sem vírgulas. O agente coleta todas as células não-vazias do intervalo G–P como de_envio e Q–Z como de_exclusao.

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

curl -s -X POST "$SHEETS_API/values/Fila%21A%3AQ:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS" \
  -H "$GAUTH" -H "Content-Type: application/json" \
  -d "{\"values\": [[\"pendente\",\"individual\",\"\",\"${NOME_SERIE} ${TARGET_DATE}\",\"${FILE_LINK}\",\"${TARGET_DATE}\",\"${HORARIO}\",\"${DE_ENVIO}\",\"${DE_EXCLUSAO}\",\"\",\"\",\"auto: recorrente\",\"\",\"\",\"\",\"\",\"\"]]}"
```

> Nota do nome da aba: `Historico` sem acento.

---

## Passo 3: Ler Fila → agrupar por status

```bash
FILA_RESP=$(curl -s "$SHEETS_API/values/Fila%21A2%3AQ1000" -H "$GAUTH")
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

### 5-C: Gerar HTML — slot-filling com template fixo

Ler a tabela de auto-config via `template_id` da col AD (campo `[29]`):

| template | Arquivo template | Sender Profile | CB Category | Tracking Category |
|---|---|---|---|---|
| `news` | `templates/news.html` | Fin News (285) | 275176 | 320503 |
| `campanha` | `templates/campanha.html` | Equipe Finclass (194) | 275626 | 320491 |
| `conteudo` | `templates/conteudo.html` | Conteúdo - Finclass (270) | 275176 | 315907 |
| `relatorio` | `templates/relatorio.html` | Equipe Finclass (194) | 275176 | 278546 |
| `comunicado` | `templates/comunicado.html` | Equipe Finclass (194) | 275234 | 276056 |
| `consultor-elite` | `templates/consultor-elite.html` | Consultor de Elite (294) | 275176 | 317554 |

> ⚠️ Se `template_id` vazio (col AD): marcar `erro_html` + obs "template_id não preenchido na col AD" e pular.

Guardar para uso nos passos seguintes:
```bash
TEMPLATE_ID="${ROW_VALUES[29]}"  # col AD, index 29
SENDER_PROFILE_ID=<id da tabela acima>
CB_CATEGORY_ID=<category da tabela acima>
TRACKING_CATEGORY_ID=<tracking da tabela acima>
TEMPLATE_FILE="email-agent/brands/${BU}/templates/${TEMPLATE_ID}.html"
```

**Se `tipo=individual`:** executar slot-filling completo (mesmos passos da skill `/email`):
1. Extrair do docx: subject, preheader e todo o corpo da copy (parágrafos, imagens, links, negrito, cores)
2. Carregar `$TEMPLATE_FILE` — **nunca reescrever a estrutura**, apenas preencher os `{{slots}}`
3. Para imagens: fazer upload no SFMC (categoria `$CB_CATEGORY_ID`, token BU) e substituir src no HTML
4. Se `template_id=campanha` e copy contiver link PMP: gerar bloco AMPscript (ver skill `/email` Passo 8)
5. Nomear arquivo: `/tmp/queue_work/<BU>-<YYYY-MM-DD>-<slug-nome>.html`

Se subject/preheader não encontrado no docx: marcar `erro_html` + obs descritiva e pular.

**Se `tipo=campanha`:** executar slot-filling para cada email (mesmos passos da skill `/campaign`):
- Detectar marcadores `=== EMAIL N - Nome ===` no docx
- Para cada seção: carregar `$TEMPLATE_FILE` e preencher slots com a copy daquela seção
- Gerar N HTMLs em `/tmp/queue_work/`
- Se link PMP presente: cada email = cópia separada com `TODO_EMAILID` próprio (substituído individualmente no Passo 5-D)

### 5-D: Upload HTML(s) e imagens para SFMC + naming convention

```bash
source email-agent/.env
CAMPAIGN_CODE="${ROW_VALUES[32]}"  # col AG, index 32
ROW_NOME="${ROW_VALUES[2]}"        # col C, index 2
ROW_DOCX="${ROW_VALUES[3]}"        # col D, index 3
ROW_DATA="${ROW_VALUES[4]}"        # col E, index 4
ROW_HORARIO="${ROW_VALUES[5]}"     # col F, index 5

# Coletar DEs de envio: cols G–P (índices 6–15), uma por célula
DE_ENVIO_LIST=()
for i in $(seq 6 15); do
  [ -n "${ROW_VALUES[$i]}" ] && DE_ENVIO_LIST+=("${ROW_VALUES[$i]}")
done

# Coletar DEs de exclusão: cols Q–Z (índices 16–25), uma por célula
DE_EXCL_LIST=()
for i in $(seq 16 25); do
  [ -n "${ROW_VALUES[$i]}" ] && DE_EXCL_LIST+=("${ROW_VALUES[$i]}")
done

# CB category já determinada no Passo 5-C: $CB_CATEGORY_ID
# Para template_id=campanha: verificar subpasta com código de campanha
if [ "$TEMPLATE_ID" = "campanha" ] && [ -n "$CAMPAIGN_CODE" ]; then
  SFMC_BU_TOK=$(curl -s -X POST \
    "https://${SFMC_SUBDOMAIN}.auth.marketingcloudapis.com/v2/token" \
    -H "Content-Type: application/json" \
    -d "{\"grant_type\":\"client_credentials\",\"client_id\":\"${SFMC_CLIENT_ID}\",\"client_secret\":\"${SFMC_CLIENT_SECRET}\",\"account_id\":\"${MID_FINCLASS}\"}" \
    | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

  SUB_RESP=$(curl -s \
    "https://${SFMC_SUBDOMAIN}.rest.marketingcloudapis.com/asset/v1/content/categories?%24filter=parentId%20eq%20${CB_CATEGORY_ID}&%24pagesize=200" \
    -H "Authorization: Bearer $SFMC_BU_TOK")

  CAMP_CAT_ID=$(echo "$SUB_RESP" | grep -o "\"id\":[0-9]*[^}]*\"name\":\"${CAMPAIGN_CODE}\"" | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -1)

  if [ -z "$CAMP_CAT_ID" ]; then
    CREATE_RESP=$(curl -s -X POST \
      "https://${SFMC_SUBDOMAIN}.rest.marketingcloudapis.com/asset/v1/content/categories" \
      -H "Authorization: Bearer $SFMC_BU_TOK" \
      -H "Content-Type: application/json" \
      -d "{\"name\":\"${CAMPAIGN_CODE}\",\"parentId\":${CB_CATEGORY_ID}}")
    CAMP_CAT_ID=$(echo "$CREATE_RESP" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
  fi

  [ -n "$CAMP_CAT_ID" ] && CB_CATEGORY_ID="$CAMP_CAT_ID" && echo "✓ CB subcategoria: ${CAMPAIGN_CODE} (ID=$CAMP_CAT_ID)"
fi
```

Executar upload de imagens + HTML seguindo o fluxo da skill `/email` (Passos 9-12).

**Após o POST REST (upload do email), executar o fluxo de ES_ID:**

```bash
# 1. Guardar Asset ID retornado pelo POST REST
CB_ASSET_ID=$(echo "$POST_RESP" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

# 2. SOAP Retrieve para obter o Email Studio ID (campo diferente do Asset ID)
#    O Email Studio ID é o que vai no @emailid do AMPscript PMP
SOAP_RETRIEVE='<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                  xmlns:et="http://exacttarget.com/wsdl/partnerAPI">
  <soapenv:Header>
    <fueloauth xmlns="http://exacttarget.com">'"$SFMC_BU_TOK"'</fueloauth>
  </soapenv:Header>
  <soapenv:Body>
    <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
      <RetrieveRequest>
        <ObjectType>Email</ObjectType>
        <Properties>ID</Properties>
        <Properties>Name</Properties>
        <Filter xsi:type="SimpleFilterPart">
          <Property>Name</Property>
          <SimpleOperator>equals</SimpleOperator>
          <Value>'"$EMAIL_NAME_TEMP"'</Value>
        </Filter>
      </RetrieveRequest>
    </RetrieveRequestMsg>
  </soapenv:Body>
</soapenv:Envelope>'

SOAP_RESP=$(curl -s -X POST \
  "https://${SFMC_SUBDOMAIN}.soap.marketingcloudapis.com/Service.asmx" \
  -H "Content-Type: text/xml" \
  -H "SOAPAction: Retrieve" \
  --data "$SOAP_RETRIEVE")

ES_ID=$(echo "$SOAP_RESP" | grep -o '<ID>[0-9]*</ID>' | head -1 | sed 's/<[^>]*>//g')
echo "✓ Email Studio ID: $ES_ID (Asset ID: $CB_ASSET_ID)"

# 3. Substituir TODO_EMAILID pelo ES_ID no HTML e fazer PUT para atualizar o asset
sed -i "s/TODO_EMAILID/${ES_ID}/g" "$HTML_FILE"

# Montar payload de atualização e fazer PUT
# (usar awk -f escape_html.awk para escapar HTML, depois --data-binary @file)
# ...PUT para https://${SFMC_SUBDOMAIN}.rest.marketingcloudapis.com/asset/v1/content/assets/${CB_ASSET_ID}...
echo "✓ TODO_EMAILID substituído por $ES_ID → asset atualizado via PUT"
```

**Naming convention do asset (após ter o ES_ID):**

```bash
TODAY=$(date +%Y%m%d)
# Determinar tipo PMP: CAP (captação), VND (venda), AQU (aquecimento)
# Inferir do nome ou da copy; perguntar ao usuário apenas se genuinamente ambíguo
TIPO_PMP="VND"  # ex: VND

# Para campanha individual (tipo=individual):
# Formato: [TIPO][ES_ID][EML][YYYYMMDD][CAMPANHA][BASE]
# DE_BASE = primeira DE da lista (col H, index 7, comma-separated)
FIRST_DE=$(echo "${ROW_VALUES[7]}" | cut -d',' -f1 | xargs)
DE_BASE=$(echo "$FIRST_DE" | tr '[:lower:]' '[:upper:]' | tr ' ' '_' | cut -c1-20)
if [ -n "$CAMPAIGN_CODE" ]; then
  EMAIL_FINAL_NAME="[${TIPO_PMP}][${ES_ID}][EML][${TODAY}][${CAMPAIGN_CODE}][${DE_BASE}]"
else
  EMAIL_FINAL_NAME="[${TIPO_PMP}][${ES_ID}][EML][${TODAY}][${ROW_SLUG^^}]"
fi

# Renomear asset via PUT (atualizar campo "name")
# ...PUT com {"name":"$EMAIL_FINAL_NAME", "id":$CB_ASSET_ID, "customerKey":"$CUSTOMER_KEY"}...
echo "✓ Asset renomeado: $EMAIL_FINAL_NAME"
```

> **Nota:** Para `tipo=campanha` com N emails + PMP, cada email tem seu próprio `ES_ID` — criar N cópias, cada uma com `TODO_EMAILID` substituído pelo seu ES_ID individual e nome com DE base correspondente.

Guardar: `SFMC_ASSET_ID=$CB_ASSET_ID` (individual) ou `SFMC_ASSET_IDS[]` (campanha — array com N IDs).

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

# Construir 10 campos de DE para escrita (índices 6-15 e 16-25)
de_fields() { local a=("$@"); printf '"%s",' "${a[@]:0:10}"; for i in $(seq ${#a[@]} 9); do printf '""',; done; }
DE_ENV_JSON=$(de_fields "${DE_ENVIO_LIST[@]}"); DE_ENV_JSON="${DE_ENV_JSON%,}"
DE_EXC_JSON=$(de_fields "${DE_EXCL_LIST[@]}"); DE_EXC_JSON="${DE_EXC_JSON%,}"

ROW_CAMPANHA="${ROW_VALUES[32]}"  # col AG, index 32

printf '{"values": [["aguardando_aprovacao","%s","%s","%s","%s","%s",%s,%s,"%s","","  %s","%s","%s","%s","",""]]}\n' \
  "$ROW_TIPO" "$ROW_NOME" "$ROW_DOCX" "$ROW_DATA" "$ROW_HORARIO" \
  "$DE_ENV_JSON" "$DE_EXC_JSON" \
  "$SFMC_ASSET_ID" "$OBS_UPDATED" "$TEMPLATE_ID" "$PREVIEW_URL" "$ROW_SEND_CLASS" "$ROW_CAMPANHA" \
  > /tmp/fila_put.json

curl -s -X PUT "$SHEETS_API/values/Fila%21A${ROW_NUM}%3AAG${ROW_NUM}?valueInputOption=RAW" \
  -H "$GAUTH" -H "Content-Type: application/json" \
  --data-binary @/tmp/fila_put.json
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

A coluna AF (índice 31) pode conter o CustomerKey da send class (ex: `"84"`). Extrair sempre a parte antes do ` — ` se houver texto extra:

```bash
# Coletar DEs de envio: cols G–P (índices 6–15)
DE_ENVIO_LIST=()
for i in $(seq 6 15); do [ -n "${ROW_VALUES[$i]}" ] && DE_ENVIO_LIST+=("${ROW_VALUES[$i]}"); done

# Coletar DEs de exclusão: cols Q–Z (índices 16–25)
DE_EXCL_LIST=()
for i in $(seq 16 25); do [ -n "${ROW_VALUES[$i]}" ] && DE_EXCL_LIST+=("${ROW_VALUES[$i]}"); done

# Ler da coluna AF (índice 31)
RAW_CLASS="${ROW_VALUES[31]}"

# Extrair CustomerKey: parte antes do " — " (ou valor inteiro se não houver " — ")
SEND_CLASS=$(echo "$RAW_CLASS" | sed 's/ —.*//')

# Fallback: ler do brand.json se col O vazia
if [ -z "$SEND_CLASS" ]; then
  SEND_CLASS=$(grep -o '"send_classification":"[^"]*"' "email-agent/brands/${BU}/brand.json" | cut -d'"' -f4)
fi

# Se ainda vazio: marcar erro e pular
if [ -z "$SEND_CLASS" ]; then
  curl -s -X PUT "$SHEETS_API/values/Fila%21A${ROW_NUM}%3AAC${ROW_NUM}?valueInputOption=RAW" \
    -H "$GAUTH" -H "Content-Type: application/json" \
    -d "{\"values\": [[\"erro_agendamento\",\"${ROW_VALUES[1]}\",\"${ROW_VALUES[2]}\",\"${ROW_VALUES[3]}\",\"${ROW_VALUES[4]}\",\"${ROW_VALUES[5]}\",\"send_classification não configurado (col AF nem brand.json)\"]]}"
  echo "❌ [${ROW_NUM}] send_classification ausente — pulando"
  continue
fi
```

### 6-B: Criar Email Studio + ESD + agendar (auto-config por template)

Ler `template_id` da col AD (`[29]`) e usar a tabela de auto-config para determinar **sender profile** e **tracking category** automaticamente — sem perguntar ao usuário:

```bash
TEMPLATE_ID="${ROW_VALUES[29]}"  # col AD, index 29
BRAND_JSON="email-agent/brands/${BU}/brand.json"

# Auto-config por template_id
# Prioridade: brand.json[sfmc.templates] → fallback hardcoded (Finclass)
TMPL_SENDER=$(node -e "
  const b=JSON.parse(require('fs').readFileSync('$BRAND_JSON','utf8'));
  const t=b.sfmc?.templates?.['$TEMPLATE_ID'];
  if(t) console.log(t.sender_profile_id);
" 2>/dev/null)
TMPL_TRACKING=$(node -e "
  const b=JSON.parse(require('fs').readFileSync('$BRAND_JSON','utf8'));
  const t=b.sfmc?.templates?.['$TEMPLATE_ID'];
  if(t) console.log(t.tracking_category_id);
" 2>/dev/null)

if [ -n "$TMPL_SENDER" ] && [ -n "$TMPL_TRACKING" ]; then
  SENDER_PROFILE_ID="$TMPL_SENDER"
  TRACKING_CAT_ID="$TMPL_TRACKING"
else
  # Fallback: Finclass hardcoded (tabela de referência)
  case "$TEMPLATE_ID" in
    news)            SENDER_PROFILE_ID=285; TRACKING_CAT_ID=320503 ;;
    campanha)        SENDER_PROFILE_ID=194; TRACKING_CAT_ID=320491 ;;
    conteudo)        SENDER_PROFILE_ID=270; TRACKING_CAT_ID=315907 ;;
    relatorio)       SENDER_PROFILE_ID=194; TRACKING_CAT_ID=278546 ;;
    comunicado)      SENDER_PROFILE_ID=194; TRACKING_CAT_ID=276056 ;;
    consultor-elite) SENDER_PROFILE_ID=294; TRACKING_CAT_ID=317554 ;;
    *)
      echo "❌ template_id desconhecido para BU $BU: $TEMPLATE_ID"
      # marcar erro_agendamento e pular
      continue ;;
  esac
fi
```

> ℹ️ `send_classification` vem de col O (Passo 6-A); sender_profile e tracking vêm de `brand.json[sfmc.templates]` ou fallback Finclass.
> Para Hub: apenas `news` e `campanha` — qualquer outro template na col C marcará `erro_agendamento`.

Executar os Passos 2-7 da skill `/send` usando os valores da linha:
- `sfmc_asset_id` da col AA (index 26) → criar Email object no Email Studio via SOAP
- `de_envio` das cols G–P (índices 6–15, array `DE_ENVIO_LIST`) → buscar ObjectIDs via SOAP Retrieve para cada DE
- `de_exclusao` das cols Q–Z (índices 16–25, array `DE_EXCL_LIST`) → buscar ObjectIDs via SOAP para cada DE
- `data_envio` + `horario` → converter BRT→UTC (+3h)
- `send_classification` → `SEND_CLASS` (Passo 6-A)
- `sender_profile` → `SENDER_PROFILE_ID` (auto-config acima)
- `tracking` → `TRACKING_CAT_ID` (auto-config acima)

**Naming convention do ESD — baseada no template:**

Para emails de campanha (template = `campanha`), usar o padrão PMP com tipo:
```bash
CAMPAIGN_CODE="${ROW_VALUES[32]}"  # col AG, index 32
HORARIO_TAG=$(echo "$ROW_HORARIO" | sed 's/://g' | cut -c1-4)  # ex: 1000
# DE_BASE = primeira DE da lista (col G, índice 6 do array DE_ENVIO_LIST)
FIRST_DE="${DE_ENVIO_LIST[0]}"
DE_BASE=$(echo "$FIRST_DE" | tr '[:lower:]' '[:upper:]' | tr ' _' '-' | sed 's/[^A-Z0-9-]//g' | cut -c1-20)

if [ "$TEMPLATE_ID" = "campanha" ] && [ -n "$CAMPAIGN_CODE" ]; then
  # ex: CARN0004-EMAIL-1-09H (para campanha com múltiplos emails)
  ESD_KEY="${CAMPAIGN_CODE}-EMAIL-${EMAIL_NUM}-${HORARIO_TAG:0:2}H"
else
  # Para outros tipos: slug do nome + horario
  ROW_SLUG=$(echo "$ROW_NOME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/[^a-z0-9-]//g' | cut -c1-30)
  if [ -n "$CAMPAIGN_CODE" ]; then
    ESD_KEY="${CAMPAIGN_CODE}-${ROW_SLUG}-${HORARIO_TAG}"
  else
    ESD_KEY="${ROW_SLUG}-${HORARIO_TAG}"
  fi
fi

# Truncar para 36 chars máx (limite SFMC CustomerKey)
ESD_KEY=$(echo "$ESD_KEY" | cut -c1-36)
```

```bash
SFMC_SEND_ID="$ESD_CUSTOMER_KEY"
```

**Para `tipo=campanha` (N emails):** criar N ESDs separados. O `sfmc_asset_id` contém o ID do primeiro email; os demais IDs foram gravados no campo obs no Passo 5-F. Reconstruir o array de IDs a partir do obs, ou usar a convenção de nome para localizar os assets via SOAP Retrieve.

### 6-C: Atualizar linha → agendado

```bash
ROW_CAMPANHA="${ROW_VALUES[32]}"  # col AG, index 32

de_fields() { local a=("$@"); printf '"%s",' "${a[@]:0:10}"; for i in $(seq ${#a[@]} 9); do printf '""',; done; }
DE_ENV_JSON=$(de_fields "${DE_ENVIO_LIST[@]}"); DE_ENV_JSON="${DE_ENV_JSON%,}"
DE_EXC_JSON=$(de_fields "${DE_EXCL_LIST[@]}"); DE_EXC_JSON="${DE_EXC_JSON%,}"

printf '{"values": [["agendado","%s","%s","%s","%s","%s",%s,%s,"%s","%s","%s","%s","%s","%s","%s",""]]}\n' \
  "$ROW_TIPO" "$ROW_NOME" "$ROW_DOCX" "$ROW_DATA" "$ROW_HORARIO" \
  "$DE_ENV_JSON" "$DE_EXC_JSON" \
  "$SFMC_ASSET_ID" "$SFMC_SEND_ID" "$ROW_OBS" "$TEMPLATE_ID" "$ROW_PREVIEW_URL" "$SEND_CLASS" "$ROW_CAMPANHA" \
  > /tmp/fila_put.json

curl -s -X PUT "$SHEETS_API/values/Fila%21A${ROW_NUM}%3AAG${ROW_NUM}?valueInputOption=RAW" \
  -H "$GAUTH" -H "Content-Type: application/json" \
  --data-binary @/tmp/fila_put.json
```

```
✅ [1/M] Agendado: "<nome>" → <data> <horario> BRT | ESD: <SFMC_SEND_ID>
```

### 6-D: Popup "EMAIL AGENDADO" (Dark Souls)

Após cada agendamento bem-sucedido, abrir o popup comemorativo:

```bash
mkdir -p /c/tmp

# 1. Gerar WAV sintético (Node.js) e tocar via PowerShell
node email-agent/scripts/gen-sound.mjs /c/tmp/you-scheduled.wav
powershell.exe -c "(New-Object System.Media.SoundPlayer 'C:\tmp\you-scheduled.wav').PlaySync()" &

# 2. Abrir popup visual (Edge --app = sem chrome)
POPUP_TMP="/c/tmp/you-scheduled-$(date +%s).html"
cp "email-agent/scripts/you-scheduled.html" "$POPUP_TMP"

ESD_ENC=$(echo "$SFMC_SEND_ID" | sed 's/ /%20/g; s/\[/%5B/g; s/\]/%5D/g')
DT_ENC=$(echo "$ROW_DATA $ROW_HORARIO" | sed 's/ /%20/g')
BU_ENC=$(echo "$BU" | sed 's/ /%20/g')

MSEDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
[ ! -f "$MSEDGE" ] && MSEDGE="/c/Program Files/Microsoft/Edge/Application/msedge.exe"

"$MSEDGE" \
  --app="file:///C:/tmp/$(basename $POPUP_TMP)?key=${ESD_ENC}&dt=${DT_ENC}&bu=${BU_ENC}" \
  --window-size=1280,720 \
  2>/dev/null &
```

> Som gerado via Node.js (WAV sintético), tocado direto pelo Windows — sem depender de autoplay do browser. Popup fecha sozinho em ~5 segundos.

---

## Passo 7: Loop 3 — revisar → aguardando_aprovacao

Para cada item em `revisoes[]`:

```
🔄 [1/K] Regenerando: "<nome>" (feedback: "<obs>")
```

### 7-A: Baixar .docx (mesmo fluxo do Passo 5-A)

### 7-B: Ler feedback do campo obs

```bash
FEEDBACK="${ROW_VALUES[28]}"  # col AC, index 28
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
ROW_CAMPANHA="${ROW_VALUES[32]}"  # col AG, index 32
TEMPLATE_ID="${ROW_VALUES[29]}"   # col AD, index 29

de_fields() { local a=("$@"); printf '"%s",' "${a[@]:0:10}"; for i in $(seq ${#a[@]} 9); do printf '""',; done; }
DE_ENV_JSON=$(de_fields "${DE_ENVIO_LIST[@]}"); DE_ENV_JSON="${DE_ENV_JSON%,}"
DE_EXC_JSON=$(de_fields "${DE_EXCL_LIST[@]}"); DE_EXC_JSON="${DE_EXC_JSON%,}"

printf '{"values": [["aguardando_aprovacao","%s","%s","%s","%s","%s",%s,%s,"%s","","","%s","%s","%s",""]]}\n' \
  "$ROW_TIPO" "$ROW_NOME" "$ROW_DOCX" "$ROW_DATA" "$ROW_HORARIO" \
  "$DE_ENV_JSON" "$DE_EXC_JSON" \
  "$NEW_SFMC_ASSET_ID" "$TEMPLATE_ID" "$NEW_PREVIEW_URL" "$ROW_CAMPANHA" \
  > /tmp/fila_put.json

curl -s -X PUT "$SHEETS_API/values/Fila%21A${ROW_NUM}%3AAG${ROW_NUM}?valueInputOption=RAW" \
  -H "$GAUTH" -H "Content-Type: application/json" \
  --data-binary @/tmp/fila_put.json
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
| HTML contém `TODO_EMAILID` | — | Após POST REST: SOAP Retrieve para obter ES_ID → sed substitui → PUT atualiza. Nunca usar Asset ID no lugar do ES_ID |
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
10. **Slot-filling, nunca reescrita** — carregar o template fixo do `template_id`, preencher os `{{slots}}`, nunca reescrever a estrutura HTML
11. **Auto-config obrigatório** — sender profile, tracking category e CB category são determinados pelo `template` da col C (index 2); nunca perguntar ao usuário esses valores
12. **ES_ID ≠ Asset ID** — após POST REST, sempre fazer SOAP Retrieve para obter o Email Studio ID real antes de substituir `TODO_EMAILID`; usar Asset ID no AMPscript quebra o rastreio PMP
13. **N DEs + PMP = N emails** — quando `tipo=campanha` com PMP e múltiplas DEs, criar uma cópia do email por DE, cada uma com seu próprio ES_ID no AMPscript e no nome
