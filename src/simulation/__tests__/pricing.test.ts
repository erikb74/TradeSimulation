import { describe, it, expect, beforeEach } from 'vitest'
import { updatePrices, getTargetStock, estimateMargin, initializePrices } from '../pricing'
import { GOODS } from '../goods'
import type { Settlement, GoodId } from '../types'

function makeSettlement(): Settlement {
  const inventory = {} as Record<GoodId, number>
  const prices = {} as Record<GoodId, number>
  for (const [id, def] of Object.entries(GOODS) as [GoodId, typeof GOODS[GoodId]][]) {
    inventory[id] = 0
    prices[id] = def.basePrice
  }

  return {
    id: 's_test',
    name: 'Priceton',
    position: { x: 0, y: 0 },
    type: 'town',
    terrain: 'plains',
    population: 200,
    populationCap: 500,
    treasury: 500,
    lordId: 'npc_1',
    tariffRate: 0.05,
    buildings: [],
    inventory,
    prices,
    marketHistory: {},
    productionRates: {},
    consumptionRates: {},
    resourceNodeIds: [],
  }
}

describe('updatePrices', () => {
  it('raises price when consumption exceeds stock', () => {
    const s = makeSettlement()
    s.inventory['bread'] = 1      // very low stock
    s.consumptionRates['bread'] = 5   // high demand
    s.productionRates['bread'] = 0

    const beforePrice = s.prices['bread']
    updatePrices(s)

    expect(s.prices['bread']).toBeGreaterThan(beforePrice)
  })

  it('lowers price when stock greatly exceeds demand', () => {
    const s = makeSettlement()
    s.inventory['grain'] = 1000   // huge surplus
    s.consumptionRates['grain'] = 0.1  // very low demand
    s.productionRates['grain'] = 10    // lots being produced

    const beforePrice = s.prices['grain']
    updatePrices(s)

    expect(s.prices['grain']).toBeLessThan(beforePrice)
  })

  it('never lets price drop below PRICE_CLAMP_MIN × base', () => {
    const s = makeSettlement()
    // Force a very low pressure situation
    for (let i = 0; i < 1000; i++) {
      s.inventory['grain'] = 99999
      s.consumptionRates['grain'] = 0
      s.productionRates['grain'] = 999
      updatePrices(s)
    }
    const minAllowed = GOODS['grain'].basePrice * 0.3
    expect(s.prices['grain']).toBeGreaterThanOrEqual(minAllowed)
  })

  it('never lets price exceed PRICE_CLAMP_MAX × base', () => {
    const s = makeSettlement()
    for (let i = 0; i < 1000; i++) {
      s.inventory['grain'] = 0
      s.consumptionRates['grain'] = 9999
      s.productionRates['grain'] = 0
      updatePrices(s)
    }
    const maxAllowed = GOODS['grain'].basePrice * 8.0
    expect(s.prices['grain']).toBeLessThanOrEqual(maxAllowed)
  })

  it('mean-reverts price toward base over many ticks with no demand/supply', () => {
    const s = makeSettlement()
    // Start price far above base
    s.prices['iron_bar'] = GOODS['iron_bar'].basePrice * 5
    s.inventory['iron_bar'] = 50
    s.consumptionRates['iron_bar'] = 0
    s.productionRates['iron_bar'] = 0

    for (let i = 0; i < 200; i++) {
      updatePrices(s)
    }

    // Should have moved closer to base (not necessarily AT base due to clamping)
    const diff = Math.abs(s.prices['iron_bar'] - GOODS['iron_bar'].basePrice)
    expect(diff).toBeLessThan(GOODS['iron_bar'].basePrice * 2)
  })
})

describe('getTargetStock', () => {
  it('returns at least 10 for any good', () => {
    const s = makeSettlement()
    for (const goodId of Object.keys(GOODS) as GoodId[]) {
      expect(getTargetStock(goodId, s)).toBeGreaterThanOrEqual(10)
    }
  })

  it('returns higher target for high-consumption goods', () => {
    const s = makeSettlement()
    s.population = 500
    s.consumptionRates['bread'] = 10
    s.consumptionRates['iron_armor'] = 0.001
    expect(getTargetStock('bread', s)).toBeGreaterThan(getTargetStock('iron_armor', s))
  })
})

describe('estimateMargin', () => {
  it('returns positive margin when sell price > buy price', () => {
    const margin = estimateMargin(10, 20, 100, 0.05, 0.05, 0.01)
    expect(margin).toBeGreaterThan(0)
  })

  it('returns negative margin when tariffs eat the spread', () => {
    const margin = estimateMargin(19, 20, 100, 0.25, 0.25, 0.5)
    expect(margin).toBeLessThan(0)
  })

  it('scales with quantity', () => {
    const m1 = estimateMargin(10, 20, 10, 0, 0, 0)
    const m2 = estimateMargin(10, 20, 100, 0, 0, 0)
    expect(m2 / m1).toBeCloseTo(10, 1)
  })
})
