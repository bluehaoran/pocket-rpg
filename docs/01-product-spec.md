# PocketRPG — Product Spec

## Purpose
A phone tool for the GM of a story-heavy, crunch-light RPG played by conversation (for example, in a car). The GM narrates. The app tracks the game state and supplies random elements and dice results on demand, without breaking the flow of narration.

Example: "You meet a friendly elf named…" → Tools → Names (female, fantasy) with Description on → "Liria — weary". "She's lost her…" → Items → "silver locket".

## Users
- **GM (primary user):** operates the app. Not driving.
- **Players (1–4, default 1):** do not touch the app.

## Design principles
1. A result appears in under 2 seconds. No network calls during play.
2. Glanceable: large text, short results.
3. Low-tap: modifier settings are remembered, so a repeat roll is one tap.
4. Quiet capture: accepted tool results, and every rules roll and state change, go into a session History without extra taps.

## Decisions
| Area | Decision |
|---|---|
| Interaction | Tap only (no voice). Free-text entry is allowed for fields such as names, always alongside a randomise button. |
| Platform | PWA, offline-first, installable |
| Navigation | Two tabs: **Track** and **Tools**, both available from launch. |
| Content: rules and setting | Genre packs (JSON), one per setting, written for one rule system. |
| Content: GM tools | Global tools library (JSON), independent of packs. See `05-tools-library.md`. |
| Content source | Curated lists + pre-generated AI content (offline batch). No live AI calls. |
| Tag values | String or array on any key (e.g. androgynous names, names shared across settings) |
| Rules | Lasers & Feelings (one data-driven engine covering its hacks) and Roll for Shoes |
| Packs vs rules | Setup lists only packs native to the chosen rule system |
| Characters | 1–4, default 1 |
| Setup flow | One-off wizard inside Track: Setup → Story → Players → Start. New session from the Track menu. |
| Story seed | Saved to the session automatically |
| History | Two per session: Track History (rolls and state changes) and Tools History (accepted results). Current session only. |
| Pins | Dropped |
| Tool result logging | A tool result is logged when the GM leaves the tool page. Rerolling discards the result on screen. |
| Tool memory | Modifier settings persist per tool. Results do not. |
| Library editing | JSON files only in Phase 1. In-app admin mode (add, hide, categorise entries) is Phase 2. |

## Screens

### Shell
- Header: app name, session chip (genre · rules · players), menu (Welcome, Pack details, New session). Until **Start play**, the chip is a link reading "No story in progress. Click to start" that opens setup.
- **Welcome screen** (`#/welcome`, copy in `content/welcome.json`): shown on launch with no specific screen requested and no story in progress, explains Track and Tools, and has a "Don't show this screen on startup" checkbox (stored per device in localStorage). Also reachable from the menu. Tools works without a story: before Start play it ignores the session's genre.
- Bottom bar: **Track** | **Tools**.

### Track tab, before play: setup wizard
Steps 1–3 as built in mockup Phases 1–2. A step indicator replaces the old step tabs. The last step ends in **Start play**, which switches Track to its play state. After that, setup values are edited on Track itself.

#### 1. Setup
- **Rule system** first: Lasers & Feelings or Roll for Shoes.
- **Genre / Setting:** one row per pack native to that rule system. The title is the pack's `genre`. Underneath: "Based on {pack name} v{version}". Library packs are not listed.
- **Starting skills** (Roll for Shoes only): stepper, 0 to `starterSkills.max`. House rule; 0 is the original rules.
- **Players:** stepper, 1–4.

#### 2. Story
- L&F packs with a seed: **Text** / **Advanced** tabs, then **Roll all**. Tap an underlined part to reroll only that part.
- Roll for Shoes settings: introduction questions (optional typed answers) and the scene outline.
- **Shared by the party:** the pack's `groupFields`.
- **Premise:** the pack's `setting.premise`.

#### 3. Players
- `← Player 2 of 4 →` when there is more than one player.
- The character is shown as a sentence built from the pack's `sentence` template. Each field is underlined and tappable. The name is larger and on its own line.
- L&F: number bar `[over-check ▮▯▯▯ under-check] N`, derived stats and resources as chips.
- Roll for Shoes: XP, skill tree, statuses.
- Fields not in the sentence are listed as tappable rows.
- **Roll all** rerolls the current character's randomisable fields.
- **Edit sheet** per field kind: `pick`, `pick-or-text`, `multi`, `number`, `text`.

### Track tab, in play
Shows the current state of the session. Not history.

**Story card** (top)
- The seed sentence (L&F) or the introduction answers (Roll for Shoes).
- Party fields (ship, castle, team leader).
- **Pack generator chips** under the card: one per pack generator. Tapping one opens that generator's tool page in Tools.
- Tapping the seed or a field opens the same edit sheet as setup. Edits are logged.

**Party** (decided 2026-10-23: compact cards)
- One compact card per character, stacked:
  - **Name row:** name, a short line (e.g. "Leader sorcerer"), key stats (L&F: the number; Roll for Shoes: XP and skill count), and ›. Tapping it opens the character page.
  - **Roll controls directly on the card.**
    - L&F: resource counters (− / +), bonus toggles, and the two check buttons.
    - Roll for Shoes: status toggles, and the skills as roll chips (name and dice).
- No character description on Track.
- **Character page** (from the name row):
  - ← → between players, back to Track.
  - **Read-only**: the character sentence as plain text (empty fields and their commas dropped), number bar, derived stats, and other fields as label/value rows.
  - The full roll controls: L&F check hints, exact-number and help text; Roll for Shoes skill tree with indentation.
- Characters are not editable in play. Their fields are set during setup.

**Rules roll: L&F**
- Bonus toggles from `dice.bonuses` (e.g. Prepared, Expert). Pool = `base` + bonuses, clamped to `min`..`max`. Toggles reset after each roll.
- One large roll button per check, in `checks` order: label, pool, "under N" / "over N", and the check's hint.
- The result shows:
  - each die, marked success, fail, or exact
  - success count and outcome from `outcomes`
  - critical picks
- If a die equals the number, the result also shows `exact`:
  - `options` as a choose-one list (Blade and Spirit)
  - `questions` as a list, or a "Draw a question" button when it names a table
- Help text from `help` is shown under the controls.

**Rules roll: Roll for Shoes**
- Tap a skill to roll level × d6.
- Optional **Opposed by GM**: off, or 1–4 d6, remembered. When set, the app compares sums. A tie is shown as a tie and the GM decides.
- Status toggles (e.g. −2 Weak to Fire) apply to the next roll only.
- After the dice:
  - Fail: +1 XP (automatic when opposed, otherwise a "Failed: +1 XP" button).
  - Spend XP: turns the lowest non-6 die into a 6. XP earned from this roll can't be spent on it.
  - All sixes: prompt to name a new skill one level higher, as a child of the skill used.

**Roll result placement:** deferred (2026-10-24). Built as one swappable component with three presentations: bottom sheet (default), inline on the card, full page. Dev builds keep the mockup's toggle; pick one after play-testing on a phone.

Rules rolls have no reroll, so they are logged when made. Done dismisses the result.

**History** (button on Track)
- Records rules rolls, progression (XP gained and spent, new skills), resource changes, and edits to the story card.
- Newest first, with time and character.

### Tools tab
**Hub**
- Large buttons, one per tool in the library registry, in registry order: Dice, Names, Description, Items, Emotions, Complication, Tilt, Emoji.
- Second group: the active pack's generators, under the pack's genre name.
- **History** button.

**Tool page**
- Opens with a fresh result already rolled.
- Large result in the centre. Modifier controls under the result, remembered per tool.
- Bottom dock: **Reroll** (⅔ width) and a **✓** button (⅓ width).
- ✓ or Back returns to the hub and logs the result on screen to Tools History.
- Rerolling discards the result on screen. It is not logged.
- No-repeat window per list within a session (mockup uses 3).
- If no entries match the modifiers, optional modifiers are relaxed in order and the result shows a "relaxed" note.

**Phase 1 tools** (detail in `05-tools-library.md`)
| Tool | Modifiers | Result |
|---|---|---|
| Dice | count 1–10 (stepper); type d4, d6, d8, d10, d12, d20, d100 | each die and the total |
| Names | gender; setting; starting letter (A–Z sheet, letters with no match disabled); last name Off / On (default Off), with an "Honour traditional family name order?" checkbox (default on); description Off / On (default Off) | a name, with a last name from the same setting when on. The last name is underlined on screen, so its position is clear; History stores plain text. With the box ticked, family names marked `before` (samurai, Chinese) lead: "Fujiwara Kaede". Unticked, the last name always goes last. Changing the box re-orders the name on screen; it does not reroll. With description on, one word is appended ("Liria — weary"); a smaller **↻ New description** button under the result rerolls only the description, and the main Reroll draws a new name and a new description. Logged as one entry. |
| Description | none | one physical word (tall, rotund) |
| Emotions | none | one emotion (weary, delighted) |
| Items | none | one item from a mixed list (loot, tools, quest objects) |
| Complication | none yet | list to be drafted |
| Tilt | none yet | list from the user |
| Emoji | count 1–6, default 3 | emoji |
| Pack generators | the generator's `modifiers` (dropdowns; required ones must be set) | the generator's output, with any `data` payload shown underneath |

**Names: setting default:** the session genre's mapped name setting if one exists (`nameSetting` on the pack), otherwise the last setting used, otherwise Any.

**History** (button on Tools): accepted results, newest first, with time and tool.

### Pack details
From the header menu: installed packs, validation results, licence, raw JSON. Import and export are later.

## PWA requirements
- Service worker caches the app shell, all installed packs and the tools library.
- Session data stored in IndexedDB.
- Screen Wake Lock while a session is in play.
- Haptic feedback on each result (where supported).
- Large tap targets within thumb reach.

## Decisions at build start (2026-10-24)
| Question | Decision |
|---|---|
| Stack | Vite + TypeScript + Svelte 5 (no SvelteKit), hash router, vite-plugin-pwa, Dexie (IndexedDB) |
| Hosting | GitHub Pages, deployed by GitHub Actions |
| Source of truth | The GitHub repo (`bluehaoran/pocket-rpg`). The claude.ai Project keeps a pointer. |
| No-repeat window | 3 |
| Genre picker for 5–10+ packs | Picker sheet |
| `filterBy` on fields | Implement |
| Gender `x` vs `["m","f"]` | Explicit only: `x` matches entries tagged `x` |
| Moon & Blood `castle`/`scenarios` | Dropped |
| Roll for Shoes ties | Show "Tie"; the GM decides |
| Roll result placement | Deferred; swappable component |

## Open questions
1. Roll result placement: pick after phone testing.
2. Complication list (draft together), Tilt list (from the user), Emoji list (user to curate).

## Next steps
- See `06-build-plan.md`.
