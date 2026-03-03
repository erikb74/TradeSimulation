import type { SettlementType } from '../simulation/types'
import { seededRandom, hashSeed } from '../lib/math'

const PREFIXES = [
  'Iron', 'Stone', 'Grey', 'Black', 'High', 'Old', 'North', 'South', 'East', 'West',
  'Red', 'White', 'Green', 'Cold', 'Ash', 'Crest', 'Storm', 'River', 'Oak', 'Elm',
  'Crow', 'Wolf', 'Bear', 'Stag', 'Silver', 'Golden', 'Dark', 'Bright', 'Fell', 'Moor',
  'Frost', 'Ember', 'Thorn', 'Marsh', 'Wood', 'Lake', 'Hill', 'Ridge', 'Vale', 'Glen',
]

const SUFFIXES_TOWN = [
  'hold', 'gate', 'mere', 'ford', 'wick', 'burg', 'moor', 'fell', 'crest', 'haven',
  'mouth', 'bridge', 'mill', 'keep', 'vale', 'cliff', 'watch', 'hurst', 'worth',
]

const SUFFIXES_PORT = [
  'port', 'haven', 'bay', 'harbour', 'shore', 'cove', 'mouth', 'landing', 'quay',
]

const SUFFIXES_FORTRESS = [
  'keep', 'hold', 'gate', 'wall', 'fort', 'watch', 'tower', 'bastion', 'rampart', 'ward',
]

const SUFFIXES_MONASTERY = [
  'abbey', 'priory', 'minster', 'chapel', 'cross', 'shrine', 'mount', 'hollow',
]

const SUFFIXES_VILLAGE = [
  'wick', 'ham', 'ton', 'field', 'ley', 'den', 'croft', 'thorp', 'stead', 'shaw',
]

function getSuffixes(type: SettlementType): string[] {
  switch (type) {
    case 'port':       return SUFFIXES_PORT
    case 'fortress':   return SUFFIXES_FORTRESS
    case 'monastery':  return SUFFIXES_MONASTERY
    case 'village':    return SUFFIXES_VILLAGE
    default:           return SUFFIXES_TOWN
  }
}

/**
 * Generate a settlement name based on type and seed.
 * Names follow the pattern: Prefix + Suffix (e.g., "Ironhold", "Greymere").
 */
export function generateSettlementNames(
  seed: string,
  count: number,
  types: SettlementType[],
): string[] {
  const rng = seededRandom(hashSeed(seed + '_names'))
  const used = new Set<string>()
  const names: string[] = []

  for (let i = 0; i < count; i++) {
    const type = types[i] ?? 'town'
    const suffixes = getSuffixes(type)
    let name: string
    let attempts = 0

    do {
      const prefix = PREFIXES[Math.floor(rng() * PREFIXES.length)]
      const suffix = suffixes[Math.floor(rng() * suffixes.length)]
      name = prefix + suffix
      attempts++
    } while (used.has(name) && attempts < 50)

    used.add(name)
    names.push(name)
  }

  return names
}
