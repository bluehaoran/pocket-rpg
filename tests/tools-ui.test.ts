// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import { db } from '../src/lib/db.ts';
import { app, initSession } from '../src/lib/session.svelte.ts';
import Tools from '../src/routes/Tools.svelte';
import ToolPage from '../src/routes/ToolPage.svelte';

beforeEach(async () => {
  await db.sessions.clear();
  app.session = undefined;
  await initSession();
  location.hash = '';
});
afterEach(cleanup);

describe('Tools hub', () => {
  it('has the title first with a subtitle, and no breadcrumb', () => {
    render(Tools);
    const h = screen.getByRole('heading', { level: 2 });
    expect(h.textContent).toBe('Tools');
    expect(h.nextElementSibling?.textContent).toBe('Game master tools');
    expect(document.querySelector('.toolhead, .back')).toBeNull();
  });

  it('works as a plain toolbox before play starts: no pack generators, no genre defaults', async () => {
    render(Tools);
    expect(app.session!.started).toBe(false);
    expect(screen.queryByText(/ pack$/)).toBeNull();
    expect(screen.getAllByRole('link').filter(a => a.getAttribute('href')?.includes('pack%3A'))).toHaveLength(0);
    const names = screen.getByRole('link', { name: /Names/ });
    expect(names.textContent).not.toMatch(/Sci-fi/);
  });

  it('follows the session pack once play has started', async () => {
    render(Tools);
    app.session!.started = true;
    await tick();
    expect(screen.getByText(/ pack$/)).toBeTruthy();
    expect(screen.getAllByRole('link').some(a => a.getAttribute('href')?.includes('pack%3A'))).toBe(true);
    expect(screen.getByRole('link', { name: /Names/ }).textContent).toMatch(/Sci-fi/);
  });
});

describe('tool page header', () => {
  it('is a "Tools › Name" heading (spacing is CSS) whose Tools part links back', () => {
    render(ToolPage, { toolId: 'names' });
    const h = screen.getByRole('heading', { level: 2 });
    expect(h.textContent).toBe('Tools›Names');
    const link = h.querySelector('a')!;
    expect(link.textContent).toBe('Tools');
    expect(link.getAttribute('href')).toBe('#/tools');
    expect(document.querySelector('.toolhead')).toBeNull();
    expect(document.body.textContent).not.toMatch(/‹ Tools/);
  });

  it('shows the Emoji description under the title', () => {
    render(ToolPage, { toolId: 'emoji' });
    const h = screen.getByRole('heading', { level: 2 });
    expect(h.textContent).toBe('Tools›Emoji');
    expect(h.nextElementSibling?.textContent).toBe('Use this like Story Cubes to inspire your story.');
  });

  it('names default to Any setting before play, and to the genre once started', async () => {
    const { unmount } = render(ToolPage, { toolId: 'names' });
    expect(screen.getByRole('list', { name: 'Setting' }).querySelector('[aria-pressed="true"]')?.textContent).toBe('Any');
    unmount();
    app.session!.started = true;
    await tick();
    render(ToolPage, { toolId: 'names' });
    expect(screen.getByRole('list', { name: 'Setting' }).querySelector('[aria-pressed="true"]')?.textContent).toBe('Sci-fi');
  });
});
