import { createServerClient } from '@/lib/supabase/server'

export const maxDuration = 15

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// GET /api/ops/stats — agrega tasks e tempo por membro
export async function GET(req: Request) {
  const auth = req.headers.get('Authorization')
  if (!process.env.OPS_INTERNAL_TOKEN || auth !== `Bearer ${process.env.OPS_INTERNAL_TOKEN}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
  }

  const supabase = createServerClient()

  const [{ data: tasks }, { data: timeEntries }] = await Promise.all([
    supabase.from('ops_tasks').select('assignee_name, status, type, bu').not('assignee_name', 'is', null),
    supabase.from('ops_time_entries').select('user_name, duration_minutes').not('ended_at', 'is', null).not('user_name', 'is', null),
  ])

  const users: Record<string, {
    name: string
    assigned: number
    completed: number
    in_progress: number
    total_minutes: number
    by_bu: Record<string, number>
    by_type: Record<string, number>
  }> = {}

  for (const task of tasks ?? []) {
    const name = task.assignee_name as string
    if (!users[name]) users[name] = { name, assigned: 0, completed: 0, in_progress: 0, total_minutes: 0, by_bu: {}, by_type: {} }
    users[name].assigned++
    if (task.status === 'concluida')   users[name].completed++
    if (task.status === 'em_execucao') users[name].in_progress++
    users[name].by_bu[task.bu]     = (users[name].by_bu[task.bu] || 0) + 1
    users[name].by_type[task.type] = (users[name].by_type[task.type] || 0) + 1
  }

  for (const entry of timeEntries ?? []) {
    const name = entry.user_name as string
    if (!users[name]) users[name] = { name, assigned: 0, completed: 0, in_progress: 0, total_minutes: 0, by_bu: {}, by_type: {} }
    users[name].total_minutes += entry.duration_minutes ?? 0
  }

  const team = Object.values(users).sort((a, b) => b.assigned - a.assigned)
  return Response.json({ team }, { headers: CORS })
}

export async function OPTIONS() {
  return new Response(null, { headers: CORS })
}
