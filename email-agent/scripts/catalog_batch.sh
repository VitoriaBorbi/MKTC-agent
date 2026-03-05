#!/bin/bash
# catalog_batch.sh — Screenshots + SFMC upload + Notion cards (23 combinações restantes)

TDIR="email-agent/templates"
TEMPLATES=(full-hero text-first side-image multi-block minimal announcement)
BUS=(finclass bruno-perini faculdade-hub thiago-nigro)

source email-agent/.env

# ── SFMC token (enterprise — SEM account_id; categoria 273324 só existe no enterprise) ──
SFMC_TOKEN=$(curl -s -X POST \
  "https://${SFMC_SUBDOMAIN}.auth.marketingcloudapis.com/v2/token" \
  -H "Content-Type: application/json" \
  -d "{\"grant_type\":\"client_credentials\",\"client_id\":\"${SFMC_CLIENT_ID}\",\"client_secret\":\"${SFMC_CLIENT_SECRET}\"}" \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$SFMC_TOKEN" ]; then
  echo "✗ SFMC token falhou — abortando"
  exit 1
fi
echo "✓ SFMC token OK"

# ── Notion ────────────────────────────────────────────────────────────────────
NOTION_TOKEN="YOUR_NOTION_TOKEN_HERE"
NOTION_DB="31145b6a383080d5afdcf2957d0ecfbf"
TODAY=$(date +%Y-%m-%d)
IMG_CAT=273324

# ── Edge ──────────────────────────────────────────────────────────────────────
MSEDGE=""
for P in "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
          "/c/Program Files/Microsoft/Edge/Application/msedge.exe"; do
  [ -f "$P" ] && MSEDGE="$P" && break
done
[ -n "$MSEDGE" ] && echo "✓ Edge: $MSEDGE" || echo "⚠ Edge não encontrado (screenshots desativados)"

OK=0; FAIL=0; SKIP=0; TOTAL=0

for BU in "${BUS[@]}"; do
  for TPL in "${TEMPLATES[@]}"; do
    # finclass × full-hero já foi feito
    if [ "$BU" = "finclass" ] && [ "$TPL" = "full-hero" ]; then
      SKIP=$((SKIP+1))
      continue
    fi

    TOTAL=$((TOTAL+1))
    PREVIEW_HTML="$TDIR/$TPL/preview/${BU}.html"
    OUTPUT_PNG="$TDIR/$TPL/preview/${BU}.png"

    echo ""
    echo "── [$TOTAL/23] $BU × $TPL"

    # ── Screenshot ────────────────────────────────────────────────────────────
    if [ -n "$MSEDGE" ] && [ -f "$PREVIEW_HTML" ]; then
      CWD=$(pwd)
      ABS_HTML="${CWD}/${PREVIEW_HTML}"
      WIN_HTML="C:${ABS_HTML#/c}"
      WIN_HTML="${WIN_HTML//\//\\}"
      ABS_PNG="${CWD}/${OUTPUT_PNG}"
      WIN_PNG="C:${ABS_PNG#/c}"
      WIN_PNG="${WIN_PNG//\//\\}"

      HEIGHT=1400
      [ "$TPL" = "multi-block" ] && HEIGHT=2000

      "$MSEDGE" --headless --disable-gpu --no-sandbox \
        --window-size=640,${HEIGHT} \
        --screenshot="$WIN_PNG" \
        "file:///$WIN_HTML" 2>/dev/null

      if [ -f "$OUTPUT_PNG" ]; then
        echo "  ✓ screenshot $(du -k "$OUTPUT_PNG" | cut -f1)KB"
      else
        echo "  ⚠ screenshot falhou"
      fi
    fi

    # ── SFMC upload ───────────────────────────────────────────────────────────
    PREVIEW_URL=""
    if [ -f "$OUTPUT_PNG" ]; then
      B64=$(base64 -w 0 "$OUTPUT_PNG")
      ASSET_NAME="catalog-preview-${BU}-${TPL}"

      printf '{"name":"%s","assetType":{"name":"png","id":28},"file":"%s","category":{"id":%d}}' \
        "$ASSET_NAME" "$B64" "$IMG_CAT" > /tmp/sfmc_upload.json

      UPLOAD_RESP=$(curl -s -X POST \
        "https://${SFMC_SUBDOMAIN}.rest.marketingcloudapis.com/asset/v1/content/assets" \
        -H "Authorization: Bearer $SFMC_TOKEN" \
        -H "Content-Type: application/json" \
        --data-binary @/tmp/sfmc_upload.json)

      PREVIEW_URL=$(echo "$UPLOAD_RESP" | grep -o '"publishedURL":"[^"]*"' | cut -d'"' -f4)
      rm -f /tmp/sfmc_upload.json

      if [ -n "$PREVIEW_URL" ]; then
        echo "  ✓ sfmc: ${PREVIEW_URL:0:70}..."
      else
        echo "  ⚠ sfmc falhou: $(echo "$UPLOAD_RESP" | head -c 200)"
      fi
    else
      echo "  – sem PNG, pulando upload SFMC"
    fi

    # ── Notion tags ───────────────────────────────────────────────────────────
    META="$TDIR/$TPL/meta.json"
    TPL_NAME=$(grep '"name"' "$META" | head -1 | sed 's/.*"name": *"//;s/".*//')
    TAGS_RAW=$(grep '"tags"' "$META" | sed 's/.*"tags": *\[//;s/\].*//' | tr ',' '\n' \
               | sed 's/[" ]//g' | tr -d '\r')
    TAGS_JSON="["
    FIRST_TAG=1
    while IFS= read -r tag; do
      [ -z "$tag" ] && continue
      [ $FIRST_TAG -eq 0 ] && TAGS_JSON+=","
      TAGS_JSON+="{\"name\":\"$tag\"}"
      FIRST_TAG=0
    done <<< "$TAGS_RAW"
    TAGS_JSON+="]"

    PAGE_NAME="${TPL_NAME} — ${BU}"

    # ── Notion: verificar se página já existe ─────────────────────────────────
    SEARCH_RESP=$(curl -s -X POST "https://api.notion.com/v1/databases/${NOTION_DB}/query" \
      -H "Authorization: Bearer $NOTION_TOKEN" \
      -H "Notion-Version: 2022-06-28" \
      -H "Content-Type: application/json" \
      -d "{\"filter\":{\"and\":[
            {\"property\":\"template_id\",\"rich_text\":{\"equals\":\"${TPL}\"}},
            {\"property\":\"bu\",\"select\":{\"equals\":\"${BU}\"}}
          ]}}")
    PAGE_ID=$(echo "$SEARCH_RESP" | grep -o '"id": *"[^"]*"' | head -1 | sed 's/"id": *"//;s/"//')

    # ── Notion: montar payload ────────────────────────────────────────────────
    if [ -n "$PREVIEW_URL" ]; then
      COVER_BLOCK="\"cover\":{\"type\":\"external\",\"external\":{\"url\":\"${PREVIEW_URL}\"}},"
      DRIVE_VAL="\"${PREVIEW_URL}\""
    else
      COVER_BLOCK=""
      DRIVE_VAL="null"
    fi

    cat > /tmp/notion_page.json << PAYLOAD
{
  "parent": { "database_id": "${NOTION_DB}" },
  ${COVER_BLOCK}
  "properties": {
    "Nome": { "title": [{ "text": { "content": "${PAGE_NAME}" } }] },
    "template_id": { "rich_text": [{ "text": { "content": "${TPL}" } }] },
    "bu": { "select": { "name": "${BU}" } },
    "tags": { "multi_select": ${TAGS_JSON} },
    "drive_link": { "url": ${DRIVE_VAL} },
    "atualizado_em": { "date": { "start": "${TODAY}" } }
  }
}
PAYLOAD

    # ── Notion: criar ou atualizar ────────────────────────────────────────────
    if [ -n "$PAGE_ID" ]; then
      NOTION_RESP=$(curl -s -X PATCH "https://api.notion.com/v1/pages/${PAGE_ID}" \
        -H "Authorization: Bearer $NOTION_TOKEN" \
        -H "Notion-Version: 2022-06-28" \
        -H "Content-Type: application/json" \
        --data-binary @/tmp/notion_page.json)
      NOTION_OBJ=$(echo "$NOTION_RESP" | grep -o '"object":"[^"]*"' | head -1)
      NOTION_ERR=$(echo "$NOTION_RESP" | grep -o '"message":"[^"]*"' | head -1)
      [ -n "$NOTION_ERR" ] && echo "  ⚠ notion patch: $NOTION_ERR" || echo "  ✓ notion atualizado (${PAGE_ID:0:8}...)"
    else
      NOTION_RESP=$(curl -s -X POST "https://api.notion.com/v1/pages" \
        -H "Authorization: Bearer $NOTION_TOKEN" \
        -H "Notion-Version: 2022-06-28" \
        -H "Content-Type: application/json" \
        --data-binary @/tmp/notion_page.json)
      NOTION_ERR=$(echo "$NOTION_RESP" | grep -o '"message":"[^"]*"' | head -1)
      [ -n "$NOTION_ERR" ] && echo "  ⚠ notion post: $NOTION_ERR" || echo "  ✓ notion criado"
    fi

    rm -f /tmp/notion_page.json
    OK=$((OK+1))
  done
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Processados: $OK"
echo " Pulados:     $SKIP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
