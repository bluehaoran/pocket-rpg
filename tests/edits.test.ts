import { describe, expect, it } from 'vitest';
import type { ToolList } from '../src/lib/content/types.ts';
import {
  addEntries, editCounts, effectiveList, effectiveLists, emptyEdits, entryKey, hideText, removeAdded, stockRows, unhideText
} from '../src/lib/edits.ts';

const list: ToolList = {
  id: 'names',
  label: 'Names',
  version: '0',
  modifiers: { setting: { label: 'Setting', values: ['fantasy', 'modern'] } },
  entries: [
    { v: 'Rowan', tags: { setting: 'fantasy' } },
    { v: 'Rowan', tags: { setting: 'modern' } },
    { v: 'Liria', tags: { setting: 'fantasy' } }
  ]
};
const vs = (l: ToolList) => l.entries.map(e => e.v);

describe('effectiveList', () => {
  it('returns the stock list itself when there are no edits', () => {
    expect(effectiveList(list)).toBe(list);
    expect(effectiveList(list, emptyEdits('names'))).toBe(list);
  });
  it('drops every stock entry with a hidden text and appends added ones', () => {
    const e = { listId: 'names', added: [{ v: 'Zed', src: 'user' }], hidden: ['Rowan'] };
    expect(vs(effectiveList(list, e))).toEqual(['Liria', 'Zed']);
  });
  it('keeps an added entry whose text matches a hidden stock text', () => {
    const e = { listId: 'names', added: [{ v: 'Rowan', tags: { setting: 'modern' }, src: 'user' }], hidden: ['Rowan'] };
    expect(vs(effectiveList(list, e))).toEqual(['Liria', 'Rowan']);
  });
  it('leaves only added entries when every stock text is hidden', () => {
    const e = { listId: 'names', added: [], hidden: ['Rowan', 'Liria'] };
    expect(effectiveList(list, e).entries).toEqual([]);
    const e2 = { ...e, added: [{ v: 'Zed', src: 'user' }] };
    expect(vs(effectiveList(list, e2))).toEqual(['Zed']);
  });
  it('does not mutate its inputs', () => {
    const e = { listId: 'names', added: [{ v: 'Zed' }], hidden: ['Rowan'] };
    const before = JSON.stringify([list, e]);
    effectiveList(list, e);
    expect(JSON.stringify([list, e])).toBe(before);
  });
});

describe('effectiveLists', () => {
  it('applies edits per list id and passes untouched lists through', () => {
    const other: ToolList = { ...list, id: 'items', entries: [{ v: 'Rope' }] };
    const out = effectiveLists({ names: list, items: other }, { names: { listId: 'names', added: [], hidden: ['Liria'] } });
    expect(vs(out.names)).toEqual(['Rowan', 'Rowan']);
    expect(out.items).toBe(other);
  });
});

describe('addEntries', () => {
  it('stamps src user, trims text and appends', () => {
    const r = addEntries(list, emptyEdits('names'), [{ v: '  Zed ', tags: { setting: 'modern' } }]);
    expect(r.edits.added).toEqual([{ v: 'Zed', tags: { setting: 'modern' }, src: 'user' }]);
    expect(r.added).toHaveLength(1);
    expect(r.duplicates).toEqual([]);
  });
  it('skips a duplicate of a stock entry (same text and tags)', () => {
    const r = addEntries(list, emptyEdits('names'), [{ v: 'Liria', tags: { setting: 'fantasy' } }]);
    expect(r.edits.added).toEqual([]);
    expect(r.duplicates).toHaveLength(1);
  });
  it('accepts the same text with different tags', () => {
    const r = addEntries(list, emptyEdits('names'), [{ v: 'Liria', tags: { setting: 'modern' } }]);
    expect(r.edits.added).toHaveLength(1);
  });
  it('skips a repeat within the incoming batch and against earlier added', () => {
    const first = addEntries(list, emptyEdits('names'), [{ v: 'Zed' }, { v: 'Zed' }]);
    expect(first.edits.added).toHaveLength(1);
    expect(first.duplicates).toHaveLength(1);
    const again = addEntries(list, first.edits, [{ v: 'Zed' }]);
    expect(again.edits.added).toHaveLength(1);
    expect(again.duplicates).toHaveLength(1);
  });
  it('treats tag order and array order as irrelevant to identity', () => {
    expect(entryKey({ v: 'A', tags: { b: ['y', 'x'], a: 'z' } })).toBe(entryKey({ v: 'A', tags: { a: 'z', b: ['x', 'y'] } }));
  });
});

describe('removeAdded, hideText, unhideText', () => {
  it('removes an added entry by index', () => {
    const e = { listId: 'names', added: [{ v: 'A' }, { v: 'B' }], hidden: [] };
    expect(removeAdded(e, 0).added).toEqual([{ v: 'B' }]);
  });
  it('hides and unhides idempotently', () => {
    const e = emptyEdits('names');
    const h = hideText(hideText(e, 'Rowan'), 'Rowan');
    expect(h.hidden).toEqual(['Rowan']);
    expect(unhideText(unhideText(h, 'Rowan'), 'Rowan').hidden).toEqual([]);
  });
});

describe('stockRows and editCounts', () => {
  it('has one row per distinct stock text, with every entry sharing it', () => {
    const rows = stockRows(list, hideText(emptyEdits('names'), 'Rowan'));
    expect(rows.map(r => [r.v, r.entries.length, r.hidden])).toEqual([['Rowan', 2, true], ['Liria', 1, false]]);
  });
  it('counts hidden only when the text matches a current stock entry', () => {
    const e = { listId: 'names', added: [{ v: 'Zed' }], hidden: ['Rowan', 'Gone'] };
    expect(editCounts(list, e)).toEqual({ added: 1, hidden: 1 });
  });
});
