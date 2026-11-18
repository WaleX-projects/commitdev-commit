# CommitDev implementation plan

## Scope

Build a complete static React SPA for CommitDev against the existing Supabase backend. The frontend uses the exact supplied tables, enums, RLS constraints, storage bucket, and edge-function contracts. No service-role key or third-party secret is exposed in browser code.

## Implementation approach

- Use Vite + React 19 + strict TypeScript, Bun-compatible scripts, React Router, TanStack Query, Supabase JS v2, Sonner, Lucide, and local Geist fonts.
- Keep all database access in typed TanStack Query hooks in `src/lib/queries.ts`; mutation hooks invalidate affected queries.
- Keep Supabase client construction browser-safe and isolate function invocation/error unwrapping in `src/lib/supabase.ts`.
- Use one app-shell Realtime subscription for draft INSERT/UPDATE events, patching the query cache and notifying when a draft becomes ready.
- Implement Supabase Auth GitHub OAuth, protected routes, signed private image previews, manual/automatic GitHub webhook setup, OAuth connection callbacks, compose, review, publish, and regeneration flows.
- Add edge-function source files for the requested backend changes, with the shared publish operation imported by both publishing functions.
- Use a dense terminal-inspired responsive layout: dark-first green accent, border-led surfaces, mono accents, accessible focus rings, mobile drawer, sticky mobile editor actions, and reduced-motion support.

## Project structure

- `src/App.tsx`: auth/session bootstrap, route tree, app shell and Realtime subscription.
- `src/components/`: layout, status/platform primitives and small accessible UI building blocks.
- `src/pages/`: route-level screens for auth, drafts, repositories, connections, compose and CLI.
- `src/lib/database.types.ts`: generated-shape database types matching the supplied backend contract.
- `src/lib/queries.ts`: all typed reads and writes.
- `src/lib/validation.ts`: pure content-limit and repo-name helpers.
- `supabase/functions/`: connect, publish-draft, compose-post and shared publish logic.
- `public/`: SPA fallback and route manifest.

## Design

Three candidate styles: terminal workbench (0.06); editorial developer ledger (0.04); greenroom control surface (0.03). Chosen: terminal workbench.

- **Design movement:** polished terminal workbench with calm information density.
- **Core principles:** clear hierarchy, borders over shadows, mono accents for machine data, and direct action feedback.
- **Color philosophy:** deep forest surfaces reduce glare; emerald is reserved for progress and primary action; amber/red communicate state rather than decoration.
- **Layout paradigm:** persistent narrow navigation with asymmetric review workspace and stacked mobile actions.
- **Signature elements:** blinking wordmark cursor, accent-ready card edge, and code-block webhook/instruction surfaces.
- **Interaction philosophy:** every mutation is explicit, reversible where possible, and reflected in status, toast, or realtime state.
- **Animation:** 150ms transitions, subtle ready-card entry/highlight, dialog scale-in, shimmer skeletons, and reduced-motion fallbacks.
- **Typography:** Geist Sans for interface hierarchy; Geist Mono for commit data, ids, tags, code and counters.
- **Brand essence:** a dependable commit-to-post workbench for developers; precise, calm, practical.
- **Brand voice:** direct and technical. “Review the words before they leave the repo.” “A commit is a signal; CommitDev makes it publishable.”
- **Wordmark:** lowercase mono `commitdev` with an emerald block cursor.
- **Signature color:** emerald `#34d399`.

## Delivery

Static build output is `dist`; Vercel and `_redirects` provide SPA fallback. Preview runs on the managed port 3000. The project is validated with TypeScript/Vite build and Vitest checks before checkpointing.
