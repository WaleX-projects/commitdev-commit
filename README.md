# CommitDev

Tag a commit, get a post. Git + GitHub + Supabase (REST, Realtime, Auth, Storage, Edge Functions) + Bombshell (`@clack/prompts`, `@bomb.sh/args`).

```
git commit -m "feat: realtime sync [post][linkedin][tone=casual][length=short]"
git push
  ├─ pre-push hook ─► commitdev ─► edge fn generate-draft ─┐   (idempotent:
  └─ GitHub webhook ───────────► edge fn github-webhook ───┘    unique repo+sha+platform)
                                         │ insert drafts (service role) + LLM
                                         ▼
                      Postgres `drafts`  ──Realtime──►  `commitdev watch` (approve/edit/regen)
```

Tags: `[post]` `[draft]` `[commitdev]` trigger; `[linkedin] [x] [devto] [hashnode]`; `[tone=..] [length=short|medium|long] [focus=..]`. Tag only triggers; no platform tag means repo defaults.

## Backend setup
```sh
supabase init   # then merge supabase/config.toml
supabase link --project-ref <ref>
supabase db push
supabase secrets set ANTHROPIC_API_KEY=... GITHUB_TOKEN=...   # GITHUB_TOKEN optional: diffs for private repos via webhook
supabase secrets set X_CLIENT_ID=... X_CLIENT_SECRET=... LINKEDIN_CLIENT_ID=... LINKEDIN_CLIENT_SECRET=...
supabase functions deploy generate-draft github-webhook connect publish-draft
```
GitHub: create an OAuth App, callback = `https://<ref>.supabase.co/auth/v1/callback`, enable the GitHub provider in Supabase, and add `http://127.0.0.1:8976/callback` to Auth redirect URLs.

## CLI
```sh
cd cli && bun install && bun run build && bun link   # or: bun run dev <cmd>
commitdev login          # PKCE via loopback; asks for Supabase URL + anon key on first run
cd your-repo && commitdev init
commitdev watch
```

## Publishing (X and LinkedIn)
Register `http://127.0.0.1:8976/callback` as a redirect URL in both developer apps.
- X: OAuth 2.0 app with scopes tweet.read tweet.write users.read offline.access. Threads: separate posts with a line containing only `---`. Each post must be 280 chars or fewer. Images are not posted to X yet.
- LinkedIn: app with "Share on LinkedIn" and "Sign In with OpenID Connect" products. Images are supported. `LINKEDIN_VERSION` secret overrides the API version header (default 202510); bump it if LinkedIn rejects it.

```sh
commitdev connect x && commitdev connect linkedin
commitdev approve <id>          # approves, then publishes. --hold approves only
commitdev publish <id>          # retry an approved or failed draft
```
`publish-draft` claims the draft atomically (status `pending` while in flight), so two terminals cannot double-post. Tokens live in `integrations`; clients can read only who is connected, never the tokens. They are plaintext at rest in Postgres; move them to Supabase Vault before real users.

## Notes / not built yet
- Dev.to and Hashnode publishing; X image upload.
- Hook is appended to the end of `pre-push`; an existing hook that `exit`s earlier will skip it. The webhook path covers that.
- Secret-looking diff lines are redacted before the LLM and storage, but review drafts before approving.
- Nothing here was run against live Supabase, X or LinkedIn (no Deno, Postgres or network access in the build sandbox). The CLI typechecks and the pure helpers were tested. Expect to fix small API details on first run: `supabase functions serve` and a throwaway X account are the safest start.
- Realtime delivery relies on RLS; the CLI uses the user's JWT, never the service key.
