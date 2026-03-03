import type { Season, BuildingType } from './types'
import { TICKS_PER_SEASON } from '../lib/constants'

export function getSeason(slowTick: number): Season {
  const index = Math.floor(slowTick / TICKS_PER_SEASON) % 4
  return (['spring', 'summer', 'autumn', 'winter'] as const)[index]
}

export function getYear(slowTick: number): number {
  return Math.floor(slowTick / (TICKS_PER_SEASON * 4)) + 1
}

export function getDayOfSeason(slowTick: number): number {
  return (slowTick % TICKS_PER_SEASON) + 1
}

// How seasons multiply production output for a given building type.
// 1.0 = normal; <1 = reduced; >1 = bumper output.
export function seasonProductionMultiplier(type: BuildingType, season: Season): number {
  const farmBuildings: BuildingType[] = [
    'grain_farm', 'cattle_ranch', 'sheep_ranch', 'herb_garden', 'vineyard', 'apiary',
  ]
  const mineBuildings: BuildingType[] = ['iron_mine', 'stone_quarry']
  const coastBuildings: BuildingType[] = ['fishing_wharf', 'salt_pans']
  const forestBuildings: BuildingType[] = ['logging_camp']

  if (farmBuildings.includes(type)) {
    switch (season) {
      case 'spring': return 0.6   // planting — minimal output yet
      case 'summer': return 1.0   // growing
      case 'autumn': return 1.5   // harvest surplus
      case 'winter': return 0.1   // nothing grows
    }
  }
  if (mineBuildings.includes(type)) {
    switch (season) {
      case 'spring': return 0.9
      case 'summer': return 1.0
      case 'autumn': return 0.9
      case 'winter': return 0.7   // frozen ground, harder digging
    }
  }
  if (coastBuildings.includes(type)) {
    switch (season) {
      case 'spring': return 1.1
      case 'summer': return 1.2   // calm seas
      case 'autumn': return 0.9
      case 'winter': return 0.5   // storms
    }
  }
  if (forestBuildings.includes(type)) {
    switch (season) {
      case 'spring': return 1.0
      case 'summer': return 1.0
      case 'autumn': return 1.1   // dry wood easier to work
      case 'winter': return 0.6   // snow-covered forest
    }
  }
  // Processing / crafting buildings are mostly indoors — season effect is small
  switch (season) {
    case 'spring': return 1.0
    case 'summer': return 1.0
    case 'autumn': return 1.0
    case 'winter': return 0.85  // cold slows indoor work slightly
  }
}

// How seasons affect caravan travel speed (multiplier on base speed).
export function seasonSpeedMultiplier(season: Season): number {
  switch (season) {
    case 'spring': return 1.1   // dry roads after winter thaw
    case 'summer': return 1.0
    case 'autumn': return 0.85  // mud from autumn rains
    case 'winter': return 0.55  // snow, ice, short days
  }
}
