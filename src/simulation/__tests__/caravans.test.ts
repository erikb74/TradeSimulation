import { describe, it, expect } from 'vitest'
import { findRoad, getCaravanSpeed, moveCaravans, deliverCaravan, estimateTravelDays } from '../caravans'
import type { WorldState, Caravan, Road, Settlement, GoodId } from '../types'
import { GOODS } from '../goods'

function makeRoad(fromId: string, toId: string, quality: Road['quality'] = 'gravel'): Road {
  return { fromId, toId, quality, length: 10 }
}

function makeSettlement(id: string, gold = 500): Settlement {
  const inventory = {} as Record<GoodId, number>
  const prices = {} as Record<GoodId, number>
  for (const [gid, def] of Object.entries(GOODS) as [GoodId, typeof GOODS[GoodId]][]) {
    inventory[gid] = 0
    prices[gid] = def.basePrice
  }
  return {
    id, name: id, position: { x: 0, y: 0 }, type: 'town', terrain: 'plains',
    population: 200, populationCap: 500, treasury: gold, lordId: 'npc_1',
    tariffRate: 0.05, buildings: [], inventory, prices, marketHistory: {},
    productionRates: {}, consumptionRates: {}, resourceNodeIds: [],
  }
}

function makeWorld(): WorldState {
  const sA = makeSettlement('sA')
  const sB = makeSettlement('sB')
  return {
    seed: 'test', fastTick: 0, slowTick: 0, season: 'summer', year: 1, day: 1,
    mapWidth: 100, mapHeight: 100, rivers: [],
    roads: [makeRoad('sA', 'sB', 'gravel')],
    resourceNodes: [],
    settlements: { sA, sB },
    caravans: {},
    merchants: {
      m1: {
        id: 'm1', name: 'Test Merchant', homeSettlementId: 'sA',
        cartCapacity: 50, gold: 500, mode: 'auto',
        knownPrices: {}, isNpc: true, idleTicks: 0,
      },
    },
    playerGold: 1000, playerMerchantIds: [],
    lastSavedAt: Date.now(), events: [], ticksSinceAutosave: 0,
  }
}

describe('findRoad', () => {
  const roads = [makeRoad('A', 'B'), makeRoad('B', 'C', 'stone')]

  it('finds direct road A→B', () => {
    expect(findRoad('A', 'B', roads)).not.toBeNull()
  })

  it('finds reverse road B→A', () => {
    expect(findRoad('B', 'A', roads)).not.toBeNull()
  })

  it('returns null when no road exists', () => {
    expect(findRoad('A', 'C', roads)).toBeNull()
  })
})

describe('moveCaravans', () => {
  it('advances caravan progress each fast tick', () => {
    const w = makeWorld()
    const caravan: Caravan = {
      id: 'c1', merchantId: 'm1', fromId: 'sA', toId: 'sB',
      cargo: { grain: 10 }, progress: 0, speed: 0.02, returning: false, purchaseCost: 0,
    }
    w.caravans['c1'] = caravan

    moveCaravans(w)

    expect(caravan.progress).toBeGreaterThan(0)
  })

  it('returns caravan when progress reaches 1', () => {
    const w = makeWorld()
    const caravan: Caravan = {
      id: 'c1', merchantId: 'm1', fromId: 'sA', toId: 'sB',
      cargo: { grain: 10 }, progress: 0.99, speed: 0.02, returning: false, purchaseCost: 0,
    }
    w.caravans['c1'] = caravan

    const arrived = moveCaravans(w)

    expect(arrived).toHaveLength(1)
    expect(arrived[0].id).toBe('c1')
  })

  it('does not return caravan before it arrives', () => {
    const w = makeWorld()
    const caravan: Caravan = {
      id: 'c1', merchantId: 'm1', fromId: 'sA', toId: 'sB',
      cargo: { grain: 10 }, progress: 0.1, speed: 0.02, returning: false, purchaseCost: 0,
    }
    w.caravans['c1'] = caravan

    const arrived = moveCaravans(w)

    expect(arrived).toHaveLength(0)
  })
})

describe('deliverCaravan', () => {
  it('adds cargo to destination settlement inventory', () => {
    const w = makeWorld()
    w.settlements['sB'].prices['grain'] = 8

    const caravan: Caravan = {
      id: 'c1', merchantId: 'm1', fromId: 'sA', toId: 'sB',
      cargo: { grain: 20 }, progress: 1.0, speed: 0.02, returning: false, purchaseCost: 0,
    }
    w.caravans['c1'] = caravan

    deliverCaravan(caravan, w)

    expect(w.settlements['sB'].inventory['grain']).toBe(20)
  })

  it('pays merchant for delivered goods', () => {
    const w = makeWorld()
    w.settlements['sB'].prices['grain'] = 10
    w.settlements['sB'].tariffRate = 0

    const caravan: Caravan = {
      id: 'c1', merchantId: 'm1', fromId: 'sA', toId: 'sB',
      cargo: { grain: 10 }, progress: 1.0, speed: 0.02, returning: false, purchaseCost: 0,
    }
    w.caravans['c1'] = caravan
    const prevGold = w.merchants['m1'].gold

    deliverCaravan(caravan, w)

    expect(w.merchants['m1'].gold).toBeGreaterThan(prevGold)
  })

  it('removes the caravan from world state after delivery', () => {
    const w = makeWorld()
    const caravan: Caravan = {
      id: 'c1', merchantId: 'm1', fromId: 'sA', toId: 'sB',
      cargo: { grain: 5 }, progress: 1.0, speed: 0.02, returning: false, purchaseCost: 0,
    }
    w.caravans['c1'] = caravan

    deliverCaravan(caravan, w)

    expect(w.caravans['c1']).toBeUndefined()
  })

  it('generates a caravan_arrived event', () => {
    const w = makeWorld()
    const caravan: Caravan = {
      id: 'c1', merchantId: 'm1', fromId: 'sA', toId: 'sB',
      cargo: { grain: 5 }, progress: 1.0, speed: 0.02, returning: false, purchaseCost: 0,
    }
    w.caravans['c1'] = caravan

    const events = deliverCaravan(caravan, w)

    expect(events.some(e => e.type === 'caravan_arrived')).toBe(true)
  })
})

describe('estimateTravelDays', () => {
  const roads = [makeRoad('A', 'B', 'stone'), makeRoad('B', 'C', 'dirt')]

  it('stone roads are faster than dirt roads', () => {
    const stoneDays = estimateTravelDays('A', 'B', roads)
    const dirtDays  = estimateTravelDays('B', 'C', roads)
    expect(stoneDays).toBeLessThan(dirtDays)
  })

  it('returns 999 when no road exists', () => {
    expect(estimateTravelDays('A', 'C', roads)).toBe(999)
  })
})
