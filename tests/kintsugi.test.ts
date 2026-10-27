import { describe, expect, it } from 'vitest';
import { packs } from '../src/lib/content/index.ts';
import type { Character } from '../src/lib/db.ts';
import type { Rng } from '../src/lib/engine/rng.ts';
import { mulberry32 } from '../src/lib/engine/rng.ts';
import { kinFlavour, newCharacter, type CharCtx } from '../src/lib/characters.ts';
import {
  applyFail, isFull, kinLogText, kinSkills, learnSkill, resolve, rollSkill, type KinRoll
} from '../src/lib/rules/kintsugi.ts';
import { nativeFor } from '../src/lib/setup.ts';

/** An Rng that makes rollDie(6) return the given faces in order. */
const dice = (...faces: number[]): Rng => {
  let i = 0;
  return { next: () => ((faces[i++ % faces.length]! - 1) + 0.5) / 6 };
};
const who = { ci: 0, name: 'Lauren' };
const pack = packs['kintsugi']!;
const f = kinFlavour(pack);
const char = (skills: Character['skills'] = []): Character => ({ id: 'c', fields: {}, resources: {}, skills });

describe('Kintsugi pack', () => {
  it('is the native pack of the kintsugi rules, with the PDF story lists', () => {
    expect(nativeFor(Object.values(packs), 'kintsugi').map(p => p.id)).toEqual(['kintsugi']);
    expect(pack.seed!.columns.map(c => pack.tables[c.table]!.length)).toEqual([3, 6, 6, 6]);
    expect(pack.tables['kin.group']!.map(e => e.v)).toEqual(['Magical Golems', 'Mutants', 'Robots']);
  });
});

describe('Kintsugi characters', () => {
  const ctx: CharCtx = { pack, rulesId: 'kintsugi', rng: mulberry32(1), recent: {} };

  it('start with Do Anything (2) and no learned skills', () => {
    const c = newCharacter(ctx);
    expect(c.skills).toEqual([]);
    expect(c.xp).toBeUndefined();
    expect(kinSkills(f, c)).toEqual([{ key: 'r', name: 'Do Anything', level: 2, root: true }]);
    expect(typeof c.fields.name).toBe('string');
  });
});

describe('Kintsugi rolls', () => {
  it('a die at or under the skill succeeds', () => {
    expect(rollSkill(f, char(), who, 'r', 0, dice(2))!.result).toBe('win');
    expect(rollSkill(f, char(), who, 'r', 0, dice(3))!.result).toBe('lose');
    expect(rollSkill(f, char([{ name: 'Kicking', level: 3 }]), who, 's:0', 0, dice(3))!.text).toBe('Success');
  });

  it('opposed: higher total wins, rolling the GM die after the player die', () => {
    const e = rollSkill(f, char(), who, 'r', 3, dice(4, 2))!;
    expect([e.total, e.gmTotal, e.result]).toEqual([6, 5, 'win']);
    expect(rollSkill(f, char(), who, 'r', 3, dice(1, 5))!.result).toBe('lose');
  });

  it('opposed ties go to the higher skill, then the higher die, else stay tied', () => {
    // 2 + 4 = 6 vs 3 + 3 = 6: the GM skill is higher.
    expect(rollSkill(f, char(), who, 'r', 3, dice(4, 3))!.result).toBe('lose');
    // 3 + 3 = 6 vs 2 + 4 = 6: the player skill is higher.
    expect(rollSkill(f, char([{ name: 'Kicking', level: 3 }]), who, 's:0', 2, dice(3, 4))!.result).toBe('win');
    // Same skill, higher die decides.
    const hi = rollSkill(f, char(), who, 'r', 2, dice(5, 2))!;
    expect(hi.result).toBe('win');
    const tie: KinRoll = { ...hi, die: 3, gm: { skill: 2, die: 3 } };
    resolve(tie);
    expect(tie.result).toBe('tie');
    expect(tie.text).toBe('Tie');
  });

  it('cannot roll a crossed-out or missing skill', () => {
    const c = char([{ name: 'Kicking', level: 6, out: true }]);
    expect(rollSkill(f, c, who, 's:0', 0, dice(1))).toBeNull();
    expect(rollSkill(f, c, who, 's:4', 0, dice(1))).toBeNull();
  });

  it('log text shows the dice and the result', () => {
    expect(kinLogText(rollSkill(f, char(), who, 'r', 0, dice(5))!)).toBe('Do Anything 2: 5 vs 2 → Failed');
    expect(kinLogText(rollSkill(f, char(), who, 'r', 3, dice(4, 2))!)).toBe('Do Anything 2: 4 + 2 = 6 vs GM 2 + 3 = 5 → Success');
  });
});

describe('Kintsugi failing', () => {
  it('a passed or tied roll gives nothing', () => {
    const c = char([{ name: 'Kicking', level: 3 }]);
    expect(applyFail(c, rollSkill(f, c, who, 's:0', 0, dice(2))!)).toBeNull();
    const e = rollSkill(f, c, who, 's:0', 0, dice(2))!;
    e.result = 'tie';
    expect(applyFail(c, e)).toBeNull();
    expect(c.skills![0]!.level).toBe(3);
  });

  it('failing a learned skill raises it by one, once', () => {
    const c = char([{ name: 'Kicking', level: 3 }]);
    const e = rollSkill(f, c, who, 's:0', 0, dice(5))!;
    expect(applyFail(c, e)).toBe('Kicking 3 → 4 (failed Kicking)');
    expect(applyFail(c, e)).toBeNull();
    expect(c.skills![0]).toEqual({ name: 'Kicking', level: 4 });
    expect(e.grew).toBe('Kicking 3 → 4');
  });

  it('a skill that reaches 6 is crossed out', () => {
    const c = char([{ name: 'Kicking', level: 5 }]);
    const e = rollSkill(f, c, who, 's:0', 0, dice(6))!;
    expect(applyFail(c, e)).toMatch(/crossed out/);
    expect(c.skills![0]).toEqual({ name: 'Kicking', level: 6, out: true });
    expect(kinSkills(f, c)[1]!.out).toBe(true);
  });

  it('failing an opposed roll counts too', () => {
    const c = char([{ name: 'Kicking', level: 3 }]);
    const e = rollSkill(f, c, who, 's:0', 4, dice(1, 6))!;
    expect(e.result).toBe('lose');
    applyFail(c, e);
    expect(c.skills![0]!.level).toBe(4);
  });

  it('failing Do Anything waits for a new skill at level 3', () => {
    const c = char();
    const e = rollSkill(f, c, who, 'r', 0, dice(6))!;
    expect(applyFail(c, e)).toBe('Failed Do Anything: learn a new skill');
    expect(e.needsSkill).toBe(true);
    expect(learnSkill(f, c, e, '  Kicking ')).toBe('New skill: Kicking 3');
    expect(c.skills).toEqual([{ name: 'Kicking', level: 3 }]);
    expect(e.needsSkill).toBe(false);
    expect(learnSkill(f, c, e, 'Again')).toBeNull();
  });

  it('a character with three skills replaces one', () => {
    const c = char([{ name: 'A', level: 3 }, { name: 'B', level: 6, out: true }, { name: 'C', level: 4 }]);
    expect(isFull(f, c)).toBe(true);
    const e = rollSkill(f, c, who, 'r', 0, dice(6))!;
    applyFail(c, e);
    expect(learnSkill(f, c, e, 'Tracking')).toBeNull();
    expect(learnSkill(f, c, e, 'Tracking', 1)).toBe('New skill: Tracking 3, replacing B');
    expect(c.skills).toEqual([{ name: 'A', level: 3 }, { name: 'Tracking', level: 3 }, { name: 'C', level: 4 }]);
  });

  it('a blank name learns nothing', () => {
    const c = char();
    const e = rollSkill(f, c, who, 'r', 0, dice(6))!;
    applyFail(c, e);
    expect(learnSkill(f, c, e, '   ')).toBeNull();
    expect(e.needsSkill).toBe(true);
  });
});
