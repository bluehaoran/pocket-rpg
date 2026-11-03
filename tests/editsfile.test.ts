import { describe, expect, it } from 'vitest';
import type { ToolList } from '../src/lib/content/types.ts';
import type { EditsMap } from '../src/lib/edits.ts';
import { applyEditsFile, exportEdits, previewEditsFile } from '../src/lib/editsfile.ts';
import { ImportError } from '../src/lib/importer.ts';

const stock: Record<string, ToolList> = {
  tilts: {
    id: 'tilts', label: 'Tilts', version: '0',
    modifiers: { group: { label: 'Group', values: ['Mayhem', 'Doom'] } },
    entries: [{ v: 'Rope snaps', tags: { group: 'Mayhem' } }]
  },
  items: { id: 'items', label: 'Items', version: '0', modifiers: {}, entries: [{ v: 'Rope' }] }
};
const edits: EditsMap = {
  tilts: { listId: 'tilts', added: [{ v: 'Bell', tags: { group: 'Doom' }, src: 'user' }], hidden: ['Rope snaps'] },
  items: { listId: 'items', added: [], hidden: ['Rope'] }
};

describe('exportEdits', () => {
  it('omits lists with nothing in them and can be limited to some lists', () => {
    const map: EditsMap = { ...edits, empty: { listId: 'empty', added: [], hidden: [] } };
    expect(Object.keys(exportEdits(map).lists).sort()).toEqual(['items', 'tilts']);
    expect(Object.keys(exportEdits(map, ['tilts']).lists)).toEqual(['tilts']);
    expect(exportEdits(map).version).toBe(1);
  });
});

describe('previewEditsFile and applyEditsFile', () => {
  const text = JSON.stringify(exportEdits(edits));
  it('round-trips onto an empty device', () => {
    const p = previewEditsFile(stock, {}, text);
    expect(p.unknownLists).toEqual([]);
    expect(p.perList.tilts!.fresh).toHaveLength(1);
    expect(p.perList.tilts!.hide).toEqual(['Rope snaps']);
    expect(applyEditsFile(stock, {}, p)).toEqual(edits);
  });
  it('is idempotent when applied twice', () => {
    const once = applyEditsFile(stock, {}, previewEditsFile(stock, {}, text));
    const twice = applyEditsFile(stock, once, previewEditsFile(stock, once, text));
    expect(twice).toEqual(once);
    expect(previewEditsFile(stock, once, text).perList.tilts!.fresh).toEqual([]);
  });
  it('reports list ids this build does not have and does not apply them', () => {
    const file = { version: 1, lists: { nope: { added: [{ v: 'X' }], hidden: ['Y'] }, items: { added: [], hidden: [] } } };
    const p = previewEditsFile(stock, {}, JSON.stringify(file));
    expect(p.unknownLists).toEqual(['nope']);
    expect(Object.keys(applyEditsFile(stock, {}, p))).not.toContain('nope');
  });
  it('treats a stale tag value as invalid, not an error', () => {
    const file = { version: 1, lists: { tilts: { added: [{ v: 'Old', tags: { group: 'Retired' } }, { v: 'Fine' }], hidden: [] } } };
    const p = previewEditsFile(stock, {}, JSON.stringify(file));
    expect(p.perList.tilts!.invalid).toHaveLength(1);
    expect(p.perList.tilts!.fresh.map(e => e.v)).toEqual(['Fine']);
  });
  it.each(['', '{', '[]', '{"version":2,"lists":{}}', '{"version":1}'])('rejects %j', t => {
    expect(() => previewEditsFile(stock, {}, t)).toThrow(ImportError);
  });
});

describe('partial hides in the edits file', () => {
  const x = { v: 'Rope snaps', key: 'group', value: 'Mayhem' };
  const withX: EditsMap = { tilts: { listId: 'tilts', added: [], hidden: [], excluded: [x] } };
  it('exports them, including for a list with nothing else', () => {
    expect(exportEdits(withX).lists.tilts).toEqual({ added: [], hidden: [], excluded: [x] });
  });
  it('round-trips, ignores malformed ones, and is idempotent', () => {
    const text = JSON.stringify({ version: 1, lists: { tilts: { added: [], hidden: [], excluded: [x, x, { v: 1 }, 'no'] } } });
    const p = previewEditsFile(stock, {}, text);
    expect(p.perList.tilts!.exclude).toEqual([x]);
    const once = applyEditsFile(stock, {}, p);
    expect(once.tilts!.excluded).toEqual([x]);
    expect(previewEditsFile(stock, once, text).perList.tilts!.exclude).toEqual([]);
  });
  it('reads a file from before partial hides existed', () => {
    const p = previewEditsFile(stock, {}, JSON.stringify(exportEdits(edits)));
    expect(p.perList.tilts!.exclude).toEqual([]);
  });
});
