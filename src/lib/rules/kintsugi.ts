// Kintsugi engine (docs/03-rules-reference.md "Kintsugi"). One d6 at or under a skill succeeds; failing grows you.
import type { Character } from '../db.ts';
import type { KintsugiFlavour, Pack } from '../content/types.ts';
import { rollDie, type Rng } from '../engine/rng.ts';

export type KinResult = 'win' | 'lose' | 'tie';

export interface KinRoll {
  kind: 'kin';
  ci: number;
  who: string;
  /** Skill key: `r` for the root skill, `s:<i>` for a learned skill. */
  skill: string;
  skillName: string;
  level: number;
  die: number;
  /** The GM's skill and die when the roll is opposed. */
  gm: { skill: number; die: number } | null;
  // Derived by `resolve`.
  total: number;
  gmTotal: number | null;
  result: KinResult;
  text: string;
  // Progress from failing, applied once.
  failHandled: boolean;
  /** "Kicking 3 → 4", or that the skill was crossed out. */
  grew?: string;
  /** Failed the root skill: a new skill is waiting to be named. */
  needsSkill: boolean;
  newSkill?: string;
}

export interface KinSkill {
  key: string;
  name: string;
  level: number;
  root?: boolean;
  out?: boolean;
  /** Index into `skills`; absent for the root skill. */
  index?: number;
}

export const DEFAULT_KINTSUGI: Required<Omit<KintsugiFlavour, 'fields' | 'sentence'>> = {
  rootSkill: 'Do Anything',
  rootLevel: 2,
  maxSkills: 3,
  newSkillLevel: 3
};

export const kintsugiConfig = (f: KintsugiFlavour | undefined) => ({ ...DEFAULT_KINTSUGI, ...f });

/** The root skill, then learned skills in the order they were gained. */
export function kinSkills(f: KintsugiFlavour | undefined, c: Character): KinSkill[] {
  const k = kintsugiConfig(f);
  return [
    { key: 'r', name: k.rootSkill, level: k.rootLevel, root: true },
    ...(c.skills ?? []).map((s, i) => ({ key: 's:' + i, name: s.name, level: s.level, out: !!s.out, index: i }))
  ];
}

/** Fill in the derived fields from the dice and skills. Opposed ties go to the higher skill, then the higher die. */
export function resolve(e: KinRoll): void {
  if (!e.gm) {
    e.total = e.die;
    e.gmTotal = null;
    e.result = e.die <= e.level ? 'win' : 'lose';
    e.text = e.result === 'win' ? 'Success' : 'Failed';
    return;
  }
  e.total = e.die + e.level;
  e.gmTotal = e.gm.die + e.gm.skill;
  const cmp = e.total - e.gmTotal || e.level - e.gm.skill || e.die - e.gm.die;
  e.result = cmp > 0 ? 'win' : cmp < 0 ? 'lose' : 'tie';
  e.text = { win: 'Success', lose: 'Failed', tie: 'Tie' }[e.result];
}

/** Roll a skill: 1d6, opposed by the GM's 1d6 plus `gmSkill` when that is above 0. Null for a missing or crossed-out skill. */
export function rollSkill(
  f: KintsugiFlavour | undefined, c: Character, who: { ci: number; name: string }, key: string, gmSkill: number, rng: Rng
): KinRoll | null {
  const sk = kinSkills(f, c).find(s => s.key === key);
  if (!sk || sk.out) return null;
  const e: KinRoll = {
    kind: 'kin', ci: who.ci, who: who.name, skill: key, skillName: sk.name, level: sk.level,
    die: rollDie(rng, 6),
    gm: gmSkill > 0 ? { skill: gmSkill, die: rollDie(rng, 6) } : null,
    total: 0, gmTotal: null, result: 'win', text: '', failHandled: false, needsSkill: false
  };
  resolve(e);
  return e;
}

export function kinLogText(e: KinRoll): string {
  const vs = e.gm ? ` + ${e.level} = ${e.total} vs GM ${e.gm.die} + ${e.gm.skill} = ${e.gmTotal}` : ` vs ${e.level}`;
  return `${e.skillName} ${e.level}: ${e.die}${vs} → ${e.text}`;
}

/**
 * A failed roll grows the character: a learned skill goes up one (crossed out at 6); failing the root
 * skill means a new skill is waiting. Applied once per roll. Returns the history line, or null.
 */
export function applyFail(c: Character, e: KinRoll): string | null {
  if (e.failHandled || e.result !== 'lose') return null;
  e.failHandled = true;
  if (e.skill === 'r') {
    e.needsSkill = true;
    return `Failed ${e.skillName}: learn a new skill`;
  }
  const sk = c.skills?.[Number(e.skill.slice(2))];
  if (!sk) return null;
  sk.level = Math.min(6, sk.level + 1);
  if (sk.level >= 6) sk.out = true;
  e.grew = sk.out ? `${sk.name} is crossed out` : `${sk.name} ${sk.level - 1} → ${sk.level}`;
  return `${e.grew} (failed ${sk.name})`;
}

/** Skills held, at the cap or not: a new skill then has to replace one. */
export const isFull = (f: KintsugiFlavour | undefined, c: Character): boolean =>
  (c.skills?.length ?? 0) >= kintsugiConfig(f).maxSkills;

/**
 * Add the skill learned from failing the root skill, at the new-skill level. When the character holds
 * the maximum, `replace` (index into `skills`) says which one it takes the place of.
 */
export function learnSkill(f: KintsugiFlavour | undefined, c: Character, e: KinRoll, name: string, replace?: number): string | null {
  const n = name.trim();
  if (!n || !e.needsSkill || e.newSkill) return null;
  const level = kintsugiConfig(f).newSkillLevel;
  c.skills ??= [];
  let line: string;
  if (isFull(f, c)) {
    const old = replace != null ? c.skills[replace] : undefined;
    if (!old) return null;
    c.skills[replace!] = { name: n, level };
    line = `New skill: ${n} ${level}, replacing ${old.name}`;
  } else {
    c.skills.push({ name: n, level });
    line = `New skill: ${n} ${level}`;
  }
  e.newSkill = n;
  e.needsSkill = false;
  return line;
}

export const packFlavour = (pack: Pack): KintsugiFlavour | undefined => pack.flavour?.kintsugi;
