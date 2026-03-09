import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 120

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Você é um especialista em jornadas de email marketing. Analise o mapa de jornada e o briefing fornecidos. Retorne APENAS um JSON minificado válido, sem markdown, sem texto extra, sem blocos de código.

O JSON deve seguir EXATAMENTE esta estrutura:
{"name":"...","description":"...","entryEvent":"...","steps":[{"id":1,"name":"...","delay":0,"delayUnit":"days","subject":"...","preheader":"...","copyText":"copy completa do email","template":"full-hero"}]}

Templates disponíveis: full-hero, text-first, side-image, multi-block, minimal, announcement
Regras:
- delay=0 no primeiro step (envio imediato após entrada na jornada)
- delays seguintes em dias desde o email anterior
- Gere a copy completa de cada email no campo copyText (texto real, não placeholder)
- O campo copyText deve conter todo o texto do email, incluindo saudação, corpo, CTA e assinatura`

function stripJson(text: string): string {
  let result = text.trim()
  result = result.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/m, '').trim()
  const idx = result.indexOf('{')
  if (idx > 0) result = result.slice(idx)
  const last = result.lastIndexOf('}')
  if (last !== -1 && last < result.length - 1) result = result.slice(0, last + 1)
  return result
}

export async function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { bu = 'finclass', name = '', briefing = '', image = '' } = body

    const userText = `Jornada: ${name}\nBU/Marca: ${bu}\n\nBriefing:\n${briefing}\n\nRetorne APENAS o JSON da jornada (sem markdown, sem explicação).`

    type UserContent = Anthropic.MessageParam['content']
    const userContent: UserContent = []

    if (image) {
      // image may or may not have data: prefix
      const parts = image.split(',')
      const data = parts.length > 1 ? parts[1] : parts[0]
      const header = parts.length > 1 ? parts[0] : ''
      const mediaType = (header.match(/data:([^;]+)/)?.[1] || 'image/jpeg') as
        'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

      if (data) {
        userContent.push({
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data },
        })
      }
    }

    userContent.push({ type: 'text', text: userText })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonText = stripJson(rawText)

    let data: unknown
    try {
      data = JSON.parse(jsonText)
    } catch {
      return Response.json(
        { success: false, error: 'Claude retornou JSON inválido', raw: rawText.slice(0, 500) },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    return Response.json({ success: true, data }, { headers: CORS_HEADERS })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return Response.json({ success: false, error: message }, { status: 500, headers: CORS_HEADERS })
  }
}
