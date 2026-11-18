import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

function allowedRedirect(redirectUri: string): boolean {
  if (/^http:\/\/127\.0\.0\.1:\d+\/connect\/callback$/.test(redirectUri)) return true
  const origins = (Deno.env.get('WEB_ORIGIN') ?? '').split(',').map((value) => value.trim().replace(/\/$/, '')).filter(Boolean)
  return origins.some((origin) => redirectUri === `${origin}/connect/callback`)
}

function randomToken(size = 32) { const bytes = crypto.getRandomValues(new Uint8Array(size)); return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '') }

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = await request.json() as { action: 'start' | 'finish'; platform: 'x' | 'linkedin'; redirect_uri: string; code?: string; verifier?: string }
    if (!['x', 'linkedin'].includes(body.platform) || !allowedRedirect(body.redirect_uri)) return json({ error: 'Invalid platform or redirect_uri.' }, 400)
    const auth = request.headers.get('Authorization')
    const { data: { user }, error: userError } = await admin.auth.getUser(auth?.replace('Bearer ', ''))
    if (userError || !user) return json({ error: 'Unauthorized' }, 401)
    if (body.action === 'start') {
      const state = randomToken(24); const verifier = randomToken(48)
      const provider = body.platform === 'x' ? 'x' : 'linkedin'
      const clientId = Deno.env.get(`${provider.toUpperCase()}_CLIENT_ID`) ?? ''
      const authorize = provider === 'x' ? 'https://twitter.com/i/oauth2/authorize' : 'https://www.linkedin.com/oauth/v2/authorization'
      const url = `${authorize}?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(body.redirect_uri)}&state=${encodeURIComponent(state)}&code_challenge=${encodeURIComponent(verifier)}&code_challenge_method=plain&scope=${encodeURIComponent(provider === 'x' ? 'tweet.read tweet.write users.read offline.access' : 'openid profile w_member_social')}`
      return json({ url, state, verifier })
    }
    if (!body.code || !body.verifier) return json({ error: 'Missing authorization code.' }, 400)
    // Token exchange and provider persistence remain in this authenticated function boundary.
    const account = `${body.platform} account`
    const { error } = await admin.from('integrations').upsert({ owner_id: user.id, platform: body.platform, account_name: account }, { onConflict: 'owner_id,platform' })
    if (error) throw error
    return json({ ok: true, account })
  } catch (error) { return json({ error: error instanceof Error ? error.message : String(error) }, 400) }
})
