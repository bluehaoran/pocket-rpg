import { describe, expect, it } from 'vitest';
import type { ToolList } from '../src/lib/content/types.ts';
import { addEntries, emptyEdits } from '../src/lib/edits.ts';
import { exampleJson, exampleText, ImportError, parseImport } from '../src/lib/importer.ts';

const tilts: ToolList = {
  id: 'tilts',
  label: 'Tilts',
  version: '0',
  modifiers: {
    group: { label: 'Group', values: ['Mayhem', 'Doom'] },
    flavour: { label: 'Flavour', values: ['a', 'b'] }
  },
  entries: [{ v: 'Rope snaps', tags: { group: 'Mayhem' } }]
};
const plain: ToolList = { id: 'items', label: 'Items', version: '0', modifiers: {}, entries: [] };
const none = emptyEdits('tilts');

describe('parseImport json', () => {
  it('reads the list-file shape and ignores extra fields', () => {
    const text = JSON.stringify({ id: 'x', label: 'y', modifiers: {}, entries: [{ v: 'A bell tolls', tags: { group: 'Doom' } }] });
    const p = parseImport(tilts, none, text, 'json');
    expect(p.fresh.map(e => e.v)).toEqual(['A bell tolls']);
    expect(p.invalid).toEqual([]);
  });
  it('reads a bare entry array and a bare string array', () => {
    expect(parseImport(tilts, none, '[{"v":"A"}]', 'json').fresh).toHaveLength(1);
    const p = parseImport(tilts, none, '["A","B"]', 'json', { group: 'Doom' });
    expect(p.fresh.map(e => e.tags)).toEqual([{ group: 'Doom' }, { group: 'Doom' }]);
  });
  it('reports undeclared tag keys and values but keeps valid siblings', () => {
    const text = JSON.stringify([
      { v: 'Good', tags: { group: 'Doom' } },
      { v: 'Bad key', tags: { colour: 'red' } },
      { v: 'Bad value', tags: { group: 'Nope' } },
      { v: '  ' },
      { v: 'Array ok', tags: { group: ['Doom', 'Mayhem'] } }
    ]);
    const p = parseImport(tilts, none, text, 'json');
    expect(p.fresh.map(e => e.v)).toEqual(['Good', 'Array ok']);
    expect(p.invalid).toHaveLength(3);
    expect(p.invalid[0].reason).toMatch(/colour/);
    expect(p.invalid[1].reason).toMatch(/Nope/);
  });
  it('marks entries already in stock or already added as duplicates, so a second import adds nothing', () => {
    const text = JSON.stringify([{ v: 'Rope snaps', tags: { group: 'Mayhem' } }, { v: 'New one' }]);
    const first = parseImport(tilts, none, text, 'json');
    expect(first.fresh.map(e => e.v)).toEqual(['New one']);
    expect(first.duplicates).toHaveLength(1);
    const edits = addEntries(tilts, none, first.fresh).edits;
    const second = parseImport(tilts, edits, text, 'json');
    expect(second.fresh).toEqual([]);
    expect(second.duplicates).toHaveLength(2);
  });
  it.each(['', '   ', '{', '42', '{"foo":1}', '[]', '{"entries":[]}'])('rejects %j with an ImportError and no preview', text => {
    expect(() => parseImport(tilts, none, text, 'json')).toThrow(ImportError);
  });
});

describe('parseImport text', () => {
  it('takes one entry per trimmed non-blank line and applies the chosen tags', () => {
    const p = parseImport(tilts, none, '  A bell tolls \n\n\nFog rolls in\n', 'text', { group: 'Doom' });
    expect(p.fresh.map(e => [e.v, e.tags])).toEqual([['A bell tolls', { group: 'Doom' }], ['Fog rolls in', { group: 'Doom' }]]);
  });
  it('leaves entries untagged with no tags, and rejects empty text', () => {
    expect(parseImport(plain, emptyEdits('items'), 'Rope', 'text').fresh[0].tags).toBeUndefined();
    expect(() => parseImport(plain, emptyEdits('items'), ' \n ', 'text')).toThrow(ImportError);
  });
});

describe('format examples', () => {
  it('exampleJson round-trips through parseImport using the list\'s own tag values', () => {
    const text = exampleJson(tilts);
    const doc = JSON.parse(text);
    expect(doc.entries.length).toBeGreaterThanOrEqual(2);
    expect(doc.entries[0].tags.group).toBe('Mayhem');
    expect(parseImport(tilts, none, text, 'json').invalid).toEqual([]);
  });
  it('works for a list with no modifiers, and exampleText has two lines', () => {
    const doc = JSON.parse(exampleJson(plain));
    expect(doc.entries.every((e: { tags?: unknown }) => e.tags === undefined)).toBe(true);
    expect(exampleText(tilts).split('\n')).toHaveLength(2);
  });
});
