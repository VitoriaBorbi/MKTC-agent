import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface Brand {
  name: string
  primary: string
  secondary: string
  cta: string
  cta_text: string
  logo: string
  email_bg: string
  footer_text: string
}

const BRANDS: Record<string, Brand> = {
  finclass: {
    name: 'Finclass', primary: '#00e7f9', secondary: '#0a0e27',
    cta: '#00e7f9', cta_text: '#000000',
    logo: 'https://image.mkt.finclass.com/lib/fe2811717d640478721277/m/1/c6b407e1-8e55-4b00-abd8-19f20df026dc.png',
    email_bg: '#f4f4f5',
    footer_text: 'Finclass — Grupo Primo · São Paulo, SP',
  },
  'bruno-perini': {
    name: 'Bruno Perini', primary: '#b2ec05', secondary: '#0f1014',
    cta: '#b2ec05', cta_text: '#000000',
    logo: 'https://image.mail.vocemaisrico.com/lib/fe3111717d64047b771775/m/1/813699e2-15be-49d3-943e-705a97294c2c.png',
    email_bg: '#f4f4f5',
    footer_text: 'Bruno Perini — Você Mais Rico · São Paulo, SP',
  },
  'faculdade-hub': {
    name: 'Faculdade Hub', primary: '#6366f1', secondary: '#0f1014',
    cta: '#6366f1', cta_text: '#ffffff',
    logo: 'https://image.mba.grupo-primo.com/lib/fe2811717d640478721079/m/1/4127a0f5-8fef-456f-b13e-760099d30ccc.png',
    email_bg: '#f4f4f5',
    footer_text: 'Faculdade Hub — Grupo Primo · São Paulo, SP',
  },
  'thiago-nigro': {
    name: 'Thiago Nigro', primary: '#ff4900', secondary: '#0f172a',
    cta: '#ff4900', cta_text: '#ffffff',
    logo: 'https://image.mail.oprimorico.com.br/lib/fe3011717d64047b771776/m/1/9475f340-442b-4e35-9f2b-17fa10f7d0e4.png',
    email_bg: '#f4f4f5',
    footer_text: 'Thiago Nigro — O Primo Rico · São Paulo, SP',
  },
  portfel: {
    name: 'Portfel', primary: '#F05A28', secondary: '#1A1A1A',
    cta: '#F05A28', cta_text: '#ffffff', logo: '',
    email_bg: '#f4f4f5',
    footer_text: 'Portfel · São Paulo, SP',
  },
  grao: {
    name: 'Grão', primary: '#f59e0b', secondary: '#2d1b00',
    cta: '#f59e0b', cta_text: '#000000', logo: '',
    email_bg: '#f4f4f5',
    footer_text: 'Grão · São Paulo, SP',
  },
}

const TEMPLATE_HINTS: Record<string, string> = {
  'full-hero':    'Imagem hero full-width no topo, headline grande, CTA único e bem destacado.',
  'text-first':   'Hierarquia tipográfica forte. Copy longa, mínimo de imagens, CTA no final.',
  'side-image':   'Imagem à esquerda (ou direita), copy ao lado. Grid 2 colunas no topo.',
  'multi-block':  'Múltiplos blocos de conteúdo com separadores visuais entre eles.',
  'minimal':      'Muito espaço em branco, tipografia limpa, uma única mensagem central.',
  'announcement': 'Borda colorida no topo (4px), conteúdo centralizado, tom de urgência/destaque.',
}

function stripMarkdown(text: string): string {
  let result = text.trim()
  // Remove opening ```html or ```
  result = result.replace(/^```(?:html)?\s*\n?/i, '')
  // Remove closing ```
  result = result.replace(/\n?```\s*$/m, '')
  result = result.trim()
  // Ensure it starts at <!DOCTYPE (discard any preamble text)
  const idx = result.toLowerCase().indexOf('<!doctype')
  if (idx > 0) result = result.slice(idx)
  return result
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      bu = 'finclass', copyText = '', assunto = '', preheader = '', templateId = 'full-hero',
      sfmcUrl = '', emailNome = '', refImageB64 = '', imageUrls = [] as string[],
    } = body

    const brand = BRANDS[bu] || BRANDS.finclass

    const headerHtml = brand.logo
      ? `<table width="600" cellpadding="0" cellspacing="0" border="0" align="center" style="max-width:600px;">
  <tr>
    <td align="center" style="background-color:${brand.secondary}; padding:20px 30px;">
      <img src="${brand.logo}" alt="${brand.name}" width="160" height="auto" style="display:block; border:0;">
    </td>
  </tr>
  <tr>
    <td style="background-color:${brand.primary}; height:3px; font-size:0; line-height:0; mso-line-height-rule:exactly;">&nbsp;</td>
  </tr>
</table>`
      : `<table width="600" cellpadding="0" cellspacing="0" border="0" align="center" style="max-width:600px;">
  <tr>
    <td align="center" style="background-color:${brand.secondary}; padding:20px 30px;">
      <span style="font-family:Arial,sans-serif; font-size:20px; font-weight:bold; color:${brand.primary};">${brand.name}</span>
    </td>
  </tr>
  <tr>
    <td style="background-color:${brand.primary}; height:3px; font-size:0; line-height:0;">&nbsp;</td>
  </tr>
</table>`

    const footerHtml = `<table width="600" cellpadding="0" cellspacing="0" border="0" align="center" style="max-width:600px;">
  <tr>
    <td style="background-color:${brand.secondary}; padding:30px 24px; text-align:center; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#888888; line-height:1.6;">
      <p style="margin:0 0 8px 0;">${brand.footer_text}</p>
      <p style="margin:0;">Você recebeu este email porque está na nossa lista. &nbsp;|&nbsp; <a href="%%unsub_center_url%%" style="color:${brand.primary}; text-decoration:none;">Cancelar inscrição</a></p>
    </td>
  </tr>
</table>`

    const system = `Você é um especialista em email marketing HTML para a marca ${brand.name}. Seu objetivo é gerar emails visualmente sofisticados, fiéis à identidade da marca, prontos para produção em SFMC.

IDENTIDADE DA MARCA:
- Nome: ${brand.name}
- Cor primária (destaques, links, borda): ${brand.primary}
- Fundo escuro (header e footer): ${brand.secondary}
- Cor do botão CTA: ${brand.cta} · Texto do CTA: ${brand.cta_text}
- Fundo geral do email: ${brand.email_bg}

ESTRUTURA OBRIGATÓRIA — nesta ordem exata:

1. DOCTYPE e <html> com atributos xmlns
2. <head> com meta charset, meta viewport, title
3. <body> (background: ${brand.email_bg}) com:
   a. PREHEADER OCULTO: <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#ffffff;line-height:1px;">TEXTO_PREHEADER</div>
   b. WRAPPER externo: <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${brand.email_bg};">
   c. HEADER DA MARCA (obrigatório — use exatamente este HTML):
${headerHtml}
   d. CONTAINER DO CONTEÚDO (max-width 600px, fundo branco ou ${brand.secondary} conforme o design)
      → Aqui vai o conteúdo do email seguindo o template escolhido
   e. FOOTER OBRIGATÓRIO (obrigatório — use exatamente este HTML):
${footerHtml}
   f. Fechamento da table wrapper e </body></html>

REGRAS TÉCNICAS OBRIGATÓRIAS:
- Layout 100% em <table> — NUNCA usar <div> para estrutura
- CSS 100% inline — NUNCA usar <style> ou classes externas
- Fontes: Arial, Helvetica, sans-serif
- Imagens: display:block; border:0; width e height explícitos (use height="auto" quando dinâmico)
- Botão CTA: background:${brand.cta}; color:${brand.cta_text}; padding:14px 32px; border-radius:4px; text-decoration:none; font-weight:bold; display:inline-block;
- Links CTA: <a href="%%=v(@link_tag)=%%" style="...">TEXTO</a>
- NUNCA usar data: URIs para imagens
- NUNCA omitir o header e o footer da marca

SOBRE IMAGENS NO CONTEÚDO:
- Use URLs absolutas começando com https://
- Para hero images, use placeholder de qualidade: https://via.placeholder.com/600x400/[cor_hex_sem_hash]/ffffff?text=Imagem
- Substitua [cor_hex_sem_hash] pela cor secundária da marca sem o # (ex: 0a0e27)

Gere APENAS o HTML completo do email. Sem explicações, sem markdown, sem blocos de código.
Comece diretamente com <!DOCTYPE html>`

    const userText = `Crie um email HTML completo para a marca ${brand.name} com base nas informações abaixo.

ASSUNTO: ${assunto || 'Email marketing'}
PRÉ-CABEÇALHO: ${preheader || assunto || ''}
TEMPLATE: ${templateId} — ${TEMPLATE_HINTS[templateId] || ''}

COPY DO EMAIL:
${copyText}

${imageUrls.length > 0 ? `IMAGENS DO DOCUMENTO (já hospedadas no SFMC — USE-AS no email, nesta ordem):
${(imageUrls as string[]).map((url: string, i: number) => `${i + 1}. ${url}`).join('\n')}
REGRA: incorpore estas imagens no corpo do email (não no header ou footer da marca). Coloque-as nos blocos de conteúdo onde faça sentido visual.` : ''}

${refImageB64 ? `REFERÊNCIA VISUAL OBRIGATÓRIA (imagem anexada):

ANTES de escrever qualquer linha de HTML, analise esta imagem em detalhes:
1. PROPORÇÕES: quais seções existem? Como se dividem verticalmente (hero grande? bloco médio? texto compacto?)
2. HIERARQUIA VISUAL: como headline, subtítulo, corpo e CTA se relacionam em tamanho e peso?
3. ESPAÇAMENTO: padding interno das células, distância entre blocos — minimalista ou denso?
4. PALETA DE CORES: além das cores da marca, quais tons neutros, gradientes ou fundos são usados?
5. TIPOGRAFIA: tamanhos relativos (headline muito grande vs. corpo pequeno?), alinhamento (centralizado ou alinhado à esquerda?)
6. ESTILO GERAL: editorial/magazine, clean/minimalista, vibrante, emocional, corporativo?

AGORA crie o email REPLICANDO:
- A mesma divisão proporcional de seções (se hero ocupa 40% → mantenha essa proporção)
- O mesmo ritmo visual (blocos, espaços, separadores)
- A mesma relação de tamanho entre os elementos tipográficos
- O mesmo estilo de botão CTA (arredondado? amplo? compacto?)
- Adapte as CORES para as cores da marca ${brand.name}

NÃO insira a imagem de referência no email. Use-a apenas como guia de design.` : ''}

Gere o HTML completo do email seguindo a estrutura obrigatória (com header e footer da marca ${brand.name}).`

    type UserContent = Anthropic.MessageParam['content']
    const userContent: UserContent = []

    if (refImageB64) {
      const [header, data] = refImageB64.split(',')
      const mediaType = header?.match(/data:([^;]+)/)?.[1] as
        'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | undefined
      if (data && mediaType) {
        userContent.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data } })
      }
    }
    userContent.push({ type: 'text', text: userText })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system,
      messages: [{ role: 'user', content: userContent }],
    })

    const rawHtml = response.content[0].type === 'text' ? response.content[0].text : ''
    const html = stripMarkdown(rawHtml)

    // Save METADATA ONLY to SFMC via GET (HTML_Content omitted — too large for URL)
    // Browser will POST HTML_Content separately after receiving this response
    let savedId = ''
    if (sfmcUrl) {
      const newId = crypto.randomUUID()
      const params = new URLSearchParams({
        action: 'save_email',
        bu,
        ID: newId,
        Nome: emailNome || assunto || 'Email sem nome',
        Status: 'rascunho',
        Assunto: assunto,
        Preheader: preheader,
        Template_ID: templateId,
      })
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 8000)
      try {
        const saveResp = await fetch(`${sfmcUrl}?${params.toString()}`, {
          signal: controller.signal,
        })
        clearTimeout(timer)
        const saveData = await saveResp.json()
        savedId = saveData.id || newId
      } catch {
        clearTimeout(timer)
        // non-fatal
      }
    }

    return Response.json({ success: true, html, id: savedId }, {
      headers: CORS_HEADERS,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return Response.json({ success: false, error: message }, {
      status: 500,
      headers: CORS_HEADERS,
    })
  }
}

export async function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS })
}
