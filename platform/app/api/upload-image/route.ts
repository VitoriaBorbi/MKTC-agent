import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

async function getEnterpriseToken(subdomain: string): Promise<string> {
  const res = await fetch(
    `https://${subdomain}.auth.marketingcloudapis.com/v2/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type:    'client_credentials',
        client_id:     process.env.SFMC_CLIENT_ID,
        client_secret: process.env.SFMC_CLIENT_SECRET,
        // NO account_id → enterprise token → category 273324 + CDN image.m.grupo-primo.com
      }),
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Auth SFMC falhou (${res.status}): ${text.slice(0, 200)}`)
  }
  const data = await res.json()
  return data.access_token as string
}

const ASSET_TYPE: Record<string, { id: number; name: string }> = {
  'image/png':  { id: 28, name: 'png' },
  'image/jpeg': { id: 23, name: 'jpg' },
  'image/jpg':  { id: 23, name: 'jpg' },
  'image/gif':  { id: 31, name: 'gif' },
  'image/webp': { id: 28, name: 'png' },
}

const SUPPORTED_TYPES = new Set(Object.keys(ASSET_TYPE))

export async function POST(req: NextRequest) {
  try {
    const { imageB64, mediaType = 'image/png', filename = 'image' } = await req.json()

    if (!imageB64) {
      return NextResponse.json({ error: 'imageB64 obrigatório' }, { status: 400, headers: CORS_HEADERS })
    }

    if (!SUPPORTED_TYPES.has(mediaType)) {
      return NextResponse.json({ error: `Tipo não suportado: ${mediaType}` }, { status: 400, headers: CORS_HEADERS })
    }

    const subdomain = process.env.SFMC_SUBDOMAIN
    if (!subdomain || !process.env.SFMC_CLIENT_ID || !process.env.SFMC_CLIENT_SECRET) {
      return NextResponse.json({ error: 'SFMC não configurado' }, { status: 500, headers: CORS_HEADERS })
    }

    const token = await getEnterpriseToken(subdomain)

    const ts       = Date.now()
    const safeName = `mktc_${ts}_${filename.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)}`
    const assetType = ASSET_TYPE[mediaType] ?? { id: 28, name: 'png' }

    const uploadRes = await fetch(
      `https://${subdomain}.rest.marketingcloudapis.com/asset/v1/content/assets`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name:      safeName,
          assetType: { id: assetType.id, name: assetType.name },
          file:      imageB64,
          category:  { id: 273324 },
        }),
      }
    )

    const uploadData = await uploadRes.json()

    if (!uploadRes.ok || !uploadData.publishedURL) {
      throw new Error(`Upload falhou (${uploadRes.status}): ${JSON.stringify(uploadData).slice(0, 300)}`)
    }

    return NextResponse.json({ success: true, url: uploadData.publishedURL }, { headers: CORS_HEADERS })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/upload-image]', message)
    return NextResponse.json({ error: message }, { status: 500, headers: CORS_HEADERS })
  }
}

export async function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS })
}
