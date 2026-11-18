// POST { action: 'start', platform, redirect_uri }                          -> { url, state, verifier }
// POST { action: 'finish', platform, code, redirect_uri, verifier }         -> stores tokens
import { createClient } from 'npm:@supabase/supabase-js@2';
import { authUrl, exchange, isNet, pkcePair } from '../_shared/platforms.ts';

const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);

  const body = await req.json().catch(() => ({}));
  const { action, platform, redirect_uri } = body as Record<string, string>;
  if (!isNet(platform)) return json({ error: 'platform must be x or linkedin' }, 400);
  if (!redirect_uri?.startsWith('http://127.0.0.1:')) return json({ error: 'redirect_uri must be a loopback address' }, 400);

  try {
    if (action === 'start') {
      const { verifier, challenge } = await pkcePair();
      const state = crypto.randomUUID();
      return json({ url: authUrl(platform, redirect_uri, state, challenge), state, verifier });
    }
    if (action === 'finish') {
      const tokens = await exchange(platform, body.code, redirect_uri, body.verifier);
      const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const { error } = await admin.from('integrations').upsert({ owner_id: user.id, platform, ...tokens }, { onConflict: 'owner_id,platform' });
      if (error) throw new Error(error.message);
      return json({ ok: true, account: tokens.account_name });
    }
    return json({ error: 'unknown action' }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 502);
  }
});
