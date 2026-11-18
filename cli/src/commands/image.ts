import { spawnSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';
import { CliError } from '../env.ts';
import { requireUser } from '../client.ts';
import { resolveDraft } from './drafts.ts';
import { dim, mint, p, shortId } from '../ui.ts';

const TYPES: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };
const MAX_BYTES = 5 * 1024 * 1024;

function snap(): string {
  const out = join(tmpdir(), `commitdev-${Date.now()}.jpg`);
  const cmd = process.platform === 'darwin' ? ['imagesnap', ['-w', '1', out]]
    : process.platform === 'linux' ? ['ffmpeg', ['-y', '-loglevel', 'error', '-f', 'video4linux2', '-i', '/dev/video0', '-frames:v', '1', out]]
    : null;
  if (!cmd) throw new CliError('--snap is supported on macOS (brew install imagesnap) and Linux (ffmpeg).');
  const r = spawnSync(cmd[0] as string, cmd[1] as string[], { stdio: 'inherit' });
  if (r.error || r.status !== 0) throw new CliError(`Could not capture a photo with ${cmd[0]}.`);
  return out;
}

/** commitdev image <draft-id> <file>  |  commitdev image <draft-id> --snap */
export async function image(id: string | undefined, file: string | undefined, flags: { snap?: boolean }) {
  const { client, user } = await requireUser();
  const d = await resolveDraft(client, id);
  const path = flags.snap ? snap() : file;
  if (!path) throw new CliError('Give an image path or use --snap.');
  const type = TYPES[extname(path).toLowerCase()];
  if (!type) throw new CliError('Supported images: png, jpg, gif, webp.');
  if (statSync(path).size > MAX_BYTES) throw new CliError('Image is larger than 5 MB.');

  const key = `${user.id}/${d.id}/${Date.now()}-${basename(path).replace(/[^\w.-]/g, '_')}`;
  const s = p.spinner();
  s.start('Uploading');
  const up = await client.storage.from('post-images').upload(key, readFileSync(path), { contentType: type });
  if (up.error) { s.stop('Failed'); throw new CliError(up.error.message); }
  const { error } = await client.from('drafts').update({ image_path: key }).eq('id', d.id);
  if (error) { s.stop('Failed'); throw new CliError(error.message); }
  s.stop(`Attached to ${mint(shortId(d.id))} ${dim(key)}`);
}
