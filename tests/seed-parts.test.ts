import { describe, expect, it } from 'vitest';
import { seedColumnText, seedParts } from '../src/lib/engine/template.ts';

describe('seedParts', () => {
  it('glues punctuation after a slot to that slot', () => {
    expect(seedParts('{0} wants to {1} the {2}, which will {3}.')).toEqual([
      { col: 0, trail: '' },
      { text: ' wants to ' },
      { col: 1, trail: '' },
      { text: ' the ' },
      { col: 2, trail: ',' },
      { text: ' which will ' },
      { col: 3, trail: '.' },
    ]);
  });
});

describe('seedColumnText', () => {
  const seed = { columns: [{}, { case: 'lower' as const }] };

  it('returns the value as drawn when the column has no case rule', () => {
    expect(seedColumnText(seed, ['A Robot', 'Find A Cure'], 0)).toBe('A Robot');
  });

  it('lower-cases only the first letter for case: lower columns', () => {
    expect(seedColumnText(seed, ['A Robot', 'Find A Cure'], 1)).toBe('find A Cure');
  });

  it('is empty when the seed has not been rolled or the column is missing', () => {
    expect(seedColumnText(seed, undefined, 1)).toBe('');
    expect(seedColumnText(seed, ['x'], 1)).toBe('');
    expect(seedColumnText(seed, ['x'], 5)).toBe('');
  });
});
