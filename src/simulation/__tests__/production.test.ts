import { describe, it, expect, beforeEach } from 'vitest'
import { runProductionTick, getWarehouseCapacity } from '../production'
import type { Settlement, WorldState, Building } from '../types'
import { GOODS } from '../goods'

function makeBuilding(type: Building['type'], level: 1 | 2 | 3 = 1): Building {
  return {
    id: `b_${type}`,
    type,
    level,
    workers: 4,
    efficiency: 1,
    buildProgress: 1.0,
    ownerId: 'npc_test',
  }
}

function makeSettlement(overrides: Partial<Settlement> = {}): Settlement {
  const inventory = {} as Record<import('../types').GoodId, number>
  for (const id of Object.keys(GOODS) as import('../types').GoodId[]) {
    inventory[id] = 0
  }

  return {
    id: 's_test',
    name: 'Testville',
    position: { x: 0, y: 0 },
    type: 'town',
    terrain: 'plains',
    population: 200,
    populationCap: 500,
    treasury: 1000,
    lordId: 'npc_1',
    tariffRate: 0.05,
    buildings: [],
    inventory,
    prices: {} as Record<import('../types').GoodId, number>,
    marketHistory: {},
    productionRates: {},
    consumptionRates: {},
    resourceNodeIds: [],
    ...overrides,
  }
}

function makeWorld(settlement: Settlement): WorldState {
  return {
    seed: 'test',
    fastTick: 0,
    slowTick: 0,
    season: 'summer',
    year: 1,
    day: 1,
    mapWidth: 100,
    mapHeight: 100,
    rivers: [],
    roads: [],
    resourceNodes: [],
    settlements: { [settlement.id]: settlement },
    caravans: {},
    merchants: {},
    playerGold: 1000,
    playerMerchantIds: [],
    lastSavedAt: Date.now(),
    events: [],
    ticksSinceAutosave: 0,
  }
}

describe('runProductionTick', () => {
  it('produces grain from a grain_farm in summer', () => {
    const s = makeSettlement({ buildings: [makeBuilding('grain_farm')] })
    const w = makeWorld(s)

    const result = runProductionTick(s, w)

    expect(result.produced['grain']).toBeGreaterThan(0)
    expect(s.inventory['grain']).toBeGreaterThan(0)
  })

  it('produces nothing from a building under construction', () => {
    const building = makeBuilding('grain_farm')
    building.buildProgress = 0.5
    const s = makeSettlement({ buildings: [building] })
    const w = makeWorld(s)

    const result = runProductionTick(s, w)

    expect(result.produced['grain'] ?? 0).toBe(0)
  })

  it('bakery produces no bread when flour stock is zero', () => {
    const s = makeSettlement({ buildings: [makeBuilding('bakery')] })
    s.inventory['flour'] = 0
    const w = makeWorld(s)

    const result = runProductionTick(s, w)

    expect(result.produced['bread'] ?? 0).toBe(0)
  })

  it('bakery produces bread when flour is available', () => {
    const s = makeSettlement({ buildings: [makeBuilding('bakery')] })
    s.inventory['flour'] = 100
    const w = makeWorld(s)

    const result = runProductionTick(s, w)

    expect(result.produced['bread']).toBeGreaterThan(0)
    expect(result.consumed['flour']).toBeGreaterThan(0)
    // Flour consumed should be less than or equal to starting stock
    expect(s.inventory['flour']).toBeGreaterThanOrEqual(0)
  })

  it('smelter consumes iron_ore and produces iron_bar', () => {
    const s = makeSettlement({
      terrain: 'hills',
      buildings: [makeBuilding('smelter')],
    })
    s.inventory['iron_ore'] = 50
    s.inventory['timber'] = 50
    const w = makeWorld(s)

    const result = runProductionTick(s, w)

    expect(result.produced['iron_bar']).toBeGreaterThan(0)
    expect(result.consumed['iron_ore']).toBeGreaterThan(0)
  })

  it('building with 0 workers produces nothing', () => {
    const building = makeBuilding('grain_farm')
    building.workers = 0
    const s = makeSettlement({ buildings: [building] })
    const w = makeWorld(s)

    const result = runProductionTick(s, w)

    expect(result.produced['grain'] ?? 0).toBe(0)
  })

  it('grain_farm output is reduced in winter', () => {
    const s = makeSettlement({ buildings: [makeBuilding('grain_farm')] })

    const wSummer = makeWorld(s)
    wSummer.season = 'summer'
    const resSummer = runProductionTick(s, wSummer)
    const summerGrain = resSummer.produced['grain'] ?? 0

    // Reset inventory
    s.inventory['grain'] = 0

    const wWinter = makeWorld(s)
    wWinter.season = 'winter'
    const resWinter = runProductionTick(s, wWinter)
    const winterGrain = resWinter.produced['grain'] ?? 0

    expect(summerGrain).toBeGreaterThan(winterGrain)
  })

  it('respects warehouse capacity — inventory does not exceed cap', () => {
    const building = makeBuilding('grain_farm')
    const s = makeSettlement({ buildings: [building] })
    // Fill inventory to just below cap
    const cap = getWarehouseCapacity(s)
    s.inventory['grain'] = cap - 0.001
    const w = makeWorld(s)

    runProductionTick(s, w)

    expect(s.inventory['grain']).toBeLessThanOrEqual(cap + 0.001)
  })
})

describe('getWarehouseCapacity', () => {
  it('returns base capacity with no warehouses', () => {
    const s = makeSettlement({ buildings: [] })
    expect(getWarehouseCapacity(s)).toBe(200)
  })

  it('increases with each warehouse level', () => {
    const s = makeSettlement({
      buildings: [{ ...makeBuilding('warehouse', 2), buildProgress: 1.0 }],
    })
    expect(getWarehouseCapacity(s)).toBe(200 + 2 * 200)
  })

  it('does not count warehouses under construction', () => {
    const s = makeSettlement({
      buildings: [{ ...makeBuilding('warehouse', 3), buildProgress: 0.5 }],
    })
    expect(getWarehouseCapacity(s)).toBe(200) // base only
  })
})
