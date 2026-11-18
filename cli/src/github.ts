export async function createWebhook(token: string, fullName: string, url: string, secret: string): Promise<'created' | 'exists' | { error: string }> {
  const res = await fetch(`https://api.github.com/repos/${fullName}/hooks`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': 'commitdev' },
    body: JSON.stringify({ name: 'web', active: true, events: ['push'], config: { url, content_type: 'json', secret, insecure_ssl: '0' } }),
  });
  if (res.status === 201) return 'created';
  const body = await res.text();
  if (res.status === 422 && /already exists/i.test(body)) return 'exists';
  return { error: `GitHub ${res.status}: ${body.slice(0, 200)}` };
}
