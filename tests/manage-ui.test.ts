// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { db, loadEdits } from '../src/lib/db.ts';
import { lists } from '../src/lib/content/index.ts';
import { editsState, updateEdits } from '../src/lib/edits.svelte.ts';
import { hideText } from '../src/lib/edits.ts';
import { exportEdits } from '../src/lib/editsfile.ts';
import { router } from '../src/lib/router.svelte.ts';
import { app, initSession } from '../src/lib/session.svelte.ts';
import App from '../src/App.svelte';
import ManageTools from '../src/routes/ManageTools.svelte';

const tock = () => new Promise(r => setTimeout(r, 20));

beforeEach(async () => {
  localStorage.clear();
  await db.sessions.clear();
  await db.listEdits.clear();
  editsState.map = {};
  app.session = undefined;
  app.ready = false;
  await initSession();
  location.hash = '';
  await tock();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const fileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;
async function chooseFile(text: string) {
  const file = new File([text], 'edits.json', { type: 'application/json' });
  await fireEvent.change(fileInput(), { target: { files: [file] } });
  await tock();
}

describe('menu and overview', () => {
  it('the menu opens Manage Tools', async () => {
    render(App);
    await fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Manage Tools' }));
    await tock();
    expect(location.hash).toBe('#/manage');
    expect(router.route.page).toBe('manage');
    expect(screen.getByRole('heading', { level: 2 }).textContent).toMatch(/Manage/);
  });

  it('lists every tool list with its edit counts', async () => {
    await updateEdits('emotions', e => ({ ...hideText(e, lists.emotions.entries[0]!.v), added: [{ v: 'A', src: 'user' }, { v: 'B', src: 'user' }] }));
    render(ManageTools);
    const link = screen.getByRole('link', { name: /Emotions/ });
    expect(link.getAttribute('href')).toBe('#/manage/emotions');
    expect(link.textContent).toContain('+2 · 1 hidden');
    expect(screen.getByRole('link', { name: /Names/ }).textContent).toContain('Stock');
    expect(document.querySelectorAll('a.gen').length).toBe(Object.keys(lists).length);
  });

  it('Reset all edits needs a second tap', async () => {
    await updateEdits('items', e => hideText(e, lists.items.entries[0]!.v));
    render(ManageTools);
    await fireEvent.click(screen.getByRole('button', { name: 'Reset all edits' }));
    expect(editsState.map.items).toBeDefined();
    await fireEvent.click(screen.getByRole('button', { name: 'Tap again to reset' }));
    await tock();
    expect(editsState.map).toEqual({});
    expect(await loadEdits()).toEqual({});
  });
});

describe('export and import of the edits file', () => {
  it('Export all edits downloads the edits file', async () => {
    await updateEdits('items', e => hideText(e, lists.items.entries[0]!.v));
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((b: Blob) => (blobs.push(b), 'blob:x'));
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(ManageTools);
    await fireEvent.click(screen.getByRole('button', { name: 'Export all edits' }));
    expect(click).toHaveBeenCalled();
    const doc = JSON.parse(await blobs[0]!.text());
    expect(doc).toEqual(JSON.parse(JSON.stringify(exportEdits(editsState.map))));
    expect(doc.version).toBe(1);
  });

  it('shows a summary and writes nothing until Apply', async () => {
    render(ManageTools);
    const v = lists.items.entries[0]!.v;
    await chooseFile(JSON.stringify({ version: 1, lists: { items: { added: [{ v: 'Brand new' }], hidden: [v] }, nope: { added: [], hidden: [] } } }));
    expect(screen.getByRole('status').textContent).toMatch(/1 new/);
    expect(screen.getByRole('status').textContent).toMatch(/1 to hide/);
    expect(screen.getByRole('status').textContent).toMatch(/nope/);
    expect(editsState.map.items).toBeUndefined();
    await fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await tock();
    expect(editsState.map.items.added.map(e => e.v)).toEqual(['Brand new']);
    expect(editsState.map.items.hidden).toEqual([v]);
    expect((await loadEdits()).items.hidden).toEqual([v]);
  });

  it('shows the message for a bad file and offers no Apply', async () => {
    render(ManageTools);
    await chooseFile('{ nope');
    expect(screen.getByRole('alert').textContent).toMatch(/not valid JSON/);
    expect(screen.queryByRole('button', { name: 'Apply' })).toBeNull();
  });
});
