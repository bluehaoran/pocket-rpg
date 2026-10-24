import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, currentSession } from '../src/lib/db.ts';
import { app, chipText, flush, initSession, MAX_WAIT_MS, mutate, SAVE_DELAY_MS, startNewSession } from '../src/lib/session.svelte.ts';

beforeEach(async () => {
  await db.sessions.clear();
  app.session = undefined;
  app.ready = false;
});
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
const cur = () => app.session;

describe('session store', () => {
  it('creates and saves a default session on first run', async () => {
    await initSession();
    expect(app.ready).toBe(true);
    expect(app.session?.started).toBe(false);
    expect(app.session?.packIds).toEqual(['starfarers']);
    expect(app.session?.rulesId).toBe('lasers-feelings');
    expect((await currentSession())?.id).toBe(app.session?.id);
  });

  it('loads the latest session on later starts', async () => {
    await initSession();
    const id = app.session!.id;
    app.session = undefined;
    await initSession();
    expect(cur()?.id).toBe(id);
    expect(await db.sessions.count()).toBe(1);
  });

  it('debounces saves and writes the last value', async () => {
    await initSession();
    mutate(s => (s.players = 2));
    mutate(s => (s.players = 3));
    expect((await currentSession())?.players).toBe(1);
    await wait(SAVE_DELAY_MS + 150);
    expect((await currentSession())?.players).toBe(3);
  });

  it('saves under constant activity, at most MAX_WAIT_MS after the first change', async () => {
    await initSession();
    const t0 = Date.now();
    let n = 2;
    // A change every 100ms never leaves a 400ms gap, so only the max wait can trigger the save.
    while (Date.now() - t0 < MAX_WAIT_MS + 300) {
      mutate(s => (s.players = n));
      n = n === 4 ? 2 : n + 1;
      await wait(100);
      if ((await currentSession())?.players !== 1) break;
    }
    expect((await currentSession())?.players).not.toBe(1);
    expect(Date.now() - t0).toBeLessThan(MAX_WAIT_MS + 600);
    await flush();
  });

  it('flush saves immediately and cancels the pending save', async () => {
    await initSession();
    mutate(s => (s.players = 4));
    await flush();
    expect((await currentSession())?.players).toBe(4);
    // The cancelled timer must not save a later, unflushed change.
    app.session!.players = 2;
    await wait(SAVE_DELAY_MS + 150);
    expect((await currentSession())?.players).toBe(4);
  });

  it('survives a reload', async () => {
    await initSession();
    mutate(s => (s.answers.q1 = 'a lighthouse'));
    await flush();
    app.session = undefined;
    await initSession();
    expect(cur()?.answers.q1).toBe('a lighthouse');
  });

  it('startNewSession replaces the current session and keeps the old one', async () => {
    await initSession();
    const old = app.session!.id;
    mutate(s => (s.players = 2));
    await startNewSession();
    expect(app.session?.id).not.toBe(old);
    expect(app.session?.players).toBe(1);
    expect((await currentSession())?.id).toBe(app.session?.id);
    expect(await db.sessions.count()).toBe(2);
    expect((await db.sessions.get(old))?.players).toBe(2);
  });

  it('chip shows genre, rules and players', async () => {
    expect(chipText(undefined)).toBe('');
    await initSession();
    expect(chipText(app.session)).toBe(''); // blank during setup
    mutate(s => (s.players = 3));
    expect(chipText(app.session)).toBe('');
    mutate(s => (s.started = true));
    expect(chipText(app.session)).toMatch(/^.+ · L&F · 3 players$/);
    mutate(s => (s.players = 1));
    expect(chipText(app.session)).toMatch(/ · 1 player$/);
  });
});
