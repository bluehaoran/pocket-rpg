// Minimal hash router. Hash routing works on GitHub Pages and offline without server rewrites.
// Routes: #/track, #/tools, #/tools/<toolId>, #/packs, #/packs/<packId>

export interface Route {
  tab: 'track' | 'tools';
  /** Path segments after the tab, e.g. ['names'] for #/tools/names. */
  rest: string[];
  /** Overlay pages reached from the header menu. */
  page?: 'packs';
}

function parse(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [head, ...rest] = parts;
  if (head === 'packs') return { tab: 'track', rest, page: 'packs' };
  if (head === 'tools') return { tab: 'tools', rest };
  return { tab: 'track', rest: head === 'track' ? rest : [] };
}

export const router = $state({ route: parse(typeof location === 'undefined' ? '' : location.hash) });

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    router.route = parse(location.hash);
  });
}

export function go(path: string) {
  location.hash = path.startsWith('#') ? path : '#' + path;
}

export const href = (path: string) => '#' + path;
