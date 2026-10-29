// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { packs } from '../src/lib/content/index.ts';
import { db, newSession } from '../src/lib/db.ts';
import { app, initSession } from '../src/lib/session.svelte.ts';
import { newCharacter } from '../src/lib/characters.ts';
import { charCtx, ensureSetup, startPlay } from '../src/lib/setup.ts';
import { mulberry32, type Rng } from '../src/lib/engine/rng.ts';
import { play, resetPlay, setPlayRng } from '../src/lib/play.svelte.ts';
import Play from '../src/routes/track/Play.svelte';
import CharPage from '../src/routes/track/CharPage.svelte';

const dice = (...faces: number[]): Rng => {
  let i = 0;
  return { next: () => ((faces[i++ % faces.length]! - 1) + 0.5) / 6 };
};

async function begin(packId: string, rulesId: 'lasers-feelings' | 'roll-for-shoes' | 'kintsugi', players = 1, starter?: number) {
  await db.sessions.clear();
  app.session = undefined;
  await initSession();
  const s = app.session!;
  Object.assign(s, newSession(packId, rulesId), { id: s.id, createdAt: s.createdAt });
  s.players = players;
  s.starterSkills = starter;
  ensureSetup(s, charCtx(s, packs[packId]!, mulberry32(1)));
  startPlay(s, 'test');
  s.characters[0]!.fields.name = 'Ada';
}

beforeEach(() => {
  resetPlay();
  play.mode = 'sheet';
  location.hash = '';
});
afterEach(cleanup);
const s = () => app.session!;
const click = (el: HTMLElement) => fireEvent.click(el);
const log = () => s().trackHistory.slice(1); // first entry is "Session started"

describe('Lasers & Feelings in play', () => {
  it('rolling a check shows the sheet, logs once, and Done dismisses it', async () => {
    await begin('starfarers', 'lasers-feelings');
    s().characters[0]!.fields.number = 3;
    setPlayRng(dice(1, 2, 3));
    render(Play);
    await click(screen.getAllByRole('button', { name: /^Lasers/ })[0]!);
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('Ada');
    expect(dialog.querySelectorAll('.die').length).toBeGreaterThanOrEqual(1);
    expect(log()).toHaveLength(1);
    expect(log()[0]).toMatchObject({ kind: 'roll', char: 'Ada' });
    expect(log()[0]!.text).toMatch(/^Lasers \d+d6 under 3: /);
    await click(within(dialog).getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(log()).toHaveLength(1);
  });

  it('bonus dice toggles add dice for one roll, then reset', async () => {
    await begin('starfarers', 'lasers-feelings');
    s().characters[0]!.fields.number = 3;
    const bonus = packs['starfarers']!.flavour!['lasers-feelings']!.dice!.bonuses![0]!;
    setPlayRng(dice(1, 1, 1, 1));
    render(Play);
    await click(screen.getByRole('switch', { name: new RegExp(`\\+${bonus.dice}d ${bonus.label}`) }));
    await click(screen.getAllByRole('button', { name: /^Lasers/ })[0]!);
    expect(s().trackHistory.at(-1)!.text).toMatch(/Lasers 2d6/);
    await click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Done' }));
    await click(screen.getAllByRole('button', { name: /^Lasers/ })[0]!);
    expect(s().trackHistory.at(-1)!.text).toMatch(/Lasers 1d6/);
  });

  it('an exact die shows the exact-number effect', async () => {
    await begin('starfarers', 'lasers-feelings');
    s().characters[0]!.fields.number = 4;
    setPlayRng(dice(4));
    render(Play);
    await click(screen.getAllByRole('button', { name: /^Lasers/ })[0]!);
    const name = packs['starfarers']!.flavour!['lasers-feelings']!.exact!.name!;
    expect(screen.getByRole('dialog').textContent).toContain(name);
  });

  it('resource counters change, clamp, and log', async () => {
    await begin('moon-and-blood', 'lasers-feelings');
    const r = packs['moon-and-blood']!.flavour!['lasers-feelings']!.resources!.find(x => x.states?.length)!;
    render(Play);
    const lose = screen.getAllByRole('button', { name: `Lose 1 ${r.label}` })[0] as HTMLButtonElement;
    await click(lose);
    expect(s().characters[0]!.resources[r.id]).toBe(r.max - 1);
    expect(log().at(-1)).toMatchObject({ kind: 'resource', char: 'Ada' });
    for (let i = 0; i < r.max + 2; i++) if (!lose.disabled) await click(lose);
    expect(s().characters[0]!.resources[r.id]).toBe(0);
    expect(lose.disabled).toBe(true);
    const n = log().length;
    await click(screen.getAllByRole('button', { name: `Gain 1 ${r.label}` })[0]!);
    expect(log()).toHaveLength(n + 1);
  });

  it('the party card links to the character page, which is read-only with full controls', async () => {
    await begin('starfarers', 'lasers-feelings', 2);
    render(Play);
    const link = screen.getAllByRole('link').find(a => a.getAttribute('href') === '#/track/char/1')!;
    expect(link).toBeTruthy();
    cleanup();
    render(CharPage, { idx: 1 });
    expect(screen.getByText('of 2')).toBeTruthy();
    expect(document.body.textContent).not.toContain('Tap any part to change it.');
    expect(document.querySelector('.sentence .part')).toBeNull();
    expect(screen.getAllByRole('button', { name: /^Lasers/ }).length).toBe(1);
  });

  it('story card: rerolling a seed part logs the new story; editing a field logs before → after once', async () => {
    await begin('starfarers', 'lasers-feelings');
    s().seed = { columns: ['a', 'b', 'c', 'd'], text: 'x' };
    const { rollSeed } = await import('../src/lib/setup.ts');
    rollSeed(s(), packs['starfarers']!, mulberry32(2));
    render(Play);
    await click(screen.getAllByRole('button', { name: /^Reroll / })[0]!);
    expect(log().at(-1)).toMatchObject({ kind: 'edit' });
    expect(log().at(-1)!.text).toMatch(/^Story: /);
    const f = packs['starfarers']!.groupFields!.find(x => x.id === 'shipProblem')!;
    const [v0, v1] = packs['starfarers']!.tables[f.table!]!.map(e => e.v);
    s().group[f.id] = v0!;
    await tick();
    await click(screen.getByRole('button', { name: new RegExp(v0!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }));
    const select = screen.getByRole('dialog').querySelector('select') as HTMLSelectElement;
    await fireEvent.change(select, { target: { value: v1 } });
    const before = log().length;
    await click(screen.getByRole('button', { name: 'Done' }));
    expect(log()).toHaveLength(before + 1);
    expect(log().at(-1)!.text).toBe(`${f.label}: ${v0} → ${v1}`);
    // Opening and closing without a change logs nothing.
    await click(screen.getByRole('button', { name: new RegExp(v1!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }));
    await click(screen.getByRole('button', { name: 'Done' }));
    expect(log()).toHaveLength(before + 1);
  });
});

describe('Roll for Shoes in play', () => {
  const rollSkillButton = (name: RegExp | string) => screen.getAllByRole('button', { name }).find(b => /\d+d6/.test(b.textContent ?? ''))!;

  it('opposed roll: a failure gives +1 XP automatically; spending XP can turn it around', async () => {
    await begin('the-heist', 'roll-for-shoes', 1, 1);
    const c = s().characters[0]!;
    c.xp = 2;
    s().gmDice = 1;
    // Skill x:0 is level 2. Dice: 1, 2 for the player, 6 for the GM => lose.
    setPlayRng(dice(1, 2, 6));
    render(Play);
    await click(rollSkillButton(new RegExp(`${c.extra![0]} `)));
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('Fail');
    expect(c.xp).toBe(3);
    expect(log().map(l => l.kind)).toEqual(['roll', 'progress']);
    // 3 XP total, 1 of it from this roll: 2 can be spent. 1,2 -> 6,2 = 8 > 6: success, failure XP refunded.
    await click(within(dialog).getByRole('button', { name: /Spend 1 XP/ }));
    expect(dialog.textContent).toContain('Success');
    expect(c.xp).toBe(1);
    expect(log().map(l => l.text).some(t => t.startsWith('−1 XP'))).toBe(true);
  });

  it('un-opposed roll offers "Failed: +1 XP" once', async () => {
    await begin('the-heist', 'roll-for-shoes');
    const c = s().characters[0]!;
    setPlayRng(dice(2));
    render(Play);
    await click(rollSkillButton(/Do anything/));
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('Total 2');
    await click(within(dialog).getByRole('button', { name: 'Failed: +1 XP' }));
    expect(c.xp).toBe(1);
    expect(within(dialog).queryByRole('button', { name: 'Failed: +1 XP' })).toBeNull();
  });

  it('Accept keeps the roll and its failure XP; Cancel undoes both, and the statuses come back', async () => {
    await begin('minimon', 'roll-for-shoes');
    const c = () => s().characters[0]!;
    setPlayRng(dice(2, 2));
    render(Play);
    await click(screen.getAllByRole('switch').find(b => /^-2 Weak to/.test(b.textContent ?? ''))!);
    const rolled = log().length;
    await click(rollSkillButton(/Do anything/));
    await click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Failed: +1 XP' }));
    expect(c().xp).toBe(1);
    await click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(c().xp ?? 0).toBe(0);
    expect(log()).toHaveLength(rolled);
    expect(Object.values(play.apply[0] ?? {})).toContain(true);
    await click(rollSkillButton(/Do anything/));
    await click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Failed: +1 XP' }));
    await click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Accept' }));
    expect(c().xp).toBe(1);
    expect(log().map(l => l.kind)).toEqual(['roll', 'progress']);
  });

  it('Cancel and Accept each have a roll-again button that keeps the sheet open', async () => {
    await begin('the-heist', 'roll-for-shoes');
    const c = () => s().characters[0]!;
    setPlayRng(dice(2, 3, 4));
    render(Play);
    await click(rollSkillButton(/Do anything/));
    await click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Failed: +1 XP' }));
    await click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel and roll again' }));
    expect(c().xp ?? 0).toBe(0);
    expect(log().map(l => l.kind)).toEqual(['roll']);
    expect(screen.getByRole('dialog').textContent).toContain('Total 3');
    await click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Failed: +1 XP' }));
    await click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Accept and roll again' }));
    expect(c().xp).toBe(1);
    expect(log().map(l => l.kind)).toEqual(['roll', 'progress', 'roll']);
    expect(screen.getByRole('dialog').textContent).toContain('Total 4');
  });

  it('all sixes: name a new skill; it joins the tree under the skill used and is logged', async () => {
    await begin('the-heist', 'roll-for-shoes');
    const c = s().characters[0]!;
    setPlayRng(dice(6));
    render(Play);
    await click(rollSkillButton(/Do anything/));
    await click(screen.getByRole('button', { name: 'Name the new skill' }));
    const add = screen.getByRole('button', { name: 'Add skill' }) as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    await fireEvent.input(screen.getByRole('dialog').querySelector('input')!, { target: { value: 'Pick locks' } });
    await click(add);
    expect(JSON.parse(JSON.stringify(c.earned))).toEqual([{ name: 'Pick locks', level: 2, parent: 'r' }]);
    expect(log().at(-1)).toMatchObject({ kind: 'progress', text: 'New skill: Pick locks 2 (from Do anything)' });
    expect(screen.getByRole('dialog').textContent).toContain('Learned: Pick locks 2');
  });

  it('Opposed by GM is remembered in the session', async () => {
    await begin('the-heist', 'roll-for-shoes');
    render(Play);
    await click(screen.getByRole('button', { name: '3d6' }));
    expect(s().gmDice).toBe(3);
    expect(screen.getByRole('button', { name: '3d6' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('status toggles apply to the next roll only', async () => {
    await begin('minimon', 'roll-for-shoes');
    const c = s().characters[0]!;
    setPlayRng(dice(5));
    render(Play);
    const chip = screen.getAllByRole('switch').find(b => /^-2 Weak to/.test(b.textContent ?? ''))!;
    await click(chip);
    await click(rollSkillButton(/Do anything/));
    expect(s().trackHistory.at(-1)!.text).toContain('(-2)');
    expect(c.xp ?? 0).toBe(0);
    await click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Accept' }));
    expect(play.apply[0]).toEqual({});
  });
});

describe('result placement', () => {
  it('inline shows the result on the card instead of a sheet; page replaces the screen', async () => {
    await begin('starfarers', 'lasers-feelings');
    s().characters[0]!.fields.number = 3;
    setPlayRng(dice(1));
    play.mode = 'inline';
    render(Play);
    await click(screen.getAllByRole('button', { name: /^Lasers/ })[0]!);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.querySelector('.pcard .result')).toBeTruthy();
    await click(screen.getByRole('button', { name: 'Done' }));
    expect(document.querySelector('.pcard .result')).toBeNull();
    cleanup();
    play.mode = 'page';
    render(Play);
    await click(screen.getAllByRole('button', { name: /^Lasers/ })[0]!);
    expect(document.querySelector('.result.big')).toBeTruthy();
    expect(document.querySelector('.pcard')).toBeNull();
  });
});

// Keep the import used even if tests above change.
void newCharacter;

describe('Kintsugi in play', () => {
  const skillButton = (name: RegExp | string) => screen.getAllByRole('button', { name }).find(b => /Roll|\d/.test(b.textContent ?? ''))!;

  it('failing Do Anything teaches a new skill at level 3, named from the roll', async () => {
    await begin('kintsugi', 'kintsugi');
    const c = s().characters[0]!;
    setPlayRng(dice(5));
    render(Play);
    await click(skillButton(/Do Anything/));
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('Failed');
    expect(log().map(l => l.kind)).toEqual(['roll', 'progress']);
    const add = within(dialog).getByRole('button', { name: 'Add skill' }) as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    await fireEvent.input(dialog.querySelector('input')!, { target: { value: 'Kicking' } });
    await click(add);
    expect(JSON.parse(JSON.stringify(c.skills))).toEqual([{ name: 'Kicking', level: 3 }]);
    expect(log().at(-1)).toMatchObject({ kind: 'progress', text: 'New skill: Kicking 3' });
    expect(dialog.textContent).toContain('Learned: Kicking 3');
  });

  it('failing a learned skill raises it; a success changes nothing', async () => {
    await begin('kintsugi', 'kintsugi');
    const c = s().characters[0]!;
    c.skills = [{ name: 'Kicking', level: 3 }];
    setPlayRng(dice(2, 5));
    render(Play);
    await click(skillButton(/Kicking/));
    expect(screen.getByRole('dialog').textContent).toContain('Success');
    expect(c.skills[0]!.level).toBe(3);
    await click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Done' }));
    await click(skillButton(/Kicking/));
    expect(c.skills[0]!.level).toBe(4);
    expect(log().at(-1)!.text).toBe('Kicking 3 → 4 (failed Kicking)');
  });

  it('crossed-out skills cannot be rolled', async () => {
    await begin('kintsugi', 'kintsugi');
    s().characters[0]!.skills = [{ name: 'Kicking', level: 6, out: true }];
    render(Play);
    expect((screen.getAllByRole('button', { name: /Kicking/ })[0] as HTMLButtonElement).disabled).toBe(true);
  });

  it('a full character picks the skill to replace', async () => {
    await begin('kintsugi', 'kintsugi');
    const c = s().characters[0]!;
    c.skills = [{ name: 'A', level: 3 }, { name: 'B', level: 4 }, { name: 'C', level: 5 }];
    setPlayRng(dice(6));
    render(Play);
    await click(skillButton(/Do Anything/));
    const dialog = screen.getByRole('dialog');
    await fireEvent.input(dialog.querySelector('input')!, { target: { value: 'Tracking' } });
    const add = within(dialog).getByRole('button', { name: 'Add skill' }) as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    await click(within(dialog).getByRole('button', { name: 'B 4' }));
    await click(add);
    expect(JSON.parse(JSON.stringify(c.skills.map(k => k.name)))).toEqual(['A', 'Tracking', 'C']);
  });

  it('opposed by the GM: skill is remembered, the die button picks one at random', async () => {
    await begin('kintsugi', 'kintsugi');
    setPlayRng(dice(4, 2, 5, 1));
    render(Play);
    await click(screen.getByRole('button', { name: '3' }));
    expect(s().gmSkill).toBe(3);
    await click(screen.getByRole('button', { name: 'Random GM skill' }));
    expect(s().gmSkill).toBe(4);
    await click(skillButton(/Do Anything/));
    // The random pick used the first value (4); the roll then took the player die (2) and the GM die (5).
    expect(screen.getByRole('dialog').textContent).toContain('GM 4');
  });
});
