// Session storage. Schema: docs/02-data-model.md §3. One active session at a time in Phase 1.
import Dexie, { type EntityTable } from 'dexie';

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
  /** Kintsugi: learned skills besides the root skill. `out` skills have reached 6 and are crossed out. */
  skills?: { name: string; level: number; out?: boolean }[];
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
  /** Kintsugi: the GM's skill for opposed rolls (0 = off). */
  gmSkill?: number;
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
};

db.version(1).stores({
  sessions: 'id, createdAt'
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
