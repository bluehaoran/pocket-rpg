import type { Pack } from './types.ts';

/**
 * Merge `extends` tables into each pack (docs/02-data-model.md §1.2).
 * Tables from listed packs are appended; the same table id concatenates entries.
 * Returns new objects; the raw packs are not mutated.
 */
export function resolvePacks(raw: Record<string, Pack>): Record<string, Pack> {
  const out: Record<string, Pack> = {};
  for (const [id, pack] of Object.entries(raw)) {
    const tables: Pack['tables'] = {};
    for (const [t, rows] of Object.entries(pack.tables)) tables[t] = [...rows];
    for (const baseId of pack.extends ?? []) {
      const base = raw[baseId];
      if (!base) continue;
      for (const [t, rows] of Object.entries(base.tables)) tables[t] = [...(tables[t] ?? []), ...rows];
    }
    out[id] = { ...pack, tables };
  }
  return out;
}

/** Packs offered on Setup: not libraries, and native to the rule system (§1.8d). */
export function nativePacks(packs: Record<string, Pack>, rulesId: string): Pack[] {
  return Object.values(packs).filter(
    p => !p.library && !!p.flavour?.[rulesId as keyof NonNullable<Pack['flavour']>]
  );
}
