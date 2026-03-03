import { describe, it, expect } from 'vitest'
import { BUILDINGS } from '../buildings'
import { GOODS } from '../goods'
import type { BuildingType, GoodId } from '../types'

describe('building definitions', () => {
  it('every building has exactly 3 levels of inputs and outputs', () => {
    for (const [type, def] of Object.entries(BUILDINGS)) {
      expect(def.inputsPerFastTick.length, `${type} inputs length`).toBe(3)
      expect(def.outputsPerFastTick.length, `${type} outputs length`).toBe(3)
    }
  })

  it('all building input goods are valid GoodIds', () => {
    const validGoods = new Set(Object.keys(GOODS))
    for (const [type, def] of Object.entries(BUILDINGS)) {
      for (const levelInputs of def.inputsPerFastTick) {
        for (const goodId of Object.keys(levelInputs)) {
          expect(validGoods.has(goodId), `${type} uses unknown input good: ${goodId}`).toBe(true)
        }
      }
    }
  })

  it('all building output goods are valid GoodIds', () => {
    const validGoods = new Set(Object.keys(GOODS))
    for (const [type, def] of Object.entries(BUILDINGS)) {
      for (const levelOutputs of def.outputsPerFastTick) {
        for (const goodId of Object.keys(levelOutputs)) {
          expect(validGoods.has(goodId), `${type} produces unknown good: ${goodId}`).toBe(true)
        }
      }
    }
  })

  it('all required terrain types are valid TerrainTypes', () => {
    const validTerrain = new Set(['plains', 'forest', 'hills', 'mountains', 'marsh', 'coast', 'water'])
    for (const [type, def] of Object.entries(BUILDINGS)) {
      for (const terrain of def.requiredTerrain) {
        expect(validTerrain.has(terrain), `${type} requires unknown terrain: ${terrain}`).toBe(true)
      }
    }
  })

  it('higher levels always produce more than lower levels', () => {
    for (const [type, def] of Object.entries(BUILDINGS)) {
      for (const goodId of Object.keys(def.outputsPerFastTick[0]) as GoodId[]) {
        const l1 = def.outputsPerFastTick[0][goodId] ?? 0
        const l2 = def.outputsPerFastTick[1][goodId] ?? 0
        const l3 = def.outputsPerFastTick[2][goodId] ?? 0
        expect(l2, `${type} level 2 output should be >= level 1`).toBeGreaterThanOrEqual(l1)
        expect(l3, `${type} level 3 output should be >= level 2`).toBeGreaterThanOrEqual(l2)
      }
    }
  })

  it('build costs increase with level', () => {
    for (const [type, def] of Object.entries(BUILDINGS)) {
      expect(def.buildCostByLevel[1], `${type} level 2 cost should be > level 1`).toBeGreaterThan(def.buildCostByLevel[0])
      expect(def.buildCostByLevel[2], `${type} level 3 cost should be > level 2`).toBeGreaterThan(def.buildCostByLevel[1])
    }
  })

  it('blacksmith outputs tools', () => {
    const smith = BUILDINGS['blacksmith']
    expect(smith.outputsPerFastTick[0]['tools']).toBeGreaterThan(0)
  })

  it('grain_farm only works on plains', () => {
    const farm = BUILDINGS['grain_farm']
    expect(farm.requiredTerrain).toContain('plains')
    expect(farm.requiredTerrain).not.toContain('mountains')
  })

  it('iron_mine only works on hills or mountains', () => {
    const mine = BUILDINGS['iron_mine']
    expect(mine.requiredTerrain).toContain('hills')
    expect(mine.requiredTerrain).toContain('mountains')
    expect(mine.requiredTerrain).not.toContain('plains')
  })
})
