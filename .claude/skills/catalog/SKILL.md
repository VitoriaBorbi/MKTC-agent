---
name: catalog
version: "1.0"
language: "pt-BR"
description: >
  Agente de catálogo de templates de email marketing. Gera previews visuais
  de cada layout (template × BU), tira screenshots via Edge headless, faz
  faz upload no SFMC e publica cards no Notion para seleção pelos stakeholders.
tags:
  - email-marketing
  - templates
  - catalog
  - notion
  - drive
inputs:
  - comando: list | generate | preview | add
  - bu (opcional): finclass | bruno-perini | faculdade-hub | thiago-nigro | all
  - template_id (opcional): full-hero | text-first | side-image | multi-block | minimal | announcement
  - campaign_id (opcional): ID de campanha para preview com identidade de campanha
outputs:
  - preview HTMLs em email-agent/templates/<id>/preview/<bu>.html
  - screenshots PNG em email-agent/templates/<id>/preview/<bu>.png
  - upload no SFMC Content Builder (CDN público image.m.grupo-primo.com)
  - cards publicados no Notion Database do catálogo com cover image
---

# Catalog Agent — Catálogo de Templates de Email

Você é o agente de catálogo. Sua missão é gerar e publicar previews visuais dos templates de email para que stakeholders possam escolher layouts antes de montar suas comunicações.

**Arquivos de configuração:**
```
email-agent/credentials/google-service-account.json  ← auth Google
email-agent/credentials/notion-config.json           ← token Notion + database_id
email-agent/credentials/sheets-config.json           ← IDs Drive (root, brands)
email-agent/.env                                     ← credenciais SFMC (para upload de img)
email-agent/templates/                               ← biblioteca de templates
email-agent/brands/                                  ← identidade por BU
```

---

## Comandos disponíveis

| Comando | O que faz |
|---|---|
| `/catalog list` | Lista todos os templates disponíveis com metadados |
| `/catalog generate` | Gera previews de todas as combinações template × BU |
| `/catalog generate <bu>` | Gera previews de todas as combinações para uma BU específica |
| `/catalog generate <bu> <template_id>` | Gera preview de uma combinação específica |
| `/catalog preview <template_id> <bu> [campaign_id]` | Idem generate, mas abre HTML no browser |
| `/catalog add <template_id>` | Cria scaffold de novo template |

Identifique o comando pelo input do usuário e execute o fluxo correspondente.

---

## COMANDO: list

### Passo L-1: Listar templates

```bash
ls email-agent/templates/
```

Para cada template encontrado, ler `meta.json` e exibir uma tabela:

| ID | Nome | Tags | Zonas de conteúdo |
|---|---|---|---|
| full-hero | Hero Completo | hero, imagem, cta-unico | hero_image, headline, body_copy, cta |
| ... | ... | ... | ... |

Exibir também os status de preview gerados:
```bash
ls email-agent/templates/*/preview/*.png 2>/dev/null
```

---

## COMANDO: generate (principal)

### Passo G-1: Determinar escopo

- Se `generate` (sem args) → processar todas as BUs × todos os templates
- Se `generate <bu>` → só aquela BU, todos os templates
- Se `generate <bu> <template_id>` → combinação específica

BUs disponíveis: `finclass`, `bruno-perini`, `faculdade-hub`, `thiago-nigro`
Templates disponíveis: ler subpastas de `email-agent/templates/`

Criar tabela de progresso interna (atualizar ao longo do processamento):
```
[ ] finclass × full-hero
[ ] finclass × text-first
...
```

### Passo G-2: Auth Google (Drive com escopo de escrita)

```bash
CREDS="email-agent/credentials/google-service-account.json"
CLIENT_EMAIL=$(grep -o '"client_email": *"[^"]*"' "$CREDS" | grep -o '"[^"]*@[^"]*"' | tr -d '"')
printf '%b' "$(grep -o '"private_key": *"[^"]*"' "$CREDS" | sed 's/.*"private_key": *"//;s/"$//')" > /tmp/mktc_key.pem

b64url() { openssl base64 -e -A | tr '+/' '-_' | tr -d '='; }
NOW=$(date +%s); EXP=$((NOW+3600))
H=$(echo -n '{"alg":"RS256","typ":"JWT"}' | b64url)
P=$(printf '{"iss":"%s","scope":"https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets","aud":"https://oauth2.googleapis.com/token","exp":%d,"iat":%d}' \
    "$CLIENT_EMAIL" "$EXP" "$NOW" | b64url)
SIG=$(printf '%s.%s' "$H" "$P" | openssl dgst -sha256 -sign /tmp/mktc_key.pem | openssl base64 -e -A | tr '+/' '-_' | tr -d '=')
JWT="$H.$P.$SIG"

DRIVE_TOKEN=$(curl -s -X POST https://oauth2.googleapis.com/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=$JWT" \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
SHEETS_TOKEN=$DRIVE_TOKEN  # mesmo token — escopo inclui drive + spreadsheets
```

### Passo G-3: Garantir pasta do catálogo no Drive

Verificar se existe a pasta `Catálogo` dentro da raiz `Email Agent`:

```bash
ROOT_ID="1XtmxTHlSfH9mqLjlr9Kj7DllPsfFOeF4"

# Buscar pasta "Catálogo"
CATALOG_RESP=$(curl -s "https://www.googleapis.com/drive/v3/files?q=name='Cat%C3%A1logo'+and+'${ROOT_ID}'+in+parents+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name)" \
  -H "Authorization: Bearer $DRIVE_TOKEN")
CATALOG_ID=$(echo "$CATALOG_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
```

Se `CATALOG_ID` vazio, criar a pasta:

```bash
CATALOG_ID=$(curl -s -X POST "https://www.googleapis.com/drive/v3/files" \
  -H "Authorization: Bearer $DRIVE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Catálogo\",\"mimeType\":\"application/vnd.google-apps.folder\",\"parents\":[\"${ROOT_ID}\"]}" \
  | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
```

Repetir para subpasta `previews` dentro de `Catálogo`. Salvar ambos os IDs em `email-agent/credentials/notion-config.json` (adicionar campos `drive_catalog_id` e `drive_previews_id`).

### Passo G-4: Para cada combinação template × BU

Iterar sobre o escopo definido no G-1. Para cada par:

#### G-4-A: Ler arquivos base

```bash
TEMPLATE_ID="full-hero"   # exemplo
BU="finclass"             # exemplo

BASE_HTML="email-agent/templates/${TEMPLATE_ID}/base.html"
BRAND_JSON="email-agent/brands/${BU}/brand.json"
SAMPLE_JSON="email-agent/templates/${TEMPLATE_ID}/sample-content.json"
META_JSON="email-agent/templates/${TEMPLATE_ID}/meta.json"

mkdir -p "email-agent/templates/${TEMPLATE_ID}/preview"
```

#### G-4-B: Construir mapa de identidade (brand.json → placeholders)

Ler o `brand.json` da BU e extrair os valores para cada placeholder. Usar a ferramenta Read para ler o JSON e montar o mapa internamente.

**Mapeamento brand.json → placeholder:**

| Placeholder | Campo brand.json | Fallback |
|---|---|---|
| `{{COLOR_BG}}` | `colors.background` | `#FFFFFF` |
| `{{COLOR_TEXT}}` | `colors.text` | `#000000` |
| `{{COLOR_TEXT_LIGHT}}` | `colors.text_light` | valor de `colors.text` |
| `{{COLOR_PRIMARY}}` | `colors.primary` | — |
| `{{COLOR_SECONDARY}}` | `colors.secondary` | `#000000` |
| `{{COLOR_HR}}` | `colors.hr_header` | valor de `colors.primary` |
| `{{COLOR_CTA_BG}}` | `colors.cta_bg` | valor de `colors.primary` |
| `{{COLOR_CTA_TEXT}}` | `colors.cta_text` | `#000000` |
| `{{FONT_HEADING}}` | `fonts.heading` | `Arial, Helvetica, sans-serif` |
| `{{FONT_BODY}}` | `fonts.body` | `Arial, Helvetica, sans-serif` |
| `{{LOGO_URL}}` | `logo.url` | — |
| `{{LOGO_ALT}}` | `logo.alt` | nome da BU |
| `{{LOGO_WIDTH}}` | `logo.width` | `150` |

#### G-4-C: Gerar bloco de footer HTML

Montar o `{{FOOTER_BLOCK}}` dinamicamente a partir do `footer` e `colors` do brand.json.

**Estrutura obrigatória do footer (adaptar valores por BU):**

```html
<!-- FOOTER: Redes sociais -->
<table cellspacing="0" cellpadding="0" border="0" width="600" align="center"
       style="background-color:FOOTER_BG;" bgcolor="FOOTER_BG">
  <tr>
    <td align="center" style="padding:20px 30px 10px 30px;">
      <table cellspacing="0" cellpadding="0" border="0" align="center">
        <tr>
          <!-- Para cada rede social em footer.social: -->
          <td style="padding:0 8px;">
            <a href="URL_SOCIAL" style="text-decoration:none;">
              <img src="ICON_URL" alt="NOME_REDE" width="25" height="25"
                   style="display:block; border:0;" border="0" />
            </a>
          </td>
          <!-- repetir para cada rede -->
        </tr>
      </table>
      <!-- Divider -->
      <table cellpadding="0" cellspacing="0" border="0" width="200" align="center" style="margin-top:12px;">
        <tr>
          <td style="border-bottom:1px solid FOOTER_BORDER_COLOR; font-size:1px; line-height:1px;">&nbsp;</td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- FOOTER: Links -->
<table cellspacing="0" cellpadding="0" border="0" width="600" align="center"
       style="background-color:FOOTER_BG;" bgcolor="FOOTER_BG">
  <tr>
    <td align="center" style="padding:8px 30px;">
      <span style="font-family:Arial,Helvetica,sans-serif; font-size:12px; color:FOOTER_LINKS_COLOR;">
        <!-- Se terms_url existir: -->
        <a href="TERMS_URL" style="color:FOOTER_LINKS_COLOR; text-decoration:none;">Termos de uso</a>
        &nbsp;&bull;&nbsp;
        <a href="PRIVACY_URL" style="color:FOOTER_LINKS_COLOR; text-decoration:none;">Política de privacidade</a>
        &nbsp;&bull;&nbsp;
        <a href="UNSUBSCRIBE_URL" style="color:FOOTER_LINKS_COLOR; text-decoration:none;">Cancelar e-mails</a>
      </span>
    </td>
  </tr>
</table>

<!-- FOOTER: Endereço -->
<table cellspacing="0" cellpadding="0" border="0" width="600" align="center"
       style="background-color:FOOTER_BG;" bgcolor="FOOTER_BG">
  <tr>
    <td align="center" style="padding:8px 30px 20px 30px;">
      <span style="font-family:Arial,Helvetica,sans-serif; font-size:11px;
                   color:FOOTER_TEXT_COLOR; line-height:1.5;">
        <strong>%%Member_Busname%%</strong><br/>
        %%Member_Addr%% %%Member_City%%, %%Member_State%%, %%Member_PostalCode%%, %%Member_Country%%
      </span>
    </td>
  </tr>
</table>
<a href="%%profile_center_url%%" alias="Update Profile" style="display:none;">Update Profile</a>
```

**Valores de cor do footer (do brand.json):**
- `FOOTER_BG` → `colors.footer_bg`
- `FOOTER_TEXT_COLOR` → `colors.footer_text`
- `FOOTER_LINKS_COLOR` → `colors.footer_links`
- `FOOTER_BORDER_COLOR` → `colors.footer_border` ou `colors.divider`

Para BUs onde `footer_bg` é escuro (ex: Bruno Perini `#0f1014`), o texto e ícones devem ser claros — os valores já estão corretos no `brand.json`.

#### G-4-D: Substituir placeholders e gerar preview HTML

Com o mapa de identidade e o footer HTML prontos, usar a ferramenta **Edit** (ou Write) para gerar o arquivo de preview:

1. Ler `base.html` com a ferramenta Read
2. Substituir cada `{{PLACEHOLDER}}` pelo valor correspondente:
   - Identidade: valores do brand.json (G-4-B)
   - Conteúdo: valores do sample-content.json
   - Footer: HTML gerado em G-4-C
3. Escrever o resultado em `email-agent/templates/${TEMPLATE_ID}/preview/${BU}.html` com a ferramenta Write

**Atenção:** O `sample-content.json` tem strings JSON com HTML dentro (ex: `<p style="...">...</p>`). Ao extrair esses valores, usar como HTML literal — não escapar as tags.

#### G-4-E: Screenshot com Edge headless

```bash
PREVIEW_HTML="email-agent/templates/${TEMPLATE_ID}/preview/${BU}.html"
OUTPUT_PNG="email-agent/templates/${TEMPLATE_ID}/preview/${BU}.png"

# Localizar msedge.exe (tentar os dois caminhos comuns)
MSEDGE=""
for P in "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
          "/c/Program Files/Microsoft/Edge/Application/msedge.exe"; do
  [ -f "$P" ] && MSEDGE="$P" && break
done

if [ -z "$MSEDGE" ]; then
  echo "⚠ Edge não encontrado — pulando screenshot de ${BU} × ${TEMPLATE_ID}"
  # Continuar para próxima combinação (não falhar o loop inteiro)
else
  # Converter paths para Windows-style (necessário para processo nativo do Windows)
  WIN_HTML="C:${PREVIEW_HTML#/c}"
  WIN_HTML="${WIN_HTML//\//\\}"
  WIN_PNG="C:${OUTPUT_PNG#/c}"
  WIN_PNG="${WIN_PNG//\//\\}"

  "$MSEDGE" \
    --headless \
    --disable-gpu \
    --no-sandbox \
    --window-size=640,1200 \
    --screenshot="$WIN_PNG" \
    "file:///$WIN_HTML" 2>/dev/null

  if [ -f "$OUTPUT_PNG" ]; then
    echo "✓ Screenshot: $OUTPUT_PNG"
  else
    echo "⚠ Screenshot falhou para ${BU} × ${TEMPLATE_ID}"
  fi
fi
```

**Nota importante sobre `--window-size`:** O argumento define a viewport. A altura 1200px deve cobrir a maioria dos templates. O PNG gerado é recortado ao viewport — não é full-page. Para templates muito longos (multi-block), pode ser necessário usar altura maior (ex: `--window-size=640,1800`).

#### G-4-F: Upload do PNG no SFMC Content Builder

Service Accounts Google não têm quota de storage — usar SFMC para hospedar os PNGs de preview.
O SFMC retorna uma `publishedURL` pública (CDN), que é usada como cover do card no Notion.

**IMPORTANTE:** usar token ENTERPRISE (sem `account_id`) — a categoria 273324 só existe no contexto
do enterprise. Tokens com `account_id: MID_FINCLASS` (ou outro MID filho) retornam erro 118081.
O `publishedURL` ficará em `image.m.grupo-primo.com` — CDN público, funciona como cover no Notion.

```bash
source email-agent/.env

# Token enterprise (SEM account_id)
SFMC_TOKEN=$(curl -s -X POST \
  "https://${SFMC_SUBDOMAIN}.auth.marketingcloudapis.com/v2/token" \
  -H "Content-Type: application/json" \
  -d "{\"grant_type\":\"client_credentials\",\"client_id\":\"${SFMC_CLIENT_ID}\",\"client_secret\":\"${SFMC_CLIENT_SECRET}\"}" \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

IMG_CAT=273324   # Content Builder root da conta enterprise — funciona com token enterprise
B64=$(base64 -w 0 "$OUTPUT_PNG")
ASSET_NAME="catalog-preview-${BU}-${TEMPLATE_ID}"

printf '{"name":"%s","assetType":{"name":"png","id":28},"file":"%s","category":{"id":%d}}' \
  "$ASSET_NAME" "$B64" "$IMG_CAT" > /tmp/sfmc_upload.json

UPLOAD_RESP=$(curl -s -X POST \
  "https://${SFMC_SUBDOMAIN}.rest.marketingcloudapis.com/asset/v1/content/assets" \
  -H "Authorization: Bearer $SFMC_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/sfmc_upload.json)
rm -f /tmp/sfmc_upload.json

PREVIEW_URL=$(echo "$UPLOAD_RESP" | grep -o '"publishedURL":"[^"]*"' | cut -d'"' -f4)
if [ -n "$PREVIEW_URL" ]; then
  echo "✓ SFMC: $PREVIEW_URL"
else
  echo "⚠ Upload SFMC falhou para ${BU} × ${TEMPLATE_ID}"
  PREVIEW_URL=""
fi
```

Salvar `PREVIEW_URL` para uso no Passo G-5 (Notion).

**Nota:** Para faculdade-hub e thiago-nigro, verificar no brand.json de cada BU se existe `img_category_id` próprio e usá-lo.

#### G-4-G: Registrar na aba "Catálogo" do Google Sheets

Verificar se a BU tem planilha configurada em `sheets-config.json`:

```bash
SPREADSHEET_ID=$(grep -A3 "\"${BU}\":" email-agent/credentials/sheets-config.json \
  | grep '"spreadsheet_id"' \
  | grep -o '"[^"]*"$' | tr -d '"')
```

Se `SPREADSHEET_ID` vazio, informar `"⚠ ${BU} sem planilha configurada — Sheets não atualizado"` e pular este passo para esta BU.

**Criar aba "Catálogo" (ignorar erro se já existir):**

```bash
curl -s -X POST \
  "https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate" \
  -H "Authorization: Bearer $SHEETS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"requests":[{"addSheet":{"properties":{"title":"Catálogo","gridProperties":{"rowCount":1000,"columnCount":9}}}}]}' > /dev/null 2>&1
```

**Escrever cabeçalho se a aba estiver vazia:**

```bash
HEADER_CHECK=$(curl -s \
  "https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Cat%C3%A1logo!A1" \
  -H "Authorization: Bearer $SHEETS_TOKEN")

if ! echo "$HEADER_CHECK" | grep -q '"values"'; then
  curl -s -X PUT \
    "https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Cat%C3%A1logo!A1?valueInputOption=RAW" \
    -H "Authorization: Bearer $SHEETS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"range":"Cat\u00e1logo!A1","majorDimension":"ROWS","values":[["id","bu","nome","arquetipo","refs","prompt","preview","url","atualizado_em"]]}' > /dev/null 2>&1
fi
```

**Estrutura das colunas (9 cols A–I):**
```
A: id           → template_id (ex: full-hero)
B: bu           → nome da BU (ex: finclass)
C: nome         → nome legível do template (de meta.json)
D: arquetipo    → categoria/tipo do template (de meta.json tags[0])
E: refs         → EDITÁVEL pelo stakeholder — links de referência visual
F: prompt       → texto de briefing pronto para copiar (Ctrl+C)
G: preview      → fórmula =IMAGE(url)
H: url          → URL pública SFMC
I: atualizado_em
```

**Ler nome e gerar prompt do template:**

```bash
TEMPLATE_NAME=$(grep -o '"name":"[^"]*"' "email-agent/templates/${TEMPLATE_ID}/meta.json" | head -1 | cut -d'"' -f4)
TEMPLATE_DESC=$(grep -o '"description":"[^"]*"' "email-agent/templates/${TEMPLATE_ID}/meta.json" | head -1 | cut -d'"' -f4)
TEMPLATE_TAGS=$(grep -o '"tags":\[[^]]*\]' "email-agent/templates/${TEMPLATE_ID}/meta.json" | head -1 | grep -o '"[^"]*"' | tr -d '"' | tr '\n' ', ' | sed 's/,$//')
TEMPLATE_CATEGORY="${TEMPLATE_TAGS%%,*}"

# Prompt de briefing para este template
TEMPLATE_PROMPT="${TEMPLATE_NAME}: ${TEMPLATE_DESC:-use para emails com layout ${TEMPLATE_ID}}. Tags: ${TEMPLATE_TAGS:-${TEMPLATE_ID}}."

TODAY_SHEETS=$(date +%Y-%m-%d)

PREVIEW_FORMULA=""
[ -n "$PREVIEW_URL" ] && PREVIEW_FORMULA="=IMAGE(\"${PREVIEW_URL}\")"

cat > /tmp/sheets_catalog_row.json << ENDJSON
{
  "range": "Cat\u00e1logo!A:I",
  "majorDimension": "ROWS",
  "values": [["${TEMPLATE_ID}", "${BU}", "${TEMPLATE_NAME}", "${TEMPLATE_CATEGORY}", "", "${TEMPLATE_PROMPT}", "${PREVIEW_FORMULA}", "${PREVIEW_URL:-}", "${TODAY_SHEETS}"]]
}
ENDJSON

SHEETS_RESP=$(curl -s -X POST \
  "https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Cat%C3%A1logo!A%3AI:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS" \
  -H "Authorization: Bearer $SHEETS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/sheets_catalog_row.json)
rm -f /tmp/sheets_catalog_row.json

SHEETS_ERR=$(echo "$SHEETS_RESP" | grep -o '"message":"[^"]*"' | head -1)
[ -n "$SHEETS_ERR" ] && echo "⚠ Sheets: $SHEETS_ERR" || echo "✓ Sheets: ${BU} × ${TEMPLATE_ID}"
```

### Passo G-5: Publicar no Notion (Fase 3 — executar se token Notion disponível)

Verificar se `notion-config.json` tem um token configurado:

```bash
NOTION_TOKEN=$(grep -o '"token":"[^"]*"' email-agent/credentials/notion-config.json | cut -d'"' -f4)
DB_ID=$(grep -o '"catalog_database_id":"[^"]*"' email-agent/credentials/notion-config.json | cut -d'"' -f4)
```

Se ambos presentes, para cada combinação processada (usar `PREVIEW_URL` do Passo G-4-F):

#### G-5-A: Verificar se página já existe na database

```bash
SEARCH_RESP=$(curl -s -X POST "https://api.notion.com/v1/databases/${DB_ID}/query" \
  -H "Authorization: Bearer $NOTION_TOKEN" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d "{\"filter\":{\"and\":[{\"property\":\"template_id\",\"rich_text\":{\"equals\":\"${TEMPLATE_ID}\"}},{\"property\":\"bu\",\"select\":{\"equals\":\"${BU}\"}}]}}")

PAGE_ID=$(echo "$SEARCH_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
```

#### G-5-B: Criar ou atualizar página na database

Ler `meta.json` para obter nome e tags. Montar payload:

```bash
TEMPLATE_NAME=$(grep -o '"name":"[^"]*"' "email-agent/templates/${TEMPLATE_ID}/meta.json" | head -1 | cut -d'"' -f4)
PAGE_NAME="${TEMPLATE_NAME} — ${BU}"
TODAY=$(date +%Y-%m-%d)
```

Construir payload em arquivo temporário. Se `DRIVE_URL` disponível, usar como cover da página:

```bash
cat > /tmp/notion_page.json << PAYLOAD
{
  "parent": { "database_id": "${DB_ID}" },
  "cover": { "type": "external", "external": { "url": "${DRIVE_URL}" } },
  "properties": {
    "Nome": { "title": [{ "text": { "content": "${PAGE_NAME}" } }] },
    "template_id": { "rich_text": [{ "text": { "content": "${TEMPLATE_ID}" } }] },
    "bu": { "select": { "name": "${BU}" } },
    "tags": { "multi_select": TAGS_ARRAY },
    "drive_link": { "url": "${DRIVE_URL}" },
    "atualizado_em": { "date": { "start": "${TODAY}" } }
  }
}
PAYLOAD
```

Para o `TAGS_ARRAY`, ler as tags do `meta.json` e montar array JSON: `[{"name":"hero"},{"name":"imagem"},...]`

Se `PAGE_ID` existe (atualizar):
```bash
curl -s -X PATCH "https://api.notion.com/v1/pages/${PAGE_ID}" \
  -H "Authorization: Bearer $NOTION_TOKEN" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/notion_page.json | grep -o '"object":"[^"]*"' | head -1
```

Se não existe (criar):
```bash
curl -s -X POST "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_TOKEN" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/notion_page.json | grep -o '"url":"[^"]*"' | head -1
```

### Passo G-6: Exibir tabela de resultados

Ao finalizar todas as combinações, exibir tabela resumo:

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                    CATÁLOGO — RESULTADO DA GERAÇÃO                              ║
╠══════════════════════╦══════════════╦══════════╦════════════════╦═══════════════╣
║ Template             ║ BU           ║ Preview  ║ Notion         ║ Sheets        ║
╠══════════════════════╬══════════════╬══════════╬════════════════╬═══════════════╣
║ full-hero            ║ finclass     ║ ✓ PNG    ║ ✓ publicado    ║ ✓ registrado  ║
║ full-hero            ║ bruno-perini ║ ✓ PNG    ║ ✓ publicado    ║ — (sem sheet) ║
║ text-first           ║ finclass     ║ ✓ PNG    ║ ✓ publicado    ║ ✓ registrado  ║
║ minimal              ║ finclass     ║ ⚠ falhou ║ — (sem PNG)    ║ ⚠ sem URL     ║
╚══════════════════════╩══════════════╩══════════╩════════════════╩═══════════════╝
Total: 24 combinações | ✓ XX ok | ⚠ XX com erro
```

---

## COMANDO: preview <template_id> <bu> [campaign_id]

Mesmo fluxo do G-4 para uma única combinação, mas:
1. Após gerar `preview.html`, abrir no browser:
   ```bash
   start "email-agent/templates/${TEMPLATE_ID}/preview/${BU}.html"
   ```
   (No Git Bash no Windows, usar `start` para abrir com o browser padrão)
2. Se `campaign_id` informado: antes de G-4-B, verificar se existe `campaign.json` no Drive
   - Pasta Drive: `<BU>/Campanhas/<campaign_id>/identity/campaign.json`
   - Baixar e aplicar os campos `overrides` por cima da identidade da BU
   - O template preview gerado reflete a identidade de campanha

**Aplicar campaign overrides:**

Se `campaign.json` disponível, sobrescrever os placeholders correspondentes:
```json
{
  "overrides": {
    "color_primary": "#F5A623"   → {{COLOR_PRIMARY}}
    "color_cta_bg": "#F5A623"   → {{COLOR_CTA_BG}}
    "color_cta_text": "#000000" → {{COLOR_CTA_TEXT}}
    "color_secondary": "#1A1A2E" → {{COLOR_SECONDARY}}
  },
  "assets": {
    "hero_image": "URL"  → {{HERO_IMAGE_URL}} no sample-content
    "logo_variant": "URL" → {{LOGO_URL}} se preenchido
  }
}
```

Nomear o preview como `${BU}-${CAMPAIGN_ID}.html` / `.png`.

---

## COMANDO: add <template_id>

Criar estrutura de novo template com arquivos placeholder:

```bash
NEW_ID="<template_id>"
mkdir -p "email-agent/templates/${NEW_ID}/preview"
```

Criar `base.html` com estrutura mínima (colar template de `full-hero/base.html` como ponto de partida), `meta.json` com campos em branco e `sample-content.json` com conteúdo genérico.

Avisar o usuário para editar os três arquivos e depois rodar `/catalog generate all <new_id>`.

---

## Notas técnicas

### Edge headless — troubleshooting
- Se `--screenshot` não criar arquivo, tentar adicionar `--run-all-compositor-stages-before-draw`
- Se a página ficar em branco, adicionar `--disable-web-security` e `--allow-file-access-from-files`
- Em caso de erro de permissão, verificar se o path do PNG já existe (criar pasta com `mkdir -p`)

### Drive upload — troubleshooting
- Erro 403: verificar se o token tem escopo `drive` (não `drive.readonly`)
- Erro de arquivo corrompido: verificar se `/tmp/catalog_upload.bin` foi gerado corretamente antes do curl
- URL pública: `https://lh3.googleusercontent.com/d/<FILE_ID>` funciona como URL direta de imagem quando o arquivo é público

### Notion — troubleshooting
- Se `cover` retornar erro, omitir o campo e adicionar a imagem como bloco de imagem dentro da página
- Tags: para cada tag do meta.json, criar objeto `{"name":"TAG_VALUE"}` no array multi_select
- Filtro de query: usar `rich_text.equals` para template_id (campo texto) e `select.equals` para bu (campo select)

### Preview folders — .gitignore
As pastas `preview/` dentro de cada template são geradas e não devem ser commitadas.
Adicionar ao `.gitignore` do projeto:
```
email-agent/templates/*/preview/
```
