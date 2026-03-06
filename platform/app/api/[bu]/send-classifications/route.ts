import { NextRequest, NextResponse } from 'next/server'
import { BU } from '@/types'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { headers: CORS })
}

function getMID(bu: BU): string {
  const map: Record<BU, string | undefined> = {
    'finclass':      process.env.SFMC_MID_FINCLASS,
    'bruno-perini':  process.env.SFMC_MID_BRUNO_PERINI,
    'faculdade-hub': process.env.SFMC_MID_FACULDADE_HUB,
    'thiago-nigro':  process.env.SFMC_MID_THIAGO_NIGRO,
    'portfel':       process.env.SFMC_MID_PORTFEL,
    'grao':          process.env.SFMC_MID_GRAO,
  }
  const mid = map[bu]
  if (!mid) throw new Error(`MID não configurado para BU: ${bu}`)
  return mid
}

async function getToken(subdomain: string, mid: string): Promise<string> {
  const res = await fetch(
    `https://${subdomain}.auth.marketingcloudapis.com/v2/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: process.env.SFMC_CLIENT_ID,
        client_secret: process.env.SFMC_CLIENT_SECRET,
        account_id: mid,
      }),
    }
  )
  if (!res.ok) throw new Error(`Auth SFMC falhou (${res.status})`)
  const data = await res.json()
  return data.access_token as string
}

function soapEnvelope(token: string, body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:et="http://exacttarget.com/wsdl/partnerAPI">
  <soapenv:Header>
    <fueloauth xmlns="http://exacttarget.com">${token}</fueloauth>
  </soapenv:Header>
  <soapenv:Body>${body}</soapenv:Body>
</soapenv:Envelope>`
}

async function soapCall(subdomain: string, action: string, token: string, body: string): Promise<string> {
  const url = `https://${subdomain}.soap.marketingcloudapis.com/Service.asmx`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: action,
    },
    body: soapEnvelope(token, body),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`SOAP ${action} falhou (${res.status}): ${text.slice(0, 400)}`)
  return text
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bu: string }> }
) {
  const { bu } = await params as unknown as { bu: BU }

  const subdomain = process.env.SFMC_SUBDOMAIN
  if (!subdomain || !process.env.SFMC_CLIENT_ID || !process.env.SFMC_CLIENT_SECRET) {
    return NextResponse.json(
      { success: false, error: 'SFMC não configurado' },
      { status: 503, headers: CORS }
    )
  }

  try {
    const mid = getMID(bu)
    const token = await getToken(subdomain, mid)

    const body = `
      <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
        <RetrieveRequest>
          <ObjectType>SendClassification</ObjectType>
          <Properties>CustomerKey</Properties>
          <Properties>Name</Properties>
          <Properties>Description</Properties>
        </RetrieveRequest>
      </RetrieveRequestMsg>`

    const xml = await soapCall(subdomain, 'Retrieve', token, body)

    const items: { id: string; label: string }[] = []
    const objectsRegex = /<Results[^>]*>([\s\S]*?)<\/Results>/g
    let m: RegExpExecArray | null
    while ((m = objectsRegex.exec(xml)) !== null) {
      const block = m[1]
      const keyMatch = block.match(/<CustomerKey>([^<]*)<\/CustomerKey>/)
      const nameMatch = block.match(/<Name>([^<]*)<\/Name>/)
      if (keyMatch && nameMatch) {
        items.push({ id: keyMatch[1].trim(), label: nameMatch[1].trim() })
      }
    }

    return NextResponse.json({ success: true, data: items }, { headers: CORS })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/[bu]/send-classifications]', message)
    return NextResponse.json({ error: message }, { status: 500, headers: CORS })
  }
}
