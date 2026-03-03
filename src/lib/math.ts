/** Clamp value between min and max (inclusive). */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** Linear interpolation between a and b by t (0–1). */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1)
}

/** Mulberry32 — fast seeded PRNG returning values in [0, 1). */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s += 0x6d2b79f5
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000
  }
}

/**
 * Convert a string seed into a numeric seed deterministically.
 * Uses djb2 hash.
 */
export function hashSeed(seed: string): number {
  let h = 5381
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h) ^ seed.charCodeAt(i)
  }
  return h >>> 0 // unsigned 32-bit
}

/** Pick a random integer in [min, max] inclusive using a PRNG function. */
export function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

/** Pick a random element from an array using a PRNG function. */
export function randChoice<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

/** Euclidean distance between two 2D points. */
export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2)
}

/** Format a number with commas for display (e.g., 12345 → "12,345"). */
export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}

/** Format gold amount with a sign prefix for ledger display. */
export function formatGold(n: number): string {
  const sign = n >= 0 ? '+' : ''
  return `${sign}${formatNumber(n)}g`
}
