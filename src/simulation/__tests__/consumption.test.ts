import { describe, it, expect } from 'vitest'
import { runConsumptionTick, updatePopulation, computePopulationCap } from '../consumption'
import type { Settlement, GoodId } from '../types'
import { GOODS } from '../goods'

function makeSettlement(pop = 200): Settlement {
  const inventory = {} as Record<GoodId, number>
  const prices = {} as Record<GoodId, number>
  for (const [id, def] of Object.entries(GOODS) as [GoodId, typeof GOODS[GoodId]][]) {
    inventory[id] = 0
    prices[id] = def.basePrice
  }

  return {
    id: 's_test',
    name: 'Consumpton',
    position: { x: 0, y: 0 },
    type: 'town',
    terrain: 'plains',
    population: pop,
    populationCap: 1000,
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

describe('runConsumptionTick', () => {
  it('deducts consumed goods from inventory', () => {
    const s = makeSettlement(100)
    s.inventory['bread'] = 10

    const result = runConsumptionTick(s)

    expect(result.consumed['bread']).toBeGreaterThan(0)
    expect(s.inventory['bread']).toBeLessThan(10)
  })

  it('inventory does not go below zero', () => {
    const s = makeSettlement(1000)
    s.inventory['bread'] = 0  // empty

    runConsumptionTick(s)

    expect(s.inventory['bread']).toBeGreaterThanOrEqual(0)
  })

  it('records shortfall when stock is insufficient', () => {
    const s = makeSettlement(500)
    s.inventory['bread'] = 0

    const result = runConsumptionTick(s)

    expect(result.shortfalls['bread']).toBeGreaterThan(0)
  })

  it('returns fedRatio < 1 when food is insufficient', () => {
    const s = makeSettlement(500)
    s.inventory['bread'] = 0
    s.inventory['fish'] = 0
    s.inventory['salted_fish'] = 0
    s.inventory['meat'] = 0

    const result = runConsumptionTick(s)

    expect(result.fedRatio).toBeLessThan(1)
    expect(result.hasFood).toBe(false)
  })

  it('returns fedRatio = 1 when fully stocked', () => {
    const s = makeSettlement(100)
    // Stock all food goods so every food demand is met
    s.inventory['bread'] = 1000
    s.inventory['fish'] = 1000
    s.inventory['meat'] = 1000
    s.inventory['salted_fish'] = 1000

    const result = runConsumptionTick(s)

    expect(result.fedRatio).toBeCloseTo(1, 2)
    expect(result.hasFood).toBe(true)
  })

  it('detects morale when ale is consumed', () => {
    const s = makeSettlement(100)
    s.inventory['ale'] = 100

    const result = runConsumptionTick(s)

    expect(result.hasMorale).toBe(true)
  })

  it('scales consumption with population', () => {
    const sSmall = makeSettlement(100)
    const sLarge = makeSettlement(1000)
    sSmall.inventory['bread'] = 9999
    sLarge.inventory['bread'] = 9999

    const resSmall = runConsumptionTick(sSmall)
    const resLarge = runConsumptionTick(sLarge)

    // Large settlement consumes ~10x as much as small
    expect((resLarge.consumed['bread'] ?? 0)).toBeGreaterThan(resSmall.consumed['bread'] ?? 0)
  })
})

describe('updatePopulation', () => {
  it('grows population when well-fed', () => {
    const s = makeSettlement(200)
    const result = { consumed: {}, shortfalls: {}, fedRatio: 1.0, hasFood: true, hasMedicine: false, hasMorale: false }

    const newPop = updatePopulation(s, result)

    expect(newPop).toBeGreaterThan(200)
  })

  it('shrinks population when starving', () => {
    const s = makeSettlement(200)
    const result = { consumed: {}, shortfalls: {}, fedRatio: 0.1, hasFood: false, hasMedicine: false, hasMorale: false }

    const newPop = updatePopulation(s, result)

    expect(newPop).toBeLessThan(200)
  })

  it('never drops below zero', () => {
    const s = makeSettlement(1)
    const result = { consumed: {}, shortfalls: {}, fedRatio: 0.0, hasFood: false, hasMedicine: false, hasMorale: false }

    const newPop = updatePopulation(s, result)

    expect(newPop).toBeGreaterThanOrEqual(0)
  })

  it('does not exceed population cap', () => {
    const s = makeSettlement(999)
    s.populationCap = 1000
    const result = { consumed: {}, shortfalls: {}, fedRatio: 1.0, hasFood: true, hasMedicine: true, hasMorale: true }

    for (let i = 0; i < 100; i++) {
      s.population = updatePopulation(s, result)
    }

    expect(s.population).toBeLessThanOrEqual(1000)
  })

  it('medicine provides additional population bonus', () => {
    // Use a large enough population so the medicine bonus (0.2%) is detectable after rounding.
    // Set populationCap well above starting pop so the cap doesn't mask the difference.
    const s = makeSettlement(2000)
    s.populationCap = 10000
    const withMedicine = updatePopulation(s, {
      consumed: {}, shortfalls: {}, fedRatio: 1.0, hasFood: true, hasMedicine: true, hasMorale: false,
    })
    const noMedicine = updatePopulation(s, {
      consumed: {}, shortfalls: {}, fedRatio: 1.0, hasFood: true, hasMedicine: false, hasMorale: false,
    })
    expect(withMedicine).toBeGreaterThan(noMedicine)
  })
})

describe('computePopulationCap', () => {
  it('returns base cap with no buildings', () => {
    const s = makeSettlement()
    expect(computePopulationCap(s)).toBe(200)
  })

  it('increases with completed warehouses', () => {
    const s = makeSettlement()
    s.buildings = [{
      id: 'b_1', type: 'warehouse', level: 1, workers: 1,
      efficiency: 1, buildProgress: 1.0, ownerId: 'npc',
    }]
    expect(computePopulationCap(s)).toBeGreaterThan(200)
  })
})
