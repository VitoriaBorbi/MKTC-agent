#!/bin/bash
# generate_previews.sh — Gera todos os preview HTML para o catálogo
# Uso: bash email-agent/scripts/generate_previews.sh [bu] [template_id]
# Sem args: gera todas as 24 combinações

TDIR="email-agent/templates"
BDIR="email-agent/brands"

BU_ARG="${1:-all}"
TPL_ARG="${2:-all}"

TEMPLATES=(full-hero text-first side-image multi-block minimal announcement)
BUS=(finclass bruno-perini faculdade-hub thiago-nigro)

# ─────── helpers ───────
# Extrai valor string de JSON (lida com aspas escapadas)
json_val() {
  local file="$1" key="$2"
  grep "\"${key}\"" "$file" | head -1 \
    | sed "s/.*\"${key}\": *\"//; s/\",\?[[:space:]]*$//" \
    | sed 's/\\"/"/g'
}

# Substitui placeholder no arquivo (usa | como delimitador)
sub() {
  local file="$1" key="$2" val="$3"
  # Escapa & e \ no valor (delimitador | não precisa escape)
  local esc
  esc=$(printf '%s' "$val" | sed 's/\\/\\\\/g; s/&/\\\&/g')
  sed -i "s|{{${key}}}|${esc}|g" "$file"
}

# Substitui FOOTER_BLOCK (multi-linha) via awk
sub_footer() {
  local file="$1" footer_file="$2"
  awk '
    /\{\{FOOTER_BLOCK\}\}/ {
      while ((getline line < "'"$footer_file"'") > 0) print line
      next
    }
    { print }
  ' "$file" > /tmp/pv_new.html && mv /tmp/pv_new.html "$file"
}

# Muda background do header logo (para logos brancas como Faculdade Hub)
set_header_bg() {
  local file="$1" bg="$2"
  awk -v bg="$bg" '
    /<!-- HEADER: Logo -->/ { in_h=1 }
    in_h && /background-color:#ffffff/ {
      gsub(/background-color:#ffffff/, "background-color:" bg)
      gsub(/bgcolor="#ffffff"/, "bgcolor=\"" bg "\"")
      in_h=0
    }
    { print }
  ' "$file" > /tmp/pv_hdr.html && mv /tmp/pv_hdr.html "$file"
}

# ─────── FOOTER blocks ───────

write_footer_finclass() {
cat > /tmp/footer_finclass.html << 'EOF'
  <!-- FOOTER: Redes sociais -->
  <table cellspacing="0" cellpadding="0" border="0" width="600" align="center" style="background-color:#FFFFFF;" bgcolor="#FFFFFF">
    <tr>
      <td align="center" style="padding:20px 30px 10px 30px;">
        <table cellspacing="0" cellpadding="0" border="0" align="center">
          <tr>
            <td style="padding:0 8px;"><a href="https://www.instagram.com/finclass_grupoprimo/" style="text-decoration:none;"><img src="https://image.mkt.finclass.com/lib/fe2811717d640478721277/m/1/a3e829ef-bf3f-4862-b6e4-0241fe9aa5e0.png" alt="Instagram" width="25" height="25" style="display:block;border:0;" border="0"/></a></td>
            <td style="padding:0 8px;"><a href="https://www.youtube.com/@Finclass" style="text-decoration:none;"><img src="https://image.mkt.finclass.com/lib/fe2811717d640478721277/m/1/b5c20e96-3fba-4250-a410-91c7f3b85553.png" alt="YouTube" width="25" height="25" style="display:block;border:0;" border="0"/></a></td>
            <td style="padding:0 8px;"><a href="https://www.linkedin.com/company/finclass/" style="text-decoration:none;"><img src="https://image.mkt.finclass.com/lib/fe2811717d640478721277/m/1/721e1e52-8ba6-4ab1-93c5-2081c39f1e97.png" alt="LinkedIn" width="25" height="25" style="display:block;border:0;" border="0"/></a></td>
            <td style="padding:0 8px;"><a href="https://www.tiktok.com/@finclass_br" style="text-decoration:none;"><img src="https://image.mkt.finclass.com/lib/fe2811717d640478721277/m/1/dfc57152-cb95-4e55-b0dd-5536373b373f.png" alt="TikTok" width="25" height="25" style="display:block;border:0;" border="0"/></a></td>
          </tr>
        </table>
        <table cellpadding="0" cellspacing="0" border="0" width="200" align="center" style="margin-top:12px;"><tr><td style="border-bottom:1px solid #9ba7e0;font-size:1px;line-height:1px;">&nbsp;</td></tr></table>
      </td>
    </tr>
  </table>
  <table cellspacing="0" cellpadding="0" border="0" width="600" align="center" style="background-color:#FFFFFF;" bgcolor="#FFFFFF">
    <tr><td align="center" style="padding:8px 30px;"><span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#cacaca;"><a href="%%=CloudPagesURL(35,'email',emailaddr,'jobID',jobid,'emailName',emailname_)=%%" style="color:#cacaca;text-decoration:none;">Cancelar e-mails</a></span></td></tr>
  </table>
  <table cellspacing="0" cellpadding="0" border="0" width="600" align="center" style="background-color:#FFFFFF;" bgcolor="#FFFFFF">
    <tr><td align="center" style="padding:8px 30px 20px 30px;"><span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#4c4c4c;line-height:1.5;"><strong>%%Member_Busname%%</strong><br/>%%Member_Addr%% %%Member_City%%, %%Member_State%%, %%Member_PostalCode%%, %%Member_Country%%</span></td></tr>
  </table>
  <a href="%%profile_center_url%%" alias="Update Profile" style="display:none;">Update Profile</a>
EOF
}

write_footer_bruno_perini() {
cat > /tmp/footer_bruno-perini.html << 'EOF'
  <!-- FOOTER: Redes sociais -->
  <table cellspacing="0" cellpadding="0" border="0" width="600" align="center" style="background-color:#0f1014;" bgcolor="#0f1014">
    <tr>
      <td align="center" style="padding:20px 30px 10px 30px;">
        <table cellspacing="0" cellpadding="0" border="0" align="center">
          <tr>
            <td style="padding:0 8px;"><a href="https://www.instagram.com/bruno_perini/" style="text-decoration:none;"><img src="https://image.mail.vocemaisrico.com/lib/fe3111717d64047b771775/m/1/a7134293-755e-4dcd-b2dd-19273f863232.png" alt="Instagram" width="25" height="25" style="display:block;border:0;" border="0"/></a></td>
            <td style="padding:0 8px;"><a href="https://twitter.com/perinibruno" style="text-decoration:none;"><img src="https://image.mail.vocemaisrico.com/lib/fe3111717d64047b771775/m/1/648b810f-2754-483f-a14e-073c1973773f.png" alt="Twitter" width="25" height="25" style="display:block;border:0;" border="0"/></a></td>
            <td style="padding:0 8px;"><a href="https://www.youtube.com/channel/UCCE-jo1GvBJqyj1b287h7jA" style="text-decoration:none;"><img src="https://image.mail.vocemaisrico.com/lib/fe3111717d64047b771775/m/1/b5d47e22-8f9b-4ba7-b608-586ccca413e5.png" alt="YouTube" width="25" height="25" style="display:block;border:0;" border="0"/></a></td>
            <td style="padding:0 8px;"><a href="https://sp.cursoviverderenda.com/" style="text-decoration:none;"><img src="https://image.mail.vocemaisrico.com/lib/fe3111717d64047b771775/m/1/4f774713-1485-4e1c-bde5-97233051fe52.png" alt="Site" width="25" height="25" style="display:block;border:0;" border="0"/></a></td>
          </tr>
        </table>
        <table cellpadding="0" cellspacing="0" border="0" width="200" align="center" style="margin-top:12px;"><tr><td style="border-bottom:1px solid #9dcc0a;font-size:1px;line-height:1px;">&nbsp;</td></tr></table>
      </td>
    </tr>
  </table>
  <table cellspacing="0" cellpadding="0" border="0" width="600" align="center" style="background-color:#0f1014;" bgcolor="#0f1014">
    <tr><td align="center" style="padding:8px 30px;"><span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#D5D5D5;"><a href="https://sp.cursoviverderenda.com/paradigma/privacy.html" style="color:#D5D5D5;text-decoration:none;">Política de privacidade</a>&nbsp;&bull;&nbsp;<a href="%%=CloudPagesURL(905,'email',emailaddr,'jobID',jobid,'emailName',emailname_)=%%" style="color:#D5D5D5;text-decoration:none;">Cancelar e-mails</a></span></td></tr>
  </table>
  <table cellspacing="0" cellpadding="0" border="0" width="600" align="center" style="background-color:#0f1014;" bgcolor="#0f1014">
    <tr><td align="center" style="padding:8px 30px 20px 30px;"><span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#818181;line-height:1.5;"><strong>%%Member_Busname%%</strong><br/>%%Member_Addr%% %%Member_City%%, %%Member_State%%, %%Member_PostalCode%%, %%Member_Country%%</span></td></tr>
  </table>
  <a href="%%profile_center_url%%" alias="Update Profile" style="display:none;">Update Profile</a>
EOF
}

write_footer_faculdade_hub() {
cat > /tmp/footer_faculdade-hub.html << 'EOF'
  <!-- FOOTER: Redes sociais -->
  <table cellspacing="0" cellpadding="0" border="0" width="600" align="center" style="background-color:#0f1014;" bgcolor="#0f1014">
    <tr>
      <td align="center" style="padding:20px 30px 10px 30px;">
        <table cellspacing="0" cellpadding="0" border="0" align="center">
          <tr>
            <td style="padding:0 8px;"><a href="https://www.linkedin.com/school/faculdadehub/" style="text-decoration:none;"><img src="https://image.mba.grupo-primo.com/lib/fe2811717d640478721079/m/1/8757d30d-95e7-4e18-90f7-3aa6a291f8c7.png" alt="LinkedIn" width="25" height="25" style="display:block;border:0;" border="0"/></a></td>
            <td style="padding:0 8px;"><a href="https://www.instagram.com/faculdadehub/" style="text-decoration:none;"><img src="https://image.mba.grupo-primo.com/lib/fe2811717d640478721079/m/1/840a5d53-33a4-4ae3-aab3-340e416a7c4a.png" alt="Instagram" width="25" height="25" style="display:block;border:0;" border="0"/></a></td>
            <td style="padding:0 8px;"><a href="https://faculdadehub.com.br/" style="text-decoration:none;"><img src="https://image.mba.grupo-primo.com/lib/fe2811717d640478721079/m/1/f69c22d4-6a07-4a10-a925-ee0eb71f89e4.png" alt="Site" width="25" height="25" style="display:block;border:0;" border="0"/></a></td>
          </tr>
        </table>
        <table cellpadding="0" cellspacing="0" border="0" width="200" align="center" style="margin-top:12px;"><tr><td style="border-bottom:1px solid #dfe1d9;font-size:1px;line-height:1px;">&nbsp;</td></tr></table>
      </td>
    </tr>
  </table>
  <table cellspacing="0" cellpadding="0" border="0" width="600" align="center" style="background-color:#0f1014;" bgcolor="#0f1014">
    <tr><td align="center" style="padding:8px 30px;"><span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#D5D5D5;"><a href="https://sp.oprimorico.com.br/privacy.html" style="color:#D5D5D5;text-decoration:none;">Política de privacidade</a>&nbsp;&bull;&nbsp;<a href="%%=CloudPagesURL(31,'email',emailaddr,'jobID',jobid,'emailName',emailname_)=%%" style="color:#D5D5D5;text-decoration:none;">Cancelar e-mails</a></span></td></tr>
  </table>
  <table cellspacing="0" cellpadding="0" border="0" width="600" align="center" style="background-color:#0f1014;" bgcolor="#0f1014">
    <tr><td align="center" style="padding:8px 30px 20px 30px;"><span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#818181;line-height:1.5;"><strong>%%Member_Busname%%</strong><br/>%%Member_Addr%% %%Member_City%%, %%Member_State%%, %%Member_PostalCode%%, %%Member_Country%%</span></td></tr>
  </table>
  <a href="%%profile_center_url%%" alias="Update Profile" style="display:none;">Update Profile</a>
EOF
}

write_footer_thiago_nigro() {
cat > /tmp/footer_thiago-nigro.html << 'EOF'
  <!-- FOOTER: Redes sociais -->
  <table cellspacing="0" cellpadding="0" border="0" width="600" align="center" style="background-color:#ebebeb;" bgcolor="#ebebeb">
    <tr>
      <td align="center" style="padding:20px 30px 10px 30px;">
        <table cellspacing="0" cellpadding="0" border="0" align="center">
          <tr>
            <td style="padding:0 8px;"><a href="https://www.instagram.com/thiago.nigro/" style="text-decoration:none;"><img src="https://image.mail.oprimorico.com.br/lib/fe3011717d64047b771776/m/1/90a8eec3-ff07-4e0c-9b49-716cdf4c570e.png" alt="Instagram" width="25" height="25" style="display:block;border:0;" border="0"/></a></td>
            <td style="padding:0 8px;"><a href="https://www.youtube.com/@OPrimoRico" style="text-decoration:none;"><img src="https://image.mail.oprimorico.com.br/lib/fe3011717d64047b771776/m/1/a359d9da-f002-4536-9258-2c0d6c53fae5.png" alt="YouTube" width="25" height="25" style="display:block;border:0;" border="0"/></a></td>
            <td style="padding:0 8px;"><a href="https://www.facebook.com/oprimorico" style="text-decoration:none;"><img src="https://image.mail.oprimorico.com.br/lib/fe3011717d64047b771776/m/1/be2be1c3-9ee8-42d4-9374-23d9ba5d0298.png" alt="Facebook" width="25" height="25" style="display:block;border:0;" border="0"/></a></td>
          </tr>
        </table>
        <table cellpadding="0" cellspacing="0" border="0" width="200" align="center" style="margin-top:12px;"><tr><td style="border-bottom:1px solid #E5E7EB;font-size:1px;line-height:1px;">&nbsp;</td></tr></table>
      </td>
    </tr>
  </table>
  <table cellspacing="0" cellpadding="0" border="0" width="600" align="center" style="background-color:#ebebeb;" bgcolor="#ebebeb">
    <tr><td align="center" style="padding:8px 30px;"><span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#808080;"><a href="https://sp.oprimorico.com.br/privacy.html" style="color:#808080;text-decoration:none;">Política de privacidade</a>&nbsp;&bull;&nbsp;<a href="%%=RedirectTo(CloudPagesURL(135,'email',emailaddr,'jobID',jobid,'emailName',emailname_))=%%" style="color:#808080;text-decoration:none;">Cancelar e-mails</a></span></td></tr>
  </table>
  <table cellspacing="0" cellpadding="0" border="0" width="600" align="center" style="background-color:#ebebeb;" bgcolor="#ebebeb">
    <tr><td align="center" style="padding:8px 30px 20px 30px;"><span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#808080;line-height:1.5;"><strong>%%Member_Busname%%</strong><br/>%%Member_Addr%% %%Member_City%%, %%Member_State%%, %%Member_PostalCode%%, %%Member_Country%%</span></td></tr>
  </table>
  <a href="%%profile_center_url%%" alias="Update Profile" style="display:none;">Update Profile</a>
EOF
}

# ─────── BRAND identity ───────
setup_brand() {
  local bu="$1"
  case "$bu" in
    finclass)
      LOGO_BG="#ffffff"; COLOR_BG="#FFFFFF"; COLOR_TEXT="#000000"; COLOR_TEXT_LIGHT="#555555"
      COLOR_PRIMARY="#00e7f9"; COLOR_SECONDARY="#0a0e27"; COLOR_HR="#01bbe9"
      COLOR_CTA_BG="#00e7f9"; COLOR_CTA_TEXT="#000000"
      FONT_HEADING="Arial, Helvetica, sans-serif"; FONT_BODY="Arial, Helvetica, sans-serif"
      LOGO_URL="https://image.mkt.finclass.com/lib/fe2811717d640478721277/m/1/c6b407e1-8e55-4b00-abd8-19f20df026dc.png"
      LOGO_ALT="Finclass"; LOGO_WIDTH="180"
      write_footer_finclass; FOOTER_FILE="/tmp/footer_finclass.html"
      ;;
    bruno-perini)
      LOGO_BG="#ffffff"; COLOR_BG="#FFFFFF"; COLOR_TEXT="#000000"; COLOR_TEXT_LIGHT="#555555"
      COLOR_PRIMARY="#b2ec05"; COLOR_SECONDARY="#0f1014"; COLOR_HR="#b2ec05"
      COLOR_CTA_BG="#b2ec05"; COLOR_CTA_TEXT="#000000"
      FONT_HEADING="Arial, Helvetica, sans-serif"; FONT_BODY="Arial, Helvetica, sans-serif"
      LOGO_URL="https://image.mail.vocemaisrico.com/lib/fe3111717d64047b771775/m/1/813699e2-15be-49d3-943e-705a97294c2c.png"
      LOGO_ALT="Bruno Perini"; LOGO_WIDTH="150"
      write_footer_bruno_perini; FOOTER_FILE="/tmp/footer_bruno-perini.html"
      ;;
    faculdade-hub)
      LOGO_BG="#0f1014"; COLOR_BG="#FFFFFF"; COLOR_TEXT="#000000"; COLOR_TEXT_LIGHT="#555555"
      COLOR_PRIMARY="#000000"; COLOR_SECONDARY="#FFFFFF"; COLOR_HR="#000000"
      COLOR_CTA_BG="#000000"; COLOR_CTA_TEXT="#FFFFFF"
      FONT_HEADING="Arial, Helvetica, sans-serif"; FONT_BODY="Arial, Helvetica, sans-serif"
      LOGO_URL="https://image.mba.grupo-primo.com/lib/fe2811717d640478721079/m/1/4127a0f5-8fef-456f-b13e-760099d30ccc.png"
      LOGO_ALT="Faculdade Hub"; LOGO_WIDTH="150"
      write_footer_faculdade_hub; FOOTER_FILE="/tmp/footer_faculdade-hub.html"
      ;;
    thiago-nigro)
      LOGO_BG="#ffffff"; COLOR_BG="#FFFFFF"; COLOR_TEXT="#000000"; COLOR_TEXT_LIGHT="#555555"
      COLOR_PRIMARY="#ff4900"; COLOR_SECONDARY="#ff9500"; COLOR_HR="#ff4900"
      COLOR_CTA_BG="#ff4900"; COLOR_CTA_TEXT="#FFFFFF"
      FONT_HEADING="Arial, Helvetica, sans-serif"; FONT_BODY="Arial, Helvetica, sans-serif"
      LOGO_URL="https://image.mail.oprimorico.com.br/lib/fe3011717d64047b771776/m/1/9475f340-442b-4e35-9f2b-17fa10f7d0e4.png"
      LOGO_ALT="O Primo Rico"; LOGO_WIDTH="180"
      write_footer_thiago_nigro; FOOTER_FILE="/tmp/footer_thiago-nigro.html"
      ;;
  esac
}

# ─────── CONTENT per template ───────
setup_content() {
  local tpl="$1"
  local sfile="$TDIR/$tpl/sample-content.json"
  EMAIL_SUBJECT=$(json_val "$sfile" "EMAIL_SUBJECT")
  HEADLINE=$(json_val "$sfile" "HEADLINE")
  BODY_COPY=$(json_val "$sfile" "BODY_COPY")
  CTA_TEXT=$(json_val "$sfile" "CTA_TEXT")
  CTA_URL=$(json_val "$sfile" "CTA_URL")
  HERO_IMAGE_URL=$(json_val "$sfile" "HERO_IMAGE_URL")
  HERO_IMAGE_ALT=$(json_val "$sfile" "HERO_IMAGE_ALT")
  SIDE_IMAGE_URL=$(json_val "$sfile" "SIDE_IMAGE_URL")
  SIDE_IMAGE_ALT=$(json_val "$sfile" "SIDE_IMAGE_ALT")
  SECTION_1_TITLE=$(json_val "$sfile" "SECTION_1_TITLE")
  SECTION_1_BODY=$(json_val "$sfile" "SECTION_1_BODY")
  SECTION_2_TITLE=$(json_val "$sfile" "SECTION_2_TITLE")
  SECTION_2_BODY=$(json_val "$sfile" "SECTION_2_BODY")
  SECTION_3_TITLE=$(json_val "$sfile" "SECTION_3_TITLE")
  SECTION_3_BODY=$(json_val "$sfile" "SECTION_3_BODY")
  ANNOUNCEMENT_BADGE=$(json_val "$sfile" "ANNOUNCEMENT_BADGE")
  ANNOUNCEMENT_DATE=$(json_val "$sfile" "ANNOUNCEMENT_DATE")
}

# ─────── MAIN LOOP ───────
OK=0; FAIL=0; SKIP=0

for BU in "${BUS[@]}"; do
  [ "$BU_ARG" != "all" ] && [ "$BU" != "$BU_ARG" ] && continue
  setup_brand "$BU"

  for TPL in "${TEMPLATES[@]}"; do
    [ "$TPL_ARG" != "all" ] && [ "$TPL" != "$TPL_ARG" ] && continue

    # finclass × full-hero já foi gerado manualmente
    if [ "$BU" = "finclass" ] && [ "$TPL" = "full-hero" ]; then
      echo "⏭  Pulando finclass × full-hero (já gerado)"
      SKIP=$((SKIP+1))
      continue
    fi

    OUTDIR="$TDIR/$TPL/preview"
    mkdir -p "$OUTDIR"
    OUTFILE="$OUTDIR/${BU}.html"
    BASE="$TDIR/$TPL/base.html"

    cp "$BASE" "$OUTFILE"

    # ── identidade ──
    sub "$OUTFILE" "COLOR_BG"         "$COLOR_BG"
    sub "$OUTFILE" "COLOR_TEXT"       "$COLOR_TEXT"
    sub "$OUTFILE" "COLOR_TEXT_LIGHT" "$COLOR_TEXT_LIGHT"
    sub "$OUTFILE" "COLOR_PRIMARY"    "$COLOR_PRIMARY"
    sub "$OUTFILE" "COLOR_SECONDARY"  "$COLOR_SECONDARY"
    sub "$OUTFILE" "COLOR_HR"         "$COLOR_HR"
    sub "$OUTFILE" "COLOR_CTA_BG"     "$COLOR_CTA_BG"
    sub "$OUTFILE" "COLOR_CTA_TEXT"   "$COLOR_CTA_TEXT"
    sub "$OUTFILE" "FONT_HEADING"     "$FONT_HEADING"
    sub "$OUTFILE" "FONT_BODY"        "$FONT_BODY"
    sub "$OUTFILE" "LOGO_URL"         "$LOGO_URL"
    sub "$OUTFILE" "LOGO_ALT"         "$LOGO_ALT"
    sub "$OUTFILE" "LOGO_WIDTH"       "$LOGO_WIDTH"

    # header bg especial (ex: Faculdade Hub logo branca)
    [ "$LOGO_BG" != "#ffffff" ] && set_header_bg "$OUTFILE" "$LOGO_BG"

    # ── footer ──
    sub_footer "$OUTFILE" "$FOOTER_FILE"

    # ── conteúdo ──
    setup_content "$TPL"
    sub "$OUTFILE" "EMAIL_SUBJECT"      "$EMAIL_SUBJECT"
    sub "$OUTFILE" "HEADLINE"           "$HEADLINE"
    sub "$OUTFILE" "BODY_COPY"          "$BODY_COPY"
    sub "$OUTFILE" "CTA_TEXT"           "$CTA_TEXT"
    sub "$OUTFILE" "CTA_URL"            "$CTA_URL"
    sub "$OUTFILE" "HERO_IMAGE_URL"     "$HERO_IMAGE_URL"
    sub "$OUTFILE" "HERO_IMAGE_ALT"     "$HERO_IMAGE_ALT"
    sub "$OUTFILE" "SIDE_IMAGE_URL"     "$SIDE_IMAGE_URL"
    sub "$OUTFILE" "SIDE_IMAGE_ALT"     "$SIDE_IMAGE_ALT"
    sub "$OUTFILE" "SECTION_1_TITLE"    "$SECTION_1_TITLE"
    sub "$OUTFILE" "SECTION_1_BODY"     "$SECTION_1_BODY"
    sub "$OUTFILE" "SECTION_2_TITLE"    "$SECTION_2_TITLE"
    sub "$OUTFILE" "SECTION_2_BODY"     "$SECTION_2_BODY"
    sub "$OUTFILE" "SECTION_3_TITLE"    "$SECTION_3_TITLE"
    sub "$OUTFILE" "SECTION_3_BODY"     "$SECTION_3_BODY"
    sub "$OUTFILE" "ANNOUNCEMENT_BADGE" "$ANNOUNCEMENT_BADGE"
    sub "$OUTFILE" "ANNOUNCEMENT_DATE"  "$ANNOUNCEMENT_DATE"

    echo "✓ ${BU} × ${TPL}"
    OK=$((OK+1))
  done
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " HTMLs gerados:  $OK"
echo " Pulados:        $SKIP"
echo " Erros:          $FAIL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
