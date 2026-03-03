import type { Settlement, GoodId } from './types'
import { GOODS } from './goods'
import {
  PRICE_CLAMP_MIN,
  PRICE_CLAMP_MAX,
  PRICE_MEAN_REVERSION,
  PRICE_SENSITIVITY,
  MARKET_HISTORY_DAYS,
  TARGET_STOCK_DAYS,
} from '../lib/constants'
import { CONSUMPTION_PER_100_POP_PER_DAY } from './consumption'
import { clamp } from '../lib/math'

/**
 * Update all prices in a settlement for one slow tick.
 *
 * Price model:
 *   newPrice = currentPrice × (1 + (demandPressure - supplyPressure) × SENSITIVITY)
 *
 * Where:
 *   demandPressure = demandedPerDay / max(stock, 1)
 *   supplyPressure = producedPerDay / max(targetStock, 1)
 *
 * Then mean-revert toward base price and clamp.
 */
export function updatePrices(settlement: Settlement): void {
  for (const goodId of Object.keys(settlement.prices) as GoodId[]) {
    const def = GOODS[goodId]
    if (!def) continue

    const currentPrice = settlement.prices[goodId] ?? def.basePrice
    const stock = settlement.inventory[goodId] ?? 0
    const producedPerDay = settlement.productionRates[goodId] ?? 0
    const targetStock = getTargetStock(goodId, settlement)

    // Demand pressure: how urgently is this good needed relative to stock?
    // High stock relative to demand → low pressure. Low stock → high pressure.
    const demandPerDay = settlement.consumptionRates[goodId] ?? 0
    const demandPressure = demandPerDay / Math.max(stock, 0.1)

    // Supply pressure: how well are we producing relative to our target stock?
    const supplyPressure = producedPerDay / Math.max(targetStock, 0.1)

    // Net pressure drives the price change
    const netPressure = demandPressure - supplyPressure
    let newPrice = currentPrice * (1 + netPressure * PRICE_SENSITIVITY)

    // Mean-reversion: gently pull price back toward base value each day
    // This prevents permanent price extremes from simulation artifacts
    newPrice = newPrice * (1 - PRICE_MEAN_REVERSION) + def.basePrice * PRICE_MEAN_REVERSION

    // Clamp to [basePrice × MIN, basePrice × MAX]
    newPrice = clamp(newPrice, def.basePrice * PRICE_CLAMP_MIN, def.basePrice * PRICE_CLAMP_MAX)

    settlement.prices[goodId] = +newPrice.toFixed(2)
  }
}

/**
 * Record current prices into the market history for sparklines.
 * Keeps the last MARKET_HISTORY_DAYS entries.
 */
export function recordPriceHistory(settlement: Settlement): void {
  for (const goodId of Object.keys(settlement.prices) as GoodId[]) {
    const price = settlement.prices[goodId]
    if (price === undefined) continue

    if (!settlement.marketHistory[goodId]) {
      settlement.marketHistory[goodId] = []
    }
    const history = settlement.marketHistory[goodId]!
    history.push(price)
    if (history.length > MARKET_HISTORY_DAYS) {
      history.shift()
    }
  }
}

/**
 * How much stock of this good should a settlement ideally hold?
 * Based on daily consumption × TARGET_STOCK_DAYS buffer.
 * Minimum is 10 units so that even non-consumed goods have a reference.
 */
export function getTargetStock(goodId: GoodId, settlement: Settlement): number {
  const consumptionPerHundred = CONSUMPTION_PER_100_POP_PER_DAY[goodId] ?? 0
  const dailyConsumption = consumptionPerHundred * (settlement.population / 100)
  const fromConsumption = dailyConsumption * TARGET_STOCK_DAYS

  // Also factor in production input needs (a smelter needs iron ore buffer)
  const dailyProduction = settlement.productionRates[goodId] ?? 0
  const fromProduction = dailyProduction * TARGET_STOCK_DAYS * 0.5

  return Math.max(10, fromConsumption + fromProduction)
}

/**
 * Initialise prices for a new settlement at base price.
 */
export function initializePrices(settlement: Settlement): void {
  for (const [goodId, def] of Object.entries(GOODS) as [GoodId, (typeof GOODS)[GoodId]][]) {
    settlement.prices[goodId] = def.basePrice
  }
}

/**
 * Estimate the profitability of buying at fromPrice and selling at toPrice,
 * accounting for tariffs and a rough travel cost.
 */
export function estimateMargin(
  fromPrice: number,
  toPrice: number,
  quantity: number,
  fromTariff: number,
  toTariff: number,
  travelCostPerUnit: number,
): number {
  const buyCost = fromPrice * quantity * (1 + fromTariff)
  const sellRevenue = toPrice * quantity * (1 - toTariff)
  const travelCost = travelCostPerUnit * quantity
  return sellRevenue - buyCost - travelCost
}
