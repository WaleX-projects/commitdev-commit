import { CliError } from '../env.ts';
import { requireUser } from '../client.ts';
import { type Draft, publishDraft, regenerate, showDraft } from './drafts.ts';
import { dim, intro, mint, ok, p, shortId } from '../ui.ts';

export async function watch() {
  intro('watch');
  const { client, user, accessToken } = await requireUser();
  await client.auth.startAutoRefresh();
  client.realtime.setAuth(accessToken);

  const seen = new Set<string>();
  const queue: Draft[] = [];
  let busy = false;

  const enqueue = (d: Draft) => {
    const key = `${d.id}:${d.revision}`;
    if (d.status !== 'ready' || seen.has(key)) return;
    seen.add(key);
    queue.push(d);
    void pump();
  };

  async function review(initial: Draft) {
    let d = initial;
    for (;;) {
      showDraft(d);
      const action = ok(await p.select({
        message: `Draft for ${d.platform}${d.image_path ? ' (with image)' : ''}`,
        options: [
          { value: 'approve', label: 'Approve' },
          { value: 'edit', label: 'Edit text' },
          { value: 'regen', label: 'Regenerate with feedback' },
          { value: 'reject', label: 'Reject' },
          { value: 'skip', label: 'Skip for now' },
        ],
      }));
      if (action === 'skip') return;
      if (action === 'approve' || action === 'reject') {
        const status = action === 'approve' ? 'approved' : 'rejected';
        const { error } = await client.from('drafts').update({ status }).eq('id', d.id);
        p.log[error ? 'error' : 'success'](error ? error.message : `${shortId(d.id)} ${status}.`);
        if (!error && status === 'approved') await publishDraft(client, d.id);
        return;
      }
      if (action === 'edit') {
        const content = ok(await p.text({ message: 'Edit', initialValue: d.content ?? '', validate: (v) => (v?.trim() ? undefined : 'Cannot be empty') }));
        await client.from('drafts').update({ content }).eq('id', d.id);
        d = { ...d, content };
      } else {
        const feedback = ok(await p.text({ message: 'What should change?', placeholder: 'shorter, less salesy, mention the migration' }));
        await regenerate(d.id, feedback);
        const { data } = await client.from('drafts').select('*').eq('id', d.id).single();
        if (data) { d = data as Draft; seen.add(`${d.id}:${d.revision}`); }
      }
    }
  }

  async function pump() {
    if (busy) return;
    busy = true;
    try {
      while (queue.length) await review(queue.shift()!);
      p.log.message(dim('Listening for new drafts... (Ctrl+C to quit)'));
    } finally {
      busy = false;
    }
  }

  const channel = client
    .channel(`drafts-${user.id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'drafts', filter: `owner_id=eq.${user.id}` }, (payload) => {
      if (payload.eventType === 'DELETE') return;
      const d = payload.new as Draft;
      if (!busy) p.log.info(`New draft ready: ${mint(shortId(d.id))} ${d.platform}`);
      enqueue(d);
    });

  await new Promise<void>((resolve, reject) => {
    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') resolve();
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') reject(new CliError(`Realtime: ${status} ${err?.message ?? ''}`));
    });
  });

  // backlog: anything already waiting for review
  const { data: backlog } = await client.from('drafts').select('*').eq('status', 'ready').order('created_at');
  (backlog as Draft[] | null)?.forEach(enqueue);
  if (!backlog?.length) p.log.message(dim('Listening for new drafts... (Ctrl+C to quit)'));

  await new Promise<void>((resolve) => {
    process.once('SIGINT', async () => { await client.removeChannel(channel); await client.auth.stopAutoRefresh(); resolve(); });
  });
  p.outro(mint('Bye.'));
  process.exit(0);
}
