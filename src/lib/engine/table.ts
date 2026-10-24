// Table engine: filtering by modifier tags, drawing with a no-repeat window, relaxing modifiers.
// Rules: docs/02-data-model.md §1.2 and docs/05-tools-library.md §5.
import type { Entry } from '../content/types.ts';
import { pick, type Rng } from './rng.ts';

/** Chosen modifier values by key. Unset, null and '' mean "no filter". */
export type Selection = Record<string, string | null | undefined>;

/** Per-session recent values, keyed by table id or `lib:<listId>`. */
export type Recent = Record<string, string[]>;

export const NO_REPEAT = 3;

/** First letter of an entry, upper-cased, ignoring a leading "The ". */
export const initial = (v: string): string => v.replace(/^the\s+/i, '').charAt(0).toUpperCase();

/**
 * An entry matches if, for every selected key, its tag equals the value or is an array containing it.
 * An entry with no tag for a key matches any value. `letter` is built in and matches on the entry text.
 */
export function matches(e: Entry, sel: Selection = {}): boolean {
  for (const [k, v] of Object.entries(sel)) {
    if (v == null || v === '') continue;
    if (k === 'letter') {
      if (initial(e.v) !== v.toUpperCase()) return false;
      continue;
    }
    const t = e.tags?.[k];
    if (t == null) continue;
    if (Array.isArray(t) ? !t.includes(v) : t !== v) return false;
  }
  return true;
}

export const pool = (entries: readonly Entry[], sel: Selection = {}): Entry[] => entries.filter(e => matches(e, sel));

/** Letters that have at least one entry under the other selected modifiers (for the A–Z sheet). */
export function availableLetters(entries: readonly Entry[], sel: Selection = {}): Set<string> {
  return new Set(pool(entries, { ...sel, letter: null }).map(e => initial(e.v)));
}

/** Remember `v` as the newest recent value for `key`, keeping `window` values. */
export function remember(recent: Recent, key: string, v: string, window = NO_REPEAT): void {
  const r = (recent[key] ?? []).filter(x => x !== v);
  r.unshift(v);
  recent[key] = r.slice(0, window);
}

export interface DrawOpts {
  rng: Rng;
  /** With `key`, avoids the last `window` draws and records this one. */
  recent?: Recent;
  key?: string;
  window?: number;
  /** Values that must not be returned if anything else matches (e.g. the result on screen). */
  avoid?: readonly string[];
  /** If true, never return an avoided value; returns null instead of repeating (distinct picks). */
  strict?: boolean;
}

/**
 * Draw one entry. Preference order: not recent and not avoided; not avoided; anything in the pool.
 * With `strict`, the last step is skipped.
 */
export function draw(entries: readonly Entry[], sel: Selection, opts: DrawOpts): Entry | null {
  const all = pool(entries, sel);
  if (!all.length) return null;
  const avoid = opts.avoid ?? [];
  const recent = opts.recent && opts.key ? (opts.recent[opts.key] ?? []) : [];
  let c = all.filter(e => !avoid.includes(e.v) && !recent.includes(e.v));
  if (!c.length) c = all.filter(e => !avoid.includes(e.v));
  if (!c.length && !opts.strict) c = all;
  if (!c.length) return null;
  const e = pick(opts.rng, c);
  if (opts.recent && opts.key) remember(opts.recent, opts.key, e.v, opts.window);
  return e;
}

export interface ModDecl {
  key: string;
  required?: boolean;
}

/**
 * Drop optional selections in declaration order until `ok(sel)` is true.
 * Returns a new selection; `relaxed` says whether anything was dropped.
 */
export function relax(decls: readonly ModDecl[], sel: Selection, ok: (sel: Selection) => boolean): { sel: Selection; relaxed: boolean } {
  const out: Selection = { ...sel };
  let relaxed = false;
  for (const d of decls) {
    if (ok(out)) break;
    if (!d.required && out[d.key]) {
      delete out[d.key];
      relaxed = true;
    }
  }
  return { sel: out, relaxed };
}
