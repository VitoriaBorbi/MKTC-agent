export const maxDuration = 300

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const MID_MAP: Record<string, string | undefined> = {
  'finclass':      process.env.SFMC_MID_FINCLASS,
  'bruno-perini':  process.env.SFMC_MID_BRUNO_PERINI,
  'faculdade-hub': process.env.SFMC_MID_FACULDADE_HUB,
  'thiago-nigro':  process.env.SFMC_MID_THIAGO_NIGRO,
  'portfel':       process.env.SFMC_MID_PORTFEL,
  'grao':          process.env.SFMC_MID_GRAO,
}

// Content Builder email category per BU
const CB_CATEGORY: Record<string, number | undefined> = {
  'finclass': 275626,
}

interface Step {
  id: number
  name: string
  delay: number
  delayUnit: string
  subject: string
  preheader: string
  html: string
}

async function getBUToken(subdomain: string, mid: string): Promise<string> {
  const res = await fetch(`https://${subdomain}.auth.marketingcloudapis.com/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: process.env.SFMC_CLIENT_ID,
      client_secret: process.env.SFMC_CLIENT_SECRET,
      account_id: mid,
    }),
  })
  if (!res.ok) throw new Error(`Auth SFMC BU falhou (${res.status})`)
  const data = await res.json()
  return data.access_token as string
}

async function getEnterpriseToken(subdomain: string): Promise<string> {
  const res = await fetch(`https://${subdomain}.auth.marketingcloudapis.com/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: process.env.SFMC_CLIENT_ID,
      client_secret: process.env.SFMC_CLIENT_SECRET,
    }),
  })
  if (!res.ok) throw new Error(`Auth SFMC enterprise falhou (${res.status})`)
  const data = await res.json()
  return data.access_token as string
}

async function getEventDefinitionKey(
  subdomain: string,
  token: string
): Promise<string> {
  // Reuse an existing APIEvent EventDefinition — creating new ones requires a DE
  const res = await fetch(
    `https://${subdomain}.rest.marketingcloudapis.com/interaction/v1/eventDefinitions?type=APIEvent&$pagesize=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error(`EventDef list falhou (${res.status})`)
  const data = await res.json()
  const items: Array<{ eventDefinitionKey?: string }> = data.items ?? data.definitions ?? []
  if (items.length === 0) throw new Error('Nenhuma EventDefinition do tipo APIEvent encontrada na conta')
  const key = items[0].eventDefinitionKey
  if (!key) throw new Error('EventDefinition sem eventDefinitionKey')
  return key
}

async function createEmailAsset(
  subdomain: string,
  token: string,
  name: string,
  html: string,
  subject: string,
  preheader: string,
  categoryId?: number
): Promise<number> {
  const body: Record<string, unknown> = {
    name,
    assetType: { name: 'htmlemail', id: 208 },
    views: {
      html: { content: html },
      subjectline: { content: subject || name },
      // preheader intentionally omitted — causes 400 in SFMC CB API
    },
  }
  if (categoryId) body.category = { id: categoryId }

  const res = await fetch(
    `https://${subdomain}.rest.marketingcloudapis.com/asset/v1/content/assets`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }
  )
  const data = await res.json()
  if (!res.ok) throw new Error(`CB asset "${name}" falhou (${res.status}): ${JSON.stringify(data).slice(0, 300)}`)
  return data.id as number
}

function outcome(next: string) {
  return { next, arguments: {}, metaData: {} }
}

function buildJourneyPayload(
  name: string,
  description: string,
  steps: Step[],
  assetIds: number[],
  eventDefinitionKey: string
): object {
  const activities: object[] = []
  const firstKey = 'email-activity-1'

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const emailKey = `email-activity-${i + 1}`
    const isLast = i === steps.length - 1
    const nextDelay = isLast ? null : steps[i + 1]
    const waitKey = `wait-${i + 1}`
    const nextEmailKey = `email-activity-${i + 2}`

    const emailOutcomes = isLast ? [] : nextDelay && nextDelay.delay > 0
      ? [outcome(waitKey)]
      : [outcome(nextEmailKey)]

    activities.push({
      key: emailKey,
      name: step.name,
      type: 'EMAILV2',
      outcomes: emailOutcomes,
      arguments: {
        triggeredSend: {
          contentId: assetIds[i],
          emailId: null,
        },
      },
      configurationArguments: {
        applicationExtensionKey: 'jb-email-activity',
        triggeredSendDefinitionObjectID: '00000000-0000-0000-0000-000000000000',
        emailEncoding: 'UTF-8',
      },
      metaData: { version: 1, isConfigured: false },
    })

    if (!isLast && nextDelay && nextDelay.delay > 0) {
      const unit = (nextDelay.delayUnit || 'days').toUpperCase()
      activities.push({
        key: waitKey,
        name: `Aguardar ${nextDelay.delay} ${unit === 'HOURS' ? 'horas' : 'dias'}`,
        type: 'WAIT',
        outcomes: [outcome(nextEmailKey)],
        arguments: {},
        configurationArguments: {
          waitDuration: nextDelay.delay,
          waitUnit: unit === 'HOURS' ? 'HOURS' : 'DAYS',
        },
        metaData: { version: 1, isConfigured: true },
      })
    }
  }

  return {
    key: `journey-${crypto.randomUUID()}`,
    name,
    description: description || '',
    workflowApiVersion: 1.0,
    triggers: [
      {
        key: 'entry-1',
        name: 'Entrada API',
        type: 'APIEvent',
        configurationArguments: {
          eventDefinitionKey,
          transactional: false,
        },
        metaData: {
          eventDefinitionKey,
        },
        outcomes: activities.length > 0 ? [outcome(firstKey)] : [],
      },
    ],
    defaults: {
      email: [],
      properties: {
        analyticsTracking: { enabled: false },
      },
    },
    activities,
  }
}

export async function OPTIONS() {
  return new Response(null, { headers: CORS })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { bu = 'finclass', name, description, steps = [] } = body as {
      bu: string
      name: string
      description: string
      steps: Step[]
    }

    const subdomain = process.env.SFMC_SUBDOMAIN
    if (!subdomain || !process.env.SFMC_CLIENT_ID || !process.env.SFMC_CLIENT_SECRET) {
      return Response.json({ success: false, error: 'SFMC não configurado' }, { status: 500, headers: CORS })
    }

    const mid = MID_MAP[bu]
    if (!mid) return Response.json({ success: false, error: `MID não configurado para BU: ${bu}` }, { status: 400, headers: CORS })

    // BU token for Content Builder; enterprise token for Journey Builder (JB operates at enterprise level)
    const buToken = await getBUToken(subdomain, mid)
    const jbToken = await getEnterpriseToken(subdomain)
    const categoryId = CB_CATEGORY[bu]

    // 1. Create email assets in Content Builder (BU token)
    const assetIds: number[] = []
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      const assetName = `${name} — Email ${String(i + 1).padStart(2, '0')} — ${step.name} [${Date.now()}]`
      const id = await createEmailAsset(subdomain, buToken, assetName, step.html, step.subject, step.preheader, categoryId)
      assetIds.push(id)
    }

    // 2. Get existing EventDefinition key (enterprise token)
    const eventDefinitionKey = await getEventDefinitionKey(subdomain, jbToken)

    // 3. Create Journey Builder journey draft
    const journeyPayload = buildJourneyPayload(name, description, steps, assetIds, eventDefinitionKey)

    // Step A: POST minimal journey (no triggers, no activities) — get journeyId
    const minimalPayload = {
      key: (journeyPayload as Record<string, unknown>).key,
      name,
      description: description || '',
      workflowApiVersion: 1.0,
      triggers: [],
      activities: [],
    }
    const minRes = await fetch(
      `https://${subdomain}.rest.marketingcloudapis.com/interaction/v1/interactions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jbToken}` },
        body: JSON.stringify(minimalPayload),
      }
    )
    const minData = await minRes.json()
    if (!minRes.ok) {
      return Response.json({
        success: true, partial: true,
        warning: `CB ok. JB (minimal): ${JSON.stringify(minData)}`,
        emails: steps.map((s, i) => ({ name: s.name, assetId: assetIds[i] })),
      }, { headers: CORS })
    }

    // Step B: PUT full payload (triggers + activities) on the created journey
    const journeyId = minData.id as string
    const versionNumber = (minData.version ?? minData.versionNumber ?? 1) as number
    const fullRes = await fetch(
      `https://${subdomain}.rest.marketingcloudapis.com/interaction/v1/interactions/${journeyId}?versionNumber=${versionNumber}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jbToken}` },
        body: JSON.stringify({ ...journeyPayload, id: journeyId }),
      }
    )
    const fullData = await fullRes.json()

    const emails = steps.map((s, i) => ({ name: s.name, assetId: assetIds[i] }))

    if (!fullRes.ok) {
      return Response.json({
        success: true,
        partial: true,
        warning: `CB ok. JB criado mas PUT com atividades falhou: ${JSON.stringify(fullData)}`,
        journeyId,
        journeyName: minData.name,
        debug: {
          putUrl: `interaction/v1/interactions/${journeyId}?versionNumber=${versionNumber}`,
          minData: JSON.stringify(minData),
          fullPayload: JSON.stringify({ ...journeyPayload, id: journeyId }),
        },
        emails,
      }, { headers: CORS })
    }

    const jbData = fullData

    return Response.json({
      success: true,
      journeyId: jbData.id,
      journeyKey: jbData.key,
      journeyName: jbData.name,
      emails,
    }, { headers: CORS })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return Response.json({ success: false, error: message }, { status: 500, headers: CORS })
  }
}
