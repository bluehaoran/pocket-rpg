import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db, loadEdits, newSession, saveSession } from '../src/lib/db.ts';
import { editsState, initEdits, replaceAllEdits, resetEdits, updateEdits } from '../src/lib/edits.svelte.ts';
import { hideText } from '../src/lib/edits.ts';
import { toolCtx } from '../src/lib/toolctx.svelte.ts';
import { lists } from '../src/lib/content/index.ts';

const firstTilt = lists.tilts.entries[0]?.v;

beforeEach(async () => {
  vi.restoreAllMocks();
  await db.listEdits.clear();
  editsState.map = {};
  editsState.ready = false;
});

describe('edits store', () => {
  it('starts empty and ready on a fresh database', async () => {
    await initEdits();
    expect(editsState.ready).toBe(true);
    expect(editsState.map).toEqual({});
  });

  it('persists an update and reads it back after a restart', async () => {
    await initEdits();
    await updateEdits('items', e => ({ ...e, added: [{ v: 'Lantern', src: 'user' }] }));
    editsState.map = {};
    await initEdits();
    expect(editsState.map.items.added).toEqual([{ v: 'Lantern', src: 'user' }]);
  });

  it('resets everything', async () => {
    await initEdits();
    await updateEdits('items', e => hideText(e, 'Rope'));
    await resetEdits();
    expect(editsState.map).toEqual({});
    expect(await loadEdits()).toEqual({});
  });

  it('replaceAllEdits saves every list', async () => {
    await replaceAllEdits({ items: { listId: 'items', added: [], hidden: ['Rope'] } });
    expect((await loadEdits()).items.hidden).toEqual(['Rope']);
  });

  it('loads as stock when the saved edits cannot be read', async () => {
    vi.spyOn(db.listEdits, 'toArray').mockRejectedValueOnce(new Error('blocked'));
    await initEdits();
    expect(editsState.ready).toBe(true);
    expect(editsState.map).toEqual({});
    expect(toolCtx().lists.items.entries).toEqual(lists.items.entries);
  });

  it('ignores malformed saved records', async () => {
    await db.listEdits.put({ listId: 'items', added: 'oops', hidden: null } as never);
    await initEdits();
    expect(editsState.map.items).toBeUndefined();
  });

  it('feeds added and hidden entries to the tool context', async () => {
    await initEdits();
    await updateEdits('items', e => ({ ...e, added: [{ v: 'Zzz unique', src: 'user' }] }));
    expect(toolCtx().lists.items.entries.at(-1)?.v).toBe('Zzz unique');
    if (firstTilt) {
      await updateEdits('tilts', e => hideText(e, firstTilt));
      expect(toolCtx().lists.tilts.entries.some(x => x.v === firstTilt)).toBe(false);
    }
    expect(lists.items.entries.some(x => x.v === 'Zzz unique')).toBe(false);
  });

  it('is untouched when sessions are deleted', async () => {
    await initEdits();
    await updateEdits('items', e => hideText(e, 'Rope'));
    await saveSession(newSession('starfarers', 'lasers-feelings'));
    await db.sessions.clear();
    expect((await loadEdits()).items.hidden).toEqual(['Rope']);
  });
});
