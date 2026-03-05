#!/bin/bash
# email-agent/scripts/setup-drive-folders.sh
# Cria estrutura de pastas no Google Drive para o Email Agent
# Uso: bash email-agent/scripts/setup-drive-folders.sh <ROOT_FOLDER_ID>

set -euo pipefail

ROOT_ID="${1:-}"
[ -n "$ROOT_ID" ] || { echo "Uso: $0 <root_folder_id>"; exit 1; }

CREDS="email-agent/credentials/google-service-account.json"
[ -f "$CREDS" ] || { echo "ERRO: Credenciais não encontradas em $CREDS"; exit 1; }

b64url() { openssl base64 -e -A | tr '+/' '-_' | tr -d '='; }
log()  { printf "  ▶ %s\n" "$*"; }
ok()   { printf "  ✓ %s\n" "$*"; }
die()  { printf "  ✗ ERRO: %s\n" "$*" >&2; exit 1; }

DRIVE_API="https://www.googleapis.com/drive/v3/files"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  MKTC Agent — Setup Drive Folders"
echo "  Root: $ROOT_ID"
echo "═══════════════════════════════════════════════════"
echo ""

# ─── Auth ─────────────────────────────────────────────────────────────────────
log "Autenticando..."
CLIENT_EMAIL=$(grep -o '"client_email": *"[^"]*"' "$CREDS" | grep -o '"[^"]*@[^"]*"' | tr -d '"')
printf '%b' "$(grep -o '"private_key": *"[^"]*"' "$CREDS" | sed 's/.*"private_key": *"//;s/"$//')" > /tmp/mktc_drive_key.pem

NOW=$(date +%s); EXP=$((NOW+3600))
H=$(echo -n '{"alg":"RS256","typ":"JWT"}' | b64url)
P=$(printf '{"iss":"%s","scope":"https://www.googleapis.com/auth/drive","aud":"https://oauth2.googleapis.com/token","exp":%d,"iat":%d}' \
    "$CLIENT_EMAIL" "$EXP" "$NOW" | b64url)
S=$(echo -n "${H}.${P}" | openssl dgst -sha256 -sign /tmp/mktc_drive_key.pem -binary \
    | openssl base64 -e -A | tr '+/' '-_' | tr -d '=')

TOK=$(curl -s -X POST "https://oauth2.googleapis.com/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${H}.${P}.${S}" \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
[ -n "$TOK" ] || die "Falha na autenticação"
ok "Token obtido"

AUTH="Authorization: Bearer $TOK"
CT="Content-Type: application/json"

# ─── Helper: criar pasta ───────────────────────────────────────────────────────
create_folder() {
  local NAME="$1"
  local PARENT="$2"
  local RESP
  RESP=$(curl -s -X POST "$DRIVE_API" \
    -H "$AUTH" -H "$CT" \
    -d "{\"name\":\"$NAME\",\"mimeType\":\"application/vnd.google-apps.folder\",\"parents\":[\"$PARENT\"]}")
  local FID
  FID=$(echo "$RESP" | grep -o '"id": *"[^"]*"' | head -1 | grep -o '"[^"]*"$' | tr -d '"')
  [ -n "$FID" ] || die "Falha ao criar '$NAME': $RESP"
  echo "$FID"
}

# ─── Criar estrutura ──────────────────────────────────────────────────────────
BRANDS=("Bruno Perini" "Faculdade Hub" "Finclass" "Thiago Nigro")

declare -A BRAND_IDS
declare -A AVULSOS_IDS
declare -A CAMPANHAS_IDS

for BRAND in "${BRANDS[@]}"; do
  log "Criando '$BRAND'..."
  BID=$(create_folder "$BRAND" "$ROOT_ID")
  BRAND_IDS["$BRAND"]="$BID"
  ok "'$BRAND' → $BID"

  AID=$(create_folder "Avulsos" "$BID")
  AVULSOS_IDS["$BRAND"]="$AID"
  ok "  Avulsos → $AID"

  CID=$(create_folder "Campanhas" "$BID")
  CAMPANHAS_IDS["$BRAND"]="$CID"
  ok "  Campanhas → $CID"
done

# ─── Resumo ───────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo "  PRONTO! Estrutura criada:"
echo ""
for BRAND in "${BRANDS[@]}"; do
  echo "  📁 $BRAND"
  echo "     ID brand:    ${BRAND_IDS[$BRAND]}"
  echo "     ID Avulsos:  ${AVULSOS_IDS[$BRAND]}"
  echo "     ID Campanhas:${CAMPANHAS_IDS[$BRAND]}"
  echo ""
done
echo "  Acesse: https://drive.google.com/drive/folders/$ROOT_ID"
echo "═══════════════════════════════════════════════════"

rm -f /tmp/mktc_drive_key.pem
