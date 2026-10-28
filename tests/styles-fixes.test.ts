// @vitest-environment jsdom
// Intended visual fixes made while decomposing app.css. Each was a latent cascade accident.
import 'fake-indexeddb/auto';
import '../src/app.css';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { newSession, db } from '../src/lib/db.ts';
import { packs } from '../src/lib/content/index.ts';
import { app, initSession } from '../src/lib/session.svelte.ts';
import { charCtx, ensureSetup, startPlay } from '../src/lib/setup.ts';
import { mulberry32 } from '../src/lib/engine/rng.ts';
import { play, resetPlay, setPlayRng } from '../src/lib/play.svelte.ts';
import { resolveFor } from './helpers/styles.ts';
import About from '../src/routes/About.svelte';
import Setup from '../src/routes/track/Setup.svelte';
import Play from '../src/routes/track/Play.svelte';

vi.mock('../content/about.json', () => ({
  default: {
    title: 'About', why: 'why', thanks: 'thanks', contactIntro: 'Contact', contact: 'me', contactUrl: 'https://example.test/c',
    donateIntro: 'Donate', donateLabel: 'PayPal', donateUrl: 'https://example.test/d', donateOffline: 'Needs a connection.'
  }
}));

beforeEach(async () => {
  await db.sessions.clear();
  app.session = undefined;
  await initSession();
  resetPlay();
});
afterEach(cleanup);

describe('About page', () => {
  it('the donate button keeps its own text colour instead of inheriting the page text colour', () => {
    render(About);
    const btn = screen.getByRole('link', { name: 'PayPal' });
    expect(resolveFor(btn).color).toBe('var(--accent-ink)');
  });

  it('is not height-capped or scrolling like the rules sheet body', () => {
    render(About);
    const section = document.querySelector('section.about')!;
    const style = resolveFor(section);
    expect(style['max-height']).toBeUndefined();
    expect(style['overflow-y']).toBeUndefined();
  });

  it('keeps plain-text links in the surrounding colour and paragraphs flush', () => {
    render(About);
    const contact = screen.getByRole('link', { name: 'me' });
    expect(resolveFor(contact).color).toBe('inherit');
    expect(resolveFor(document.querySelector('section.about p')!).margin).toBe('0');
  });
});

describe('Setup "Learn more?" button', () => {
  it('is a flex row pinned to the corner, not a grid with a stray margin', () => {
    render(Setup);
    const learn = screen.getAllByRole('button', { name: /Learn more about/ })[0]!;
    const style = resolveFor(learn);
    expect(style.display).toBe('flex');
    expect(style['margin-top']).toBeUndefined();
    expect(style.position).toBe('absolute');
  });
});

describe('Kintsugi new-skill prompt', () => {
  it('has its own class rather than sharing `.learn` with the Setup button', async () => {
    const s = app.session!;
    Object.assign(s, newSession('kintsugi', 'kintsugi'), { id: s.id, createdAt: s.createdAt });
    ensureSetup(s, charCtx(s, packs['kintsugi']!, mulberry32(1)));
    startPlay(s, 'test');
    play.mode = 'inline';
    setPlayRng({ next: () => (5 - 1 + 0.5) / 6 });
    render(Play);
    await fireEvent.click(screen.getAllByRole('button', { name: /Do Anything/ })[0]!);
    expect(document.querySelector('.learn')).toBeNull();
    const prompt = document.querySelector('.newskill')!;
    expect(prompt).toBeTruthy();
    expect(resolveFor(prompt).display).toBe('grid');
  });
});
