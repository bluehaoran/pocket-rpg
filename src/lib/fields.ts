// Reading and writing the values the wizard and Track edit: character fields, group fields,
// introduction answers and Roll for Shoes starting skills. Pure; callers wrap writes in `mutate`.
import type { Session } from './db.ts';
import type { Field, Pack } from './content/types.ts';
import {
  type CharCtx, type FieldValue, canRandom, fieldsOf, groupFieldsOf, isEmptyValue, listOf, pickSkill,
  randomValue, rfsConfig, rootSkill, skillList, syncResources
} from './characters.ts';
import { isKin, isRfs } from './characters.ts';

export type Scope = 'char' | 'group' | 'q' | 'skill';

/** Which value to edit. `char` and `skill` need the character index. */
export interface FieldRef {
  scope: Scope;
  id: string;
  ci?: number;
}

export function fieldDef(pack: Pack, rulesId: string, ref: FieldRef): Field | undefined {
  switch (ref.scope) {
    case 'char':
      return fieldsOf(pack, rulesId).find(f => f.id === ref.id);
    case 'group':
      return groupFieldsOf(pack).find(f => f.id === ref.id);
    case 'q': {
      const q = pack.story?.questions?.find(x => x.id === ref.id);
      return q && { id: q.id, label: q.text, kind: 'text', table: q.table ?? null, hint: 'Ask the table aloud. Typing the answer is optional.' };
    }
    case 'skill': {
      const k = rfsConfig(pack);
      return {
        id: ref.id,
        label: `Starting skill ${Number(ref.id) + 1}`,
        kind: 'text',
        values: skillList(pack),
        hint: `Level ${k.level}: rolls ${k.level}d6. Branches from ${rootSkill(pack)} 1.`
      };
    }
  }
}

export function getVal(s: Session, ref: FieldRef): FieldValue {
  const c = ref.ci != null ? s.characters[ref.ci] : undefined;
  switch (ref.scope) {
    case 'group':
      return s.group[ref.id] ?? '';
    case 'q':
      return s.answers[ref.id] ?? '';
    case 'skill':
      return c?.extra?.[Number(ref.id)] ?? '';
    case 'char':
      return c?.fields[ref.id] ?? '';
  }
}

export function setVal(s: Session, pack: Pack, ref: FieldRef, value: FieldValue): void {
  const c = ref.ci != null ? s.characters[ref.ci] : undefined;
  switch (ref.scope) {
    case 'group':
      s.group[ref.id] = typeof value === 'number' ? String(value) : value;
      return;
    case 'q':
      s.answers[ref.id] = String(value);
      return;
    case 'skill':
      if (c?.extra) c.extra[Number(ref.id)] = String(value);
      return;
    case 'char':
      if (!c) return;
      c.fields[ref.id] = value;
      if (!isRfs(s.rulesId) && !isKin(s.rulesId)) syncResources(pack, c);
  }
}

/** The pick list for a field, filtered by `filterBy` against the character being edited. */
export function listFor(s: Session, pack: Pack, ref: FieldRef, f: Field): string[] | null {
  const c = ref.scope === 'char' && ref.ci != null ? s.characters[ref.ci] : undefined;
  return listOf(pack, f, c?.fields);
}

/** Random new value for the referenced field (or skill). */
export function randomFor(s: Session, ctx: CharCtx, ref: FieldRef): FieldValue {
  const f = fieldDef(ctx.pack, s.rulesId, ref);
  const c = ref.ci != null ? s.characters[ref.ci] : undefined;
  if (ref.scope === 'skill') return c ? pickSkill(ctx, c, String(getVal(s, ref))) : '';
  if (!f) return '';
  return randomValue(ctx, f, getVal(s, ref), c?.fields);
}

export function canRandomFor(pack: Pack, rulesId: string, ref: FieldRef): boolean {
  if (ref.scope === 'skill') return true;
  const f = fieldDef(pack, rulesId, ref);
  return !!f && canRandom(pack, f);
}

/** Text for a value in a row or sentence; empty values show `empty`. */
export function display(v: unknown, empty = ''): string {
  if (isEmptyValue(v)) return empty;
  return Array.isArray(v) ? v.filter(Boolean).join(' & ') : String(v);
}
