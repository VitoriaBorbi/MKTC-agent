import { NextRequest, NextResponse } from 'next/server'
import { BU } from '@/types'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Name of the pre-aggregated tracking DE (must exist in each SFMC BU)
const DE_NAME = 'MKTC_Dashboard_Daily'

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

// Enterprise token (no account_id) — needed to query the shared DE in the parent BU
async function getEnterpriseToken(subdomain: string): Promise<string> {
  const res = await fetch(
    `https://${subdomain}.auth.marketingcloudapis.com/v2/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: process.env.SFMC_CLIENT_ID,
        client_secret: process.env.SFMC_CLIENT_SECRET,
      }),
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Auth SFMC enterprise falhou (${res.status}): ${text.slice(0, 200)}`)
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

/** Parse DataExtensionObject rows from SOAP Retrieve response XML.
 *  Retrieve responses use <Results xsi:type="DataExtensionObject"> (not <Objects>). */
function extractDERows(xml: string): Record<string, string>[] {
  const rows: Record<string, string>[] = []
  // Match both <Results> (Retrieve) and <Objects> (Create/Update) just in case
  const objectRe = /<(?:Results|Objects)[^>]*xsi:type="DataExtensionObject"[^>]*>([\s\S]*?)<\/(?:Results|Objects)>/g
  let objMatch: RegExpExecArray | null
  while ((objMatch = objectRe.exec(xml)) !== null) {
    const row: Record<string, string> = {}
    const propRe = /<Property>\s*<Name>([^<]+)<\/Name>\s*<Value>([^<]*)<\/Value>\s*<\/Property>/g
    let propMatch: RegExpExecArray | null
    while ((propMatch = propRe.exec(objMatch[1])) !== null) {
      row[propMatch[1]] = propMatch[2]
    }
    if (Object.keys(row).length > 0) rows.push(row)
  }
  return rows
}

function sumField(rows: Record<string, string>[], field: string): number {
  return rows.reduce((acc, r) => acc + (parseFloat(r[field]) || 0), 0)
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
    const token = await getEnterpriseToken(subdomain)

    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceStr = since.toISOString().slice(0, 19)

    const body = `
      <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
        <RetrieveRequest>
          <ObjectType>DataExtensionObject[${DE_NAME}]</ObjectType>
          <Properties>Date</Properties>
          <Properties>BU</Properties>
          <Properties>Sent</Properties>
          <Properties>Delivered</Properties>
          <Properties>UniqueOpens</Properties>
          <Properties>UniqueClicks</Properties>
          <Properties>Bounces</Properties>
          <Properties>Unsubscribes</Properties>
          <Filter xsi:type="ComplexFilterPart">
            <LeftOperand xsi:type="SimpleFilterPart">
              <Property>Date</Property>
              <SimpleOperator>greaterThan</SimpleOperator>
              <DateValue>${sinceStr}</DateValue>
            </LeftOperand>
            <LogicalOperator>AND</LogicalOperator>
            <RightOperand xsi:type="SimpleFilterPart">
              <Property>BU</Property>
              <SimpleOperator>equals</SimpleOperator>
              <Value>${bu}</Value>
            </RightOperand>
          </Filter>
        </RetrieveRequest>
      </RetrieveRequestMsg>`

    const xml = await soapCall(subdomain, 'Retrieve', token, body)

    // DE not set up yet
    if (xml.includes('Unable to find') || xml.includes('not found') || xml.includes('does not exist')) {
      return NextResponse.json(
        {
          success: true,
          data: { sends: 0, opens: 0, openRate: 0, clicks: 0, ctr: 0, bounces: 0, unsubscribes: 0 },
          note: `DE "${DE_NAME}" não encontrada — verifique se é Shared e acessível via enterprise token.`,
          debug: { xml: xml.slice(0, 500) },
        },
        { headers: CORS }
      )
    }

    const rows = extractDERows(xml)

    // DE exists but has no rows yet (automation not run yet or BU filter returned nothing)
    if (rows.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: { sends: 0, opens: 0, openRate: 0, clicks: 0, ctr: 0, bounces: 0, unsubscribes: 0 },
          note: `Sem dados para BU="${bu}" nos últimos ${days}d — rode a automação no SFMC.`,
          debug: { xml: xml.slice(0, 500) },
        },
        { headers: CORS }
      )
    }

    const sends        = sumField(rows, 'Sent')
    const delivered    = sumField(rows, 'Delivered')
    const opens        = sumField(rows, 'UniqueOpens')
    const clicks       = sumField(rows, 'UniqueClicks')
    const bounces      = sumField(rows, 'Bounces')
    const unsubscribes = sumField(rows, 'Unsubscribes')

    const openRate = sends > 0 ? Math.round((opens / sends) * 1000) / 10 : 0
    const ctr      = delivered > 0 ? Math.round((clicks / delivered) * 1000) / 10 : 0

    return NextResponse.json(
      { success: true, data: { sends, opens, openRate, clicks, ctr, bounces, unsubscribes }, debug: { rowCount: rows.length } },
      { headers: CORS }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/[bu]/dataviews]', message)
    return NextResponse.json({ error: message }, { status: 500, headers: CORS })
  }
}
