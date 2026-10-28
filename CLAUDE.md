# PocketRPG

Offline, tap-only phone PWA that helps a GM run conversational RPGs (Lasers & Feelings and its hacks, Roll for Shoes). Svelte 5 + Vite + TypeScript, deployed to GitHub Pages.

## Read before changing behaviour
- `docs/06-build-plan.md` — milestones, layout, principles. Work milestone by milestone.
- `docs/04-next-session-brief.md` — current status and what's next.
- `docs/01-product-spec.md` — screens and decisions.
- `docs/02-data-model.md` — pack JSON and session shapes. `docs/05-tools-library.md` — Tools tab and its JSON.
- `docs/03-rules-reference.md` — rules as implementation notes.
- `docs/mockup/pocketrpg-mockup.html` — working mockup. Where the docs are silent, its behaviour is the spec. Port its logic, not its HTML-string rendering.

## Commands
- `npm run dev` — dev server
- `npm run validate` — schema + cross-reference checks on `content/` (CI gate)
- `npm run check` — svelte-check / TypeScript
- `npm test` — Vitest
- `npm run build` — production build to `dist/`
- `npm run ci` — all of the above, in CI order

Run `npm run ci` before pushing.

After making changes, make sure the tests pass (`npm run ci`) and that the changes are committed.

## Conventions
- Content is data: genre packs in `content/packs/` (unpublishable ones in the gitignored `content/private/packs/`; see NOTICE), tools library in `content/tools/`. Adding a list entry or a tool is a JSON edit, not a code change. Update `schemas/` and `src/lib/content/types.ts` together when a shape changes, and record the change in `docs/02-data-model.md` or `docs/05-tools-library.md`.
- Game logic lives in pure TS under `src/lib/` with an injectable RNG; components only render and dispatch. Every engine rule gets a unit test with a seeded RNG.
- CSS: prefer component `<style>` blocks over `src/app.css`. New styles go in the component that renders the element; add to `app.css` only when several unrelated components genuinely share them, and extract a component first if the markup is repeated. `src/app.css` holds only tokens, the reset and primitives shared by several screens (`.btn`, `.card`, `.chips`/`.tog`, `.eyebrow`, ...). Use `:global()` only to style slotted or child-component content, and `:where()` to keep it at zero specificity. `tests/styles.test.ts` snapshots every element's resolved styles (specificity-aware, see `tests/helpers/styles.ts`); update it with `-u` only for an intended visual change and review the diff.
- Svelte 5 runes only (`$state`, `$derived`, `$props`, `$effect`). Shared reactive state goes in `*.svelte.ts` modules.
- Persist `$state.snapshot(x)` to IndexedDB, never the proxy.
- No runtime network calls. Anything the app needs at runtime is bundled or precached.
- Imports between TS files use explicit `.ts` extensions (needed so `scripts/validate.ts` runs under Node type stripping).
- Large tap targets (≥ 44px), glanceable text, everything reachable with one thumb.
- Keep docs current: update the brief and build plan when a milestone lands or a decision changes.
