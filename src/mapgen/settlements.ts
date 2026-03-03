import type { Settlement, SettlementType, MapTile, River, GoodId, Building, BuildingType } from '../simulation/types'
import { GOODS } from '../simulation/goods'
import { BUILDINGS } from '../simulation/buildings'
import { initializePrices } from '../simulation/pricing'
import { isLand } from './terrain'
import { seededRandom, hashSeed, distance } from '../lib/math'
import { settlementId, buildingId } from '../lib/ids'

/**
 * Score a tile's desirability as a settlement location.
 */
function scoreTile(tile: MapTile, grid: MapTile[][], rivers: River[], existingPositions: {x:number,y:number}[]): number {
  if (!isLand(tile)) return -999

  let score = 0

  // River proximity is highly desirable (water, mill sites, trade routes)
  if (tile.riverAdjacent) score += 3
  if (tile.terrain === 'coast') score += 3
  if (tile.terrain === 'plains') score += 2
  if (tile.terrain === 'hills') score += 1
  if (tile.terrain === 'mountains') score -= 2
  if (tile.terrain === 'marsh') score -= 1

  // Fertile land is good for settlements
  score += tile.moisture * 1.5
  score += tile.temperature * 1.0

  // Avoid clustering — penalize proximity to existing settlements
  for (const pos of existingPositions) {
    const d = distance(tile.x, tile.y, pos.x, pos.y)
    if (d < 8) return -999  // too close — disqualify
    if (d < 15) score -= 2
  }

  return score
}

/**
 * Infer settlement type from its tile characteristics.
 */
function inferSettlementType(tile: MapTile, rng: () => number): SettlementType {
  if (tile.terrain === 'coast') return 'port'
  if (tile.terrain === 'mountains') return 'fortress'
  if (tile.terrain === 'hills' && rng() < 0.35) return 'fortress'
  if (rng() < 0.08) return 'monastery'
  if (rng() < 0.25) return 'village'
  return 'town'
}

/**
 * Determine which buildings a settlement starts with based on its terrain.
 */
function getStartingBuildings(tile: MapTile, type: SettlementType, rng: () => number): BuildingType[] {
  const buildings: BuildingType[] = ['warehouse'] // all settlements start with a warehouse

  // Terrain-based production buildings
  switch (tile.terrain) {
    case 'plains':
      buildings.push('grain_farm')
      if (rng() < 0.6) buildings.push('windmill')
      if (rng() < 0.4) buildings.push('cattle_ranch')
      if (rng() < 0.3) buildings.push('bakery')
      break
    case 'forest':
      buildings.push('logging_camp')
      if (rng() < 0.5) buildings.push('sawmill')
      if (rng() < 0.3) buildings.push('hunting_camp' as BuildingType) // not defined yet — skip
      break
    case 'hills':
      if (rng() < 0.7) buildings.push('iron_mine')
      if (rng() < 0.5) buildings.push('stone_quarry')
      if (rng() < 0.4) buildings.push('smelter')
      break
    case 'mountains':
      buildings.push('iron_mine')
      buildings.push('stone_quarry')
      if (rng() < 0.4) buildings.push('smelter')
      break
    case 'coast':
      buildings.push('fishing_wharf')
      if (rng() < 0.5) buildings.push('salt_pans')
      if (rng() < 0.4) buildings.push('smokehouse')
      break
    case 'marsh':
      buildings.push('salt_pans')
      if (rng() < 0.4) buildings.push('fishing_wharf')
      break
  }

  // River-adjacent settlements get mills
  if (tile.riverAdjacent && rng() < 0.5) {
    if (!buildings.includes('windmill')) buildings.push('windmill')
  }

  // Add a blacksmith to some settlements (critical for tools)
  if (rng() < 0.25) buildings.push('blacksmith')

  // Filter out any building types not defined in BUILDINGS (safety check)
  return buildings.filter(b => b in BUILDINGS)
}

/**
 * Build a full Settlement object from map data.
 */
function buildSettlement(
  tile: MapTile,
  name: string,
  type: SettlementType,
  buildingTypes: BuildingType[],
  rng: () => number,
): Settlement {
  const id = settlementId()

  // Starting population based on settlement type
  const popRanges: Record<SettlementType, [number, number]> = {
    village:   [80,  200],
    town:      [200, 600],
    city:      [600, 1200],
    port:      [250, 700],
    fortress:  [150, 400],
    monastery: [40,  120],
  }
  const [minPop, maxPop] = popRanges[type]
  const population = Math.floor(minPop + rng() * (maxPop - minPop))
  const populationCap = population + 200  // some headroom to grow

  // Starting treasury
  const treasury = Math.floor(200 + rng() * 800)

  // Build building objects
  const buildings: Building[] = buildingTypes.map(bType => ({
    id: buildingId(),
    type: bType,
    level: 1,
    workers: 0,  // allocated by worker allocation on first tick
    efficiency: 1.0,
    buildProgress: 1.0,
    ownerId: `npc_lord_${id}`,
  }))

  // Initialize inventory with small starting stocks of locally-produced goods
  const inventory = {} as Record<GoodId, number>
  for (const goodId of Object.keys(GOODS) as GoodId[]) {
    inventory[goodId] = 0
  }

  // Give some starting stock of produced goods
  for (const bType of buildingTypes) {
    const def = BUILDINGS[bType]
    if (!def) continue
    const outputs = def.outputsPerFastTick[0]
    for (const goodId of Object.keys(outputs) as GoodId[]) {
      // 3 days of production at full efficiency as starting stock
      inventory[goodId] = (inventory[goodId] ?? 0) + (outputs[goodId] ?? 0) * 10 * 3
    }
  }

  const settlement: Settlement = {
    id,
    name,
    position: { x: tile.x, y: tile.y },
    type,
    terrain: tile.terrain,
    population,
    populationCap,
    treasury,
    lordId: `npc_lord_${id}`,
    tariffRate: 0.05 + rng() * 0.10,  // 5–15% tariff, varies by lord
    buildings,
    inventory,
    prices: {} as Record<GoodId, number>,
    marketHistory: {},
    productionRates: {},
    consumptionRates: {},
    resourceNodeIds: [],
  }

  initializePrices(settlement)

  return settlement
}

/**
 * Place settlements on the map and return them.
 */
export function placeSettlements(
  grid: MapTile[][],
  rivers: River[],
  names: string[],
  types: SettlementType[],
  seed: string,
): Settlement[] {
  const rng = seededRandom(hashSeed(seed + '_settlements'))
  const height = grid.length
  const width = grid[0]?.length ?? 0
  const count = names.length

  // Score all land tiles and pick the best ones
  const existingPositions: { x: number; y: number }[] = []
  const settlements: Settlement[] = []

  // Collect all land tiles sorted by score (descending)
  const scored: Array<{ tile: MapTile; score: number }> = []
  for (let y = 5; y < height - 5; y++) {
    for (let x = 5; x < width - 5; x++) {
      const tile = grid[y][x]
      if (!isLand(tile)) continue
      // Pre-score with empty existing — re-score with spacing check during placement
      scored.push({ tile, score: scoreTile(tile, grid, rivers, []) })
    }
  }
  scored.sort((a, b) => b.score - a.score)

  for (let i = 0; i < count; i++) {
    // Find highest-scoring tile that respects spacing
    let placed = false
    for (const { tile } of scored) {
      const finalScore = scoreTile(tile, grid, rivers, existingPositions)
      if (finalScore < 0) continue

      const type = types[i] ?? 'town'
      const buildingTypes = getStartingBuildings(tile, type, rng)
      const s = buildSettlement(tile, names[i], type, buildingTypes, rng)
      settlements.push(s)
      existingPositions.push({ x: tile.x, y: tile.y })
      placed = true
      break
    }

    if (!placed) {
      // Fallback: pick a random land tile
      for (const { tile } of scored) {
        if (!isLand(tile)) continue
        const tooClose = existingPositions.some(p => distance(tile.x, tile.y, p.x, p.y) < 5)
        if (tooClose) continue
        const type = types[i] ?? 'village'
        const buildingTypes = getStartingBuildings(tile, type, rng)
        const s = buildSettlement(tile, names[i], type, buildingTypes, rng)
        settlements.push(s)
        existingPositions.push({ x: tile.x, y: tile.y })
        break
      }
    }
  }

  return settlements
}
