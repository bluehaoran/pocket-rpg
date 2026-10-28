// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { mediaInventory, resolve, specificity, styleSnapshot } from './helpers/styles.ts';

describe('specificity', () => {
  it.each([
    ['.a', [0, 1, 0]],
    ['#x .a', [1, 1, 0]],
    ['div.a b', [0, 1, 2]],
    ['a[href]', [0, 1, 1]],
    ['.a:hover', [0, 2, 0]],
    ['.a::before', [0, 1, 1]],
    ['b:where(.svelte-x)', [0, 0, 1]],
    ['.a.svelte-x', [0, 2, 0]],
    [':not(.a)', [0, 1, 0]],
    ['.a > .b ~ .c', [0, 3, 0]]
  ])('%s', (sel, want) => expect(specificity(sel)).toEqual(want));
});

function sheet(css: string) {
  document.head.innerHTML = '';
  const s = document.createElement('style');
  s.textContent = css;
  document.head.append(s);
}
function el(html: string): Element {
  document.body.innerHTML = html;
  return document.body.firstElementChild!;
}
afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('cascade', () => {
  it('prefers higher specificity over later order', () => {
    sheet('.a.b{color:red} .a{color:blue}');
    const e = el('<p class="a b"></p>');
    expect(resolve(e, [])).toEqual({});
    expect(styleSnapshot(e)).toContain('color: red');
  });

  it('prefers later order at equal specificity', () => {
    sheet('.a{color:red} .a{color:blue}');
    expect(styleSnapshot(el('<p class="a"></p>'))).toContain('color: blue');
  });

  it('counts the scoped hash class but not :where()', () => {
    sheet('.a.svelte-x{color:red} .a b:where(.svelte-x){color:blue} .a b{color:green}');
    const e = el('<div class="a svelte-x"><b class="svelte-x"></b></div>');
    const snap = styleSnapshot(e);
    expect(snap).toContain('div.a\n  color: red');
    expect(snap).toContain('b\n  color: green');
  });

  it('lets `all: unset` clear earlier declarations but keep later ones', () => {
    sheet('.a{color:red;padding:4px} .a{all:unset;display:grid}');
    const snap = styleSnapshot(el('<button class="a"></button>'));
    expect(snap).toContain('all: unset');
    expect(snap).toContain('display: grid');
    expect(snap).not.toContain('color');
    expect(snap).not.toContain('padding');
  });

  it('applies !important before specificity', () => {
    sheet('.a{color:red!important} #x{color:blue}');
    expect(styleSnapshot(el('<p id="x" class="a"></p>'))).toContain('color: red');
  });

  it('ignores the hash class in the element label so moving CSS does not rename elements', () => {
    sheet('.a{color:red}');
    expect(styleSnapshot(el('<p class="svelte-abc a"></p>'))).toContain('p.a\n');
  });
});

describe('mediaInventory', () => {
  it('lists media rules and keyframes without their selectors', () => {
    sheet('@media (min-width:600px){.app.svelte-q{color:red}} @keyframes svelte-q-rise{from{opacity:.6}}');
    const inv = mediaInventory();
    expect(inv).toContain('@media (min-width:600px) { color: red }');
    expect(inv).toContain('@keyframes rise');
  });
});
