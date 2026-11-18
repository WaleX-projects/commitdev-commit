# CommitDev delivery checklist

## Scaffold and runtime
- [x] Bun/Vite/React 19/strict TypeScript app exists with the requested dependencies and local Geist fonts.
- [x] Static SPA build, Vercel config, `_redirects`, `.env.example`, route manifest, and README deployment section are present.
- [x] TypeScript diagnostics are registered for the project.

## Auth and application shell
- [x] GitHub OAuth uses PKCE, scopes `public_repo write:repo_hook`, and `${location.origin}/auth/callback`.
- [x] Protected routes redirect to `/login`; the user menu shows avatar, `github_login`, and sign out.
- [x] Sidebar contains Drafts, Compose, Repos, Connections and Get CLI, includes the ready count pill, supports a mobile drawer, skeletons, and an error boundary.
- [x] One app-shell Realtime subscription listens for draft INSERT and UPDATE events filtered by the signed-in owner, updates TanStack Query cache, and toasts when a draft becomes ready.

## Draft review
- [x] `/drafts` has Needs review, Approved, Published, Rejected/Failed, and All tabs; cards show platform, repo, short SHA, first content line, status and relative time.
- [x] Empty state includes `git commit -m "feat: x [post][linkedin]"`.
- [x] `/drafts/:id` provides editor, exact X/LinkedIn counters, explicit content-only Save, private image upload/signing/removal, platform preview, commit/tags/status/error/revision, and status-aware actions.
- [x] Approve & publish, Approve only, Reject, Regenerate with feedback, Retry publish, and Delete honor current status; unsupported dev.to/hashnode publishing is disabled and labeled `not supported yet`.
- [x] Draft content is rendered as plain text and never as HTML; X image behavior is explained.

## Repositories and connections
- [x] `/repos` validates lowercased `owner/name` against `^[^/\\s]+/[^/\\s]+$`, inserts with the current owner, updates only tone/platforms, and supports deletion.
- [x] Webhook setup shows the exact URL, JSON content type, push event, masked/revealable/copyable secret, automatic GitHub creation, 422 already-exists success, manual fallback, and `commitdev init` alternative.
- [x] `/connections` supports exact connect start/finish state/verifier handling, integration deletion, expiry display, and coming-soon Dev.to/Hashnode cards.
- [x] `/connect/callback` rejects mismatched state, clears session storage, reports the account, and navigates to Connections.

## Compose and CLI
- [x] `/compose` selects repo/platform, enforces the same counters, supports optional image, calls `compose-post` for save/publish, uploads image after draft creation, and displays the result link.
- [x] `/cli` includes the configurable install command, numbered quick start, tag reference, and the requested push/hook/draft/review/publish SVG/JSX diagram.

## Backend additions and tests
- [x] `connect` accepts exact `${origin}/connect/callback` values from comma-separated `WEB_ORIGIN` while preserving loopback acceptance.
- [x] Publishing body lives in `_shared/publish.ts` and is imported by `publish-draft`.
- [x] `compose-post` authenticates, verifies repo ownership, validates content/X parts, inserts the exact manual draft, optionally publishes, and returns `{ ok, draft_id, url? }`.
- [x] `supabase/config.toml` contains `compose-post` with `verify_jwt = true`; README lists the exact deploy command.
- [x] Vitest covers X splitting/character limits, repo validation, and invokeFn function-error unwrapping.

## Public landing page
- [x] `/` is public and shows the same page for signed-in users with the primary CTA swapped to `Open dashboard`.
- [x] The landing page includes the requested sticky navbar, theme toggle, hero terminal loop, realtime-sync post card, problem strip, how-it-works steps, six features, non-coder band, CLI command table, platform row, FAQ, final CTA, and footer.
- [x] Landing sections live under `src/pages/landing/`, use semantic landmarks and heading order, and keep the requested copy grounded in the brief.
- [x] Open Graph/Twitter metadata, emerald cursor favicon, smooth anchor offsets, responsive mobile navigation, and AA-oriented theme tokens are included.
- [x] The terminal animation has a reusable reduced-motion static state covered by Vitest.
