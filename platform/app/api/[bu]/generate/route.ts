import Anthropic from '@anthropic-ai/sdk'
import { BRANDS } from '@/lib/brands/config'
import { BU } from '@/types'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildSystemPrompt(bu: BU): string {
  const brand = BRANDS[bu]
  return `Você é um especialista em email marketing HTML para a marca ${brand.name}.

IDENTIDADE DA MARCA:
- Cor primária: ${brand.colors.primary}
- Cor secundária (fundos escuros): ${brand.colors.secondary}
- Cor CTA: ${brand.colors.cta}
- Logo URL: ${brand.logo_url}
- Tom: profissional, aspiracional, direto

REGRAS DE EMAIL HTML (obrigatórias):
- DOCTYPE XHTML 1.0 Transitional
- Layout 100% em <table>, NUNCA <div> para estrutura
- CSS 100% inline, NUNCA externo ou <style>
- Max-width: 600px
- Fonts: Arial, Helvetica, sans-serif (apenas email-safe fonts)
- Imagens com display:block, alt e width/height explícitos
- Preheader oculto logo após <body>
- Footer com link de descadastro: <a href="%%unsub_center_url%%">
- CTA com AMPscript placeholder: <a href="%%=v(@link_tag)=%%">

Gere APENAS o HTML completo do email, sem explicações, sem markdown, sem blocos de código.
Comece diretamente com <!DOCTYPE html`
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

  return `Crie um email HTML completo com base nas informações abaixo.

ASSUNTO: ${assunto || 'Email marketing'}
PRÉ-CABEÇALHO: ${preheader || assunto || ''}
TEMPLATE: ${templateId} — ${templateHint[templateId] || ''}

COPY DO EMAIL:
${copyText}

${hasReference ? `REFERÊNCIA VISUAL (imagem anexada):
A imagem acima é a principal inspiração de design para este email.
1. ANALISE: estrutura de layout, hierarquia visual, paleta de cores, uso de espaço, estilo tipográfico, sensação geral (premium/jovial/sério/energético/urgente).
2. REPLIQUE a estrutura e o ritmo visual: se a referência tem hero grande, faça hero grande; se tem blocos alternados, replique o padrão; se tem grid, use grid.
3. ADAPTE as cores: use a paleta da referência nos backgrounds de seção, separadores, destaques e elementos decorativos — combinando com as cores da marca quando necessário.
4. NÃO insira a imagem de referência no email. Use-a apenas como guia de design.
O resultado deve parecer que foi diretamente inspirado nessa referência, preservando o DNA visual dela dentro das constraints da marca.` : ''}

Gere o HTML completo do email.`
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
          max_tokens: 4096,
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
    },
  })
}
