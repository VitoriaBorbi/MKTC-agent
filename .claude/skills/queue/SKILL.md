---
name: queue
version: "4.0"
language: "pt-BR"
description: >
  Agente de fila de email marketing. Lê as planilhas Google Sheets de controle (uma por BU),
  processa pendentes (slot-filling nos templates fixos + link de preview CB → aguardando aprovação),
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
  - emails gerados com link de preview direto no Content Builder
  - Google Sheets atualizado (status, preview_url, sfmc_asset_id, sfmc_send_id)
  - envios agendados no SFMC para linhas aprovadas
---

# Queue Agent — Fila de Email Marketing

Você é um agente de orquestração de email marketing. Sua missão é processar a fila de envios configurada no Google Sheets em **três loops independentes**, de forma **totalmente autônoma** — as configurações já estão na planilha, não há nada para perguntar ao usuário durante a execução.

**Princípio de autonomia:** Tomar decisões → Executar → Atualizar sheet → Reportar resultado. Nunca pausar para pedir confirmação no meio do processo. O único momento válido para interromper é uma falha técnica irrecuperável (ex: token inválido após retry, asset não encontrado no CB). Em todos os outros casos, tomar a decisão mais segura, registrar no `obs` e continuar.

**Regra de ouro:** se algo pode ser inferido, infira. Se há um fallback definido, use-o. Só registre erro e pule o item quando genuinamente impossível prosseguir.

---

## Protocolo de Execução — checklist obrigatório

Executar **sempre nesta ordem**, sem pular etapas. Reportar cada item com `✅` (ok) ou `❌` (erro + motivo) no output. Em caso de erro em qualquer passo, registrar no campo `obs` da planilha e avançar para o próximo item da fila.

### FASE 2 — Geração (Loop 1: pendente → aguardando_aprovacao)
```
□ 4.  Auth Google + SFMC (tokens válidos)
□ 5.  Baixar .docx do Drive (HTTP 200 + arquivo não-vazio)
□ 6.  Extrair copy: subject, preheader, corpo, formatação, imagens
□ 7.  Upload imagens → SFMC CDN (categoria img do brand.json)
□ 8.  Slot-filling no template fixo (ler email/SKILL.md antes)
□ 9.  Validar AMPscript: nenhum %%var%% bruto em href
□ 10. Upload HTML → CB REST → guardar asset_id
□ 11. GET CB asset → legacyData.legacyId → obter ES_ID → substituir TODO_EMAILID → PUT atualizar CB
□ 12. Renomear asset: [TIPO][ES_ID][EML][YYYYMMDD][CAMPANHA][DE_BASE]
□ 13. Validar personalization strings: avisar no obs se houver campos ausentes na DE
□ 14. Gerar preview_url = link CB direto (https://mc.s7.exacttarget.com/cloud/#app/email/C12/{assetId})
□ 15. Planilha: status="aguardando_aprovacao" + asset_id + preview_url + obs
□ 16. Limpar /tmp entre itens (rm -rf /tmp/docx_work /tmp/queue_work)
```

### FASE 4 — Agendamento (Loop 2: aprovado → agendado)
```
□ 17. Verificar horário: se data_envio+horario BRT já passou → marcar horario_expirado e pular
□ 18. Verificar sfmc_send_id: se já preenchido → ESD duplicado, pular
□ 19. Renovar token SFMC (novo request de auth)
□ 20. Renovar token Google se elapsed > 50min
□ 21. Baixar HTML do CB REST via asset_id (não usar /tmp)
□ 22. Validar personalization strings vs campos da DE de envio (bloqueio duro)
□ 22. Criar Email no Email Studio via SOAP → guardar NEW_EMAIL_ID
□ 23. Buscar ObjectIDs via SOAP: DE envio + cada DE exclusão
□ 24. Criar ESD (send_class + sender_profile + tracking + SendDefinitionList)
□ 25. Calcular StartDateTime: hora_BRT + 4h (SFMC interpreta como UTC+1)
□ 26. Schedule ESD com <Action>start</Action>
□ 27. Planilha: status="agendado" + sfmc_send_id (CustomerKey do ESD)
```

**Output esperado por item:**
```
✅ [1/3] INGR0002 — geração concluída
    Preview: https://image.mkt.finclass.com/...
    Asset ID: 36500 | ES_ID: 30200
    Nome: [VND][30200][EML][20260324][INGR0002][TB_LEADS]

✅ [1/2] INGR0002 — agendado
    ESD: INGR0002-EMAIL-1-10H | 10:00 BRT → 14:00 UTC
```

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

**Colunas da aba Fila (A–Q, 17 colunas):**

| Col | Índice | Campo | Quem preenche | Valores válidos |
|-----|--------|-------|---------------|-----------------|
| A | 0 | status | Stakeholder/Agente | ver workflow abaixo |
| B | 1 | tipo | Stakeholder | `individual` \| `campanha` |
| C | 2 | template | Stakeholder | `news` \| `campanha` \| `conteudo` \| `relatorio` \| `comunicado` \| `consultor-elite` |
| D | 3 | nome | Stakeholder | nome livre |
| E | 4 | docx_link | Stakeholder | URL do .docx no Drive |
| F | 5 | data_envio | Stakeholder | DD/MM/YYYY |
| G | 6 | horario | Stakeholder | HH:MM ou HHh (BRT) |
| H | 7 | de_envio | Stakeholder | CustomerKey da DE de envio |
| I | 8 | de_exclusao | Stakeholder | CustomerKey da DE de exclusão (opcional) |
| J | 9 | sfmc_asset_id | **Agente** | ID do asset no CB |
| K | 10 | sfmc_send_id | **Agente** | CustomerKey do ESD |
| L | 11 | obs | Ambos | feedback de revisão |
| M | 12 | campanha | Stakeholder | código da campanha (ex: `CARN0004`, `SSL0001`) |
| N | 13 | preview_url | **Agente** | link CB direto do asset |
| O | 14 | send_classification | Stakeholder/Agente | CustomerKey da send class |
| P | 15 | sender_profile | Stakeholder/Agente | override do sender (ex: `285 — Fin News`) |
| Q | 16 | tracking_category | Stakeholder/Agente | override da tracking category (ex: `320503 — news`) |

**Índices 0-based:** `[0]status [1]tipo [2]template [3]nome [4]docx [5]data [6]horario [7]de_envio [8]de_exclusao [9]asset_id [10]send_id [11]obs [12]campanha [13]preview [14]send_class [15]sender_profile [16]tracking_category`

> **Distinção importante — coluna B vs coluna C:**
> - **Coluna B (`tipo`)** = tipo de **workflow**: `individual` (1 email do docx) | `campanha` (N emails com marcadores `=== EMAIL N ===`)
> - **Coluna C (`template`)** = tipo de **template**: qual layout usar — determina automaticamente sender, CB category e tracking

**Workflow de status:**
```
rascunho → pendente → aguardando_aprovacao → aprovado → agendado → enviado (Histórico)
                ↑                ↓
             revisar  ←←←←←←←←←←
```
- Stakeholder só toca em: `rascunho → pendente` e `aguardando_aprovacao → aprovado` (ou `revisar`)
- Agente avança todos os demais estados

**Colunas da aba Recorrentes (A–I, 9 colunas):**
`ativo | nome_serie | dias | horario | de_envio | de_exclusao | pasta_drive | convencao_arquivo | antecedencia_dias`

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
GOOGLE_TOKEN_TS=$(date +%s)  # timestamp para controle de renovação
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

Extrair config de uma BU (usar node — grep falha com a estrutura aninhada `sheets.<bu>`):
```bash
BU="finclass"  # exemplo
SPREADSHEET_ID=$(node -e "const c=require('./${SHEETS_CFG}'); console.log(c.sheets['${BU}'].spreadsheet_id)")
FILA_SHEET_ID=$(node -e "const c=require('./${SHEETS_CFG}'); console.log(c.sheets['${BU}'].sheet_ids.fila)")
HIST_SHEET_ID=$(node -e "const c=require('./${SHEETS_CFG}'); console.log(c.sheets['${BU}'].sheet_ids.historico)")
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
# Planilha tem 17 colunas (A–Q): status..tracking_category
FILA_RESP=$(curl -s -m 30 "$SHEETS_API/values/Fila%21A2%3AQ1000" -H "$GAUTH")
```

Filtrar e agrupar por status (guardar número da linha para cada item):
- `pendentes[]` → status = "pendente"
- `aprovados[]` → status = "aprovado"
- `revisoes[]` → status = "revisar"
- `aguardando[]` → status = "aguardando_aprovacao" (só para exibir no dashboard)

**Ordenar cada array por `data_envio` (col F, índice 5) antes de processar — envios mais urgentes primeiro:**

```bash
# Cada elemento dos arrays é: "ROW_NUM|data_envio|horario|nome|..."
# Ordenar por data_envio (campo 2) + horario (campo 3) — formato YYYY-MM-DD ordena lexicamente
pendentes_sorted=$(printf '%s\n' "${pendentes[@]}" | sort -t'|' -k2,2 -k3,3)
aprovados_sorted=$(printf '%s\n' "${aprovados[@]}"  | sort -t'|' -k2,2 -k3,3)
revisoes_sorted=$(printf '%s\n' "${revisoes[@]}"    | sort -t'|' -k2,2 -k3,3)

# Substituir os arrays originais
mapfile -t pendentes <<< "$pendentes_sorted"
mapfile -t aprovados <<< "$aprovados_sorted"
mapfile -t revisoes  <<< "$revisoes_sorted"
```

> `data_envio` no formato `YYYY-MM-DD` ordena corretamente por ordem lexicográfica. Se a coluna estiver vazia ou malformada, esses itens ficam no final — não travam o loop.

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

**Prosseguir automaticamente** — não pedir confirmação. Exibir o dashboard e iniciar o processamento imediatamente.

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
  curl -s -X PUT "$SHEETS_API/values/Fila%21A${ROW_NUM}%3AL${ROW_NUM}?valueInputOption=RAW" \
    -H "$GAUTH" -H "Content-Type: application/json" \
    -d "{\"values\": [[\"erro_docx\",\"${ROW_VALUES[1]}\",\"${ROW_VALUES[2]}\",\"$(jsafe "${ROW_VALUES[3]}")\",\"${ROW_VALUES[4]}\",\"${ROW_VALUES[5]}\",\"${ROW_VALUES[6]}\",\"${ROW_VALUES[7]}\",\"${ROW_VALUES[8]}\",\"\",\"\",\"Falha ao baixar .docx (HTTP $HTTP_CODE)\"]]}"
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

Ler a tabela de auto-config via `template` da col C (campo `[2]`):

| template | Arquivo template | Sender Profile | CB Category | Tracking Category |
|---|---|---|---|---|
| `news` | `templates/news.html` | Fin News (285) | 275176 | 320503 |
| `campanha` | `templates/campanha.html` | Equipe Finclass (194) | 275626 | 320491 |
| `conteudo` | `templates/conteudo.html` | Conteúdo - Finclass (270) | 275176 | 315907 |
| `relatorio` | `templates/relatorio.html` | Equipe Finclass (194) | 275176 | 278546 |
| `comunicado` | `templates/comunicado.html` | Equipe Finclass (194) | 275234 | 276056 |
| `consultor-elite` | `templates/consultor-elite.html` | Consultor de Elite (294) | 275176 | 317554 |

> ⚠️ Se `template` vazio (col C): marcar `erro_html` + obs "template não preenchido na col C" e pular.

Guardar para uso nos passos seguintes:
```bash
TEMPLATE_ID="${ROW_VALUES[2]}"   # col C, index 2
SENDER_PROFILE_ID=<id da tabela acima>
CB_CATEGORY_ID=<category da tabela acima>
TRACKING_CATEGORY_ID=<tracking da tabela acima>
TEMPLATE_FILE="email-agent/brands/${BU}/templates/${TEMPLATE_ID}.html"
```

**Se `tipo=individual`:** executar slot-filling completo seguindo **exatamente** as instruções da skill `/email`.

> ⚠️ **OBRIGATÓRIO:** antes de gerar o HTML, ler o arquivo `.claude/skills/email/SKILL.md` com o Read tool. As regras de extração de conteúdo (Passos 4, 4-A, 4-C) e de preenchimento de slots (Passo 5) estão descritas lá em detalhe — tipografia, quote blocks, dividers, tratamento de negrito/cor/imagens. Seguir essas instruções à risca garante a mesma qualidade do skill `/email`.

Fluxo resumido (detalhes no email SKILL.md):
1. Ler `.claude/skills/email/SKILL.md` (Read tool)
2. Extrair do docx: subject, preheader, corpo completo, formatação (negrito, cor, itálico), imagens
3. Carregar `$TEMPLATE_FILE` — **nunca reescrever a estrutura**, apenas preencher os `{{slots}}`
4. Para imagens: fazer upload no SFMC (categoria `$CB_CATEGORY_ID`, token BU) e substituir src no HTML
5. Se `template_id=campanha` e copy contiver link PMP: gerar bloco AMPscript (ver email SKILL.md Passo 5)
6. Nomear arquivo: `/tmp/queue_work/<BU>-<YYYY-MM-DD>-<slug-nome>.html`

Se subject/preheader não encontrado no docx: marcar `erro_html` + obs descritiva e pular.

**Após gerar o HTML (individual ou campanha), validar AMPscript antes de fazer upload:**

```bash
# Anti-pattern crítico: %%campo%% brutas em href de CTAs = personalization string, não AMPscript
# Correto: %%=v(@variavel)=%% dentro de href
# Errado:  %%url%%, %%link%%, %%cta_url%% etc. em href ou no corpo

BAD_PERSO=$(grep -oP '%%(?!=)[^%]+%%' "$HTML_FILE" \
  | grep -v '%%view_email_url%%\|%%profile_center_url%%\|%%unsub_center_url%%\|%%Member_\|%%_\|%%jobid\|%%emailaddr\|%%emailname_\|%%CloudPagesURL\|%%AttributeValue' \
  | sort -u)

if [ -n "$BAD_PERSO" ]; then
  ERR_MSG="HTML gerado contém personalization strings brutas: $(echo $BAD_PERSO | tr '\n' ' ')— corrigir para %%=v(@variavel)=%% se for AMPscript, ou remover"
  echo "❌ [${ROW_NUM}] $ERR_MSG"
  ERR_SAFE=$(jsafe "$ERR_MSG")
  curl -s -X PUT "$SHEETS_API/values/Fila%21A${ROW_NUM}%3AL${ROW_NUM}?valueInputOption=RAW" \
    -H "$GAUTH" -H "Content-Type: application/json" \
    -d "{\"values\": [[\"erro_html\",\"${ROW_VALUES[1]}\",\"${ROW_VALUES[2]}\",\"$(jsafe "${ROW_VALUES[3]}")\",\"${ROW_VALUES[4]}\",\"${ROW_VALUES[5]}\",\"${ROW_VALUES[6]}\",\"${ROW_VALUES[7]}\",\"${ROW_VALUES[8]}\",\"\",\"\",\"${ERR_SAFE}\"]]}"
  continue
fi
```

> ℹ️ Erro típico: ao gerar bloco PMP, usar `href="%%url%%"` em vez de `href="%%=v(@url)=%%"`. A variável AMPscript deve sempre ser acessada via `%%=v(@nome)=%%`, nunca como `%%nome%%`.

**Se `tipo=campanha`:** executar slot-filling para cada email (mesmos passos da skill `/campaign`):
- Detectar marcadores `=== EMAIL N - Nome ===` no docx
- Para cada seção: carregar `$TEMPLATE_FILE` e preencher slots com a copy daquela seção
- Gerar N HTMLs em `/tmp/queue_work/`
- Se link PMP presente: cada email = cópia separada com `TODO_EMAILID` próprio (substituído individualmente no Passo 5-D)

### 5-D: Upload HTML(s) e imagens para SFMC + naming convention

```bash
source email-agent/.env
TEMPLATE_ID="${ROW_VALUES[2]}"     # col C, index 2
ROW_NOME="${ROW_VALUES[3]}"        # col D, index 3
ROW_DOCX="${ROW_VALUES[4]}"        # col E, index 4
# ⚠️ IMUTÁVEIS: NUNCA sobrescrever ORIG_DATA e ORIG_HORARIO durante o Loop 1.
# São usados no PUT final (5-F) para preservar os valores originais da planilha.
# NÃO calcular StartDateTime, NÃO aplicar BRT+4h aqui — isso é exclusivo do Loop 2.
ORIG_DATA="${ROW_VALUES[5]}"       # col F, index 5 — data_envio ORIGINAL, não modificar
ORIG_HORARIO="${ROW_VALUES[6]}"    # col G, index 6 — horario ORIGINAL, não modificar
ROW_DATA="$ORIG_DATA"              # alias leitura — não usar para cálculos
ROW_HORARIO="$ORIG_HORARIO"        # alias leitura — não usar para cálculos
DE_ENVIO="${ROW_VALUES[7]}"        # col H, index 7 (CustomerKey da DE de envio)
DE_EXCL="${ROW_VALUES[8]}"         # col I, index 8 (CustomerKey da DE de exclusão, pode ser vazio)
CAMPAIGN_CODE="${ROW_VALUES[12]}"  # col M, index 12

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

Executar upload de imagens seguindo o fluxo da skill `/email` (Passos 9-11).

**Upload do HTML para o Content Builder — payload obrigatório em 3 partes:**

> ⚠️ **CRÍTICO:** NUNCA usar `printf '...%s...' "$HTML_CONTENT"` para embutir HTML no JSON.
> O `printf` interpreta `%%` do AMPscript como `%`, corrompendo o HTML e gerando conteúdo vazio no CB.
> Sempre montar o payload em partes com `>>` e usar `awk -f` para escapar.

```bash
AWK_SCRIPT="email-agent/scripts/escape_html.awk"

# Verificar que o HTML gerado não está vazio antes de fazer upload
[ -s "$HTML_FILE" ] || { echo "❌ HTML_FILE vazio ou não encontrado: $HTML_FILE"; continue; }

# Montar payload em 3 partes — NUNCA em um printf só
SUBJ_SAFE=$(echo "$SUBJECT" | sed 's/"/\\"/g')
PREHEADER_SAFE=$(echo "$PREHEADER" | sed 's/"/\\"/g')

printf '{"name":"TEMP_UPLOAD","assetType":{"name":"htmlemail","id":208},"category":{"id":%d},"views":{"html":{"content":"' \
  "$CB_CATEGORY_ID" > /tmp/cb_payload.json
awk -f "$AWK_SCRIPT" "$HTML_FILE" >> /tmp/cb_payload.json
printf '"},"subjectline":{"content":"%s"},"preheader":{"content":"%s"}}}' \
  "$SUBJ_SAFE" "$PREHEADER_SAFE" >> /tmp/cb_payload.json

# Verificar que o payload não está truncado (deve ter fechamento "}}")
tail -c 5 /tmp/cb_payload.json | grep -q '}}' || { echo "❌ Payload JSON malformado — verificar escape_html.awk"; continue; }

POST_RESP=$(sfmc_upload \
  "https://${SFMC_SUBDOMAIN}.rest.marketingcloudapis.com/asset/v1/content/assets" \
  "$SFMC_BU_TOK" \
  "/tmp/cb_payload.json")

CB_ASSET_ID=$(echo "$POST_RESP" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -z "$CB_ASSET_ID" ]; then
  echo "❌ Upload HTML falhou. Response: $(echo "$POST_RESP" | head -c 300)"
  continue
fi
echo "✓ HTML uploaded → CB Asset ID: $CB_ASSET_ID"
```

**Padrão de retry para todos os uploads SFMC (imagens e HTML):**

```bash
# sfmc_upload: tenta até 3 vezes com 2s de intervalo
# Uso: POST_RESP=$(sfmc_upload "$URL" "$TOKEN" "$PAYLOAD_FILE")
sfmc_upload() {
  local URL="$1" TOK="$2" FILE="$3"
  local RESP=""
  for TRY in 1 2 3; do
    RESP=$(curl -s -m 30 -X POST "$URL" \
      -H "Authorization: Bearer $TOK" \
      -H "Content-Type: application/json" \
      --data-binary @"$FILE")
    # Sucesso: response contém "id" numérico
    echo "$RESP" | grep -q '"id":[0-9]' && break
    echo "⏳ Upload falhou (tentativa $TRY/3) — aguardando 2s..."
    sleep 2
  done
  echo "$RESP"
}
```

> Usar `sfmc_upload` para o POST de imagens e para o POST do HTML do email. Upload de imagem falha ocasionalmente por timeout de rede; 3 tentativas cobrem a grande maioria dos casos transientes.

**Após o POST REST (upload do email), executar o fluxo de ES_ID:**

```bash
# 1. Guardar Asset ID retornado pelo POST REST
CB_ASSET_ID=$(echo "$POST_RESP" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

# 2. Obter o Email Studio ID via legacyData do CB REST — imediato, sem aguardar SOAP sync
#    O campo legacyData.legacyId está disponível instantaneamente após o POST
CB_ASSET_RESP=$(curl -s -m 20 \
  "https://${SFMC_SUBDOMAIN}.rest.marketingcloudapis.com/asset/v1/content/assets/${CB_ASSET_ID}" \
  -H "Authorization: Bearer $SFMC_BU_TOK")
ES_ID=$(echo "$CB_ASSET_RESP" | grep -o '"legacyId":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -z "$ES_ID" ]; then
  echo "❌ [${ROW_NUM}] legacyData.legacyId vazio para CB asset $CB_ASSET_ID"
  curl -s -X PUT "$SHEETS_API/values/Fila%21A${ROW_NUM}%3AL${ROW_NUM}?valueInputOption=RAW" \
    -H "$GAUTH" -H "Content-Type: application/json" \
    -d "{\"values\": [[\"erro_html\",\"${ROW_VALUES[1]}\",\"${ROW_VALUES[2]}\",\"$(jsafe "${ROW_VALUES[3]}")\",\"${ROW_VALUES[4]}\",\"${ROW_VALUES[5]}\",\"${ROW_VALUES[6]}\",\"${ROW_VALUES[7]}\",\"${ROW_VALUES[8]}\",\"\",\"\",\"ES_ID ausente: legacyData vazio para CB asset $CB_ASSET_ID\"]]}"
  continue
fi
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
# Inferir automaticamente do nome da campanha (col D) e/ou código (col M) — nunca perguntar
# Regra: presença de "venda", "vnd", "oferta", "promo" → VND
#        presença de "captacao", "cap", "lead", "inscr" → CAP
#        presença de "aquec", "aqu", "nurture", "jornada" → AQU
#        padrão se nenhuma pista → VND
ROW_NOME_LOWER=$(echo "${ROW_VALUES[3]} ${CAMPAIGN_CODE}" | tr '[:upper:]' '[:lower:]')
if echo "$ROW_NOME_LOWER" | grep -qE 'vnd|venda|oferta|promo|compra'; then
  TIPO_PMP="VND"
elif echo "$ROW_NOME_LOWER" | grep -qE 'cap|captac|lead|inscr|convite'; then
  TIPO_PMP="CAP"
elif echo "$ROW_NOME_LOWER" | grep -qE 'aqu|aquec|nurture|jornada|boas.?vin'; then
  TIPO_PMP="AQU"
else
  TIPO_PMP="VND"  # padrão seguro
fi

# Para campanha individual (tipo=individual):
# Formato: [TIPO][ES_ID][EML][YYYYMMDD][CAMPANHA][BASE]
# DE_BASE = DE de envio (col H, index 7)
DE_BASE=$(echo "$DE_ENVIO" | tr '[:lower:]' '[:upper:]' | tr ' ' '_' | cut -c1-20)
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

**Para `tipo=campanha`: validar que N_emails_criados == N_DEs_envio antes de prosseguir:**

```bash
if [ "$ROW_TIPO" = "campanha" ]; then
  N_DES=${#DE_ENVIO_LIST[@]}
  N_EMAILS=${#CB_ASSET_IDS[@]}

  if [ "$N_EMAILS" -ne "$N_DES" ]; then
    CAMP_ERR="Campanha incompleta: ${N_EMAILS}/${N_DES} emails criados no CB"
    echo "⚠ [${ROW_NUM}] $CAMP_ERR"
    # Continuar com os emails que foram criados, mas registrar no obs
    ROW_OBS="${ROW_OBS:+$ROW_OBS | }${CAMP_ERR} — verificar antes de aprovar"
  else
    echo "✅ Campanha completa: ${N_EMAILS}/${N_DES} emails criados"
  fi

  # Listar todos os IDs no obs para referência no Loop 2
  IDS_STR=""
  for i in "${!CB_ASSET_IDS[@]}"; do
    IDS_STR="${IDS_STR}Email $((i+1)): CB=${CB_ASSET_IDS[$i]} | "
  done
  ROW_OBS="${ROW_OBS:+$ROW_OBS | }IDs: ${IDS_STR%% | }"
fi
```

### 5-D-post: Validar personalization strings no HTML gerado (Loop 1)

Executar **antes** de salvar o status `aguardando_aprovacao`. Detectar problemas cedo — stakeholder precisa saber antes de aprovar.

```bash
# Extrair %%Campo%% do HTML (excluir SFMC system strings e AMPscript functions)
PERSO_STRINGS=$(grep -oP '%%(?!=)[^%]+%%' "$HTML_FILE" \
  | grep -vP '%%view_email_url%%|%%profile_center_url%%|%%unsub_center_url%%|%%Member_|%%_|%%jobid|%%emailaddr|%%emailname_|%%CloudPagesURL|%%AttributeValue' \
  | sort -u)

PERSO_WARNING=""
if [ -n "$PERSO_STRINGS" ]; then
  # Verificar contra a DE de envio via SOAP
  if [ -n "$DE_ENVIO" ]; then
    printf '<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <soapenv:Header><fueloauth xmlns="http://exacttarget.com">%s</fueloauth></soapenv:Header>
  <soapenv:Body><RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
    <RetrieveRequest>
      <ObjectType>DataExtensionField</ObjectType>
      <Properties>Name</Properties>
      <Filter xsi:type="SimpleFilterPart">
        <Property>DataExtension.CustomerKey</Property>
        <SimpleOperator>equals</SimpleOperator>
        <Value>%s</Value>
      </Filter>
    </RetrieveRequest>
  </RetrieveRequestMsg></soapenv:Body>
</soapenv:Envelope>' "$SFMC_BU_TOK" "$DE_ENVIO" > /tmp/soap_de_fields.xml

    DE_FIELDS_RESP=$(curl -s -m 30 -X POST "https://${SFMC_SUBDOMAIN}.soap.marketingcloudapis.com/Service.asmx" \
      -H "Content-Type: text/xml;charset=UTF-8" -H "SOAPAction: Retrieve" \
      --data-binary @/tmp/soap_de_fields.xml)
    DE_FIELDS=$(echo "$DE_FIELDS_RESP" | grep -o '<Name>[^<]*</Name>' | sed 's/<[^>]*>//g' | tr '\n' '|')

    while IFS= read -r ps; do
      FIELD_NAME=$(echo "$ps" | tr -d '%')
      if ! echo "|$DE_FIELDS|" | grep -qi "|${FIELD_NAME}|"; then
        PERSO_WARNING="${PERSO_WARNING}${ps} "
      fi
    done <<< "$PERSO_STRINGS"
  fi
fi

# Se houver strings inválidas: incluir no obs mas NÃO bloquear (email foi gerado; stakeholder decide)
if [ -n "$PERSO_WARNING" ]; then
  echo "⚠ [${ROW_NUM}] Personalization strings não encontradas na DE '${DE_ENVIO}': ${PERSO_WARNING}"
  OBS_WARNING="⚠ Personalization strings ausentes na DE: ${PERSO_WARNING}— verificar antes de aprovar"
  ROW_OBS="${ROW_OBS:+$ROW_OBS | }${OBS_WARNING}"
else
  echo "✅ Personalization strings OK"
fi
```

> Em Loop 1 não bloqueamos — o email já foi gerado e upado. O aviso vai para o campo `obs` na planilha para o stakeholder revisar antes de aprovar. O bloqueio duro ocorre em Loop 2 (passo 6-B-pre).

### 5-E: Gerar link de preview (CB direto)

Após o upload do HTML, construir o link de preview diretamente a partir do `CB_ASSET_ID` — sem screenshot, sem upload de PNG.

```bash
PREVIEW_URL="https://mc.s7.exacttarget.com/cloud/#app/email/C12/${CB_ASSET_ID}"
```

**Para campanha com N emails:**
```bash
# Um link por email
PREVIEW_ALL_URLS=""
for i in "${!CB_ASSET_IDS[@]}"; do
  PREVIEW_ALL_URLS="${PREVIEW_ALL_URLS}Email $((i+1)): https://mc.s7.exacttarget.com/cloud/#app/email/C12/${CB_ASSET_IDS[$i]} | "
done
PREVIEW_URL="https://mc.s7.exacttarget.com/cloud/#app/email/C12/${CB_ASSET_IDS[0]}"
```

> O link abre diretamente o HTML no Content Builder — nenhum token ou upload extra necessário.

### 5-F: Atualizar linha → aguardando_aprovacao

```bash
# Para campanha: acrescentar links dos outros previews no obs
OBS_UPDATED="$ROW_OBS"
if [ "$ROW_TIPO" = "campanha" ]; then
  OBS_UPDATED="${ROW_OBS:+$ROW_OBS | }Previews: ${PREVIEW_ALL_URLS}"
fi

# 17 colunas: A=status B=tipo C=template D=nome E=docx F=data G=horario
# H=de_envio I=de_excl J=asset_id K=send_id L=obs M=campanha N=preview O=send_class P=sender Q=tracking
NOME_SAFE=$(jsafe "$ROW_NOME")
OBS_SAFE=$(jsafe "$OBS_UPDATED")
ROW_SEND_CLASS="${ROW_VALUES[14]}"  # col O, index 14

printf '{"values": [["aguardando_aprovacao","%s","%s","%s","%s","%s","%s","%s","%s","%s","","%s","%s","%s","%s","%s","%s"]]}\n' \
  "$ROW_TIPO" "$TEMPLATE_ID" "$NOME_SAFE" "$ROW_DOCX" "$ORIG_DATA" "$ORIG_HORARIO" \
  "$DE_ENVIO" "$DE_EXCL" \
  "$SFMC_ASSET_ID" \
  "$OBS_SAFE" "$CAMPAIGN_CODE" "$PREVIEW_URL" "$ROW_SEND_CLASS" \
  "${ROW_VALUES[15]}" "${ROW_VALUES[16]}" \
  > /tmp/fila_put.json

curl -s -X PUT "$SHEETS_API/values/Fila%21A${ROW_NUM}%3AQ${ROW_NUM}?valueInputOption=RAW" \
  -H "$GAUTH" -H "Content-Type: application/json" \
  --data-binary @/tmp/fila_put.json
```

```
✅ [1/N] "<nome>" → aguardando_aprovacao
         Preview CB: <PREVIEW_URL>
```

### 5-G: Limpeza /tmp entre itens

Ao final de cada item do Loop 1 (após 5-F), limpar arquivos temporários antes de processar o próximo:

```bash
rm -rf /tmp/docx_work /tmp/queue_work
rm -f /tmp/fila_put.json /tmp/soap_de_fields.xml /tmp/email_html.html
mkdir -p /tmp/docx_work/media /tmp/queue_work
```

---

## Passo 6: Loop 2 — aprovado → agendado

Para cada item em `aprovados[]`, em ordem de `data_envio`:

```
📅 [1/M] Agendando: "<nome>" — <bu> | <data> <horario>
```

### 6-0: Verificar se o horário já passou

**Antes de qualquer operação SFMC**, verificar se `data_envio + horario` já é passado. Se sim, marcar como `horario_expirado` e pular — **não criar Email Studio, não criar ESD**.

```bash
# Converter data_envio (YYYY-MM-DD) + horario (HH:MM) para epoch BRT
ROW_DATA="${ROW_VALUES[5]}"     # col F, index 5 (ex: "2026-03-25")
ROW_HORARIO="${ROW_VALUES[6]}"  # col G, index 6 (ex: "19:00")

SCHEDULED_EPOCH=$(TZ="America/Sao_Paulo" date -d "${ROW_DATA} ${ROW_HORARIO}" +%s 2>/dev/null)
NOW_EPOCH=$(date +%s)

if [ -n "$SCHEDULED_EPOCH" ] && [ "$NOW_EPOCH" -gt "$SCHEDULED_EPOCH" ]; then
  echo "⏰ [${ROW_NUM}] Horário expirado: ${ROW_DATA} ${ROW_HORARIO} BRT — marcar horario_expirado"
  curl -s -X PUT "$SHEETS_API/values/Fila%21A${ROW_NUM}%3AA${ROW_NUM}?valueInputOption=RAW" \
    -H "$GAUTH" -H "Content-Type: application/json" \
    -d "{\"values\": [[\"horario_expirado\"]]}"
  continue
fi
```

> Status `horario_expirado` sinaliza que o horário de envio já passou. Para reagendar: alterar `data_envio`/`horario` na planilha e mudar o status de volta para `aprovado`.

### 6-0b: Proteção contra duplo agendamento

Se `sfmc_send_id` (col K, índice 10) já estiver preenchido, o ESD já foi criado em uma execução anterior. Pular sem criar nada.

```bash
EXISTING_SEND_ID="${ROW_VALUES[10]}"  # col K, index 10

if [ -n "$EXISTING_SEND_ID" ]; then
  echo "⚠ [${ROW_NUM}] sfmc_send_id já existe ('${EXISTING_SEND_ID}') — ESD já foi criado, pulando para evitar duplicata"
  continue
fi
```

> Proteção essencial se `/queue` for executado duas vezes seguidas ou se a linha `aprovado` for processada em sessões diferentes.

### 6-A: Ler send_classification

A coluna O (índice 14) pode conter o CustomerKey da send class (ex: `"84"`). Extrair sempre a parte antes do ` — ` se houver texto extra:

```bash
# Ler DEs e campos de configuração
DE_ENVIO="${ROW_VALUES[7]}"        # col H, index 7
DE_EXCL="${ROW_VALUES[8]}"         # col I, index 8
TEMPLATE_ID="${ROW_VALUES[2]}"     # col C, index 2
ROW_NOME="${ROW_VALUES[3]}"        # col D, index 3
ROW_DOCX="${ROW_VALUES[4]}"        # col E, index 4
ROW_DATA="${ROW_VALUES[5]}"        # col F, index 5
ROW_HORARIO="${ROW_VALUES[6]}"     # col G, index 6
CAMPAIGN_CODE="${ROW_VALUES[12]}"  # col M, index 12
ROW_PREVIEW_URL="${ROW_VALUES[13]}" # col N, index 13
SFMC_ASSET_ID="${ROW_VALUES[9]}"   # col J, index 9

# Ler da coluna O (índice 14)
RAW_CLASS="${ROW_VALUES[14]}"

# Extrair CustomerKey: parte antes do " — " (ou valor inteiro se não houver " — ")
SEND_CLASS=$(echo "$RAW_CLASS" | sed 's/ —.*//' | tr -d ' ')

# Fallback: ler do brand.json se col O vazia
if [ -z "$SEND_CLASS" ]; then
  SEND_CLASS=$(grep -o '"send_classification":"[^"]*"' "email-agent/brands/${BU}/brand.json" | cut -d'"' -f4)
fi

# Se ainda vazio: marcar erro e pular
if [ -z "$SEND_CLASS" ]; then
  ERR_SAFE=$(jsafe "send_classification não configurado (col O nem brand.json)")
  curl -s -X PUT "$SHEETS_API/values/Fila%21A${ROW_NUM}%3AL${ROW_NUM}?valueInputOption=RAW" \
    -H "$GAUTH" -H "Content-Type: application/json" \
    -d "{\"values\": [[\"erro_agendamento\",\"${ROW_VALUES[1]}\",\"${TEMPLATE_ID}\",\"$(jsafe "$ROW_NOME")\",\"${ROW_DOCX}\",\"${ROW_DATA}\",\"${ROW_HORARIO}\",\"${DE_ENVIO}\",\"${DE_EXCL}\",\"${SFMC_ASSET_ID}\",\"\",\"${ERR_SAFE}\"]]}"
  echo "❌ [${ROW_NUM}] send_classification ausente — pulando"
  continue
fi
```

### 6-B: Criar Email Studio + ESD + agendar (auto-config por template)

Ler `template` da col C (`[2]`) e usar a tabela de auto-config para determinar **sender profile** e **tracking category** automaticamente — sem perguntar ao usuário:

```bash
TEMPLATE_ID="${ROW_VALUES[2]}"   # col C, index 2
BRAND_JSON="email-agent/brands/${BU}/brand.json"

# Verificar override de sender/tracking nas colunas da planilha (P/Q, índices 15/16)
# Formato: "ID — Descrição" ou apenas "ID"
COL_SENDER_OVERRIDE="${ROW_VALUES[15]}"   # col P
COL_TRACKING_OVERRIDE="${ROW_VALUES[16]}" # col Q

# Auto-config por template_id — usar grep/awk (jq não disponível no ambiente)
# Formato esperado no brand.json: "templates": { "campanha": { "sender_profile_id": 194, ... } }
TMPL_SENDER=$(grep -A5 "\"${TEMPLATE_ID}\":" "$BRAND_JSON" 2>/dev/null \
  | grep '"sender_profile_id"' | grep -o '[0-9]*' | head -1)
TMPL_TRACKING=$(grep -A5 "\"${TEMPLATE_ID}\":" "$BRAND_JSON" 2>/dev/null \
  | grep '"tracking_category_id"' | grep -o '[0-9]*' | head -1)

# Prioridade: coluna planilha > brand.json > fallback hardcoded
if [ -n "$COL_SENDER_OVERRIDE" ]; then
  SENDER_PROFILE_ID=$(echo "$COL_SENDER_OVERRIDE" | sed 's/ —.*//' | tr -d ' ')
elif [ -n "$TMPL_SENDER" ]; then
  SENDER_PROFILE_ID="$TMPL_SENDER"
else
  # Fallback hardcoded Finclass
  case "$TEMPLATE_ID" in
    news)            SENDER_PROFILE_ID=285 ;;
    campanha)        SENDER_PROFILE_ID=194 ;;
    conteudo)        SENDER_PROFILE_ID=270 ;;
    relatorio)       SENDER_PROFILE_ID=194 ;;
    comunicado)      SENDER_PROFILE_ID=194 ;;
    consultor-elite) SENDER_PROFILE_ID=294 ;;
    *) echo "❌ template_id desconhecido para BU $BU: $TEMPLATE_ID"; continue ;;
  esac
fi

if [ -n "$COL_TRACKING_OVERRIDE" ]; then
  TRACKING_CAT_ID=$(echo "$COL_TRACKING_OVERRIDE" | sed 's/ —.*//' | tr -d ' ')
elif [ -n "$TMPL_TRACKING" ]; then
  TRACKING_CAT_ID="$TMPL_TRACKING"
else
  # Fallback hardcoded Finclass
  case "$TEMPLATE_ID" in
    news)            TRACKING_CAT_ID=320503 ;;
    campanha)        TRACKING_CAT_ID=320491 ;;
    conteudo)        TRACKING_CAT_ID=315907 ;;
    relatorio)       TRACKING_CAT_ID=278546 ;;
    comunicado)      TRACKING_CAT_ID=276056 ;;
    consultor-elite) TRACKING_CAT_ID=317554 ;;
  esac
fi
```

> ℹ️ `send_classification` vem de col O / índice 14 (Passo 6-A); sender_profile e tracking vêm de `brand.json` ou fallback Finclass.
> Para Hub: apenas `news` e `campanha` — qualquer outro template na col C marcará `erro_agendamento`.

### 6-B-pre: Validar personalization strings ANTES de criar Email Studio

> ⚠️ **CRÍTICO:** O SFMC só reporta `%%Campo%%` inválido no momento do Schedule (não na criação do Email). Sem essa validação, emails são criados no ES como orphans mas nunca agendados.

```bash
# Localizar o HTML gerado no Passo 5-D (usar SFMC_ASSET_ID para identificar o arquivo local)
HTML_FILE="/tmp/queue_work/$(ls /tmp/queue_work/*.html 2>/dev/null | head -1 | xargs basename 2>/dev/null)"

if [ -f "$HTML_FILE" ]; then
  # Extrair personalization strings brutas: %%Campo%% (excluir %%=...=%% que são AMPscript functions)
  PERSO_STRINGS=$(grep -oP '%%(?!=)[^%]+%%' "$HTML_FILE" \
    | grep -v '%%view_email_url%%\|%%profile_center_url%%\|%%unsub_center_url%%\|%%Member_\|%%_\|%%jobid\|%%emailaddr\|%%emailname_\|%%CloudPagesURL\|%%AttributeValue' \
    | sort -u)

  if [ -n "$PERSO_STRINGS" ]; then
    echo "🔍 Personalization strings encontradas: $(echo $PERSO_STRINGS | tr '\n' ' ')"

    # Buscar campos da DE de envio via SOAP
    printf '<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <soapenv:Header><fueloauth xmlns="http://exacttarget.com">%s</fueloauth></soapenv:Header>
  <soapenv:Body><RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
    <RetrieveRequest>
      <ObjectType>DataExtensionField</ObjectType>
      <Properties>Name</Properties>
      <Filter xsi:type="SimpleFilterPart">
        <Property>DataExtension.CustomerKey</Property>
        <SimpleOperator>equals</SimpleOperator>
        <Value>%s</Value>
      </Filter>
    </RetrieveRequest>
  </RetrieveRequestMsg></soapenv:Body>
</soapenv:Envelope>' "$SFMC_BU_TOK" "$DE_ENVIO" > /tmp/soap_de_fields.xml

    DE_FIELDS_RESP=$(curl -s -m 30 -X POST "https://${SFMC_SUBDOMAIN}.soap.marketingcloudapis.com/Service.asmx" \
      -H "Content-Type: text/xml;charset=UTF-8" -H "SOAPAction: Retrieve" \
      --data-binary @/tmp/soap_de_fields.xml)

    DE_FIELDS=$(echo "$DE_FIELDS_RESP" | grep -o '<Name>[^<]*</Name>' | sed 's/<[^>]*>//g' | tr '\n' '|')
    echo "🔍 Campos da DE '$DE_ENVIO': $DE_FIELDS"

    INVALID_PERSO=""
    while IFS= read -r ps; do
      FIELD_NAME=$(echo "$ps" | tr -d '%')
      if ! echo "|$DE_FIELDS|" | grep -qi "|${FIELD_NAME}|"; then
        INVALID_PERSO="${INVALID_PERSO}${ps} "
      fi
    done <<< "$PERSO_STRINGS"

    if [ -n "$INVALID_PERSO" ]; then
      ERR_MSG="Personalization strings não encontradas na DE '${DE_ENVIO}': ${INVALID_PERSO}— corrigir no HTML antes de aprovar"
      echo "❌ [${ROW_NUM}] $ERR_MSG"
      ERR_SAFE=$(jsafe "$ERR_MSG")
      curl -s -X PUT "$SHEETS_API/values/Fila%21A${ROW_NUM}%3AL${ROW_NUM}?valueInputOption=RAW" \
        -H "$GAUTH" -H "Content-Type: application/json" \
        -d "{\"values\": [[\"erro_agendamento\",\"${ROW_VALUES[1]}\",\"${TEMPLATE_ID}\",\"$(jsafe "$ROW_NOME")\",\"${ROW_DOCX}\",\"${ROW_DATA}\",\"${ROW_HORARIO}\",\"${DE_ENVIO}\",\"${DE_EXCL}\",\"${SFMC_ASSET_ID}\",\"\",\"${ERR_SAFE}\"]]}"
      continue
    fi

    echo "✅ Personalization strings válidas"
  fi
fi
```

**Renovar token SFMC antes de criar o Email Studio (token pode ter expirado desde o Loop 1):**

```bash
# Renovar token SFMC — Loop 1 pode ter corrido há mais de 1h
SFMC_BU_TOK=$(curl -s -m 15 -X POST \
  "https://${SFMC_SUBDOMAIN}.auth.marketingcloudapis.com/v2/token" \
  -H "Content-Type: application/json" \
  -d "{\"grant_type\":\"client_credentials\",\"client_id\":\"${SFMC_CLIENT_ID}\",\"client_secret\":\"${SFMC_CLIENT_SECRET}\",\"account_id\":\"${MID_BU}\"}" \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
[ -z "$SFMC_BU_TOK" ] && { echo "❌ Falha ao renovar token SFMC"; continue; }

# Renovar Google token se > 50min desde o início (margem de segurança antes de 60min)
ELAPSED=$(( $(date +%s) - GOOGLE_TOKEN_TS ))
if [ "$ELAPSED" -gt 3000 ]; then
  # Re-executar bloco de auth Google do Passo 1
  NOW=$(date +%s); EXP=$((NOW+3600))
  H=$(echo -n '{"alg":"RS256","typ":"JWT"}' | b64url)
  P=$(printf '{"iss":"%s","scope":"https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly","aud":"https://oauth2.googleapis.com/token","exp":%d,"iat":%d}' \
      "$CLIENT_EMAIL" "$EXP" "$NOW" | b64url)
  S=$(printf '%s.%s' "$H" "$P" | openssl dgst -sha256 -sign /tmp/mktc_key.pem -binary | openssl base64 -e -A | tr '+/' '-_' | tr -d '=')
  GOOGLE_TOK=$(curl -s -m 15 -X POST "https://oauth2.googleapis.com/token" \
    --data-urlencode "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer" \
    --data-urlencode "assertion=${H}.${P}.${S}" \
    | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
  GAUTH="Authorization: Bearer $GOOGLE_TOK"
  GOOGLE_TOKEN_TS=$(date +%s)
  echo "🔄 Google token renovado"
fi
```

> No Passo 1, logo após obter o token Google, registrar o timestamp: `GOOGLE_TOKEN_TS=$(date +%s)`.

**Obter HTML do Content Builder (não depender de arquivo local):**

O HTML gerado no Loop 1 pode não existir mais no `/tmp`. Para criar o Email Studio via SOAP, baixar o HTML direto do CB:

```bash
SFMC_ASSET_ID="${ROW_VALUES[9]}"  # col J, index 9

CB_RESP=$(curl -s -m 30 \
  "https://${SFMC_SUBDOMAIN}.rest.marketingcloudapis.com/asset/v1/content/assets/${SFMC_ASSET_ID}" \
  -H "Authorization: Bearer $SFMC_BU_TOK")

# Extrair o HTML content (campo views.html.content — JSON escaped)
# Usar awk para desescapar e salvar em arquivo temporário
echo "$CB_RESP" | grep -o '"content":"[^"]*"' | head -1 | sed 's/"content":"//;s/"$//' \
  | awk '{gsub(/\\n/,"\n"); gsub(/\\t/,"\t"); gsub(/\\"/,"\""); gsub(/\\\\/,"\\"); print}' \
  > /tmp/queue_html_for_soap.html

[ -s /tmp/queue_html_for_soap.html ] || { echo "❌ Não foi possível baixar HTML do CB asset $SFMC_ASSET_ID"; continue; }
HTML_FILE="/tmp/queue_html_for_soap.html"
echo "✓ HTML baixado do CB (asset $SFMC_ASSET_ID)"
```

Executar os Passos 2-7 da skill `/send` usando os valores da linha:
- `sfmc_asset_id` da col J (index 9) → HTML obtido via CB REST acima → criar Email object no Email Studio via SOAP
- `de_envio` da col H (index 7, variável `$DE_ENVIO`) → buscar ObjectID via SOAP Retrieve
- `de_exclusao` da col I (index 8, variável `$DE_EXCL`) → buscar ObjectID via SOAP se não vazia
- `data_envio` + `horario` → converter BRT→UTC (+4h) ← **SFMC interpreta StartDateTime como UTC+1, portanto hora_submeter = BRT + 4h**
- `send_classification` → `SEND_CLASS` (Passo 6-A)
- `sender_profile` → `SENDER_PROFILE_ID` (auto-config acima)
- `tracking` → `TRACKING_CAT_ID` (auto-config acima)

> ⚠️ **Orphan cleanup:** Se o Email Studio foi criado (`NEW_EMAIL_ID` populado) mas o Schedule falhou, registrar no obs: `"ES orphan criado: ID=${NEW_EMAIL_ID} — Schedule falhou: ${SCHED_MSG}"` e marcar `erro_agendamento`. Nunca deixar o email criado sem registro.

**Naming convention do ESD — baseada no template:**

Para emails de campanha (template = `campanha`), usar o padrão PMP com tipo:
```bash
CAMPAIGN_CODE="${ROW_VALUES[12]}"  # col M, index 12
HORARIO_TAG=$(echo "$ROW_HORARIO" | sed 's/://g' | cut -c1-4)  # ex: 1000
# DE_BASE = DE de envio (col H, index 7)
DE_BASE=$(echo "$DE_ENVIO" | tr '[:lower:]' '[:upper:]' | tr ' _' '-' | sed 's/[^A-Z0-9-]//g' | cut -c1-20)

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
# 17 colunas: A=status B=tipo C=template D=nome E=docx F=data G=horario
# H=de_envio I=de_excl J=asset_id K=send_id L=obs M=campanha N=preview O=send_class P=sender Q=tracking
NOME_SAFE=$(jsafe "$ROW_NOME")
OBS_SAFE=$(jsafe "$ROW_OBS")

printf '{"values": [["agendado","%s","%s","%s","%s","%s","%s","%s","%s","%s","%s","%s","%s","%s","%s","%s","%s"]]}\n' \
  "$ROW_TIPO" "$TEMPLATE_ID" "$NOME_SAFE" "$ROW_DOCX" "$ROW_DATA" "$ROW_HORARIO" \
  "$DE_ENVIO" "$DE_EXCL" \
  "$SFMC_ASSET_ID" "$SFMC_SEND_ID" "$OBS_SAFE" "$CAMPAIGN_CODE" "$ROW_PREVIEW_URL" "$SEND_CLASS" \
  "${ROW_VALUES[15]}" "${ROW_VALUES[16]}" \
  > /tmp/fila_put.json

curl -s -X PUT "$SHEETS_API/values/Fila%21A${ROW_NUM}%3AQ${ROW_NUM}?valueInputOption=RAW" \
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
FEEDBACK="${ROW_VALUES[11]}"  # col L, index 11
```

O agente deve incorporar o `FEEDBACK` como instruções adicionais ao gerar o HTML:
- Se o feedback mencionar cores, alterar no CSS inline
- Se mencionar tamanho de fonte, ajustar nos elementos relevantes
- Se mencionar estrutura (ex: "remover coluna lateral"), adaptar o layout
- Se mencionar CTA, ajustar texto/cor/tamanho do botão

### 7-C: Regenerar HTML com feedback aplicado

Mesmo fluxo do Passo 5-C, mas incluindo as instruções do `FEEDBACK` como modificações sobre o HTML gerado.

Após gerar, refazer o upload (novo POST ao Content Builder → novo `SFMC_ASSET_ID`).

### 7-D: Atualizar preview_url com novo link CB

```bash
NEW_PREVIEW_URL="https://mc.s7.exacttarget.com/cloud/#app/email/C12/${NEW_SFMC_ASSET_ID}"
```

### 7-E: Atualizar linha → aguardando_aprovacao + limpar obs

```bash
ROW_CAMPANHA="${ROW_VALUES[12]}"  # col M, index 12
TEMPLATE_ID="${ROW_VALUES[2]}"    # col C, index 2
DE_ENVIO="${ROW_VALUES[7]}"       # col H, index 7
DE_EXCL="${ROW_VALUES[8]}"        # col I, index 8
NOME_SAFE=$(jsafe "$ROW_NOME")

# 17 colunas: obs (L, index 11) zerado intencionalmente
printf '{"values": [["aguardando_aprovacao","%s","%s","%s","%s","%s","%s","%s","%s","%s","","","%s","%s","%s","%s","%s"]]}\n' \
  "$ROW_TIPO" "$TEMPLATE_ID" "$NOME_SAFE" "$ROW_DOCX" "$ROW_DATA" "$ROW_HORARIO" \
  "$DE_ENVIO" "$DE_EXCL" \
  "$NEW_SFMC_ASSET_ID" "$ROW_CAMPANHA" "$NEW_PREVIEW_URL" \
  "${ROW_VALUES[14]}" "${ROW_VALUES[15]}" "${ROW_VALUES[16]}" \
  > /tmp/fila_put.json

curl -s -X PUT "$SHEETS_API/values/Fila%21A${ROW_NUM}%3AQ${ROW_NUM}?valueInputOption=RAW" \
  -H "$GAUTH" -H "Content-Type: application/json" \
  --data-binary @/tmp/fila_put.json
# obs zerado → stakeholder pode escrever novo feedback se precisar
```

```
✅ [1/K] Regenerado: "<nome>" → aguardando_aprovacao (obs limpo)
         Preview atualizado: <NEW_PREVIEW_URL>
```

---

## Preview URL — geração via link CB

O `preview_url` é sempre um link direto para o asset no Content Builder. Não há screenshot, não há upload de PNG.

```
PREVIEW_URL = https://mc.s7.exacttarget.com/cloud/#app/email/C12/{CB_ASSET_ID}
```

Abrir esse link no navegador abre o HTML no Content Builder diretamente. Requer login ativo no SFMC.

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
curl -s -X POST "$SHEETS_API/values/Historico%21A%3AQ:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS" \
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

## SUB: Escaping seguro de campos de texto para JSON

Campos de texto livres (`ROW_NOME`, `ROW_OBS`, mensagens de erro) podem conter aspas, barras invertidas ou outros caracteres que quebram o JSON do Sheets PUT silenciosamente.

**Função obrigatória — declarar uma vez no início da execução:**

```bash
# jsafe: escapa string para uso seguro dentro de aspas duplas JSON
# Uso: VAR=$(jsafe "$TEXTO_LIVRE")
jsafe() {
  printf '%s' "$1" \
    | sed 's/\\/\\\\/g' \
    | sed 's/"/\\"/g' \
    | sed 's/\t/\\t/g' \
    | tr -d '\r' \
    | sed ':a;N;$!ba;s/\n/\\n/g'
}
```

**Aplicar em TODOS os campos de texto livre antes de interpolar em JSON:**

```bash
# Antes de qualquer PUT/POST para Sheets que inclua texto livre:
NOME_SAFE=$(jsafe "$ROW_NOME")
OBS_SAFE=$(jsafe "$OBS_UPDATED")
ERR_SAFE=$(jsafe "$ERR_MSG")

# Exemplo de uso no PUT de erro:
-d "{\"values\": [[\"erro_docx\",\"${NOME_SAFE}\",\"${ERR_SAFE}\"]]}"
```

> **Campos que SEMPRE precisam de `jsafe`:** `ROW_NOME`, `ROW_OBS`, `OBS_UPDATED`, `ERR_MSG`, `PERSO_WARNING`, qualquer mensagem de erro interpolada em JSON.
> **Campos que NÃO precisam:** IDs numéricos, datas, status (valores controlados).

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
| HTML contém `TODO_EMAILID` | — | Após POST REST: GET CB asset → `legacyData.legacyId` = ES_ID → sed substitui → PUT atualiza. Nunca usar Asset ID no lugar do ES_ID |
| data_envio+horario no passado | `horario_expirado` | Bloquear: não criar ES nem ESD. Reportar no resumo. Stakeholder ajusta data/horario e volta status para `aprovado` |
| Recorrente sem arquivo no Drive | — | Silencioso — não cria entrada na Fila |
| BU não encontrada em `brands/` | `erro_html` | Marcar e pular |

---

## Regras de Ouro

1. **Nunca regredir status** — uma linha só avança; nunca volta de `agendado` para `pendente`
2. **Exceto `revisar`** — é o único estado que retrocede intencionalmente; stakeholder escreve o feedback no obs e muda para `revisar`; agente regenera e volta a `aguardando_aprovacao`
3. **Guardar IDs imediatamente** após cada upload — não esperar o loop terminar
4. **Processar em ordem de data_envio** — envios mais urgentes primeiro
5. **Obs zerado no revisar** — limpar o campo obs ao retornar a `aguardando_aprovacao` para não acumular feedbacks antigos
6. **Preview URL via CB** — `preview_url` é sempre o link direto do Content Builder (`https://mc.s7.exacttarget.com/cloud/#app/email/C12/{assetId}`); não gerar screenshots
7. **Reautenticar antes de operações longas** — tokens Google expiram em 1h; SFMC em ~20min
8. **A BU é sempre implícita** — cada planilha pertence a uma única BU; não há coluna "bu"
9. **Ranges URL-encoded** — usar `%21` para `!` e `%3A` para `:` em todos os endpoints da Sheets API
10. **Slot-filling, nunca reescrita** — carregar o template fixo do `template_id`, preencher os `{{slots}}`, nunca reescrever a estrutura HTML
11. **Auto-config obrigatório** — sender profile, tracking category e CB category são determinados pelo `template` da col C (index 2); nunca perguntar ao usuário esses valores
12. **ES_ID ≠ Asset ID** — após POST REST, sempre fazer SOAP Retrieve para obter o Email Studio ID real antes de substituir `TODO_EMAILID`; usar Asset ID no AMPscript quebra o rastreio PMP
13. **N DEs + PMP = N emails** — quando `tipo=campanha` com PMP e múltiplas DEs, criar uma cópia do email por DE, cada uma com seu próprio ES_ID no AMPscript e no nome
