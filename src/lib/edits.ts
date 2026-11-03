// Device-level edits to the Tools lists: entries the person added and stock entries they hid.
// Pure; the stock JSON is never modified. Design: docs/superpowers/specs/2026-10-26-manage-tools-design.md.
import type { Entry, ToolList } from './content/types.ts';
import { capFirst } from './engine/template.ts';

export interface ListEdits {
  listId: string;
  /** Entries the person added (`src: "user"`). */
  added: Entry[];
  /** Stock entry texts (`v`) to omit. Matches every stock entry with that exact text. */
  hidden: string[];
  /**
   * Partial hides: stock entries with text `v` lose one tag value (`key`: `value`), so they stay in the list
   * for the other values. An entry left with no value for that key is dropped. Optional: older records lack it.
   */
  excluded?: Exclusion[];
}
export interface Exclusion {
  v: string;
  key: string;
  value: string;
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

export const exclusionsOf = (e: ListEdits): Exclusion[] => e.excluded ?? [];

/** The entry minus any excluded tag values, or null when that leaves it with none of a tag it had. */
function withoutExcluded(x: Entry, excluded: Exclusion[]): Entry | null {
  let tags = x.tags;
  for (const ex of excluded) {
    if (ex.v !== x.v || !tags || tags[ex.key] === undefined) continue;
    const have = Array.isArray(tags[ex.key]) ? (tags[ex.key] as string[]) : [tags[ex.key] as string];
    if (!have.includes(ex.value)) continue;
    const left = have.filter(t => t !== ex.value);
    if (!left.length) return null;
    tags = { ...tags, [ex.key]: left.length === 1 ? left[0]! : left };
  }
  return tags === x.tags ? x : { ...x, tags };
}

export function effectiveList(list: ToolList, e?: ListEdits): ToolList {
  const excluded = e ? exclusionsOf(e) : [];
  if (!e || (!e.added.length && !e.hidden.length && !excluded.length)) return list;
  const hidden = new Set(e.hidden);
  const stock = list.entries.filter(x => !hidden.has(x.v)).flatMap(x => withoutExcluded(x, excluded) ?? []);
  return { ...list, entries: [...stock, ...e.added] };
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

const sameExclusion = (a: Exclusion, b: Exclusion): boolean => a.v === b.v && a.key === b.key && a.value === b.value;

export const excludeTag = (e: ListEdits, x: Exclusion): ListEdits =>
  exclusionsOf(e).some(o => sameExclusion(o, x)) ? e : { ...e, excluded: [...exclusionsOf(e), x] };

export const unexcludeTag = (e: ListEdits, x: Exclusion): ListEdits => ({ ...e, excluded: exclusionsOf(e).filter(o => !sameExclusion(o, x)) });

/** "Never show again": hides the stock text, and deletes any entry the person added with that text. */
export const hideEverywhere = (list: ToolList, e: ListEdits, v: string): ListEdits => {
  const next = list.entries.some(x => x.v === v) ? hideText(e, v) : e;
  return { ...next, added: next.added.filter(x => x.v !== v) };
};

export interface ExclusionChoice {
  key: string;
  label: string;
  values: { value: string; label: string }[];
}

/** The tag values the stock entries with text `v` carry, per modifier the list declares: what a partial hide can remove. */
export function exclusionChoices(list: ToolList, v: string, e: ListEdits): ExclusionChoice[] {
  const done = exclusionsOf(e);
  const out: ExclusionChoice[] = [];
  for (const [key, decl] of Object.entries(list.modifiers ?? {})) {
    const have = new Set<string>();
    for (const x of list.entries) {
      if (x.v !== v) continue;
      const t = x.tags?.[key];
      for (const value of t === undefined ? [] : Array.isArray(t) ? t : [t]) if (!done.some(o => o.v === v && o.key === key && o.value === value)) have.add(String(value));
    }
    const values = decl.values.filter(value => have.has(value)).map(value => ({ value, label: decl.valueLabels?.[value] ?? capFirst(value) }));
    if (values.length) out.push({ key, label: decl.label, values });
  }
  return out;
}

/** Button wording for a partial hide, e.g. "Not in Samurai" or "Not a male name". */
export function exclusionPhrase(key: string, valueLabel: string): string {
  if (key === 'setting') return `Not in ${valueLabel}`;
  if (key === 'gender') return `Not a ${valueLabel.toLowerCase()} name`;
  return `Not ${valueLabel.toLowerCase()}`;
}

/** The button wording for an exclusion already saved, using the list's own value labels. */
export const exclusionLabel = (list: ToolList | undefined, x: Exclusion): string =>
  exclusionPhrase(x.key, list?.modifiers?.[x.key]?.valueLabels?.[x.value] ?? capFirst(x.value));

export interface StockRow {
  v: string;
  entries: Entry[];
  hidden: boolean;
  excluded: Exclusion[];
}

/** One row per distinct stock text, in list order. */
export function stockRows(list: ToolList, e: ListEdits): StockRow[] {
  const rows = new Map<string, StockRow>();
  for (const x of list.entries) {
    const row = rows.get(x.v);
    if (row) row.entries.push(x);
    else rows.set(x.v, { v: x.v, entries: [x], hidden: e.hidden.includes(x.v), excluded: exclusionsOf(e).filter(o => o.v === x.v) });
  }
  return [...rows.values()];
}

export function editCounts(list: ToolList, e: ListEdits): { added: number; hidden: number; partial: number } {
  const stock = new Set(list.entries.map(x => x.v));
  const partial = new Set(exclusionsOf(e).filter(o => stock.has(o.v) && !e.hidden.includes(o.v)).map(o => o.v));
  return { added: e.added.length, hidden: e.hidden.filter(h => stock.has(h)).length, partial: partial.size };
}
