// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { db, loadEdits } from '../src/lib/db.ts';
import { lists } from '../src/lib/content/index.ts';
import { editsState, updateEdits } from '../src/lib/edits.svelte.ts';
import { downloadJson } from '../src/lib/device.ts';
import { hideText } from '../src/lib/edits.ts';
import { exportEdits } from '../src/lib/editsfile.ts';
import { router } from '../src/lib/router.svelte.ts';
import { app, initSession } from '../src/lib/session.svelte.ts';
import App from '../src/App.svelte';
import ToolPage from '../src/routes/ToolPage.svelte';
import Tools from '../src/routes/Tools.svelte';
import AddEntrySheet from '../src/components/AddEntrySheet.svelte';
import ImportSheet from '../src/components/ImportSheet.svelte';
import { exampleJson, exampleText } from '../src/lib/importer.ts';
import ManageList from '../src/routes/ManageList.svelte';
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
    await updateEdits('emotions', e => ({ ...hideText(e, lists.emotions!.entries[0]!.v), added: [{ v: 'A', src: 'user' }, { v: 'B', src: 'user' }] }));
    render(ManageTools);
    const link = screen.getByRole('link', { name: /Emotions/ });
    expect(link.getAttribute('href')).toBe('#/manage/emotions');
    expect(link.textContent).toContain('+2 · 1 hidden');
    expect(screen.getByRole('link', { name: /Names/ }).textContent).toContain('Stock');
    expect(document.querySelectorAll('a.gen').length).toBe(Object.keys(lists).length);
  });

  it('Reset all edits needs a second tap', async () => {
    await updateEdits('items', e => hideText(e, lists.items!.entries[0]!.v));
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
    await updateEdits('items', e => hideText(e, lists.items!.entries[0]!.v));
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
    const v = lists.items!.entries[0]!.v;
    await chooseFile(JSON.stringify({ version: 1, lists: { items: { added: [{ v: 'Brand new' }], hidden: [v] }, nope: { added: [], hidden: [] } } }));
    expect(screen.getByRole('status').textContent).toMatch(/1 new/);
    expect(screen.getByRole('status').textContent).toMatch(/1 to hide/);
    expect(screen.getByRole('status').textContent).toMatch(/nope/);
    expect(editsState.map.items).toBeUndefined();
    await fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await tock();
    expect(editsState.map.items!.added.map(e => e.v)).toEqual(['Brand new']);
    expect(editsState.map.items!.hidden).toEqual([v]);
    expect((await loadEdits()).items!.hidden).toEqual([v]);
  });

  it('shows the message for a bad file and offers no Apply', async () => {
    render(ManageTools);
    await chooseFile('{ nope');
    expect(screen.getByRole('alert').textContent).toMatch(/not valid JSON/);
    expect(screen.queryByRole('button', { name: 'Apply' })).toBeNull();
  });
});

describe('list screen', () => {
  const emotions = () => lists.emotions!.entries.map(e => e.v);
  const first = () => emotions()[0]!;
  const rows = () => [...document.querySelectorAll('li.mrow')];

  it('shows my entries first with a badge and delete, then stock entries with Hide', async () => {
    await updateEdits('emotions', e => ({ ...e, added: [{ v: 'Zzzest', src: 'user' }] }));
    render(ManageList, { listId: 'emotions' });
    expect(rows()[0]!.textContent).toContain('Zzzest');
    expect(rows()[0]!.textContent).toContain('mine');
    expect(screen.getByRole('button', { name: 'Delete Zzzest' })).toBeTruthy();
    expect(screen.getByRole('button', { name: `Hide ${first()}` })).toBeTruthy();
    expect(rows().length).toBe(1 + new Set(emotions()).size);
  });

  it('Hide persists and turns into Unhide; Unhide restores', async () => {
    render(ManageList, { listId: 'emotions' });
    await fireEvent.click(screen.getByRole('button', { name: `Hide ${first()}` }));
    await tock();
    expect(editsState.map.emotions!.hidden).toEqual([first()]);
    expect((await loadEdits()).emotions!.hidden).toEqual([first()]);
    await fireEvent.click(screen.getByRole('button', { name: `Unhide ${first()}` }));
    await tock();
    expect(editsState.map.emotions!.hidden).toEqual([]);
  });

  it('deleting my entry removes it', async () => {
    await updateEdits('emotions', e => ({ ...e, added: [{ v: 'Zzzest', src: 'user' }] }));
    render(ManageList, { listId: 'emotions' });
    await fireEvent.click(screen.getByRole('button', { name: 'Delete Zzzest' }));
    await tock();
    expect(editsState.map.emotions!.added).toEqual([]);
    expect(screen.queryByText('Zzzest')).toBeNull();
  });

  it('filters All / Mine / Hidden', async () => {
    await updateEdits('emotions', e => ({ ...hideText(e, first()), added: [{ v: 'Zzzest', src: 'user' }] }));
    render(ManageList, { listId: 'emotions' });
    await fireEvent.click(screen.getByRole('button', { name: 'Mine' }));
    expect(rows().map(r => r.textContent)).toEqual([expect.stringContaining('Zzzest')]);
    await fireEvent.click(screen.getByRole('button', { name: 'Hidden' }));
    expect(rows().length).toBe(1);
    expect(rows()[0]!.textContent).toContain(first());
    await fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(rows().length).toBeGreaterThan(2);
  });

  it('searches case-insensitively on the text', async () => {
    render(ManageList, { listId: 'emotions' });
    const term = first().toUpperCase().slice(0, 3);
    await fireEvent.input(screen.getByRole('searchbox', { name: 'Search' }), { target: { value: term } });
    expect(rows().length).toBeGreaterThan(0);
    expect(rows().every(r => r.textContent!.toLowerCase().includes(term.toLowerCase()))).toBe(true);
    await fireEvent.input(screen.getByRole('searchbox', { name: 'Search' }), { target: { value: 'qqqqqqqq' } });
    expect(rows().length).toBe(0);
    expect(document.body.textContent).toContain('Nothing matches');
  });

  it('caps a long list at 100 rows until Show more', async () => {
    render(ManageList, { listId: 'names' });
    expect(rows().length).toBe(100);
    await fireEvent.click(screen.getByRole('button', { name: /Show more/ }));
    expect(rows().length).toBeGreaterThan(100);
  });

  it('says so for an unknown list, with a way back', () => {
    render(ManageList, { listId: 'nope' });
    expect(document.body.textContent).toContain('No such list');
    expect(screen.getByRole('link', { name: /Manage/ }).getAttribute('href')).toBe('#/manage');
  });

  it('Export this list downloads only this list', async () => {
    await updateEdits('emotions', e => hideText(e, first()));
    await updateEdits('items', e => hideText(e, lists.items!.entries[0]!.v));
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((b: Blob) => (blobs.push(b), 'blob:x'));
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(ManageList, { listId: 'emotions' });
    await fireEvent.click(screen.getByRole('button', { name: 'Export this list' }));
    expect(Object.keys(JSON.parse(await blobs[0]!.text()).lists)).toEqual(['emotions']);
  });
});

describe('a list with every stock entry hidden', () => {
  const hideAll = () => updateEdits('emotions', e => lists.emotions!.entries.reduce((acc, x) => hideText(acc, x.v), e));

  it('the tool page says the entries are hidden and links to Manage Tools, not to the JSON file', async () => {
    await hideAll();
    render(ToolPage, { toolId: 'emotions' });
    expect(document.body.textContent).toMatch(/All entries are hidden/);
    expect(document.body.textContent).not.toMatch(/content\/tools/);
    expect(screen.getByRole('link', { name: /Manage Tools/ }).getAttribute('href')).toBe('#/manage/emotions');
  });

  it('the hub tile says All hidden', async () => {
    await hideAll();
    render(Tools);
    expect(screen.getByRole('link', { name: /Emotions/ }).textContent).toContain('All hidden');
  });

  it('a list that is empty in the bundled JSON keeps the developer message', () => {
    render(ToolPage, { toolId: 'tilt' });
    expect(document.body.textContent).toMatch(/content\/tools\/tilts\.json/);
    expect(document.body.textContent).not.toMatch(/All entries are hidden/);
  });
});

describe('export', () => {
  it('keeps the blob URL alive until the download has started', async () => {
    vi.useFakeTimers();
    try {
      URL.createObjectURL = vi.fn(() => 'blob:x');
      const revoke = (URL.revokeObjectURL = vi.fn());
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      downloadJson('x.json', {});
      expect(revoke).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1500);
      expect(revoke).toHaveBeenCalledWith('blob:x');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('add entry sheet', () => {
  const groups = lists.tilts!.modifiers.group!.values;
  const type = (text: string) => fireEvent.input(screen.getByRole('textbox', { name: 'Text' }), { target: { value: text } });

  it('offers the list\'s own tag values and saves the chosen one', async () => {
    const onclose = vi.fn();
    render(AddEntrySheet, { list: lists.tilts!, onclose });
    for (const g of groups) expect(screen.getByRole('button', { name: g })).toBeTruthy();
    await type('  Sudden gale ');
    await fireEvent.click(screen.getByRole('button', { name: groups[1]! }));
    await fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await tock();
    expect(editsState.map.tilts!.added).toEqual([{ v: 'Sudden gale', tags: { group: groups[1] }, src: 'user' }]);
    expect((await loadEdits()).tilts!.added).toHaveLength(1);
    expect(onclose).toHaveBeenCalled();
  });

  it('Add and another keeps the sheet open and clears the text', async () => {
    const onclose = vi.fn();
    render(AddEntrySheet, { list: lists.tilts!, onclose });
    await type('One');
    await fireEvent.click(screen.getByRole('button', { name: 'Add and another' }));
    await tock();
    expect(onclose).not.toHaveBeenCalled();
    expect((screen.getByRole('textbox', { name: 'Text' }) as HTMLInputElement).value).toBe('');
    expect(editsState.map.tilts!.added.map(e => e.v)).toEqual(['One']);
  });

  it('cannot add blank text', async () => {
    render(AddEntrySheet, { list: lists.tilts!, onclose: vi.fn() });
    expect((screen.getByRole('button', { name: 'Add' }) as HTMLButtonElement).disabled).toBe(true);
    await type('   ');
    expect((screen.getByRole('button', { name: 'Add' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('refuses a duplicate with a message and adds nothing', async () => {
    render(AddEntrySheet, { list: lists.tilts!, onclose: vi.fn() });
    await type('Twice');
    await fireEvent.click(screen.getByRole('button', { name: 'Add and another' }));
    await tock();
    await type('Twice');
    await fireEvent.click(screen.getByRole('button', { name: 'Add and another' }));
    await tock();
    expect(screen.getByRole('alert').textContent).toMatch(/already in this list/i);
    expect(editsState.map.tilts!.added).toHaveLength(1);
  });

  it('adds an untagged entry when no tag is chosen, and a tag can be unchosen', async () => {
    render(AddEntrySheet, { list: lists.tilts!, onclose: vi.fn() });
    await type('Plain');
    await fireEvent.click(screen.getByRole('button', { name: groups[0]! }));
    await fireEvent.click(screen.getByRole('button', { name: groups[0]! }));
    await fireEvent.click(screen.getByRole('button', { name: 'Add and another' }));
    await tock();
    expect(editsState.map.tilts!.added).toEqual([{ v: 'Plain', src: 'user' }]);
  });

  it('shows only the text field for a list with no tags', () => {
    render(AddEntrySheet, { list: { ...lists.items!, modifiers: {} }, onclose: vi.fn() });
    expect(document.querySelector('ul.chips')).toBeNull();
  });

  it('opens from the list screen', async () => {
    render(ManageList, { listId: 'tilts' });
    await fireEvent.click(screen.getByRole('button', { name: 'Add entry' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Text' })).toBeTruthy();
  });
});

describe('import sheet', () => {
  const groups = lists.tilts!.modifiers.group!.values;
  const paste = (text: string) => fireEvent.input(screen.getByRole('textbox', { name: 'Paste text' }), { target: { value: text } });
  const status = () => screen.getByRole('status').textContent ?? '';
  const importBtn = (n: number) => screen.getByRole('button', { name: `Import ${n}` }) as HTMLButtonElement;

  it('previews pasted JSON and saves nothing until Import is tapped', async () => {
    const onclose = vi.fn();
    render(ImportSheet, { list: lists.tilts!, onclose });
    await paste(JSON.stringify([{ v: 'A bell tolls', tags: { group: groups[1] } }, { v: 'Fog' }]));
    expect(status()).toMatch(/2 new/);
    expect(editsState.map.tilts).toBeUndefined();
    await fireEvent.click(importBtn(2));
    await tock();
    expect(editsState.map.tilts!.added.map(e => e.v)).toEqual(['A bell tolls', 'Fog']);
    expect(editsState.map.tilts!.added[0]!.src).toBe('user');
    expect(onclose).toHaveBeenCalled();
  });

  it('applies the chosen tag to every line of plain text', async () => {
    render(ImportSheet, { list: lists.tilts!, onclose: vi.fn() });
    await fireEvent.click(screen.getByRole('button', { name: groups[0]! }));
    await paste('One\n\n  Two  \n');
    await fireEvent.click(importBtn(2));
    await tock();
    expect(editsState.map.tilts!.added.map(e => [e.v, e.tags])).toEqual([['One', { group: groups[0] }], ['Two', { group: groups[0] }]]);
  });

  it('counts entries already there and cannot import them again', async () => {
    await updateEdits('tilts', e => ({ ...e, added: [{ v: 'Fog', src: 'user' }] }));
    render(ImportSheet, { list: lists.tilts!, onclose: vi.fn() });
    await paste('Fog');
    expect(status()).toMatch(/0 new, 1 already there/);
    expect(screen.getByRole('button', { name: 'Import 0' })).toHaveProperty('disabled', true);
  });

  it('lists invalid entries with the reason and still imports the valid ones', async () => {
    render(ImportSheet, { list: lists.tilts!, onclose: vi.fn() });
    await paste(JSON.stringify([{ v: 'Good' }, { v: 'Bad', tags: { group: 'Nope' } }]));
    expect(status()).toMatch(/1 new/);
    expect(status()).toMatch(/Nope/);
    await fireEvent.click(importBtn(1));
    await tock();
    expect(editsState.map.tilts!.added.map(e => e.v)).toEqual(['Good']);
  });

  it('shows the message for malformed JSON and offers no import', async () => {
    render(ImportSheet, { list: lists.tilts!, onclose: vi.fn() });
    await paste('{ nope');
    expect(screen.getByRole('alert').textContent).toMatch(/not valid JSON/);
    expect(screen.queryByRole('button', { name: /^Import \d/ })).toBeNull();
  });

  it('fills the text box from a chosen file', async () => {
    render(ImportSheet, { list: lists.tilts!, onclose: vi.fn() });
    await fireEvent.change(fileInput(), { target: { files: [new File(['Alpha\nBeta'], 'x.txt', { type: 'text/plain' })] } });
    await tock();
    expect((screen.getByRole('textbox', { name: 'Paste text' }) as HTMLTextAreaElement).value).toBe('Alpha\nBeta');
    expect(status()).toMatch(/2 new/);
  });

  it('shows this list\'s JSON and text formats, and copies them', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(ImportSheet, { list: lists.tilts!, onclose: vi.fn() });
    const pre = document.querySelector('pre.fmt')!;
    expect(pre.textContent).toBe(exampleJson(lists.tilts!));
    expect(pre.textContent).toContain(groups[0]!);
    await fireEvent.click(screen.getByRole('button', { name: 'Copy JSON example' }));
    expect(writeText).toHaveBeenCalledWith(exampleJson(lists.tilts!));
    await fireEvent.click(screen.getByRole('button', { name: 'Copy text example' }));
    expect(writeText).toHaveBeenLastCalledWith(exampleText(lists.tilts!));
  });

  it('does not throw when the clipboard is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    render(ImportSheet, { list: lists.tilts!, onclose: vi.fn() });
    await fireEvent.click(screen.getByRole('button', { name: 'Copy JSON example' }));
    await tock();
    expect(document.body.textContent).toMatch(/copy it yourself/i);
  });

  it('opens from the list screen', async () => {
    render(ManageList, { listId: 'tilts' });
    await fireEvent.click(screen.getByRole('button', { name: 'Import file or text' }));
    expect(screen.getByRole('textbox', { name: 'Paste text' })).toBeTruthy();
  });
});
