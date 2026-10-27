# Manage Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a GM add, import, delete, hide and export Tools-tab list entries on their own device, from a "Manage Tools" menu item.

**Architecture:** Stock `content/tools/*.json` is untouched. A per-device overlay (`ListEdits` per list id) lives in a new Dexie table, is loaded before first render into a reactive store, and `toolCtx()` passes the merged "effective" lists to the existing engine. All merge, parse and validate logic is pure TS in `src/lib/`; Svelte screens only render and dispatch.

**Tech Stack:** Svelte 5 runes, TypeScript, Dexie, Vitest (+ fake-indexeddb, @testing-library/svelte).

**Spec:** `docs/superpowers/specs/2026-10-26-manage-tools-design.md`

## Global Constraints
- Svelte 5 runes only; shared reactive state in `*.svelte.ts`; persist `$state.snapshot(x)`, never the proxy.
- Imports between TS files use explicit `.ts` extensions.
- No runtime network calls; file picking and clipboard must work offline.
- Tap targets >= 44px, one-thumb reachable; reuse existing classes (`btn`, `btn ghost`, `Sheet`, `Chips`, `Seg`).
- Stock `content/` and `npm run validate` are unaffected; `lists` in `src/lib/content/index.ts` stays stock.
- Hide matches stock entries by exact `v` within a list. Added entries get `src: "user"`. Dedupe key: `v` (trimmed, case-sensitive) plus identical tags.
- Every pure function gets a Vitest test in `tests/`. Run `npm run ci` before the final commit.

## Review Focus
- Every stock entry in a list is hidden: the tool page must show the existing empty-list state, not crash (`tests/edits.test.ts`, Task 1).
- Importing the same file twice adds nothing the second time (Task 2).
- Malformed JSON, a JSON file of the wrong shape, or an empty file shows a message and writes nothing (Task 2).
- Imported entry with an undeclared tag key or value is reported and excluded, valid siblings still import (Task 2).
- Overlay record unreadable or missing at startup: app loads as stock (Task 4).
- Edits file from another build with an unknown list id or a stale tag value: skipped with a note, no throw (Task 3).

---

## File Structure
- Create `src/lib/edits.ts`: types and pure overlay operations.
- Create `src/lib/importer.ts`: import parsing, validation, format examples.
- Create `src/lib/editsfile.ts`: whole-device export file, preview and merge.
- Create `src/lib/edits.svelte.ts`: reactive store, persistence, `effectiveLists`.
- Modify `src/lib/db.ts` (table + loaders), `src/lib/toolctx.svelte.ts`, `src/lib/router.svelte.ts`, `src/main.ts`, `src/App.svelte`.
- Create `src/routes/ManageTools.svelte`, `src/routes/ManageList.svelte`, `src/components/AddEntrySheet.svelte`, `src/components/ImportSheet.svelte`.
- Tests: `tests/edits.test.ts`, `tests/importer.test.ts`, `tests/editsfile.test.ts`, `tests/edits-store.test.ts`, `tests/manage-ui.test.ts`.

---

### Task 1: Overlay operations (pure)

**Files:** Create `src/lib/edits.ts`; Test `tests/edits.test.ts`

**Interfaces:**
- Produces:
  - `interface ListEdits { listId: string; added: Entry[]; hidden: string[] }`
  - `type EditsMap = Record<string, ListEdits>`
  - `emptyEdits(listId: string): ListEdits`
  - `effectiveList(list: ToolList, e?: ListEdits): ToolList` (returns `list` itself when `e` is absent or empty)
  - `effectiveLists(stock: Record<string, ToolList>, edits: EditsMap): Record<string, ToolList>`
  - `addEntries(list: ToolList, e: ListEdits, incoming: Entry[]): { edits: ListEdits; added: Entry[]; duplicates: Entry[] }` (stamps `src: 'user'`, trims `v`, dedupes against stock and `added` and within `incoming`)
  - `removeAdded(e: ListEdits, index: number): ListEdits`
  - `hideText(e: ListEdits, v: string): ListEdits`, `unhideText(e: ListEdits, v: string): ListEdits` (idempotent)
  - `stockRows(list: ToolList, e: ListEdits): StockRow[]` where `StockRow = { v: string; entries: Entry[]; hidden: boolean }`, one row per distinct stock `v`
  - `editCounts(list: ToolList, e: ListEdits): { added: number; hidden: number }` (hidden counts only strings matching a stock `v`)

- [ ] **Step 1: Write failing tests** in `tests/edits.test.ts` using a small fixture list (three entries, two sharing `v: 'Rowan'` with different `setting` tags). Assert: `effectiveList` drops hidden stock `v` (both Rowans) and appends added; an added entry with a hidden stock's `v` stays; `addEntries` stamps `src: 'user'`, trims, skips a duplicate of stock (same v and tags) and a repeat within `incoming`, but accepts the same `v` with different tags; `removeAdded` removes by index; `hideText`/`unhideText` idempotent; `stockRows` has one `Rowan` row with 2 entries; `editCounts` ignores a stale hidden string; hiding every stock `v` yields `entries` equal to just the added ones (Review Focus 1); inputs are not mutated.
- [ ] **Step 2:** Run `npx vitest run tests/edits.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement the signatures above in `src/lib/edits.ts`; return new objects, never mutate.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit `feat: overlay operations for tool lists`.

### Task 2: Import parsing, validation and format examples (pure)

**Files:** Create `src/lib/importer.ts`; Test `tests/importer.test.ts`

**Interfaces:**
- Consumes: `ListEdits`, `effectiveList`-style dedupe from Task 1 (export a shared `entryKey(e: Entry): string` from `edits.ts` in this task if Task 1 didn't).
- Produces:
  - `interface ImportPreview { fresh: Entry[]; duplicates: Entry[]; invalid: { raw: string; reason: string }[] }`
  - `class ImportError extends Error` (user-readable message)
  - `parseImport(list: ToolList, e: ListEdits, text: string, kind: 'json' | 'text', lineTags?: Record<string, string>): ImportPreview` (throws `ImportError` on malformed JSON, wrong shape, or no entries found)
  - `exampleJson(list: ToolList): string` (pretty-printed list-file shape with `entries` holding two sample entries built from the list's declared modifier keys and values; entries carry `v` and `tags` only)
  - `exampleText(list: ToolList): string` (two sample lines)

- [ ] **Step 1: Write failing tests**: JSON list-file shape and bare `Entry[]` and bare `string[]` all parse; extra top-level fields ignored; text splits lines, trims, drops blanks, applies `lineTags` to each; entry with undeclared tag key, or tag value not in the declared `values`, lands in `invalid` with a reason while valid siblings stay in `fresh` (Review Focus 4); entry with empty `v` is invalid; importing the same text a second time against edits that already contain the result gives all `duplicates`, empty `fresh` (Review Focus 2); `''`, `'{'`, `'42'` and `'{"foo":1}'` throw `ImportError` (Review Focus 3); `exampleJson(tilts)` parses back through `parseImport` with zero `invalid` and uses real Group values; `exampleText` likewise for a list with no modifiers.
- [ ] **Step 2:** Run `npx vitest run tests/importer.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement in `src/lib/importer.ts`. Tag values may be string or array; each element must be declared. `parseImport` stamps nothing (stamping happens in `addEntries`).
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit `feat: tool list import parsing and format examples`.

### Task 3: Whole-device edits file (pure)

**Files:** Create `src/lib/editsfile.ts`; Test `tests/editsfile.test.ts`

**Interfaces:**
- Consumes: `EditsMap`, `addEntries`, `parseImport` internals from Tasks 1-2.
- Produces:
  - `interface EditsFile { version: 1; lists: Record<string, { added: Entry[]; hidden: string[] }> }`
  - `exportEdits(edits: EditsMap, listIds?: string[]): EditsFile` (omits lists with nothing in them)
  - `previewEditsFile(stock: Record<string, ToolList>, edits: EditsMap, text: string): FilePreview` where `FilePreview = { perList: Record<string, ImportPreview & { hide: string[] }>; unknownLists: string[] }`; throws `ImportError` for malformed or wrong-version input
  - `applyEditsFile(stock: Record<string, ToolList>, edits: EditsMap, preview: FilePreview): EditsMap` (union of hidden, deduped added)

- [ ] **Step 1: Write failing tests**: export then preview then apply on an empty map round-trips equal; per-list export contains only that list; unknown list id is reported in `unknownLists` and not applied; entry with a stale tag value is `invalid`, not thrown (Review Focus 6); applying twice is idempotent; `version: 2` or non-object throws `ImportError`.
- [ ] **Step 2:** Run `npx vitest run tests/editsfile.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement in `src/lib/editsfile.ts`.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit `feat: export and import of device tool edits`.

### Task 4: Persistence, store and wiring

**Files:** Modify `src/lib/db.ts`, `src/lib/toolctx.svelte.ts`, `src/main.ts`, `src/App.svelte`; Create `src/lib/edits.svelte.ts`; Test `tests/edits-store.test.ts`

**Interfaces:**
- Consumes: Task 1 types and `effectiveLists`.
- Produces:
  - `db.ts`: `db.version(2).stores({ sessions: 'id, createdAt', listEdits: 'listId' })`; `loadEdits(): Promise<EditsMap>`; `saveListEdits(e: ListEdits): Promise<void>`; `clearEdits(): Promise<void>`
  - `edits.svelte.ts`: `editsState: { map: EditsMap; ready: boolean }` (`$state`); `initEdits(): Promise<void>` (catches failure, leaves `map` empty, sets `ready`); `updateEdits(listId: string, fn: (e: ListEdits) => ListEdits): Promise<void>` (applies, then saves `$state.snapshot`); `replaceAllEdits(map: EditsMap): Promise<void>`; `resetEdits(): Promise<void>`; `effective(): Record<string, ToolList>` (derived from stock `lists` and `editsState.map`)
  - `toolCtx()` uses `effective()` instead of `lists`.

- [ ] **Step 1: Write failing tests** (fake-indexeddb, follow `tests/db.test.ts`): `initEdits` with an empty DB gives empty map and `ready`; `updateEdits` persists and a fresh `initEdits` after clearing in-memory state reads it back; `resetEdits` empties DB and map; `initEdits` with `loadEdits` rejecting (mock) still sets `ready` and leaves stock behaviour (Review Focus 5); `toolCtx().lists.tilts.entries` reflects an added entry and omits a hidden one; deleting sessions (`db.sessions.clear()`) leaves edits intact.
- [ ] **Step 2:** Run `npx vitest run tests/edits-store.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement. Dexie version bump keeps the `sessions` store definition identical. In `src/main.ts` call `void initEdits()` next to `initSession()`; in `App.svelte` the loading branch becomes `!app.ready || !editsState.ready`.
- [ ] **Step 4:** Run the new test, then `npx vitest run`. Expected: PASS, no regressions.
- [ ] **Step 5:** Commit `feat: persist device tool edits and feed them to the tool engine`.

### Task 5: Route, menu item and Manage Tools screen

**Files:** Modify `src/lib/router.svelte.ts`, `src/App.svelte`; Create `src/routes/ManageTools.svelte`; Test `tests/manage-ui.test.ts`

**Interfaces:**
- Consumes: Task 4 store, Task 3 export/preview/apply, `editCounts`.
- Produces: route `#/manage` (screen 1) and `#/manage/<listId>` (screen 2), as `page: 'manage'` on `Route` with `rest: [listId?]`; menu item "Manage Tools" in the existing Session sheet, between "Pack details" and "New session".

- [ ] **Step 1: Write failing tests** (testing-library, follow `tests/shell.test.ts`): menu shows "Manage Tools" and tapping it routes to `#/manage`; the screen lists one row per registry list tool (Names, Descriptions, Items, Emotions, Complications, Tilts, Emoji) with "+N" and "N hidden" counts from the store; "Reset all edits" needs a second tap to confirm (same pattern as "New session"); "Export all edits" produces a file/share action with `exportEdits` content (stub the download helper); importing an edits file shows the `previewEditsFile` summary and writes nothing until "Apply" is tapped.
- [ ] **Step 2:** Run `npx vitest run tests/manage-ui.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `parse()` branch for `manage`, the screen, and a small `downloadJson(name: string, data: unknown): void` helper in `src/lib/device.ts` (anchor + Blob URL; no network).
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit `feat: Manage Tools menu item and overview screen`.

### Task 6: List screen (search, filters, hide, delete)

**Files:** Create `src/routes/ManageList.svelte`; Modify `App.svelte` (route render); Test `tests/manage-ui.test.ts`

**Interfaces:**
- Consumes: `stockRows`, `removeAdded`, `hideText`, `unhideText`, `updateEdits`.
- Produces: screen at `#/manage/<listId>`; buttons "Add entry", "Import file or text", "Export this list" (the latter two wired in Tasks 7-8; here they open the sheets or are rendered disabled until then — render them now, wire later).

- [ ] **Step 1: Write failing tests**: rows show added entries with a "mine" badge and a delete button, stock rows with Hide; tapping Hide on "Rowan" hides the single row and persists; hidden row shows Unhide; filter chips All/Mine/Hidden filter correctly; search is case-insensitive substring on `v`; deleting a "mine" row removes it; an unknown `listId` shows a "No such list" message with a back link.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement. Rows are plain `{#each}`; for the 400-entry lists render the filtered result as is (no virtualisation) but cap initial render to 100 rows with a "Show more" button.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit `feat: Manage Tools list screen with hide and delete`.

### Task 7: Add entry sheet

**Files:** Create `src/components/AddEntrySheet.svelte`; Modify `ManageList.svelte`; Test `tests/manage-ui.test.ts`

**Interfaces:**
- Consumes: `addEntries`, `modDefs`-style declarations from `list.modifiers`, `Sheet`, `Chips`.
- Produces: `AddEntrySheet` props `{ list: ToolList; onclose: () => void }`.

- [ ] **Step 1: Write failing tests**: Tilts sheet shows Group chips from the list's declaration; typing text and tapping Add adds a `src: 'user'` entry with the chosen tag and closes; "Add and another" keeps the sheet open and clears the text; Add is disabled for blank text; a duplicate shows an inline "already in this list" message and adds nothing; a list with no modifiers shows only the text field; leaving all tags unselected adds an untagged entry.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement. Tag pickers are single-select per modifier, deselectable (untagged is valid).
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit `feat: add a tool list entry from Manage Tools`.

### Task 8: Import sheet with format help

**Files:** Create `src/components/ImportSheet.svelte`; Modify `ManageList.svelte`; Test `tests/manage-ui.test.ts`

**Interfaces:**
- Consumes: `parseImport`, `exampleJson`, `exampleText`, `addEntries`, `ImportError`.
- Produces: `ImportSheet` props `{ list: ToolList; onclose: () => void }`.

- [ ] **Step 1: Write failing tests**: file input (`.json,.txt,text/plain,application/json`) or pasted text fills a preview line "N new, M already there (skipped)" and lists invalid entries with reasons; nothing is saved until "Import N" is tapped; malformed input shows the `ImportError` message and keeps Import disabled; tag pickers apply to every line when the text is not JSON; the "Format for this list" section shows `exampleJson(list)` and `exampleText(list)` with a Copy button that writes to `navigator.clipboard` (stubbed) and falls back to selecting the text when the clipboard is unavailable.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement. Detect JSON vs text by file extension, else by the first non-space character `{` or `[`. Read files with `File.text()`.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit `feat: import entries into a tool list with format help`.

### Task 9: Docs and final verification

**Files:** Modify `docs/05-tools-library.md` (replace §8 with the overlay description), `docs/04-next-session-brief.md`, `docs/06-build-plan.md`, `docs/02-data-model.md` (add the `listEdits` table shape).

- [ ] **Step 1:** Update the four docs per CLAUDE.md; note v2 (long-press "Hide this") as next.
- [ ] **Step 2:** Run `npm run ci`. Expected: validate, check, test and build all pass.
- [ ] **Step 3:** Run `npm run dev` and in a browser: open menu, Manage Tools, add a Tilt, hide a name, import the example JSON, reload, confirm edits persisted and the Tilt tool draws the new entry. Report anything not exercised.
- [ ] **Step 4:** Commit `docs: Manage Tools overlay`.

## Self-review notes
- Spec coverage: add (T7), import JSON/text with preview (T2, T8), format help (T2, T8), delete and hide/unhide (T1, T6), export and import edits file (T3, T5), device scope and startup load (T4), menu entry (T5), reset (T4, T5), stale-data tolerance (T1, T3, T4). v2 long-press is out of scope by design.
- Per-list "Export this list" uses `exportEdits(map, [listId])`; it is re-importable from the overview screen's edits-file import.
- `.superpowers/` in `.gitignore` is already on `main`; not touched here to avoid a merge conflict.
