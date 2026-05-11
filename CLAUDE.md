# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

`us---a-shared-memory-journal` is a pnpm monorepo for a shared couple-memory journal.

- Web app: React 19, Vite 6, TypeScript, Tailwind CSS in `apps/web/`
- Desktop app: Tauri 2 + Rust in `apps/desktop/src-tauri/`
- Data layer: Supabase Database, Storage, and Realtime, with local cache fallbacks
- Product tone: romantic, delicate, lightweight, soft animation, mobile-conscious performance

Also read `AGENTS.md` for the fuller repository agent handbook and `.github/copilot-instructions.md` for day-to-day implementation preferences.

## Common commands

Use `pnpm` from the repository root.

- Install dependencies: `pnpm install`
- Start web dev server: `pnpm dev`
- Build web app: `pnpm build`
- Preview production build: `pnpm preview`
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`
- Unit tests: `pnpm test` or `pnpm test:unit`
- Run one unit test file: `pnpm exec vitest run apps/web/src/services/memoryMapper.test.ts`
- E2E tests: `pnpm test:e2e`
- Run one E2E file: `pnpm exec playwright test tests/e2e/login.spec.ts`
- Full check: `pnpm check`
- Tauri desktop dev: `pnpm tauri:dev`
- Tauri desktop build: `pnpm tauri:build`
- Regenerate desktop icons: `pnpm tauri:icon`

Playwright starts its own Vite server on `127.0.0.1:3100` with Supabase env vars disabled, per `playwright.config.ts`.

## Architecture notes

### Web app flow

`apps/web/src/App.tsx` owns the top-level phase flow (`login`, `transition`, `main`), selected user, modal visibility, Easter eggs, and lazy-loaded heavy features such as the composer, piggy bank, gravity mode, 2048, and memory heatmap.

`apps/web/src/context/AppContext.tsx` composes smaller providers from `context/` into one app-facing context: session, theme, sound, and feedback/toast/confirm behavior. Prefer using or extending those smaller contexts rather than adding unrelated global state directly to components.

`apps/web/src/components/MainPhase.tsx` renders the two journal columns, splits memories by `UserType`, wires delete/update operations to the storage service, handles mobile swipe tabs, parallax background, header hide-on-scroll, avatar refresh gesture, and date jumps from the heatmap.

### Data, cache, and sync

The memory data path is centered on `apps/web/src/hooks/useMemoriesData.ts` and `apps/web/src/services/storageService.ts`.

- `useMemoriesData` seeds initial data, calls `getMemories`, subscribes to realtime changes, and listens for cache update notifications.
- `storageService` is the unified CRUD boundary for memories and image helpers. It uses Supabase when configured and falls back to local storage behavior when Supabase is unavailable.
- `cacheService` provides the memory cache, IndexedDB persistence, and cache-update notifications. Do not bypass it when changing memory loading or realtime synchronization.
- `supabaseClient` treats `VITE_SUPABASE_URL` plus `VITE_SUPABASE_KEY` or `VITE_SUPABASE_ANON_KEY` as optional; tests and local flows may intentionally run with Supabase disabled.

When changing memory fields, image behavior, or ordering, check `types.ts`, `memoryMapper.ts`, cache serialization, local fallback behavior, Supabase payload creation, and UI consumers together.

### UI structure

Most UI lives under `apps/web/src/components/`. Existing styling is Tailwind-heavy with global animation utilities in `apps/web/src/index.css`. Preserve the soft visual style and mobile performance choices; do not add heavy animations that only work well on desktop.

Shared hooks live in `apps/web/src/hooks/`. Generic business logic belongs in `apps/web/src/services/`; generic configuration belongs in `apps/web/src/config/`.

### Build and platform integration

`apps/web/vite.config.ts` sets the app root to `apps/web`, reads env vars from the repository root via `envDir`, uses `base: './'`, splits major vendor chunks, injects Supabase preconnect hints, and enables the PWA plugin outside Tauri.

`apps/desktop/src-tauri/tauri.conf.json` points Tauri dev at `http://localhost:3000` and production at `../../web/dist`; its `beforeDevCommand` and `beforeBuildCommand` currently use npm scripts even though normal repository work uses pnpm. Keep this interaction in mind when changing desktop build commands.

Desktop development details and Windows build output notes are in `apps/desktop/TAURI_DEV_GUIDE.md`.

## Testing guidance

For code changes, prefer the narrowest reliable check first, then broaden when needed:

1. `pnpm typecheck`
2. relevant unit file with `pnpm exec vitest run <file>`
3. relevant E2E file with `pnpm exec playwright test <file>`
4. `pnpm check` for larger or release-facing changes

For UI/frontend behavior changes, start the dev server and verify the affected flow in a browser when possible; typecheck and tests do not prove the interaction feels correct.

## Repository-specific working rules

- Keep modifications small and avoid unrelated refactors.
- Prefer existing components, services, contexts, constants, and style patterns over new abstractions.
- Do not introduce new dependencies unless the benefit is clear.
- For storage, cache, presence, Supabase, or offline behavior, inspect the service layer before changing UI code.
- Preserve cache-first loading, IndexedDB/localStorage fallback behavior, and Supabase Realtime synchronization unless the task explicitly changes them.
- Before changing Tauri/Rust files, confirm the requirement truly belongs in the desktop layer.
- If stable project rules change, update `AGENTS.md`; if collaboration or implementation preferences change, update `.github/copilot-instructions.md`.
