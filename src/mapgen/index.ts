import type { WorldState, SettlementType, Merchant, GoodId } from '../simulation/types'
import { GOODS } from '../simulation/goods'
import { generateTerrain, DEFAULT_MAP_CONFIG, type MapConfig } from './terrain'
import { carveRivers } from './rivers'
import { placeSettlements } from './settlements'
import { buildRoads } from './roads'
import { placeResourceNodes } from './resources'
import { generateSettlementNames } from './names'
import { getSeason, getYear, getDayOfSeason } from '../simulation/seasons'
import { updateKnownPrices } from '../simulation/merchants'
import { merchantId } from '../lib/ids'
import { seededRandom, hashSeed } from '../lib/math'

export interface MapData {
  seed: string
  config: MapConfig
  terrain: ReturnType<typeof generateTerrain>
  rivers: ReturnType<typeof carveRivers>
  settlements: ReturnType<typeof placeSettlements>
  roads: ReturnType<typeof buildRoads>
  resourceNodes: ReturnType<typeof placeResourceNodes>
}

/**
 * Run the full map generation pipeline for a given seed.
 */
export function generateMap(seed: string, overrides?: Partial<MapConfig>): MapData {
  const config: MapConfig = { ...DEFAULT_MAP_CONFIG, ...overrides, seed }

  // 1. Terrain
  const terrain = generateTerrain(config)

  // 2. Rivers
  const rivers = carveRivers(terrain, seed, 6)

  // 3. Settlement types and names
  const rng = seededRandom(hashSeed(seed + '_types'))
  const types: SettlementType[] = Array.from({ length: config.settlementCount }, () => {
    const r = rng()
    if (r < 0.10) return 'port'
    if (r < 0.18) return 'fortress'
    if (r < 0.23) return 'monastery'
    if (r < 0.50) return 'village'
    return 'town'
  })
  const names = generateSettlementNames(seed, config.settlementCount, types)

  // 4. Settlements
  const settlements = placeSettlements(terrain, rivers, names, types, seed)

  // 5. Roads
  const roads = buildRoads(settlements)

  // 6. Resource nodes
  const resourceNodes = placeResourceNodes(terrain, settlements, seed)

  return { seed, config, terrain, rivers, settlements, roads, resourceNodes }
}

/**
 * Convert map data into a fully initialized WorldState ready for the simulation engine.
 */
export function buildWorldState(map: MapData): WorldState {
  const { seed, config, rivers, roads, resourceNodes, settlements } = map

  const settlementRecord: WorldState['settlements'] = {}
  for (const s of settlements) {
    settlementRecord[s.id] = s
  }

  // Create NPC merchants — 1–2 per settlement
  const merchants: WorldState['merchants'] = {}
  const npcRng = seededRandom(hashSeed(seed + '_npc_merchants'))

  const merchantNames = [
    'Aldric', 'Brennan', 'Corvus', 'Dain', 'Edmund', 'Faron', 'Gareth', 'Hadwin',
    'Ivar', 'Jasper', 'Kern', 'Leofric', 'Maren', 'Nolwen', 'Oswin', 'Perrin',
    'Quinn', 'Redmond', 'Seren', 'Tomas', 'Ulric', 'Varda', 'Wulfric', 'Xander',
    'Yorath', 'Zara', 'Bram', 'Cora', 'Delia', 'Erica',
  ]
  let nameIndex = 0

  for (const settlement of settlements) {
    const merchantCount = npcRng() < 0.5 ? 1 : 2
    for (let i = 0; i < merchantCount; i++) {
      const mid = merchantId()
      const name = merchantNames[nameIndex % merchantNames.length]
      nameIndex++

      const npcMerchant: Merchant = {
        id: mid,
        name,
        homeSettlementId: settlement.id,
        cartCapacity: 40 + Math.floor(npcRng() * 40), // 40–80 weight units
        gold: 200 + Math.floor(npcRng() * 400),        // 200–600 starting gold
        mode: 'auto',
        knownPrices: {},
        isNpc: true,
        idleTicks: 0,
      }

      // Give NPC merchant knowledge of their home settlement prices
      updateKnownPrices(npcMerchant, settlement.id, {
        settlements: settlementRecord,
        merchants: {},
        caravans: {},
        roads,
        rivers,
        resourceNodes,
        seed,
        fastTick: 0,
        slowTick: 0,
        season: 'spring',
        year: 1,
        day: 1,
        mapWidth: config.width,
        mapHeight: config.height,
        playerGold: 0,
        playerMerchantIds: [],
        lastSavedAt: Date.now(),
        events: [],
        ticksSinceAutosave: 0,
      })

      merchants[mid] = npcMerchant
    }
  }

  const world: WorldState = {
    seed,
    fastTick: 0,
    slowTick: 0,
    season: 'spring',
    year: 1,
    day: 1,
    mapWidth: config.width,
    mapHeight: config.height,
    rivers,
    roads,
    resourceNodes,
    settlements: settlementRecord,
    caravans: {},
    merchants,
    playerGold: 500,         // player starts with a modest purse
    playerMerchantIds: [],   // no player merchants yet (Phase 6)
    lastSavedAt: Date.now(),
    events: [],
    ticksSinceAutosave: 0,
  }

  return world
}
