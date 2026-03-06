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
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Auth SFMC falhou (${res.status}): ${text.slice(0, 200)}`)
  }
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

function sumTag(xml: string, tag: string): number {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'g')
  let total = 0
  let m: RegExpExecArray | null
  while ((m = regex.exec(xml)) !== null) {
    total += parseInt(m[1].trim()) || 0
  }
  return total
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bu: string }> }
) {
  const { bu } = await params as unknown as { bu: BU }
  const url = new URL(req.url)
  const days = parseInt(url.searchParams.get('days') || '30')

  const subdomain = process.env.SFMC_SUBDOMAIN
  if (!subdomain || !process.env.SFMC_CLIENT_ID || !process.env.SFMC_CLIENT_SECRET) {
    return NextResponse.json(
      { success: true, data: { sends: 0, opens: 0, openRate: 0, clicks: 0, ctr: 0, bounces: 0, unsubscribes: 0 }, note: 'SFMC não configurado' },
      { headers: CORS }
    )
  }

  try {
    const mid = getMID(bu)
    const token = await getToken(subdomain, mid)

    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceStr = since.toISOString().slice(0, 19)

    const body = `
      <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
        <RetrieveRequest>
          <ObjectType>Send</ObjectType>
          <Properties>ID</Properties>
          <Properties>NumberSent</Properties>
          <Properties>NumberDelivered</Properties>
          <Properties>NumberBounced</Properties>
          <Properties>UniqueOpens</Properties>
          <Properties>UniqueClicks</Properties>
          <Properties>NumberUnsubscribed</Properties>
          <Filter xsi:type="SimpleFilterPart">
            <Property>SendDate</Property>
            <SimpleOperator>greaterThan</SimpleOperator>
            <DateValue>${sinceStr}</DateValue>
          </Filter>
        </RetrieveRequest>
      </RetrieveRequestMsg>`

    const xml = await soapCall(subdomain, 'Retrieve', token, body)

    const sends       = sumTag(xml, 'NumberSent')
    const delivered   = sumTag(xml, 'NumberDelivered')
    const opens       = sumTag(xml, 'UniqueOpens')
    const clicks      = sumTag(xml, 'UniqueClicks')
    const bounces     = sumTag(xml, 'NumberBounced')
    const unsubscribes = sumTag(xml, 'NumberUnsubscribed')

    const openRate = sends > 0 ? Math.round((opens / sends) * 1000) / 10 : 0
    const ctr      = delivered > 0 ? Math.round((clicks / delivered) * 1000) / 10 : 0

    return NextResponse.json(
      { success: true, data: { sends, opens, openRate, clicks, ctr, bounces, unsubscribes } },
      { headers: CORS }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/[bu]/dataviews]', message)
    return NextResponse.json({ error: message }, { status: 500, headers: CORS })
  }
}
