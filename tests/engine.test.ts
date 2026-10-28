import { describe, expect, it } from 'vitest';
import { lists, packs } from '../src/lib/content/index.ts';
import type { Entry } from '../src/lib/content/types.ts';
import { mulberry32, pick, randInt, rollDie } from '../src/lib/engine/rng.ts';
import { availableLetters, draw, initial, matches, NO_REPEAT, pool, relax, remember, type Recent } from '../src/lib/engine/table.ts';
import {
  articleFor, defaultSentence, expand, seedText, singleSlot, slots, renderSentence, usedFieldIds
} from '../src/lib/engine/template.ts';

const e = (v: string, tags?: Entry['tags']): Entry => ({ v, tags });

describe('rng', () => {
  it('is deterministic per seed and stays in range', () => {
    const a = mulberry32(42), b = mulberry32(42);
    const xs = Array.from({ length: 50 }, () => a.next());
    expect(xs).toEqual(Array.from({ length: 50 }, () => b.next()));
    expect(xs.every(x => x >= 0 && x < 1)).toBe(true);
    expect(mulberry32(1).next()).not.toBe(mulberry32(2).next());
  });
  it('rolls dice 1..n and picks from lists', () => {
    const r = mulberry32(7);
    const rolls = Array.from({ length: 600 }, () => rollDie(r, 6));
    expect(new Set(rolls)).toEqual(new Set([1, 2, 3, 4, 5, 6]));
    expect(randInt(r, 1)).toBe(0);
    expect(['a', 'b']).toContain(pick(r, ['a', 'b']));
    expect(() => pick(r, [])).toThrow();
  });
});

describe('matches (§1.2)', () => {
  it('equals, contains, or untagged', () => {
    expect(matches(e('x', { gender: 'f' }), { gender: 'f' })).toBe(true);
    expect(matches(e('x', { gender: 'f' }), { gender: 'm' })).toBe(false);
    expect(matches(e('x', { gender: ['f', 'm'] }), { gender: 'm' })).toBe(true);
    expect(matches(e('x'), { gender: 'm' })).toBe(true);
    expect(matches(e('x', { gender: 'f' }), {})).toBe(true);
    expect(matches(e('x', { gender: 'f' }), { gender: null, other: '' })).toBe(true);
  });
  it('gender x matches explicit x only, not f/m entries', () => {
    expect(matches(e('x', { gender: ['f', 'm'] }), { gender: 'x' })).toBe(false);
    expect(matches(e('x', { gender: ['f', 'm', 'x'] }), { gender: 'x' })).toBe(true);
  });
});

describe('letter modifier', () => {
  it('ignores a leading "The" and case', () => {
    expect(initial('The Hollow King')).toBe('H');
    expect(initial('the end')).toBe('E');
    expect(initial('Theo')).toBe('T');
    expect(matches(e('The Hollow King'), { letter: 'h' })).toBe(true);
    expect(matches(e('The Hollow King'), { letter: 'T' })).toBe(false);
  });
  it('availableLetters respects the other modifiers', () => {
    const rows = [e('Anna', { gender: 'f' }), e('Bob', { gender: 'm' }), e('Cleo', { gender: 'f' })];
    expect([...availableLetters(rows, { gender: 'f' })].sort()).toEqual(['A', 'C']);
    expect([...availableLetters(rows, { gender: 'f', letter: 'B' })].sort()).toEqual(['A', 'C']);
  });
  it('works on the real names list', () => {
    const entries = lists.names!.entries;
    const letters = availableLetters(entries, { setting: 'samurai' });
    expect(letters.size).toBeGreaterThan(0);
    for (const L of letters) expect(pool(entries, { setting: 'samurai', letter: L }).length).toBeGreaterThan(0);
  });
});

describe('draw', () => {
  const rows = ['a', 'b', 'c', 'd', 'e'].map(v => e(v));
  it('never returns avoided values when others exist', () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 100; i++) expect(draw(rows, {}, { rng, avoid: ['a', 'b', 'c', 'd'] })?.v).toBe('e');
  });
  it('no-repeat window of 3: four draws from four entries never repeat inside the window', () => {
    const recent: Recent = {};
    const rng = mulberry32(9);
    const small = rows.slice(0, 4);
    const seq: string[] = [];
    for (let i = 0; i < 40; i++) seq.push(draw(small, {}, { rng, recent, key: 't' })!.v);
    for (let i = NO_REPEAT; i < seq.length; i++) {
      expect(seq.slice(i - NO_REPEAT, i)).not.toContain(seq[i]);
    }
    expect(recent.t).toHaveLength(NO_REPEAT);
  });
  it('relaxes the window, then avoid, then returns the pool; strict returns null', () => {
    const rng = mulberry32(1);
    const one = [e('only')];
    expect(draw(one, {}, { rng, avoid: ['only'] })?.v).toBe('only');
    expect(draw(one, {}, { rng, avoid: ['only'], strict: true })).toBeNull();
    const two = [e('a'), e('b')];
    const recent: Recent = { k: ['a', 'b'] };
    expect(draw(two, {}, { rng, recent, key: 'k', avoid: ['a'] })?.v).toBe('b');
  });
  it('returns null on an empty pool and does not record', () => {
    const recent: Recent = {};
    expect(draw(rows, { x: 'y' } as never, { rng: mulberry32(1), recent, key: 'k' })).not.toBeNull();
    expect(draw([e('a', { g: 'f' })], { g: 'm' }, { rng: mulberry32(1), recent, key: 'z' })).toBeNull();
    expect(recent.z).toBeUndefined();
  });
  it('remember keeps newest first, deduped', () => {
    const r: Recent = {};
    for (const v of ['a', 'b', 'c', 'a', 'd']) remember(r, 'k', v);
    expect(r.k).toEqual(['d', 'a', 'c']);
  });
  it('draws from real tables with modifiers', () => {
    const t = packs['swords-and-sorcery']!.tables['name.fantasy']!;
    const rng = mulberry32(5);
    for (let i = 0; i < 30; i++) {
      const got = draw(t, { gender: 'f' }, { rng })!;
      expect(matches(got, { gender: 'f' })).toBe(true);
    }
  });
});

describe('relax', () => {
  const decls = [{ key: 'gender' }, { key: 'setting' }, { key: 'req', required: true }];
  it('drops optional modifiers in declaration order until ok', () => {
    const calls: string[] = [];
    const r = relax(decls, { gender: 'x', setting: 'fantasy', req: 'z' }, s => {
      calls.push(Object.keys(s).join());
      return !s.gender && !s.setting;
    });
    expect(r.relaxed).toBe(true);
    expect(r.sel).toEqual({ req: 'z' });
    expect(calls).toEqual(['gender,setting,req', 'setting,req', 'req']);
  });
  it('stops as soon as ok, keeping later modifiers', () => {
    const r = relax(decls, { gender: 'x', setting: 'fantasy' }, s => !s.gender);
    expect(r).toEqual({ sel: { setting: 'fantasy' }, relaxed: true });
  });
  it('never drops required ones and is not relaxed when ok at once', () => {
    expect(relax(decls, { req: 'z' }, () => false)).toEqual({ sel: { req: 'z' }, relaxed: false });
    expect(relax(decls, { gender: 'f' }, () => true).relaxed).toBe(false);
  });
  it('does not mutate its input', () => {
    const sel = { gender: 'f' };
    relax(decls, sel, () => false);
    expect(sel).toEqual({ gender: 'f' });
  });
});

describe('templates (§1.2, §1.8c)', () => {
  it('finds required slots only, and single-slot templates', () => {
    expect(slots('{a.b} {c?} {d|lower}')).toEqual(['a.b', 'd']);
    expect(singleSlot('{monster}')).toBe('monster');
    expect(singleSlot('{a} {b}')).toBeNull();
  });
  it('expands, lowercases, collapses space and tolerates missing tables', () => {
    const vals: Record<string, string> = { a: 'Red', b: 'FISH', c: 'x' };
    const out = expand('{a}  {b|lower} {missing} {c}', id => vals[id] ?? null, mulberry32(1));
    expect(out).toBe('Red fish x');
  });
  it('optional slots are sometimes empty, sometimes filled, and deterministic by seed', () => {
    const run = (seed: number) => {
      const rng = mulberry32(seed);
      return Array.from({ length: 200 }, () => expand('A{b?}', () => 'B', rng));
    };
    const a = run(11);
    expect(new Set(a)).toEqual(new Set(['A', 'AB']));
    expect(a).toEqual(run(11));
    const empty = a.filter(x => x === 'A').length / a.length;
    expect(empty).toBeGreaterThan(0.25);
    expect(empty).toBeLessThan(0.55);
  });
  it('seed text lowercases only case:lower columns, first letter', () => {
    const seed = { columns: [{}, { case: 'lower' as const }, {}], template: '{0} wants to {1} the {2}.' };
    expect(seedText(seed, ['Pirates', 'Ruin', 'Moon'])).toBe('Pirates wants to ruin the Moon.');
  });
  it('real seed templates expand fully', () => {
    const rng = mulberry32(2);
    for (const p of Object.values(packs)) {
      if (!p.seed) continue;
      const parts = p.seed.columns.map(c => draw(p.tables[c.table]!, {}, { rng })!.v);
      const text = seedText(p.seed, parts);
      expect(text, p.id).not.toMatch(/\{\d+\}/);
      expect(text.length).toBeGreaterThan(10);
    }
  });
  it('real generators expand without leftover braces', () => {
    const rng = mulberry32(4);
    for (const p of Object.values(packs)) {
      for (const g of p.generators ?? []) {
        const text = expand(g.output, id => draw(p.tables[id] ?? [], {}, { rng })?.v ?? null, rng);
        expect(text, `${p.id}/${g.id}`).not.toMatch(/[{}]/);
        expect(text.length, `${p.id}/${g.id}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('sentences (§1.6)', () => {
  const fields = [
    { id: 'name', label: 'Name' },
    { id: 'style', label: 'Style (ancestry)' },
    { id: 'role', label: 'Role' }
  ];
  const text = (toks: ReturnType<typeof renderSentence>['tokens']) =>
    toks.map(t => (t.kind === 'br' ? '\n' : t.text)).join('');

  it('picks a/an from the next field and lowercases with |lower', () => {
    const r = renderSentence('{name}\nis {a} {style|lower} {role|lower}', fields, { name: 'Ada', style: 'Eager', role: 'Pilot' });
    expect(text(r.tokens)).toBe('Ada\nis an eager pilot');
    expect([...r.used].sort()).toEqual(['name', 'role', 'style']);
    const r2 = renderSentence('{a|cap} {role}', fields, { role: 'Pilot' });
    expect(text(r2.tokens)).toBe('A Pilot');
    expect(articleFor('umbrella')).toBe('an');
  });
  it('shows short labels for empty fields, and drops them in plain mode with the lead-in comma', () => {
    const r = renderSentence('{name}, {role}', fields, { name: 'Ada' });
    expect(text(r.tokens)).toBe('Ada, Role');
    expect(r.tokens.at(-1)).toMatchObject({ kind: 'field', empty: true });
    const p = renderSentence('{name}, {role}', fields, { name: 'Ada' }, { plain: true });
    expect(text(p.tokens)).toBe('Ada');
    const s = renderSentence('{style}', fields, {});
    expect(text(s.tokens)).toBe('Style');
  });
  it('joins multi values with &, ignores unknown fields', () => {
    const r = renderSentence('{role} {nope}', fields, { role: ['Pilot', 'Medic'] });
    expect(text(r.tokens).trim()).toBe('Pilot & Medic');
    expect(r.used.has('nope')).toBe(false);
  });
  it('default sentences', () => {
    expect(defaultSentence('roll-for-shoes', ['name', 'concept'])).toBe('{name}\nis {a} {concept|lower}');
    expect(defaultSentence('lasers-feelings', ['name', 'style', 'role', 'goal'])).toBe(
      '{name}\nis {a} {style|lower} {role|lower} who wants to\n{goal|lower}'
    );
    expect(defaultSentence('lasers-feelings', ['style', 'role'])).toBe('is {a} {style|lower} {role|lower}');
  });
});

describe('usedFieldIds', () => {
  const fields = [
    { id: 'name', label: 'Name' },
    { id: 'role', label: 'Role' },
    { id: 'gear', label: 'Gear' }
  ];

  it('lists the fields a template mentions, ignoring unknown ids and the article token', () => {
    expect([...usedFieldIds('{name} is {a} {role|lower} with {nope}', fields)].sort()).toEqual(['name', 'role']);
  });

  it('matches what renderSentence reports as used, whatever the values', () => {
    const tpl = '{name}\n{a} {role}';
    expect(usedFieldIds(tpl, fields)).toEqual(renderSentence(tpl, fields, { name: 'Ada', role: 'Pilot' }).used);
    expect(usedFieldIds(tpl, fields)).toEqual(renderSentence(tpl, fields, {}).used);
  });
});
