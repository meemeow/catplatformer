/**
 * Linear-congruential generator. Tile art needs randomness that is identical
 * on every frame and every reload, so `Math.random` is not an option.
 */
export const createSeededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return (state & 0xffff) / 0xffff;
  };
};

/** Seed derived from a tile coordinate plus an art variant. */
export const tileSeed = (tx: number, ty: number, variantShift: number): number =>
  ((tx & 255) << 8) ^ (ty & 255) ^ variantShift;

/** Picks one of four art variants for a tile, deterministically. */
export const tileVariant = (tx: number, ty: number, a: number, b: number): number =>
  (tx * a + ty * b) & 3;
