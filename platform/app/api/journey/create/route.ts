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
  if (!res.ok) throw new Error(`Auth SFMC falhou (${res.status})`)
  const data = await res.json()
  return data.access_token as string
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
  assetIds: number[]
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
        metaData: {
          eventDefinitionKey: `APIEvent-${crypto.randomUUID()}`,
        },
        outcomes: activities.length > 0 ? [outcome(firstKey)] : [],
      },
    ],
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

    const token = await getBUToken(subdomain, mid)
    const categoryId = CB_CATEGORY[bu]

    // 1. Create email assets in Content Builder
    const assetIds: number[] = []
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      const assetName = `${name} — Email ${String(i + 1).padStart(2, '0')} — ${step.name} [${Date.now()}]`
      const id = await createEmailAsset(subdomain, token, assetName, step.html, step.subject, step.preheader, categoryId)
      assetIds.push(id)
    }

    // 2. Create Journey Builder journey draft
    const journeyPayload = buildJourneyPayload(name, description, steps, assetIds)

    // Try bare journey first (no activities) to isolate issue
    const barePayload = {
      key: (journeyPayload as Record<string, unknown>).key,
      name,
      description: description || '',
      workflowApiVersion: 1.0,
      triggers: (journeyPayload as Record<string, unknown>).triggers,
      activities: [],
    }

    const bareRes = await fetch(
      `https://${subdomain}.rest.marketingcloudapis.com/interaction/v1/interactions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(barePayload),
      }
    )
    const bareData = await bareRes.json()

    // If bare journey fails, it's a fundamental issue (token/trigger)
    if (!bareRes.ok) {
      const emails = steps.map((s, i) => ({ name: s.name, assetId: assetIds[i] }))
      return Response.json({
        success: true,
        partial: true,
        warning: `CB ok. JB (bare): ${JSON.stringify(bareData)}`,
        debug: { barePayload: JSON.stringify(barePayload) },
        emails,
      }, { headers: CORS })
    }

    // Bare worked — now try full journey with activities
    const journeyId = bareData.id as string
    const fullRes = await fetch(
      `https://${subdomain}.rest.marketingcloudapis.com/interaction/v1/interactions/${journeyId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...journeyPayload, id: journeyId }),
      }
    )
    const fullData = await fullRes.json()

    const emails = steps.map((s, i) => ({ name: s.name, assetId: assetIds[i] }))

    if (!fullRes.ok) {
      return Response.json({
        success: true,
        partial: true,
        warning: `CB ok. JB rascunho criado (sem atividades). PUT com atividades falhou: ${JSON.stringify(fullData)}`,
        journeyId,
        journeyName: bareData.name,
        debug: { activitiesPayload: JSON.stringify((journeyPayload as Record<string, unknown>).activities) },
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
