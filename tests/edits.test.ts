import { describe, expect, it } from 'vitest';
import type { ToolList } from '../src/lib/content/types.ts';
import {
  addEntries, editCounts, excludeTag, exclusionChoices, exclusionLabel, exclusionPhrase, hideEverywhere, unexcludeTag, effectiveList, effectiveLists, emptyEdits, entryKey, hideText, removeAdded, stockRows, unhideText
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
    expect(vs(out.names!)).toEqual(['Rowan', 'Rowan']);
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
    expect(editCounts(list, e)).toEqual({ added: 1, hidden: 1, partial: 0 });
  });
});

describe('partial hides (excluded tag values)', () => {
  const multi: ToolList = {
    id: 'names', label: 'Names', version: '0',
    modifiers: {
      setting: { label: 'Setting', values: ['fantasy', 'samurai', 'gothic'] },
      gender: { label: 'Gender', values: ['f', 'm', 'x'], valueLabels: { f: 'Female', m: 'Male', x: 'Neutral' } }
    },
    entries: [
      { v: 'Kaede', tags: { setting: ['fantasy', 'samurai'], gender: 'f' } },
      { v: 'Kaede', tags: { setting: 'gothic', gender: ['f', 'm'] } },
      { v: 'Alex', tags: { setting: 'fantasy', gender: 'm' } },
      { v: 'Plain' }
    ]
  };
  const base = emptyEdits('names');
  const tagsOf = (l: ToolList, v: string) => l.entries.filter(e => e.v === v).map(e => e.tags);

  it('removes one value from the matching entries and keeps the rest', () => {
    const e = excludeTag(base, { v: 'Kaede', key: 'setting', value: 'samurai' });
    expect(tagsOf(effectiveList(multi, e), 'Kaede')).toEqual([
      { setting: 'fantasy', gender: 'f' },
      { setting: 'gothic', gender: ['f', 'm'] }
    ]);
  });
  it('drops an entry left with no value for that key, but only that entry', () => {
    const e = excludeTag(base, { v: 'Kaede', key: 'setting', value: 'gothic' });
    expect(tagsOf(effectiveList(multi, e), 'Kaede')).toEqual([{ setting: ['fantasy', 'samurai'], gender: 'f' }]);
  });
  it('excluding a gender leaves the name for the other genders', () => {
    const e = excludeTag(base, { v: 'Kaede', key: 'gender', value: 'm' });
    expect(tagsOf(effectiveList(multi, e), 'Kaede')[1]).toEqual({ setting: 'gothic', gender: 'f' });
  });
  it('ignores an exclusion for an untagged key or a value the entry does not have', () => {
    const e = { ...base, excluded: [{ v: 'Plain', key: 'setting', value: 'fantasy' }, { v: 'Alex', key: 'setting', value: 'gothic' }] };
    expect(effectiveList(multi, e).entries).toEqual(multi.entries);
  });
  it('does not touch stock entries it was not asked about, added entries, or its input', () => {
    const e = { ...excludeTag(base, { v: 'Alex', key: 'gender', value: 'm' }), added: [{ v: 'Alex', tags: { gender: 'm' }, src: 'user' }] };
    const before = JSON.stringify(multi);
    const out = effectiveList(multi, e);
    expect(out.entries.map(x => x.v)).toEqual(['Kaede', 'Kaede', 'Plain', 'Alex']);
    expect(out.entries.at(-1)!.src).toBe('user');
    expect(JSON.stringify(multi)).toBe(before);
  });
  it('treats records saved before partial hides existed as having none', () => {
    const old = { listId: 'names', added: [], hidden: [] };
    expect(effectiveList(multi, old)).toBe(multi);
    expect(excludeTag(old, { v: 'Alex', key: 'gender', value: 'm' }).excluded).toHaveLength(1);
  });
  it('does not duplicate an exclusion, and unexclude removes exactly it', () => {
    const x = { v: 'Alex', key: 'gender', value: 'm' };
    const once = excludeTag(base, x);
    expect(excludeTag(once, x)).toBe(once);
    const two = excludeTag(once, { ...x, value: 'f' });
    expect(unexcludeTag(two, x).excluded).toEqual([{ ...x, value: 'f' }]);
  });
  it('offers each declared modifier value the stock entries carry, minus ones already excluded', () => {
    const choices = exclusionChoices(multi, 'Kaede', base);
    expect(choices.map(c => [c.key, c.values.map(v => v.value)])).toEqual([
      ['setting', ['fantasy', 'samurai', 'gothic']],
      ['gender', ['f', 'm']]
    ]);
    expect(choices[1]!.values.map(v => v.label)).toEqual(['Female', 'Male']);
    const after = exclusionChoices(multi, 'Kaede', excludeTag(base, { v: 'Kaede', key: 'gender', value: 'm' }));
    expect(after[1]!.values.map(v => v.value)).toEqual(['f']);
    expect(exclusionChoices(multi, 'Plain', base)).toEqual([]);
  });
  it('words the buttons by modifier', () => {
    expect(exclusionPhrase('setting', 'Samurai')).toBe('Not in Samurai');
    expect(exclusionPhrase('gender', 'Male')).toBe('Not a male name');
    expect(exclusionPhrase('group', 'Doom')).toBe('Not doom');
  });
  it('labels a saved exclusion with the list\'s value labels', () => {
    expect(exclusionLabel(multi, { v: 'Kaede', key: 'gender', value: 'm' })).toBe('Not a male name');
    expect(exclusionLabel(multi, { v: 'Kaede', key: 'setting', value: 'samurai' })).toBe('Not in Samurai');
    expect(exclusionLabel(undefined, { v: 'Kaede', key: 'setting', value: 'samurai' })).toBe('Not in Samurai');
  });
  it('counts partly hidden texts, not ones that are fully hidden or no longer in the list', () => {
    const e = {
      ...base,
      hidden: ['Alex'],
      excluded: [
        { v: 'Kaede', key: 'gender', value: 'm' }, { v: 'Kaede', key: 'setting', value: 'gothic' },
        { v: 'Alex', key: 'gender', value: 'm' }, { v: 'Gone', key: 'gender', value: 'm' }
      ]
    };
    expect(editCounts(multi, e).partial).toBe(1);
  });
  it('hideEverywhere hides a stock text and deletes an added entry with that text', () => {
    const e = { ...base, added: [{ v: 'Zed', src: 'user' }, { v: 'Alex', src: 'user' }] };
    const out = hideEverywhere(multi, e, 'Alex');
    expect(out.hidden).toEqual(['Alex']);
    expect(out.added.map(x => x.v)).toEqual(['Zed']);
    const mine = hideEverywhere(multi, e, 'Zed');
    expect(mine.hidden).toEqual([]);
    expect(mine.added.map(x => x.v)).toEqual(['Alex']);
  });
  it('lists each text\'s partial hides on its stock row', () => {
    const e = excludeTag(base, { v: 'Alex', key: 'gender', value: 'm' });
    expect(stockRows(multi, e).map(r => [r.v, r.excluded.length])).toEqual([['Kaede', 0], ['Alex', 1], ['Plain', 0]]);
  });
});
