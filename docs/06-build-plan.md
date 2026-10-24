# PocketRPG — Build Plan (Phase 4)

Started 2026-10-24. Specs: `01-product-spec.md` (what), `02-data-model.md` (shapes), `03-rules-reference.md` (rules), `05-tools-library.md` (Tools tab). Visual and interaction reference: `docs/mockup/pocketrpg-mockup.html` (open it in a browser).

## Stack
| Concern | Choice |
|---|---|
| UI | Svelte 5 (runes), no SvelteKit |
| Build | Vite 8, TypeScript 5.9 (strict, `noUncheckedIndexedAccess`) |
| Routing | Hash router (`src/lib/router.svelte.ts`) |
| Offline | vite-plugin-pwa (generateSW). Packs and tools are bundled into the JS, so the precache covers them. |
| Storage | Dexie over IndexedDB (`src/lib/db.ts`) |
| Fonts | Self-hosted via @fontsource |
| Tests | Vitest (node env; fake-indexeddb for storage) |
| Content checks | JSON Schema (`schemas/`, Ajv) + cross-reference rules (`src/lib/content/validate.ts`) |
| Hosting | GitHub Pages at `/pocket-rpg/`, deployed by `.github/workflows/ci.yml` on push to `main` |

## Layout
```
content/packs/*.json        genre packs (source of truth)
content/tools/*.json        tools library: registry + lists
schemas/                    JSON Schemas for the above
scripts/validate.ts         npm run validate (CI gate)
src/lib/content/            types, extends resolution, validation, bundled content
src/lib/engine/             (M2) table engine, RNG, template expansion
src/lib/rules/              (M5) lasers-feelings.ts, roll-for-shoes.ts
src/lib/db.ts               session store
src/lib/router.svelte.ts    hash router
src/routes/                 screens
src/components/             (M3+) shared UI: Sheet, Stepper, Chips, Die, ResultCard…
tests/                      vitest
docs/                       specs, this plan, mockup
```

## Principles
- Engine code is pure TypeScript with an injectable RNG, so every roll path is unit-testable with a seeded RNG.
- UI components hold no game logic. Screens call engine and rules functions and render the result.
- The mockup's behaviour is the spec where docs are silent. Port logic from it; don't port its string-built HTML.
- Session state lives in one reactive store, persisted to IndexedDB after each change (debounced). Persist `$state.snapshot(...)`, not the proxy.
- No network at runtime.

## Milestones
Each ends with green CI and a deploy.

### M0 — Repo bootstrap ✅ (this commit)
- Content imported from the Project; `nameSetting` on packs; `groupFields` at pack root everywhere; Moon & Blood `castle`/`scenarios` dropped.
- Schemas, validator, CI, Pages deploy, installable empty shell with Track/Tools tabs and Pack details.

### M1 — Shell and session ✅ code complete; device checklist below still to run
- Session store (`src/lib/session.svelte.ts`): load latest on start, create on first run, debounced save.
- Header chip (genre · rules · players), menu sheet: Pack details, New session (two-tap confirm).
- Shared components: `Sheet`, `Stepper`, `Seg`, `Chips`, `Die`, bottom dock.
- Screen Wake Lock while `started`; haptics helper (`navigator.vibrate`, guarded).
- Update prompt when a new service worker is waiting (or keep autoUpdate; decide when testing on a phone).
- **Done when:** app installs on Android and iOS, reopens offline, session survives a reload.
- **Decisions (2026-10-24):**
  - First run creates an unstarted session on the first pack in `PACK_ORDER`; M4's wizard edits it in place.
  - New session replaces the current one; the old one stays in IndexedDB (only the latest is used).
  - Keep `autoUpdate`; revisit after phone testing.
  - Wake lock follows `session.started`. Until M4 can set it, a dev-only menu toggle ("Keep awake (dev)") forces it, so it can be tried through the dev server on a phone but not on the deployed app.
- **Built:** `session.svelte.ts` (use `mutate()` for changes so they save; `flush()` on hide/pagehide), `device.ts` (`buzz`, `createWakeLock`), components `Sheet`, `Stepper`, `Seg`, `Chips`, `Die`, `Dock`. `Stepper`, `Seg`, `Chips`, `Die` and `Dock` have no screen using them until M3/M4.

### M2 — Table engine ✅
- `rng.ts`: seeded RNG interface (`mulberry32`), `Math.random` default.
- `table.ts`: `matches` (§1.2, explicit gender `x`), `draw` with no-repeat window (3) and `avoid`, relaxation of optional modifiers in declaration order with a `relaxed` flag.
- `template.ts`: `{table}`, `{table?}`, `{table|lower}`, seed `{0}` templates with `case: lower`, `{a}`/`{a|cap}` articles, sentence rendering (§1.6).
- Letter modifier (ignore leading "The ").
- **Done when:** unit tests cover every rule above against the real content.
- **Built:** `src/lib/engine/{rng,table,template}.ts`, tests in `tests/engine.test.ts`. `draw` with `strict` returns null rather than repeating (used for distinct multi-picks); without it, the last resort is the whole pool. The `letter` modifier is handled inside `matches`.

### M3 — Tools tab ✅
- Hub: registry tools in order, then pack generators under the pack's genre.
- Tool page: roll on open, Reroll (never repeats the shown result), ✓ / Back logs to Tools History, modifiers remembered per tool.
- Names: gender, setting (genre default via `nameSetting`), A–Z letter sheet with disabled letters, Last name part with family-name order checkbox (re-order without reroll), Description follow-up with its own reroll.
- Dice (count 1–10, d4–d100), Emoji (count 1–6, glyph display), empty-list state naming the file to edit.
- Pack generators: required modifiers gate the roll; `data` payload under single-table results.
- Tools History.
- **Built:** `src/lib/tools.ts` (pure: roll, modifiers, parts, follow-up, hub summaries), `toolctx.svelte.ts`, routes `Tools`, `ToolPage`, `History` (`#/tools/history`), component tests in `tests/toolpage.test.ts` (jsdom + @testing-library/svelte; per-file `// @vitest-environment jsdom`). Pack generators use tool id `pack:<generatorId>` and the same `toolModifiers` store. No shipped generator has a required modifier yet; the gate is tested with a fabricated one. A tool page logs on unmount (Back, tab switch, ✓), at most once per visit.

### M4 — Setup wizard
- Step indicator; Setup (rule system, native packs via picker sheet, starting skills stepper for RfS, players 1–4).
- Story: seed Text/Advanced with per-part reroll and Roll all; RfS intro questions; group fields; premise; scene outline.
- Players: sentence with tappable fields, number bar, derived stats, resource chips, edit sheet per field kind, Roll all, ← Player n of N →.
- Specify and implement `filterBy` on fields (Blade and Spirit pack animal).
- Start play.

### M5 — Track in play
- Story card with tappable seed/fields (edits logged) and generator chips.
- Compact party cards and read-only character page.
- L&F engine (`rules/lasers-feelings.ts`): pool, under/over, exact effect (options, questions list or table draw), outcomes, critical picks, resource counters with states.
- Roll for Shoes engine (`rules/roll-for-shoes.ts`): skill tree derivation, opposed by GM (0–4d6), statuses for next roll, fail XP, spend XP (lowest non-6, not XP from this roll), all-sixes new skill, ties shown as "Tie".
- Roll result component with three presentations (sheet default, inline, page); dev-only toggle.
- Track History.

### M6 — Polish and device testing
- Accessibility pass (focus, labels, contrast, 44px targets), reduced motion.
- Performance: result under 2 s on a mid-range phone (target: instant).
- Pick the roll result placement; remove the toggle.
- Content review session: complications, tilts, emoji, names balance.

## Test plan
- **Unit (Vitest):** content validation (positive and negative), engine rules with a seeded RNG, both rules engines, template rendering, session store.
- **Component:** add `@testing-library/svelte` + jsdom at M3 for tool page behaviour (reroll never repeats, leaving logs once).
- **Manual on device:** install, airplane mode, wake lock, haptics, one-handed reach. Checklist below.

## Content workflow
1. Edit JSON in `content/`.
2. `npm run validate` (also runs in CI).
3. Push; the app redeploys.
Empty lists are valid; the tool page says which file to edit.

## Manual device checklist
Run on one Android phone (Chrome) and one iPhone (Safari) against the deployed build. Tick per device.

**Install and offline (M1)**
- [ ] Android: Chrome offers install; the app opens standalone with the right icon and theme colour.
- [ ] iOS: Share → Add to Home Screen; opens standalone with the apple-touch icon.
- [ ] Airplane mode, force-close, reopen from the home screen: the app loads, Track and Tools both work, Pack details lists all packs.
- [ ] Header chip shows genre · rules · players (first run: Starfarers · L&F · 1 player).
- [ ] Menu: Pack details opens; Close and tapping outside both close the menu; Escape closes it with a keyboard.
- [ ] New session: first tap changes the label to "Tap again to confirm" and reverts after about 4 s; the second tap within 4 s starts a new session (chip updates, lands on Track).
- [ ] Session survives: change nothing visible yet, so check via New session then force-close and reopen; the new session is the one loaded. (Richer persistence checks arrive with M4.)
- [ ] After a deploy, the next launch picks up the new version (autoUpdate) without a stale shell; note whether a reload mid-use is disruptive.
- [ ] Safe areas: header, tab bar and menu sheet clear the notch and home indicator in portrait.
- [ ] Every control is reachable with one thumb and at least 44 px (header menu button, tabs, menu buttons).

**Wake lock and haptics (re-run in M4/M5 once `started` and results exist)**
- [ ] Wake lock (dev server on the phone, "Keep awake (dev)" on): screen doesn't dim for longer than the system timeout; switch away and back, it re-engages.
- [ ] Wake lock with a started session (M4+): same check on the deployed app; off again after New session.
- [ ] Haptics (M3+): Android vibrates on a result; iOS does nothing and nothing breaks.

**Later milestones add** one-handed reach on Tools and Track, performance under 2 s per result, reduced motion, and screen-reader labels (M6).
