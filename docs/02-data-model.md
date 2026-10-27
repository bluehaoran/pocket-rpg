# PocketRPG — Data Model

Updated after extracting four Lasers & Feelings hacks (Blade and Spirit, Moon & Blood, Swords & Sorcery, Other Tales), again after building the mockup's setup steps on them, and again after adding the Roll for Shoes setup. See "Changes from v1", "Changes from v2" and "Changes from v3" at the end.

## 1. Genre pack (JSON)

Example files: `content/packs/*.json` (see §1.7).

```json
{
  "id": "fantasy-core",
  "name": "Fantasy",
  "genre": "Fantasy",
  "version": "1.0.0",
  "extends": ["base-names"],
  "provenance": { "author": "…", "basedOn": "…", "license": "CC BY 4.0", "entries": "rewritten" },
  "setting": { "premise": "…" },

  "modifiers": {
    "gender":  { "label": "Gender",  "values": ["m", "f", "x"] },
    "culture": { "label": "Culture", "values": ["human", "elven", "dwarven"] }
  },

  "tables": {
    "name.given": [
      { "v": "Liria",   "tags": { "gender": "f", "culture": "elven" }, "src": "curated" },
      { "v": "Borin",   "tags": { "gender": "m", "culture": "dwarven" }, "src": "ai" },
      { "v": "Leilani", "tags": { "gender": "f", "culture": ["elven", "dwarven", "human"] } },
      { "v": "Rowan",   "tags": { "gender": ["m", "f", "x"], "culture": "human" } }
    ],
    "item.object":   [ { "v": "locket" }, { "v": "compass" } ],
    "item.material": [ { "v": "silver" }, { "v": "bone" } ],
    "spells": [ { "v": "Icebolt", "data": { "level": 1 } } ]
  },

  "generators": [
    {
      "id": "name", "label": "Name",
      "modifiers": [
        { "key": "gender",  "required": false },
        { "key": "culture", "required": false }
      ],
      "output": "{name.given} {name.family?}"
    },
    { "id": "artifact", "label": "Artifact",
      "output": "{item.material} {item.object}" }
  ],

  "seed": {
    "columns": [
      { "label": "Threat",      "table": "seed.threat" },
      { "label": "Wants to",    "table": "seed.wants", "case": "lower" },
      { "label": "The",         "table": "seed.object" },
      { "label": "Which will",  "table": "seed.consequence" }
    ],
    "template": "{0} wants to {1} the {2}, which will {3}."
  },

  "groupFields": [ { "id": "shipName", "label": "Ship name", "kind": "text", "table": null } ],

  "flavour": {
    "lasers-feelings": { "…": "see §1.3" },
    "roll-for-shoes":  { "…": "see §1.8" }
  }
}
```

`seed` may be `null` (Moon & Blood and Other Tales have no setup columns).

### 1.1 Tag values
- A tag value is a string or an array of strings, on any key.
- Every value must appear in that modifier's `values` list (checked by schema validation).
- A modifier selection in the UI is a single value.

### 1.2 Filter semantics
- An entry matches a selection if its tag for that key equals the selected value, or is an array that contains it.
- An entry with no tag for a key matches any value for that key.
- An optional modifier left unset applies no filter. A `required: true` modifier must be chosen before generating.
- If the filter returns nothing, the app relaxes optional modifiers in declaration order and marks the result "relaxed".
- `{table?}` in an output template means that slot is optional and may be empty.
- `extends`: tables from the listed packs are merged in. If a table ID appears in both, the entries are concatenated.
- `src` (`curated` | `ai`): provenance, used for auditing and filtering.
- `data` (optional, any JSON object): payload that is not a filter key, such as spell level, monster HP/damage, or an instrument's effect. It is shown or used by the generator, never matched.
- **Table-selector pattern:** when one generator draws from differently-sized sub-tables (Other Tales: one hook table per destination), use a single table whose entries are tagged by a required modifier (`body`). No schema addition needed.

### 1.3 The `lasers-feelings` flavour block

All four extracted hacks share one engine: **one number (2–5) and two checks**. One check succeeds when a die rolls **under** the number; the other when a die rolls **over** it. A high number favours the `under` check. A die equal to the number triggers a special effect. Which check is called Lasers, Feelings, Swords, Sorcery, Moon, Blood, Outer, Wilds, Blade or Spirit is a label only, so packs only name the two checks.

```json
"lasers-feelings": {
  "checks": [
    { "id": "under", "label": "Swords",  "roll": "under", "hint": "physicality, fighting…" },
    { "id": "over",  "label": "Sorcery", "roll": "over",  "hint": "magic, knowledge…" }
  ],
  "numberRange": [2, 5],
  "numberLabel": "S&S number",
  "numberRoll": { "dice": "1d6", "reroll": [1, 6] },
  "sentence": "{name}\nis {a} {style|lower} {role|lower}",

  "fields": [
    { "id": "style",  "label": "Ancestry",   "kind": "pick-or-text", "table": "lf.style" },
    { "id": "role",   "label": "Background", "kind": "pick",         "table": "lf.role" },
    { "id": "number", "label": "S&S number", "kind": "number", "range": [2, 5], "randomise": "numberRoll" },
    { "id": "name",   "label": "Name",       "kind": "text", "table": "name.fantasy" }
  ],

  "derived":   [ { "id": "hp", "label": "Max HP", "formula": "3 * N" } ],
  "resources": [ { "id": "hearts", "label": "Hearts", "start": 3, "max": 3 } ],

  "dice": {
    "base": 1,
    "bonuses": [ { "id": "prepared", "label": "Prepared", "dice": 1 } ],
    "min": 1,
    "max": 3
  },
  "outcomes": [
    { "successes": 0, "label": "Goes wrong", "text": "…" },
    { "successes": 3, "label": "Critical",   "text": "…", "picks": ["…"] }
  ],
  "exact": {
    "name": "Divine Intervention",
    "countsAsSuccess": true,
    "checks": "any",
    "text": "…",
    "options": [ { "id": "sun", "label": "Sun Spirit", "text": "…" } ],
    "questions": "divine.questions"
  },
  "help": { "text": "…" }
}
```

Field notes:
- `checks`: exactly two. Order is display order. `roll` is `under` or `over`.
- `fields`: ordered character-creation fields. `kind`: `pick` (table), `pick-or-text`, `multi` (with `count`), `number`, `text` (optional `table`, `generator`, `hint` or `examples` table). A field with no table, generator or examples is free text only. Every field with a list can be randomised. The same field kinds are used by the `roll-for-shoes` block and by pack-level `groupFields`.
- `derived`: formulas over `N` (the number), or the label of an earlier derived value (e.g. `"max SP"`). Computed on the character card, not stored.
- `resources`: tracked counters. Optional `appliesTo: { fieldId: value }` limits one to a role. Optional `states` describe thresholds (Moon & Blood hearts).
- `dice`: dice pool = `base` + selected bonuses, clamped to `min`..`max`. Bonus ids appear as toggles in the roll controls.
- `outcomes`: keyed by success count (0, 1, 2, 3+). `picks` are the choices offered on a critical.
- `exact`: effect when a die equals the number. `countsAsSuccess` varies between hacks. `options` is a choose-one list (Blade and Spirit).
- `sentence`: see §1.6.
- Other optional blocks (`fixedGear`, `roleAbilities`, `magic`, `gmGuidance`, `rest`) are display text for the character card or GM help. The app does not interpret them.
- `groupFields` no longer lives here; see §1.9. The app still reads `flavour.lasers-feelings.groupFields` when the pack has no root `groupFields`, and validation flags it.

### 1.4 Pack extras (not interpreted by the rules engine)
- `castle` and `scenarios` (Moon & Blood): dropped from the pack (decided 2026-10-24). The room tables stay, as generators.
- `provenance.license`: shown in the Packs screen. ShareAlike packs (Swords & Sorcery, CC BY-SA 4.0) must keep their license on derived data.

### 1.5 Missing flavour
If a pack has no flavour block for the chosen rules module, the app falls back:
- **Lasers & Feelings:** generic style, role and goal lists.
- **Roll for Shoes:** see §1.8 "Fallback".

### 1.6 Display, naming and library keys (added in mockup Phase 1–2)
- `genre` (pack, string): display name on Setup, e.g. "Fantasy". The pack `name` and `version` show underneath as "Based on {name} v{version}".
- `library` (pack, boolean): a pack that only supplies tables to other packs through `extends` (e.g. `base-names`). Not listed as a genre.
- `seed.columns[].case`: `"lower"` lowercases the first letter of that column's entry inside the template sentence (fixes "wants to Ruin"). The Advanced view still shows the entry as written.
- `sentence` (on any rules flavour block): template for the character sentence on the Players step.
  - `{fieldId}` inserts the field's value; `{fieldId|lower}` lowercases its first letter.
  - `{a}` inserts "a" or "an" for the next field's value; `{a|cap}` gives "A" or "An".
  - `\n` is a line break. A field named `name` is shown larger.
  - Fields not in the template are listed as rows under the sentence. In L&F the `number` field is always shown as the number bar.
  - If absent: L&F uses `{name}\nis {a} {style|lower} {role|lower} who wants to\n{goal|lower}`, dropping parts whose fields don't exist. Roll for Shoes uses `{name}\nis {a} {concept|lower}`.
- `fields[].filterBy` (v5): array of field ids. When the field's `table` is drawn or listed, entries are filtered by each named field's current value, as a modifier with the same key (so the pack must declare that modifier, and the source field must be a single value). Blade and Spirit: the pack animal in `gear.extra` is tagged `role: Farmer`, and the gear field has `"filterBy": ["role"]`. A source field that is empty applies no filter. Changing the source field never rewrites the dependent value.
- `fields[].generator`: fill the field from a pack generator (e.g. Starfarers' name = `{name.given} {name.family?}`).
- `fields[]` with `kind: "text"` and a `table` (or `generator`, or `examples`): free text that can also be randomised. `table: null` with no generator or examples means free text only, with no randomise button.

### 1.7 Example packs (`content/packs/`)
| File | Genre | Notes |
|---|---|---|
| `starfarers.json` | Sci-fi | Original entries. Classic L&F shape plus ship group fields. L&F only (v0.4.0). |
| `swords-and-sorcery.json` | Fantasy | CC BY-SA 4.0. Derived stats (HP, SP, WD, EN). Number rolled 1d6, reroll 1 and 6. |
| `blade-and-spirit.json` (private) | Samurai | Blade fields, choose-one exact effect, starting gear field. |
| `moon-and-blood.json` | Gothic horror | No seed. Hearts and class-specific resources. Castle as group fields. |
| `other-tales.json` (private) | Space exploration | No seed, no name field. Ship as group fields. Destination-filtered hooks. |
| `base-names.json` | (library) | `name.fantasy`, `name.samurai`, `name.gothic`. |
| `rfs-base.json` | (library) | Roll for Shoes NPC tables (d66 description, d66 personality, body part; CC0) + original `name.modern`, `name.western`. |
| `the-heist.json` | Heist | RfS setting, CC0. Professions, Twists. |
| `kitchen-khaos.json` | Fantasy comedy | RfS setting. Species; extends `base-names` for names. 6 intro questions. |
| `minimon.json` | Monster catching | RfS setting. Locations, Forms, Types (12). Skill and status fields. |
| `outbreak-hotel.json` | Zombie survival | RfS setting. Occupations. Optional phobia status; worried-about NPC field. |
| `redshirt-recon.json` | Sci-fi comedy | RfS setting. Dangers, Species, Signal sources. Team leader as group field. |
| `the-stranger.json` | Western | RfS setting. Professions. |

**(private)** packs live in `content/private/packs/`, which is gitignored: their sources have no licence that allows publishing (see `NOTICE`). Local builds and `npm run validate` include them when the folder exists.

Only the six settings have Roll for Shoes data. The four hacks use the fallback (§1.8). Setting entries marked `src: "pocketrpg"` are original additions where the source only gives a prompt (e.g. reasons for joining, phobias, equipment).

### 1.8 The `roll-for-shoes` flavour block

```json
"roll-for-shoes": {
  "rootSkill": "Do anything",
  "fields": [
    { "id": "name",    "label": "Name",    "kind": "text",         "generator": "name" },
    { "id": "concept", "label": "Concept", "kind": "pick-or-text", "table": "rfs.concept" }
  ],
  "sentence": "{name}\nis {a} {concept|lower}",
  "starterSkills": { "table": "rfs.skill", "count": 0, "max": 3, "level": 2 }
}
```

- `rootSkill`: name of the level-1 skill every character starts with. Default "Do anything".
- `fields`: same kinds as §1.3. Normally a name and a one-line concept. No `number` field.
- `sentence`: §1.6.
- `starterSkills` (optional): house rule for extra starting skills.
  - `table`: list used to randomise skill names. Optional; without it, skills are free text plus the generic list.
  - `count`: default number per character (0 = original rules).
  - `max`: upper limit for the Setup stepper.
  - `level`: level of each starting skill (default 2). Starting skills are children of the root skill.

**Fallback** (pack has no `roll-for-shoes` block):
- Name: the pack's L&F `name` field definition if it has one; otherwise free text.
- Concept: `pick-or-text` from every `lf.style` × `lf.role` pair ("Brash pilot") when both tables exist; otherwise free text.
- Starting skills: generic skill list, `count` 0, `max` 3, `level` 2.
- Setup shows "· generic lists" on the Roll for Shoes row.

### 1.8a Setting-defined skills and statuses (Roll for Shoes)
Any `roll-for-shoes.fields[]` entry may carry:
- `skill: { level }` — the field's value is also a skill, child of the root, at that level (Minimon: aligned element 2, signature move 3).
- `status: { level, format, optional }` — the value is also a status (Minimon: `"Weak to {v}"`, -2). `optional: true` means the GM may apply it (Outbreak Hotel phobia); the field also stays a normal row.

These are separate from `starterSkills` (house rule). The tree on the card is: root, then field skills, then extra skills.

### 1.8b The `story` block (pack level)
```json
"story": {
  "questions": [ { "id": "item", "text": "What is the treasured item?", "table": null } ],
  "segments": [ { "name": "Action!", "text": "…", "tables": ["twist"] } ],
  "note": "Larger groups: add NPC teammates."
}
```
- `questions`: introduction prompts the table answers aloud. Answers are optional free text, saved per session. `table` (optional) adds a randomise die.
- `segments`: ordered scenes with GM guidance. `tables` are **generator ids** the scene uses; shown as "Roll:" chips.
- Used alongside or instead of `seed`. Rules-independent.

### 1.8c Generator output: `{table|lower}`
Generator templates accept `|lower` (whole value lowercased), e.g. `"{npc.personality} {npc.description|lower} {heist.profession|lower}"`.

### 1.8d Native vs adapted packs
- A pack is **native** to a rule system if it has that system's flavour block. **Setup lists only native packs** (decided 2026-10-23, to keep it simple). The fallbacks below stay in the engine as a safety net (e.g. an imported pack) but are not offered in the UI.
- L&F fallback for a pack with only `roll-for-shoes`: its RfS fields (skill/status stripped to plain fields) + a number field, its RfS `sentence`, generic Lasers/Feelings checks and dice.
- RfS fallback for a pack with only `lasers-feelings`: §1.8 "Fallback".

### 1.9 Pack-level `groupFields`
- Fields chosen once for the party or setting (ship, castle). Shown on the Story step for both rule systems.
- Same field kinds as §1.3.
- Moved from `flavour.lasers-feelings.groupFields` to the pack root in v4, because they describe the setting, not the rule system.

## 2. Rules module (TypeScript)

Roll resolution needs logic, so rules modules are code, not data.

```ts
interface RulesModule {
  id: string;
  name: string;
  newCharacter(pack: Pack, rng: Rng, opts?: { starterSkills?: number }): Character;
  rollControls(c: Character): Control[];
  resolve(c: Character, input: RollInput, rng: Rng): RollResult;
  apply(c: Character, r: RollResult): Character;
  card(c: Character): CardView;
}
```

| | Lasers & Feelings engine (all four hacks) | Roll for Shoes |
|---|---|---|
| Character | `fields` values from the pack (always includes `number`), resources | `fields` (name, concept), `skills` tree, `xp` |
| New character | random value for each randomisable field; resources at `start` | random name and concept; root skill at level 1; N starting skills (session setting) at `starterSkills.level`, no duplicate names |
| Input | check id (`under`/`over`), bonus ids | skill index, opposed total (optional) |
| Result | dice[], successes, exact flag, outcome | dice[], sum, allSixes flag |
| `apply` | adjusts resources only if the pack marks a roll as costly (none do automatically) | +1 XP on fail; prompt for a new skill on all sixes |

Resolution for the L&F engine:
1. Pool = `base` + sum of selected bonuses, clamped to `[min, max]`.
2. Roll the pool. A die succeeds if it meets the chosen check (`under`: die < N, `over`: die > N).
3. If `exact.countsAsSuccess`, a die equal to N also succeeds. Set the exact flag on any die equal to N.
4. Look up the outcome by success count (3+ uses the 3 entry).

One engine therefore covers every hack. Adding a hack is a data change.

The generic d6, 2d6, and d20 roller sits outside any rules module and is always available.

## 3. Session (IndexedDB)

Merged from `05-tools-library.md` §6 (2026-10-24). `log` and `pins` are gone; pins were dropped from the product.

```ts
interface Session {
  id: string;
  createdAt: string;
  started: boolean;                      // false = setup wizard, true = in play
  packIds: string[];
  rulesId: string;                       // "lasers-feelings" | "roll-for-shoes" | "kintsugi"
  players: number;                       // 1–4
  starterSkills?: number;                // Roll for Shoes only; unset = pack default
  gmDice?: number;                       // Roll for Shoes: GM dice for opposed rolls, 0 = off; remembered
  gmSkill?: number;                      // Kintsugi: GM skill for opposed rolls, 0 = off; remembered
  answers: Record<string, string>;       // story.questions id -> answer (optional)
  characters: Character[];               // 1–4
  seed?: { columns: string[]; text: string };   // the current seed; saved automatically
  group: Record<string, string | string[]>;     // groupFields values (ship, castle)
  recent: Record<string, string[]>;      // tableId or "lib:<listId>" -> recent values (no-repeat window)
  lastModifiers: Record<string, Record<string, string>>;           // pack generatorId -> selections (field randomising)
  toolModifiers: Record<string, Record<string, string | number | boolean>>; // toolId -> selections (incl. dice type/count, emoji count, parts, followUp)
  toolHistory: ToolHistoryEntry[];
  trackHistory: TrackHistoryEntry[];
}

interface ToolHistoryEntry {
  t: string;                             // ISO time
  tool: string;                          // tool id, or "pack:<generatorId>"
  label: string;
  text: string;                          // plain text as shown, incl. parts and follow-up
  modifiers?: Record<string, string>;
  relaxed?: boolean;
}

interface TrackHistoryEntry {
  t: string;
  kind: "roll" | "progress" | "resource" | "edit";
  char?: string;                         // character display name at the time
  text: string;
  detail?: unknown;                      // e.g. the full roll result
}

interface Character {
  id: string;
  fields: Record<string, string | string[] | number>;   // keyed by flavour field id
  resources: Record<string, number>;                    // L&F: keyed by resource id
  xp?: number;                                          // Roll for Shoes
  extra?: string[];                                     // Roll for Shoes: starting-skill names (house rule), children of the root
  earned?: { name: string; level: number; parent: string }[];  // Roll for Shoes: skills earned in play
}
```

- Roll for Shoes skill tree is derived, not stored: root (`rootSkill`, level 1), then field skills (§1.8a), then `extra`, then `earned`.
- `earned[].parent` is a skill key: `r` (root), `f:<fieldId>`, `x:<i>` (starting skill) or `e:<i>` (earned).
- Statuses are derived from fields with `status` (§1.8a). Which statuses apply to the next roll is UI state, not stored.
- Tool results are not persisted except as `toolHistory`. Modifier selections persist per tool.

## 3.1 Tool list edits (IndexedDB, device-wide)
Separate from sessions: table `listEdits` (Dexie schema v2, key `listId`) holds `{ listId, added: Entry[], hidden: string[] }`. It survives New session and session deletion. Rules and screens: `05-tools-library.md` §8.

## 4. AI content pipeline (offline)
1. For each table and tag combination, prompt an LLM for N entries in pack JSON format.
2. Merge duplicates across tag combinations into one entry with array tags (e.g. "Leilani" generated for elven and human becomes `culture: ["elven", "human"]`).
3. Review by hand.
4. Set `"src": "ai"` on generated entries.
5. Validate the pack against a JSON Schema before shipping.

## Changes from v1
Found while extracting four Lasers & Feelings hacks.

1. **Two checks, not Lasers/Feelings.** `flavour.lasers-feelings.labels` and `numberMeaning` removed. Packs define `checks: [{ roll: "under" }, { roll: "over" }]`. Which label maps to which direction differs by hack and does not matter to the engine.
2. **`fields[]` replaces `styles`/`roles`.** Character creation differs (ancestry/background, role/personality/motivation, lineage, blade traits). Fields are an ordered list.
3. **Dice, outcomes, exact effect, help** are pack data (`dice`, `outcomes`, `exact`, `help`). Bonus dice and caps differ per hack (1–3d or 1–4d).
4. **`derived` and `resources`** added for hit points, spirit, hearts, incense, sulphur.
5. **`groupFields`** for party-level choices (ship, castle).
6. **Entries gain `data`** for non-filter payload (spell level, monster stats, instrument effect).
7. **`seed` can be `null`.**
8. **`provenance`** block (author, license, rewritten or verbatim entries).
9. **Table-selector pattern** (one required modifier selects sub-tables; no engine change).
10. **Character** in the session stores `fields` and `resources` maps instead of fixed L&F properties.
11. `RulesModule` for L&F is a single data-driven engine instead of one module per hack.

## Changes from v2
Found while building the mockup's Setup, Story and Players steps on the four hacks.

1. **`genre`** added for display. Pack `name` becomes the "Based on" line.
2. **`library`** flag for packs that only supply tables (`base-names`).
3. **`extends` in use.** Swords & Sorcery, Blade and Spirit and Moon & Blood extend `base-names` for their name tables. The sources have no name lists.
4. **Name fields are typed or randomised.** `kind: "text"` with a `table` allows both.
5. **`sentence`** template on the L&F flavour block (§1.6).
6. **`seed.columns[].case`** for mid-sentence capitals.
7. **`fields[].generator`** for fields filled by a generator.
8. **Blade and Spirit fixes:** declared a `role` modifier (its gear table tags an entry `role: Farmer`); `startingGear` became a `gear` pick field.
9. **Number direction:** a high number favours the check rolled **under** (Lasers, Swords, Blade, Moon, Outer). The earlier `03-rules-reference.md` had this reversed; fixed.
10. **Story seed is no longer pinned.** The current seed is the session seed (`Session.seed`).

## Changes from v3
Found while adding the Roll for Shoes setup to the mockup.

1. **`groupFields` moved to the pack root** (§1.9). Party fields are setting data and must survive a rule-system switch. Old location is read as a fallback and flagged by validation.
2. **`roll-for-shoes` flavour block** defined (§1.8): `rootSkill`, `fields`, `sentence`, `starterSkills`. Replaces the earlier placeholder `{ "starterSkills": "rfs.skill" }`.
3. **Roll for Shoes fallback** (§1.8) reuses the pack's L&F name field and `lf.style` × `lf.role` tables, so every existing pack works with Roll for Shoes without new data.
4. **`sentence` is per rules flavour**, not L&F only (§1.6).
5. **Session gains `starterSkills`**; **Character gains `skills` and `xp`**; `Skill` type added (§3).
6. **Starfarers v0.3.0:** `rfs.concept` and `rfs.skill` tables and a `roll-for-shoes` block.
7. **Pack files:** `starfarers.json` migrated. `moon-and-blood.json` and `other-tales.json` still carry `groupFields` inside the L&F block in `packs/`; the mockup's embedded copies are migrated.

## Changes from v4
Found while reading the official Roll for Shoes settings (rollforshoes.com/settings, CC0) and putting the rule system first on Setup.

1. **`story` block** (§1.8b): introduction questions + scene outline. RfS settings have no d6 seed sentence.
2. **Field `skill` / `status`** (§1.8a): settings can grant skills and statuses through character fields.
3. **`{table|lower}`** in generator output (§1.8c).
4. **Native vs adapted** packs (§1.8d), and an L&F fallback built from RfS fields.
5. **Six setting packs + `rfs-base` library** (§1.7).
6. **Session gains `answers: Record<questionId, string>`**. Character gains `statuses?: { text, level, field? }[]`; `skills[]` entries gain `field?` (field-linked skill).
7. `other-tales.json` migrated to root `groupFields`. `moon-and-blood.json` migrated in v6.
8. **Rule systems separated on Setup:** only native packs listed. Starfarers v0.4.0 drops its `roll-for-shoes` block and `rfs.*` tables, so L&F and RfS pack lists don't overlap.

## Changes from v5
Build start, 2026-10-24.

1. **Session** (§3) absorbs `05-tools-library.md` §6: `toolModifiers`, `toolHistory`, `trackHistory`. `log` and `pins` removed. `started` and `players` added. Character gains `extra` and `earned`; stored `skills`/`statuses` replaced by derivation.
2. **`nameSetting`** on packs (`05-tools-library.md` §3) is now in every pack file that has a mapping.
3. **Moon & Blood** `castle`/`scenarios` dropped. `groupFields` migrated to the pack root in every pack.
4. **Decisions:** gender `x` matches only entries tagged `x` (explicit); no-repeat window 3; `filterBy` on fields to be implemented (specified in M4).
5. Pack and tool files moved to `content/packs/` and `content/tools/` in the repo. JSON Schemas in `schemas/`.
6. Blade and Spirit and Other Tales moved to the gitignored `content/private/packs/` (licensing).

## Open questions (carried)
1. Blade and Spirit seed tables are unnumbered in the source. Entry order is a guess.
2. Roll for Shoes fallback concept list is every style × role pair (36 entries for Starfarers-sized tables). A: keep; B: cap or sample; C: require packs to supply `rfs.concept`. Fallbacks are not offered in Setup, so low priority.

## Changes from v5 (2026-10-24)
1. **`fields[].filterBy`** added (§1.6). Schema, types and validation updated.
2. **Session gains `gmDice`** (Roll for Shoes opposed-by-GM setting, remembered across rolls).

## Changes: Kintsugi (2026-10-26)
1. **`kintsugi` flavour block** on packs: `fields`, `sentence`, `rootSkill`, `rootLevel`, `maxSkills`, `newSkillLevel` (schema `kintsugi`; type `KintsugiFlavour`). `RULES` gains `kintsugi`.
2. **Character gains `skills`** (`{ name, level, out? }[]`): Kintsugi's learned skills. **Session gains `gmSkill`.**
3. New pack `content/packs/kintsugi.json` (CC BY 4.0), with a four-column `seed`. Rules: `03-rules-reference.md` "Kintsugi".
