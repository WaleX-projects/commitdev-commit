import { parse } from '@bomb.sh/args';
import { CliError } from './env.ts';
import { login, logout, whoami } from './commands/auth.ts';
import { init } from './commands/init.ts';
import { hookPrePush, trigger } from './commands/hook.ts';
import { list, publish, regenerate, setStatus, show } from './commands/drafts.ts';
import { connect, connections } from './commands/connect.ts';
import { watch } from './commands/watch.ts';
import { image } from './commands/image.ts';
import { doctor } from './commands/doctor.ts';
import { dim, mint, p } from './ui.ts';

const HELP = `
${mint('cdv')} ${dim('turn tagged commits into posts')}

  login [--private]          sign in with GitHub (--private also grants private-repo access)
  logout | whoami
  init                       link this repo, install the git hook, register the webhook
  trigger [sha]              run the agent on a commit now (default HEAD)
  watch                      live review queue (Supabase Realtime)
  drafts [--status s|--all]  list drafts
  draft <id>                 show one draft
  connect <x|linkedin>       link a publishing account (connections lists them)
  approve <id> [--hold]      approve and publish (--hold approves only)
  publish <id>               publish an approved or failed draft
  reject <id>
  regenerate <id> [--feedback "shorter"]
  image <id> <file>|--snap   attach an image to a draft
  doctor                     check setup

${dim('Tag a commit:')} git commit -m "feat: realtime sync [post][linkedin][tone=casual][length=short]"
`;

const args = parse(process.argv.slice(2), {
  alias: { h: 'help', v: 'version' },
  boolean: ['help', 'version', 'private', 'all', 'snap', 'hold'],
  string: ['status', 'feedback'],
});
const [cmd, arg1, arg2] = args._.map(String);

async function main() {
  if (args.version) return console.log('0.1.0');
  if (args.help || !cmd || cmd === 'help') return console.log(HELP);
  switch (cmd) {
    case 'login': return login({ private: args.private });
    case 'logout': return logout();
    case 'whoami': return whoami();
    case 'init': return init();
    case 'trigger': return trigger(arg1);
    case 'watch': return watch();
    case 'drafts': return list({ status: args.status, all: args.all });
    case 'draft': return show(arg1);
    case 'approve': return setStatus(arg1, 'approved', { hold: args.hold });
    case 'publish': return publish(arg1);
    case 'connect': return connect(arg1);
    case 'connections': return connections();
    case 'reject': return setStatus(arg1, 'rejected');
    case 'regenerate': return regenerate(arg1, args.feedback);
    case 'image': return image(arg1, arg2, { snap: args.snap });
    case 'doctor': return doctor();
    case 'hook': if (arg1 === 'pre-push') return hookPrePush(); break;
  }
  throw new CliError(`Unknown command "${cmd}". Try \`cdv help\`.`);
}

main().then(() => process.exit(0)).catch((e) => {
  if (e instanceof CliError) p.log.error(e.message);
  else console.error(e);
  process.exit(1);
});
