// The one reactive store for device-level Tools-list edits (pure logic in edits.ts). Loaded before first render.
import { clearEdits, loadEdits, saveListEdits } from './db.ts';
import { lists } from './content/index.ts';
import type { ToolList } from './content/types.ts';
import { effectiveLists, emptyEdits, type EditsMap, type ListEdits } from './edits.ts';

export const editsState = $state<{ map: EditsMap; ready: boolean }>({ map: {}, ready: false });

/** Load saved edits. If they can't be read the app runs on stock lists. */
export async function initEdits(): Promise<void> {
  try {
    editsState.map = await loadEdits();
  } catch {
    editsState.map = {};
  }
  editsState.ready = true;
}

export async function updateEdits(listId: string, fn: (e: ListEdits) => ListEdits): Promise<void> {
  const next = fn($state.snapshot(editsState.map[listId]) ?? emptyEdits(listId));
  editsState.map[listId] = next;
  await saveListEdits($state.snapshot(next));
}

export async function replaceAllEdits(map: EditsMap): Promise<void> {
  editsState.map = map;
  await Promise.all(Object.values($state.snapshot(map)).map(saveListEdits));
}

export async function resetEdits(): Promise<void> {
  editsState.map = {};
  await clearEdits();
}

/** Stock lists with the device's edits applied. What the Tools engine rolls from. */
export const effective = (): Record<string, ToolList> => effectiveLists(lists, editsState.map);
