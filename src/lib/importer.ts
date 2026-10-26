// Parses and validates entries to add to a Tools list, from JSON or plain text. Pure.
import type { Entry, TagValue, ToolList } from './content/types.ts';
import { addEntries, type ListEdits } from './edits.ts';

export class ImportError extends Error {}

export interface ImportPreview {
  fresh: Entry[];
  duplicates: Entry[];
  invalid: { raw: string; reason: string }[];
}

type Candidate = { raw: string; entry: Entry };

function jsonItems(text: string): unknown[] {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    throw new ImportError('That is not valid JSON.');
  }
  const items = Array.isArray(doc) ? doc : (doc as { entries?: unknown } | null)?.entries;
  if (!Array.isArray(items)) throw new ImportError('Expected a list of entries, or an object with an "entries" list.');
  return items;
}

function toCandidate(item: unknown, lineTags: Record<string, string>): Candidate | { raw: string; reason: string } {
  const raw = typeof item === 'string' ? item : JSON.stringify(item);
  const tagsFromPickers = Object.keys(lineTags).length ? { tags: { ...lineTags } } : {};
  if (typeof item === 'string') return { raw, entry: { v: item, ...tagsFromPickers } };
  const o = item as Record<string, unknown> | null;
  if (!o || typeof o !== 'object' || typeof o.v !== 'string') return { raw, reason: 'Missing text ("v").' };
  const entry: Entry = { v: o.v };
  if (o.tags && typeof o.tags === 'object') entry.tags = o.tags as Record<string, TagValue>;
  else Object.assign(entry, tagsFromPickers);
  if (o.data && typeof o.data === 'object') entry.data = o.data as Record<string, unknown>;
  if (o.position === 'before' || o.position === 'after') entry.position = o.position;
  return { raw, entry };
}

function problem(list: ToolList, e: Entry): string | undefined {
  if (!e.v.trim()) return 'Empty text.';
  for (const [key, val] of Object.entries(e.tags ?? {})) {
    const decl = list.modifiers[key];
    if (!decl) return `Unknown tag "${key}" for this list.`;
    for (const x of Array.isArray(val) ? val : [val]) {
      if (typeof x !== 'string' || !decl.values.includes(x)) return `"${String(x)}" is not a value of ${key}.`;
    }
  }
  return undefined;
}

export function parseImport(
  list: ToolList,
  edits: ListEdits,
  text: string,
  kind: 'json' | 'text',
  lineTags: Record<string, string> = {}
): ImportPreview {
  const items: unknown[] = kind === 'json' ? jsonItems(text) : text.split('\n').map(l => l.trim()).filter(Boolean);
  if (!items.length) throw new ImportError('No entries found.');
  const valid: Entry[] = [];
  const invalid: ImportPreview['invalid'] = [];
  for (const item of items) {
    const c = toCandidate(item, lineTags);
    if ('reason' in c) {
      invalid.push({ raw: c.raw, reason: c.reason });
      continue;
    }
    const reason = problem(list, c.entry);
    if (reason) invalid.push({ raw: c.raw, reason });
    else valid.push(c.entry);
  }
  const { added, duplicates } = addEntries(list, edits, valid);
  return { fresh: added, duplicates, invalid };
}

/** A ready-to-copy JSON file for this list, built from its own tag declarations. */
export function exampleJson(list: ToolList): string {
  const mods = Object.entries(list.modifiers);
  const sample = (n: number): Entry => {
    const tags = Object.fromEntries(mods.map(([k, d]) => [k, d.values[n % d.values.length]]).filter(([, v]) => v !== undefined));
    return { v: `Example ${n + 1}`, ...(Object.keys(tags).length ? { tags } : {}) };
  };
  return JSON.stringify({ id: list.id, entries: [sample(0), sample(1)] }, null, 2);
}

export const exampleText = (_list: ToolList): string => 'Example 1\nExample 2';
