# PocketRPG — Next Session Brief

Read first: `06-build-plan.md`, then `01-product-spec.md`, `05-tools-library.md`, `02-data-model.md`, `03-rules-reference.md`.

## Status (2026-10-24)
- **Phases 1–3 (setup, hacks, play) mocked up:** done. Mockup at `docs/mockup/pocketrpg-mockup.html` (also published as the "PocketRPG Mockup" artifact).
- **Phase 4 (build), M0 bootstrap:** done. Repo `bluehaoran/pocket-rpg`, deployed to GitHub Pages by CI.
  - Content in `content/`, validated by `npm run validate`.
  - Empty installable shell: Track and Tools tabs, Pack details from the menu.

- **Phase 4, M1–M5:** code complete, CI green (unit, component and content tests; 164 tests). Session store and shell; table engine; Tools tab; setup wizard; Track in play with both rules engines. See `06-build-plan.md` for what was built in each.
- **M6:** the part that doesn't need a device is done (headless-browser pass, tap targets, contrast, focus trap, offline). **Not yet checked on a phone**: run the "Manual device checklist" in `06-build-plan.md` and record failures here.

## Next
- Run the device checklist (install on Android and iOS, offline reopen, safe areas, wake lock, haptics).
- Pick the roll result placement (`play.mode`), then remove the dev toggle.
- Content review session (below).
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
