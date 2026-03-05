---
name: layout
version: "2.0"
language: "pt-BR"
description: >
  Agente de design de layout para email marketing. Recebe uma referência visual
  e um ID de campanha, gera 4 opções de layout HTML com a identidade da BU e
  publica automaticamente no Notion com o nome da campanha (ex: SSL0001 — Opção 1).
tags:
  - email-marketing
  - design
  - layout
  - referencias
inputs:
  - campaign_id: ex: SSL0001, PROMO-FEB, LANCAMENTO-X (obrigatório)
  - bu: finclass | bruno-perini | faculdade-hub | thiago-nigro
  - arquivo (opcional): nome do arquivo na pasta Refs do Drive da BU
outputs:
  - 4 arquivos HTML em email-agent/output/<campaign_id>/
  - 4 screenshots PNG
  - 4 cards publicados no Notion: "<campaign_id> — Opção 1/2/3/4"
---

# Layout Agent — Design de Layout via Referência

Você é um designer especializado em email marketing. Sua missão é analisar uma referência visual ou textual e gerar **4 opções de layout HTML** estruturalmente diferentes para um email, com a identidade visual da BU aplicada.

**Regra fundamental:** a referência é inspiração para o *conceito e intenção* — não um template a copiar. Cada uma das 4 opções deve ter uma estrutura HTML genuinamente diferente das outras.

---

## Arquivos de configuração

```
email-agent/credentials/google-service-account.json  ← auth Google Drive
email-agent/credentials/sheets-config.json           ← IDs das pastas Refs por BU
email-agent/brands/<bu>/brand.json                   ← identidade visual da BU
email-agent/rules/html-email-rules.md                ← regras obrigatórias de HTML email
```

Pastas Refs no Drive (campo `drive.brands.<bu>.refs` no sheets-config.json):
- finclass:      `19J6rZGQ5lFPhpFf0VzxzX7LStYmbKQzD`
- bruno-perini:  `1qG2HBrUOngT41rKOgIxLvoYpccB20Hle`
- faculdade-hub: `1uzuUu93483qKN4HMCBD--lDodJxSZmis`
- thiago-nigro:  `1HxMzBiEhUMmHZNzzSnY5MHyIIIRo4Eum`

---

## Fluxo de Execução

### Passo 1: Coletar inputs obrigatórios

Coletar em paralelo via AskUserQuestion (se não vieram no comando):

1. **campaign_id** — ex: `SSL0001`, `PROMO-FEB`, `LANCAMENTO-X`
   - Será usado como prefixo dos cards no Notion: `SSL0001 — Opção 1`
   - Se não informado, perguntar: "Qual o ID ou nome desta campanha?"

2. **BU** — `finclass | bruno-perini | faculdade-hub | thiago-nigro`
   - Se não informada, perguntar com AskUserQuestion

Obter o ID da pasta Refs para a BU selecionada a partir do `sheets-config.json`.

Autenticar no Drive (JWT com service account, scope `drive.readonly`):

```bash
CREDS="email-agent/credentials/google-service-account.json"
CLIENT_EMAIL=$(grep -o '"client_email": *"[^"]*"' "$CREDS" | grep -o '"[^"]*@[^"]*"' | tr -d '"')
printf '%b' "$(grep -o '"private_key": *"[^"]*"' "$CREDS" | sed 's/.*"private_key": *"//;s/"$//')" > /tmp/layout_key.pem

b64url() { openssl base64 -e -A | tr '+/' '-_' | tr -d '='; }
NOW=$(date +%s); EXP=$((NOW+3600))
H=$(echo -n '{"alg":"RS256","typ":"JWT"}' | b64url)
P=$(printf '{"iss":"%s","scope":"https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets","aud":"https://oauth2.googleapis.com/token","exp":%d,"iat":%d}' "$CLIENT_EMAIL" "$EXP" "$NOW" | b64url)
SIG=$(printf '%s.%s' "$H" "$P" | openssl dgst -sha256 -sign /tmp/layout_key.pem | openssl base64 -e -A | tr '+/' '-_' | tr -d '=')
JWT="$H.$P.$SIG"

DRIVE_TOKEN=$(curl -s -X POST https://oauth2.googleapis.com/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=$JWT" \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
SHEETS_TOKEN=$DRIVE_TOKEN  # mesmo token — escopo inclui drive.readonly + spreadsheets
rm -f /tmp/layout_key.pem
```

Listar arquivos na pasta Refs da BU:

```bash
REFS_ID="<id da pasta Refs>"
FILES_RESP=$(curl -s \
  "https://www.googleapis.com/drive/v3/files?q='${REFS_ID}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,modifiedTime)&orderBy=modifiedTime+desc" \
  -H "Authorization: Bearer $DRIVE_TOKEN")
```

Se houver mais de um arquivo, listar e perguntar qual usar (mostrar nome e data). Se houver apenas um, usar automaticamente e informar ao usuário.

Se não houver arquivos, informar: "A pasta Refs de `<bu>` está vazia. Suba a referência em: [URL da pasta]" e encerrar.

---

### Passo 2: Download da referência

Identificar o tipo do arquivo pelo `mimeType` ou extensão:
- Imagem (`image/*`): baixar como arquivo binário
- PDF (`application/pdf`): baixar como binário
- Google Doc (`application/vnd.google-apps.document`): exportar como texto/plain
- DOCX (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`): baixar como binário
- Texto (`text/plain`): baixar como texto

```bash
FILE_ID="<id do arquivo>"
FILENAME="<nome do arquivo>"
TMPDIR="/tmp/layout_ref"
mkdir -p "$TMPDIR"

# Para arquivos regulares (imagem, PDF, DOCX):
curl -s -L \
  "https://www.googleapis.com/drive/v3/files/${FILE_ID}?alt=media" \
  -H "Authorization: Bearer $DRIVE_TOKEN" \
  -o "${TMPDIR}/${FILENAME}"

# Para Google Docs (exportar como texto):
curl -s -L \
  "https://www.googleapis.com/drive/v3/files/${FILE_ID}/export?mimeType=text/plain" \
  -H "Authorization: Bearer $DRIVE_TOKEN" \
  -o "${TMPDIR}/${FILENAME}.txt"
```

---

### Passo 3: Analisar a referência

Usar as ferramentas Read ou Bash conforme o tipo:

**Imagem (JPG, PNG, GIF, WebP):**
Usar a ferramenta **Read** para visualizar o arquivo. Claude analisa a imagem com visão e extrai:
- Estrutura geral (quantas seções, organização vertical/horizontal)
- Hierarquia visual (o que é maior/mais proeminente)
- Mood e tom (minimalista, bold, editorial, urgente, elegante, etc.)
- Elementos chave (hero, grid, cards, tipografia grande, imagens pequenas, etc.)
- Intenção provável da comunicação (lançamento, educativo, oferta, notícia, evento)
- **Paleta cromática perceptível**: cores predominantes além da identidade da BU
- **Proporção de imagem vs. texto**: imagens grandes com texto mínimo? Ou texto dominante?
- **Padrão tipográfico**: headline enorme? Múltiplos blocos de copy? Bullets?

**PDF:**
Usar a ferramenta **Read** com pages="1-3" (máximo 3 páginas relevantes). Extrair conceito, estrutura e tom.

**DOCX ou texto:**
```bash
unzip -p "${TMPDIR}/${FILENAME}" word/document.xml 2>/dev/null \
  | sed 's/<[^>]*>//g' | tr -s ' \n' ' ' | head -c 3000
```
Ler como brief de design: identificar objetivo, tom, elementos mencionados.

**Após analisar**, montar internamente uma ficha de referência com:
```
FICHA DE REFERÊNCIA:
- Intenção: [lançamento / oferta / educativo / evento / institucional]
- Tom: [urgente / elegante / acessível / bold / técnico]
- Estrutura dominante: [hero grande / texto corrido / grid de itens / announcement]
- Proporção imagem/texto: [image-heavy / balanceado / text-heavy]
- Elementos obrigatórios nos HTMLs: [o que DEVE aparecer inspirado nessa ref]
- Elementos a evitar: [o que destoa do mood da ref]
```

Esta ficha guia diretamente:
- **Seleção dos arquétipos** (Passo 4): escolher os 4 que mais batem com a intenção e estrutura
- **Conteúdo placeholder** (Passo 5): usar texto e tamanhos de imagem que reflitam a ref, não genéricos
- **Hierarquia tipográfica** (Passo 5): se a ref tem headline gigante, os HTMLs devem ter; se texto corrido, refletir isso

---

### Passo 4: Propor 4 direções de layout

Com base na interpretação, selecionar as 4 direções mais adequadas dentre os arquétipos abaixo. A seleção deve ser diversificada — evitar escolher 4 variações muito similares.

**Biblioteca de arquétipos estruturais:**

| ID | Nome | Estrutura HTML | Melhor para |
|---|---|---|---|
| `A` | Hero Visual | Imagem full-width (600px) → headline → 2-3 parágrafos → CTA | Lançamentos, produtos visuais |
| `B` | Editorial | Barra de acento colorida → headline grande → texto colunar → imagem lateral 50% → CTA | Conteúdo rico, newsletters |
| `C` | Modular | Header → 3 blocos com título+ícone(inicial)+body → CTA final | Listas de benefícios, tutoriais |
| `D` | Announcement | Badge/tag em destaque → headline 36px bold centrado → data/info em destaque → body curto → CTA | Eventos, datas, urgência |
| `E` | Manifesto | Sem hero → headline enorme (48px, bold, centralizado) → tagline curta → CTA centralizado bold | Mensagens de impacto, brand |
| `F` | Side-by-side | 2 colunas MSO-safe: texto 60% / imagem 40% (ou inverso) → CTA abaixo | Produtos, cases |
| `G` | Showcase | 2×2 grid de cards (cada card: ícone/img + título + texto curto) → CTA único | Múltiplos produtos/benefícios |
| `H` | Narrativa | 4-5 seções com imagem alternando esquerda/direita em cada bloco | Storytelling, lançamentos complexos |

Apresentar ao usuário as 4 direções escolhidas **antes de gerar HTML**:

```
Analisei a referência e a interpreto como: [interpretação em 2-3 linhas]

Aqui estão 4 direções de layout que capturam esse conceito de formas diferentes:

**A — [Nome do arquétipo]**
[Uma frase descrevendo como ESSA referência específica seria estruturada neste arquétipo]
→ Melhor para: [por que faz sentido para este conteúdo]

**B — [Nome do arquétipo]**
...

**C — [Nome do arquétipo]**
...

**D — [Nome do arquétipo]**
...

Gero os 4 HTMLs ou quer ajustar alguma direção primeiro?
```

Aguardar confirmação. Se o usuário pedir alteração em alguma direção, substituir pelo arquétipo mais adequado e confirmar novamente.

---

### Passo 5: Gerar os 4 HTMLs

Ler os arquivos de configuração:
```bash
BRAND_JSON=$(cat "email-agent/brands/${BU}/brand.json")
# Extrair identidade (mesmos valores do catalog skill):
# COLOR_BG, COLOR_TEXT, COLOR_PRIMARY, COLOR_CTA_BG, COLOR_CTA_TEXT
# FONT_HEADING, FONT_BODY, LOGO_URL, LOGO_ALT, LOGO_WIDTH
```

Ler as regras: `email-agent/rules/html-email-rules.md`

**Antes de gerar os HTMLs**, registrar os nomes dos arquétipos confirmados pelo usuário:

```bash
# Substituir pelos nomes reais das direções escolhidas no Passo 4
ARQUETIPO_1="<nome do arquétipo 1>"  # ex: "Hero Visual"
ARQUETIPO_2="<nome do arquétipo 2>"
ARQUETIPO_3="<nome do arquétipo 3>"
ARQUETIPO_4="<nome do arquétipo 4>"
```

**Para cada uma das 4 direções**, gerar um arquivo HTML completo usando a ferramenta **Write**.

```bash
OUTDIR="email-agent/output/${CAMPAIGN_ID}"
mkdir -p "$OUTDIR"
```

Arquivos: `${OUTDIR}/option-1.html`, `option-2.html`, `option-3.html`, `option-4.html`

**Numerar de 1 a 4** (não A/B/C/D) — os cards no Notion serão `{CAMPAIGN_ID} — Opção 1` etc.

**Conteúdo placeholder deve refletir a referência** (não ser genérico):
- Se a ref é urgente/oferta → CTA agressivo, headline com verbo de ação
- Se editorial/educativo → headline explicativa, body com 2-3 parágrafos
- Proporção de imagem: respeitar a relação imagem/texto da ref
- Tamanho da headline: se ref tem texto enorme → usar 36-48px; se balanceado → 24-28px

#### Regras obrigatórias para o HTML gerado

1. **Estrutura table-based**: NUNCA usar div para estrutura, NUNCA usar flexbox/grid
2. **CSS 100% inline** em todos os elementos
3. **Largura máxima 600px**, `align="center"` em todas as tables externas
4. **Fontes**: usar apenas as fontes do `brand.json` (geralmente Arial/Helvetica)
5. **CTA bulletproof**: obrigatório ter VML para Outlook + fallback HTML
6. **Preheader**: span oculto no início do body (height:0, overflow:hidden, mso-hide:all)
7. **SFMC tracking**: `<custom name="opencounter" type="tracking"/>` no início
8. **Footer completo**: redes sociais + cancelar e-mails + endereço (usar o padrão da BU)
9. **Conteúdo placeholder**: usar texto que demonstre a estrutura (não deixar vazio)
   - Imagens: `https://placehold.co/600x300/HEXCOR/HEXCOR2?text=Imagem` (usar cores da BU)
   - Texto: conteúdo genérico que se encaixa no conceito da referência
   - CTA: texto de exemplo relevante para o conceito

#### Estrutura mínima de cada HTML

```html
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" ...>
<html xmlns="..." xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:[COLOR_BG];">
  <!-- SFMC tracking -->
  <div style="font-size:0;line-height:0;"><custom name="opencounter" type="tracking"/></div>

  <!-- PREHEADER oculto -->
  <table cellspacing="0" cellpadding="0" border="0" width="600" align="center">
    <tr><td style="font-size:0;width:0;height:0;display:none;overflow:hidden;mso-hide:all;max-height:0;">
      <span style="font-size:0;width:0;height:0;display:none;overflow:hidden;mso-hide:all;max-height:0;">
        %%=AttributeValue("_Preheader")=%%&nbsp;&zwnj;...
      </span>
    </td></tr>
  </table>

  <!-- HEADER: logo da BU -->
  [logo com HR accent na cor primary]

  <!-- CORPO: estrutura específica do arquétipo -->
  [estrutura HTML única por opção]

  <!-- FOOTER: padrão da BU (redes sociais + links + endereço) -->
  [footer completo da BU — mesmo padrão do catalog skill]

</body>
</html>
```

#### CTA bulletproof (obrigatório)

```html
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
  href="https://exemplo.com" style="height:52px;v-text-anchor:middle;width:240px;"
  arcsize="8%" strokecolor="[COLOR_CTA_BG]" fillcolor="[COLOR_CTA_BG]">
  <w:anchorlock/>
  <center style="color:[COLOR_CTA_TEXT];font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;">
    [Texto do CTA]
  </center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="https://exemplo.com" style="background-color:[COLOR_CTA_BG];border-radius:4px;color:[COLOR_CTA_TEXT];display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;line-height:52px;text-align:center;text-decoration:none;width:240px;-webkit-text-size-adjust:none;mso-hide:all;">
  [Texto do CTA]
</a>
<!--<![endif]-->
```

#### Diferenciação estrutural por arquétipo

**A — Hero Visual:**
```
[HEADER logo]
[IMG full-width 600x320 placeholder hero]
[TD padding:30px 40px]
  [Headline 28px bold]
  [Body 16px, 3 parágrafos]
  [CTA centralizado]
[FOOTER]
```

**B — Editorial:**
```
[HEADER logo]
[TD com border-left:4px solid COLOR_PRIMARY — headline 32px, bold]
[2 colunas: texto 58% | imagem 40% com gap]
[Body abaixo das colunas]
[CTA alinhado à esquerda]
[FOOTER]
```

**C — Modular (3 blocos):**
```
[HEADER logo]
[Intro headline 24px centrado]
[3 TDs empilhados, cada um com borda-esquerda colorida:]
  [Bloco 1: número/ícone inicial + título bold + corpo 14px]
  [Bloco 2: ...]
  [Bloco 3: ...]
[CTA centralizado]
[FOOTER]
```

**D — Announcement:**
```
[HEADER logo]
[Badge: span com background COLOR_PRIMARY, texto bold 12px uppercase]
[Headline 36px bold centralizado]
[Data/info em destaque: 20px, cor secondary]
[Body curto 16px]
[CTA centralizado]
[FOOTER]
```

**E — Manifesto:**
```
[HEADER logo]
[TD padding:60px 40px — Headline 48px bold centralizado]
[Tagline 20px, cor text_light, centralizado]
[HR 100px, cor primary, centralizado]
[CTA grande (width:280px) centralizado]
[FOOTER]
```

**F — Side-by-side:**
```
[HEADER logo]
[Headline 24px bold]
[Table 2 colunas MSO-safe:]
  [TD 55% — Texto: título + body + CTA]
  [TD 5% — spacer]
  [TD 40% — Imagem placeholder]
[FOOTER]
```

**G — Showcase (2×2 grid):**
```
[HEADER logo]
[Headline intro]
[Table 2 colunas:]
  [Card 1: img 48px placeholder + título bold + texto 13px]
  [Card 2: ...]
[Table 2 colunas:]
  [Card 3: ...]
  [Card 4: ...]
[CTA centralizado]
[FOOTER]
```

**H — Narrativa:**
```
[HEADER logo]
[Seção 1: img esquerda + texto direita]
[Seção 2: texto esquerda + img direita]
[Seção 3: img esquerda + texto direita]
[CTA centralizado]
[FOOTER]
```

---

### Passo 6: Screenshots

Para cada HTML gerado, tirar screenshot via Edge headless:

```bash
MSEDGE=""
for P in "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
          "/c/Program Files/Microsoft/Edge/Application/msedge.exe"; do
  [ -f "$P" ] && MSEDGE="$P" && break
done

for OPT in 1 2 3 4; do
  HTML_FILE="${OUTDIR}/option-${OPT}.html"
  PNG_FILE="${OUTDIR}/option-${OPT}.png"

  CWD=$(pwd)
  ABS_HTML="${CWD}/${HTML_FILE}"
  WIN_HTML="C:${ABS_HTML#/c}"; WIN_HTML="${WIN_HTML//\//\\}"
  ABS_PNG="${CWD}/${PNG_FILE}"
  WIN_PNG="C:${ABS_PNG#/c}"; WIN_PNG="${WIN_PNG//\//\\}"

  "$MSEDGE" --headless --disable-gpu --no-sandbox \
    --window-size=640,1400 \
    --screenshot="$WIN_PNG" \
    "file:///$WIN_HTML" 2>/dev/null

  [ -f "$PNG_FILE" ] && echo "✓ option-${OPT}.png" || echo "⚠ screenshot falhou option-${OPT}"
done
```

---

### Passo 7: Upload dos PNGs no SFMC e publicação no Notion

Este passo é **automático** — executar sempre após os screenshots, sem pedir confirmação.

#### 7-A: Token SFMC BU (para hospedar as imagens no CDN da BU)

**IMPORTANTE:** usar token com `account_id: MID_FINCLASS` — gera URL em `image.mkt.finclass.com`, que o Notion consegue renderizar como cover. Token enterprise gera URLs em `image.m.grupo-primo.com` que o Notion NÃO renderiza.

```bash
source email-agent/.env

# Determinar MID da BU selecionada
case "$BU" in
  finclass)     BU_MID="$MID_FINCLASS" ;;
  bruno-perini) BU_MID="$MID_BRUNO_PERINI" ;;
  faculdade-hub) BU_MID="$MID_FACULDADE_HUB" ;;
  thiago-nigro) BU_MID="$MID_THIAGO_NIGRO" ;;
esac

SFMC_TOKEN=$(curl -s -X POST \
  "https://${SFMC_SUBDOMAIN}.auth.marketingcloudapis.com/v2/token" \
  -H "Content-Type: application/json" \
  -d "{\"grant_type\":\"client_credentials\",\"client_id\":\"${SFMC_CLIENT_ID}\",\"client_secret\":\"${SFMC_CLIENT_SECRET}\",\"account_id\":\"${BU_MID}\"}" \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
```

#### 7-B: Para cada opção (1 a 4): upload PNG → publicar card no Notion

```bash
NOTION_TOKEN=$(grep -o '"token":"[^"]*"' email-agent/credentials/notion-config.json | cut -d'"' -f4)
DB_ID=$(grep -o '"catalog_database_id":"[^"]*"' email-agent/credentials/notion-config.json | cut -d'"' -f4)
TODAY=$(date +%Y-%m-%d)

for OPT in 1 2 3 4; do
  PNG_FILE="${OUTDIR}/option-${OPT}.png"
  [ ! -f "$PNG_FILE" ] && echo "⚠ Sem PNG para opção ${OPT}, pulando Notion" && continue

  # Upload SFMC — usar categoria de imagens da BU
  IMG_CAT=275201  # Finclass; adaptar para outras BUs se necessário
  ASSET_NAME="${CAMPAIGN_ID}-layout-opt${OPT}"
  B64=$(base64 -w 0 "$PNG_FILE")
  printf '{"name":"%s","assetType":{"name":"png","id":28},"file":"%s","category":{"id":%d}}' \
    "$ASSET_NAME" "$B64" "$IMG_CAT" > /tmp/sfmc_layout_upload.json

  UPLOAD_RESP=$(curl -s -X POST \
    "https://${SFMC_SUBDOMAIN}.rest.marketingcloudapis.com/asset/v1/content/assets" \
    -H "Authorization: Bearer $SFMC_TOKEN" \
    -H "Content-Type: application/json" \
    --data-binary @/tmp/sfmc_layout_upload.json)
  rm -f /tmp/sfmc_layout_upload.json

  PREVIEW_URL=$(echo "$UPLOAD_RESP" | grep -o '"publishedURL":"[^"]*"' | cut -d'"' -f4)
  eval "PREVIEW_URL_${OPT}=\"${PREVIEW_URL}\""  # salvar para uso no 7-D

  # Publicar no Notion
  PAGE_NAME="${CAMPAIGN_ID} — Opção ${OPT}"

  # Verificar se já existe
  SEARCH_RESP=$(curl -s -X POST "https://api.notion.com/v1/databases/${DB_ID}/query" \
    -H "Authorization: Bearer $NOTION_TOKEN" \
    -H "Notion-Version: 2022-06-28" \
    -H "Content-Type: application/json" \
    -d "{\"filter\":{\"property\":\"Nome\",\"title\":{\"equals\":\"${PAGE_NAME}\"}}}")
  PAGE_ID=$(echo "$SEARCH_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

  # Montar payload em arquivo (NUNCA usar interpolação inline — quebra silenciosamente)
  if [ -n "$PREVIEW_URL" ]; then
    cat > /tmp/notion_layout.json << ENDJSON
{
  "parent": { "database_id": "${DB_ID}" },
  "cover": { "type": "external", "external": { "url": "${PREVIEW_URL}" } },
  "properties": {
    "Nome": { "title": [{ "text": { "content": "${PAGE_NAME}" } }] },
    "template_id": { "rich_text": [{ "text": { "content": "${CAMPAIGN_ID}-opt${OPT}" } }] },
    "bu": { "select": { "name": "${BU}" } },
    "tags": { "multi_select": [{ "name": "layout-proposta" }, { "name": "${CAMPAIGN_ID}" }] },
    "drive_link": { "url": "${PREVIEW_URL}" },
    "atualizado_em": { "date": { "start": "${TODAY}" } }
  }
}
ENDJSON
  else
    cat > /tmp/notion_layout.json << ENDJSON
{
  "parent": { "database_id": "${DB_ID}" },
  "properties": {
    "Nome": { "title": [{ "text": { "content": "${PAGE_NAME}" } }] },
    "template_id": { "rich_text": [{ "text": { "content": "${CAMPAIGN_ID}-opt${OPT}" } }] },
    "bu": { "select": { "name": "${BU}" } },
    "tags": { "multi_select": [{ "name": "layout-proposta" }, { "name": "${CAMPAIGN_ID}" }] },
    "atualizado_em": { "date": { "start": "${TODAY}" } }
  }
}
ENDJSON
  fi

  if [ -n "$PAGE_ID" ]; then
    RESP=$(curl -s -X PATCH "https://api.notion.com/v1/pages/${PAGE_ID}" \
      -H "Authorization: Bearer $NOTION_TOKEN" \
      -H "Notion-Version: 2022-06-28" \
      -H "Content-Type: application/json" \
      --data-binary @/tmp/notion_layout.json)
    ERR=$(echo "$RESP" | grep -o '"message":"[^"]*"' | head -1)
    [ -n "$ERR" ] && echo "⚠ Notion PATCH ${PAGE_NAME}: $ERR" || echo "✓ Notion atualizado: ${PAGE_NAME}"
  else
    RESP=$(curl -s -X POST "https://api.notion.com/v1/pages" \
      -H "Authorization: Bearer $NOTION_TOKEN" \
      -H "Notion-Version: 2022-06-28" \
      -H "Content-Type: application/json" \
      --data-binary @/tmp/notion_layout.json)
    ERR=$(echo "$RESP" | grep -o '"message":"[^"]*"' | head -1)
    [ -n "$ERR" ] && echo "⚠ Notion POST ${PAGE_NAME}: $ERR" || echo "✓ Notion criado: ${PAGE_NAME}"
  fi

  rm -f /tmp/notion_layout.json
done
```

#### 7-C: Exibir resultado final

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 LAYOUT — <CAMPAIGN_ID> — <BU>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Opção 1 — [Nome do arquétipo]: [diferencial em 1 frase]
 Opção 2 — [Nome do arquétipo]: [diferencial em 1 frase]
 Opção 3 — [Nome do arquétipo]: [diferencial em 1 frase]
 Opção 4 — [Nome do arquétipo]: [diferencial em 1 frase]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ 4 cards publicados no Notion como "<CAMPAIGN_ID> — Opção 1/2/3/4"
✓ Aba "Catálogo" atualizada na planilha de <BU> (se configurada)

Qual opção você prefere?
Ou: "ajusta X na opção 2" para refinar antes de decidir.
```

#### 7-D: Registrar na aba "Catálogo" do Google Sheets

Este passo é **automático** — executar sempre após o loop 7-B, sem pedir confirmação.

Verificar se a BU tem planilha configurada em `sheets-config.json`:

```bash
SPREADSHEET_ID=$(grep -A3 "\"${BU}\":" email-agent/credentials/sheets-config.json \
  | grep '"spreadsheet_id"' \
  | grep -o '"[^"]*"$' | tr -d '"')
```

Se `SPREADSHEET_ID` vazio, informar `"⚠ ${BU} sem planilha configurada — Sheets não atualizado"` e pular.

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
A: id           → campaign_id (ex: SSL0002)
B: bu           → nome da BU (ex: finclass)
C: nome         → "Opção N" (ex: Opção 1)
D: arquetipo    → código + nome (ex: A — Hero Visual)
E: refs         → EDITÁVEL pelo stakeholder — links de referência visual
F: prompt       → texto de briefing do arquétipo — COPIAR com Ctrl+C para reusar em campanhas futuras
G: preview      → fórmula =IMAGE(url)
H: url          → URL pública SFMC
I: atualizado_em
```

**Mapeamento arquétipo → prompt de briefing:**

```bash
get_arq_prompt() {
  local ARQ="$1"
  case "$ARQ" in
    *"Hero Visual"*)
      echo "Arquétipo Hero Visual. Estrutura: imagem full-width 600px no topo → headline curta → 2-3 parágrafos de copy → CTA único destacado. Ideal para lançamentos e produtos visuais. Briefing: imagem do produto/campanha, headline impactante (máx 8 palavras), CTA único com urgência." ;;
    *"Editorial"*)
      echo "Arquétipo Editorial. Estrutura: barra de acento colorida → headline grande → texto colunar → imagem lateral 50% → CTA. Ideal para newsletters, conteúdo educativo, comunicações ricas em texto. Briefing: tema central, 3-4 parágrafos de copy, imagem complementar, CTA suave." ;;
    *"Modular"*)
      echo "Arquétipo Modular. Estrutura: header → 3 blocos (ícone/inicial + título + corpo) → CTA final. Ideal para listas de benefícios, tutoriais, comparações. Briefing: 3 pontos ou benefícios distintos, cada um com título e 2-3 linhas de copy." ;;
    *"Announcement"*)
      echo "Arquétipo Announcement. Estrutura: badge/tag em destaque → headline bold centrado 36px → data ou info em destaque → body curto → CTA. Ideal para eventos, datas especiais, urgência. Briefing: headline de impacto, data/prazo, 1-2 parágrafos curtos." ;;
    *)
      echo "Arquétipo: ${ARQ}. Estrutura livre. Adaptar conforme briefing da campanha." ;;
  esac
}
```

**Para cada opção (1 a 4), adicionar linha:**

```bash
TODAY_SHEETS=$(date +%Y-%m-%d)

for OPT in 1 2 3 4; do
  [ ! -f "${OUTDIR}/option-${OPT}.png" ] && continue

  eval "PREVIEW_URL_OPT=\$PREVIEW_URL_${OPT}"
  eval "ARQ=\$ARQUETIPO_${OPT}"

  PREVIEW_FORMULA=""
  [ -n "$PREVIEW_URL_OPT" ] && PREVIEW_FORMULA="=IMAGE(\"${PREVIEW_URL_OPT}\")"

  ARQ_PROMPT=$(get_arq_prompt "$ARQ")

  cat > /tmp/sheets_layout_row.json << ENDJSON
{
  "range": "Cat\u00e1logo!A:I",
  "majorDimension": "ROWS",
  "values": [["${CAMPAIGN_ID}", "${BU}", "Op\u00e7\u00e3o ${OPT}", "${ARQ}", "", "${ARQ_PROMPT}", "${PREVIEW_FORMULA}", "${PREVIEW_URL_OPT:-}", "${TODAY_SHEETS}"]]
}
ENDJSON

  SHEETS_RESP=$(curl -s -X POST \
    "https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Cat%C3%A1logo!A%3AI:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS" \
    -H "Authorization: Bearer $SHEETS_TOKEN" \
    -H "Content-Type: application/json" \
    --data-binary @/tmp/sheets_layout_row.json)
  rm -f /tmp/sheets_layout_row.json

  SHEETS_ERR=$(echo "$SHEETS_RESP" | grep -o '"message":"[^"]*"' | head -1)
  [ -n "$SHEETS_ERR" ] && echo "⚠ Sheets opção ${OPT}: $SHEETS_ERR" || echo "✓ Sheets: ${CAMPAIGN_ID} — Opção ${OPT}"
done
```

---

### Passo 8: Após escolha

**8-A: Refinamento (se pedido)**

Se o usuário pedir ajuste em uma opção antes de decidir, editar o HTML correspondente, tirar novo screenshot, fazer re-upload no SFMC e atualizar o card no Notion (PATCH na página existente).

**8-B: Opção escolhida**

Copiar o HTML escolhido com nome final:
```bash
CHOSEN="2"  # exemplo
cp "${OUTDIR}/option-${CHOSEN}.html" "email-agent/output/${TODAY}-${BU}-${CAMPAIGN_ID}-layout.html"
```

Perguntar: **"Quer adicionar este layout ao catálogo permanente de templates?"**

**8-C: Adicionar ao catálogo permanente (se confirmado)**

1. Pedir um ID descritivo: ex: `hero-split`, `bold-announcement`, `three-benefits`
2. Criar a estrutura do template:

```bash
NEW_ID="<id-escolhido>"
mkdir -p "email-agent/templates/${NEW_ID}/preview"

# Converter para base.html com placeholders
# O HTML gerado tem valores fixos — substituí-los por {{PLACEHOLDER}} para o template base:
# - Cores específicas da BU → {{COLOR_PRIMARY}}, {{COLOR_CTA_BG}}, etc.
# - Logo URL → {{LOGO_URL}}, {{LOGO_ALT}}, {{LOGO_WIDTH}}
# - Conteúdo de amostra → mantido como sample-content.json
# - Footer → {{FOOTER_BLOCK}}
```

3. Criar `meta.json`:
```json
{
  "id": "<new-id>",
  "name": "<Nome descritivo>",
  "tags": ["<arquétipo>", "<conceito>", "<bu-origem>"],
  "content_zones": ["headline", "body_copy", "cta"],
  "best_for": ["<tipo de campanha>"],
  "origin": "gerado via referência",
  "created": "<YYYY-MM-DD>"
}
```

4. Criar `sample-content.json` com o conteúdo placeholder usado na geração.

5. Copiar o PNG gerado como preview inicial:
```bash
cp "${OUTDIR}/option-${CHOSEN}.png" "email-agent/templates/${NEW_ID}/preview/${BU}.png"
```

6. Publicar no Notion (usar o mesmo fluxo do `/catalog generate` — Passo G-5 do catalog skill):
   - Obter token SFMC enterprise para upload do PNG
   - Criar card no Notion com cover = URL do SFMC

7. Rodar `/catalog generate all <new-id>` para gerar os previews para as outras BUs também.

---

## Troubleshooting

**Arquivo de referência muito grande (PDF com muitas páginas):**
→ Ler apenas as primeiras 3 páginas com `pages="1-3"` no Read tool. A intenção de design geralmente está nas primeiras páginas.

**Referência é texto genérico sem muita direção visual:**
→ Focar na intenção comunicativa (urgência? educação? lançamento?) para determinar os arquétipos mais adequados. Apresentar interpretação mais explícita ao usuário.

**Screenshot em branco:**
→ Adicionar `--run-all-compositor-stages-before-draw` e tentar novamente.

**Usuário quer uma 5ª opção diferente:**
→ Mostrar os 4 arquétipos restantes da biblioteca e perguntar qual substituir.

**HTML gerado está muito parecido entre opções:**
→ Verificar se as estruturas de TD/TABLE são realmente diferentes. Cada opção deve ter um número diferente de seções principais, hierarquia de tamanho de fonte diferente, ou organização horizontal/vertical diferente.
