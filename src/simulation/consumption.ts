import type { Settlement, GoodId } from './types'
import {
  POPULATION_FOOD_GROWTH,
  POPULATION_STARVATION,
  POPULATION_MEDICINE_BONUS,
  POPULATION_IMMIGRATION_BONUS,
} from '../lib/constants'
import { clamp } from '../lib/math'

// How much of each good 100 people consume per slow tick (per game day).
// These are real consumption rates; scale linearly with population.
export const CONSUMPTION_PER_100_POP_PER_DAY: Partial<Record<GoodId, number>> = {
  bread:       2.0,   // staple — people need this daily
  fish:        0.5,   // secondary food
  salted_fish: 0.3,   // preserved food substitute
  meat:        0.4,   // occasional meat
  ale:         0.5,   // morale
  clothing:    0.08,  // clothing wears out slowly
  boots:       0.04,  // boots too
  medicine:    0.02,  // small but important effect on death rate
  candles:     0.05,  // lighting
  wine:        0.02,  // luxury — optional
  tools:       0.005, // citizens use tools for household tasks (small)
}

export interface ConsumptionResult {
  consumed: Partial<Record<GoodId, number>>
  shortfalls: Partial<Record<GoodId, number>> // how much was demanded but unavailable
  fedRatio: number    // 0–1, how well food demand was met
  hasFood: boolean
  hasMedicine: boolean
  hasMorale: boolean  // ale or wine available
}

/**
 * Run one slow tick (one game day) of population consumption.
 * Mutates inventory in place. Returns a summary of consumption and shortfalls.
 */
export function runConsumptionTick(settlement: Settlement): ConsumptionResult {
  const consumed: Partial<Record<GoodId, number>> = {}
  const shortfalls: Partial<Record<GoodId, number>> = {}

  const pop = settlement.population
  if (pop <= 0) {
    return { consumed, shortfalls, fedRatio: 1, hasFood: true, hasMedicine: true, hasMorale: true }
  }

  const scale = pop / 100

  let totalFoodDemand = 0
  let totalFoodMet = 0

  for (const [goodId, ratePerHundred] of Object.entries(CONSUMPTION_PER_100_POP_PER_DAY) as [GoodId, number][]) {
    const demanded = ratePerHundred * scale
    const available = settlement.inventory[goodId] ?? 0
    const actual = Math.min(demanded, available)
    const shortfall = demanded - actual

    if (actual > 0) {
      settlement.inventory[goodId] = available - actual
      consumed[goodId] = actual
    }
    if (shortfall > 0.001) {
      shortfalls[goodId] = shortfall
    }

    // Track food satisfaction separately (bread, fish, salted_fish, meat are food)
    const isFoodGood = goodId === 'bread' || goodId === 'fish' || goodId === 'salted_fish' || goodId === 'meat'
    if (isFoodGood) {
      totalFoodDemand += demanded
      totalFoodMet += actual
    }
  }

  const fedRatio = totalFoodDemand > 0 ? clamp(totalFoodMet / totalFoodDemand, 0, 1) : 1

  const hasFood = fedRatio > 0.5
  const hasMedicine = (shortfalls['medicine'] ?? 0) < (CONSUMPTION_PER_100_POP_PER_DAY['medicine']! * scale * 0.5)
  const hasMorale = (consumed['ale'] ?? 0) > 0 || (consumed['wine'] ?? 0) > 0

  return { consumed, shortfalls, fedRatio, hasFood, hasMedicine, hasMorale }
}

/**
 * Update population based on consumption results and settlement conditions.
 * Called once per slow tick. Returns the new population value.
 */
export function updatePopulation(
  settlement: Settlement,
  result: ConsumptionResult,
): number {
  let pop = settlement.population
  if (pop <= 0) return 0

  // Food-driven growth or starvation
  if (result.fedRatio >= 0.9) {
    pop += pop * POPULATION_FOOD_GROWTH
  } else if (result.fedRatio < 0.3) {
    // Severe starvation
    pop += pop * POPULATION_STARVATION
  } else {
    // Partial food: interpolate between starvation and growth
    const t = (result.fedRatio - 0.3) / 0.6
    const rate = POPULATION_STARVATION + t * (POPULATION_FOOD_GROWTH - POPULATION_STARVATION)
    pop += pop * rate
  }

  // Medicine reduces death rate (bonus growth)
  if (result.hasMedicine) {
    pop += pop * POPULATION_MEDICINE_BONUS
  }

  // Morale (ale/wine) attracts immigration when treasury is healthy
  if (result.hasMorale && settlement.treasury > 500) {
    pop += pop * POPULATION_IMMIGRATION_BONUS
  }

  // Clamp: no negative population; cap at populationCap
  pop = clamp(Math.round(pop), 0, settlement.populationCap)

  return pop
}

/**
 * Compute aggregate daily consumption rates for display.
 * Returns expected consumption per slow tick at current population.
 */
export function computeConsumptionRates(settlement: Settlement): Partial<Record<GoodId, number>> {
  const rates: Partial<Record<GoodId, number>> = {}
  const scale = settlement.population / 100

  for (const [goodId, ratePerHundred] of Object.entries(CONSUMPTION_PER_100_POP_PER_DAY) as [GoodId, number][]) {
    rates[goodId] = ratePerHundred * scale
  }

  return rates
}

/**
 * Compute the population cap from warehouse and housing buildings.
 * Each settlement starts with a base cap; warehouses increase it.
 */
export function computePopulationCap(settlement: Settlement): number {
  const BASE_POP_CAP = 200
  let bonus = 0
  for (const b of settlement.buildings) {
    if (b.buildProgress < 1.0) continue
    if (b.type === 'warehouse') bonus += b.level * 150
    if (b.type === 'market')    bonus += b.level * 100
    if (b.type === 'tavern')    bonus += b.level * 50
    if (b.type === 'guild_hall') bonus += b.level * 200
  }
  return BASE_POP_CAP + bonus
}
