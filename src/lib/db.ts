// Session storage. Schema: docs/02-data-model.md §3. One active session at a time in Phase 1.
import Dexie, { type EntityTable } from 'dexie';
import type { EditsMap, ListEdits } from './edits.ts';

export interface ToolHistoryEntry {
  t: string;
  tool: string;
  label: string;
  text: string;
  modifiers?: Record<string, string>;
  relaxed?: boolean;
}

export interface TrackHistoryEntry {
  t: string;
  kind: 'roll' | 'progress' | 'resource' | 'edit';
  char?: string;
  text: string;
  detail?: unknown;
}

export interface Character {
  id: string;
  fields: Record<string, string | string[] | number>;
  resources: Record<string, number>;
  xp?: number;
  extra?: string[];
  earned?: { name: string; level: number; parent: string }[];
}

export interface Session {
  id: string;
  createdAt: string;
  started: boolean;
  packIds: string[];
  rulesId: string;
  players: number;
  starterSkills?: number;
  /** Roll for Shoes: GM dice for opposed rolls (0 = off). Remembered across rolls. */
  gmDice?: number;
  answers: Record<string, string>;
  characters: Character[];
  seed?: { columns: string[]; text: string };
  group: Record<string, string | string[]>;
  recent: Record<string, string[]>;
  lastModifiers: Record<string, Record<string, string>>;
  toolModifiers: Record<string, Record<string, string | number | boolean>>;
  toolHistory: ToolHistoryEntry[];
  trackHistory: TrackHistoryEntry[];
}

export const db = new Dexie('pocketrpg') as Dexie & {
  sessions: EntityTable<Session, 'id'>;
  listEdits: EntityTable<ListEdits, 'listId'>;
};

db.version(1).stores({
  sessions: 'id, createdAt'
});
// v2: device-level edits to the Tools lists (docs/superpowers/specs/2026-10-26-manage-tools-design.md).
db.version(2).stores({
  sessions: 'id, createdAt',
  listEdits: 'listId'
});

export function newSession(packId: string, rulesId: string): Session {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    started: false,
    packIds: [packId],
    rulesId,
    players: 1,
    answers: {},
    characters: [],
    group: {},
    recent: {},
    lastModifiers: {},
    toolModifiers: {},
    toolHistory: [],
    trackHistory: []
  };
}

/** The most recent session, or undefined if none exists yet. */
export async function currentSession(): Promise<Session | undefined> {
  return db.sessions.orderBy('createdAt').last();
}

/**
 * Persist a session. Pass a plain object: Svelte 5 state is a Proxy, which IndexedDB can't clone,
 * so callers holding reactive state pass `$state.snapshot(session)`.
 */
export async function saveSession(s: Session): Promise<void> {
  await db.sessions.put(s);
}

/** Saved Tools-list edits by list id. Records with a bad shape are skipped, so the app falls back to stock for them. */
export async function loadEdits(): Promise<EditsMap> {
  const rows = await db.listEdits.toArray();
  return Object.fromEntries(
    rows.filter(r => Array.isArray(r.added) && Array.isArray(r.hidden)).map(r => [r.listId, r])
  );
}

/** Persist one list's edits. Pass a plain object, not a reactive proxy. */
export async function saveListEdits(e: ListEdits): Promise<void> {
  await db.listEdits.put(e);
}

export async function clearEdits(): Promise<void> {
  await db.listEdits.clear();
}
