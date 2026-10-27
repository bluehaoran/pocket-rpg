// Device-level edits to the Tools lists: entries the person added and stock entries they hid.
// Pure; the stock JSON is never modified. Design: docs/superpowers/specs/2026-10-26-manage-tools-design.md.
import type { Entry, ToolList } from './content/types.ts';

export interface ListEdits {
  listId: string;
  /** Entries the person added (`src: "user"`). */
  added: Entry[];
  /** Stock entry texts (`v`) to omit. Matches every stock entry with that exact text. */
  hidden: string[];
}
export type EditsMap = Record<string, ListEdits>;

export const emptyEdits = (listId: string): ListEdits => ({ listId, added: [], hidden: [] });

/** Identity for duplicate checks: trimmed text plus tags, ignoring key and array order. */
export function entryKey(e: Entry): string {
  const tags = Object.entries(e.tags ?? {})
    .map(([k, v]) => [k, (Array.isArray(v) ? [...v].sort() : [v])] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return JSON.stringify([e.v.trim(), tags]);
}

export function effectiveList(list: ToolList, e?: ListEdits): ToolList {
  if (!e || (!e.added.length && !e.hidden.length)) return list;
  const hidden = new Set(e.hidden);
  return { ...list, entries: [...list.entries.filter(x => !hidden.has(x.v)), ...e.added] };
}

export function effectiveLists(stock: Record<string, ToolList>, edits: EditsMap): Record<string, ToolList> {
  return Object.fromEntries(Object.entries(stock).map(([id, l]) => [id, effectiveList(l, edits[id])]));
}

export function addEntries(
  list: ToolList,
  e: ListEdits,
  incoming: Entry[]
): { edits: ListEdits; added: Entry[]; duplicates: Entry[] } {
  const seen = new Set([...list.entries, ...e.added].map(entryKey));
  const added: Entry[] = [];
  const duplicates: Entry[] = [];
  for (const raw of incoming) {
    const entry: Entry = { ...raw, v: raw.v.trim(), src: 'user' };
    const key = entryKey(entry);
    if (seen.has(key)) duplicates.push(raw);
    else {
      seen.add(key);
      added.push(entry);
    }
  }
  return { edits: { ...e, added: [...e.added, ...added] }, added, duplicates };
}

export const removeAdded = (e: ListEdits, index: number): ListEdits => ({ ...e, added: e.added.filter((_, i) => i !== index) });

export const hideText = (e: ListEdits, v: string): ListEdits => (e.hidden.includes(v) ? e : { ...e, hidden: [...e.hidden, v] });

export const unhideText = (e: ListEdits, v: string): ListEdits => ({ ...e, hidden: e.hidden.filter(h => h !== v) });

export interface StockRow {
  v: string;
  entries: Entry[];
  hidden: boolean;
}

/** One row per distinct stock text, in list order. */
export function stockRows(list: ToolList, e: ListEdits): StockRow[] {
  const rows = new Map<string, StockRow>();
  for (const x of list.entries) {
    const row = rows.get(x.v);
    if (row) row.entries.push(x);
    else rows.set(x.v, { v: x.v, entries: [x], hidden: e.hidden.includes(x.v) });
  }
  return [...rows.values()];
}

export function editCounts(list: ToolList, e: ListEdits): { added: number; hidden: number } {
  const stock = new Set(list.entries.map(x => x.v));
  return { added: e.added.length, hidden: e.hidden.filter(h => stock.has(h)).length };
}
