import * as p from '@clack/prompts';

const color = !process.env.NO_COLOR && process.stdout.isTTY;
const rgb = (r: number, g: number, b: number) => (s: string) => (color ? `\x1b[38;2;${r};${g};${b}m${s}\x1b[39m` : s);

export const mint = rgb(52, 211, 153); // emerald-400
export const dim = (s: string) => (color ? `\x1b[2m${s}\x1b[22m` : s);
const amber = rgb(251, 191, 36);
const red = rgb(248, 113, 113);

export const STATUS_COLOR: Record<string, (s: string) => string> = {
  pending: amber, ready: mint, approved: mint, published: mint, rejected: dim, failed: red,
};
export const badge = (status: string) => (STATUS_COLOR[status] ?? dim)(status.padEnd(9));
export const shortId = (id: string) => id.slice(0, 8);

export const intro = (title: string) => p.intro(mint(` commitdev `) + dim(` ${title}`));
export { p };

/** Exit cleanly when the user hits Ctrl+C inside a prompt. */
export function ok<T>(value: T): Exclude<T, symbol> {
  if (p.isCancel(value)) {
    p.cancel('Cancelled.');
    process.exit(130);
  }
  return value as Exclude<T, symbol>;
}
