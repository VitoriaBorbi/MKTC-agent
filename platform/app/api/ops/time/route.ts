import { createServerClient } from '@/lib/supabase/server'

export const maxDuration = 15

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function authOk(req: Request) {
  return req.headers.get('Authorization') === `Bearer ${process.env.OPS_INTERNAL_TOKEN}`
}

// POST /api/ops/time
// { action:'start', task_id, user_name }  → cria entry, retorna entry_id
// { action:'stop',  entry_id, note? }     → fecha entry, calcula duração
export async function POST(req: Request) {
  if (!authOk(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
  }

  const body = await req.json()
  const supabase = createServerClient()

  if (body.action === 'start') {
    const { task_id, user_name } = body
    if (!task_id || !user_name) {
      return Response.json({ error: 'task_id e user_name obrigatórios' }, { status: 400, headers: CORS })
    }

    const { data, error } = await supabase
      .from('ops_time_entries')
      .insert({ task_id, user_name, started_at: new Date().toISOString() })
      .select('id')
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500, headers: CORS })
    return Response.json({ ok: true, entry_id: data.id }, { headers: CORS })
  }

  if (body.action === 'stop') {
    const { entry_id, note } = body
    if (!entry_id) {
      return Response.json({ error: 'entry_id obrigatório' }, { status: 400, headers: CORS })
    }

    const { data: entry } = await supabase
      .from('ops_time_entries')
      .select('started_at')
      .eq('id', entry_id)
      .single()

    if (!entry) return Response.json({ error: 'Entry não encontrada' }, { status: 404, headers: CORS })

    const ended_at = new Date()
    const started = new Date(entry.started_at)
    const duration_minutes = Math.round((ended_at.getTime() - started.getTime()) / 60000)

    const { error } = await supabase
      .from('ops_time_entries')
      .update({ ended_at: ended_at.toISOString(), duration_minutes, note: note || null })
      .eq('id', entry_id)

    if (error) return Response.json({ error: error.message }, { status: 500, headers: CORS })
    return Response.json({ ok: true, duration_minutes }, { headers: CORS })
  }

  return Response.json({ error: 'action inválida' }, { status: 400, headers: CORS })
}

// GET /api/ops/time?user_name=X — retorna timer ativo do usuário
export async function GET(req: Request) {
  if (!authOk(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
  }

  const { searchParams } = new URL(req.url)
  const user_name = searchParams.get('user_name')
  if (!user_name) return Response.json({ active: null }, { headers: CORS })

  const supabase = createServerClient()
  const { data } = await supabase
    .from('ops_time_entries')
    .select('id, task_id, started_at, ops_tasks(protocol, title)')
    .eq('user_name', user_name)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  return Response.json({ active: data || null }, { headers: CORS })
}

export async function OPTIONS() {
  return new Response(null, { headers: CORS })
}
