import { createServerClient } from '@/lib/supabase/server'

export const maxDuration = 15

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function ok(data: unknown) {
  return Response.json(data, { headers: CORS })
}
function err(msg: string, status = 500) {
  return Response.json({ success: false, error: msg }, { status, headers: CORS })
}

// GET /api/ops/tasks/[id] — busca por protocolo ou UUID (stakeholder acompanha)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerClient()

  // Tenta por protocolo primeiro (ex: MKTC-2026-0001), depois por UUID
  const isUUID = /^[0-9a-f-]{36}$/i.test(id)
  const { data, error } = isUUID
    ? await supabase.from('ops_tasks').select('*, ops_attachments(*)').eq('id', id).single()
    : await supabase.from('ops_tasks').select('*, ops_attachments(*)').eq('protocol', id).single()

  if (error || !data) return err('Task não encontrada', 404)

  // Gera signed URLs para cada anexo (expiram em 1h)
  type Attachment = { storage_path: string; [key: string]: unknown }
  const attachments = await Promise.all(
    ((data.ops_attachments ?? []) as Attachment[]).map(async (att) => {
      const { data: signed } = await supabase.storage
        .from('ops-attachments')
        .createSignedUrl(att.storage_path, 3600)
      return { ...att, signed_url: signed?.signedUrl ?? null }
    })
  )

  return ok({ task: { ...data, ops_attachments: attachments } })
}

// PUT /api/ops/tasks/[id] — atualiza task (squad ou próprio stakeholder para edição pós-submit)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Campos permitidos para atualização pelo stakeholder (sem auth)
  const STAKEHOLDER_FIELDS = [
    'title', 'description', 'links', 'requested_deadline',
    'is_deadline_flexible', 'consequences_of_delay', 'is_campaign_linked',
    'campaign_linked', 'is_recurrent', 'impact_type', 'type',
  ]
  // Campos extras permitidos para squad (com token)
  const SQUAD_FIELDS = [...STAKEHOLDER_FIELDS, 'status', 'assigned_to', 'assignee_name', 'priority_score', 'priority_label']

  const isSquad =
    !!process.env.OPS_INTERNAL_TOKEN &&
    req.headers.get('Authorization') === `Bearer ${process.env.OPS_INTERNAL_TOKEN}`

  const allowedFields = isSquad ? SQUAD_FIELDS : STAKEHOLDER_FIELDS

  const body = await req.json()
  const update: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (body[key] !== undefined) update[key] = body[key]
  }

  if (!Object.keys(update).length) {
    return err('Nenhum campo válido para atualizar', 400)
  }

  const supabase = createServerClient()

  // Stakeholder só pode editar tasks com status 'recebida'
  if (!isSquad) {
    const { data: existing } = await supabase
      .from('ops_tasks')
      .select('status')
      .eq('id', id)
      .single()
    if (existing?.status !== 'recebida') {
      return err('Task não pode mais ser editada (já em execução)', 403)
    }
  }

  const { data, error } = await supabase
    .from('ops_tasks')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return err(error.message)
  return ok({ success: true, task: data })
}

export async function OPTIONS() {
  return new Response(null, { headers: CORS })
}
