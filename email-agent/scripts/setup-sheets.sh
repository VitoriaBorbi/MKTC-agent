#!/bin/bash
# email-agent/scripts/setup-sheets.sh
# Cria e configura o Google Sheets "MKTC Agent — Fila de Envios" com 3 abas:
#   Fila | Recorrentes | Histórico

set -euo pipefail

CREDS="email-agent/credentials/google-service-account.json"
CONFIG_OUT="email-agent/credentials/sheets-config.json"

b64url() { openssl base64 -e -A | tr '+/' '-_' | tr -d '='; }
log() { printf "  ▶ %s\n" "$*"; }
ok()  { printf "  ✓ %s\n" "$*"; }
die() { printf "  ✗ ERRO: %s\n" "$*" >&2; exit 1; }

echo ""
echo "═══════════════════════════════════════════════════"
echo "  MKTC Agent — Setup Google Sheets"
echo "═══════════════════════════════════════════════════"
echo ""

# ─── 1. Token OAuth2 (JWT Service Account flow) ───────────────────────────────
log "Autenticando com Google..."
[ -f "$CREDS" ] || die "Não encontrei: $CREDS"
CLIENT_EMAIL=$(grep -o '"client_email": *"[^"]*"' "$CREDS" | grep -o '"[^"]*@[^"]*"' | tr -d '"')
printf '%b' "$(grep -o '"private_key": *"[^"]*"' "$CREDS" | sed 's/.*"private_key": *"//;s/"$//')" > /tmp/mktc_key.pem

NOW=$(date +%s); EXP=$((NOW+3600))
H=$(echo -n '{"alg":"RS256","typ":"JWT"}' | b64url)
P=$(printf '{"iss":"%s","scope":"https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive","aud":"https://oauth2.googleapis.com/token","exp":%d,"iat":%d}' \
    "$CLIENT_EMAIL" "$EXP" "$NOW" | b64url)
S=$(echo -n "${H}.${P}" | openssl dgst -sha256 -sign /tmp/mktc_key.pem -binary \
    | openssl base64 -e -A | tr '+/' '-_' | tr -d '=')

TOK=$(curl -s -X POST "https://oauth2.googleapis.com/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${H}.${P}.${S}" \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
[ -n "$TOK" ] || die "Falha na autenticação. Verifique se Sheets API e Drive API estão habilitadas no projeto Google Cloud."
ok "Token OAuth2 obtido"

API="https://sheets.googleapis.com/v4/spreadsheets"
AUTH="Authorization: Bearer $TOK"
CT="Content-Type: application/json"

# ─── 2. Criar planilha com 3 abas ─────────────────────────────────────────────
log "Criando planilha..."
curl -s -X POST "$API" -H "$AUTH" -H "$CT" \
  --data-binary @- > /tmp/mktc_create_resp.json << 'ENDJSON'
{
  "properties": {"title": "MKTC Agent — Fila de Envios", "locale": "pt_BR"},
  "sheets": [
    {"properties": {"sheetId": 10, "title": "Fila",        "index": 0, "tabColorStyle": {"rgbColor": {"red": 0.082, "green": 0.396, "blue": 0.753}}}},
    {"properties": {"sheetId": 20, "title": "Recorrentes", "index": 1, "tabColorStyle": {"rgbColor": {"red": 0.18,  "green": 0.49,  "blue": 0.196}}}},
    {"properties": {"sheetId": 30, "title": "Histórico",   "index": 2, "tabColorStyle": {"rgbColor": {"red": 0.38,  "green": 0.38,  "blue": 0.38 }}}}
  ]
}
ENDJSON

SID=$(grep -o '"spreadsheetId":"[^"]*"' /tmp/mktc_create_resp.json | head -1 | cut -d'"' -f4)
[ -n "$SID" ] || die "Criar planilha falhou: $(cat /tmp/mktc_create_resp.json)"
ok "Planilha criada: $SID"

# Obter sheetIds reais (em ordem de aparição na resposta)
mapfile -t SIDS < <(grep -o '"sheetId":[0-9]*' /tmp/mktc_create_resp.json | grep -o '[0-9]*' | head -3)
F="${SIDS[0]:-10}"    # Fila
R="${SIDS[1]:-20}"    # Recorrentes
Hi="${SIDS[2]:-30}"   # Histórico
ok "SheetIDs → Fila:$F | Recorrentes:$R | Histórico:$Hi"

# ─── 3. batchUpdate: estrutura + formatação + validações + cores ──────────────
log "Aplicando formatação..."

cat > /tmp/mktc_batch.json << ENDJSON
{
  "requests": [

    // ── Freeze linha 1 nas 3 abas ──────────────────────────────────────────
    {"updateSheetProperties": {"properties": {"sheetId": $F,  "gridProperties": {"frozenRowCount": 1}}, "fields": "gridProperties.frozenRowCount"}},
    {"updateSheetProperties": {"properties": {"sheetId": $R,  "gridProperties": {"frozenRowCount": 1}}, "fields": "gridProperties.frozenRowCount"}},
    {"updateSheetProperties": {"properties": {"sheetId": $Hi, "gridProperties": {"frozenRowCount": 1}}, "fields": "gridProperties.frozenRowCount"}},

    // ── Largura das colunas — Fila (A–L) ─────────────────────────────────
    {"updateDimensionProperties": {"range": {"sheetId": $F, "dimension": "COLUMNS", "startIndex": 0,  "endIndex": 1},  "properties": {"pixelSize": 110}, "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $F, "dimension": "COLUMNS", "startIndex": 1,  "endIndex": 2},  "properties": {"pixelSize": 120}, "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $F, "dimension": "COLUMNS", "startIndex": 2,  "endIndex": 3},  "properties": {"pixelSize": 110}, "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $F, "dimension": "COLUMNS", "startIndex": 3,  "endIndex": 4},  "properties": {"pixelSize": 240}, "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $F, "dimension": "COLUMNS", "startIndex": 4,  "endIndex": 5},  "properties": {"pixelSize": 280}, "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $F, "dimension": "COLUMNS", "startIndex": 5,  "endIndex": 6},  "properties": {"pixelSize": 120}, "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $F, "dimension": "COLUMNS", "startIndex": 6,  "endIndex": 7},  "properties": {"pixelSize": 90},  "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $F, "dimension": "COLUMNS", "startIndex": 7,  "endIndex": 8},  "properties": {"pixelSize": 180}, "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $F, "dimension": "COLUMNS", "startIndex": 8,  "endIndex": 9},  "properties": {"pixelSize": 180}, "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $F, "dimension": "COLUMNS", "startIndex": 9,  "endIndex": 10}, "properties": {"pixelSize": 140}, "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $F, "dimension": "COLUMNS", "startIndex": 10, "endIndex": 11}, "properties": {"pixelSize": 140}, "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $F, "dimension": "COLUMNS", "startIndex": 11, "endIndex": 12}, "properties": {"pixelSize": 200}, "fields": "pixelSize"}},

    // ── Largura das colunas — Recorrentes (A–J) ───────────────────────────
    {"updateDimensionProperties": {"range": {"sheetId": $R, "dimension": "COLUMNS", "startIndex": 0, "endIndex": 1},  "properties": {"pixelSize": 80},  "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $R, "dimension": "COLUMNS", "startIndex": 1, "endIndex": 2},  "properties": {"pixelSize": 200}, "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $R, "dimension": "COLUMNS", "startIndex": 2, "endIndex": 3},  "properties": {"pixelSize": 120}, "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $R, "dimension": "COLUMNS", "startIndex": 3, "endIndex": 4},  "properties": {"pixelSize": 100}, "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $R, "dimension": "COLUMNS", "startIndex": 4, "endIndex": 5},  "properties": {"pixelSize": 90},  "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $R, "dimension": "COLUMNS", "startIndex": 5, "endIndex": 6},  "properties": {"pixelSize": 180}, "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $R, "dimension": "COLUMNS", "startIndex": 6, "endIndex": 7},  "properties": {"pixelSize": 180}, "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $R, "dimension": "COLUMNS", "startIndex": 7, "endIndex": 8},  "properties": {"pixelSize": 280}, "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $R, "dimension": "COLUMNS", "startIndex": 8, "endIndex": 9},  "properties": {"pixelSize": 220}, "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $R, "dimension": "COLUMNS", "startIndex": 9, "endIndex": 10}, "properties": {"pixelSize": 130}, "fields": "pixelSize"}},

    // ── Largura das colunas — Histórico (igual a Fila) ────────────────────
    {"updateDimensionProperties": {"range": {"sheetId": $Hi, "dimension": "COLUMNS", "startIndex": 0,  "endIndex": 1},  "properties": {"pixelSize": 110}, "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $Hi, "dimension": "COLUMNS", "startIndex": 1,  "endIndex": 2},  "properties": {"pixelSize": 120}, "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $Hi, "dimension": "COLUMNS", "startIndex": 2,  "endIndex": 3},  "properties": {"pixelSize": 110}, "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $Hi, "dimension": "COLUMNS", "startIndex": 3,  "endIndex": 4},  "properties": {"pixelSize": 240}, "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $Hi, "dimension": "COLUMNS", "startIndex": 4,  "endIndex": 5},  "properties": {"pixelSize": 280}, "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $Hi, "dimension": "COLUMNS", "startIndex": 5,  "endIndex": 6},  "properties": {"pixelSize": 120}, "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $Hi, "dimension": "COLUMNS", "startIndex": 6,  "endIndex": 7},  "properties": {"pixelSize": 90},  "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $Hi, "dimension": "COLUMNS", "startIndex": 7,  "endIndex": 8},  "properties": {"pixelSize": 180}, "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $Hi, "dimension": "COLUMNS", "startIndex": 8,  "endIndex": 9},  "properties": {"pixelSize": 180}, "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $Hi, "dimension": "COLUMNS", "startIndex": 9,  "endIndex": 10}, "properties": {"pixelSize": 140}, "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $Hi, "dimension": "COLUMNS", "startIndex": 10, "endIndex": 11}, "properties": {"pixelSize": 140}, "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $Hi, "dimension": "COLUMNS", "startIndex": 11, "endIndex": 12}, "properties": {"pixelSize": 200}, "fields": "pixelSize"}},

    // ── Altura da linha de cabeçalho (40px) nas 3 abas ────────────────────
    {"updateDimensionProperties": {"range": {"sheetId": $F,  "dimension": "ROWS", "startIndex": 0, "endIndex": 1}, "properties": {"pixelSize": 40}, "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $R,  "dimension": "ROWS", "startIndex": 0, "endIndex": 1}, "properties": {"pixelSize": 40}, "fields": "pixelSize"}},
    {"updateDimensionProperties": {"range": {"sheetId": $Hi, "dimension": "ROWS", "startIndex": 0, "endIndex": 1}, "properties": {"pixelSize": 40}, "fields": "pixelSize"}},

    // ── Cabeçalhos — Fila ─────────────────────────────────────────────────
    {
      "updateCells": {
        "range": {"sheetId": $F, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 0, "endColumnIndex": 12},
        "rows": [{
          "values": [
            {"userEnteredValue": {"stringValue": "status"},        "userEnteredFormat": {"backgroundColor": {"red": 0.118, "green": 0.227, "blue": 0.373}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "brand"},         "userEnteredFormat": {"backgroundColor": {"red": 0.118, "green": 0.227, "blue": 0.373}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "tipo"},          "userEnteredFormat": {"backgroundColor": {"red": 0.118, "green": 0.227, "blue": 0.373}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "nome"},          "userEnteredFormat": {"backgroundColor": {"red": 0.118, "green": 0.227, "blue": 0.373}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "docx_link"},     "userEnteredFormat": {"backgroundColor": {"red": 0.118, "green": 0.227, "blue": 0.373}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "data_envio"},    "userEnteredFormat": {"backgroundColor": {"red": 0.118, "green": 0.227, "blue": 0.373}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "horario"},       "userEnteredFormat": {"backgroundColor": {"red": 0.118, "green": 0.227, "blue": 0.373}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "de_envio"},      "userEnteredFormat": {"backgroundColor": {"red": 0.118, "green": 0.227, "blue": 0.373}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "de_exclusao"},   "userEnteredFormat": {"backgroundColor": {"red": 0.118, "green": 0.227, "blue": 0.373}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "sfmc_asset_id"}, "userEnteredFormat": {"backgroundColor": {"red": 0.22,  "green": 0.32,  "blue": 0.42 }, "textFormat": {"bold": true, "foregroundColor": {"red": 0.8, "green": 0.9, "blue": 1.0}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "sfmc_send_id"},  "userEnteredFormat": {"backgroundColor": {"red": 0.22,  "green": 0.32,  "blue": 0.42 }, "textFormat": {"bold": true, "foregroundColor": {"red": 0.8, "green": 0.9, "blue": 1.0}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "obs"},           "userEnteredFormat": {"backgroundColor": {"red": 0.118, "green": 0.227, "blue": 0.373}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}}
          ]
        }],
        "fields": "userEnteredValue,userEnteredFormat"
      }
    },

    // ── Cabeçalhos — Recorrentes ──────────────────────────────────────────
    {
      "updateCells": {
        "range": {"sheetId": $R, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 0, "endColumnIndex": 10},
        "rows": [{
          "values": [
            {"userEnteredValue": {"stringValue": "ativo"},               "userEnteredFormat": {"backgroundColor": {"red": 0.118, "green": 0.227, "blue": 0.373}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "nome_serie"},          "userEnteredFormat": {"backgroundColor": {"red": 0.118, "green": 0.227, "blue": 0.373}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "brand"},               "userEnteredFormat": {"backgroundColor": {"red": 0.118, "green": 0.227, "blue": 0.373}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "dias"},                "userEnteredFormat": {"backgroundColor": {"red": 0.118, "green": 0.227, "blue": 0.373}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "horario"},             "userEnteredFormat": {"backgroundColor": {"red": 0.118, "green": 0.227, "blue": 0.373}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "de_envio"},            "userEnteredFormat": {"backgroundColor": {"red": 0.118, "green": 0.227, "blue": 0.373}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "de_exclusao"},         "userEnteredFormat": {"backgroundColor": {"red": 0.118, "green": 0.227, "blue": 0.373}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "pasta_drive"},         "userEnteredFormat": {"backgroundColor": {"red": 0.118, "green": 0.227, "blue": 0.373}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "convencao_arquivo"},   "userEnteredFormat": {"backgroundColor": {"red": 0.118, "green": 0.227, "blue": 0.373}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "antecedencia_dias"},   "userEnteredFormat": {"backgroundColor": {"red": 0.118, "green": 0.227, "blue": 0.373}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}}
          ]
        }],
        "fields": "userEnteredValue,userEnteredFormat"
      }
    },

    // ── Cabeçalhos — Histórico (igual a Fila) ────────────────────────────
    {
      "updateCells": {
        "range": {"sheetId": $Hi, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 0, "endColumnIndex": 12},
        "rows": [{
          "values": [
            {"userEnteredValue": {"stringValue": "status"},        "userEnteredFormat": {"backgroundColor": {"red": 0.23, "green": 0.23, "blue": 0.23}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "brand"},         "userEnteredFormat": {"backgroundColor": {"red": 0.23, "green": 0.23, "blue": 0.23}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "tipo"},          "userEnteredFormat": {"backgroundColor": {"red": 0.23, "green": 0.23, "blue": 0.23}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "nome"},          "userEnteredFormat": {"backgroundColor": {"red": 0.23, "green": 0.23, "blue": 0.23}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "docx_link"},     "userEnteredFormat": {"backgroundColor": {"red": 0.23, "green": 0.23, "blue": 0.23}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "data_envio"},    "userEnteredFormat": {"backgroundColor": {"red": 0.23, "green": 0.23, "blue": 0.23}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "horario"},       "userEnteredFormat": {"backgroundColor": {"red": 0.23, "green": 0.23, "blue": 0.23}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "de_envio"},      "userEnteredFormat": {"backgroundColor": {"red": 0.23, "green": 0.23, "blue": 0.23}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "de_exclusao"},   "userEnteredFormat": {"backgroundColor": {"red": 0.23, "green": 0.23, "blue": 0.23}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "sfmc_asset_id"}, "userEnteredFormat": {"backgroundColor": {"red": 0.23, "green": 0.23, "blue": 0.23}, "textFormat": {"bold": true, "foregroundColor": {"red": 0.8, "green": 0.9, "blue": 1.0}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "sfmc_send_id"},  "userEnteredFormat": {"backgroundColor": {"red": 0.23, "green": 0.23, "blue": 0.23}, "textFormat": {"bold": true, "foregroundColor": {"red": 0.8, "green": 0.9, "blue": 1.0}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
            {"userEnteredValue": {"stringValue": "obs"},           "userEnteredFormat": {"backgroundColor": {"red": 0.23, "green": 0.23, "blue": 0.23}, "textFormat": {"bold": true, "foregroundColor": {"red": 1, "green": 1, "blue": 1}, "fontSize": 10}, "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}}
          ]
        }],
        "fields": "userEnteredValue,userEnteredFormat"
      }
    },

    // ── Data validation — Fila: status (A) ───────────────────────────────
    {
      "setDataValidation": {
        "range": {"sheetId": $F, "startRowIndex": 1, "endRowIndex": 1000, "startColumnIndex": 0, "endColumnIndex": 1},
        "rule": {
          "condition": {"type": "ONE_OF_LIST", "values": [
            {"userEnteredValue": "pendente"},
            {"userEnteredValue": "agendado"},
            {"userEnteredValue": "enviado"}
          ]},
          "showCustomUi": true, "strict": true
        }
      }
    },

    // ── Data validation — Fila: brand (B) ────────────────────────────────
    {
      "setDataValidation": {
        "range": {"sheetId": $F, "startRowIndex": 1, "endRowIndex": 1000, "startColumnIndex": 1, "endColumnIndex": 2},
        "rule": {
          "condition": {"type": "ONE_OF_LIST", "values": [
            {"userEnteredValue": "finclass"},
            {"userEnteredValue": "thiago-nigro"},
            {"userEnteredValue": "bruno-perini"},
            {"userEnteredValue": "faculdade-hub"}
          ]},
          "showCustomUi": true, "strict": true
        }
      }
    },

    // ── Data validation — Fila: tipo (C) ─────────────────────────────────
    {
      "setDataValidation": {
        "range": {"sheetId": $F, "startRowIndex": 1, "endRowIndex": 1000, "startColumnIndex": 2, "endColumnIndex": 3},
        "rule": {
          "condition": {"type": "ONE_OF_LIST", "values": [
            {"userEnteredValue": "individual"},
            {"userEnteredValue": "campanha"}
          ]},
          "showCustomUi": true, "strict": true
        }
      }
    },

    // ── Data validation — Recorrentes: ativo (A) ─────────────────────────
    {
      "setDataValidation": {
        "range": {"sheetId": $R, "startRowIndex": 1, "endRowIndex": 200, "startColumnIndex": 0, "endColumnIndex": 1},
        "rule": {
          "condition": {"type": "ONE_OF_LIST", "values": [
            {"userEnteredValue": "sim"},
            {"userEnteredValue": "não"}
          ]},
          "showCustomUi": true, "strict": true
        }
      }
    },

    // ── Data validation — Recorrentes: brand (C) ─────────────────────────
    {
      "setDataValidation": {
        "range": {"sheetId": $R, "startRowIndex": 1, "endRowIndex": 200, "startColumnIndex": 2, "endColumnIndex": 3},
        "rule": {
          "condition": {"type": "ONE_OF_LIST", "values": [
            {"userEnteredValue": "finclass"},
            {"userEnteredValue": "thiago-nigro"},
            {"userEnteredValue": "bruno-perini"},
            {"userEnteredValue": "faculdade-hub"}
          ]},
          "showCustomUi": true, "strict": true
        }
      }
    },

    // ── Formatação condicional — Fila col A: pendente (amarelo) ──────────
    {
      "addConditionalFormatRule": {
        "rule": {
          "ranges": [{"sheetId": $F, "startRowIndex": 1, "endRowIndex": 1000, "startColumnIndex": 0, "endColumnIndex": 1}],
          "booleanRule": {
            "condition": {"type": "TEXT_EQ", "values": [{"userEnteredValue": "pendente"}]},
            "format": {"backgroundColor": {"red": 1.0, "green": 0.976, "blue": 0.769}}
          }
        }, "index": 0
      }
    },

    // ── Formatação condicional — Fila col A: agendado (azul claro) ───────
    {
      "addConditionalFormatRule": {
        "rule": {
          "ranges": [{"sheetId": $F, "startRowIndex": 1, "endRowIndex": 1000, "startColumnIndex": 0, "endColumnIndex": 1}],
          "booleanRule": {
            "condition": {"type": "TEXT_EQ", "values": [{"userEnteredValue": "agendado"}]},
            "format": {"backgroundColor": {"red": 0.733, "green": 0.871, "blue": 0.984}}
          }
        }, "index": 1
      }
    },

    // ── Formatação condicional — Fila col A: enviado (verde) ─────────────
    {
      "addConditionalFormatRule": {
        "rule": {
          "ranges": [{"sheetId": $F, "startRowIndex": 1, "endRowIndex": 1000, "startColumnIndex": 0, "endColumnIndex": 1}],
          "booleanRule": {
            "condition": {"type": "TEXT_EQ", "values": [{"userEnteredValue": "enviado"}]},
            "format": {"backgroundColor": {"red": 0.784, "green": 0.902, "blue": 0.788}}
          }
        }, "index": 2
      }
    },

    // ── Formatação condicional — Histórico col A: pendente ────────────────
    {
      "addConditionalFormatRule": {
        "rule": {
          "ranges": [{"sheetId": $Hi, "startRowIndex": 1, "endRowIndex": 5000, "startColumnIndex": 0, "endColumnIndex": 1}],
          "booleanRule": {
            "condition": {"type": "TEXT_EQ", "values": [{"userEnteredValue": "pendente"}]},
            "format": {"backgroundColor": {"red": 1.0, "green": 0.976, "blue": 0.769}}
          }
        }, "index": 0
      }
    },

    // ── Formatação condicional — Histórico col A: agendado ────────────────
    {
      "addConditionalFormatRule": {
        "rule": {
          "ranges": [{"sheetId": $Hi, "startRowIndex": 1, "endRowIndex": 5000, "startColumnIndex": 0, "endColumnIndex": 1}],
          "booleanRule": {
            "condition": {"type": "TEXT_EQ", "values": [{"userEnteredValue": "agendado"}]},
            "format": {"backgroundColor": {"red": 0.733, "green": 0.871, "blue": 0.984}}
          }
        }, "index": 1
      }
    },

    // ── Formatação condicional — Histórico col A: enviado ─────────────────
    {
      "addConditionalFormatRule": {
        "rule": {
          "ranges": [{"sheetId": $Hi, "startRowIndex": 1, "endRowIndex": 5000, "startColumnIndex": 0, "endColumnIndex": 1}],
          "booleanRule": {
            "condition": {"type": "TEXT_EQ", "values": [{"userEnteredValue": "enviado"}]},
            "format": {"backgroundColor": {"red": 0.784, "green": 0.902, "blue": 0.788}}
          }
        }, "index": 2
      }
    }

  ]
}
ENDJSON

# Strip comment lines (// ...) que não são JSON válido
sed '/^[[:space:]]*\/\//d' /tmp/mktc_batch.json > /tmp/mktc_batch_clean.json
BATCH_RESP=$(curl -s -X POST "$API/$SID:batchUpdate" -H "$AUTH" -H "$CT" --data-binary @/tmp/mktc_batch_clean.json)

# Verificar erros
if echo "$BATCH_RESP" | grep -q '"error"'; then
  die "batchUpdate falhou: $BATCH_RESP"
fi
ok "Formatação aplicada"

# ─── 4. Salvar config ─────────────────────────────────────────────────────────
printf '{"spreadsheet_id":"%s","sheet_ids":{"fila":%s,"recorrentes":%s,"historico":%s},"url":"https://docs.google.com/spreadsheets/d/%s/edit"}\n' \
  "$SID" "$F" "$R" "$Hi" "$SID" > "$CONFIG_OUT"
ok "Config salva em: $CONFIG_OUT"

# ─── 5. Compartilhar com usuário (opcional — precisa de email) ────────────────
# Para compartilhar, você precisa dar permissão à service account no Drive, ou
# compartilhar manualmente no Google Sheets com o seu email.

echo ""
echo "═══════════════════════════════════════════════════"
echo "  PRONTO!"
echo "  Planilha: https://docs.google.com/spreadsheets/d/$SID/edit"
echo ""
echo "  IMPORTANTE: Compartilhe a planilha com seu email:"
echo "  Abra o link acima → Compartilhar → adicione seu email"
echo "═══════════════════════════════════════════════════"
echo ""

# Limpar arquivos temp
rm -f /tmp/mktc_key.pem /tmp/mktc_create_resp.json /tmp/mktc_batch.json /tmp/mktc_batch_clean.json
