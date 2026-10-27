// Setup-wizard operations on a session: rules, pack, players, story seed, characters, start of play.
// Pure functions over a plain Session (callers wrap them in `mutate`). Spec: docs/01-product-spec.md "Track tab".
import type { Session } from './db.ts';
import type { Pack, RulesId } from './content/types.ts';
import { RULES } from './content/types.ts';
import { draw } from './engine/table.ts';
import { seedText } from './engine/template.ts';
import { randInt, type Rng } from './engine/rng.ts';
import {
  type CharCtx, canRandom, groupFieldsOf, isKin, isRfs, newCharacter, randomValue, setStarterCount, starterCount
} from './characters.ts';

export const MAX_PLAYERS = 4;

/** Packs native to a rule system, in setup order. */
export const nativeFor = (all: Pack[], rulesId: string): Pack[] => all.filter(p => !!p.flavour?.[rulesId as RulesId]);

export const rulesOf = (p: Pack): RulesId | undefined => (Object.keys(RULES) as RulesId[]).find(r => p.flavour?.[r]);

export function charCtx(s: Session, pack: Pack, rng: Rng, genMods?: CharCtx['genMods']): CharCtx {
  return { pack, rulesId: s.rulesId, rng, recent: s.recent, starterSkills: s.starterSkills, genMods };
}

function resetStory(s: Session): void {
  s.starterSkills = undefined;
  s.answers = {};
  s.seed = undefined;
  s.characters = [];
  s.group = {};
  s.recent = {};
}

/** Switch rule system. The session moves to that system's first pack, since packs are native to one system. */
export function setRules(s: Session, rulesId: RulesId, all: Pack[]): void {
  if (s.rulesId === rulesId) return;
  const first = nativeFor(all, rulesId)[0];
  if (!first) return;
  s.rulesId = rulesId;
  s.packIds = [first.id];
  resetStory(s);
}

export function setPack(s: Session, packId: string): void {
  if (s.packIds[0] === packId) return;
  s.packIds = [packId];
  resetStory(s);
}

/** A random pack id other than the current one (the only one if there is no other). */
export function randomPackId(candidates: Pack[], currentId: string, rng: Rng): string | undefined {
  const others = candidates.filter(p => p.id !== currentId);
  const pool = others.length ? others : candidates;
  return pool[randInt(rng, pool.length)]?.id;
}

export const setPlayers = (s: Session, n: number): void => {
  s.players = Math.min(MAX_PLAYERS, Math.max(1, n));
};

/** Roll for Shoes house rule: starting skills per character. Adjusts characters already made. */
export function setStarter(s: Session, ctx: CharCtx, n: number): void {
  const k = Math.min(ctx.pack.flavour?.['roll-for-shoes']?.starterSkills?.max ?? 3, Math.max(0, n));
  s.starterSkills = k;
  const c2 = { ...ctx, starterSkills: k };
  for (const c of s.characters) setStarterCount(c2, c, k);
}

export const starterOf = (s: Session, pack: Pack): number => starterCount(pack, s.starterSkills);

/** Make sure there is a character per player and a value for every group field. */
export function ensureSetup(s: Session, ctx: CharCtx): void {
  while (s.characters.length < s.players) s.characters.push(newCharacter(ctx));
  for (const f of groupFieldsOf(ctx.pack)) {
    if (s.group[f.id] != null) continue;
    const v = canRandom(ctx.pack, f) ? randomValue(ctx, f) : f.kind === 'multi' ? [] : '';
    s.group[f.id] = typeof v === 'number' ? String(v) : v;
  }
}

/** Reroll every randomisable field of one character; fields with no list keep their value. */
export function rollAllFields(s: Session, ctx: CharCtx, index: number): void {
  const old = s.characters[index];
  if (!old) return;
  const fresh = newCharacter(ctx, old.id);
  for (const [id, v] of Object.entries(old.fields)) if (!fieldRandomisable(ctx, id)) fresh.fields[id] = v;
  s.characters[index] = fresh;
}

function fieldRandomisable(ctx: CharCtx, id: string): boolean {
  const flavour = isKin(ctx.rulesId)
    ? ctx.pack.flavour?.kintsugi
    : isRfs(ctx.rulesId) ? ctx.pack.flavour?.['roll-for-shoes'] : ctx.pack.flavour?.['lasers-feelings'];
  const f = flavour?.fields.find(x => x.id === id);
  return !f || canRandom(ctx.pack, f);
}

/* ---- Story seed ---- */

/** Roll one seed column, avoiding its current value. */
function drawColumn(pack: Pack, i: number, rng: Rng, recent: Session['recent'], avoid?: string): string {
  const col = pack.seed!.columns[i]!;
  return draw(pack.tables[col.table] ?? [], {}, { rng, recent, key: col.table, avoid: avoid ? [avoid] : [] })?.v ?? '';
}

function writeSeed(s: Session, pack: Pack, columns: string[]): void {
  s.seed = { columns, text: seedText(pack.seed!, columns) };
}

export function rollSeed(s: Session, pack: Pack, rng: Rng): void {
  if (!pack.seed) return;
  writeSeed(s, pack, pack.seed.columns.map((_, i) => drawColumn(pack, i, rng, s.recent)));
}

export function rerollSeedColumn(s: Session, pack: Pack, i: number, rng: Rng): void {
  if (!pack.seed) return;
  if (!s.seed) return rollSeed(s, pack, rng);
  const columns = [...s.seed.columns];
  columns[i] = drawColumn(pack, i, rng, s.recent, columns[i]);
  writeSeed(s, pack, columns);
}

/** Die face (1-based position in the table) for a seed column value; 0 if not found. */
export function seedFace(pack: Pack, i: number, value: string): number {
  const col = pack.seed?.columns[i];
  return (col ? pack.tables[col.table] ?? [] : []).findIndex(e => e.v === value) + 1;
}

/* ---- Start of play ---- */

export function startPlay(s: Session, genreLabel: string, at: Date = new Date()): void {
  s.characters.length = Math.min(s.characters.length, s.players);
  s.started = true;
  s.trackHistory.push({
    t: at.toISOString(),
    kind: 'edit',
    text: `Session started · ${genreLabel} · ${s.players} player${s.players > 1 ? 's' : ''}`
  });
}
