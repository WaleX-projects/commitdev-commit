# CommitDev

CommitDev turns tagged git commits into reviewable social posts. The frontend is a Vite static SPA backed by Supabase Auth, Postgres with RLS, Realtime, Storage, and Edge Functions.

## Local development

Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. `VITE_CLI_INSTALL_CMD` defaults to `bun add -g commitdev`. Install with Bun and run `bun run dev`; the project is also verifiable with npm when Bun is unavailable.

## Deployment

Build the static SPA with `bun run build` and deploy the generated `dist` directory to Vercel or another static host that supports the included SPA fallback. Add the Supabase Auth redirect URL `<origin>/auth/callback` in the Supabase dashboard. Add `<origin>/connect/callback` as the app redirect URL in both the X and LinkedIn developer applications.

Set the exact origin allowlist for the connection function with:

```sh
supabase secrets set WEB_ORIGIN=<origin>[,<other origins>]
```

Deploy the edge functions with:

```sh
npx supabase functions deploy connect publish-draft compose-post --use-api
```

The `compose-post` function is configured with `verify_jwt = true`. The browser only uses the Supabase URL, anonymous key, and CLI install command; never place a service-role key or third-party secret in frontend environment variables.

## Routes

The application includes the public landing page at `/`, plus `/drafts`, `/drafts/:id`, `/repos`, `/connections`, `/compose`, `/cli`, `/login`, `/auth/callback`, and `/connect/callback`. Vercel and `public/_redirects` route unknown application paths back to `index.html`.
