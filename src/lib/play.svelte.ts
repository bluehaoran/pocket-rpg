// Track in play: the roll on screen and the actions around it. UI state lives here; everything that
// belongs to the session is changed through `mutate` and saved. Rules live in rules/*.ts.
import { packs } from './content/index.ts';
import type { Pack } from './content/types.ts';
import { app, mutate } from './session.svelte.ts';
import { GENERIC_SKILLS, charName, isRfs, lfFlavour } from './characters.ts';
import { mathRng, type Rng } from './engine/rng.ts';
import { buzz } from './device.ts';
import type { TrackHistoryEntry } from './db.ts';
import {
  adjustResource, drawExactQuestion, lfLogText, rollLf, type LfRoll
} from './rules/lasers-feelings.ts';
import {
  addEarnedSkill, giveFailXp, rfsLogText, rollSkill, spendXp, type RfsRoll
} from './rules/roll-for-shoes.ts';

export type Roll = LfRoll | RfsRoll;
export type ResultMode = 'sheet' | 'inline' | 'page';

export const play = $state<{
  roll: Roll | null;
  mode: ResultMode;
  /** Bonus-die toggles per character index; reset after that character rolls. */
  bonuses: Record<number, Record<string, boolean>>;
  /** Status toggles per character index, for the next roll only. */
  apply: Record<number, Record<string, boolean>>;
  /** Bumped on each roll so the result can animate. */
  rolls: number;
  naming: boolean;
}>({ roll: null, mode: 'sheet', bonuses: {}, apply: {}, rolls: 0, naming: false });

let rng: Rng = mathRng;
/** Tests inject a seeded Rng. */
export function setPlayRng(r: Rng): void {
  rng = r;
}

export function resetPlay(): void {
  play.roll = null;
  play.bonuses = {};
  play.apply = {};
  play.naming = false;
  play.rolls = 0;
}

const pack = (): Pack => packs[app.session?.packIds[0] ?? '']!;

export function log(kind: TrackHistoryEntry['kind'], ci: number | null, text: string, detail?: unknown): void {
  mutate(s => {
    const c = ci != null ? s.characters[ci] : undefined;
    s.trackHistory.push({
      t: new Date().toISOString(), kind, ...(c && ci != null ? { char: charName(c, ci) } : {}), text, ...(detail !== undefined ? { detail } : {})
    });
  });
}

function show(r: Roll): void {
  play.roll = r;
  play.rolls++;
  play.naming = false;
  buzz();
}

export function rollCheck(ci: number, checkId: string): void {
  const s = app.session;
  const c = s?.characters[ci];
  if (!s || !c) return;
  const f = lfFlavour(pack());
  const numId = f.fields.find(x => x.kind === 'number')?.id ?? 'number';
  const N = Number(c.fields[numId]);
  const r = rollLf(f, N, checkId, play.bonuses[ci] ?? {}, rng, { ci, name: charName(c, ci) });
  play.bonuses[ci] = {};
  log('roll', ci, lfLogText(r, f), $state.snapshot(r));
  show(r);
}

export function rollRfsSkill(ci: number, key: string): void {
  const s = app.session;
  const c = s?.characters[ci];
  if (!s || !c) return;
  const applied = Object.entries(play.apply[ci] ?? {}).filter(([, on]) => on).map(([k]) => k);
  const e = rollSkill(pack(), c, { ci, name: charName(c, ci) }, key, applied, s.gmDice ?? 0, rng);
  if (!e) return;
  play.apply[ci] = {};
  log('roll', ci, rfsLogText(e), $state.snapshot(e));
  if (e.result === 'lose') failXp(e);
  show(e);
}

/** "Failed: +1 XP" for a roll that wasn't opposed, or an opposed tie the GM called a fail. */
export function failXp(e: RfsRoll = play.roll as RfsRoll): void {
  let line: string | null = null;
  mutate(s => {
    const c = s.characters[e.ci];
    if (c) line = giveFailXp(c, e);
  });
  if (line) log('progress', e.ci, line);
}

export function spend(): void {
  const e = play.roll;
  if (e?.kind !== 'rfs') return;
  let lines: string[] = [];
  mutate(s => {
    const c = s.characters[e.ci];
    if (c) lines = spendXp(c, e);
  });
  for (const l of lines) log('progress', e.ci, l);
  if (lines.length) {
    play.rolls++;
    buzz();
  }
}

export function nameSkill(name: string): boolean {
  const e = play.roll;
  if (e?.kind !== 'rfs') return false;
  let line: string | null = null;
  mutate(s => {
    const c = s.characters[e.ci];
    if (c) line = addEarnedSkill(c, e, name);
  });
  if (line) log('progress', e.ci, line);
  play.naming = false;
  return !!line;
}

/** Suggest a skill name not already on the character. */
export function suggestSkillName(cur: string): string {
  const e = play.roll;
  const s = app.session;
  const c = e?.kind === 'rfs' ? s?.characters[e.ci] : undefined;
  if (!c) return cur;
  const p = pack();
  const taken = new Set([...(c.extra ?? []), ...(c.earned ?? []).map(x => x.name)]);
  const base = p.tables[p.flavour?.['roll-for-shoes']?.starterSkills?.table ?? '']?.map(x => x.v) ?? [];
  const pool = [...new Set([...base, ...GENERIC_SKILLS])].filter(v => !taken.has(v) && v !== cur);
  return pool.length ? pool[Math.floor(rng.next() * pool.length)]! : cur;
}

export function chooseExact(i: number): void {
  const e = play.roll;
  if (e?.kind !== 'lf') return;
  const o = lfFlavour(pack()).exact?.options?.[i];
  if (!o) return;
  e.exChoice = i;
  log('progress', e.ci, `${lfFlavour(pack()).exact?.name ?? 'Exact'}: ${o.label}`);
}

export function drawQuestion(): void {
  const e = play.roll;
  if (e?.kind !== 'lf') return;
  mutate(s => {
    e.exQ = drawExactQuestion(pack(), lfFlavour(pack()), rng, s.recent, e.exQ) ?? e.exQ;
  });
}

export function adjust(ci: number, resId: string, delta: number): void {
  const r = lfFlavour(pack()).resources?.find(x => x.id === resId);
  if (!r) return;
  let text: string | undefined;
  mutate(s => {
    const c = s.characters[ci];
    if (c) text = adjustResource(c, r, delta)?.text;
  });
  if (text) log('resource', ci, text);
}

export function setGm(n: number): void {
  mutate(s => {
    s.gmDice = n;
  });
}

export function toggle(map: 'bonuses' | 'apply', ci: number, id: string): void {
  play[map][ci] ??= {};
  const m = play[map][ci]!;
  m[id] = !m[id];
}

export function closeRoll(): void {
  play.roll = null;
  play.naming = false;
}

export const rulesRfs = (): boolean => isRfs(app.session?.rulesId ?? '');
