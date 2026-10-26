// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { packs } from '../src/lib/content/index.ts';
import { db } from '../src/lib/db.ts';
import { app, initSession } from '../src/lib/session.svelte.ts';
import Setup from '../src/routes/track/Setup.svelte';
import Story from '../src/routes/track/Story.svelte';
import Players from '../src/routes/track/Players.svelte';

beforeEach(async () => {
  await db.sessions.clear();
  app.session = undefined;
  await initSession();
  location.hash = '';
});
afterEach(cleanup);
const s = () => app.session!;
const click = (el: HTMLElement) => fireEvent.click(el);

describe('step 1: setup', () => {
  it('switching rule system moves to that system\'s first pack', async () => {
    render(Setup);
    await click(screen.getByRole('button', { name: /^Roll for Shoes/ }));
    expect(s().rulesId).toBe('roll-for-shoes');
    expect(s().packIds[0]).toBe('the-heist');
    expect(screen.getByText('Starting skills per character')).toBeTruthy();
    expect(document.body.textContent).toContain('Based on');
  });

  it('the ? beside each rule system opens its official blurb with credit, without selecting it', async () => {
    render(Setup);
    await click(screen.getByRole('button', { name: 'About Roll for Shoes' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/evolving skill tree/)).toBeTruthy();
    expect(within(dialog).getByRole('link', { name: /Ben Wray/ })).toBeTruthy();
    expect(s().rulesId).toBe('lasers-feelings');
    await click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    await click(screen.getByRole('button', { name: 'About Lasers & Feelings' }));
    expect(within(screen.getByRole('dialog')).getByRole('link', { name: /John Harper/ })).toBeTruthy();
  });

  it('the picker sheet changes the pack and resets story state', async () => {
    render(Setup);
    s().answers = { x: 'y' };
    await click(screen.getByRole('button', { name: /tap to change/ }));
    const dialog = screen.getByRole('dialog');
    await click(within(dialog).getByRole('button', { name: /Fantasy/ }));
    expect(s().packIds).toEqual(['swords-and-sorcery']);
    expect(s().answers).toEqual({});
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('players stepper stays within 1 to 4', async () => {
    render(Setup);
    const more = screen.getByRole('button', { name: 'Increase players' }) as HTMLButtonElement;
    for (let i = 0; i < 6; i++) await click(more);
    expect(s().players).toBe(4);
    expect(more.disabled).toBe(true);
    const less = screen.getByRole('button', { name: 'Decrease players' }) as HTMLButtonElement;
    for (let i = 0; i < 6; i++) await click(less);
    expect(s().players).toBe(1);
    expect(less.disabled).toBe(true);
  });

  it('starting skills stepper (Roll for Shoes) is stored', async () => {
    render(Setup);
    await click(screen.getByRole('button', { name: /^Roll for Shoes/ }));
    await click(screen.getByRole('button', { name: 'Increase starting skills' }));
    await click(screen.getByRole('button', { name: 'Increase starting skills' }));
    expect(s().starterSkills).toBe(2);
    expect(document.body.textContent).toContain('2 level-2 skills');
  });

  it('Story → goes to the story step', async () => {
    render(Setup);
    await click(screen.getByRole('button', { name: /Story/ }));
    expect(location.hash).toBe('#/track/story');
  });
});

describe('step 2: story', () => {
  it('rolls the seed on open; tapping a part rerolls only that part', async () => {
    render(Story);
    const seed = s().seed!;
    expect(seed.columns.length).toBe(packs['starfarers']!.seed!.columns.length);
    expect(seed.text).not.toMatch(/\{/);
    const part = screen.getAllByRole('button', { name: /^Reroll / })[1]!;
    const before = [...seed.columns];
    await click(part);
    const after = s().seed!.columns;
    expect(after[1]).not.toBe(before[1]);
    expect(after.filter((_, i) => i !== 1)).toEqual(before.filter((_, i) => i !== 1));
  });

  it('Advanced shows a row per column and Roll all rerolls', async () => {
    render(Story);
    await click(screen.getByRole('tab', { name: 'Advanced' }));
    const rows = document.querySelectorAll('.col');
    expect(rows.length).toBe(4);
    const before = JSON.stringify(s().seed);
    await click(screen.getByRole('button', { name: 'Roll all' }));
    expect(JSON.stringify(s().seed)).not.toBe(before);
  });

  it('group fields are filled and editable through a sheet', async () => {
    render(Story);
    const f = packs['starfarers']!.groupFields![0]!;
    expect(s().group[f.id]).not.toBeUndefined();
    await click(screen.getByRole('button', { name: new RegExp(f.label.replace(/\(.*\)/, '').trim()) }));
    const input = screen.getByRole('dialog').querySelector('input, select') as HTMLInputElement;
    expect(input).toBeTruthy();
    if (input.tagName === 'INPUT') {
      await fireEvent.input(input, { target: { value: 'Rusty Gull' } });
      expect(s().group[f.id]).toBe('Rusty Gull');
    }
  });

  it('Roll for Shoes: premise, questions with typed answers, and the scene outline', async () => {
    mutateToHeist();
    render(Story);
    const q = packs['the-heist']!.story!.questions![0]!;
    await click(screen.getByRole('button', { name: new RegExp(q.text.slice(0, 20)) }));
    const input = screen.getByRole('dialog').querySelector('input') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'The Star of Cairo' } });
    expect(s().answers[q.id]).toBe('The Star of Cairo');
    expect(document.querySelectorAll('.outline li').length).toBe(packs['the-heist']!.story!.segments!.length);
  });
});

function mutateToHeist() {
  s().rulesId = 'roll-for-shoes';
  s().packIds = ['the-heist'];
}

describe('step 3: players', () => {
  it('creates a character per player and starts play', async () => {
    s().players = 3;
    render(Players);
    expect(s().characters).toHaveLength(3);
    expect(screen.getByText('of 3')).toBeTruthy();
    await click(screen.getByRole('button', { name: 'Next player' }));
    expect(document.body.textContent).toContain('Tap any part to change it.');
    await click(screen.getByRole('button', { name: 'Start play' }));
    expect(s().started).toBe(true);
    expect(s().trackHistory[0]?.text).toMatch(/^Session started · .+ · 3 players$/);
    expect(location.hash).toBe('#/track');
  });

  it('editing a field in the sheet changes the character; Roll all rerolls the current one', async () => {
    render(Players);
    const name = s().characters[0]!.fields.name as string;
    await click(screen.getByRole('button', { name }));
    const input = screen.getByRole('dialog').querySelector('input') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'Zed' } });
    expect(s().characters[0]!.fields.name).toBe('Zed');
    await click(screen.getByRole('button', { name: 'Done' }));
    const before = JSON.stringify(s().characters[0]!.fields);
    await click(screen.getByRole('button', { name: 'Roll all' }));
    expect(JSON.stringify(s().characters[0]!.fields)).not.toBe(before);
  });

  it('the number sheet picks within range and updates the bar', async () => {
    render(Players);
    await click(screen.getByRole('button', { name: /Change number/ }));
    const dialog = screen.getByRole('dialog');
    await click(within(dialog).getByRole('button', { name: '4' }));
    expect(s().characters[0]!.fields.number).toBe(4);
    expect(dialog.textContent).toMatch(/roll under 4/);
  });

  it('Roll for Shoes shows XP, skills, and the starting skills picked in setup', async () => {
    mutateToHeist();
    s().starterSkills = 2;
    render(Players);
    expect(s().characters[0]!.extra).toHaveLength(2);
    expect(document.body.textContent).toContain('Do anything');
    const skills = document.querySelectorAll('.skill');
    expect(skills.length).toBe(3);
    expect(document.body.textContent).toMatch(/XP\s*0/);
  });

  it('Minimon shows a status for its weakness', async () => {
    s().rulesId = 'roll-for-shoes';
    s().packIds = ['minimon'];
    render(Players);
    expect(document.querySelector('.skill.status')).toBeTruthy();
    expect(document.body.textContent).toMatch(/Weak to/);
  });
});
