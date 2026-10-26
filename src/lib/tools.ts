// Tools tab logic: registry tools, library lists and pack generators. Pure; the UI renders the results.
// Rules: docs/05-tools-library.md.
import type { Entry, Generator, ModifierDecl, Pack, Registry, ToolDef, ToolList, ToolPart } from './content/types.ts';
import { draw, pool, relax, type Recent, type Selection } from './engine/table.ts';
import { rollDie, type Rng } from './engine/rng.ts';
import { allSlots, capFirst, expand, singleSlot, slots } from './engine/template.ts';

/** A pack generator presented as a tool. */
export interface PackTool {
  id: string; // "pack:<generatorId>"
  label: string;
  kind: 'gen';
  gen: Generator;
}
export type AnyTool = ToolDef | PackTool;

/** Remembered selections for one tool: modifier values, dice type/count, part and follow-up toggles. */
export type ToolOpts = Record<string, string | number | boolean>;

export interface ToolCtx {
  rng: Rng;
  recent: Recent;
  registry: Registry;
  lists: Record<string, ToolList>;
  /** The bundled lists before the device's edits. Only used to tell "all hidden" from "empty". */
  stock?: Record<string, ToolList>;
  pack?: Pack;
}

export const packTools = (pack?: Pack): PackTool[] =>
  (pack?.generators ?? []).map(g => ({ id: 'pack:' + g.id, label: g.label, kind: 'gen', gen: g }));

export function findTool(id: string, registry: Registry, pack?: Pack): AnyTool | undefined {
  return id.startsWith('pack:') ? packTools(pack).find(t => t.id === id) : registry.tools.find(t => t.id === id);
}

const isGen = (t: AnyTool): t is PackTool => t.kind === 'gen';
const listOf = (t: ToolDef, ctx: ToolCtx): ToolList | undefined => (t.list ? ctx.lists[t.list] : undefined);
export const entriesOf = (t: ToolDef, ctx: ToolCtx): Entry[] => listOf(t, ctx)?.entries ?? [];
export const isEmptyList = (t: AnyTool, ctx: ToolCtx): boolean => t.kind === 'list' && entriesOf(t, ctx).length === 0;
/** The list is empty only because the person hid every stock entry (Manage Tools). */
export const allHidden = (t: AnyTool, ctx: ToolCtx): boolean =>
  t.kind === 'list' && isEmptyList(t, ctx) && (ctx.stock?.[t.list ?? '']?.entries.length ?? 0) > 0;

export interface ModDef {
  key: string;
  required: boolean;
  default?: string;
  label: string;
  values: string[];
  valueLabels?: Record<string, string>;
}

const cap = capFirst;
export const valueLabel = (d: Pick<ModDef, 'valueLabels'>, v: string): string => d.valueLabels?.[v] ?? cap(v);

/** Modifier controls for a tool, merged with the list's or pack's declaration. */
export function modDefs(t: AnyTool, ctx: ToolCtx): ModDef[] {
  const decl: Record<string, ModifierDecl> = isGen(t) ? (ctx.pack?.modifiers ?? {}) : (listOf(t, ctx)?.modifiers ?? {});
  const uses = isGen(t) ? (t.gen.modifiers ?? []) : (t.modifiers ?? []);
  return uses.map(u => {
    const d = decl[u.key];
    return {
      key: u.key,
      required: !!u.required,
      default: u.default,
      label: u.key === 'letter' ? 'Starting letter' : (d?.label ?? cap(u.key)),
      values: d?.values ?? [],
      valueLabels: d?.valueLabels
    };
  });
}

/** Remembered selection with genre defaults applied. An explicit "Any" ('') beats the default. */
export function effectiveOpts(t: AnyTool, opts: ToolOpts, ctx: ToolCtx): ToolOpts {
  const out = { ...opts };
  for (const d of modDefs(t, ctx)) {
    if (d.default !== 'genre' || out[d.key] !== undefined) continue;
    const g = d.key === 'setting' ? ctx.pack?.nameSetting : (ctx.pack as unknown as Record<string, unknown> | undefined)?.[d.key];
    if (typeof g === 'string' && d.values.includes(g)) out[d.key] = g;
  }
  return out;
}

function selection(defs: ModDef[], eff: ToolOpts): Selection {
  const sel: Selection = {};
  for (const d of defs) {
    const v = eff[d.key];
    if (typeof v === 'string' && v) sel[d.key] = v;
  }
  return sel;
}

/** Required modifiers still unset (only matters for pack generators in practice). */
export function missingRequired(t: AnyTool, opts: ToolOpts, ctx: ToolCtx): ModDef[] {
  const eff = effectiveOpts(t, opts, ctx);
  return modDefs(t, ctx).filter(d => d.required && !eff[d.key]);
}

export const diceOpts = (t: ToolDef, opts: ToolOpts) => ({
  count: typeof opts.count === 'number' ? opts.count : (t.dice?.count.default ?? 1),
  type: typeof opts.type === 'number' ? opts.type : (t.dice?.defaultType ?? 6)
});
export const countOpt = (t: ToolDef, opts: ToolOpts): number => (typeof opts.count === 'number' ? opts.count : (t.count?.default ?? 1));
export const partOn = (p: ToolPart, opts: ToolOpts): boolean => (typeof opts[p.key] === 'boolean' ? (opts[p.key] as boolean) : !!p.default);
export const partOrderOn = (p: ToolPart, opts: ToolOpts): boolean =>
  typeof opts[p.key + ':order'] === 'boolean' ? (opts[p.key + ':order'] as boolean) : !!p.order?.default;
export const followOn = (t: ToolDef, opts: ToolOpts): boolean =>
  !!t.followUp && (typeof opts.followUp === 'boolean' ? opts.followUp : !!t.followUp.default);

export interface DrawnPart {
  key: string;
  v: string;
  before: boolean;
  join: string;
}

export type ToolResult =
  | { kind: 'dice'; text: string; dice: number[]; sides: number; note: string }
  | { kind: 'list'; text: string; base: string[]; drawn: DrawnPart[]; relaxed: boolean; mods: Selection; glyph: boolean; caption?: string }
  | { kind: 'gen'; text: string; sub: string; relaxed: boolean; mods: Selection };

/** "level 2 · text" style line for a result's `data` payload. */
export function formatData(d?: Record<string, unknown>): string {
  if (!d) return '';
  const parts = Object.entries(d)
    .filter(([k]) => k !== 'text')
    .map(([k, v]) => `${k} ${v}`);
  if (typeof d.text === 'string' && d.text) parts.push(d.text);
  return parts.join(' · ');
}

export interface Segment {
  text: string;
  /** Added parts (like a last name) are underlined on screen. */
  underline?: boolean;
}

/** The result as display segments. Re-evaluates part order from `opts`, so toggling it needs no reroll. */
export function segments(t: AnyTool, r: ToolResult, opts: ToolOpts): Segment[] {
  if (r.kind !== 'list' || isGen(t)) return [{ text: r.text }];
  let out: Segment[] = [{ text: r.base.join(t.join ?? ', ') }];
  for (const d of r.drawn) {
    const part = t.parts?.find(p => p.key === d.key);
    const lead = d.before && !!part?.order && partOrderOn(part, opts);
    const seg: Segment = { text: d.v, underline: true };
    out = lead ? [seg, { text: d.join }, ...out] : [...out, { text: d.join }, seg];
  }
  return out;
}

/**
 * How to lay out `n` glyphs (emoji) in centred rows: three fit across, four make 2 + 2,
 * and everything else is rows of 3 or 2 (5 = 3 + 2, 6 = 3 + 3).
 */
export function glyphRows(n: number): number[] {
  if (n <= 3) return n > 0 ? [n] : [];
  if (n === 4) return [2, 2];
  const rows: number[] = [];
  let left = n;
  while (left > 0) {
    // Prefer 3 per row, but never leave a lone glyph on the last row.
    const take = left === 4 ? 2 : Math.min(3, left);
    rows.push(take);
    left -= take;
  }
  return rows;
}

export const plainText = (t: AnyTool, r: ToolResult, opts: ToolOpts): string => segments(t, r, opts).map(s => s.text).join('');

/** Full text as logged: result plus follow-up, if any. */
export function historyText(t: AnyTool, r: ToolResult, followUp: string | null, opts: ToolOpts): string {
  const base = plainText(t, r, opts);
  return followUp && !isGen(t) && t.followUp ? base + (t.followUp.join ?? ' — ') + followUp : base;
}

/** Draw a follow-up entry (e.g. a description for a name). */
export function drawFollowUp(t: ToolDef, ctx: ToolCtx, avoid: string | null): string | null {
  const f = t.followUp;
  if (!f) return null;
  const list = ctx.lists[ctx.registry.tools.find(x => x.id === f.tool)?.list ?? ''];
  if (!list) return null;
  return draw(list.entries, {}, { rng: ctx.rng, recent: ctx.recent, key: 'lib:' + list.id, avoid: avoid ? [avoid] : [], strict: true })?.v ?? null;
}

const REPEAT_TRIES = 6;

/**
 * Roll a tool. `prev` is the result on screen; the new result never repeats it (when anything else exists).
 * Returns null when there is nothing to show: an empty list, missing required modifiers, or no match.
 */
export function rollTool(t: AnyTool, opts: ToolOpts, ctx: ToolCtx, prev: ToolResult | null = null): ToolResult | null {
  const { rng, recent } = ctx;

  if (t.kind === 'dice') {
    const m = diceOpts(t, opts);
    const dice = Array.from({ length: m.count }, () => rollDie(rng, m.type));
    const sum = dice.reduce((a, b) => a + b, 0);
    return { kind: 'dice', text: String(sum), dice, sides: m.type, note: `${m.count}d${m.type}${m.count > 1 ? ' = ' + dice.join(' + ') : ''}` };
  }

  const defs = modDefs(t, ctx);
  const eff = effectiveOpts(t, opts, ctx);

  if (isGen(t)) {
    if (defs.some(d => d.required && !eff[d.key])) return null;
    const tables = ctx.pack?.tables ?? {};
    const g = t.gen;
    const { sel, relaxed } = relax(defs, selection(defs, eff), s =>
      slots(g.output).every(id => pool(tables[id] ?? [], s).length > 0)
    );
    const single = singleSlot(g.output);
    const prevText = prev?.text;
    let text = '';
    let sub = '';
    for (let i = 0; i < REPEAT_TRIES; i++) {
      if (single) {
        const e = draw(tables[single] ?? [], sel, { rng, recent, key: single, avoid: prevText ? [prevText] : [] });
        text = e?.v ?? '';
        sub = formatData(e?.data);
      } else {
        text = expand(g.output, id => draw(tables[id] ?? [], sel, { rng, recent, key: id })?.v ?? null, rng);
      }
      if (text !== prevText) break;
    }
    return text ? { kind: 'gen', text, sub, relaxed, mods: sel } : null;
  }

  const entries = entriesOf(t, ctx);
  const key = 'lib:' + t.list;
  const { sel, relaxed } = relax(defs, selection(defs, eff), s => pool(entries, s).length > 0);
  const n = t.count ? countOpt(t, opts) : 1;
  const prevBase = prev?.kind === 'list' ? prev.base[0] : undefined;
  const got: string[] = [];
  let caption: string | undefined;
  // distinctBy: each extra entry comes from a different value of that tag. A chosen value for the same
  // modifier is honoured by the first draw only.
  const by = n > 1 ? t.distinctBy : undefined;
  const used = new Set<string>();
  for (let i = 0; i < n; i++) {
    const avoid = n === 1 && prevBase ? [prevBase, ...got] : got;
    let from = entries;
    let dsel = sel;
    if (by) {
      from = entries.filter(x => !used.has(String(x.tags?.[by] ?? '')));
      if (i > 0) dsel = { ...sel, [by]: null };
    }
    const e = draw(from, dsel, { rng, recent, key, avoid, strict: n > 1 });
    if (e) {
      got.push(e.v);
      if (t.captionTag && n === 1) caption = e.tags?.[t.captionTag] != null ? String(e.tags[t.captionTag]) : undefined;
      if (by) used.add(String(e.tags?.[by] ?? ''));
    }
  }
  if (!got.length) return null;

  // Optional parts (e.g. last name) are drawn once, filtered by the modifiers they list.
  const drawn: DrawnPart[] = [];
  if (got.length === 1) {
    for (const part of t.parts ?? []) {
      if (!partOn(part, opts)) continue;
      const psel: Selection = {};
      for (const k of part.filterBy ?? []) if (sel[k]) psel[k] = sel[k];
      const pl = ctx.lists[part.list];
      const e = pl && draw(pl.entries, psel, { rng, recent, key: 'lib:' + part.list });
      if (e) drawn.push({ key: part.key, v: e.v, before: e.position === 'before', join: part.join ?? ' ' });
    }
  }
  const r: ToolResult = { kind: 'list', text: '', base: got, drawn, relaxed, mods: sel, glyph: t.display === 'glyph', caption };
  r.text = plainText(t, r, opts);
  return r;
}

/** One-line summary of a tool's current settings for the hub. */
export function toolSub(t: AnyTool, opts: ToolOpts, ctx: ToolCtx): string {
  if (t.kind === 'dice') {
    const m = diceOpts(t, opts);
    return `${m.count}d${m.type}`;
  }
  if (allHidden(t, ctx)) return 'All hidden';
  if (isEmptyList(t, ctx)) return 'Empty list';
  const defs = modDefs(t, ctx);
  const eff = effectiveOpts(t, opts, ctx);
  const missing = defs.filter(d => d.required && !eff[d.key]);
  if (missing.length) return 'Choose ' + missing.map(d => d.label.toLowerCase()).join(', ');
  const set = defs
    .filter(d => eff[d.key])
    .map(d => (d.key === 'letter' ? `Starts ${eff[d.key]}` : valueLabel(d, String(eff[d.key]))));
  if (!isGen(t)) {
    for (const p of t.parts ?? []) if (partOn(p, opts)) set.push('+ ' + p.label.toLowerCase());
    if (t.followUp && followOn(t, opts)) set.push('+ ' + t.followUp.label.toLowerCase());
  }
  if (set.length) return set.join(' · ');
  if (!isGen(t) && t.count) return `${countOpt(t, opts)} at a time`;
  return isGen(t) ? 'Pack table' : `${entriesOf(t, ctx).length} entries`;
}

/** Every table id a generator mentions that the pack does not define (for the empty-state message). */
export const missingTables = (g: Generator, pack?: Pack): string[] => allSlots(g.output).filter(id => !pack?.tables[id]);
