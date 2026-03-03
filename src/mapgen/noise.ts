import { createNoise2D } from 'simplex-noise'
import { hashSeed, seededRandom } from '../lib/math'

export interface Noise2D {
  (x: number, y: number): number  // returns 0–1
}

/**
 * Create a seeded 2D noise function.
 * Returns values in [0, 1] (shifted from simplex's [-1, 1] range).
 */
export function createSeededNoise(seed: string, offset: number = 0): Noise2D {
  const numericSeed = hashSeed(seed + offset)
  const rng = seededRandom(numericSeed)
  const noise = createNoise2D(rng)
  return (x: number, y: number) => (noise(x, y) + 1) / 2
}

/**
 * Layered fractal noise — combines multiple octaves for more natural-looking terrain.
 * Higher octaves add fine detail; persistence controls how much each octave contributes.
 */
export function fractalNoise(
  noise: Noise2D,
  x: number,
  y: number,
  octaves: number = 4,
  persistence: number = 0.5,
  scale: number = 1,
): number {
  let value = 0
  let amplitude = 1
  let frequency = scale
  let maxValue = 0

  for (let i = 0; i < octaves; i++) {
    value += noise(x * frequency, y * frequency) * amplitude
    maxValue += amplitude
    amplitude *= persistence
    frequency *= 2
  }

  return value / maxValue  // normalize to [0, 1]
}
