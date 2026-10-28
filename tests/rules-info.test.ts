import { describe, expect, it } from 'vitest';
import { RULES } from '../src/lib/content/types.ts';
import { RULES_INFO, runs } from '../src/lib/rulesInfo.ts';

describe('RULES_INFO', () => {
  it('describes every rule system, with the one-line and longer blurbs the New session page shows', () => {
    for (const id of Object.keys(RULES) as (keyof typeof RULES)[]) {
      const info = RULES_INFO[id];
      expect(info, id).toBeDefined();
      expect(info.short.length, `${id} short`).toBeGreaterThan(0);
      expect(info.more.length, `${id} more`).toBeGreaterThan(0);
      expect(info.by, `${id} by`).toBeTruthy();
      expect(info.url, `${id} url`).toMatch(/^https:\/\//);
      expect(info.paragraphs.length, `${id} paragraphs`).toBeGreaterThan(0);
    }
  });
});

describe('runs', () => {
  it('splits _italic_ markup into plain and italic runs', () => {
    expect(runs('a _b_ c')).toEqual([{ t: 'a ', em: false }, { t: 'b', em: true }, { t: ' c', em: false }]);
    expect(runs('plain')).toEqual([{ t: 'plain', em: false }]);
    expect(runs('_all_')).toEqual([{ t: 'all', em: true }]);
  });
});
