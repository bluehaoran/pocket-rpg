import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { resolvePacks, nativePacks } from '../src/lib/content/resolve.ts';
import { validatePack, validateTools } from '../src/lib/content/validate.ts';
import type { Pack, Registry, ToolList } from '../src/lib/content/types.ts';

const root = join(import.meta.dirname, '..');
const load = <T>(dir: string) =>
  Object.fromEntries(
    readdirSync(join(root, dir))
      .filter(f => f.endsWith('.json'))
      .map(f => [f.replace(/\.json$/, ''), JSON.parse(readFileSync(join(root, dir, f), 'utf8')) as T])
  );

const raw = load<Pack>('content/packs');
const packs = resolvePacks(raw);
const { registry, ...lists } = load<unknown>('content/tools') as { registry: Registry } & Record<string, ToolList>;

describe('packs', () => {
  it('all validate cleanly', () => {
    for (const p of Object.values(packs)) expect(validatePack(p).errors, p.id).toEqual([]);
  });

  it('merges extends tables without mutating the raw pack', () => {
    expect(packs['swords-and-sorcery']!.tables['name.fantasy']?.length).toBeGreaterThan(0);
    expect(raw['swords-and-sorcery']!.tables['name.fantasy']).toBeUndefined();
  });

  it('lists only native packs per rule system, with no overlap', () => {
    const lf = nativePacks(packs, 'lasers-feelings').map(p => p.id);
    const rfs = nativePacks(packs, 'roll-for-shoes').map(p => p.id);
    expect(lf).toContain('starfarers');
    expect(rfs).toContain('the-heist');
    expect(lf.filter(id => rfs.includes(id))).toEqual([]);
    expect([...lf, ...rfs]).not.toContain('base-names');
  });

  it('keeps groupFields at the pack root', () => {
    for (const p of Object.values(packs)) expect(p.flavour?.['lasers-feelings']?.groupFields, p.id).toBeUndefined();
  });

  it('reports a tag value that is not declared', () => {
    const bad = structuredClone(packs['starfarers']!);
    bad.tables['name.given']![0]!.tags = { gender: 'q' };
    expect(validatePack(bad).errors.join()).toMatch(/gender=q, not a declared value/);
  });

  it('reports a generator slot that names a missing table', () => {
    const bad = structuredClone(packs['the-heist']!);
    bad.generators!.push({ id: 'oops', label: 'Oops', output: '{no.such.table}' });
    expect(validatePack(bad).errors.join()).toMatch(/missing table no\.such\.table/);
  });
});

describe('tools library', () => {
  const nameSettings = Object.values(raw).flatMap(p => (p.nameSetting ? [p.nameSetting] : []));

  it('validates cleanly', () => {
    expect(validateTools(registry, lists, nameSettings)).toEqual([]);
  });

  it('reports a registry tool pointing at a missing list', () => {
    const bad = structuredClone(registry);
    bad.tools.push({ id: 'ghost', label: 'Ghost', kind: 'list', list: 'ghosts' });
    expect(validateTools(bad, lists).join()).toMatch(/missing list ghosts/);
  });

  it('allows empty lists (complications, tilts)', () => {
    expect(lists.complications!.entries).toEqual([]);
    expect(lists.tilts!.entries).toEqual([]);
  });
});
