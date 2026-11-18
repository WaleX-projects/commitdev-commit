import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { publishDraft } from '../_shared/publish.ts'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

function xParts(content: string) { return content.replace(/\r\n/g, '\n').split('\n').reduce((parts: string[], line) => { if (line === '---') parts.push(''); else parts[parts.length - 1] += `${parts[parts.length - 1] ? '\n' : ''}${line}`; return parts }, ['']) }

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const auth = request.headers.get('Authorization')?.replace('Bearer ', '')
    const { data: { user }, error: authError } = await admin.auth.getUser(auth)
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)
    const body = await request.json() as { repo_id?: string; platform?: 'linkedin' | 'x' | 'devto' | 'hashnode'; content?: string; publish?: boolean }
    if (!body.repo_id) return json({ error: 'Add a repo first' }, 400)
    const { data: repo, error: repoError } = await admin.from('repos').select('id,owner_id').eq('id', body.repo_id).eq('owner_id', user.id).maybeSingle()
    if (repoError) throw repoError
    if (!repo) return json({ error: 'Add a repo first' }, 400)
    if (!body.platform || !['linkedin', 'x', 'devto', 'hashnode'].includes(body.platform)) return json({ error: 'Invalid platform.' }, 400)
    const content = body.content?.trim() ?? ''
    if (!content) return json({ error: 'Content cannot be empty.' }, 400)
    if (body.platform === 'x' && xParts(content).some((part) => part.length > 280)) return json({ error: 'Each X part must be at most 280 characters.' }, 400)
    if (body.platform !== 'x' && content.length > 3000) return json({ error: 'Content must be at most 3000 characters.' }, 400)
    const { data: draft, error: insertError } = await admin.from('drafts').insert({ repo_id: body.repo_id, owner_id: user.id, commit_sha: `manual-${crypto.randomUUID()}`, commit_message: 'Manual post', tags: {}, platform: body.platform, content, status: 'approved' }).select('id').single()
    if (insertError) throw insertError
    if (body.publish) { const result = await publishDraft(draft.id); return json({ ok: true, draft_id: draft.id, url: result.url }) }
    return json({ ok: true, draft_id: draft.id })
  } catch (error) { return json({ error: error instanceof Error ? error.message : String(error) }, 400) }
})
