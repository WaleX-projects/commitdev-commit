import { publishDraft } from '../_shared/publish.ts'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { draft_id } = await request.json() as { draft_id?: string }
    if (!draft_id) return json({ error: 'draft_id is required.' }, 400)
    const result = await publishDraft(draft_id)
    return json(result)
  } catch (error) { return json({ error: error instanceof Error ? error.message : String(error) }, 400) }
})
