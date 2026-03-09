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
      preheader: { content: preheader || '' },
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

    const emailNext = isLast ? [] : nextDelay && nextDelay.delay > 0
      ? [{ next: waitKey }]
      : [{ next: nextEmailKey }]

    activities.push({
      key: emailKey,
      name: step.name,
      type: 'EMAILV2',
      outcomes: emailNext,
      arguments: {},
      configurationArguments: {
        applicationExtensionKey: 'jb-email-activity',
        triggeredSendDefinitionObjectID: '',
        emailEncoding: 'UTF-8',
        contentId: assetIds[i],
      },
      metaData: { version: 1 },
    })

    if (!isLast && nextDelay && nextDelay.delay > 0) {
      const unit = (nextDelay.delayUnit || 'days').toUpperCase()
      activities.push({
        key: waitKey,
        name: `Aguardar ${nextDelay.delay} ${unit === 'HOURS' ? 'horas' : 'dias'}`,
        type: 'WAIT',
        outcomes: [{ next: nextEmailKey }],
        arguments: {},
        configurationArguments: {
          waitDuration: nextDelay.delay,
          waitUnit: unit === 'HOURS' ? 'HOURS' : 'DAYS',
        },
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
        type: 'APIEvent',
        metaData: {
          eventDefinitionKey: `APIEvent-${crypto.randomUUID()}`,
          configurationArguments: {},
        },
        outcomes: activities.length > 0 ? [{ next: firstKey }] : [],
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
      const assetName = `${name} — Email ${String(i + 1).padStart(2, '0')} — ${step.name}`
      const id = await createEmailAsset(subdomain, token, assetName, step.html, step.subject, step.preheader, categoryId)
      assetIds.push(id)
    }

    // 2. Create Journey Builder journey draft
    const journeyPayload = buildJourneyPayload(name, description, steps, assetIds)

    const jbRes = await fetch(
      `https://${subdomain}.rest.marketingcloudapis.com/interaction/v1/interactions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(journeyPayload),
      }
    )
    const jbData = await jbRes.json()

    const emails = steps.map((s, i) => ({ name: s.name, assetId: assetIds[i] }))

    if (!jbRes.ok) {
      // Emails were created — partial success
      return Response.json({
        success: true,
        partial: true,
        warning: `Emails criados no Content Builder, mas Journey Builder retornou erro: ${JSON.stringify(jbData).slice(0, 300)}`,
        emails,
      }, { headers: CORS })
    }

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
