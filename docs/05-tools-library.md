# PocketRPG — Tools Library

The Tools tab is driven by a global library of JSON files. It does not depend on the genre pack. Files live in `content/tools/`.

## Goals
- Add entries to a list by editing one JSON file.
- Add a new tool by adding a list file and a registry entry. No code change.
- Same entry shape and filter rules as genre packs (`02-data-model.md` §1.1–1.2), so one table engine serves both.

## 1. Registry: `content/tools/registry.json`
Defines which tools appear on the hub and in what order.

```json
{
  "version": "0.1.0",
  "tools": [
    { "id": "dice",  "label": "Dice",  "kind": "dice",
      "dice": { "types": [4, 6, 8, 10, 12, 20, 100], "count": { "min": 1, "max": 10, "default": 1 }, "defaultType": 6 } },
    { "id": "names", "label": "Names", "kind": "list", "list": "names",
      "modifiers": [
        { "key": "gender",  "required": false },
        { "key": "setting", "required": false, "default": "genre" },
        { "key": "letter",  "required": false }
      ],
      "parts": [ { "key": "surname", "label": "Last name", "list": "surnames", "join": " ", "default": false, "filterBy": ["setting"],
                   "order": { "label": "Honour traditional family name order", "default": true } } ],
      "followUp": { "label": "Description", "tool": "description", "join": " — ", "default": false } },
    { "id": "description", "label": "Description", "kind": "list", "list": "descriptions" },
    { "id": "items",       "label": "Items",       "kind": "list", "list": "items" },
    { "id": "emotions",    "label": "Emotions",    "kind": "list", "list": "emotions" },
    { "id": "complication","label": "Complication","kind": "list", "list": "complications" },
    { "id": "tilt",        "label": "Tilt",        "kind": "list", "list": "tilts" },
    { "id": "emoji",       "label": "Emoji",       "kind": "list", "list": "emoji",
      "count": { "min": 1, "max": 6, "default": 3 }, "join": " ", "display": "glyph" }
  ]
}
```

### Tool fields
| Field | Meaning |
|---|---|
| `id` | Stable id. Used for remembered modifiers and History. |
| `label` | Hub button and page title. |
| `kind` | `dice` (built-in roller) or `list` (draws from a list file). Later kinds may add templates that combine lists. |
| `list` | List file id (`content/tools/{list}.json`). |
| `modifiers` | Ordered. `key` refers to a modifier declared in the list file, or the built-in `letter`. `required` as in packs. `default: "genre"` means: use the session pack's matching value if it has one. |
| `parts` | Optional add-ons shown as Off / On chips, remembered like modifiers. When on, one entry from `list` is appended with `join`. Only the modifiers named in `filterBy` apply to it (e.g. setting, not gender or letter). Optional `order` adds a checkbox (default on): while it is on, an entry with `"position": "before"` is placed before the main result instead of after. Off always appends. Toggling it re-orders the current result without rerolling. |
| `followUp` | Optional Off / On toggle (remembered, `default` off). When on, one entry from another tool's list is appended with `join` on every roll, and a smaller "↻ New {label}" button rerolls only that part. Turning it on or off doesn't reroll the main result. One History entry. |
| `count` | Optional. Draw N distinct entries per roll, with a stepper. |
| `join` | Separator when `count` > 1. Default `", "`. |
| `display` | `text` (default) or `glyph` (very large, for emoji). Glyph results are centred in rows: 3 fit across, 4 are 2 + 2, otherwise rows of 3 or 2 (5 = 3 + 2, 6 = 3 + 3). |
| `description` | Optional one line shown under the page title (Emoji: "Use this like Story Cubes to inspire your story."). |

## 2. List file: `content/tools/{id}.json`

```json
{
  "id": "names",
  "label": "Names",
  "version": "0.1.0",
  "provenance": { "author": "PocketRPG", "license": "original entries" },
  "modifiers": {
    "gender":  { "label": "Gender",  "values": ["f", "m", "x"],
                 "valueLabels": { "f": "Female", "m": "Male", "x": "Neutral" } },
    "setting": { "label": "Setting", "values": ["fantasy", "sci-fi", "samurai", "gothic", "modern", "western"],
                 "valueLabels": { "sci-fi": "Sci-fi" } }
  },
  "entries": [
    { "v": "Liria", "tags": { "gender": "f", "setting": "fantasy" }, "src": "curated" },
    { "v": "Rowan", "tags": { "gender": ["f", "m", "x"], "setting": ["fantasy", "modern"] } }
  ]
}
```

- `entries[]` use the pack entry shape: `v`, optional `tags`, `src`, `data`. Lists used as a `part` may also set `position`: `"after"` (default) or `"before"`.
- Tag values are a string or an array, on any key. Filtering follows `02-data-model.md` §1.2 (untagged = matches any value).
- `valueLabels` is optional. Without it the UI shows the value with its first letter capitalised.
- An empty `entries` array is valid. The tool page then says the list is empty and names the file to edit.

### Built-in modifier: `letter`
- Matches entries whose `v` starts with the chosen letter (case-insensitive, ignoring a leading "The ").
- The picker is an A–Z grid in a sheet. Letters with no entry matching the other selected modifiers are disabled.
- No declaration needed in the list file.

### Tools without a session
Until **Start play**, the Tools tab ignores the session's pack: no pack generators on the hub, and no genre default for Names (setting starts at Any). After Start play it follows the session pack as described below. The header session chip is blank until then too.

### Tilt groups
The six Tilt groups are a `group` modifier on `tilts.json` (entries tagged `{ "group": "Mayhem" }`), not a d66 table. Any = uniform draw over all entries.

## 3. Genre default: `nameSetting`
A pack may declare which library setting it matches:

```json
{ "id": "swords-and-sorcery", "nameSetting": "fantasy" }
```

Gender `x` matches only entries tagged `x` (decided 2026-10-24). Neutral names are tagged `["f","m","x"]`.

When a tool modifier has `default: "genre"`, its default is the pack's matching value. Lookup order: pack `nameSetting` (for the `setting` key), then the last value used, then Any.

Mapping (in the pack files):
| Pack | nameSetting |
|---|---|
| Starfarers, Other Tales, Redshirt Recon | sci-fi |
| Swords & Sorcery, Kitchen Khaos | fantasy |
| Blade and Spirit | samurai |
| Moon & Blood | gothic |
| The Heist, Outbreak Hotel | modern |
| The Stranger | western |
| Minimon | none |

## 4. Pack generators as tools
A pack's `generators` are shown as a second group on the hub and as chips on Track's story card. Each opens a tool page that behaves like a list tool:
- `modifiers` become dropdowns. Required ones must be set before rolling; until then the page shows the selector, not a result.
- Output is the generator's `output` template.
- If the template is a single table, any `data` payload is shown under the result (e.g. monster HP and damage).

## 5. Runtime behaviour
- **On open:** roll once with the remembered modifiers.
- **Reroll:** discard the result on screen and roll again. Never returns the result on screen. No-repeat window per list (mockup: 3).
- **Leave (Back or tab switch):** log the result on screen to Tools History.
- **Relaxation:** if nothing matches, drop optional modifiers in declaration order and mark the result "relaxed".
- **Persistence:** modifier selections per tool id. Nothing else.

## 6. Session additions
Merged into `02-data-model.md` §3 (`toolModifiers`, `toolHistory`, `trackHistory`).

## 7. Phase 1 lists
| File | Status |
|---|---|
| `names.json` | 0.2.0: six settings (about 80 to 400 names each; `modern` spans Chinese, Japanese, Korean, Vietnamese, South Asian, Middle Eastern, African, Latin American, European, Anglo, Black American/Caribbean and Pacific), gender-tagged, original entries; new ones `src: "ai"` pending review |
| `surnames.json` | 0.2.0: 46 to 170 per setting (`modern` covers the same cultures as names; East Asian entries lead). Samurai, Chinese, Japanese, Korean and Vietnamese entries have `"position": "before"` (family name first). |
| `descriptions.json` | Draft: one-word physical descriptors |
| `emotions.json` | Draft |
| `items.json` | Draft: mixed loot, tools and quest objects |
| `emoji.json` | Placeholder set; user to curate |
| `complications.json` | Empty; to draft together |
| `tilts.json` | Empty; user to supply |

## 8. Phase 2: admin mode
In-app add, hide and categorise entries. Edits stored on the device as an overlay on the JSON files, exportable as JSON. Not in Phase 1.
