import { describe, expect, it } from 'vitest';
import { seedParts } from '../src/lib/engine/template.ts';

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
