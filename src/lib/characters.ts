// Character logic for both rule systems: field values, random generation, derived stats, skill trees.
// Pure TypeScript with an injectable Rng. Rules: docs/02-data-model.md §1.3, §1.6, §1.8, §2.
import type { Character } from './db.ts';
import type { Entry, Field, LasersFeelingsFlavour, Pack, RollForShoesFlavour } from './content/types.ts';
import { draw, pool, type Recent, type Selection } from './engine/table.ts';
import { pick, randInt, type Rng } from './engine/rng.ts';
import { expand, shortLabel } from './engine/template.ts';

export type FieldValue = string | string[] | number;

export const GENERIC_SKILLS = ['Sneak', 'Hit hard', 'Talk my way out', 'Fix things', 'Notice details', 'Run', 'Climb', 'Lie', 'Patch wounds', 'Read old writing'];

/** Fallback when a pack has no lasers-feelings flavour (§1.8d). Not offered in Setup. */
export const GENERIC_LF: LasersFeelingsFlavour = {
  checks: [
    { id: 'under', label: 'Lasers', roll: 'under' },
    { id: 'over', label: 'Feelings', roll: 'over' }
  ],
  numberRange: [2, 5],
  fields: [
    { id: 'name', label: 'Name', kind: 'text', table: null },
    { id: 'style', label: 'Style', kind: 'pick', values: ['Bold', 'Quiet', 'Clever', 'Kind', 'Stubborn', 'Curious'] },
    { id: 'role', label: 'Role', kind: 'pick', values: ['Leader', 'Fighter', 'Fixer', 'Talker', 'Seeker', 'Healer'] },
    { id: 'number', label: 'Number', kind: 'number', range: [2, 5] },
    { id: 'goal', label: 'Goal', kind: 'pick', values: ['Protect someone', 'Find something', 'Win respect', 'Escape the past', 'Learn the truth', 'Get rich'] }
  ],
  dice: { base: 1, bonuses: [], min: 1, max: 3 },
  exact: { name: 'Exact', countsAsSuccess: true }
};

export type LfFlavour = LasersFeelingsFlavour & { fallback?: boolean };
export type RfsFlavour = RollForShoesFlavour & { fallback?: boolean };

export function lfFlavour(pack: Pack): LfFlavour {
  const own = pack.flavour?.['lasers-feelings'];
  if (own) return own;
  const r = pack.flavour?.['roll-for-shoes'];
  if (!r) return GENERIC_LF;
  return {
    ...GENERIC_LF,
    fallback: true,
    sentence: r.sentence,
    fields: [
      ...r.fields.map(({ skill: _s, status: _t, ...f }) => f),
      { id: 'number', label: 'Number', kind: 'number', range: [2, 5] }
    ]
  };
}

export function rfsFlavour(pack: Pack): RfsFlavour {
  const own = pack.flavour?.['roll-for-shoes'];
  if (own) return own;
  const nameF = pack.flavour?.['lasers-feelings']?.fields.find(x => x.id === 'name');
  const st = pack.tables['lf.style'];
  const ro = pack.tables['lf.role'];
  const concepts = st && ro ? st.flatMap(a => ro.map(b => `${a.v} ${b.v.charAt(0).toLowerCase()}${b.v.slice(1)}`)) : null;
  return {
    fallback: true,
    rootSkill: 'Do anything',
    fields: [
      nameF ? { ...nameF, label: 'Name' } : { id: 'name', label: 'Name', kind: 'text', table: null },
      concepts ? { id: 'concept', label: 'Concept', kind: 'pick-or-text', values: concepts } : { id: 'concept', label: 'Concept', kind: 'text', table: null }
    ],
    sentence: '{name}\nis {a} {concept|lower}',
    starterSkills: { count: 0, max: 3, level: 2 }
  };
}

export const isRfs = (rulesId: string): boolean => rulesId === 'roll-for-shoes';
export const fieldsOf = (pack: Pack, rulesId: string): Field[] => (isRfs(rulesId) ? rfsFlavour(pack).fields : lfFlavour(pack).fields);
export const groupFieldsOf = (pack: Pack): Field[] => pack.groupFields ?? pack.flavour?.['lasers-feelings']?.groupFields ?? [];

export const isEmptyValue = (v: unknown): boolean => (Array.isArray(v) ? !v.filter(Boolean).length : v == null || v === '');
export const showValue = (v: unknown): string => (Array.isArray(v) ? v.filter(Boolean).join(' & ') : String(v ?? ''));

export interface CharCtx {
  pack: Pack;
  rulesId: string;
  rng: Rng;
  recent: Recent;
  /** Generator id -> modifier selection used when a field fills itself from a generator. */
  genMods?: (generatorId: string) => Selection;
  starterSkills?: number;
}

/** Selection for a field's `filterBy`: each named field's current single value, as a modifier of the same key. */
function filterSel(f: Field, values: Record<string, FieldValue> | undefined): Selection {
  const sel: Selection = {};
  for (const k of f.filterBy ?? []) {
    const v = values?.[k];
    if (typeof v === 'string' && v) sel[k] = v;
  }
  return sel;
}

function entriesOfField(pack: Pack, f: Field, values?: Record<string, FieldValue>): Entry[] | null {
  if (f.table && pack.tables[f.table]) {
    return pool(pack.tables[f.table]!, filterSel(f, values));
  }
  return null;
}

/** The pick list for a field (already filtered by `filterBy`), or null if it has none. */
export function listOf(pack: Pack, f: Field, values?: Record<string, FieldValue>): string[] | null {
  const es = entriesOfField(pack, f, values);
  if (es) return es.map(e => e.v);
  return f.values ?? null;
}

export function canRandom(pack: Pack, f: Field): boolean {
  return f.kind === 'number' || !!listOf(pack, f) || !!(f.examples && pack.tables[f.examples]) || !!f.generator;
}

const numberRange = (lf: LfFlavour): [number, number] => lf.numberRange ?? [2, 5];

export function rollNumber(ctx: CharCtx, f: Field, avoid?: number): number {
  const lf = lfFlavour(ctx.pack);
  const [lo, hi] = f.range ?? numberRange(lf);
  const reroll = lf.numberRoll?.reroll;
  for (let i = 0; i < 20; i++) {
    let n: number;
    if (f.randomise === 'numberRoll' && reroll) {
      do n = 1 + randInt(ctx.rng, 6);
      while (reroll.includes(n));
    } else n = lo + randInt(ctx.rng, hi - lo + 1);
    if (n !== avoid) return n;
  }
  return lo;
}

/** A new random value for a field, different from `cur` where possible. `values` are the character's other fields. */
export function randomValue(ctx: CharCtx, f: Field, cur?: FieldValue, values?: Record<string, FieldValue>): FieldValue {
  const { pack, rng, recent } = ctx;
  if (f.kind === 'number') return rollNumber(ctx, f, typeof cur === 'number' ? cur : undefined);
  const list = listOf(pack, f, values);
  if (f.kind === 'multi') {
    const rest = [...(list ?? [])];
    const out: string[] = [];
    while (out.length < (f.count ?? 2) && rest.length) out.push(rest.splice(randInt(rng, rest.length), 1)[0]!);
    return out;
  }
  const curStr = typeof cur === 'string' ? cur : undefined;
  if (f.generator) {
    const g = pack.generators?.find(x => x.id === f.generator);
    if (g) {
      const sel = ctx.genMods?.(g.id) ?? {};
      for (let i = 0; i < 6; i++) {
        const n = expand(g.output, id => draw(pack.tables[id] ?? [], sel, { rng, recent, key: id })?.v ?? null, rng);
        if (n && n !== curStr) return n;
      }
    }
  }
  if (f.examples && pack.tables[f.examples]) {
    return draw(pack.tables[f.examples]!, {}, { rng, recent, key: f.examples, avoid: curStr ? [curStr] : [] })?.v ?? curStr ?? '';
  }
  if (list) {
    if (f.table && pack.tables[f.table]) {
      const sel = filterSel(f, values);
      return draw(pack.tables[f.table]!, sel, { rng, recent, key: f.table, avoid: curStr ? [curStr] : [] })?.v ?? curStr ?? '';
    }
    const c = list.filter(v => v !== curStr);
    return pick(rng, c.length ? c : list);
  }
  return cur ?? '';
}

const blankValue = (f: Field): FieldValue => (f.kind === 'multi' ? [] : '');

/** Random values for every field, in declaration order so `filterBy` sources are set first. */
export function randomFields(ctx: CharCtx, fields: Field[], keep?: Record<string, FieldValue>): Record<string, FieldValue> {
  const out: Record<string, FieldValue> = {};
  for (const f of fields) {
    out[f.id] = canRandom(ctx.pack, f) ? randomValue(ctx, f, undefined, out) : (keep?.[f.id] ?? blankValue(f));
  }
  return out;
}

export function syncResources(pack: Pack, c: Character): void {
  for (const r of lfFlavour(pack).resources ?? []) {
    const ok = !r.appliesTo || Object.entries(r.appliesTo).every(([k, v]) => c.fields[k] === v);
    if (ok && c.resources[r.id] == null) c.resources[r.id] = r.start;
    if (!ok) delete c.resources[r.id];
  }
}

export function rfsConfig(pack: Pack) {
  const rf = rfsFlavour(pack);
  return { count: 0, max: 3, level: 2, ...(rf.starterSkills ?? {}) } as { table?: string; count: number; max: number; level: number };
}

export const starterCount = (pack: Pack, chosen?: number): number => {
  const k = rfsConfig(pack);
  return Math.min(k.max, chosen ?? k.count);
};

export const rootSkill = (pack: Pack): string => rfsFlavour(pack).rootSkill ?? 'Do anything';

/** Names a starting skill can be drawn from: the pack's table, or the generic list. */
export function skillList(pack: Pack): string[] {
  const k = rfsConfig(pack);
  return k.table && pack.tables[k.table] ? pack.tables[k.table]!.map(e => e.v) : GENERIC_SKILLS;
}

export interface SkillNode {
  key: string;
  name: string;
  level: number;
  parent: string | null;
  depth: number;
  root?: boolean;
  /** Field id for setting-given skills. */
  field?: string;
  label?: string;
  /** Index into `extra` for starting skills. */
  extra?: number;
  /** Index into `earned` for skills earned in play. */
  earned?: number;
}

/** Root, then setting-field skills, then starting skills, then earned skills, each under its parent. */
export function skillTree(pack: Pack, c: Character): SkillNode[] {
  const rf = rfsFlavour(pack);
  const cfg = rfsConfig(pack);
  const nodes: SkillNode[] = [{ key: 'r', name: rootSkill(pack), level: 1, root: true, parent: null, depth: 0 }];
  for (const f of rf.fields) {
    if (f.skill) nodes.push({ key: 'f:' + f.id, name: showValue(c.fields[f.id]), level: f.skill.level, field: f.id, label: shortLabel(f.label), parent: 'r', depth: 0 });
  }
  (c.extra ?? []).forEach((n, i) => nodes.push({ key: 'x:' + i, name: n, level: cfg.level, extra: i, parent: 'r', depth: 0 }));
  (c.earned ?? []).forEach((sk, i) => nodes.push({ key: 'e:' + i, name: sk.name, level: sk.level, earned: i, parent: sk.parent, depth: 0 }));
  const out: SkillNode[] = [nodes[0]!];
  const walk = (key: string, depth: number) => {
    for (const n of nodes.filter(x => x.parent === key)) {
      n.depth = depth;
      out.push(n);
      walk(n.key, depth + 1);
    }
  };
  walk('r', 1);
  return out;
}

export interface Status {
  text: string;
  level: number;
  field: string;
  optional?: boolean;
}

export function statuses(pack: Pack, c: Character): Status[] {
  return rfsFlavour(pack)
    .fields.filter(f => f.status && !isEmptyValue(c.fields[f.id]))
    .map(f => ({
      text: (f.status!.format ?? '{v}').replace('{v}', showValue(c.fields[f.id])),
      level: f.status!.level,
      field: f.id,
      optional: f.status!.optional
    }));
}

/** A random starting-skill name not already on the character. */
export function pickSkill(ctx: CharCtx, c: Character, cur?: string): string {
  const taken = new Set(skillTree(ctx.pack, c).map(x => x.name));
  const pool = skillList(ctx.pack).filter(v => !taken.has(v) && v !== cur);
  return pool.length ? pick(ctx.rng, pool) : (cur ?? '');
}

export function newCharacter(ctx: CharCtx, id: string = crypto.randomUUID()): Character {
  const c: Character = { id, fields: {}, resources: {} };
  c.fields = randomFields(ctx, fieldsOf(ctx.pack, ctx.rulesId));
  if (isRfs(ctx.rulesId)) {
    c.xp = 0;
    c.extra = [];
    for (let i = 0; i < starterCount(ctx.pack, ctx.starterSkills); i++) c.extra.push(pickSkill(ctx, c));
  } else syncResources(ctx.pack, c);
  return c;
}

/** Match the starting-skill count on a character, adding or removing from the end. */
export function setStarterCount(ctx: CharCtx, c: Character, n: number): void {
  if (!c.extra) return;
  while (c.extra.length < n) c.extra.push(pickSkill(ctx, c));
  c.extra.length = n;
}

export interface Derived {
  label: string;
  v: number | null;
}

/** Tiny arithmetic evaluator for derived-stat formulas: numbers, N, + - * / and parentheses. */
export function evalFormula(src: string, N: number): number | null {
  const toks = src.match(/\d+(?:\.\d+)?|[N+\-*/()]/g);
  if (!toks || toks.join('') !== src.replace(/\s+/g, '')) return null;
  let i = 0;
  const peek = () => toks[i];
  const expr = (): number => {
    let v = term();
    while (peek() === '+' || peek() === '-') v = toks[i++] === '+' ? v + term() : v - term();
    return v;
  };
  const term = (): number => {
    let v = factor();
    while (peek() === '*' || peek() === '/') v = toks[i++] === '*' ? v * factor() : v / factor();
    return v;
  };
  const factor = (): number => {
    const t = toks[i++];
    if (t === undefined) throw new Error('unexpected end');
    if (t === '(') {
      const v = expr();
      if (toks[i++] !== ')') throw new Error('missing )');
      return v;
    }
    if (t === '-') return -factor();
    if (t === 'N') return N;
    const n = Number(t);
    if (Number.isNaN(n)) throw new Error('bad token');
    return n;
  };
  try {
    const v = expr();
    return i === toks.length && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/** Derived stats on the character card: formulas over N, or the label of an earlier derived value. */
export function derive(pack: Pack, c: Character): Derived[] {
  const N = c.fields.number;
  const out: Derived[] = [];
  for (const d of lfFlavour(pack).derived ?? []) {
    let v: number | null = null;
    if (/^[\dN\s*+\-()/.]+$/.test(d.formula)) v = typeof N === 'number' ? evalFormula(d.formula, N) : null;
    else v = out.find(o => o.label.toLowerCase().startsWith(d.formula.toLowerCase()))?.v ?? null;
    out.push({ label: d.label, v });
  }
  return out;
}

/** Display name: the name field, else role/concept/form, else "Player n". */
export function charName(c: Character, i: number): string {
  if (!isEmptyValue(c.fields.name)) return showValue(c.fields.name);
  const alt = c.fields.role || c.fields.concept || c.fields.form;
  if (alt) {
    const s = showValue(alt);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  return `Player ${i + 1}`;
}
