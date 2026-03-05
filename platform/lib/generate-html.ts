import { BU } from '@/types'
import { BRANDS } from './brands/config'

interface GenerateOptions {
  bu: BU
  nome: string
  assunto: string
  preheader: string
  copyText: string
  templateId: string
  imageUrls?: string[]
}

export function generateEmailHTML(opts: GenerateOptions): string {
  const { bu, nome, assunto, preheader, copyText, templateId, imageUrls = [] } = opts
  const brand = BRANDS[bu]
  const { primary, secondary, cta, footer_bg, footer_text } = brand.colors
  const logoUrl = brand.logo_url

  // Parse copy into paragraphs
  const paragraphs = copyText
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)

  // Detect CTA line (last paragraph if short and contains a verb)
  const ctaPatterns = /^(acesse|clique|saiba|confira|aproveite|garanta|baixe|inscreva|comece|compre|veja)/i
  let ctaText = 'Saiba mais'
  let bodyParagraphs = paragraphs

  const lastPara = paragraphs[paragraphs.length - 1]
  if (lastPara && lastPara.length < 80 && ctaPatterns.test(lastPara)) {
    ctaText = lastPara
    bodyParagraphs = paragraphs.slice(0, -1)
  }

  // Split headline from body
  const [headline, ...rest] = bodyParagraphs
  const bodyParas = rest

  const heroImage = imageUrls[0] || ''
  const hasHero = heroImage && (templateId === 'full-hero' || templateId === 'announcement')

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${assunto}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">

  <!-- Preheader (hidden) -->
  <div style="display:none;font-size:1px;color:#f4f4f4;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader || assunto}
  </div>

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;">
    <tr>
      <td align="center" style="padding:24px 16px;">

        <!-- Email container -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header / Logo -->
          <tr>
            <td align="center" style="background-color:${secondary};padding:28px 32px;">
              ${logoUrl
                ? `<img src="${logoUrl}" width="160" alt="${brand.name}" style="display:block;border:0;max-width:160px;" />`
                : `<p style="color:#ffffff;font-size:22px;font-weight:bold;margin:0;">${brand.name}</p>`
              }
            </td>
          </tr>

          ${hasHero ? `
          <!-- Hero image -->
          <tr>
            <td style="padding:0;line-height:0;">
              <img src="${heroImage}" width="600" alt="" style="display:block;width:100%;max-width:600px;border:0;" />
            </td>
          </tr>` : ''}

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">

              ${headline ? `
              <!-- Headline -->
              <h1 style="color:${secondary};font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:bold;line-height:1.3;margin:0 0 20px 0;">
                ${headline}
              </h1>` : ''}

              ${bodyParas.map(p => `
              <!-- Paragraph -->
              <p style="color:#444444;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.7;margin:0 0 16px 0;">
                ${p}
              </p>`).join('')}

              ${imageUrls.slice(hasHero ? 1 : 0).map(url => `
              <!-- Inline image -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;">
                <tr>
                  <td>
                    <img src="${url}" width="520" alt="" style="display:block;width:100%;max-width:520px;border-radius:4px;border:0;" />
                  </td>
                </tr>
              </table>`).join('')}

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
                <tr>
                  <td align="center" style="background-color:${cta};border-radius:6px;">
                    <a href="%%=v(@link_tag)=%%" style="display:inline-block;padding:14px 36px;color:${secondary};font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;text-decoration:none;border-radius:6px;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #eeeeee;margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:${footer_bg};padding:24px 40px;text-align:center;">
              <p style="color:${footer_text};font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;margin:0 0 8px 0;opacity:0.7;">
                ${brand.name} · Você está recebendo este email porque se cadastrou em nossa plataforma.
              </p>
              <p style="margin:0;">
                <a href="%%unsub_center_url%%" style="color:${primary};font-family:Arial,Helvetica,sans-serif;font-size:12px;text-decoration:underline;">
                  Descadastrar
                </a>
              </p>
            </td>
          </tr>

        </table>
        <!-- /Email container -->

      </td>
    </tr>
  </table>
  <!-- /Wrapper -->

</body>
</html>`
}
