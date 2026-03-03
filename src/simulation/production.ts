import type { Settlement, GoodId, WorldState } from './types'
import { BUILDINGS } from './buildings'
import { seasonProductionMultiplier } from './seasons'
import { clamp } from '../lib/math'

export interface ProductionResult {
  produced: Partial<Record<GoodId, number>>
  consumed: Partial<Record<GoodId, number>>  // inputs consumed
  efficiencies: Record<string, number>        // buildingId → efficiency used
}

/**
 * Run one fast tick of production for all buildings in a settlement.
 * Mutates inventory in place and returns a result summary.
 */
export function runProductionTick(settlement: Settlement, world: WorldState): ProductionResult {
  const produced: Partial<Record<GoodId, number>> = {}
  const consumed: Partial<Record<GoodId, number>> = {}
  const efficiencies: Record<string, number> = {}

  for (const building of settlement.buildings) {
    // Skip buildings under construction
    if (building.buildProgress < 1.0) continue

    const def = BUILDINGS[building.type]
    if (!def) continue

    const levelIndex = (building.level - 1) as 0 | 1 | 2

    // Worker efficiency: ratio of assigned workers to max workers at this level
    const maxWorkers = def.workersByLevel[levelIndex]
    const workerRatio = maxWorkers > 0 ? clamp(building.workers / maxWorkers, 0, 1) : 0

    // Input availability: can we cover all required inputs?
    const inputs = def.inputsPerFastTick[levelIndex]
    let inputRatio = 1.0
    for (const [goodId, required] of Object.entries(inputs) as [GoodId, number][]) {
      if (required <= 0) continue
      const available = settlement.inventory[goodId] ?? 0
      const ratio = available >= required ? 1.0 : available / required
      inputRatio = Math.min(inputRatio, ratio)
    }

    // Season multiplier for this building type
    const seasonMult = seasonProductionMultiplier(building.type, world.season)

    // Guild hall bonus: if settlement has a guild hall, boost efficiency by 10-20%
    const guildBonus = settlement.buildings.some(b => b.type === 'guild_hall' && b.buildProgress >= 1.0)
      ? 1.15
      : 1.0

    // Final efficiency: all factors combined, clamped to [0, 1]
    const efficiency = clamp(workerRatio * inputRatio * seasonMult * guildBonus, 0, 1)
    building.efficiency = efficiency
    efficiencies[building.id] = efficiency

    if (efficiency <= 0) continue

    // Deduct inputs (scaled by efficiency)
    for (const [goodId, required] of Object.entries(inputs) as [GoodId, number][]) {
      if (required <= 0) continue
      const deducted = required * efficiency
      settlement.inventory[goodId] = Math.max(0, (settlement.inventory[goodId] ?? 0) - deducted)
      consumed[goodId] = (consumed[goodId] ?? 0) + deducted
    }

    // Add outputs (scaled by efficiency)
    const outputs = def.outputsPerFastTick[levelIndex]
    for (const [goodId, output] of Object.entries(outputs) as [GoodId, number][]) {
      if (output <= 0) continue
      const amount = output * efficiency
      settlement.inventory[goodId] = (settlement.inventory[goodId] ?? 0) + amount
      produced[goodId] = (produced[goodId] ?? 0) + amount
    }
  }

  // Clamp inventory to warehouse capacity
  const cap = getWarehouseCapacity(settlement)
  for (const goodId of Object.keys(settlement.inventory) as GoodId[]) {
    if (settlement.inventory[goodId] > cap) {
      settlement.inventory[goodId] = cap
    }
  }

  return { produced, consumed, efficiencies }
}

/**
 * Warehouse capacity is set by warehouse buildings (and a base capacity).
 * Base: 200 units per good; each warehouse level adds 200/400/600.
 */
export function getWarehouseCapacity(settlement: Settlement): number {
  const BASE_CAPACITY = 200
  let bonus = 0
  for (const b of settlement.buildings) {
    if (b.type === 'warehouse' && b.buildProgress >= 1.0) {
      bonus += b.level * 200
    }
  }
  return BASE_CAPACITY + bonus
}

/**
 * Compute aggregate daily (per slow tick) production rates for display.
 * One slow tick = 10 fast ticks, so we multiply fast tick rates by 10.
 */
export function computeProductionRates(
  settlement: Settlement,
  world: WorldState,
): Partial<Record<GoodId, number>> {
  const rates: Partial<Record<GoodId, number>> = {}

  for (const building of settlement.buildings) {
    if (building.buildProgress < 1.0) continue
    const def = BUILDINGS[building.type]
    if (!def) continue

    const levelIndex = (building.level - 1) as 0 | 1 | 2
    const seasonMult = seasonProductionMultiplier(building.type, world.season)
    const maxWorkers = def.workersByLevel[levelIndex]
    const workerRatio = maxWorkers > 0 ? clamp(building.workers / maxWorkers, 0, 1) : 0
    const eff = workerRatio * seasonMult

    const outputs = def.outputsPerFastTick[levelIndex]
    for (const [goodId, output] of Object.entries(outputs) as [GoodId, number][]) {
      // × 10 to convert fast tick rate to slow tick (day) rate
      rates[goodId] = (rates[goodId] ?? 0) + output * eff * 10
    }
  }

  return rates
}
