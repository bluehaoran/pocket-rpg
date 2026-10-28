// The one reactive session store. Screens read `app.session` and change it through `mutate`,
// which schedules a debounced save to IndexedDB (docs/02-data-model.md §3).
import { currentSession, newSession, saveSession, type Session } from './db.ts';
import { orderedPacks, packs } from './content/index.ts';
import { RULES, type Pack, type RulesId } from './content/types.ts';
import { initEdits } from './edits.svelte.ts';

export const app = $state<{ session: Session | undefined; ready: boolean }>({ session: undefined, ready: false });

/** The session's first pack. Only call once a session is loaded (everything past the loading screen). */
export const currentPack = (): Pack => packs[app.session?.packIds[0] ?? '']!;

export const SAVE_DELAY_MS = 400;
/** Under constant activity the debounce would never fire, so a pending change is saved after at most this long. */
export const MAX_WAIT_MS = 2000;
let timer: ReturnType<typeof setTimeout> | undefined;
let pendingSince = 0;

/** A fresh unstarted session on the first pack in setup order. M4's wizard edits it in place. */
export function defaultSession(): Session {
  const pack = orderedPacks()[0];
  if (!pack) throw new Error('No packs bundled');
  const rulesId = (Object.keys(RULES) as RulesId[]).find(r => pack.flavour?.[r]);
  if (!rulesId) throw new Error(`Pack ${pack.id} has no rules flavour`);
  return newSession(pack.id, rulesId);
}

/** Load the latest session, or create and save one on first run. */
export async function initSession(): Promise<void> {
  await initEdits();
  let s = await currentSession();
  if (!s) {
    s = defaultSession();
    await saveSession(s);
  }
  app.session = s;
  app.ready = true;
}

/** Change the session, then save shortly after. */
export function mutate(fn: (s: Session) => void): void {
  if (!app.session) return;
  fn(app.session);
  const now = Date.now();
  if (timer === undefined) pendingSince = now;
  clearTimeout(timer);
  timer = setTimeout(() => void flush(), Math.max(0, Math.min(SAVE_DELAY_MS, pendingSince + MAX_WAIT_MS - now)));
}

/** Save now, cancelling any pending debounced save. */
export async function flush(): Promise<void> {
  clearTimeout(timer);
  timer = undefined;
  if (app.session) await saveSession($state.snapshot(app.session));
}

/** Replace the current session with a new unstarted one. The old one stays in IndexedDB. */
export async function startNewSession(): Promise<void> {
  await flush();
  const next = defaultSession();
  // Sort strictly after the previous session even within the same millisecond.
  if (app.session && next.createdAt <= app.session.createdAt) {
    next.createdAt = new Date(Date.parse(app.session.createdAt) + 1).toISOString();
  }
  await saveSession(next);
  app.session = next;
}

/** Save when the page is hidden or closing, so a pending debounce is never lost. */
export function bindLifecycle(): void {
  addEventListener('pagehide', () => void flush());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush();
  });
}

const RULES_SHORT: Record<string, string> = { 'lasers-feelings': 'L&F', 'roll-for-shoes': 'RfS', kintsugi: 'Kintsugi' };

/** Header chip: genre · rules · players. Blank until play has started. */
export function chipText(s: Session | undefined): string {
  if (!s?.started) return '';
  const pack = packs[s.packIds[0] ?? ''];
  const genre = pack?.genre ?? pack?.name ?? '?';
  return `${genre} · ${RULES_SHORT[s.rulesId] ?? s.rulesId} · ${s.players} ${s.players === 1 ? 'player' : 'players'}`;
}
