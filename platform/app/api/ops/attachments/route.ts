import { createServerClient } from '@/lib/supabase/server'

export const maxDuration = 30

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/csv',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]

const MAX_SIZE = 4 * 1024 * 1024 // 4MB (limite Vercel)

// POST /api/ops/attachments — upload de arquivo para Supabase Storage
export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const taskId  = form.get('task_id') as string | null
    const file    = form.get('file') as File | null

    if (!taskId || !file) {
      return Response.json({ success: false, error: 'task_id e file são obrigatórios' }, { status: 400, headers: CORS })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json({ success: false, error: 'Tipo de arquivo não permitido' }, { status: 400, headers: CORS })
    }

    if (file.size > MAX_SIZE) {
      return Response.json({ success: false, error: 'Arquivo excede 4MB' }, { status: 400, headers: CORS })
    }

    const supabase = createServerClient()

    // Garante que a task existe
    const { data: task } = await supabase.from('ops_tasks').select('id').eq('id', taskId).single()
    if (!task) {
      return Response.json({ success: false, error: 'Task não encontrada' }, { status: 404, headers: CORS })
    }

    const ext = file.name.split('.').pop()
    const storagePath = `${taskId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const buffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from('ops-attachments')
      .upload(storagePath, buffer, { contentType: file.type, upsert: false })

    if (uploadError) throw new Error(uploadError.message)

    const { error: dbError } = await supabase.from('ops_attachments').insert({
      task_id:      taskId,
      filename:     file.name,
      storage_path: storagePath,
      file_size:    file.size,
    })

    if (dbError) throw new Error(dbError.message)

    return Response.json({ success: true, path: storagePath }, { headers: CORS })
  } catch (e) {
    return Response.json(
      { success: false, error: e instanceof Error ? e.message : 'Erro desconhecido' },
      { status: 500, headers: CORS }
    )
  }
}

export async function OPTIONS() {
  return new Response(null, { headers: CORS })
}
