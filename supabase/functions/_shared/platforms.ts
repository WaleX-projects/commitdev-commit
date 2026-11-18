// Publishing adapters for X and LinkedIn. Pure helpers first (testable without Deno).

export type Net = 'x' | 'linkedin';
export interface Tokens {
  access_token: string;
  refresh_token?: string | null;
  expires_at?: string | null;
  account_id?: string | null;
  account_name?: string | null;
}

export const isNet = (p: string): p is Net => p === 'x' || p === 'linkedin';

/** Threads are written as posts separated by a line containing only "---". */
export function splitThread(content: string): string[] {
  return content.split(/\n\s*---\s*\n/).map((s) => s.trim()).filter(Boolean);
}

/** LinkedIn "little text" treats these as markup; '#' stays so hashtags still work. */
export function escapeLinkedIn(text: string): string {
  return text.replace(/[\\|{}@\[\]()<>*_~]/g, (c) => `\\${c}`);
}

const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function pkcePair() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  return { verifier, challenge };
}

const env = (k: string) => {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`${k} is not set (supabase secrets set ${k}=...)`);
  return v;
};

async function okJson(res: Response, what: string) {
  const text = await res.text();
  if (!res.ok) throw new Error(`${what} ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

const expiry = (secs?: number) => (secs ? new Date(Date.now() + secs * 1000).toISOString() : null);

export function authUrl(net: Net, redirectUri: string, state: string, challenge: string): string {
  if (net === 'x') {
    const u = new URL('https://x.com/i/oauth2/authorize');
    u.search = new URLSearchParams({
      response_type: 'code', client_id: env('X_CLIENT_ID'), redirect_uri: redirectUri,
      scope: 'tweet.read tweet.write users.read offline.access', state,
      code_challenge: challenge, code_challenge_method: 'S256',
    }).toString();
    return u.toString();
  }
  const u = new URL('https://www.linkedin.com/oauth/v2/authorization');
  u.search = new URLSearchParams({
    response_type: 'code', client_id: env('LINKEDIN_CLIENT_ID'), redirect_uri: redirectUri,
    scope: 'openid profile w_member_social', state,
  }).toString();
  return u.toString();
}

function xTokenRequest(body: Record<string, string>): Promise<Response> {
  const headers: Record<string, string> = { 'content-type': 'application/x-www-form-urlencoded' };
  const secret = Deno.env.get('X_CLIENT_SECRET');
  if (secret) headers.authorization = `Basic ${btoa(`${env('X_CLIENT_ID')}:${secret}`)}`;
  return fetch('https://api.x.com/2/oauth2/token', { method: 'POST', headers, body: new URLSearchParams(body) });
}

export async function exchange(net: Net, code: string, redirectUri: string, verifier: string): Promise<Tokens> {
  if (net === 'x') {
    const t = await okJson(await xTokenRequest({
      grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: env('X_CLIENT_ID'), code_verifier: verifier,
    }), 'X token');
    const me = await okJson(await fetch('https://api.x.com/2/users/me', { headers: { authorization: `Bearer ${t.access_token}` } }), 'X users/me');
    return { access_token: t.access_token, refresh_token: t.refresh_token, expires_at: expiry(t.expires_in), account_id: me.data.id, account_name: me.data.username };
  }
  const t = await okJson(await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: env('LINKEDIN_CLIENT_ID'), client_secret: env('LINKEDIN_CLIENT_SECRET') }),
  }), 'LinkedIn token');
  const me = await okJson(await fetch('https://api.linkedin.com/v2/userinfo', { headers: { authorization: `Bearer ${t.access_token}` } }), 'LinkedIn userinfo');
  return { access_token: t.access_token, refresh_token: t.refresh_token, expires_at: expiry(t.expires_in), account_id: me.sub, account_name: me.name };
}

/** Returns fresh tokens when the stored ones are (nearly) expired; otherwise the same tokens. */
export async function ensureFresh(net: Net, t: Tokens): Promise<{ tokens: Tokens; changed: boolean }> {
  if (!t.expires_at || new Date(t.expires_at).getTime() - Date.now() > 60_000) return { tokens: t, changed: false };
  if (!t.refresh_token) throw new Error(`${net} token expired and cannot be refreshed. Run \`commitdev connect ${net}\` again.`);
  if (net === 'x') {
    const r = await okJson(await xTokenRequest({ grant_type: 'refresh_token', refresh_token: t.refresh_token, client_id: env('X_CLIENT_ID') }), 'X refresh');
    return { changed: true, tokens: { ...t, access_token: r.access_token, refresh_token: r.refresh_token ?? t.refresh_token, expires_at: expiry(r.expires_in) } };
  }
  const r = await okJson(await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: t.refresh_token, client_id: env('LINKEDIN_CLIENT_ID'), client_secret: env('LINKEDIN_CLIENT_SECRET') }),
  }), 'LinkedIn refresh');
  return { changed: true, tokens: { ...t, access_token: r.access_token, refresh_token: r.refresh_token ?? t.refresh_token, expires_at: expiry(r.expires_in) } };
}

export async function postToX(t: Tokens, content: string): Promise<string> {
  const parts = splitThread(content);
  if (!parts.length) throw new Error('draft is empty');
  const over = parts.findIndex((p) => [...p].length > 280);
  if (over >= 0) throw new Error(`post ${over + 1} is over 280 characters, edit it first`);
  let replyTo: string | undefined;
  let firstId = '';
  for (const text of parts) {
    const res = await okJson(await fetch('https://api.x.com/2/tweets', {
      method: 'POST',
      headers: { authorization: `Bearer ${t.access_token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ text, ...(replyTo ? { reply: { in_reply_to_tweet_id: replyTo } } : {}) }),
    }), 'X post');
    replyTo = res.data.id;
    firstId ||= res.data.id;
  }
  return `https://x.com/${t.account_name ?? 'i'}/status/${firstId}`;
}

export async function postToLinkedIn(t: Tokens, content: string, image?: { bytes: Uint8Array; type: string }): Promise<string> {
  if (!t.account_id) throw new Error('LinkedIn account id missing, reconnect');
  const author = `urn:li:person:${t.account_id}`;
  const headers = {
    authorization: `Bearer ${t.access_token}`,
    'content-type': 'application/json',
    'linkedin-version': Deno.env.get('LINKEDIN_VERSION') ?? '202510',
    'x-restli-protocol-version': '2.0.0',
  };
  let imageUrn: string | undefined;
  if (image) {
    const init = await okJson(await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
      method: 'POST', headers, body: JSON.stringify({ initializeUploadRequest: { owner: author } }),
    }), 'LinkedIn image init');
    const put = await fetch(init.value.uploadUrl, { method: 'PUT', headers: { authorization: `Bearer ${t.access_token}`, 'content-type': image.type }, body: image.bytes });
    if (!put.ok) throw new Error(`LinkedIn image upload ${put.status}`);
    imageUrn = init.value.image;
  }
  const res = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST', headers,
    body: JSON.stringify({
      author, commentary: escapeLinkedIn(content), visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      ...(imageUrn ? { content: { media: { id: imageUrn } } } : {}),
      lifecycleState: 'PUBLISHED', isReusableContent: false,
    }),
  });
  if (res.status !== 201) throw new Error(`LinkedIn post ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return `https://www.linkedin.com/feed/update/${res.headers.get('x-restli-id') ?? ''}`;
}
