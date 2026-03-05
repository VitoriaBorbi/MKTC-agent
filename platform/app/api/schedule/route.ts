import { NextRequest, NextResponse } from 'next/server'
import { BU } from '@/types'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { headers: CORS })
}

// ─── Config ───────────────────────────────────────────────────────────────────

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

// ─── SFMC Auth ────────────────────────────────────────────────────────────────

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

// ─── SOAP Helpers ─────────────────────────────────────────────────────────────

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

async function soapCall(
  subdomain: string,
  action: string,
  token: string,
  body: string
): Promise<string> {
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
  if (!res.ok) {
    throw new Error(`SOAP ${action} falhou (${res.status}): ${text.slice(0, 400)}`)
  }
  return text
}

/** Extract first occurrence of a tag's text content */
function extractTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`))
  return m ? m[1].trim() : null
}

// ─── SFMC Operations ──────────────────────────────────────────────────────────

async function getDEObjectID(
  subdomain: string,
  token: string,
  deName: string,
  mid: string
): Promise<string> {
  const body = `
    <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
      <RetrieveRequest>
        <ObjectType>DataExtension</ObjectType>
        <Properties>ObjectID</Properties>
        <Properties>CustomerKey</Properties>
        <Properties>Name</Properties>
        <Filter xsi:type="ComplexFilterPart">
          <LeftOperand xsi:type="SimpleFilterPart">
            <Property>CustomerKey</Property>
            <SimpleOperator>equals</SimpleOperator>
            <Value>${deName}</Value>
          </LeftOperand>
          <LogicalOperator>OR</LogicalOperator>
          <RightOperand xsi:type="SimpleFilterPart">
            <Property>Name</Property>
            <SimpleOperator>equals</SimpleOperator>
            <Value>${deName}</Value>
          </RightOperand>
        </Filter>
      </RetrieveRequest>
    </RetrieveRequestMsg>`

  const xml = await soapCall(subdomain, 'Retrieve', token, body)
  const oid = extractTag(xml, 'ObjectID')
  if (!oid) {
    throw new Error(`DE não encontrada no SFMC: "${deName}"`)
  }
  return oid
}

async function createESEmail(
  subdomain: string,
  token: string,
  name: string,
  assunto: string,
  html: string,
  categoryId?: string
): Promise<string> {
  // CDATA cannot contain "]]>" — escape it
  const safeHtml = html.replace(/\]\]>/g, ']] >')

  const body = `
    <CreateRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">
      <Objects xsi:type="Email">
        <Name>${name}</Name>
        <Subject>${assunto}</Subject>
        <HTMLBody><![CDATA[${safeHtml}]]></HTMLBody>
        <IsHTMLPaste>true</IsHTMLPaste>
        ${categoryId ? `<CategoryID>${categoryId}</CategoryID>` : ''}
      </Objects>
    </CreateRequest>`

  const xml = await soapCall(subdomain, 'Create', token, body)
  const status = extractTag(xml, 'StatusCode')
  if (status !== 'OK') {
    const msg = extractTag(xml, 'StatusMessage')
    throw new Error(`Falha ao criar Email no ES: ${msg}`)
  }
  const m = xml.match(/<NewID>(\d+)<\/NewID>/)
  if (!m) throw new Error('NewID não encontrado na resposta do ES')
  return m[1]
}

async function createESD(
  subdomain: string,
  token: string,
  params: {
    esdKey: string
    esdName: string
    sendClassificationKey: string
    esEmailId: string
    deEnvioOIDs: string[]
    deExclOIDs: string[]
  }
): Promise<void> {
  const { esdKey, esdName, sendClassificationKey, esEmailId, deEnvioOIDs, deExclOIDs } = params

  const sourceListXml = deEnvioOIDs.map(oid => `
      <SendDefinitionList>
        <SendDefinitionListType>SourceList</SendDefinitionListType>
        <DataSourceTypeID>CustomObject</DataSourceTypeID>
        <CustomObjectID>${oid}</CustomObjectID>
      </SendDefinitionList>`).join('')

  const exclListXml = deExclOIDs.map(oid => `
      <SendDefinitionList>
        <SendDefinitionListType>ExclusionList</SendDefinitionListType>
        <DataSourceTypeID>CustomObject</DataSourceTypeID>
        <CustomObjectID>${oid}</CustomObjectID>
      </SendDefinitionList>`).join('')

  const body = `
    <CreateRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">
      <Objects xsi:type="EmailSendDefinition">
        <CustomerKey>${esdKey}</CustomerKey>
        <Name>${esdName}</Name>
        <SendClassification>
          <CustomerKey>${sendClassificationKey}</CustomerKey>
        </SendClassification>
        ${sourceListXml}
        ${exclListXml}
        <Email>
          <ID>${esEmailId}</ID>
        </Email>
      </Objects>
    </CreateRequest>`

  const xml = await soapCall(subdomain, 'Create', token, body)
  const status = extractTag(xml, 'StatusCode')
  if (status !== 'OK') {
    const msg = extractTag(xml, 'StatusMessage')
    throw new Error(`Falha ao criar ESD: ${msg}`)
  }
}

async function scheduleESD(
  subdomain: string,
  token: string,
  esdKey: string,
  utcDatetime: string // YYYY-MM-DDTHH:MM:SS
): Promise<void> {
  const body = `
    <ScheduleRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
      <Action>start</Action>
      <Schedule>
        <StartDateTime>${utcDatetime}</StartDateTime>
      </Schedule>
      <Interactions>
        <Interaction xsi:type="EmailSendDefinition">
          <CustomerKey>${esdKey}</CustomerKey>
        </Interaction>
      </Interactions>
    </ScheduleRequestMsg>`

  const xml = await soapCall(subdomain, 'Schedule', token, body)
  const status = extractTag(xml, 'StatusCode')
  if (status !== 'OK') {
    const msg = extractTag(xml, 'StatusMessage')
    throw new Error(`Falha ao agendar ESD: ${msg}`)
  }
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const {
      bu,
      nome,
      assunto,
      html,
      sendClassificationId,
      desEnvio,
      desExclusao,
      sendDate,
      sendTime,
      trackingFolderId,
    } = (await req.json()) as {
      bu: BU
      nome: string
      assunto: string
      html: string
      sendClassificationId: string
      desEnvio: string[]
      desExclusao: string[]
      sendDate: string // YYYY-MM-DD (BRT)
      sendTime: string // HH:MM (BRT)
      trackingFolderId?: string
    }

    const subdomain = process.env.SFMC_SUBDOMAIN
    if (!subdomain || !process.env.SFMC_CLIENT_ID || !process.env.SFMC_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'Variáveis SFMC_SUBDOMAIN / SFMC_CLIENT_ID / SFMC_CLIENT_SECRET não configuradas.' },
        { status: 500, headers: CORS }
      )
    }

    const mid = getMID(bu)
    const token = await getToken(subdomain, mid)

    // Look up DE ObjectIDs in parallel
    const [deEnvioOIDs, deExclOIDs] = await Promise.all([
      Promise.all(desEnvio.map(name => getDEObjectID(subdomain, token, name, mid))),
      Promise.all(desExclusao.map(name => getDEObjectID(subdomain, token, name, mid))),
    ])

    // Convert BRT (UTC-3) → UTC
    const brtDate = new Date(`${sendDate}T${sendTime}:00-03:00`)
    const utcDatetime = brtDate.toISOString().slice(0, 19) // YYYY-MM-DDTHH:MM:SS

    // Build unique names
    const safeName = nome.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)
    const ts = Date.now()
    const emailName = `${safeName}_${ts}`
    const esdKey = `${safeName.slice(0, 30)}-${ts}`

    // Create Email in Email Studio (no folder — ES folder IDs differ from CB)
    const esEmailId = await createESEmail(subdomain, token, emailName, assunto, html)

    // Create EmailSendDefinition
    await createESD(subdomain, token, {
      esdKey,
      esdName: esdKey,
      sendClassificationKey: sendClassificationId,
      esEmailId,
      deEnvioOIDs,
      deExclOIDs,
    })

    // Schedule
    await scheduleESD(subdomain, token, esdKey, utcDatetime)

    return NextResponse.json({ success: true, emailId: esEmailId, esdId: esdKey }, { headers: CORS })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/schedule]', message)
    return NextResponse.json({ error: message }, { status: 500, headers: CORS })
  }
}
