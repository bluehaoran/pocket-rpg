// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../src/lib/db.ts';
import { app, initSession } from '../src/lib/session.svelte.ts';
import { mulberry32 } from '../src/lib/engine/rng.ts';
import { createToolRun } from '../src/lib/toolrun.svelte.ts';

beforeEach(async () => {
  await db.sessions.clear();
  app.session = undefined;
  await initSession();
  const r = mulberry32(11);
  vi.spyOn(Math, 'random').mockImplementation(() => r.next());
});

describe('createToolRun', () => {
  it('finds the tool and starts with no result', () => {
    const run = createToolRun(() => 'dice');
    expect(run.tool?.id).toBe('dice');
    expect(run.result).toBeNull();
    expect(run.rolls).toBe(0);
    expect(createToolRun(() => 'nope').tool).toBeUndefined();
  });

  it('roll() produces a result and counts the roll; setOpt() stores the option and rerolls', () => {
    const run = createToolRun(() => 'dice');
    run.roll();
    expect(run.result?.kind).toBe('dice');
    expect(run.rolls).toBe(1);
    run.setOpt('count', 3);
    expect(app.session!.toolModifiers.dice).toMatchObject({ count: 3 });
    expect(run.result?.kind === 'dice' && run.result.dice).toHaveLength(3);
    expect(run.rolls).toBe(2);
    run.setOpt('type', 8, false);
    expect(run.rolls).toBe(2);
    expect(run.dice).toMatchObject({ count: 3, type: 8 });
  });

  it('keep() logs the shown result once and finish() keeps it then goes back to the hub', () => {
    const run = createToolRun(() => 'items');
    run.roll();
    const text = run.result!.text;
    run.keep();
    run.keep();
    expect(app.session!.toolHistory).toHaveLength(1);
    expect(app.session!.toolHistory[0]).toMatchObject({ tool: 'items', label: 'Items', text });
    run.finish();
    expect(app.session!.toolHistory).toHaveLength(1);
    expect(location.hash).toBe('#/tools');
  });

  it('keep() does nothing before there is a result', () => {
    const run = createToolRun(() => 'items');
    run.keep();
    expect(app.session!.toolHistory).toHaveLength(0);
  });

  it('follow-ups: setFollow draws or clears without touching the main result, rerollFollow replaces the draw', () => {
    const run = createToolRun(() => 'names');
    run.roll();
    const main = run.result!.text;
    expect(run.followUp).toBeNull();
    run.setFollow(true);
    expect(run.followUp).toBeTruthy();
    expect(run.result!.text).toBe(main);
    const first = run.followUp;
    run.rerollFollow();
    expect(run.followUp).toBeTruthy();
    expect(run.followUp).not.toBe(first);
    run.setFollow(false);
    expect(run.followUp).toBeNull();
    expect(run.result!.text).toBe(main);
  });

  it('a reroll with the follow-up on draws a fresh one; with it off, clears it', () => {
    const run = createToolRun(() => 'names');
    run.roll();
    run.setFollow(true);
    run.roll();
    expect(run.followUp).toBeTruthy();
    run.setFollow(false);
    run.roll();
    expect(run.followUp).toBeNull();
  });

  it('derives the page flags from the tool', () => {
    const names = createToolRun(() => 'names');
    expect(names.hasToggles).toBe(true);
    expect(names.empty).toBe(false);
    expect([...names.haveLetters].length).toBeGreaterThan(0);
    expect(createToolRun(() => 'dice').hasToggles).toBe(false);
  });
});
