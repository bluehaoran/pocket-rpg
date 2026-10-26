# Manage Tools: design

Date: 2026-10-26. Status: draft for approval. Supersedes the "Phase 2: admin mode" stub in `docs/05-tools-library.md` §8.

## Intent
The Tools tab draws from JSON lists bundled in the app (names, descriptions, items, emotions, complications, tilts, emoji, surnames). Today the only way to change them is to edit the repo and redeploy. A GM wants to (a) add their own entries or load a whole table, (b) remove their own entries, and (c) remove stock entries that don't fit their table, for example a name or description that is offensive in their culture. All of it happens on the phone, offline.

This is a power-user feature. It lives behind a **Manage Tools** item in the app menu, not on the Tools hub.

## Goals
- Add one entry to any tool list, with the tags that list needs.
- Import many entries at once from a JSON file, or from plain text (one entry per line), after a preview.
- Delete an entry the user added.
- Hide ("mask") a stock entry, and unhide it later. The stock JSON is never modified.
- Export and import the whole set of edits as one JSON file, as backup and transfer between phones.
- Edits apply to the whole device, across all sessions.
- Work for any current or future list file with no per-list code, driven by the list's own `modifiers` declarations.

## Non-goals
- Editing the text or tags of an existing entry (delete and re-add instead).
- Editing the Tools registry (tool order, labels, parts, follow-ups). Lists only.
- Pack content (genre packs, generators). Tool lists only.
- Cloud sync, accounts, sharing between users.
- Any network call. Everything is local (CLAUDE.md: no runtime network calls).

## Anti-goals
- An edit must never corrupt or block the Tools tab. A bad import is rejected with a message, never half-applied.
- Hiding must never leave a tool unable to roll without saying why. Relaxation and the "list is empty" message must still work when every matching entry is hidden.
- Touching Manage Tools must not change what a user who never opens it sees.

## Decisions (made with the user)
- **Scope:** edits belong to the device, not to a session. Reason: the tools library is already session-independent, and a hidden offensive entry must stay hidden in every future session.
- **Hide matching:** a stock entry is hidden by exact text (`v`) within its list. This hides every entry in that list with the same `v`, whatever its tags (for example "Rowan" under several settings). Accepted.
- **v1 entry point:** a Manage Tools item in the menu.
- **v2 (not in this build):** long-press (or browser right-click) on a result or entry opens a context menu with "Hide this", writing to the same hidden set. The v1 data model must make this a UI-only addition.

## Data model
Stock list files are unchanged. A new table in the on-device database (Dexie, alongside `sessions`; needs a new schema version) holds one overlay record per list id:

```
ListEdits { listId: string, added: Entry[], hidden: string[] }
```

- `added`: entries in the existing `Entry` shape (`v`, `tags`, optional `data`, `position`), with `src: "user"`.
- `hidden`: stock `v` strings to omit.
- Effective list = stock entries whose `v` is not in `hidden`, followed by `added`. The roll engine, filters, modifiers and relaxation are untouched; they just receive the effective list.
- Deleting an entry the user added removes it from `added`. "Hide" on an entry the user added is not offered; it is Delete.
- Adding an entry whose `v` (case-sensitive, trimmed) already exists in the effective list with identical tags is skipped as a duplicate.
- Persist plain data, never `$state` proxies (use `$state.snapshot`).
- If the overlay record is missing or unreadable, the app behaves as stock.
- Update `docs/02-data-model.md` or `docs/05-tools-library.md` (replacing §8) with the final shape, per CLAUDE.md.

## Screens (mockup: `.superpowers/brainstorm/128962-1793010833/content/manage-tools-flow.html`, gitignored)
1. **Menu → Manage Tools.** One row per list, with counts of added entries and hidden entries. Buttons: Export all edits, Import edits file.
2. **One list.** Search box; filter chips All / Mine / Hidden. Your entries show a "mine" badge and a delete button. Stock entries show Hide, which becomes Unhide when hidden (hidden entries are dimmed and struck through). Buttons: Add entry, Import file or text, Export this list.
3. **Add entry.** Text field plus one picker per modifier the list declares. Tilts ask for a Group; Names ask for gender and setting; Complications need text only. Buttons: Add, Add and another. Required tags follow the same rules as the tool's own modifiers; an entry with no value for a modifier is "untagged" and matches any value (`docs/02-data-model.md` §1.2). Which modifiers are required to add is left to the builder, within that rule.
4. **Import.** Choose a `.json` or `.txt` file, or paste text. For plain text, one entry per line, with pickers to apply tags to every line. A preview shows "N new, M already there (skipped)" before anything is saved. Nothing is written until the user confirms. **Format help:** this screen includes a "Format for this list" section with a ready-to-copy example generated from the list's own modifier declarations (real tag keys and values for that list, a couple of sample entries), plus a one-line plain-text example, and a Copy button. This is needed because the shape differs per list (tags, `position`, `data`).

Tap targets at least 44px, one-thumb reachable, as elsewhere in the app. The screens are wireframes; styling follows the existing app.

## Import formats
- **JSON, list-file shape:** an object with `entries: Entry[]` (extra fields such as `modifiers` or `id` are ignored).
- **JSON, bare array:** `Entry[]`, or an array of strings (treated as text-only entries, tagged by the pickers if used).
- **Plain text:** one entry per line; blank lines ignored; each line trimmed.
- Every imported entry is validated: `v` is a non-empty string; tag keys are modifiers the list declares; tag values are among the declared values for that modifier. Invalid entries are reported in the preview with the reason; the user may import the valid ones or cancel. Imported entries are stamped `src: "user"`.
- **Export format** (per list and all lists) is the import format, so a round trip is lossless. The all-lists file is `{ "version": 1, "lists": { "<listId>": { "added": [...], "hidden": [...] } } }`. Importing it replaces nothing silently: the preview shows what will be added and hidden, and merges (union of hidden, deduplicated added).

## Constraints
- Svelte 5 runes only; shared reactive state in a `*.svelte.ts` module; game logic and overlay merge/validate/parse in pure TS under `src/lib/` with unit tests (CLAUDE.md). Explicit `.ts` import extensions.
- The bundled `lists` are built at import time (`src/lib/content/index.ts`); the effective-list layer must reach everything that reads them (tool pages, roll engine, hub empty-state checks, validation scripts keep reading stock only).
- `npm run ci` must pass, including `npm run validate` on stock content, which is unaffected.
- Offline, installable PWA: file picking and clipboard copy must work without a network.

## Calls made by the designer (not yet confirmed by the user)
- **Loading:** the overlay is read from the database once at startup, before first render (alongside the existing startup work in `src/lib/startup.ts`), then held in a reactive store that Manage Tools writes through. The effective list is computed from stock plus that store, so tool pages and the roll engine stay synchronous. If the read fails, fall back to stock.
- **Same-text stock entries:** the Manage list shows one row per distinct stock `v`, summarising the tags of all entries that share it. Hide and Unhide act on that row. A user-added entry with the same `v` as a hidden stock entry stays visible, because `hidden` only applies to stock.
- **Counts:** "added" is `added.length`; "hidden" counts only `hidden` strings that match a current stock entry.
- **Stale data:** a `hidden` string matching no stock entry is harmless and kept. At read time the merge does not re-validate stored entries, but it must tolerate tags whose keys or values are no longer declared (the entry then behaves as untagged for that key). Validation happens on add and import only.
- **Unknown lists on import:** list ids this build doesn't have are skipped, with a line in the preview. Entries with undeclared tag keys or values are reported and excluded (per the Import formats rules).
- **Untagged entries are valid** for every list, per `02-data-model.md` §1.2, including Tilts without a Group (they match any Group).
- **Reset:** deleting sessions never touches the overlay. Manage Tools gets a "Reset all edits" button behind a confirmation.

## Left to the builder
- Overlay module and Dexie schema version bump details; reactivity approach.
- Which modifiers are mandatory in the Add form.
- Search behaviour, list sizing/virtualisation for the 400-entry lists, empty states, confirmations and undo for delete/hide.
- Exact wording, layout and styling.
- How "Export" delivers the file on a phone (download vs share sheet).
- Test plan beyond: merge/hide/dedupe, text and JSON parsing, validation errors, export/import round trip, all with deterministic fixtures.

## Docs to update when built
`docs/05-tools-library.md` (replace §8, describe the overlay), `docs/04-next-session-brief.md`, `docs/06-build-plan.md`, and add `.superpowers/` to `.gitignore`.
