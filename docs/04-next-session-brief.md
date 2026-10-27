# PocketRPG — Next Session Brief

Read first: `06-build-plan.md`, then `01-product-spec.md`, `05-tools-library.md`, `02-data-model.md`, `03-rules-reference.md`.

## Status (2026-10-24)
- **Phases 1–3 (setup, hacks, play) mocked up:** done. Mockup at `docs/mockup/pocketrpg-mockup.html` (also published as the "PocketRPG Mockup" artifact).
- **Phase 4 (build), M0 bootstrap:** done. Repo `bluehaoran/pocket-rpg`, deployed to GitHub Pages by CI.
  - Content in `content/`, validated by `npm run validate`.
  - Empty installable shell: Track and Tools tabs, Pack details from the menu.

- **Phase 4, M1–M5:** code complete, CI green (unit, component and content tests; 164 tests). Session store and shell; table engine; Tools tab; setup wizard; Track in play with both rules engines. See `06-build-plan.md` for what was built in each.
- **M6:** the part that doesn't need a device is done (headless-browser pass, tap targets, contrast, focus trap, offline). **Checked on a phone (2026-10-25): works.** The per-item checklist in `06-build-plan.md` isn't ticked; record any failures found later here.

- **Kintsugi (2026-10-26):** third rule system, a Roll for Shoes hack by David Schirduan (CC BY 4.0). Engine `src/lib/rules/kintsugi.ts`, pack `content/packs/kintsugi.json`, rules in `03-rules-reference.md`. Not yet done: Head Start and Critical Overload (optional rules), the "you perish" ending, and rules effects of individual story entries. Not yet checked on a phone.

- **Manage Tools (2026-10-26):** menu item for per-device edits to the Tools lists: add, import (JSON or plain text, with a per-list format example), delete your own entries, hide and unhide stock ones, export and import an edits file. Rules in `05-tools-library.md` §8. Not yet checked on a phone.

## Next
- **Manage Tools v2:** long-press (right-click on desktop) on a result or entry to "Hide this". Same `hidden` list, UI only.
- **Welcome copy:** `content/welcome.json` holds placeholder text; replace it with your blurb.
- Pick the roll result placement (`play.mode`), then remove the dev toggle.
- Content review session (below).
- **Custom table import, packs (remaining):** Manage Tools now covers the Tools lists (`05-tools-library.md` §8). Still open: custom or copyrighted content for genre packs, and the `d66` tilt shape. Replaces the gitignored `content/private/` workflow. Needs a design pass first: where uploads are stored (IndexedDB, device only), validation against the schemas with readable errors, export/backup, and how a private tilt `d66` table fits.
- **Much bigger Names and Descriptions lists (new):** massively increase the entries in `names.json`, `surnames.json` and `descriptions.json`, across every genre/setting. Balance cultures while doing it (see Content to supply, item 5).
- Decide on the tilt list: the proprietary table in `content/private/tools/tilts.json` uses a `d66` shape the tools schema doesn't support yet.

## Decisions made at build start
See `01-product-spec.md` "Decisions at build start". Summary: Svelte 5 + Vite, GitHub Pages, repo is source of truth, no-repeat window 3, picker sheet, implement `filterBy`, gender `x` explicit only, Moon & Blood castle/scenarios dropped, RfS ties shown as "Tie", roll result placement deferred.

## Content to supply
1. Complication list: draft together. `content/tools/complications.json` is empty.
2. Tilt list: from the user. `content/tools/tilts.json` is empty.
3. Emoji: curate `content/tools/emoji.json` (placeholder set of 56).
4. Review the draft lists: names (6 settings × 20), descriptions, emotions, items.
5. Make names and last names a rounded representation across cultural backgrounds. The modern list leans Western and Indian; the 16 Chinese last names have no matching first names.

## Open questions
1. Roll result placement (after phone testing).
2. Blade and Spirit seed table order is a guess (source tables unnumbered).
