#!/bin/bash
# catalog_sfmc_fix.sh — Upload PNGs no SFMC (token enterprise) + PATCH covers Notion

TDIR="email-agent/templates"
TEMPLATES=(full-hero text-first side-image multi-block minimal announcement)
BUS=(finclass bruno-perini faculdade-hub thiago-nigro)

source email-agent/.env

# ── Token enterprise (sem account_id = acessa CB da conta pai) ────────────────
ENT_TOKEN=$(curl -s -X POST \
  "https://${SFMC_SUBDOMAIN}.auth.marketingcloudapis.com/v2/token" \
  -H "Content-Type: application/json" \
  -d "{\"grant_type\":\"client_credentials\",\"client_id\":\"${SFMC_CLIENT_ID}\",\"client_secret\":\"${SFMC_CLIENT_SECRET}\"}" \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

[ -z "$ENT_TOKEN" ] && echo "✗ Token enterprise falhou" && exit 1
echo "✓ Enterprise token OK"

NOTION_TOKEN="YOUR_NOTION_TOKEN_HERE"
NOTION_DB="31145b6a383080d5afdcf2957d0ecfbf"
TODAY=$(date +%Y-%m-%d)
IMG_CAT=273324

OK=0; FAIL=0; TOTAL=0

for BU in "${BUS[@]}"; do
  for TPL in "${TEMPLATES[@]}"; do
    # finclass × full-hero: já tem cover no Notion (sessão anterior)
    if [ "$BU" = "finclass" ] && [ "$TPL" = "full-hero" ]; then
      continue
    fi

    TOTAL=$((TOTAL+1))
    OUTPUT_PNG="$TDIR/$TPL/preview/${BU}.png"
    ASSET_NAME="catalog-preview-${BU}-${TPL}"
    echo ""
    echo "── [$TOTAL/23] $BU × $TPL"

    # ── SFMC upload ───────────────────────────────────────────────────────────
    PREVIEW_URL=""

    # finclass × text-first foi testado manualmente — aproveitar URL já criada
    if [ "$BU" = "finclass" ] && [ "$TPL" = "text-first" ]; then
      PREVIEW_URL="https://image.m.grupo-primo.com/lib/fe2611717d640479731d78/m/1/a68eed30-6f61-4468-95a0-d12de868c717.png"
      echo "  – URL já obtida no teste"
    elif [ -f "$OUTPUT_PNG" ]; then
      B64=$(base64 -w 0 "$OUTPUT_PNG")
      printf '{"name":"%s","assetType":{"name":"png","id":28},"file":"%s","category":{"id":%d}}' \
        "$ASSET_NAME" "$B64" "$IMG_CAT" > /tmp/sfmc_fix.json
      UPLOAD_RESP=$(curl -s -X POST \
        "https://${SFMC_SUBDOMAIN}.rest.marketingcloudapis.com/asset/v1/content/assets" \
        -H "Authorization: Bearer $ENT_TOKEN" \
        -H "Content-Type: application/json" \
        --data-binary @/tmp/sfmc_fix.json)
      PREVIEW_URL=$(echo "$UPLOAD_RESP" | grep -o '"publishedURL":"[^"]*"' | cut -d'"' -f4)
      rm -f /tmp/sfmc_fix.json
      if [ -n "$PREVIEW_URL" ]; then
        echo "  ✓ sfmc: ${PREVIEW_URL:0:70}..."
      else
        echo "  ⚠ sfmc falhou: $(echo "$UPLOAD_RESP" | head -c 250)"
      fi
    else
      echo "  ⚠ PNG não encontrado — pulando"
    fi

    # ── PATCH Notion page com cover ───────────────────────────────────────────
    if [ -n "$PREVIEW_URL" ]; then
      SEARCH_RESP=$(curl -s -X POST "https://api.notion.com/v1/databases/${NOTION_DB}/query" \
        -H "Authorization: Bearer $NOTION_TOKEN" \
        -H "Notion-Version: 2022-06-28" \
        -H "Content-Type: application/json" \
        -d "{\"filter\":{\"and\":[
              {\"property\":\"template_id\",\"rich_text\":{\"equals\":\"${TPL}\"}},
              {\"property\":\"bu\",\"select\":{\"equals\":\"${BU}\"}}
            ]}}")
      PAGE_ID=$(echo "$SEARCH_RESP" | grep -o '"id": *"[^"]*"' | head -1 | sed 's/"id": *"//;s/"//')

      if [ -n "$PAGE_ID" ]; then
        cat > /tmp/notion_patch.json << PATCH
{
  "cover": {"type":"external","external":{"url":"${PREVIEW_URL}"}},
  "properties": {
    "drive_link": { "url": "${PREVIEW_URL}" },
    "atualizado_em": { "date": { "start": "${TODAY}" } }
  }
}
PATCH
        PATCH_RESP=$(curl -s -X PATCH "https://api.notion.com/v1/pages/${PAGE_ID}" \
          -H "Authorization: Bearer $NOTION_TOKEN" \
          -H "Notion-Version: 2022-06-28" \
          -H "Content-Type: application/json" \
          --data-binary @/tmp/notion_patch.json)
        PATCH_ERR=$(echo "$PATCH_RESP" | grep -o '"message":"[^"]*"' | head -1)
        [ -n "$PATCH_ERR" ] && echo "  ⚠ notion: $PATCH_ERR" || echo "  ✓ cover atualizado"
        rm -f /tmp/notion_patch.json
        OK=$((OK+1))
      else
        echo "  ⚠ página Notion não encontrada para $BU × $TPL"
        FAIL=$((FAIL+1))
      fi
    else
      FAIL=$((FAIL+1))
    fi
  done
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Covers atualizados: $OK"
echo " Falhas:             $FAIL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
