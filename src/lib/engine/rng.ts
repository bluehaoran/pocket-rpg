// Injectable randomness: engine code takes an Rng so tests can seed it.
export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
}

export const mathRng: Rng = { next: () => Math.random() };

/** Small fast seeded generator. Same seed, same sequence. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
  };
}

/** Integer in 0..n-1. */
export const randInt = (rng: Rng, n: number): number => Math.floor(rng.next() * n);

export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (!items.length) throw new Error('pick from empty list');
  return items[randInt(rng, items.length)] as T;
}

/** Roll one die with the given number of sides: 1..sides. */
export const rollDie = (rng: Rng, sides: number): number => 1 + randInt(rng, sides);
