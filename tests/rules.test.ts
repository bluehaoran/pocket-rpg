import { describe, expect, it } from 'vitest';
import { packs } from '../src/lib/content/index.ts';
import type { Character } from '../src/lib/db.ts';
import type { Rng } from '../src/lib/engine/rng.ts';
import { mulberry32 } from '../src/lib/engine/rng.ts';
import { lfFlavour, newCharacter, skillTree, type CharCtx } from '../src/lib/characters.ts';
import {
  DEFAULT_OUTCOMES, adjustResource, drawExactQuestion, lfLogText, outcomeFor, poolSize, resourceState, rollLf
} from '../src/lib/rules/lasers-feelings.ts';
import {
  addEarnedSkill, canSpend, giveFailXp, resolve, rfsLogText, rollSkill, spendXp, xpAvailable, type RfsRoll
} from '../src/lib/rules/roll-for-shoes.ts';

/** An Rng that makes rollDie(6) return the given faces in order. */
const dice = (...faces: number[]): Rng => {
  let i = 0;
  return { next: () => ((faces[i++ % faces.length]! - 1) + 0.5) / 6 };
};
const who = { ci: 0, name: 'Ada' };

describe('Lasers & Feelings rolls', () => {
  const sf = lfFlavour(packs['starfarers']!);

  it('pool = base + selected bonuses, clamped to min..max', () => {
    expect(sf.dice).toBeTruthy();
    const d = sf.dice!;
    expect(poolSize(sf, {})).toBe(Math.max(d.min, d.base));
    const all = Object.fromEntries((d.bonuses ?? []).map(b => [b.id, true]));
    expect(poolSize(sf, all)).toBe(Math.min(d.max, d.base + (d.bonuses ?? []).reduce((a, b) => a + b.dice, 0)));
    expect(poolSize({ ...sf, dice: { base: 1, bonuses: [{ id: 'a', label: 'A', dice: 5 }], min: 1, max: 3 } }, { a: true })).toBe(3);
    expect(poolSize({ ...sf, dice: { base: 0, bonuses: [], min: 1, max: 3 } }, {})).toBe(1);
  });

  it('under: dice below N succeed; over: dice above N succeed; equal is exact', () => {
    const under = sf.checks.find(c => c.roll === 'under')!;
    const over = sf.checks.find(c => c.roll === 'over')!;
    const on = Object.fromEntries((sf.dice!.bonuses ?? []).map(b => [b.id, true]));
    // N = 3, three dice: 2 (under ok), 3 (exact), 5 (over ok)
    let r = rollLf(sf, 3, under.id, on, dice(2, 3, 5), who);
    expect(r.marks).toEqual(['ok', 'ex', 'no']);
    expect(r.exact).toBe(true);
    r = rollLf(sf, 3, over.id, on, dice(2, 3, 5), who);
    expect(r.marks).toEqual(['no', 'ex', 'ok']);
    expect(r.dir).toBe('over');
  });

  it('exact counts as a success unless the pack says otherwise', () => {
    const under = sf.checks.find(c => c.roll === 'under')!;
    const base = { ...sf, dice: { base: 3, bonuses: [], min: 1, max: 3 } };
    const yes = rollLf({ ...base, exact: { countsAsSuccess: true } }, 4, under.id, {}, dice(4, 4, 6), who);
    expect(yes.successes).toBe(2);
    const no = rollLf({ ...base, exact: { countsAsSuccess: false } }, 4, under.id, {}, dice(4, 4, 6), who);
    expect(no.successes).toBe(0);
    expect(no.exact).toBe(true);
  });

  it('outcomes by success count, with 3+ using the top entry', () => {
    const labels = [0, 1, 2, 3, 4].map(n => outcomeFor(sf, n).label);
    const outs = [...(sf.outcomes ?? DEFAULT_OUTCOMES)];
    expect(labels[0]).toBe(outs.find(o => o.successes === 0)!.label);
    expect(labels[3]).toBe(outs.find(o => o.successes === 3)!.label);
    expect(labels[4]).toBe(labels[3]);
    expect(new Set(labels.slice(0, 4)).size).toBe(4);
    expect(outcomeFor({ ...sf, outcomes: undefined }, 1).label).toBe('Barely');
  });

  it('critical outcomes carry picks when the pack defines them', () => {
    for (const p of Object.values(packs)) {
      const f = p.flavour?.['lasers-feelings'];
      const crit = f?.outcomes?.find(o => o.successes === 3);
      if (f && crit?.picks) expect(outcomeFor(f, 3).picks).toEqual(crit.picks);
    }
  });

  it('log text and bonus labels', () => {
    const under = sf.checks.find(c => c.roll === 'under')!;
    const bonus = sf.dice!.bonuses?.[0];
    const r = rollLf(sf, 3, under.id, bonus ? { [bonus.id]: true } : {}, dice(1, 2, 6), who);
    expect(r.bonuses).toEqual(bonus ? [bonus.label] : []);
    expect(lfLogText(r, sf)).toContain(`${r.check} ${r.dice.length}d6 under 3: ${r.dice.join(' ')}`);
    expect(lfLogText(r, sf)).toContain(r.outcome);
  });

  it('rolls stay in range across hacks and numbers', () => {
    const rng = mulberry32(5);
    for (const p of Object.values(packs)) {
      const f = p.flavour?.['lasers-feelings'];
      if (!f) continue;
      for (const N of [2, 3, 4, 5]) for (const c of f.checks) {
        const r = rollLf(f, N, c.id, {}, rng, who);
        expect(r.dice.every(v => v >= 1 && v <= 6)).toBe(true);
        expect(r.successes).toBeLessThanOrEqual(r.dice.length);
      }
    }
  });

  it('draws exact-number questions from a table without repeating the shown one', () => {
    const p = Object.values(packs).find(x => typeof x.flavour?.['lasers-feelings']?.exact?.questions === 'string');
    if (!p) return;
    const f = lfFlavour(p);
    const rng = mulberry32(3);
    const recent = {};
    let prev = drawExactQuestion(p, f, rng, recent)!;
    expect(prev).toBeTruthy();
    for (let i = 0; i < 30; i++) {
      const q = drawExactQuestion(p, f, rng, recent, prev)!;
      expect(q).not.toBe(prev);
      prev = q;
    }
    expect(drawExactQuestion(packs['starfarers']!, { ...sf, exact: { questions: ['a'] } }, rng, recent)).toBeUndefined();
  });
});

describe('resources', () => {
  const p = packs['moon-and-blood']!;
  const f = lfFlavour(p);
  const hearts = f.resources!.find(r => r.states?.length)!;
  const mk = (): Character => ({ id: 'c', fields: {}, resources: { [hearts.id]: hearts.max } });

  it('adjusts within 0..max and reports state thresholds', () => {
    const c = mk();
    expect(adjustResource(c, hearts, 1)).toBeNull();
    const first = adjustResource(c, hearts, -1)!;
    expect(first).toMatchObject({ from: hearts.max, to: hearts.max - 1 });
    expect(first.text).toContain(`${hearts.label} ${hearts.max} → ${hearts.max - 1}`);
    for (let i = 0; i < 10; i++) adjustResource(c, hearts, -1);
    expect(c.resources[hearts.id]).toBe(0);
    expect(adjustResource(c, hearts, -1)).toBeNull();
    expect(resourceState(hearts, 0)).toEqual(hearts.states!.at(-1));
    expect(resourceState(hearts, hearts.max)).toBeUndefined();
  });
  it('ignores resources the character does not have', () => {
    expect(adjustResource({ id: 'c', fields: {}, resources: {} }, hearts, -1)).toBeNull();
  });
});

describe('Roll for Shoes rolls', () => {
  const pack = packs['the-heist']!;
  const ctx: CharCtx = { pack, rulesId: 'roll-for-shoes', rng: mulberry32(1), recent: {}, starterSkills: 1 };
  const mk = (): Character => {
    const c = newCharacter(ctx);
    c.fields.name = 'Ada';
    return c;
  };

  it('rolls level × d6 for the chosen skill', () => {
    const c = mk();
    const e = rollSkill(pack, c, who, 'r', [], 0, dice(3))!;
    expect(e.level).toBe(1);
    expect(e.dice).toEqual([3]);
    expect(e.result).toBeNull();
    expect(e.text).toBe('Total 3');
    const x = rollSkill(pack, c, who, 'x:0', [], 0, dice(2, 5))!;
    expect(x.dice).toEqual([2, 5]);
    expect(x.skillName).toBe(c.extra![0]);
    expect(rollSkill(pack, c, who, 'nope', [], 0, dice(1))).toBeNull();
  });

  it('opposed by GM compares sums; ties are shown as Tie', () => {
    const c = mk();
    const win = rollSkill(pack, c, who, 'x:0', [], 1, dice(5, 5, 3))!;
    expect([win.sum, win.gmSum, win.result, win.text]).toEqual([10, 3, 'win', 'Success']);
    const lose = rollSkill(pack, c, who, 'x:0', [], 2, dice(1, 2, 6, 6))!;
    expect([lose.sum, lose.gmSum, lose.result, lose.text]).toEqual([3, 12, 'lose', 'Fail']);
    const tie = rollSkill(pack, c, who, 'x:0', [], 1, dice(3, 3, 6))!;
    expect([tie.sum, tie.gmSum, tie.result, tie.text]).toEqual([6, 6, 'tie', 'Tie']);
  });

  it('failing gives 1 XP once; the log line says which roll', () => {
    const c = mk();
    const e = rollSkill(pack, c, who, 'r', [], 1, dice(1, 6))!;
    expect(e.result).toBe('lose');
    expect(giveFailXp(c, e)).toBe(`+1 XP (failed ${e.skillName})`);
    expect(giveFailXp(c, e)).toBeNull();
    expect(c.xp).toBe(1);
  });

  it('spending XP turns the lowest non-6 die into a 6; XP from this roll cannot be spent on it', () => {
    const c = mk();
    c.xp = 0;
    const e = rollSkill(pack, c, who, 'x:0', [], 1, dice(4, 2, 6))!; // 4+2 = 6 vs GM 6? gm die is the third value
    expect(e.gm).toEqual([6]);
    giveFailXp(c, e);
    expect(c.xp).toBe(1);
    expect(xpAvailable(c, e)).toBe(0);
    expect(canSpend(c, e)).toBe(false);
    expect(spendXp(c, e)).toEqual([]);
    c.xp = 3;
    expect(xpAvailable(c, e)).toBe(2);
    const lines = spendXp(c, e);
    expect(e.dice).toEqual([4, 6]);
    expect(c.xp).toBe(1); // 3, minus 1 spent, minus the 1 failure XP taken back
    expect(e.spent).toBe(1);
    expect(lines[0]).toMatch(/^Spent 1 XP: a die becomes 6 \(.+, now 10 vs 6\)$/);
    expect(lines[1]).toBe('−1 XP: the roll no longer fails');
    expect(e.xpGiven).toBe(false);
    expect(e.result).toBe('win');
  });

  it('spending when the roll still fails keeps the failure XP', () => {
    const c = mk();
    c.xp = 2;
    const e = rollSkill(pack, c, who, 'x:0', [], 4, dice(1, 1, 6, 6, 6, 6))!;
    giveFailXp(c, e);
    const lines = spendXp(c, e);
    expect(lines).toHaveLength(1);
    expect(e.xpGiven).toBe(true);
    expect(c.xp).toBe(2);
  });

  it('cannot spend on an all-sixes roll, or with no XP', () => {
    const c = mk();
    c.xp = 5;
    const e = rollSkill(pack, c, who, 'x:0', [], 0, dice(6))!;
    expect(e.allSix).toBe(true);
    expect(canSpend(c, e)).toBe(false);
    const none = mk();
    none.xp = 0;
    expect(canSpend(none, rollSkill(pack, none, who, 'r', [], 0, dice(2))!)).toBe(false);
  });

  it('spending can make every die a 6, which earns a new skill', () => {
    const c = mk();
    c.xp = 1;
    const e = rollSkill(pack, c, who, 'x:0', [], 0, dice(6, 3))!;
    spendXp(c, e);
    expect(e.allSix).toBe(true);
    const line = addEarnedSkill(c, e, '  Jump the gap ');
    expect(line).toBe(`New skill: Jump the gap 3 (from ${e.skillName})`);
    expect(c.earned).toEqual([{ name: 'Jump the gap', level: 3, parent: 'x:0' }]);
    expect(addEarnedSkill(c, e, 'Another')).toBeNull();
    expect(skillTree(pack, c).some(n => n.name === 'Jump the gap' && n.level === 3)).toBe(true);
  });

  it('new skills need all sixes and a name', () => {
    const c = mk();
    const e = rollSkill(pack, c, who, 'r', [], 0, dice(2))!;
    expect(addEarnedSkill(c, e, 'Nope')).toBeNull();
    const six = rollSkill(pack, c, who, 'r', [], 0, dice(6))!;
    expect(addEarnedSkill(c, six, '   ')).toBeNull();
    expect(addEarnedSkill(c, six, 'Pick locks')).toBe('New skill: Pick locks 2 (from Do anything)');
    // A skill earned from the root can itself be rolled and extended.
    const again = rollSkill(pack, c, who, 'e:0', [], 0, dice(6, 6))!;
    expect(addEarnedSkill(c, again, 'Pick vaults')).toContain('Pick vaults 3');
    expect(c.earned![1]!.parent).toBe('e:0');
  });

  it('applied statuses lower the total and are listed', () => {
    const mp = packs['minimon']!;
    const mctx: CharCtx = { pack: mp, rulesId: 'roll-for-shoes', rng: mulberry32(2), recent: {} };
    const c = newCharacter(mctx);
    const st = Object.keys(c.fields).find(k => mp.flavour?.['roll-for-shoes']?.fields.find(f => f.id === k)?.status);
    if (!st) return;
    c.fields[st] = 'Fire';
    const e = rollSkill(mp, c, who, 'r', [st], 0, dice(4))!;
    expect(e.mod).toBe(-2);
    expect(e.sum).toBe(2);
    expect(e.mods[0]).toMatch(/^-2 /);
    expect(rfsLogText(e)).toContain('(-2) = 2');
  });

  it('resolve recomputes after edits and the log text reads well', () => {
    const e = { dice: [3, 3], mod: 0, gm: [6], spent: 0, xpGiven: false } as unknown as RfsRoll;
    e.skillName = 'Sneak';
    e.level = 2;
    resolve(e);
    expect(rfsLogText(e)).toBe('Sneak 2d6: 3 3 = 6 vs GM 6 → Tie');
    e.dice = [6, 6];
    resolve(e);
    expect(rfsLogText(e)).toBe('Sneak 2d6: 6 6 = 12 vs GM 6 → Success · all sixes');
  });
});
