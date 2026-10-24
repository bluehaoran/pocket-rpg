// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { db } from '../src/lib/db.ts';
import { app, initSession } from '../src/lib/session.svelte.ts';
import { hideWelcome, setHideWelcome } from '../src/lib/prefs.ts';
import { maybeShowWelcome } from '../src/lib/startup.ts';
import { router } from '../src/lib/router.svelte.ts';
import App from '../src/App.svelte';
import Welcome from '../src/routes/Welcome.svelte';

const tock = () => new Promise(r => setTimeout(r, 20));

beforeEach(async () => {
  localStorage.clear();
  await db.sessions.clear();
  app.session = undefined;
  app.ready = false;
  await initSession();
  location.hash = '';
  await tock();
});
afterEach(cleanup);

describe('header chip', () => {
  it('is a call to action until play starts, and links to setup', async () => {
    render(App);
    const cta = screen.getByRole('link', { name: 'No story in progress. Click to start' });
    expect(cta.getAttribute('href')).toBe('#/track/setup');
    expect(document.querySelector('.chip:not(.cta)')).toBeNull();
  });

  it('shows genre · rules · players once play has started', async () => {
    render(App);
    app.session!.started = true;
    await tick();
    expect(screen.queryByRole('link', { name: /No story in progress/ })).toBeNull();
    expect(document.querySelector('.chip')?.textContent).toMatch(/^.+ · L&F · 1 player$/);
  });
});

describe('welcome screen', () => {
  it('explains Track and Tools and offers both', async () => {
    render(Welcome);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('PocketRPG');
    expect(document.body.textContent).toContain('Track');
    expect(document.body.textContent).toContain('Tools');
    await fireEvent.click(screen.getByRole('button', { name: 'Open Tools' }));
    expect(location.hash).toBe('#/tools');
    await fireEvent.click(screen.getByRole('button', { name: 'Start a story' }));
    expect(location.hash).toBe('#/track');
  });

  it('offers to continue when a story is in progress', async () => {
    app.session!.started = true;
    render(Welcome);
    expect(screen.getByRole('button', { name: 'Continue your story' })).toBeTruthy();
  });

  it('the checkbox is off by default and saves the choice', async () => {
    render(Welcome);
    const box = screen.getByRole('checkbox', { name: "Don't show this screen on startup" }) as HTMLInputElement;
    expect(box.checked).toBe(false);
    expect(hideWelcome()).toBe(false);
    await fireEvent.click(box);
    expect(hideWelcome()).toBe(true);
    cleanup();
    render(Welcome);
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
    await fireEvent.click(screen.getByRole('checkbox'));
    expect(hideWelcome()).toBe(false);
  });

  it('is reachable from the menu', async () => {
    render(App);
    await fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Welcome' }));
    await tock();
    expect(location.hash).toBe('#/welcome');
    expect(router.route.page).toBe('welcome');
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('PocketRPG');
  });
});

describe('startup', () => {
  it('goes to the welcome screen on a plain launch', async () => {
    expect(maybeShowWelcome()).toBe(true);
    await tock();
    expect(location.hash).toBe('#/welcome');
  });

  it('does not when turned off, or when a specific screen was opened', async () => {
    setHideWelcome(true);
    expect(maybeShowWelcome()).toBe(false);
    expect(location.hash).toBe('');
    setHideWelcome(false);
    location.hash = '#/tools/names';
    await tock();
    expect(maybeShowWelcome()).toBe(false);
    expect(location.hash).toBe('#/tools/names');
  });

  it('does not when a story is in progress', async () => {
    app.session!.started = true;
    expect(maybeShowWelcome()).toBe(false);
    expect(location.hash).toBe('');
  });

  it('works when localStorage is unavailable', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(hideWelcome()).toBe(false);
    expect(() => setHideWelcome(true)).not.toThrow();
    spy.mockRestore();
    set.mockRestore();
  });
});
