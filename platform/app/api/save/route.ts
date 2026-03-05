export const maxDuration = 15

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { sfmcUrl, ...email } = body

    if (!sfmcUrl) {
      return Response.json({ success: false, error: 'sfmcUrl obrigatório' }, {
        status: 400, headers: CORS_HEADERS,
      })
    }

    // Whitelist only the fields the AMPscript save_email actually uses
    // (matches the same params as the initial Vercel save that is known to work)
    const ALLOWED = ['bu', 'ID', 'Nome', 'Status', 'Assunto', 'Preheader',
                     'Template_ID', 'Send_Date', 'Send_Time', 'DE_Envio',
                     'DE_Exclusao', 'Obs']
    const params = new URLSearchParams({ action: 'save_email' })
    for (const k of ALLOWED) {
      const v = (email as Record<string, unknown>)[k]
      if (v !== undefined && v !== null && v !== '') {
        params.set(k, String(v))
      }
    }

    const fullUrl = `${sfmcUrl}?${params.toString()}`
    console.log('[save] calling SFMC:', fullUrl.substring(0, 500))

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)

    try {
      const sfmcResp = await fetch(fullUrl, {
        signal: controller.signal,
      })
      clearTimeout(timer)
      const text = await sfmcResp.text()
      console.log('[save] SFMC status:', sfmcResp.status, 'body:', text.substring(0, 300))
      try {
        const data = JSON.parse(text)
        return Response.json(data, { headers: CORS_HEADERS })
      } catch {
        return Response.json({ success: false, error: 'SFMC error: ' + text.substring(0, 200) }, { headers: CORS_HEADERS })
      }
    } catch (fetchErr) {
      clearTimeout(timer)
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
      return Response.json({ success: false, error: msg }, { headers: CORS_HEADERS })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return Response.json({ success: false, error: message }, {
      status: 500, headers: CORS_HEADERS,
    })
  }
}

export async function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS })
}
