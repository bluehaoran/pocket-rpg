// Guards for the CSS conventions in CLAUDE.md: colours and the focus ring come from tokens, there is one
// dark palette, and the leftover class names that never had a rule stay gone.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap(f => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const sources = walk('src').filter(f => /\.(svelte|css)$/.test(f));
const read = (f: string) => readFileSync(f, 'utf8');
const css = read('src/app.css');

describe('CSS hygiene', () => {
  it('uses the --danger token instead of a hard-coded red', () => {
    expect(css).toMatch(/--danger:/);
    const offenders = sources.filter(f => /#C0392B/i.test(read(f)) && f !== 'src/app.css');
    expect(offenders).toEqual([]);
  });

  it('draws focus rings from the --ring token', () => {
    expect(css).toMatch(/--ring:/);
    const offenders = sources.filter(f => /outline:\s*3px solid var\(--accent\)/.test(read(f)) && f !== 'src/app.css');
    expect(offenders).toEqual([]);
    expect(css.match(/outline:\s*3px solid/g) ?? []).toHaveLength(0);
  });

  it('defines the dark palette once, following the system setting (no manual override nobody can set)', () => {
    expect(css.match(/--bg:#0C0F14/gi)).toHaveLength(1);
    expect(css).not.toContain('data-theme');
  });

  it('keeps no class names that have no rule and no reader', () => {
    const dead = ['gmseg', 'rollbox', 'brandline', 'mock', 'keep'];
    for (const f of sources.filter(f => f.endsWith('.svelte'))) {
      const classes = [...read(f).matchAll(/class="([^"]*)"/g)].flatMap(m => m[1]!.split(/\s+/));
      expect(classes.filter(c => dead.includes(c)), f).toEqual([]);
    }
  });
});
