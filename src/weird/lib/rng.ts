/** Small seeded PRNG — every scratchcard gets the same latex for the same seed. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth value noise on a wrapping 256² lattice. Returns 0..1. */
export function valueNoise(seed: number) {
  const size = 256;
  const mask = size - 1;
  const rand = mulberry32(seed);
  const table = new Float32Array(size * size);
  for (let i = 0; i < table.length; i++) table[i] = rand();
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const x0 = xi & mask;
    const x1 = (xi + 1) & mask;
    const y0 = (yi & mask) * size;
    const y1 = ((yi + 1) & mask) * size;
    const a = table[y0 + x0];
    const b = table[y0 + x1];
    const c = table[y1 + x0];
    const d = table[y1 + x1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
