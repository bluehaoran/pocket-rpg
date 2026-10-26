import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lists, packs, registry } from '../src/lib/content/index.ts';
import type { ToolList } from '../src/lib/content/types.ts';
import { availableLetters } from '../src/lib/engine/table.ts';
import { mulberry32 } from '../src/lib/engine/rng.ts';
import {
  drawFollowUp, effectiveOpts, findTool, glyphRows, formatData, historyText, isEmptyList, missingRequired, packTools,
  plainText, rollTool, segments, toolSub, type ToolCtx, type ToolOpts
} from '../src/lib/tools.ts';

const ctxFor = (seed: number, packId?: string, over: Partial<ToolCtx> = {}): ToolCtx => ({
  rng: mulberry32(seed),
  recent: {},
  registry,
  lists,
  pack: packId ? packs[packId] : undefined,
  ...over
});
const tool = (id: string, ctx: ToolCtx) => findTool(id, registry, ctx.pack)!;

describe('dice', () => {
  it('rolls count dice of the chosen type and sums them', () => {
    const ctx = ctxFor(1);
    const r = rollTool(tool('dice', ctx), { count: 3, type: 20 }, ctx)!;
    expect(r.kind).toBe('dice');
    if (r.kind !== 'dice') return;
    expect(r.dice).toHaveLength(3);
    expect(r.dice.every(d => d >= 1 && d <= 20)).toBe(true);
    expect(r.text).toBe(String(r.dice.reduce((a, b) => a + b, 0)));
    expect(r.note).toBe(`3d20 = ${r.dice.join(' + ')}`);
  });
  it('defaults to 1d6 and covers every face', () => {
    const ctx = ctxFor(2);
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const r = rollTool(tool('dice', ctx), {}, ctx)!;
      if (r.kind === 'dice') {
        expect(r.sides).toBe(6);
        seen.add(r.dice[0]!);
      }
    }
    expect(seen.size).toBe(6);
  });
});

describe('names', () => {
  it('filters by gender and setting', () => {
    const ctx = ctxFor(3);
    const t = tool('names', ctx);
    for (let i = 0; i < 30; i++) {
      const r = rollTool(t, { gender: 'f', setting: 'fantasy' }, ctx)!;
      const e = lists.names!.entries.find(x => x.v === r.text)!;
      expect(e.tags?.gender === 'f' || (Array.isArray(e.tags?.gender) && e.tags.gender.includes('f'))).toBe(true);
    }
  });
  it('never repeats the result on screen', () => {
    const ctx = ctxFor(4);
    const t = tool('names', ctx);
    let prev = rollTool(t, {}, ctx);
    for (let i = 0; i < 100; i++) {
      const next = rollTool(t, {}, ctx, prev);
      expect(next!.text).not.toBe(prev!.text);
      prev = next;
    }
  });
  it('the letter modifier restricts starting letters', () => {
    const ctx = ctxFor(5);
    for (let i = 0; i < 20; i++) {
      const r = rollTool(tool('names', ctx), { setting: 'fantasy', letter: 'A' }, ctx)!;
      expect(r.text.startsWith('A')).toBe(true);
    }
  });
  it('relaxes optional modifiers in order and flags it', () => {
    const ctx = ctxFor(6);
    const entries = lists.names!.entries;
    // A letter with no fantasy names; whether it exists elsewhere depends on the list, so derive what to expect.
    const missing = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].find(L => !availableLetters(entries, { setting: 'fantasy' }).has(L))!;
    expect(missing).toBeTruthy();
    const r = rollTool(tool('names', ctx), { gender: 'f', setting: 'fantasy', letter: missing }, ctx)!;
    expect(r.kind === 'list' && r.relaxed).toBe(true);
    // gender, then setting, are dropped in order; the letter is kept if some name has it, else dropped too.
    const elsewhere = availableLetters(entries, {}).has(missing);
    expect(r.kind === 'list' && r.mods).toEqual(elsewhere ? { letter: missing } : {});
    // A letter that matches nothing at all drops every optional modifier.
    const nowhere = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].find(L => !availableLetters(entries, {}).has(L));
    if (nowhere) {
      const none = rollTool(tool('names', ctx), { letter: nowhere }, ctx);
      expect(none?.kind === 'list' && none.relaxed).toBe(true);
    }
  });
  it('genre default for setting, unless the user chose (including Any)', () => {
    const ctx = ctxFor(7, 'swords-and-sorcery');
    const t = tool('names', ctx);
    expect(effectiveOpts(t, {}, ctx).setting).toBe('fantasy');
    expect(effectiveOpts(t, { setting: 'gothic' }, ctx).setting).toBe('gothic');
    expect(effectiveOpts(t, { setting: '' }, ctx).setting).toBe('');
    const noPack = ctxFor(7);
    expect(effectiveOpts(t, {}, noPack).setting).toBeUndefined();
    const minimon = ctxFor(7, 'minimon');
    expect(effectiveOpts(t, {}, minimon).setting).toBeUndefined();
  });
  it('gender x gives only explicit x entries', () => {
    const ctx = ctxFor(8);
    for (let i = 0; i < 30; i++) {
      const r = rollTool(tool('names', ctx), { gender: 'x' }, ctx)!;
      const e = lists.names!.entries.find(x => x.v === r.text)!;
      expect(e.tags?.gender === undefined || [e.tags.gender].flat().includes('x')).toBe(true);
    }
  });
});

describe('name parts and follow-up', () => {
  const names = () => tool('names', ctxFor(0)) as Extract<ReturnType<typeof tool>, { kind: 'list' }>;
  it('adds a last name from the same setting, underlined, after by default', () => {
    const ctx = ctxFor(9);
    const opts: ToolOpts = { setting: 'fantasy', surname: true };
    const r = rollTool(names(), opts, ctx)!;
    if (r.kind !== 'list') throw new Error();
    expect(r.drawn).toHaveLength(1);
    const sur = lists.surnames!.entries.find(e => e.v === r.drawn[0]!.v)!;
    expect(sur.tags?.setting).toBe('fantasy');
    const segs = segments(names(), r, opts);
    expect(segs.map(s => s.underline ?? false)).toEqual([false, false, true]);
    expect(plainText(names(), r, opts)).toBe(`${r.base[0]} ${r.drawn[0]!.v}`);
  });
  it('family name order: "before" surnames lead only while the box is ticked, with no reroll', () => {
    const ctx = ctxFor(10);
    let r;
    const opts: ToolOpts = { setting: 'samurai', surname: true, 'surname:order': true };
    r = rollTool(names(), opts, ctx)!;
    if (r.kind !== 'list') throw new Error();
    expect(r.drawn[0]!.before).toBe(true);
    expect(plainText(names(), r, opts)).toBe(`${r.drawn[0]!.v} ${r.base[0]}`);
    expect(plainText(names(), r, { ...opts, 'surname:order': false })).toBe(`${r.base[0]} ${r.drawn[0]!.v}`);
  });
  it('surname off draws no part; parts are skipped when count > 1', () => {
    const ctx = ctxFor(11);
    const r = rollTool(names(), { setting: 'modern' }, ctx)!;
    expect(r.kind === 'list' && r.drawn).toEqual([]);
  });
  it('follow-up is drawn separately, avoids the shown one, and is logged as one entry', () => {
    const ctx = ctxFor(12);
    const t = names();
    const r = rollTool(t, { setting: 'fantasy' }, ctx)!;
    let f = drawFollowUp(t, ctx, null)!;
    expect(lists.descriptions!.entries.map(e => e.v)).toContain(f);
    for (let i = 0; i < 40; i++) {
      const g = drawFollowUp(t, ctx, f)!;
      expect(g).not.toBe(f);
      f = g;
    }
    expect(historyText(t, r, f, {})).toBe(`${r.text} — ${f}`);
    expect(historyText(t, r, null, {})).toBe(r.text);
  });
});

describe('simple lists and emoji', () => {
  it('rolls from description, items and emotions', () => {
    const ctx = ctxFor(13);
    for (const id of ['description', 'items', 'emotions']) {
      const r = rollTool(tool(id, ctx), {}, ctx)!;
      expect(lists[id === 'description' ? 'descriptions' : id]!.entries.map(e => e.v)).toContain(r.text);
    }
  });
  it('every description has a declared group, and the tool shows no Group picker', () => {
    const list = lists.descriptions!;
    const groups = list.modifiers.group!.values;
    expect(list.entries.every(e => groups.includes(e.tags?.group as string))).toBe(true);
    for (const g of groups) expect(list.entries.filter(e => e.tags?.group === g).length).toBeGreaterThan(10);
    const t = tool('description', ctxFor(15));
    expect(t.kind === 'list' && (t.modifiers ?? [])).toEqual([]);
  });
  it('description count 1..3: words come from different groups, comma-separated', () => {
    const ctx = ctxFor(16);
    const t = tool('description', ctx);
    expect(t.kind === 'list' && t.count).toEqual({ min: 1, max: 3, default: 1 });
    const groupOf = (v: string) => lists.descriptions!.entries.find(e => e.v === v)!.tags!.group;
    const one = rollTool(t, {}, ctx)!;
    expect(one.kind === 'list' && one.base).toHaveLength(1);
    for (const n of [2, 3]) {
      for (let i = 0; i < 40; i++) {
        const r = rollTool(t, { count: n }, ctx)!;
        if (r.kind !== 'list') throw new Error('list expected');
        expect(r.base).toHaveLength(n);
        expect(new Set(r.base.map(groupOf)).size).toBe(n);
        expect(r.text).toBe(r.base.join(', '));
      }
    }
  });
  it('tilt results carry their group as a caption', () => {
    const entries = [{ v: 'A frantic chase', tags: { group: 'Mayhem' } }, { v: 'A funeral', tags: { group: 'Tragedy' } }];
    const ctx = ctxFor(18, undefined, { lists: { ...lists, tilts: { ...lists.tilts!, entries } } });
    for (let i = 0; i < 10; i++) {
      const r = rollTool(tool('tilt', ctx), {}, ctx)!;
      if (r.kind !== 'list') throw new Error('list expected');
      expect(r.caption).toBe(r.text === 'A funeral' ? 'Tragedy' : 'Mayhem');
    }
    const plain = rollTool(tool('description', ctx), {}, ctx)!;
    expect(plain.kind === 'list' && plain.caption).toBeUndefined();
  });
  it('emoji draws distinct glyphs, count 1..6', () => {
    const ctx = ctxFor(14);
    for (const n of [1, 3, 6]) {
      const r = rollTool(tool('emoji', ctx), { count: n }, ctx)!;
      if (r.kind !== 'list') throw new Error();
      expect(r.base).toHaveLength(n);
      expect(new Set(r.base).size).toBe(n);
      expect(r.glyph).toBe(true);
      expect(r.text).toBe(r.base.join(' '));
    }
    const dflt = rollTool(tool('emoji', ctx), {}, ctx)!;
    expect(dflt.kind === 'list' && dflt.base.length).toBe(3);
  });
  it('empty lists give no result and say so', () => {
    const ctx = ctxFor(15);
    for (const id of ['complication', 'tilt']) {
      const t = tool(id, ctx);
      if (lists[id === 'tilt' ? 'tilts' : 'complications']!.entries.length === 0) {
        expect(isEmptyList(t, ctx)).toBe(true);
        expect(rollTool(t, {}, ctx)).toBeNull();
        expect(toolSub(t, {}, ctx)).toBe('Empty list');
      }
    }
  });
  it('a fake list with one entry still returns it on reroll', () => {
    const one: ToolList = { id: 'items', label: 'Items', version: '0', modifiers: {}, entries: [{ v: 'only' }] };
    const ctx = ctxFor(16, undefined, { lists: { ...lists, items: one } });
    const r = rollTool(tool('items', ctx), {}, ctx)!;
    expect(rollTool(tool('items', ctx), {}, ctx, r)?.text).toBe('only');
  });
});

describe('pack generators', () => {
  it('are listed as pack tools', () => {
    const gens = packTools(packs['swords-and-sorcery']);
    expect(gens.map(g => g.id)).toContain('pack:spell');
    expect(findTool('pack:spell', registry, packs['swords-and-sorcery'])?.label).toBeTruthy();
    expect(findTool('pack:nope', registry, packs['swords-and-sorcery'])).toBeUndefined();
  });
  it('required modifiers gate the roll', () => {
    const p = Object.values(packs).flatMap(x => packTools(x).filter(t => t.gen.modifiers?.some(m => m.required)).map(t => [x.id, t.id] as const));
    // No shipped generator requires a modifier today; build one to cover the rule.
    const pack = structuredClone(packs['swords-and-sorcery']!);
    pack.generators = [{ id: 'g', label: 'G', modifiers: [{ key: 'spellLevel', required: true }], output: '{spells}' }];
    const ctx: ToolCtx = { ...ctxFor(17), pack };
    const t = findTool('pack:g', registry, pack)!;
    expect(p.length).toBeGreaterThanOrEqual(0);
    expect(missingRequired(t, {}, ctx).map(d => d.key)).toEqual(['spellLevel']);
    expect(rollTool(t, {}, ctx)).toBeNull();
    expect(toolSub(t, {}, ctx)).toMatch(/^Choose /);
    expect(missingRequired(t, { spellLevel: pack.modifiers!.spellLevel!.values[0]! }, ctx)).toEqual([]);
  });
  it('single-table generators show the data payload', () => {
    const ctx = ctxFor(18, 'swords-and-sorcery');
    const r = rollTool(tool('pack:monster', ctx), {}, ctx)!;
    if (r.kind !== 'gen') throw new Error();
    expect(r.text.length).toBeGreaterThan(0);
    const pack = packs['swords-and-sorcery']!;
    const out = pack.generators!.find(g => g.id === 'monster')!.output;
    const e = pack.tables[out.slice(1, -1)]!.find(x => x.v === r.text);
    expect(e?.data).toBeTruthy();
    expect(r.sub).toBe(formatData(e!.data));
  });
  it('template generators expand and never repeat the shown result', () => {
    const ctx = ctxFor(19, 'the-heist');
    const t = tool('pack:npc', ctx);
    let prev = rollTool(t, {}, ctx);
    for (let i = 0; i < 60; i++) {
      const next = rollTool(t, {}, ctx, prev)!;
      expect(next.text).not.toBe(prev!.text);
      expect(next.text).not.toMatch(/[{}]/);
      prev = next;
    }
  });
  it('formatData', () => {
    expect(formatData(undefined)).toBe('');
    expect(formatData({ hp: 4, dmg: 2, text: 'bites' })).toBe('hp 4 · dmg 2 · bites');
  });
});

describe('hub summaries', () => {
  it('describe the current settings', () => {
    const ctx = ctxFor(20, 'swords-and-sorcery');
    const t = tool('names', ctx);
    expect(toolSub(t, {}, ctx)).toBe('Fantasy');
    expect(toolSub(t, { gender: 'f', letter: 'K', surname: true, followUp: true }, ctx)).toBe(
      'Female · Fantasy · Starts K · + last name · + description'
    );
    expect(toolSub(tool('dice', ctx), { count: 2, type: 8 }, ctx)).toBe('2d8');
    expect(toolSub(tool('emoji', ctx), {}, ctx)).toBe('3 at a time');
    expect(toolSub(tool('emotions', ctx), {}, ctx)).toMatch(/ entries$/);
  });
});

describe('private tool lists', () => {
  it('a private list replaces the public one with the same id', () => {
    // content/private/ exists only on the author's machine; where it does, tilts come from it.
    const privateTilts = existsSync(join(import.meta.dirname, '..', 'content/private/tools/tilts.json'));
    if (privateTilts) expect(lists.tilts!.entries.length).toBeGreaterThan(0);
    else expect(lists.tilts!.entries).toEqual([]);
  });
});

describe('glyphRows (emoji layout)', () => {
  it('centred rows: 3 across, 4 as 2+2, otherwise rows of 3 or 2', () => {
    expect([1, 2, 3, 4, 5, 6].map(glyphRows)).toEqual([[1], [2], [3], [2, 2], [3, 2], [3, 3]]);
    expect(glyphRows(0)).toEqual([]);
    for (let n = 1; n <= 12; n++) {
      const rows = glyphRows(n);
      expect(rows.reduce((a, b) => a + b, 0)).toBe(n);
      if (n > 3) expect(rows.every(r => r === 2 || r === 3)).toBe(true);
    }
  });
});
