// Cross-reference checks that JSON Schema can't express. Shared by scripts/validate.ts (CI)
// and the Pack details screen. Ported from the mockup's validate().
import type { Entry, Field, ModifierDecl, Pack, Registry, ToolList } from './types.ts';

export interface Report {
  errors: string[];
  tables: number;
  entries: number;
}

const KINDS = new Set(['pick', 'pick-or-text', 'multi', 'number', 'text']);
const SLOT = /\{([\w.-]+)\??(?:\|\w+)?\}/g;

function checkTags(where: string, entries: Entry[], mods: Record<string, ModifierDecl> | undefined, errs: string[]) {
  for (const e of entries) {
    for (const [k, val] of Object.entries(e.tags ?? {})) {
      const m = mods?.[k];
      if (!m) {
        errs.push(`${where}: "${e.v}" uses tag "${k}", which is not a declared modifier`);
        continue;
      }
      for (const x of ([] as string[]).concat(val)) {
        if (!m.values.includes(x)) errs.push(`${where}: "${e.v}" has ${k}=${x}, not a declared value`);
      }
    }
  }
}

/** Validate one pack after `extends` has been resolved. */
export function validatePack(p: Pack): Report {
  const errs: string[] = [];
  const T = p.tables ?? {};
  const ids = Object.keys(T);
  const gens = new Set((p.generators ?? []).map(g => g.id));
  let entries = 0;

  for (const id of ids) {
    entries += T[id]!.length;
    checkTags(id, T[id]!, p.modifiers, errs);
  }
  const ref = (id: string | null | undefined, where: string) => {
    if (id && !T[id]) errs.push(`${where} references missing table ${id}`);
  };
  const refGen = (id: string | undefined, where: string) => {
    if (id && !gens.has(id)) errs.push(`${where} references missing generator ${id}`);
  };

  for (const g of p.generators ?? []) {
    for (const m of g.output.matchAll(SLOT)) ref(m[1], `generator "${g.id}"`);
    for (const mu of g.modifiers ?? []) {
      if (!p.modifiers?.[mu.key]) errs.push(`generator "${g.id}" uses undeclared modifier ${mu.key}`);
    }
  }
  for (const c of p.seed?.columns ?? []) ref(c.table, `seed column "${c.label}"`);

  const checkFields = (list: Field[], name: string) => {
    for (const x of list) {
      if (!KINDS.has(x.kind)) errs.push(`${name}.${x.id}: unknown kind "${x.kind}"`);
      ref(x.table, `${name}.${x.id}`);
      ref(x.examples, `${name}.${x.id}.examples`);
      refGen(x.generator, `${name}.${x.id}`);
      for (const k of x.filterBy ?? []) {
        if (!list.some(o => o.id === k)) errs.push(`${name}.${x.id}.filterBy references unknown field ${k}`);
        if (!p.modifiers?.[k]) errs.push(`${name}.${x.id}.filterBy ${k} is not a declared modifier`);
      }
    }
  };
  checkFields(p.groupFields ?? [], 'groupFields');
  for (const q of p.story?.questions ?? []) ref(q.table, `story question "${q.id}"`);
  for (const sg of p.story?.segments ?? []) for (const g of sg.tables ?? []) refGen(g, `story segment "${sg.name}"`);

  if (!p.library) {
    if (!p.genre) errs.push('pack has no genre');
    if (!p.flavour?.['lasers-feelings'] && !p.flavour?.['roll-for-shoes'] && !p.flavour?.kintsugi) errs.push('pack has no rules flavour');
  }

  const r = p.flavour?.['roll-for-shoes'];
  if (r) {
    checkFields(r.fields ?? [], 'roll-for-shoes.fields');
    ref(r.starterSkills?.table, 'roll-for-shoes.starterSkills');
  }
  if (p.flavour?.kintsugi) checkFields(p.flavour.kintsugi.fields ?? [], 'kintsugi.fields');
  const f = p.flavour?.['lasers-feelings'];
  if (f) {
    if (!Array.isArray(f.checks) || f.checks.length !== 2) errs.push('lasers-feelings.checks must have exactly two checks');
    else if (new Set(f.checks.map(c => c.roll)).size !== 2) errs.push('lasers-feelings.checks must have one "under" and one "over"');
    checkFields(f.fields ?? [], 'lasers-feelings.fields');
    if (f.groupFields) errs.push('lasers-feelings.groupFields: move to the pack root');
    if (!(f.fields ?? []).some(x => x.kind === 'number')) errs.push('lasers-feelings.fields has no number field');
    if (typeof f.exact?.questions === 'string') ref(f.exact.questions, 'exact.questions');
    for (const res of f.resources ?? []) {
      for (const k of Object.keys(res.appliesTo ?? {})) {
        if (!(f.fields ?? []).some(x => x.id === k)) errs.push(`resource "${res.id}" appliesTo unknown field ${k}`);
      }
    }
  }
  return { errors: errs, tables: ids.length, entries };
}

/** Validate the tools library: registry references and list tags. */
export function validateTools(registry: Registry, lists: Record<string, ToolList>, nameSettings: string[] = []): string[] {
  const errs: string[] = [];
  const ids = new Set<string>();
  for (const [file, l] of Object.entries(lists)) {
    if (l.id !== file) errs.push(`tools/${file}.json: id "${l.id}" does not match the file name`);
    checkTags(`tools/${file}`, l.entries, l.modifiers, errs);
  }
  for (const t of registry.tools) {
    if (ids.has(t.id)) errs.push(`registry: duplicate tool id ${t.id}`);
    ids.add(t.id);
    if (t.kind === 'dice') {
      if (!t.dice) errs.push(`registry: dice tool "${t.id}" has no dice block`);
      continue;
    }
    const list = t.list ? lists[t.list] : undefined;
    if (!list) {
      errs.push(`registry: tool "${t.id}" references missing list ${t.list}`);
      continue;
    }
    for (const m of t.modifiers ?? []) {
      if (m.key !== 'letter' && !list.modifiers[m.key]) errs.push(`registry: tool "${t.id}" uses modifier ${m.key}, not declared in tools/${t.list}.json`);
    }
    for (const part of t.parts ?? []) {
      const pl = lists[part.list];
      if (!pl) {
        errs.push(`registry: tool "${t.id}" part "${part.key}" references missing list ${part.list}`);
        continue;
      }
      for (const k of part.filterBy ?? []) {
        if (!pl.modifiers[k]) errs.push(`registry: part "${part.key}" filters by ${k}, not declared in tools/${part.list}.json`);
      }
    }
  }
  for (const t of registry.tools) {
    if (t.followUp && !ids.has(t.followUp.tool)) errs.push(`registry: tool "${t.id}" followUp references missing tool ${t.followUp.tool}`);
  }
  const settings = lists.names?.modifiers.setting?.values ?? [];
  for (const s of nameSettings) {
    if (!settings.includes(s)) errs.push(`pack nameSetting "${s}" is not a setting in tools/names.json`);
  }
  return errs;
}
