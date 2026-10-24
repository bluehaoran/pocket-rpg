// Validate content/ against schemas/ and the cross-reference rules in src/lib/content/validate.ts.
// Usage: npm run validate   (exits 1 on any error)
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { resolvePacks } from '../src/lib/content/resolve.ts';
import { validatePack, validateTools } from '../src/lib/content/validate.ts';
import type { Pack, Registry, ToolList } from '../src/lib/content/types.ts';

const root = join(import.meta.dirname, '..');
const read = (p: string) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const jsonFiles = (dir: string) => readdirSync(join(root, dir)).filter(f => f.endsWith('.json')).sort();

const ajv = new Ajv2020({ allErrors: true, strict: false });
for (const f of jsonFiles('schemas')) ajv.addSchema(read(`schemas/${f}`));
const schema = (name: string) => ajv.getSchema(`https://pocket-rpg/schemas/${name}.schema.json`)!;

const errors: string[] = [];
const schemaCheck = (file: string, data: unknown, name: string) => {
  const v = schema(name);
  if (!v(data)) for (const e of v.errors ?? []) errors.push(`${file}${e.instancePath || ''}: ${e.message}`);
};

// Packs (public, plus the gitignored private folder when present)
const raw: Record<string, Pack> = {};
const packDirs = ['content/packs', 'content/private/packs'].filter(d => existsSync(join(root, d)));
for (const file of packDirs.flatMap(d => jsonFiles(d).map(f => `${d}/${f}`))) {
  const f = basename(file);
  const data = read(file) as Pack;
  schemaCheck(file, data, 'pack');
  if (data.id !== basename(f, '.json')) errors.push(`${file}: id "${data.id}" does not match the file name`);
  raw[data.id] = data;
}
for (const p of Object.values(raw)) {
  for (const e of p.extends ?? []) if (!raw[e]) errors.push(`${p.id}.json: extends missing pack ${e}`);
}
const packs = resolvePacks(raw);
let tables = 0, entries = 0;
for (const p of Object.values(packs)) {
  const r = validatePack(p);
  tables += r.tables; entries += r.entries;
  for (const e of r.errors) errors.push(`${p.id}.json: ${e}`);
}

// Tools library
const registry = read('content/tools/registry.json') as Registry;
schemaCheck('content/tools/registry.json', registry, 'registry');
const lists: Record<string, ToolList> = {};
// Public lists, then the gitignored private folder when present (same id replaces the public list).
const toolDirs = ['content/tools', 'content/private/tools'].filter(d => existsSync(join(root, d)));
for (const file of toolDirs.flatMap(d => jsonFiles(d).filter(f => f !== 'registry.json').map(f => `${d}/${f}`))) {
  const f = basename(file);
  const data = read(file) as ToolList;
  schemaCheck(file, data, 'tool-list');
  lists[basename(f, '.json')] = data;
}
const nameSettings = Object.values(raw).flatMap(p => (p.nameSetting ? [p.nameSetting] : []));
errors.push(...validateTools(registry, lists, nameSettings));

const listEntries = Object.values(lists).reduce((n, l) => n + l.entries.length, 0);
if (errors.length) {
  console.error(`✗ ${errors.length} content error${errors.length > 1 ? 's' : ''}:`);
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
console.log(`✓ ${Object.keys(raw).length} packs (${tables} tables, ${entries} entries after extends), ` +
  `${registry.tools.length} tools, ${Object.keys(lists).length} lists (${listEntries} entries)`);
