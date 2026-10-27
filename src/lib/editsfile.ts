// The whole-device edits file: export, preview and merge. Pure. Shape: docs/superpowers/specs/2026-10-26-manage-tools-design.md.
import type { Entry, ToolList } from './content/types.ts';
import { emptyEdits, type EditsMap } from './edits.ts';
import { ImportError, parseImport, type ImportPreview } from './importer.ts';

export interface EditsFile {
  version: 1;
  lists: Record<string, { added: Entry[]; hidden: string[] }>;
}

export interface FilePreview {
  perList: Record<string, ImportPreview & { hide: string[] }>;
  unknownLists: string[];
}

export function exportEdits(edits: EditsMap, listIds?: string[]): EditsFile {
  const lists: EditsFile['lists'] = {};
  for (const [id, e] of Object.entries(edits)) {
    if (listIds && !listIds.includes(id)) continue;
    if (e.added.length || e.hidden.length) lists[id] = { added: e.added, hidden: e.hidden };
  }
  return { version: 1, lists };
}

export function previewEditsFile(stock: Record<string, ToolList>, edits: EditsMap, text: string): FilePreview {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    throw new ImportError('That is not valid JSON.');
  }
  const file = doc as Partial<EditsFile> | null;
  if (!file || typeof file !== 'object' || file.version !== 1 || !file.lists || typeof file.lists !== 'object') {
    throw new ImportError('That is not a PocketRPG edits file.');
  }
  const preview: FilePreview = { perList: {}, unknownLists: [] };
  for (const [id, body] of Object.entries(file.lists)) {
    const list = stock[id];
    if (!list) {
      preview.unknownLists.push(id);
      continue;
    }
    const current = edits[id] ?? emptyEdits(id);
    const added = Array.isArray(body?.added) ? body.added : [];
    const hidden = Array.isArray(body?.hidden) ? body.hidden.filter((h): h is string => typeof h === 'string') : [];
    const entries: ImportPreview = added.length
      ? parseImport(list, current, JSON.stringify(added), 'json')
      : { fresh: [], duplicates: [], invalid: [] };
    preview.perList[id] = { ...entries, hide: hidden.filter(h => !current.hidden.includes(h)) };
  }
  return preview;
}

export function applyEditsFile(stock: Record<string, ToolList>, edits: EditsMap, preview: FilePreview): EditsMap {
  const next: EditsMap = { ...edits };
  for (const [id, p] of Object.entries(preview.perList)) {
    if (!stock[id] || (!p.fresh.length && !p.hide.length)) continue;
    const current = next[id] ?? emptyEdits(id);
    next[id] = { ...current, added: [...current.added, ...p.fresh], hidden: [...current.hidden, ...p.hide] };
  }
  return next;
}
