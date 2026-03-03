// ─────────────────────────────────────────────────────────────────────────────
// GOODS
// ─────────────────────────────────────────────────────────────────────────────

export type GoodId =
  // Tier 1 — Raw resources
  | 'grain' | 'cattle' | 'timber' | 'iron_ore' | 'stone' | 'fish'
  | 'salt' | 'wool' | 'herbs' | 'grapes' | 'beeswax'
  // Tier 2 — Processed goods
  | 'flour' | 'bread' | 'meat' | 'hides' | 'salted_fish'
  | 'iron_bar' | 'planks' | 'mortar' | 'cloth' | 'ale' | 'wine'
  | 'candles' | 'medicine'
  // Tier 3 — Crafted goods
  | 'tools' | 'iron_weapons' | 'iron_armor' | 'carts'
  | 'leather' | 'boots' | 'clothing' | 'saddles'

export const ALL_GOOD_IDS: GoodId[] = [
  'grain', 'cattle', 'timber', 'iron_ore', 'stone', 'fish',
  'salt', 'wool', 'herbs', 'grapes', 'beeswax',
  'flour', 'bread', 'meat', 'hides', 'salted_fish',
  'iron_bar', 'planks', 'mortar', 'cloth', 'ale', 'wine',
  'candles', 'medicine',
  'tools', 'iron_weapons', 'iron_armor', 'carts',
  'leather', 'boots', 'clothing', 'saddles',
]

export type GoodCategory =
  | 'staple_food' | 'preserved_food' | 'raw_material'
  | 'processed_material' | 'tool_weapon' | 'textile' | 'luxury' | 'service'

export interface GoodDefinition {
  id: GoodId
  name: string
  basePrice: number      // gold per unit at balanced supply/demand
  weightPerUnit: number  // affects cart capacity usage
  tier: 1 | 2 | 3
  category: GoodCategory
}

// ─────────────────────────────────────────────────────────────────────────────
// TERRAIN & MAP
// ─────────────────────────────────────────────────────────────────────────────

export type TerrainType =
  | 'plains' | 'forest' | 'hills' | 'mountains'
  | 'marsh' | 'coast' | 'water'

export interface MapTile {
  x: number
  y: number
  terrain: TerrainType
  elevation: number  // 0–1
  moisture: number   // 0–1
  temperature: number // 0–1
  riverAdjacent: boolean
}

export interface River {
  points: Array<{ x: number; y: number }>
}

export type RoadQuality = 'dirt' | 'gravel' | 'stone'

export interface Road {
  fromId: string  // settlement id
  toId: string    // settlement id
  quality: RoadQuality
  length: number  // Euclidean distance in map units
}

export interface ResourceNode {
  id: string
  type: 'iron_deposit' | 'stone_quarry' | 'ancient_forest' | 'fertile_plains' | 'salt_flats' | 'vineyard_land'
  position: { x: number; y: number }
  richness: number // 0.5–2.0 multiplier on nearby building output
  nearestSettlementId: string
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILDINGS
// ─────────────────────────────────────────────────────────────────────────────

export type BuildingType =
  // Tier 1 — Raw resource extraction
  | 'grain_farm' | 'cattle_ranch' | 'logging_camp' | 'iron_mine'
  | 'stone_quarry' | 'fishing_wharf' | 'salt_pans' | 'sheep_ranch'
  | 'herb_garden' | 'vineyard' | 'apiary'
  // Tier 2 — Processing
  | 'windmill' | 'bakery' | 'slaughterhouse' | 'smokehouse'
  | 'smelter' | 'sawmill' | 'lime_kiln' | 'tannery'
  | 'loom' | 'brewery' | 'winery' | 'chandler' | 'apothecary'
  // Tier 3 — Crafted goods
  | 'blacksmith' | 'cartwright' | 'cobbler' | 'tailor' | 'saddler'
  // Infrastructure
  | 'warehouse' | 'market' | 'tavern' | 'guild_hall'

export interface BuildingDefinition {
  id: BuildingType
  name: string
  tier: 1 | 2 | 3 | 4
  requiredTerrain: TerrainType[]    // terrain types this building can be built on
  maxLevel: 3
  workersByLevel: [number, number, number]
  // Per fast tick (1 game hour) at each level:
  inputsPerFastTick: [Partial<Record<GoodId, number>>, Partial<Record<GoodId, number>>, Partial<Record<GoodId, number>>]
  outputsPerFastTick: [Partial<Record<GoodId, number>>, Partial<Record<GoodId, number>>, Partial<Record<GoodId, number>>]
  buildCostByLevel: [number, number, number]  // gold to build/upgrade to this level
  buildTimeDays: [number, number, number]     // slow ticks to construct
  description: string
}

export interface Building {
  id: string
  type: BuildingType
  level: 1 | 2 | 3
  workers: number        // currently assigned from settlement population
  efficiency: number     // 0.0–1.0 computed each tick
  buildProgress: number  // 0.0–1.0; <1.0 means under construction
  ownerId: string        // 'npc_<lordId>' or 'player'
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTLEMENT
// ─────────────────────────────────────────────────────────────────────────────

export type SettlementType = 'village' | 'town' | 'city' | 'port' | 'fortress' | 'monastery'

export interface Settlement {
  id: string
  name: string
  position: { x: number; y: number }
  type: SettlementType
  terrain: TerrainType  // primary terrain of this location

  population: number
  populationCap: number   // set by warehouse/housing building count
  treasury: number        // gold (used by NPC lord to pay wages and buy inputs)
  lordId: string          // 'npc_<id>' or 'player'
  tariffRate: number      // 0.0–0.25 fraction of trade value charged as tariff

  buildings: Building[]
  inventory: Record<GoodId, number>
  prices: Record<GoodId, number>
  // Last MARKET_HISTORY_DAYS prices for each good (newest last)
  marketHistory: Partial<Record<GoodId, number[]>>

  // Computed each slow tick for event/display purposes
  productionRates: Partial<Record<GoodId, number>>   // units/day
  consumptionRates: Partial<Record<GoodId, number>>  // units/day

  resourceNodeIds: string[]  // adjacent resource nodes
}

// ─────────────────────────────────────────────────────────────────────────────
// TRADE & MERCHANTS
// ─────────────────────────────────────────────────────────────────────────────

export interface TradeRoute {
  id: string
  merchantId: string
  fromId: string    // settlement to buy from
  toId: string      // settlement to sell at
  good: GoodId
  buyThreshold: number   // only buy if price <= this
  sellThreshold: number  // only sell if price >= this
  quantityPerTrip: number
}

export interface Caravan {
  id: string
  merchantId: string
  fromId: string
  toId: string
  cargo: Partial<Record<GoodId, number>>
  progress: number    // 0.0 → 1.0 along the route
  speed: number       // progress per fast tick (varies by road + season)
  returning: boolean  // true when heading home after delivering
  purchaseCost: number // gold paid for cargo (for profit calculation on delivery)
}

export interface PriceMemory {
  price: number
  observedAtTick: number  // slowTick when this was recorded
}

export interface Merchant {
  id: string
  name: string
  homeSettlementId: string
  cartCapacity: number   // max weight units of cargo
  gold: number           // merchant's own purse (separate from settlement)
  mode: 'auto'           // player merchants can be 'manual' in future phase
  assignedRoute?: TradeRoute
  caravanId?: string     // set when currently traveling
  // Known prices: settlementId → goodId → PriceMemory
  knownPrices: Record<string, Partial<Record<GoodId, PriceMemory>>>
  isNpc: boolean
  idleTicks: number      // slow ticks spent idle (for event generation)
}

// ─────────────────────────────────────────────────────────────────────────────
// SEASONS & TIME
// ─────────────────────────────────────────────────────────────────────────────

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────────────────────────────────────

export type EventType =
  | 'caravan_arrived'
  | 'shortage_warning'
  | 'surplus_alert'
  | 'population_growth'
  | 'population_decline'
  | 'price_spike'
  | 'price_crash'
  | 'building_complete'
  | 'season_change'
  | 'era_progress'

export interface GameEvent {
  id: string
  tick: number       // fastTick when this occurred
  dayTick: number    // slowTick when this occurred
  type: EventType
  message: string
  settlementId?: string
  goodId?: GoodId
}

// ─────────────────────────────────────────────────────────────────────────────
// WORLD STATE — authoritative, lives in Web Worker
// ─────────────────────────────────────────────────────────────────────────────

export interface WorldState {
  seed: string
  fastTick: number   // total fast ticks elapsed
  slowTick: number   // total slow ticks elapsed
  season: Season
  year: number
  day: number        // 1–30 within the current season

  // Map data
  mapWidth: number
  mapHeight: number
  rivers: River[]
  roads: Road[]
  resourceNodes: ResourceNode[]

  // Entities
  settlements: Record<string, Settlement>
  caravans: Record<string, Caravan>
  merchants: Record<string, Merchant>

  // Player
  playerGold: number
  playerMerchantIds: string[]
  lastSavedAt: number  // Date.now() timestamp

  // Events (newest last, capped at EVENT_LOG_MAX)
  events: GameEvent[]

  // Autosave tracking
  ticksSinceAutosave: number
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE SNAPSHOT — serialized subset sent to main thread UI
// ─────────────────────────────────────────────────────────────────────────────

export interface SettlementSnapshot {
  id: string
  name: string
  position: { x: number; y: number }
  type: SettlementType
  terrain: TerrainType
  population: number
  populationCap: number
  treasury: number
  lordId: string
  tariffRate: number
  buildings: Building[]
  inventory: Record<GoodId, number>
  prices: Record<GoodId, number>
  marketHistory: Partial<Record<GoodId, number[]>>
  productionRates: Partial<Record<GoodId, number>>
  consumptionRates: Partial<Record<GoodId, number>>
}

export interface CaravanSnapshot {
  id: string
  merchantId: string
  fromId: string
  toId: string
  cargo: Partial<Record<GoodId, number>>
  progress: number
  returning: boolean
  isPlayerOwned: boolean
}

export interface MerchantSnapshot {
  id: string
  name: string
  homeSettlementId: string
  cartCapacity: number
  gold: number
  mode: 'auto'
  assignedRoute?: TradeRoute
  caravanId?: string
  isNpc: boolean
  idleTicks: number
}

export interface StateSnapshot {
  fastTick: number
  slowTick: number
  season: Season
  year: number
  day: number
  playerGold: number
  settlements: Record<string, SettlementSnapshot>
  caravans: Record<string, CaravanSnapshot>
  merchants: Record<string, MerchantSnapshot>
  roads: Road[]
  rivers: River[]
  resourceNodes: ResourceNode[]
  mapWidth: number
  mapHeight: number
  events: GameEvent[]
  recentEvents: GameEvent[]  // last 20 events for the log bar
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMANDS — player actions sent from main thread to worker
// ─────────────────────────────────────────────────────────────────────────────

export type SimCommand =
  | { type: 'NEW_GAME'; seed?: string }
  | { type: 'LOAD_SAVE' }
  | { type: 'SET_SPEED'; speed: import('../lib/constants').GameSpeed }
  | { type: 'SET_ROUTE'; merchantId: string; fromId: string; toId: string; good: GoodId; buyThreshold: number; sellThreshold: number; quantityPerTrip: number }
  | { type: 'CANCEL_ROUTE'; merchantId: string }
  | { type: 'BUY_SELL'; settlementId: string; good: GoodId; quantity: number; action: 'buy' | 'sell' }
  | { type: 'BUILD_BUILDING'; settlementId: string; buildingType: BuildingType }
  | { type: 'UPGRADE_BUILDING'; settlementId: string; buildingId: string }
  | { type: 'HIRE_MERCHANT'; homeSettlementId: string; name: string }

// ─────────────────────────────────────────────────────────────────────────────
// WORKER → MAIN THREAD MESSAGES
// ─────────────────────────────────────────────────────────────────────────────

export type WorkerMessage =
  | { type: 'SNAPSHOT'; snapshot: StateSnapshot }
  | { type: 'CARAVAN_UPDATE'; caravans: Record<string, CaravanSnapshot> }
  | { type: 'IDLE_SUMMARY'; missedSlowTicks: number; events: GameEvent[] }
  | { type: 'READY' }
  | { type: 'ERROR'; message: string }
