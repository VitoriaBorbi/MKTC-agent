import Anthropic from '@anthropic-ai/sdk'
import { BRANDS } from '@/lib/brands/config'
import { BU } from '@/types'

export const maxDuration = 120

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildSystemPrompt(bu: BU): string {
  const brand = BRANDS[bu]
  const { primary, secondary, cta, footer_bg, footer_text } = brand.colors
  return `Você é um especialista sênior em email marketing HTML para a marca ${brand.name}. Seu padrão de qualidade é o de grandes empresas como Apple, Stripe e Notion — emails limpos, elegantes, com hierarquia visual clara.

══ IDENTIDADE DA MARCA ══
- Nome: ${brand.name}
- Logo: ${brand.logo_url}
- Cor primária (acentos, destaques): ${primary}
- Cor secundária (header/footer background): ${secondary}
- Cor do CTA (botão): ${cta}
- Footer background: ${footer_bg}
- Footer text: ${footer_text}

══ REGRAS TÉCNICAS (OBRIGATÓRIAS) ══
1. DOCTYPE: <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" ...>
2. Layout EXCLUSIVAMENTE com <table> — NUNCA <div>, <section>, <article> para estrutura
3. CSS 100% inline em cada elemento — NUNCA <style> tag ou class externas
4. Largura máxima: 600px (table container)
5. Fonts: Arial, Helvetica, sans-serif em todos os elementos de texto
6. Todas as imagens: display:block; border:0; e atributos alt="" width="N"
7. Preheader oculto imediatamente após <body> (div display:none, max-height:0, overflow:hidden)
8. Footer: link de descadastro <a href="%%unsub_center_url%%">
9. Botão CTA: <a href="%%=v(@link_tag)=%%"> — SEMPRE este placeholder, nunca URL real
10. Suporte Outlook: usar cellpadding="0" cellspacing="0" border="0" em todas as tables

══ SISTEMA DE DESIGN ══

TIPOGRAFIA (tamanhos fixos, não variar):
- Headline principal: 30–36px, font-weight:bold, line-height:1.2, color:${secondary}
- Subheadline: 20–22px, font-weight:bold, line-height:1.3
- Corpo: 16px, line-height:1.7, color:#444444
- Caption / labels: 13px, color:#888888
- Footer: 12px, color:${footer_text}

ESPAÇAMENTO (sistema consistente):
- Padding interno do container: 48px vertical, 48px horizontal
- Espaço entre seções: 32px
- Espaço entre parágrafo e botão: 36px
- Header logo area: padding 28px 40px
- Footer: padding 28px 40px

BOTÃO CTA (padrão alto):
- Background: ${cta}
- Border-radius: 6px
- Padding: 16px 40px
- Font-size: 16px, font-weight:bold
- Color: ${secondary} (ou #ffffff se contraste insuficiente)
- Usar table aninhada para o botão — NUNCA <a> direto no td

DIVISORES:
- Usar <hr style="border:none;border-top:1px solid #eeeeee;margin:0;"> para separar seções claras
- Usar espaço vertical (células vazias com height) em vez de dividers para separação suave

SEÇÕES COM FUNDO COLORIDO:
- Use backgrounds coloridos em seções chave para criar ritmo visual
- Ex: destaque em ${secondary} com texto branco e ${primary} como accent
- Ex: caixa de destaque com background #f8f9fa e border-left:4px solid ${primary}

══ ESTRUTURA DO EMAIL ══

Todo email DEVE ter esta estrutura mínima:
1. Preheader hidden
2. Wrapper table (full width, background #f4f4f4)
3. Container table (600px max, background branco, border-radius:8px, box-shadow sutil)
   a. HEADER — background ${secondary}, logo centralizado
   b. HERO — (se aplicável) imagem full-width ou banner colorido
   c. BODY — copy com hierarquia: headline → parágrafos → elementos de destaque → CTA
   d. FOOTER — background ${footer_bg}, copyright, descadastro

══ QUALIDADE VISUAL (obrigatória) ══
- O email deve ter visual de nível premium — não genérico
- Use seções com fundo alternado para criar profundidade
- Crie pelo menos 1 bloco de destaque (quote, stat, feature) além do copy básico
- Botão deve ser bem dimensionado, nunca pequeno ou mal posicionado
- Headlines em CAIXA ALTA quando apropriado para marcas mais assertivas
- Use espaço em branco generosamente — emails com padding generoso são mais elegantes
- Quando houver lista de benefícios, use checkmarks (✓) ou bullets estilizados

Gere APENAS o HTML completo, sem explicações, sem markdown, sem blocos de código.
Comece DIRETAMENTE com <!DOCTYPE`
}

function buildUserPrompt(opts: {
  copyText: string
  assunto: string
  preheader: string
  templateId: string
  hasReference: boolean
}): string {
  const { copyText, assunto, preheader, templateId, hasReference } = opts

  const templateHint: Record<string, string> = {
    'full-hero':    'Imagem hero full-width no topo, headline grande, CTA único e bem destacado.',
    'text-first':   'Hierarquia tipográfica forte. Copy longa, mínimo de imagens, CTA no final.',
    'side-image':   'Imagem à esquerda (ou direita), copy ao lado. Grid 2 colunas no topo.',
    'multi-block':  'Múltiplos blocos de conteúdo com separadores visuais entre eles.',
    'minimal':      'Muito espaço em branco, tipografia limpa, uma única mensagem central.',
    'announcement': 'Borda colorida no topo (4px), conteúdo centralizado, tom de urgência/destaque.',
  }

  return `Crie um email HTML de alta qualidade com base nas informações abaixo.

ASSUNTO: ${assunto || 'Email marketing'}
PRÉ-CABEÇALHO: ${preheader || assunto || ''}
TEMPLATE: ${templateId} — ${templateHint[templateId] || ''}

COPY DO EMAIL:
${copyText}

INSTRUÇÕES DE QUALIDADE:
- Inclua TODO o texto da copy acima, sem omitir ou resumir parágrafos
- Crie hierarquia visual clara: headline grande → subheadline → parágrafos → CTA
- Use pelo menos 1 seção com background colorido (da paleta da marca) para destacar conteúdo
- Se houver lista de benefícios, formate com ✓ ou bullets visualmente atrativos
- O botão CTA deve ser proeminente, bem espaçado e centralizado
- Adicione um bloco de destaque (ex: stat, quote, feature) quando o conteúdo permitir
- Use espaço generoso — emails apertados parecem baratos
- Linhas de copy curtas (max ~70 chars) = mais elegante

${hasReference ? `REFERÊNCIA VISUAL (imagem anexada):
A imagem acima é a principal inspiração de design para este email.
1. ANALISE profundamente: estrutura de layout, hierarquia visual, paleta de cores, uso de espaço em branco, estilo tipográfico (bold/light, caps/lowercase), sensação geral (premium/jovial/sério/energético/urgente), elementos decorativos.
2. REPLIQUE a estrutura e o ritmo visual fielmente: se a referência tem hero grande, faça hero grande; se tem blocos alternados escuro/claro, replique; se tem grid, use grid; se tem bordas laterais coloridas, replique.
3. ADAPTE as cores: use a paleta da referência para backgrounds de seção, separadores, destaques e elementos decorativos — mesclando com as cores da marca quando necessário.
4. NÃO insira a imagem de referência no email (use-a apenas como guia).
O resultado deve parecer diretamente inspirado nessa referência, preservando o DNA visual dentro das constraints de email HTML.` : ''}

Gere o HTML completo, começando com <!DOCTYPE.`
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ bu: string }> }
) {
  const { bu } = await params as unknown as { bu: BU }

  const formData = await req.formData()
  const copyText    = formData.get('copyText') as string || ''
  const assunto     = formData.get('assunto') as string || ''
  const preheader   = formData.get('preheader') as string || ''
  const templateId  = formData.get('templateId') as string || 'full-hero'
  const refImageB64 = formData.get('refImage') as string || ''  // base64 data URL

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function emit(type: string, payload: object) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type, ...payload })}\n\n`)
        )
      }

      try {
        // Build messages
        const userContent: Anthropic.MessageParam['content'] = []

        // If reference image provided, add as vision input
        if (refImageB64) {
          emit('log', { message: 'Analisando DNA visual da imagem de referência...' })
          const [header, data] = refImageB64.split(',')
          const mediaType = header.match(/data:([^;]+)/)?.[1] as
            'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | undefined

          if (data && mediaType) {
            userContent.push({
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data },
            })
          }
        }

        userContent.push({
          type: 'text',
          text: buildUserPrompt({ copyText, assunto, preheader, templateId, hasReference: !!refImageB64 }),
        })

        emit('log', { message: 'Gerando HTML com Claude...' })

        let html = ''

        const claudeStream = await client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 8000,
          system: buildSystemPrompt(bu),
          messages: [{ role: 'user', content: userContent }],
        })

        for await (const chunk of claudeStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            html += chunk.delta.text
            emit('html_chunk', { chunk: chunk.delta.text })
          }
        }

        emit('log', { message: 'Email gerado com sucesso!' })
        emit('done', { html })

      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido'
        emit('error', { message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...CORS_HEADERS,
    },
  })
}
