export const maxDuration = 10

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// POST /api/ops/squad/login — valida token + nome, retorna ok
export async function POST(req: Request) {
  const { token, name } = await req.json()

  if (!token || !name?.trim()) {
    return Response.json({ ok: false, error: 'Token e nome obrigatórios' }, { status: 400, headers: CORS })
  }

  if (token !== process.env.OPS_INTERNAL_TOKEN) {
    return Response.json({ ok: false, error: 'Token inválido' }, { status: 401, headers: CORS })
  }

  return Response.json({ ok: true, name: name.trim() }, { headers: CORS })
}

export async function OPTIONS() {
  return new Response(null, { headers: CORS })
}
