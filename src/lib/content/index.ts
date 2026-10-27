// Bundles every pack and tool list into the app at build time, so they are precached for offline play.
import { resolvePacks } from './resolve.ts';
import type { Pack, Registry, ToolList } from './types.ts';

const stem = (path: string) => path.split('/').pop()!.replace(/\.json$/, '');

// content/private/packs/ is gitignored: packs that can't be published (see NOTICE). Local builds include them if present.
const packFiles = import.meta.glob<Pack>(['../../../content/packs/*.json', '../../../content/private/packs/*.json'], {
  eager: true,
  import: 'default'
});
// content/private/tools/ is gitignored too. A private list with the same id replaces the public one.
const toolFiles = import.meta.glob<ToolList | Registry>(['../../../content/tools/*.json', '../../../content/private/tools/*.json'], {
  eager: true,
  import: 'default'
});

export const rawPacks: Record<string, Pack> = Object.fromEntries(
  Object.entries(packFiles).map(([path, p]) => [stem(path), p])
);
export const packs: Record<string, Pack> = resolvePacks(rawPacks);

export const registry = toolFiles['../../../content/tools/registry.json'] as Registry;
// Glob keys sort with private/ before tools/, so apply public lists first and private ones last to let them win.
const isPrivate = (path: string) => path.includes('/private/');
export const lists: Record<string, ToolList> = Object.fromEntries(
  Object.entries(toolFiles)
    .filter(([path]) => stem(path) !== 'registry')
    .sort(([a], [b]) => Number(isPrivate(a)) - Number(isPrivate(b)))
    .map(([path, l]) => [stem(path), l as ToolList])
);

/** Setup order for packs. Unlisted packs follow in file order. */
export const PACK_ORDER = [
  'starfarers', 'swords-and-sorcery', 'blade-and-spirit', 'moon-and-blood', 'other-tales',
  'the-heist', 'kitchen-khaos', 'minimon', 'outbreak-hotel', 'redshirt-recon', 'the-stranger',
  'kintsugi'
];

export function orderedPacks(): Pack[] {
  const all = Object.values(packs).filter(p => !p.library);
  const rank = (id: string) => {
    const i = PACK_ORDER.indexOf(id);
    return i < 0 ? PACK_ORDER.length : i;
  };
  return all.sort((a, b) => rank(a.id) - rank(b.id));
}
