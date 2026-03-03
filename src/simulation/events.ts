import type { Settlement, GameEvent, GoodId, EventType, WorldState } from './types'
import { EVENT_LOG_MAX } from '../lib/constants'
import { GOODS } from './goods'
import { eventId } from '../lib/ids'

function makeEvent(
  world: WorldState,
  type: EventType,
  message: string,
  settlementId?: string,
  goodId?: GoodId,
): GameEvent {
  return {
    id: eventId(),
    tick: world.fastTick,
    dayTick: world.slowTick,
    type,
    message,
    settlementId,
    goodId,
  }
}

/**
 * Generate events from a single settlement's state change this tick.
 * Compares previous inventory/prices to current to detect notable changes.
 */
export function generateSettlementEvents(
  settlement: Settlement,
  prevInventory: Partial<Record<GoodId, number>>,
  prevPrices: Partial<Record<GoodId, number>>,
  world: WorldState,
): GameEvent[] {
  const events: GameEvent[] = []

  // Check for critical shortages: stock < 2 days of consumption
  for (const [goodId, consumptionRate] of Object.entries(settlement.consumptionRates) as [GoodId, number][]) {
    if (consumptionRate <= 0) continue
    const stock = settlement.inventory[goodId] ?? 0
    const daysLeft = stock / consumptionRate
    const prevStock = prevInventory[goodId] ?? 0
    const prevDaysLeft = prevStock / consumptionRate

    // Trigger when crossing the 2-day threshold from above
    if (daysLeft < 2 && prevDaysLeft >= 2) {
      const goodName = GOODS[goodId]?.name ?? goodId
      events.push(makeEvent(
        world, 'shortage_warning',
        `${settlement.name}: ${goodName} shortage — only ${daysLeft.toFixed(1)} days of stock remaining.`,
        settlement.id, goodId,
      ))
    }
  }

  // Check for extreme surplus: stock > 5× target consumption rate
  for (const [goodId, productionRate] of Object.entries(settlement.productionRates) as [GoodId, number][]) {
    if (productionRate <= 0) continue
    const stock = settlement.inventory[goodId] ?? 0
    const consumptionRate = settlement.consumptionRates[goodId] ?? 0
    // Surplus: more than 20 days of consumption AND a producer but no buyer
    if (consumptionRate < productionRate * 0.1 && stock > productionRate * 20) {
      const prevStock = prevInventory[goodId] ?? 0
      // Only fire once when crossing the threshold
      if (prevStock <= productionRate * 20) {
        const goodName = GOODS[goodId]?.name ?? goodId
        events.push(makeEvent(
          world, 'surplus_alert',
          `${settlement.name}: ${goodName} surplus — warehouses filling, prices dropping.`,
          settlement.id, goodId,
        ))
      }
    }
  }

  // Check for price spikes: current price > 2× previous price
  for (const [goodId, currentPrice] of Object.entries(settlement.prices) as [GoodId, number][]) {
    const prev = prevPrices[goodId]
    if (!prev || prev <= 0) continue
    const ratio = currentPrice / prev
    if (ratio >= 2.0) {
      const goodName = GOODS[goodId]?.name ?? goodId
      events.push(makeEvent(
        world, 'price_spike',
        `${settlement.name}: ${goodName} price spiked to ${currentPrice.toFixed(0)}g (was ${prev.toFixed(0)}g).`,
        settlement.id, goodId,
      ))
    } else if (ratio <= 0.5) {
      const goodName = GOODS[goodId]?.name ?? goodId
      events.push(makeEvent(
        world, 'price_crash',
        `${settlement.name}: ${goodName} price crashed to ${currentPrice.toFixed(0)}g (was ${prev.toFixed(0)}g).`,
        settlement.id, goodId,
      ))
    }
  }

  return events
}

/**
 * Generate a population change event if population crossed a round threshold.
 */
export function generatePopulationEvent(
  settlement: Settlement,
  prevPop: number,
  world: WorldState,
): GameEvent | null {
  const milestones = [100, 250, 500, 750, 1000, 1500, 2000, 3000, 5000]

  for (const milestone of milestones) {
    if (prevPop < milestone && settlement.population >= milestone) {
      return makeEvent(
        world, 'population_growth',
        `${settlement.name} has grown to ${milestone.toLocaleString()} inhabitants!`,
        settlement.id,
      )
    }
    if (prevPop >= milestone && settlement.population < milestone) {
      return makeEvent(
        world, 'population_decline',
        `${settlement.name}'s population fell below ${milestone.toLocaleString()}.`,
        settlement.id,
      )
    }
  }

  return null
}

/**
 * Generate a season-change event.
 */
export function generateSeasonEvent(world: WorldState): GameEvent {
  const seasonName = world.season.charAt(0).toUpperCase() + world.season.slice(1)
  return makeEvent(
    world, 'season_change',
    `${seasonName} has arrived. Year ${world.year}, Day 1 of ${seasonName}.`,
  )
}

/**
 * Append events to world log, capping at EVENT_LOG_MAX.
 */
export function appendEvents(world: WorldState, newEvents: GameEvent[]): void {
  world.events.push(...newEvents)
  if (world.events.length > EVENT_LOG_MAX) {
    world.events.splice(0, world.events.length - EVENT_LOG_MAX)
  }
}
