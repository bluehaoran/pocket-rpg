// Style-regression helper. jsdom's getComputedStyle ignores specificity and `all`, so this resolves the
// cascade itself from the stylesheets Vitest injects (global app.css first, then each component's scoped
// block, as in the production bundle). It exists to prove that moving CSS between files changes nothing.
import postcss, { type AtRule, type ChildNode, type Rule } from 'postcss';

type Spec = [number, number, number];
interface Entry {
  selectors: string[];
  decls: { prop: string; value: string; important: boolean }[];
  order: number;
}

/** Removes a balanced `:name( … )` group, or unwraps it when `keep` is set. */
function stripGroups(sel: string, name: string, keep: boolean): string {
  const needle = `:${name}(`;
  for (let at = sel.indexOf(needle); at !== -1; at = sel.indexOf(needle)) {
    let depth = 1;
    let i = at + needle.length;
    while (i < sel.length && depth) depth += sel[i] === '(' ? 1 : sel[i] === ')' ? -1 : 0, i++;
    const inner = sel.slice(at + needle.length, i - 1);
    sel = sel.slice(0, at) + (keep ? ` ${inner} ` : '') + sel.slice(i);
  }
  return sel;
}

export function specificity(selector: string): Spec {
  let s = stripGroups(selector, 'where', false);
  for (const n of ['is', 'not', 'has']) s = stripGroups(s, n, true);
  s = s.replace(/"[^"]*"|'[^']*'/g, '');
  const ids = (s.match(/#[\w-]+/g) ?? []).length;
  const attrs = (s.match(/\[[^\]]*\]/g) ?? []).length;
  const classes = (s.match(/\.[\w-]+/g) ?? []).length;
  const pseudoClasses = (s.match(/(?<!:):[\w-]+/g) ?? []).length;
  const noAttr = s.replace(/\[[^\]]*\]/g, '');
  const types = (noAttr.match(/(^|[\s>+~,])[a-zA-Z][\w-]*/g) ?? []).length + (s.match(/::[\w-]+/g) ?? []).length;
  return [ids, classes + attrs + pseudoClasses, types];
}

const cmp = (a: Spec, b: Spec) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

function collect(): Entry[] {
  const out: Entry[] = [];
  let order = 0;
  const visit = (nodes: ChildNode[]) => {
    for (const n of nodes) {
      if (n.type === 'rule') {
        const r = n as Rule;
        const decls = r.nodes.flatMap(d => (d.type === 'decl' ? [{ prop: d.prop, value: d.value, important: !!d.important }] : []));
        out.push({ selectors: r.selectors, decls, order: order++ });
      } else if (n.type === 'atrule') {
        const a = n as AtRule;
        // Media queries and keyframes are inventoried separately (see mediaInventory).
        if (a.name === 'supports' || a.name === 'layer') visit(a.nodes ?? []);
      }
    }
  };
  for (const el of document.querySelectorAll('style')) visit(postcss.parse(el.textContent ?? '').nodes);
  return out;
}

const hash = /\.svelte-[a-z0-9]+/g;
const unhash = (s: string) => s.replace(hash, '').replace(/:where\(\)/g, '');

/** The declarations that win for one element, after specificity, source order, !important and `all`. */
export function resolve(el: Element, entries: Entry[]): Record<string, string> {
  const hits: { spec: Spec; imp: boolean; order: number; i: number; prop: string; value: string }[] = [];
  for (const e of entries) {
    let best: Spec | undefined;
    for (const sel of e.selectors) {
      let ok = false;
      try {
        ok = el.matches(sel);
      } catch {
        ok = false;
      }
      if (ok) {
        const sp = specificity(sel);
        if (!best || cmp(sp, best) > 0) best = sp;
      }
    }
    if (best) e.decls.forEach((d, i) => hits.push({ spec: best!, imp: d.important, order: e.order, i, prop: d.prop, value: d.value }));
  }
  hits.sort((a, b) => Number(a.imp) - Number(b.imp) || cmp(a.spec, b.spec) || a.order - b.order || a.i - b.i);
  const result: Record<string, string> = {};
  for (const h of hits) {
    if (h.prop === 'all') {
      for (const k of Object.keys(result)) delete result[k];
      result.all = h.value;
    } else result[h.prop] = h.value;
  }
  return result;
}

/** The winning declarations for one element, from the stylesheets currently in the document. */
export const resolveFor = (el: Element): Record<string, string> => resolve(el, collect());

const label = (el: Element) => {
  const cls = [...el.classList].filter(c => !/^svelte-/.test(c)).sort();
  return el.tagName.toLowerCase() + (cls.length ? '.' + cls.join('.') : '');
};

/** One block per styled element, in document order: `html > body > div.app > …` then its winning declarations. */
export function styleSnapshot(root: Element = document.body): string {
  const entries = collect();
  const lines: string[] = [];
  const walk = (el: Element, path: string[]) => {
    const here = [...path, label(el)];
    const decls = resolve(el, entries);
    const keys = Object.keys(decls).sort();
    if (keys.length) {
      lines.push(here.slice(-4).join(' > '));
      for (const k of keys) lines.push(`  ${k}: ${decls[k]!.replace(/\bsvelte-[a-z0-9]+-(?=[a-z])/g, '')}`);
    }
    for (const c of el.children) walk(c, here);
  };
  walk(root, []);
  return lines.join('\n') + '\n';
}

/** Every @media block and @keyframes, by condition and declarations, ignoring where the selector lives. */
export function mediaInventory(): string {
  const out: string[] = [];
  const scan = (nodes: ChildNode[]) => {
    for (const n of nodes) {
      if (n.type !== 'atrule') continue;
      const a = n as AtRule;
      if (a.name === 'media') {
        for (const r of a.nodes ?? []) {
          if (r.type === 'rule') out.push(`@media ${a.params} { ${(r as Rule).nodes.flatMap(d => (d.type === 'decl' ? [`${d.prop}: ${d.value}`] : [])).join('; ')} }`);
        }
      } else if (a.name === 'keyframes' || a.name.endsWith('-keyframes')) {
        out.push(`@keyframes ${a.params.replace(/^svelte-[a-z0-9]+-/, '')} { ${a.nodes?.map(k => k.toString().replace(/\s+/g, '').replace(/;?}$/, '}')).join(' ')} }`);
      } else scan(a.nodes ?? []);
    }
  };
  for (const el of document.querySelectorAll('style')) scan(postcss.parse(el.textContent ?? '').nodes);
  return [...new Set(out.map(unhash))].sort().join('\n') + '\n';
}
