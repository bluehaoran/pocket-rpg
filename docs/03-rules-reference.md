# PocketRPG — Rules Reference

Summaries of the two supported systems, written as implementation notes.

## Lasers & Feelings (John Harper)

### Character
- One number, 2–5.
  - **High** number: better at **Lasers** (technology, science, cold rationality, calm, precise action).
  - **Low** number: better at **Feelings** (intuition, diplomacy, seduction, wild, passionate action).
- Also: style, role, goal, name. In the app these come from the pack's `fields`.

Hacks rename the two checks (Swords/Sorcery, Blade/Spirit, Moon/Blood, Outer/Wilds). In every one checked, the check rolled **under** the number is the one a high number is good at. The app labels the number bar with the `over` check on the low end and the `under` check on the high end.

### Roll
- Dice: 1d6, +1d6 if prepared, +1d6 if expert (1–3d6). Hacks change the bonus names and the cap (Moon & Blood: up to 4d6); see the pack's `dice` block.
- Lasers: a die succeeds if it rolls **under** the number.
- Feelings: a die succeeds if it rolls **over** the number.
- A die **equal** to the number is "Laser Feelings": it counts as a success, and the player may ask the GM a question that the GM answers honestly. Hacks rename this and may change it (Blade and Spirit: not a success; choose one of three spirits). See the pack's `exact` block.

### Outcome by number of successes
| Successes | Outcome |
|---|---|
| 0 | Failure; things get worse |
| 1 | Success with a complication |
| 2 | Clean success |
| 3 | Critical success, with an extra effect |

### One-page setup
The GM sheet uses d6 tables, one per column, that combine into a story seed sentence: threat / wants to / object / consequence. Implemented in the app as the Story step, with the columns supplied by the genre pack. Some hacks have no setup columns (`seed: null`).

## Roll for Shoes

### Character
- Starts with one skill: **Do anything**, level 1.
- Skills form a tree. Each new skill is a more specific child of the skill used to earn it.
- XP starts at 0.
- The rules define no other character data. The app adds a name and a one-line concept for the GM's benefit; neither affects rolls.

### Roll
- Roll Nd6, where N is the level of the skill used.
- Opposed by the GM (or a target number). The higher sum wins.
- **All dice show 6:** gain a new skill one level higher than the skill used, named after the action (e.g. "Do anything 1" → "Pick locks 2").
- **Failure:** gain 1 XP.
- **Spend XP:** each point turns one die into a 6, which can be used to trigger a new skill.

### Official settings (rollforshoes.com/settings, CC0)
Six settings, all with the same shape:
- **Introduction:** 2–6 questions the table answers (the item and its security; the occasion and the rare ingredient; the town's name and landmarks…).
- **Character prompts:** 3–4 things each player writes, e.g. name + short description, job, reason for joining. No stats. Only Minimon adds mechanics: aligned element (level-2 skill), weak element (permanent -2 status), signature move (level-3 skill). Outbreak Hotel's phobia may become a -2 status at GM discretion.
- **Gameplay segments:** three scenes (setup, escalation, climax) with GM guidance. No clocks or counters.
- **Random tables:** one to three d6 lists (professions, twists, dangers, locations…). NPCs combine a d66 description + d66 personality (Tools page) with a setting profession.

| Setting | Questions | Character prompts | Tables |
|---|---|---|---|
| The Heist | 2 | name/desc, team job, reason | Professions, Twists |
| Kitchen Khaos | 6 | name/desc, court position, feast task | Species |
| Minimon | 3 | species/desc, origin, element (skill 2), weakness (-2), signature move (skill 3) | Locations, Forms, Types (2d6 → 12) |
| Outbreak Hotel | 2 | name/desc, why at the hotel, phobia | Hotel occupations |
| Redshirt Recon | 3 | name/desc, lowly job, why chosen, equipment | Dangers, Species, Signal sources |
| The Stranger | 3 | name/desc, living, spare time | Professions |

Statuses: a named modifier with a negative level (e.g. "-2 Weak to Fire"), defined on the site's Extras page. The app shows them on the character card; how they modify rolls is a Phase 3 question.

### Setup in the app
- No d6 seed table in the rules. Settings packs use the `story` block (questions + scene outline) on the Story step. Other packs use their seed.
- Players step: name, concept, skill tree (root only), XP 0.
- **Starting skills (house rule, optional):** 0–3 per character, set on Setup. Each is a level-2 child of Do anything. Default 0, which is the original rules. Names come from the pack's `starterSkills.table` or a generic list, or are typed.

### App behaviour in play (Phase 3)
- On all sixes, the app prompts the GM to name the new skill and adds it as a child node.
- On failure, the app increments XP.
- The roll screen offers to spend XP after the dice are shown.

## Generic dice
Always available, independent of the rules module: d6, 2d6, d20. Results are logged as `kind: "roll"`, `source: "dice"`.
