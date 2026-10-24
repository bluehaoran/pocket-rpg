// Roll for Shoes engine (docs/03-rules-reference.md, docs/01-product-spec.md "Rules roll: Roll for Shoes").
import type { Character } from '../db.ts';
import type { Pack } from '../content/types.ts';
import { skillTree, statuses } from '../characters.ts';
import { rollDie, type Rng } from '../engine/rng.ts';

export type RfsResult = 'win' | 'lose' | 'tie';

export interface RfsRoll {
  kind: 'rfs';
  ci: number;
  who: string;
  /** Skill key: r, f:<field>, x:<i> or e:<i>. */
  skill: string;
  skillName: string;
  level: number;
  dice: number[];
  /** Sum of the statuses applied to this roll (negative). */
  mod: number;
  mods: string[];
  gm: number[] | null;
  spent: number;
  xpGiven: boolean;
  newSkill?: string;
  // Derived by `resolve`.
  sum: number;
  gmSum: number | null;
  allSix: boolean;
  result: RfsResult | null;
  text: string;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Fill in the derived fields from dice, modifier and GM dice. */
export function resolve(e: RfsRoll): void {
  e.sum = sum(e.dice) + e.mod;
  e.gmSum = e.gm ? sum(e.gm) : null;
  e.allSix = e.dice.length > 0 && e.dice.every(v => v === 6);
  e.result = e.gmSum == null ? null : e.sum > e.gmSum ? 'win' : e.sum < e.gmSum ? 'lose' : 'tie';
  e.text = e.result ? { win: 'Success', lose: 'Fail', tie: 'Tie' }[e.result] : `Total ${e.sum}`;
}

/**
 * Roll a skill: level d6, plus any applied statuses (their levels add to the total), optionally opposed
 * by `gmDice` d6. A failed opposed roll gives 1 XP at once (see `giveFailXp`, called by the caller).
 */
export function rollSkill(
  pack: Pack, c: Character, who: { ci: number; name: string }, key: string, applied: string[], gmDice: number, rng: Rng
): RfsRoll | null {
  const sk = skillTree(pack, c).find(s => s.key === key);
  if (!sk) return null;
  const sts = statuses(pack, c).filter(s => applied.includes(s.field));
  const e: RfsRoll = {
    kind: 'rfs', ci: who.ci, who: who.name, skill: key, skillName: sk.name, level: sk.level,
    dice: Array.from({ length: sk.level }, () => rollDie(rng, 6)),
    mod: sts.reduce((a, s) => a + s.level, 0),
    mods: sts.map(s => `${s.level} ${s.text}`),
    gm: gmDice ? Array.from({ length: gmDice }, () => rollDie(rng, 6)) : null,
    spent: 0, xpGiven: false, sum: 0, gmSum: null, allSix: false, result: null, text: ''
  };
  resolve(e);
  return e;
}

export function rfsLogText(e: RfsRoll): string {
  const total = e.dice.length > 1 || e.mod ? ` = ${e.sum}` : '';
  const mod = e.mod ? ` (${e.mod})` : '';
  const gm = e.gmSum != null ? ` vs GM ${e.gmSum}` : '';
  return `${e.skillName} ${e.level}d6: ${e.dice.join(' ')}${mod}${total}${gm} → ${e.text}${e.allSix ? ' · all sixes' : ''}`;
}

/** +1 XP for a failed roll, once. Returns the history line, or null if already given. */
export function giveFailXp(c: Character, e: RfsRoll): string | null {
  if (e.xpGiven) return null;
  c.xp = (c.xp ?? 0) + 1;
  e.xpGiven = true;
  return `+1 XP (failed ${e.skillName})`;
}

/** XP that can be spent on this roll: the character's XP, less the XP this roll just gave. */
export const xpAvailable = (c: Character, e: RfsRoll): number => (c.xp ?? 0) - (e.xpGiven ? 1 : 0);

export const canSpend = (c: Character, e: RfsRoll): boolean => xpAvailable(c, e) >= 1 && !e.allSix;

/**
 * Spend 1 XP: the lowest die that is not a 6 becomes a 6. If that turns a failed roll into a pass,
 * the failure XP is taken back. Returns history lines.
 */
export function spendXp(c: Character, e: RfsRoll): string[] {
  if (!canSpend(c, e)) return [];
  let idx = -1;
  e.dice.forEach((v, j) => {
    if (v < 6 && (idx < 0 || v < e.dice[idx]!)) idx = j;
  });
  if (idx < 0) return [];
  c.xp = (c.xp ?? 0) - 1;
  e.dice[idx] = 6;
  e.spent++;
  resolve(e);
  const lines = [`Spent 1 XP: a die becomes 6 (${e.skillName}, now ${e.sum}${e.gmSum != null ? ` vs ${e.gmSum}` : ''})`];
  if (e.xpGiven && e.result !== 'lose') {
    c.xp -= 1;
    e.xpGiven = false;
    lines.push('−1 XP: the roll no longer fails');
  }
  return lines;
}

/** All sixes: add a skill one level up as a child of the skill used. Returns the history line. */
export function addEarnedSkill(c: Character, e: RfsRoll, name: string): string | null {
  const n = name.trim();
  if (!n || !e.allSix || e.newSkill) return null;
  // Assign first: on reactive state the `??=` expression yields the raw array, not the stored proxy.
  c.earned ??= [];
  c.earned.push({ name: n, level: e.level + 1, parent: e.skill });
  e.newSkill = n;
  return `New skill: ${n} ${e.level + 1} (from ${e.skillName})`;
}
