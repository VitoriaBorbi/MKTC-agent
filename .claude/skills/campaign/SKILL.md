---
name: campaign
version: "1.0"
language: "pt-BR"
description: >
  Agente especializado em gerar campanhas de email marketing HTML para SFMC.
  Recebe um .docx com N copies separadas por marcadores, gera N emails HTML,
  permite revisão e ajuste individual de cada um, e faz upload em batch ao final.
tags:
  - email-marketing
  - campanha
  - html
  - sfmc
  - crm
inputs:
  - bu (interativo): selecionado pelo usuario
  - arquivo .docx de campanha: selecionado pelo usuario (em inbox/campanhas-<marca>/)
outputs:
  - N arquivos HTML em email-agent/output/
  - N assets no SFMC Content Builder
---

# Email Campaign Agent

Você é um especialista em email marketing HTML. Sua missão é transformar um `.docx` de campanha — contendo N copies separadas por marcadores — em N emails HTML prontos para produção no SFMC.

Reutilize toda a lógica da skill `/email`: bu config, regras HTML, geração de HTML, upload SFMC. O que muda é a camada de orquestração ao redor.

---

## Convenção do .docx de campanha

O arquivo de campanha segue este formato:

```
CAMPANHA: <nome da campanha>
MARCA: <nome da marca>

=== EMAIL 1 - Abertura ===
Subject: <assunto do email 1>
Linha Fina: <preheader do email 1>
Remetente: <remetente>

[copy do email 1 com imagens embutidas]

=== EMAIL 2 - Prova Social ===
Subject: <assunto do email 2>
Linha Fina: <preheader do email 2>

[copy do email 2 com imagens embutidas]

=== EMAIL N - Nome ===
...
```

**Marcador obrigatório:** `=== EMAIL N - Nome ===` em parágrafo próprio.

---

## Fluxo de Execução

### Passo 1: Perguntar a marca

Listar marcas disponíveis em `email-agent/brands/`. Usar AskUserQuestion para o usuário escolher.

### Passo 2: Perguntar o arquivo .docx de campanha

Listar arquivos `.docx` disponíveis em `email-agent/inbox/campanhas-<marca>/` e subpastas. Usar AskUserQuestion para o usuário escolher.

### Passo 3: Carregar configuração da marca e regras

Ler:
1. `email-agent/brands/<marca>/brand.json`
2. `email-agent/brands/<marca>/template.html`
3. `email-agent/rules/html-email-rules.md`

### Passo 4: Extrair e dividir o .docx em seções

#### 4-A: Preparar ambiente

```bash
mkdir -p /tmp/docx_work
cp "email-agent/inbox/campanhas-<marca>/<subpasta>/<arquivo>.docx" /tmp/docx_work/doc.docx
unzip -o /tmp/docx_work/doc.docx "word/document.xml" "word/_rels/document.xml.rels" -d /tmp/docx_work/
```

#### 4-B: Detectar marcadores e dividir seções

```bash
# Extrair texto por parágrafo com número de linha
sed 's/<\/w:p>/\n---PARA---\n/g' /tmp/docx_work/word/document.xml \
  | sed 's/<[^>]*>//g' \
  | grep -n "=== EMAIL"
# Saída esperada:
# 42:=== EMAIL 1 - Abertura ===
# 187:=== EMAIL 2 - Prova Social ===
# 334:=== EMAIL 3 - Urgência ===
```

Com as linhas dos marcadores, extrair para cada seção N:
- **Nome** do email (texto após o número no marcador: `Abertura`, `Prova Social`, etc.)
- **Slug** do nome (lowercase, hifens): `abertura`, `prova-social`
- **Subject** (linha `Subject:` logo após o marcador)
- **Preheader** (linha `Linha Fina:` logo após o marcador)
- **Copy** (todo o texto entre este marcador e o próximo)

Se não encontrar marcadores `=== EMAIL N ===`: avisar o usuário e perguntar se quer processar como email individual (rodar `/email` em vez disso).

#### 4-C: Mapear imagens por seção

```bash
# Extrair todos os rIds na ordem de aparição no documento
grep -oP 'r:embed="rId[0-9]+"' /tmp/docx_work/word/document.xml \
  | sed 's/r:embed="//;s/"//'
# Saída: rId6, rId7, rId8, rId9, rId10...

# Extrair mapa rId → arquivo
grep -oP 'Id="[^"]*"[^>]*Target="media/[^"]*"' \
  /tmp/docx_work/word/_rels/document.xml.rels \
  | sed 's/Id="\([^"]*\)".*Target="media\/\([^"]*\)"/\1=\2/'
```

Cruzar a **posição de cada rId** no XML com a **posição dos marcadores**:
- Imagens que aparecem antes do marcador 2 → pertencem à seção 1
- Imagens entre marcador 2 e 3 → seção 2
- E assim por diante

Para identificar posição de cada rId no XML:
```bash
# Posição (número de caracteres) de cada rId no document.xml
for RID in rId6 rId7 rId8 rId9; do
  POS=$(grep -bo "r:embed=\"${RID}\"" /tmp/docx_work/word/document.xml | head -1 | cut -d: -f1)
  echo "$RID → posição $POS"
done

# Posição de cada marcador
for N in 1 2 3 4 5; do
  POS=$(grep -bo "=== EMAIL ${N}" /tmp/docx_work/word/document.xml | head -1 | cut -d: -f1)
  echo "Marcador EMAIL $N → posição $POS"
done
```

Com as posições, montar o mapeamento `secao_N → [rId_a, rId_b, ...]`.

Se a posição de uma imagem for ambígua (próxima a um marcador), perguntar ao usuário a qual seção pertence.

#### 4-D: Extrair formatação de cada seção

Para cada seção, identificar cores especiais, negrito, itálico (como na skill `/email` Passo 4-A):
```bash
# Cores em cada seção (ex: ff0000, 666666)
sed 's/<\/w:p>/\n==END==\n/g' /tmp/docx_work/word/document.xml \
  | awk '/==END==/{if(p~/ff0000/){gsub(/<[^>]+>/,"",p); ...}; p=""} {p=p $0}'
```

#### 4-E: Links de CTA de cada seção

Para cada seção, verificar se há links na copy. Se não houver:
- Perguntar ao usuário: link simples ou PMP?
- **Link simples:** coletar URL completa. Usar diretamente no `href`.
- **Link com PMP:** coletar URL base + string PMP. O `@emailid` **não precisa ser informado** — será preenchido automaticamente com o ID do asset após o upload (Passo 8-B).

### Passo 5: Upload de imagens

Para cada seção N (dentro do loop de geração, Passo 6):

```bash
# Extrair apenas as imagens da seção N
unzip -j /tmp/docx_work/doc.docx "word/media/*" -d /tmp/docx_work/media_all/

# Autenticar no SFMC (BU da marca)
source email-agent/.env
TOKEN=$(curl -s -X POST "https://${SFMC_SUBDOMAIN}.auth.marketingcloudapis.com/v2/token" \
  -H "Content-Type: application/json" \
  -d "{\"grant_type\":\"client_credentials\",\"client_id\":\"${SFMC_CLIENT_ID}\",\"client_secret\":\"${SFMC_CLIENT_SECRET}\",\"account_id\":\"${MID}\"}" \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

# Upload de cada imagem da seção (usando img_category_id do brand.json)
IMG_CATEGORY_ID=<sfmc.img_category_id do brand.json>

for IMG_FILE in <imagens da seção N>; do
  EXT="${IMG_FILE##*.}"
  NAME=$(basename "$IMG_FILE" ."$EXT")
  case "$EXT" in
    png)       TYPE_NAME="png"; TYPE_ID=20 ;;
    jpg|jpeg)  TYPE_NAME="jpg"; TYPE_ID=22 ;;
    gif)       TYPE_NAME="gif"; TYPE_ID=23 ;;
  esac
  IMG_BASE64=$(base64 -w 0 "$IMG_FILE")
  printf '{"name":"%s","assetType":{"name":"%s","id":%d},"file":"%s","category":{"id":%d}}' \
    "$NAME" "$TYPE_NAME" "$TYPE_ID" "$IMG_BASE64" "$IMG_CATEGORY_ID" > /tmp/img_payload.json
  RESPONSE=$(curl -s -X POST \
    "https://${SFMC_SUBDOMAIN}.rest.marketingcloudapis.com/asset/v1/content/assets" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    --data-binary @/tmp/img_payload.json)
  PUBLISHED_URL=$(echo "$RESPONSE" | grep -o '"publishedURL":"[^"]*"' | cut -d'"' -f4)
  echo "$NAME → $PUBLISHED_URL"
done
rm -f /tmp/img_payload.json
```

Guardar mapeamento `rId → publishedURL` para usar na geração do HTML da seção N.

**Nota:** SFMC pode retornar URL com extensão `.gif` mesmo para arquivos `.png` — comportamento normal.

### Passo 6: Loop de geração de emails

Para cada seção N (de 1 a total):

```
Gerando email N/TOTAL: "<Nome da Seção>"
```

1. Gerar HTML completo seguindo todas as regras da skill `/email` (Passo 8):
   - Doctype XHTML, meta tags, conditional comments MSO
   - Layout 100% table-based, CSS inline
   - Cores e logo do brand.json
   - Preheader invisível
   - Imagens com as `publishedURL` do SFMC
   - Formatação preservada (cores, negrito, itálico — do Passo 4-D)
   - CTAs com o link da seção (simples ou AMPscript PMP — do Passo 4-E); se PMP, usar `TODO_EMAILID` como placeholder em `set @emailid`
   - Footer completo do brand.json

2. Salvar em:
   ```
   email-agent/output/YYYY-MM-DD-<marca>-<slug-campanha>-email-NN-<slug-nome>.html
   ```
   Exemplo: `2026-02-20-finclass-segundo-salario-email-01-abertura.html`

3. Abrir preview no browser:
   ```bash
   start "email-agent/output/<arquivo>.html"
   ```

Ao final do loop, todos os emails estão gerados e abertos para visualização.

### Passo 7: Loop de revisão e ajuste

Exibir o **painel de status da campanha** e entrar no loop de revisão:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Campanha: <nome> | <marca> | N emails gerados
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  👀 Email 1 — Abertura
  👀 Email 2 — Prova Social
  👀 Email 3 — Urgência
  👀 Email 4 — Último Aviso
  👀 Email 5 — Encerramento
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Usar AskUserQuestion:
> "Quer ajustar algum email antes de subir para o SFMC?"
> Opções: **Sim, quero ajustar** / **Não, pode subir tudo**

**Se sim — perguntar qual:**

Usar AskUserQuestion com a lista dos emails como opções (mostrar nome + ícone de status).

**Fazer o ajuste solicitado:**
- Ajuste de texto → editar o HTML diretamente
- Ajuste de layout → reorganizar seções no HTML
- Mudança de CTA / link → atualizar href
- Refazer → regenerar o HTML da seção

Após qualquer ajuste:
1. Salvar o HTML atualizado (sobrescrever o arquivo)
2. Reabrir o preview no browser
3. Atualizar status: `👀 → ✏️` (se primeira vez) ou incrementar contador de ajustes
4. Exibir painel atualizado + mensagem:

```
Pronto! "Email 3 — Urgência" atualizado (ajustado 1x).
Tem mais algum para ajustar antes de subir?
```

Usar AskUserQuestion: **Sim, outro** / **Não, pode subir tudo**

**Ícones de status:**
- `👀` — gerado, ainda não revisado
- `✏️` — ajustado (mostrar quantas vezes: `✏️ 2x`)
- `✅` — confirmado pelo usuário como ok (quando responde "não, pode subir tudo")

Repetir o loop até confirmação de upload.

### Passo 8: Upload batch para o SFMC

Antes de subir, mostrar resumo final:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Subindo campanha para o SFMC...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Email 1 — Abertura          → uploading...
  ✏️  Email 2 — Prova Social (2x) → uploading...
  ✅ Email 3 — Urgência          → uploading...
  👀 Email 4 — Último Aviso      → uploading...
  ✅ Email 5 — Encerramento      → uploading...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Para cada email, executar o fluxo de upload da skill `/email` (Passos 12-A e 12-B):

#### 8-A: Autenticar

```bash
source email-agent/.env
TOKEN=$(curl -s -X POST "https://${SFMC_SUBDOMAIN}.auth.marketingcloudapis.com/v2/token" \
  -H "Content-Type: application/json" \
  -d "{\"grant_type\":\"client_credentials\",\"client_id\":\"${SFMC_CLIENT_ID}\",\"client_secret\":\"${SFMC_CLIENT_SECRET}\",\"account_id\":\"${MID}\"}" \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
```

Reautenticar automaticamente se o token expirar durante o loop.

#### 8-B: Upload de cada email

```bash
HTML_FILE="email-agent/output/<arquivo>.html"
EMAIL_NAME="<nome do asset>"
SUBJECT="<subject da seção>"
PREHEADER="<preheader da seção>"
CATEGORY_ID=<sfmc.category_id do brand.json>

# Escapar subject e preheader para JSON
SUBJ_ESC=$(printf '%s' "$SUBJECT" | sed 's/"/\\"/g')
PRE_ESC=$(printf '%s' "$PREHEADER" | sed 's/"/\\"/g')
NAME_ESC=$(printf '%s' "$EMAIL_NAME" | sed 's/"/\\"/g')

# Construir payload em partes (sem jq)
printf '{"name":"%s","assetType":{"name":"htmlemail","id":208},"views":{"html":{"content":"' \
  "$NAME_ESC" > /tmp/email_payload.json
awk 'NR>1{printf "\\n"} {gsub(/\r/,""); gsub(/\t/,"  "); gsub(/"/,"\\\""); printf "%s", $0}' \
  "$HTML_FILE" >> /tmp/email_payload.json
printf '"},"subjectline":{"content":"%s"},"preheader":{"content":"%s"}},"category":{"id":%d}}' \
  "$SUBJ_ESC" "$PRE_ESC" "$CATEGORY_ID" >> /tmp/email_payload.json

# POST (novo asset)
RESPONSE=$(curl -s -X POST \
  "https://${SFMC_SUBDOMAIN}.rest.marketingcloudapis.com/asset/v1/content/assets" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/email_payload.json)

rm -f /tmp/email_payload.json
```

Extrair o `ASSET_ID` do response:
```bash
ASSET_ID=$(echo "$RESPONSE" | grep -o '"id": *[0-9]*' | head -1 | grep -o '[0-9]*')
```

**Se o HTML contiver `TODO_EMAILID` (link PMP):** substituir pelo `ASSET_ID` e fazer um PUT para atualizar o asset:

```bash
if grep -q 'TODO_EMAILID' "$HTML_FILE"; then
  sed -i "s/TODO_EMAILID/$ASSET_ID/g" "$HTML_FILE"

  CKEY=$(curl -s "https://${SFMC_SUBDOMAIN}.rest.marketingcloudapis.com/asset/v1/content/assets/$ASSET_ID" \
    -H "Authorization: Bearer $TOKEN" \
    | grep -o '"customerKey": *"[^"]*"' | head -1 | grep -o '"[^"]*"$' | tr -d '"')

  printf '{"id":%s,"customerKey":"%s","name":"%s","assetType":{"name":"htmlemail","id":208},"views":{"html":{"content":"' \
    "$ASSET_ID" "$CKEY" "$NAME_ESC" > /tmp/email_payload.json
  awk -f email-agent/scripts/escape-html.awk "$HTML_FILE" >> /tmp/email_payload.json
  printf '"},"subjectline":{"content":"%s"},"preheader":{"content":"%s"}},"category":{"id":%d}}' \
    "$SUBJ_ESC" "$PRE_ESC" "$CATEGORY_ID" >> /tmp/email_payload.json

  curl -s -X PUT \
    "https://${SFMC_SUBDOMAIN}.rest.marketingcloudapis.com/asset/v1/content/assets/$ASSET_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    --data-binary @/tmp/email_payload.json > /dev/null

  rm -f /tmp/email_payload.json
  echo "  TODO_EMAILID → $ASSET_ID (asset atualizado)"
fi
```

Se retornar erro `118039` (nome já em uso): fazer GET para buscar `id` e `customerKey`, depois PUT para atualizar:

```bash
# GET para buscar customerKey
ASSET_INFO=$(curl -s "https://${SFMC_SUBDOMAIN}.rest.marketingcloudapis.com/asset/v1/content/assets?%24filter=name%20eq%20'${NAME_ESC}'" \
  -H "Authorization: Bearer $TOKEN")
ASSET_ID=$(echo "$ASSET_INFO" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
CUSTOMER_KEY=$(echo "$ASSET_INFO" | grep -o '"customerKey":"[^"]*"' | head -1 | cut -d'"' -f4)

# PUT para atualizar
printf '{"id":%d,"customerKey":"%s","name":"%s","assetType":{"name":"htmlemail","id":208},"views":{"html":{"content":"' \
  "$ASSET_ID" "$CUSTOMER_KEY" "$NAME_ESC" > /tmp/email_payload.json
awk 'NR>1{printf "\\n"} {gsub(/\r/,""); gsub(/\t/,"  "); gsub(/"/,"\\\""); printf "%s", $0}' \
  "$HTML_FILE" >> /tmp/email_payload.json
printf '"},"subjectline":{"content":"%s"},"preheader":{"content":"%s"}},"category":{"id":%d}}' \
  "$SUBJ_ESC" "$PRE_ESC" "$CATEGORY_ID" >> /tmp/email_payload.json

curl -s -X PUT \
  "https://${SFMC_SUBDOMAIN}.rest.marketingcloudapis.com/asset/v1/content/assets/$ASSET_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/email_payload.json

rm -f /tmp/email_payload.json
```

Se um upload falhar: avisar, oferecer retry, continuar com os demais.

#### 8-C: Confirmar

Após todos os uploads, exibir resumo final:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Campanha enviada para o SFMC!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Email 1 — Abertura       → ID: 36020
  ✅ Email 2 — Prova Social   → ID: 36021
  ✅ Email 3 — Urgência       → ID: 36022
  ✅ Email 4 — Último Aviso   → ID: 36023
  ✅ Email 5 — Encerramento   → ID: 36024
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Content Builder: Content Builder/Email/Claude Code
```

### Passo 9: Limpeza

```bash
# Mover imagens processadas para uploaded/
mkdir -p /tmp/docx_work/media_uploaded
mv /tmp/docx_work/media_all/* /tmp/docx_work/media_uploaded/ 2>/dev/null
```

---

## Regras de Ouro

As mesmas da skill `/email`, mais:

1. **Nunca misturar imagens entre seções** — cada email usa apenas as imagens da sua seção
2. **Painel de status sempre atualizado** — mostrar ícones corretos a cada interação
3. **Upload somente após confirmação** — nunca subir sem o usuário aprovar o batch
4. **Nomenclatura consistente** — slug da campanha + número com zero à esquerda (01, 02...)
5. **Reautenticar automaticamente** — token SFMC expira em ~20 min; verificar e renovar entre uploads

---

## Tratamento de Erros

| Situação | Comportamento |
|---|---|
| Sem marcadores no .docx | Avisar e sugerir rodar `/email` em vez disso |
| Imagem ambígua entre seções | Perguntar ao usuário a qual seção pertence |
| Upload de imagem falha | Usar placeholder no HTML, avisar, continuar |
| Upload de email falha (POST/PUT) | Avisar erro, oferecer retry, continuar com demais |
| Token expirado durante batch | Reautenticar automaticamente e continuar |
| Nome de asset já existe no SFMC | Fazer PUT para atualizar em vez de POST |
