import { describe, it, expect } from 'vitest'
import { GOODS } from '../goods'
import { ALL_GOOD_IDS } from '../types'

describe('goods definitions', () => {
  it('defines an entry for every GoodId', () => {
    for (const id of ALL_GOOD_IDS) {
      expect(GOODS[id], `Missing definition for good: ${id}`).toBeDefined()
    }
  })

  it('every good has a positive base price', () => {
    for (const [id, def] of Object.entries(GOODS)) {
      expect(def.basePrice, `${id} basePrice <= 0`).toBeGreaterThan(0)
    }
  })

  it('every good has a positive weight', () => {
    for (const [id, def] of Object.entries(GOODS)) {
      expect(def.weightPerUnit, `${id} weightPerUnit <= 0`).toBeGreaterThan(0)
    }
  })

  it('tier 3 goods have higher base prices than tier 1 goods on average', () => {
    const tier1Prices = Object.values(GOODS)
      .filter(g => g.tier === 1)
      .map(g => g.basePrice)
    const tier3Prices = Object.values(GOODS)
      .filter(g => g.tier === 3)
      .map(g => g.basePrice)

    const avg1 = tier1Prices.reduce((a, b) => a + b, 0) / tier1Prices.length
    const avg3 = tier3Prices.reduce((a, b) => a + b, 0) / tier3Prices.length

    expect(avg3).toBeGreaterThan(avg1)
  })
})
