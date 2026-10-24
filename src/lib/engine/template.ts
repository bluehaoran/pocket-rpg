// Template expansion and sentence rendering. Rules: docs/02-data-model.md §1.2, §1.6, §1.8c.
import { type Rng } from './rng.ts';

export const lowerFirst = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);
export const capFirst = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
/** "a" or "an" for the word that follows. */
export const articleFor = (word: string): 'a' | 'an' => (/^[aeiou]/i.test(word) ? 'an' : 'a');

const SLOT = /\{([\w.-]+)(\?)?(?:\|(\w+))?\}/g;

/** Table ids a template needs, not counting optional `{table?}` slots. */
export function slots(tpl: string): string[] {
  return [...tpl.matchAll(SLOT)].filter(m => !m[2]).map(m => m[1] as string);
}

/** All table ids a template mentions, optional or not. */
export function allSlots(tpl: string): string[] {
  return [...tpl.matchAll(SLOT)].map(m => m[1] as string);
}

/** The table id if the template is exactly one required slot, e.g. "{monster}". */
export function singleSlot(tpl: string): string | null {
  return tpl.match(/^\{([\w.-]+)\}$/)?.[1] ?? null;
}

export const OPTIONAL_CHANCE = 0.4;

/**
 * Expand a generator template. `{t}` draws from table t; `{t?}` is left empty with probability
 * OPTIONAL_CHANCE; `{t|lower}` lowercases the whole value. Missing values expand to nothing.
 * Whitespace is collapsed.
 */
export function expand(tpl: string, drawValue: (tableId: string) => string | null, rng: Rng): string {
  return tpl
    .replace(SLOT, (_m, id: string, opt: string | undefined, mod: string | undefined) => {
      if (opt && rng.next() < OPTIONAL_CHANCE) return '';
      const v = drawValue(id);
      if (v == null) return '';
      return mod === 'lower' ? v.toLowerCase() : v;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/** Seed sentence from the drawn column values; `case: lower` columns lowercase their first letter. */
export function seedText(seed: { columns: { case?: 'lower' }[]; template: string }, parts: readonly string[]): string {
  return seed.template.replace(/\{(\d+)\}/g, (_m, i: string) => {
    const v = parts[Number(i)] ?? '';
    return seed.columns[Number(i)]?.case === 'lower' ? lowerFirst(v) : v;
  });
}

export type SentenceToken =
  | { kind: 'br' }
  | { kind: 'text'; text: string }
  | { kind: 'field'; id: string; text: string; empty: boolean };

export interface SentenceField {
  id: string;
  label: string;
}

const isEmpty = (v: unknown): boolean => (Array.isArray(v) ? !v.filter(Boolean).length : v == null || v === '');
const show = (v: unknown): string => (Array.isArray(v) ? v.filter(Boolean).join(' & ') : String(v ?? ''));
/** "Style (ancestry)" -> "Style" */
export const shortLabel = (l: string): string => l.replace(/\s*\(.*\)\s*$/, '');

/** Default character sentence when a flavour has none. */
export function defaultSentence(rulesId: string, fieldIds: readonly string[]): string {
  const name = fieldIds.includes('name') ? '{name}\n' : '';
  if (rulesId === 'roll-for-shoes') return `${name}is {a} {concept|lower}`;
  const goal = fieldIds.includes('goal') ? ' who wants to\n{goal|lower}' : '';
  return `${name}is {a} {style|lower} {role|lower}${goal}`;
}

/**
 * Render a sentence template against a character's values.
 * Empty fields show their short label. With `plain`, empty fields are dropped along with
 * the comma that introduced them. Returns the tokens and the ids of the fields used.
 */
export function renderSentence(
  tpl: string,
  fields: readonly SentenceField[],
  values: Record<string, unknown>,
  opts: { plain?: boolean } = {}
): { tokens: SentenceToken[]; used: Set<string> } {
  const used = new Set<string>();
  type Raw = SentenceToken | { kind: 'article'; mod?: string };
  const raw: Raw[] = tpl
    .split(/(\{[\w|]+\}|\n)/)
    .filter(t => t !== '')
    .map((t): Raw => {
      if (t === '\n') return { kind: 'br' };
      const m = t.match(/^\{(\w+)(?:\|(\w+))?\}$/);
      if (!m) return { kind: 'text', text: t };
      const [, id, mod] = m as unknown as [string, string, string | undefined];
      if (id === 'a') return { kind: 'article', mod };
      const f = fields.find(x => x.id === id);
      if (!f) return { kind: 'text', text: '' };
      used.add(f.id);
      const v = values[f.id];
      const empty = isEmpty(v);
      let text = empty ? shortLabel(f.label) : show(v);
      if (!empty && mod === 'lower') text = lowerFirst(text);
      return { kind: 'field', id: f.id, text, empty };
    });

  const tokens: SentenceToken[] = [];
  raw.forEach((t, i) => {
    if (t.kind !== 'article') {
      tokens.push(t);
      return;
    }
    const next = raw.slice(i + 1).find((x): x is Extract<SentenceToken, { kind: 'field' }> => x.kind === 'field');
    const a = articleFor(next?.text ?? '');
    tokens.push({ kind: 'text', text: t.mod === 'cap' ? capFirst(a) : a });
  });

  if (opts.plain) {
    const out: SentenceToken[] = [];
    for (const t of tokens) {
      if (t.kind === 'field' && t.empty) {
        const prev = out[out.length - 1];
        if (prev?.kind === 'text') prev.text = prev.text.replace(/,\s*$/, '');
        continue;
      }
      out.push(t);
    }
    return { tokens: out, used };
  }
  return { tokens, used };
}
