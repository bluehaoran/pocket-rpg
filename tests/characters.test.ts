import { describe, expect, it } from 'vitest';
import { orderedPacks, packs } from '../src/lib/content/index.ts';
import type { Field, Pack } from '../src/lib/content/types.ts';
import { newSession } from '../src/lib/db.ts';
import { mulberry32 } from '../src/lib/engine/rng.ts';
import {
  charName, derive, exactText, lfChecks, numberField, numberFieldId, numberRange, evalFormula, fieldsOf, groupFieldsOf, isRfs, lfFlavour, listOf, newCharacter, pickSkill,
  rfsFlavour, skillTree, statuses, syncResources, canRandom, randomValue, type CharCtx
} from '../src/lib/characters.ts';
import {
  charCtx, ensureSetup, nativeFor, randomPackId, rerollSeedColumn, rollAllFields, rollSeed, seedFace, setPack, setPlayers,
  setRules, setStarter, startPlay, starterOf
} from '../src/lib/setup.ts';

const all = orderedPacks();
const ctxOf = (packId: string, rulesId: string, seed = 1, extra: Partial<CharCtx> = {}): CharCtx => ({
  pack: packs[packId]!, rulesId, rng: mulberry32(seed), recent: {}, ...extra
});

describe('evalFormula', () => {
  it('does arithmetic with N, precedence and parentheses', () => {
    expect(evalFormula('3 * N', 4)).toBe(12);
    expect(evalFormula('10 - 2 * N', 3)).toBe(4);
    expect(evalFormula('(N + 3) * 2', 2)).toBe(10);
    expect(evalFormula('N - 1', 2)).toBe(1);
  });
  it('rejects anything else', () => {
    expect(evalFormula('process.exit()', 2)).toBeNull();
    expect(evalFormula('N +', 2)).toBeNull();
    expect(evalFormula('1 / 0', 2)).toBeNull();
    expect(evalFormula('2 2', 2)).toBeNull();
  });
});

describe('every native pack makes a valid character', () => {
  for (const p of all) {
    for (const rulesId of ['lasers-feelings', 'roll-for-shoes'] as const) {
      if (!p.flavour?.[rulesId]) continue;
      it(`${p.id} / ${rulesId}`, () => {
        for (let seed = 1; seed <= 20; seed++) {
          const ctx = ctxOf(p.id, rulesId, seed);
          const c = newCharacter(ctx);
          for (const f of fieldsOf(p, rulesId)) {
            const v = c.fields[f.id];
            expect(v, `${f.id}`).not.toBeUndefined();
            if (f.kind === 'number') {
              const [lo, hi] = f.range ?? lfFlavour(p).numberRange ?? [2, 5];
              expect(v).toBeGreaterThanOrEqual(lo);
              expect(v).toBeLessThanOrEqual(hi);
            }
            if (f.kind === 'multi') expect(Array.isArray(v) && v.length).toBe(Math.min(f.count ?? 2, listOf(p, f)?.length ?? 0));
          }
          if (rulesId === 'roll-for-shoes') expect(c.xp).toBe(0);
        }
      });
    }
  }
});

describe('number rolling', () => {
  it('numberRoll rerolls 1 and 6, so a 1d6 number is 2..5', () => {
    const p = packs['swords-and-sorcery']!;
    const f = lfFlavour(p).fields.find(x => x.kind === 'number')!;
    expect(f.randomise).toBe('numberRoll');
    const seen = new Set<number>();
    for (let s = 1; s < 200; s++) seen.add(randomValue(ctxOf(p.id, 'lasers-feelings', s), f) as number);
    expect([...seen].sort()).toEqual([2, 3, 4, 5]);
  });
  it('rerolling a number never returns the current one', () => {
    const p = packs['starfarers']!;
    const f = lfFlavour(p).fields.find(x => x.kind === 'number')!;
    const ctx = ctxOf(p.id, 'lasers-feelings', 3);
    let cur = 3;
    for (let i = 0; i < 50; i++) {
      const n = randomValue(ctx, f, cur) as number;
      expect(n).not.toBe(cur);
      cur = n;
    }
  });
});

describe('field filterBy', () => {
  const pack: Pack = {
    id: 't', name: 'T', version: '1', genre: 'T',
    modifiers: { role: { label: 'Role', values: ['Monk', 'Farmer'] } },
    tables: {
      gear: [{ v: 'Rations' }, { v: 'Pack animal', tags: { role: 'Farmer' } }, { v: 'Staff', tags: { role: 'Monk' } }]
    },
    flavour: { 'lasers-feelings': { checks: [], fields: [] } }
  };
  const gear: Field = { id: 'gear', label: 'Gear', kind: 'pick', table: 'gear', filterBy: ['role'] };

  it('lists only entries that fit the source field', () => {
    expect(listOf(pack, gear, { role: 'Farmer' })).toEqual(['Rations', 'Pack animal']);
    expect(listOf(pack, gear, { role: 'Monk' })).toEqual(['Rations', 'Staff']);
    expect(listOf(pack, gear, {})).toEqual(['Rations', 'Pack animal', 'Staff']);
    expect(listOf(pack, { ...gear, filterBy: undefined }, { role: 'Monk' })).toHaveLength(3);
  });
  it('random draws respect it, and the source field is rolled first', () => {
    for (let s = 1; s < 60; s++) {
      const ctx: CharCtx = { pack, rulesId: 'lasers-feelings', rng: mulberry32(s), recent: {} };
      const v = randomValue(ctx, gear, undefined, { role: 'Monk' });
      expect(['Rations', 'Staff']).toContain(v);
    }
  });
  it('the real Blade and Spirit pack uses it when present locally', () => {
    const b = packs['blade-and-spirit'];
    if (!b) return;
    const f = lfFlavour(b).fields.find(x => x.id === 'gear')!;
    expect(f.filterBy).toEqual(['role']);
    expect(listOf(b, f, { role: 'Monk' })!.some(v => /pack animal/i.test(v))).toBe(false);
    expect(listOf(b, f, { role: 'Farmer' })!.some(v => /pack animal/i.test(v))).toBe(true);
  });
});

describe('Lasers & Feelings characters', () => {
  it('derive computes formulas and label references', () => {
    const p = packs['swords-and-sorcery']!;
    const c = newCharacter(ctxOf(p.id, 'lasers-feelings', 2));
    c.fields.number = 3;
    const d = Object.fromEntries(derive(p, c).map(x => [x.label, x.v]));
    expect(d['Max HP']).toBe(9);
    expect(d['Max SP (spirit)']).toBe(4);
    expect(d['Weapon damage dice']).toBe(2);
    expect(d['Encumbrance']).toBe(6);
    expect(d['Spells known']).toBe(4);
  });
  it('resources start full and follow appliesTo', () => {
    const p = packs['moon-and-blood']!;
    const res = lfFlavour(p).resources!;
    const c = newCharacter(ctxOf(p.id, 'lasers-feelings', 4));
    for (const r of res) {
      const applies = !r.appliesTo || Object.entries(r.appliesTo).every(([k, v]) => c.fields[k] === v);
      expect(c.resources[r.id]).toBe(applies ? r.start : undefined);
    }
    // Change a field so a role-specific resource applies, then sync.
    const scoped = res.find(r => r.appliesTo);
    if (scoped) {
      const [k, v] = Object.entries(scoped.appliesTo!)[0]!;
      c.fields[k] = v;
      syncResources(p, c);
      expect(c.resources[scoped.id]).toBe(scoped.start);
      c.fields[k] = '__other__';
      syncResources(p, c);
      expect(c.resources[scoped.id]).toBeUndefined();
    }
  });
  it('charName falls back to role then Player n', () => {
    expect(charName({ id: 'a', fields: { name: 'Ada' }, resources: {} }, 0)).toBe('Ada');
    expect(charName({ id: 'a', fields: { role: 'pilot' }, resources: {} }, 0)).toBe('Pilot');
    expect(charName({ id: 'a', fields: {}, resources: {} }, 1)).toBe('Player 2');
  });
  it('fallback flavours exist for packs of the other system', () => {
    const rfsOnly = packs['the-heist']!;
    const lf = lfFlavour(rfsOnly);
    expect(lf.fields.some(f => f.kind === 'number')).toBe(true);
    const lfOnly = packs['starfarers']!;
    expect(rfsFlavour(lfOnly).fields.map(f => f.id)).toEqual(['name', 'concept']);
  });
});

describe('Roll for Shoes characters', () => {
  it('starts with root skill, XP 0 and the requested starting skills, no duplicates', () => {
    const base = ctxOf('the-heist', 'roll-for-shoes', 5, { starterSkills: 3 });
    const c = newCharacter(base);
    expect(c.extra).toHaveLength(3);
    expect(new Set(c.extra).size).toBe(3);
    const tree = skillTree(base.pack, c);
    expect(tree[0]).toMatchObject({ root: true, level: 1, name: 'Do anything' });
    expect(tree.slice(1).map(n => n.level)).toEqual([2, 2, 2]);
    expect(newCharacter(ctxOf('the-heist', 'roll-for-shoes', 5)).extra).toEqual([]);
  });
  it('setting fields give skills and statuses (Minimon)', () => {
    const ctx = ctxOf('minimon', 'roll-for-shoes', 6);
    const c = newCharacter(ctx);
    const tree = skillTree(ctx.pack, c);
    const rf = rfsFlavour(ctx.pack);
    const skillFields = rf.fields.filter(f => f.skill);
    expect(skillFields.length).toBeGreaterThan(0);
    for (const f of skillFields) expect(tree.find(n => n.field === f.id)?.level).toBe(f.skill!.level);
    const st = statuses(ctx.pack, c);
    for (const t of st) expect(t.level).toBeLessThan(0);
  });
  it('earned skills hang under their parent, in depth order', () => {
    const ctx = ctxOf('the-heist', 'roll-for-shoes', 7, { starterSkills: 1 });
    const c = newCharacter(ctx);
    c.earned = [
      { name: 'Pick locks', level: 2, parent: 'r' },
      { name: 'Pick vaults', level: 3, parent: 'e:0' },
      { name: 'Sneak', level: 3, parent: 'x:0' }
    ];
    const tree = skillTree(ctx.pack, c);
    const names = tree.map(n => n.name);
    expect(names.indexOf('Pick vaults')).toBe(names.indexOf('Pick locks') + 1);
    expect(names.indexOf('Sneak')).toBe(names.indexOf(c.extra![0]!) + 1);
    expect(tree.find(n => n.name === 'Pick vaults')!.depth).toBe(2);
  });
  it('pickSkill avoids skills already held', () => {
    const ctx = ctxOf('the-heist', 'roll-for-shoes', 8);
    const c = newCharacter(ctx);
    c.extra = [];
    const got = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const s = pickSkill(ctx, c);
      expect(c.extra!).not.toContain(s);
      c.extra!.push(s);
      got.add(s);
    }
    expect(got.size).toBe(6);
  });
});

describe('setup operations', () => {
  const fresh = () => newSession('starfarers', 'lasers-feelings');

  it('switching rules moves to the first native pack and clears story state', () => {
    const s = fresh();
    s.answers = { q: 'a' };
    s.characters = [newCharacter(ctxOf('starfarers', 'lasers-feelings'))];
    s.recent = { x: ['y'] };
    setRules(s, 'roll-for-shoes', all);
    expect(s.rulesId).toBe('roll-for-shoes');
    expect(s.packIds).toEqual([nativeFor(all, 'roll-for-shoes')[0]!.id]);
    expect(s.characters).toEqual([]);
    expect(s.answers).toEqual({});
    expect(s.recent).toEqual({});
    const before = JSON.stringify(s);
    setRules(s, 'roll-for-shoes', all);
    expect(JSON.stringify(s)).toBe(before);
  });
  it('changing pack resets characters and starting skills; same pack is a no-op', () => {
    const s = fresh();
    s.characters = [newCharacter(ctxOf('starfarers', 'lasers-feelings'))];
    setPack(s, 'starfarers');
    expect(s.characters).toHaveLength(1);
    setPack(s, 'swords-and-sorcery');
    expect(s.characters).toEqual([]);
    expect(s.packIds).toEqual(['swords-and-sorcery']);
  });
  it('players clamp to 1..4 and ensureSetup makes a character each, plus group fields', () => {
    const s = fresh();
    setPlayers(s, 9);
    expect(s.players).toBe(4);
    setPlayers(s, 0);
    expect(s.players).toBe(1);
    setPlayers(s, 3);
    const ctx = charCtx(s, packs['starfarers']!, mulberry32(1));
    ensureSetup(s, ctx);
    expect(s.characters).toHaveLength(3);
    expect(new Set(s.characters.map(c => c.id)).size).toBe(3);
    for (const f of groupFieldsOf(ctx.pack)) expect(s.group[f.id]).not.toBeUndefined();
    const first = s.characters[0];
    setPlayers(s, 2);
    ensureSetup(s, ctx);
    expect(s.characters).toHaveLength(3);
    expect(s.characters[0]).toBe(first);
  });
  it('starting skills stepper adjusts existing characters and clamps to max', () => {
    const s = newSession('the-heist', 'roll-for-shoes');
    s.players = 2;
    const ctx = charCtx(s, packs['the-heist']!, mulberry32(2));
    ensureSetup(s, ctx);
    setStarter(s, ctx, 2);
    expect(s.starterSkills).toBe(2);
    expect(s.characters.map(c => c.extra!.length)).toEqual([2, 2]);
    setStarter(s, ctx, 9);
    expect(s.starterSkills).toBe(3);
    expect(s.characters.every(c => c.extra!.length === 3)).toBe(true);
    setStarter(s, ctx, -1);
    expect(s.characters.every(c => c.extra!.length === 0)).toBe(true);
    expect(starterOf(s, ctx.pack)).toBe(0);
  });
  it('Roll all keeps the id and fields that have no list', () => {
    const s = fresh();
    const ctx = charCtx(s, packs['starfarers']!, mulberry32(3));
    ensureSetup(s, ctx);
    const old = s.characters[0]!;
    const freeField = lfFlavour(ctx.pack).fields.find(f => !canRandom(ctx.pack, f));
    if (freeField) old.fields[freeField.id] = 'typed by hand';
    const id = old.id;
    rollAllFields(s, ctx, 0);
    expect(s.characters[0]!.id).toBe(id);
    if (freeField) expect(s.characters[0]!.fields[freeField.id]).toBe('typed by hand');
  });
  it('start play trims extra characters and logs it', () => {
    const s = fresh();
    s.players = 3;
    const ctx = charCtx(s, packs['starfarers']!, mulberry32(4));
    ensureSetup(s, ctx);
    s.players = 2;
    startPlay(s, 'Sci-fi', new Date('2026-10-24T10:00:00Z'));
    expect(s.started).toBe(true);
    expect(s.characters).toHaveLength(2);
    expect(s.trackHistory).toEqual([{ t: '2026-10-24T10:00:00.000Z', kind: 'edit', text: 'Session started · Sci-fi · 2 players' }]);
  });
});

describe('story seed', () => {
  const withSeed = all.filter(p => p.seed);
  it('there are packs with seeds', () => expect(withSeed.length).toBeGreaterThan(0));
  for (const p of withSeed) {
    it(`${p.id}: roll all fills every column; one reroll changes only that column`, () => {
      const s = newSession(p.id, 'lasers-feelings');
      const rng = mulberry32(9);
      rollSeed(s, p, rng);
      const cols = p.seed!.columns;
      expect(s.seed!.columns).toHaveLength(cols.length);
      expect(s.seed!.text).not.toMatch(/\{\d+\}/);
      cols.forEach((_, i) => expect(seedFace(p, i, s.seed!.columns[i]!)).toBeGreaterThan(0));
      for (let i = 0; i < cols.length; i++) {
        const before = [...s.seed!.columns];
        rerollSeedColumn(s, p, i, rng);
        const after = s.seed!.columns;
        if ((p.tables[cols[i]!.table]?.length ?? 0) > 1) expect(after[i]).not.toBe(before[i]);
        after.forEach((v, j) => j !== i && expect(v).toBe(before[j]));
      }
    });
  }
  it('packs without a seed leave it unset', () => {
    const none = all.find(p => !p.seed)!;
    const s = newSession(none.id, 'lasers-feelings');
    rollSeed(s, none, mulberry32(1));
    expect(s.seed).toBeUndefined();
  });
  it('isRfs', () => expect([isRfs('roll-for-shoes'), isRfs('lasers-feelings')]).toEqual([true, false]));
});

describe('randomPackId', () => {
  const ps = [{ id: 'a' }, { id: 'b' }, { id: 'c' }] as Pack[];
  it('never returns the current pack when there is another', () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 50; i++) expect(randomPackId(ps, 'b', rng)).not.toBe('b');
  });
  it('can reach every other pack', () => {
    const rng = mulberry32(6);
    const seen = new Set(Array.from({ length: 50 }, () => randomPackId(ps, 'a', rng)));
    expect([...seen].sort()).toEqual(['b', 'c']);
  });
  it('falls back to the only pack', () => {
    expect(randomPackId([ps[0]!], 'a', mulberry32(1))).toBe('a');
  });
});

describe('Lasers & Feelings number helpers', () => {
  const lf = lfFlavour(packs['lasers-feelings-space'] ?? all[0]!);
  const bare = { checks: [], fields: [] } as unknown as ReturnType<typeof lfFlavour>;

  it('finds the number field, falling back to the id "number"', () => {
    expect(numberField(lf.fields)?.kind).toBe('number');
    expect(numberFieldId(lf)).toBe(numberField(lf.fields)!.id);
    expect(numberField([])).toBeUndefined();
    expect(numberFieldId(bare)).toBe('number');
  });

  it('prefers the field range, then the flavour range, then 2-5', () => {
    const f = { id: 'n', label: 'N', kind: 'number' } as Field;
    expect(numberRange({ ...bare, numberRange: [1, 6] }, { ...f, range: [3, 4] })).toEqual([3, 4]);
    expect(numberRange({ ...bare, numberRange: [1, 6] }, f)).toEqual([1, 6]);
    expect(numberRange(bare, f)).toEqual([2, 5]);
    expect(numberRange(bare)).toEqual([2, 5]);
  });

  it('splits the checks into under and over', () => {
    const checks = [
      { id: 'a', label: 'Lasers', roll: 'under' as const },
      { id: 'b', label: 'Feelings', roll: 'over' as const }
    ];
    expect(lfChecks({ ...bare, checks })).toEqual({ under: checks[0], over: checks[1] });
    expect(lfChecks(bare)).toEqual({ under: undefined, over: undefined });
  });

  it('words the exact-number rule, flagging when it is not a success', () => {
    expect(exactText(bare, 3)).toBe('Exactly 3: special effect.');
    expect(exactText({ ...bare, exact: { name: 'LASER FEELINGS' } }, 4)).toBe('Exactly 4: LASER FEELINGS.');
    expect(exactText({ ...bare, exact: { name: 'Odd', countsAsSuccess: false } }, 2)).toBe('Exactly 2: Odd (not a success).');
  });
});
