// Lasers & Feelings engine, shared by every hack. All variation is pack data (docs/02-data-model.md §1.3, §2).
import type { Character } from '../db.ts';
import type { Outcome, Pack, Resource } from '../content/types.ts';
import { type LfFlavour, GENERIC_LF } from '../characters.ts';
import { rollDie, type Rng } from '../engine/rng.ts';
import { draw, type Recent } from '../engine/table.ts';

export const DEFAULT_OUTCOMES: Outcome[] = [
  { successes: 0, label: 'Goes wrong', text: 'GM says how things get worse.' },
  { successes: 1, label: 'Barely', text: 'GM inflicts a complication, harm, or cost.' },
  { successes: 2, label: 'Well', text: 'You do it well.' },
  { successes: 3, label: 'Critical', text: 'GM tells you an extra effect.' }
];

export type Mark = 'ok' | 'no' | 'ex';

export interface LfRoll {
  kind: 'lf';
  ci: number;
  who: string;
  checkId: string;
  check: string;
  dir: 'under' | 'over';
  N: number;
  dice: number[];
  marks: Mark[];
  successes: number;
  outcome: string;
  outText?: string;
  picks?: string[];
  exact: boolean;
  /** Labels of the bonus dice that were switched on. */
  bonuses: string[];
  /** Blade and Spirit style choose-one effect, once picked. */
  exChoice?: number;
  /** A drawn question when `exact.questions` names a table. */
  exQ?: string;
}

/** Dice in the pool: base plus the selected bonuses, clamped to min..max. */
export function poolSize(f: LfFlavour, on: Record<string, boolean | undefined> = {}): number {
  const dc = f.dice ?? GENERIC_LF.dice!;
  const n = dc.base + (dc.bonuses ?? []).filter(b => on[b.id]).reduce((a, b) => a + b.dice, 0);
  return Math.max(dc.min, Math.min(dc.max, n));
}

/** The outcome for a success count: the highest `successes` threshold reached (3 covers 3+). */
export function outcomeFor(f: LfFlavour, successes: number): Outcome {
  const outs = [...(f.outcomes ?? DEFAULT_OUTCOMES)].sort((a, b) => b.successes - a.successes);
  return outs.find(o => successes >= o.successes) ?? outs[outs.length - 1]!;
}

/** Roll a check. `N` is the character's number. */
export function rollLf(
  f: LfFlavour, N: number, checkId: string, on: Record<string, boolean | undefined>, rng: Rng, who: { ci: number; name: string }
): LfRoll {
  const check = f.checks.find(c => c.id === checkId) ?? f.checks[0]!;
  const ex = f.exact ?? {};
  const n = poolSize(f, on);
  const dice = Array.from({ length: n }, () => rollDie(rng, 6));
  const marks = dice.map((v): Mark => (v === N ? 'ex' : (check.roll === 'under' ? v < N : v > N) ? 'ok' : 'no'));
  const successes = marks.filter(m => m === 'ok' || (m === 'ex' && ex.countsAsSuccess !== false)).length;
  const o = outcomeFor(f, successes);
  return {
    kind: 'lf', ci: who.ci, who: who.name, checkId: check.id, check: check.label, dir: check.roll, N, dice, marks, successes,
    outcome: o.label, outText: o.text, picks: o.picks, exact: marks.includes('ex'),
    bonuses: (f.dice?.bonuses ?? []).filter(b => on[b.id]).map(b => b.label)
  };
}

export function lfLogText(r: LfRoll, f: LfFlavour): string {
  const n = r.dice.length;
  const exact = r.exact ? ` · ${f.exact?.name ?? 'exact'}` : '';
  return `${r.check} ${n}d6 ${r.dir} ${r.N}: ${r.dice.join(' ')} → ${r.outcome} (${r.successes} success${r.successes === 1 ? '' : 'es'})${exact}`;
}

/** Draw a question for the exact-number effect when `exact.questions` names a table. */
export function drawExactQuestion(pack: Pack, f: LfFlavour, rng: Rng, recent: Recent, avoid?: string): string | undefined {
  const t = f.exact?.questions;
  if (typeof t !== 'string') return undefined;
  return draw(pack.tables[t] ?? [], {}, { rng, recent, key: t, avoid: avoid ? [avoid] : [] })?.v;
}

/** The resource's current state (e.g. Wounded), by how much has been lost. */
export function resourceState(r: Resource, value: number): { lost: number; label: string; text: string } | undefined {
  const lost = r.max - value;
  return (r.states ?? []).filter(s => lost >= s.lost).pop();
}

export interface ResourceChange {
  from: number;
  to: number;
  text: string;
}

/** Change a resource by `delta`, clamped to 0..max. Returns what happened, or null if nothing changed. */
export function adjustResource(c: Character, r: Resource, delta: number): ResourceChange | null {
  const from = c.resources[r.id];
  if (from == null) return null;
  const to = Math.max(0, Math.min(r.max, from + delta));
  if (to === from) return null;
  c.resources[r.id] = to;
  const st = resourceState(r, to);
  return { from, to, text: `${r.label} ${from} → ${to}${st ? ` (${st.label})` : ''}` };
}
