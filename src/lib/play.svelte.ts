// Track in play: the roll on screen and the actions around it. UI state lives here; everything that
// belongs to the session is changed through `mutate` and saved. Rules live in rules/*.ts.
import { packs } from './content/index.ts';
import type { Pack } from './content/types.ts';
import { app, mutate } from './session.svelte.ts';
import { GENERIC_SKILLS, charName, isKin, isRfs, kinFlavour, lfFlavour, numberFieldId } from './characters.ts';
import { mathRng, type Rng } from './engine/rng.ts';
import { buzz } from './device.ts';
import type { Character, TrackHistoryEntry } from './db.ts';
import {
  adjustResource, drawExactQuestion, lfLogText, rollLf, type LfRoll
} from './rules/lasers-feelings.ts';
import { applyFail, kinLogText, learnSkill, rollSkill as rollKin, type KinRoll } from './rules/kintsugi.ts';
import {
  addEarnedSkill, giveFailXp, rfsLogText, rollSkill, spendXp, type RfsRoll
} from './rules/roll-for-shoes.ts';

export type Roll = LfRoll | RfsRoll | KinRoll;
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

/** What a Roll for Shoes roll can still undo: the character and history as they were before it. Plain data, not reactive. */
interface PendingRoll {
  ci: number;
  skill: string;
  character: Character;
  logLen: number;
  apply: Record<string, boolean>;
}
let pending: PendingRoll | null = null;

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
  pending = null;
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
  const N = Number(c.fields[numberFieldId(f)]);
  const r = rollLf(f, N, checkId, play.bonuses[ci] ?? {}, rng, { ci, name: charName(c, ci) });
  play.bonuses[ci] = {};
  log('roll', ci, lfLogText(r, f), $state.snapshot(r));
  show(r);
}

export function rollRfsSkill(ci: number, key: string): void {
  const s = app.session;
  const c = s?.characters[ci];
  if (!s || !c) return;
  const before: PendingRoll = {
    ci, skill: key, character: $state.snapshot(c) as Character, logLen: s.trackHistory.length, apply: { ...play.apply[ci] }
  };
  const applied = Object.entries(play.apply[ci] ?? {}).filter(([, on]) => on).map(([k]) => k);
  const e = rollSkill(pack(), c, { ci, name: charName(c, ci) }, key, applied, s.gmDice ?? 0, rng);
  if (!e) return;
  pending = before;
  play.apply[ci] = {};
  log('roll', ci, rfsLogText(e), $state.snapshot(e));
  if (e.result === 'lose') failXp(e);
  show(e);
}

export function rollKinSkill(ci: number, key: string): void {
  const s = app.session;
  const c = s?.characters[ci];
  if (!s || !c) return;
  const e = rollKin(kinFlavour(pack()), c, { ci, name: charName(c, ci) }, key, s.gmSkill ?? 0, rng);
  if (!e) return;
  log('roll', ci, kinLogText(e), $state.snapshot(e));
  let line: string | null = null;
  mutate(x => {
    const ch = x.characters[ci];
    if (ch) line = applyFail(ch, e);
  });
  if (line) log('progress', ci, line);
  show(e);
}

/** Name the skill learned from failing the root skill; `replace` is needed when the character holds the maximum. */
export function learnKinSkill(name: string, replace?: number): boolean {
  const e = play.roll;
  if (e?.kind !== 'kin') return false;
  let line: string | null = null;
  mutate(s => {
    const c = s.characters[e.ci];
    if (c) line = learnSkill(kinFlavour(pack()), c, e, name, replace);
  });
  if (line) log('progress', e.ci, line);
  return !!line;
}

/** Suggest a skill name not already on the character. */
export function suggestKinSkill(cur: string): string {
  const e = play.roll;
  const c = e?.kind === 'kin' ? app.session?.characters[e.ci] : undefined;
  const taken = new Set((c?.skills ?? []).map(x => x.name));
  const pool = GENERIC_SKILLS.filter(v => !taken.has(v) && v !== cur);
  return pool.length ? pool[Math.floor(rng.next() * pool.length)]! : cur;
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

export function setGmSkill(n: number): void {
  mutate(s => {
    s.gmSkill = n;
  });
}

/** The GM's skill, picked at random from 1 to 6. */
export function randomGmSkill(): void {
  setGmSkill(1 + Math.floor(rng.next() * 6));
  buzz();
}

export function toggle(map: 'bonuses' | 'apply', ci: number, id: string): void {
  play[map][ci] ??= {};
  const m = play[map][ci]!;
  m[id] = !m[id];
}

/** Put the character and history back as they were before the pending Roll for Shoes roll, and give its statuses back. */
function undoPending(): void {
  const p = pending;
  pending = null;
  if (!p) return;
  mutate(s => {
    s.characters[p.ci] = structuredClone(p.character);
    s.trackHistory.length = p.logLen;
  });
  play.apply[p.ci] = p.apply;
}

/** Dismiss the roll and keep everything it did (Done, Accept, or closing the sheet). */
export function closeRoll(): void {
  play.roll = null;
  play.naming = false;
  pending = null;
}

/** Roll for Shoes: throw the roll away. Its XP, spent XP, new skill and history lines are undone. */
export function cancelRoll(): void {
  undoPending();
  play.roll = null;
  play.naming = false;
}

/** Roll the same skill again, either keeping this roll (`accept`) or undoing it first. */
export function rerollRfs(accept: boolean): void {
  const p = pending;
  if (!p) return;
  if (accept) pending = null;
  else undoPending();
  rollRfsSkill(p.ci, p.skill);
}

export const rulesRfs = (): boolean => isRfs(app.session?.rulesId ?? '');
export const rulesKin = (): boolean => isKin(app.session?.rulesId ?? '');
