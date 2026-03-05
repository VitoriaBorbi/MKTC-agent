import { createServerClient } from '@/lib/supabase/server'

export const maxDuration = 30

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function ok(data: unknown) {
  return Response.json(data, { headers: CORS })
}
function err(msg: string, status = 500) {
  return Response.json({ success: false, error: msg }, { status, headers: CORS })
}

// Priorização por regras (M1 — IA entra no M2)
function calcPriority(task: Record<string, unknown>) {
  const today = new Date()
  const deadline = task.requested_deadline
    ? new Date(task.requested_deadline as string)
    : null
  const days = deadline
    ? Math.ceil((deadline.getTime() - today.getTime()) / 86400000)
    : null

  let score = 30
  const factors: string[] = []

  if (days !== null) {
    if (days <= 1)      { score += 50; factors.push('prazo em 1 dia') }
    else if (days <= 3) { score += 35; factors.push('prazo em 3 dias') }
    else if (days <= 7) { score += 20; factors.push('prazo em 7 dias') }
    if (!task.is_deadline_flexible) { score += 10; factors.push('prazo fixo') }
  }
  // Urgência declarada (1-5) influencia diretamente o score
  if (task.urgency_level) {
    const bonus = [0, 0, 5, 15, 25, 40][task.urgency_level as number] ?? 0
    if (bonus > 0) { score += bonus; factors.push(`urgência ${task.urgency_level}`) }
  }

  score = Math.min(score, 100)
  const label = score >= 70 ? 'Alta' : score >= 45 ? 'Media' : 'Baixa'
  const justification = factors.length
    ? `Prioridade calculada com base em: ${factors.join(', ')}.`
    : 'Prioridade padrão — sem prazo ou contexto definido.'

  return { score, label, justification }
}

// POST /api/ops/tasks — cria task (público, sem auth)
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      requester_name, requester_email, bu, bu_subdivision,
      title, type, description, links = [],
      requested_deadline, is_deadline_flexible = false,
      urgency_level, urgency_details,
    } = body

    if (!requester_name || !requester_email || !bu || !title || !type) {
      return err('Campos obrigatórios faltando: requester_name, requester_email, bu, title, type', 400)
    }

    const supabase = createServerClient()

    // Gera protocolo sequencial por ano
    const year = new Date().getFullYear()
    const { count } = await supabase
      .from('ops_tasks')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${year}-01-01`)
    const seq = String((count ?? 0) + 1).padStart(4, '0')
    const protocol = `MKTC-${year}-${seq}`

    const { score, label, justification } = calcPriority({
      requested_deadline, is_deadline_flexible, urgency_level,
    })

    const { data, error } = await supabase
      .from('ops_tasks')
      .insert({
        protocol, title, type, description, bu,
        bu_subdivision: bu_subdivision || null,
        links: links.filter(Boolean),
        status: 'recebida',
        priority_score: score,
        priority_label: label,
        priority_justification: justification,
        requested_deadline: requested_deadline || null,
        is_deadline_flexible,
        urgency_level: urgency_level || null,
        urgency_details: urgency_level === 5 ? urgency_details : null,
        requester_name,
        requester_email,
      })
      .select('id, protocol, priority_label, priority_score')
      .single()

    if (error) throw new Error(error.message)

    return ok({ success: true, protocol: data.protocol, id: data.id, priority_label: data.priority_label })
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Erro desconhecido')
  }
}

// GET /api/ops/tasks — lista tasks (squad, requer token interno)
export async function GET(req: Request) {
  const auth = req.headers.get('Authorization')
  if (!process.env.OPS_INTERNAL_TOKEN || auth !== `Bearer ${process.env.OPS_INTERNAL_TOKEN}`) {
    return err('Unauthorized', 401)
  }

  const { searchParams } = new URL(req.url)
  const bu     = searchParams.get('bu')
  const status = searchParams.get('status')
  const limit  = parseInt(searchParams.get('limit') ?? '100')

  const supabase = createServerClient()
  let query = supabase
    .from('ops_tasks')
    .select('*')
    .order('priority_score', { ascending: false })
    .limit(limit)

  if (bu)     query = query.eq('bu', bu)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return err(error.message)

  return ok({ tasks: data })
}

export async function OPTIONS() {
  return new Response(null, { headers: CORS })
}
