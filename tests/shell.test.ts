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
  it('explains Track and Tools in two columns with arrows instead of buttons', () => {
    render(Welcome);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('PocketRPG');
    const cols = document.querySelectorAll('.welcome-col');
    expect(cols.length).toBe(2);
    expect(cols[0]!.textContent).toContain('Track');
    expect(cols[1]!.textContent).toContain('Tools');
    expect(document.querySelectorAll('.welcome-col svg[aria-hidden="true"]').length).toBe(2);
    expect(screen.queryAllByRole('button').length).toBe(0);
  });

  it('offers to continue when a story is in progress', async () => {
    app.session!.started = true;
    render(Welcome);
    expect(document.body.textContent).toContain('Continue your story');
  });

  it('the toggle is on by default and saves the choice', async () => {
    render(Welcome);
    const toggle = screen.getByRole('switch', { name: 'Show me this when I start' }) as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    expect(hideWelcome()).toBe(false);
    await fireEvent.click(toggle);
    expect(hideWelcome()).toBe(true);
    cleanup();
    render(Welcome);
    expect((screen.getByRole('switch') as HTMLInputElement).checked).toBe(false);
    await fireEvent.click(screen.getByRole('switch'));
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

  it('has no top bar, which only matters once the app is in use', async () => {
    location.hash = '#/welcome';
    render(App);
    await tock();
    expect(document.querySelector('header.top')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull();
    location.hash = '#/track';
    await tock();
    expect(document.querySelector('header.top')).not.toBeNull();
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
