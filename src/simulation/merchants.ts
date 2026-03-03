import type { Merchant, WorldState, GoodId, TradeRoute } from './types'
import { GOODS } from './goods'
import { BUILDINGS } from './buildings'
import {
  MIN_PROFIT_THRESHOLD,
  NPC_MERCHANT_SCAN_RANGE,
  NPC_PRICE_KNOWLEDGE_DECAY,
  ROAD_SPEED,
} from '../lib/constants'
import { estimateMargin } from './pricing'
import { dispatchCaravan, estimateTravelDays, findRoad } from './caravans'
import { tradeRouteId } from '../lib/ids'
import { clamp } from '../lib/math'

/**
 * Update a merchant's known prices for a settlement they just visited.
 */
export function updateKnownPrices(merchant: Merchant, settlementId: string, world: WorldState): void {
  const settlement = world.settlements[settlementId]
  if (!settlement) return

  if (!merchant.knownPrices[settlementId]) {
    merchant.knownPrices[settlementId] = {}
  }

  for (const [goodId, price] of Object.entries(settlement.prices) as [GoodId, number][]) {
    merchant.knownPrices[settlementId][goodId] = {
      price,
      observedAtTick: world.slowTick,
    }
  }
}

/**
 * Get a merchant's best known price for a good at a settlement.
 * Returns null if the merchant has no recent knowledge (stale or unvisited).
 */
function getKnownPrice(
  merchant: Merchant,
  settlementId: string,
  goodId: GoodId,
  currentTick: number,
): number | null {
  const memory = merchant.knownPrices[settlementId]?.[goodId]
  if (!memory) return null
  // Stale if observed more than NPC_PRICE_KNOWLEDGE_DECAY ticks ago
  if (currentTick - memory.observedAtTick > NPC_PRICE_KNOWLEDGE_DECAY) return null
  return memory.price
}

/**
 * Run the NPC merchant decision cycle for one slow tick.
 * If the merchant is idle, finds the best trade route and dispatches a caravan.
 */
export function runNpcMerchantDecision(merchant: Merchant, world: WorldState): void {
  // Skip if already traveling
  if (merchant.caravanId) {
    merchant.idleTicks = 0
    return
  }

  merchant.idleTicks++

  const homeSettlement = world.settlements[merchant.homeSettlementId]
  if (!homeSettlement) return

  // Ensure the merchant knows current prices at their home settlement
  updateKnownPrices(merchant, merchant.homeSettlementId, world)

  // Collect settlements this merchant can consider (those they know prices for, or home)
  const knownSettlementIds = Object.keys(merchant.knownPrices)
  const candidateIds = knownSettlementIds.length > 0
    ? knownSettlementIds.slice(0, NPC_MERCHANT_SCAN_RANGE)
    : [merchant.homeSettlementId]

  // Also occasionally explore a random unknown settlement (discovery)
  const allIds = Object.keys(world.settlements)
  if (allIds.length > candidateIds.length && Math.random() < 0.15) {
    const unknown = allIds.filter(id => !knownSettlementIds.includes(id))
    if (unknown.length > 0) {
      candidateIds.push(unknown[Math.floor(Math.random() * unknown.length)])
    }
  }

  let bestRoute: TradeRoute | null = null
  let bestMargin = MIN_PROFIT_THRESHOLD

  for (const fromId of candidateIds) {
    const fromSettlement = world.settlements[fromId]
    if (!fromSettlement) continue

    // Need a road from home to the source (or source IS home)
    const canReachFrom = fromId === merchant.homeSettlementId
      || findRoad(merchant.homeSettlementId, fromId, world.roads) !== null

    if (!canReachFrom) continue

    for (const toId of candidateIds) {
      if (toId === fromId) continue

      const toSettlement = world.settlements[toId]
      if (!toSettlement) continue

      // Need a road from source to destination
      if (!findRoad(fromId, toId, world.roads)) continue

      const travelDays = estimateTravelDays(fromId, toId, world.roads)

      for (const goodId of Object.keys(GOODS) as GoodId[]) {
        const buyPrice = getKnownPrice(merchant, fromId, goodId, world.slowTick)
          ?? fromSettlement.prices[goodId]
        const sellPrice = getKnownPrice(merchant, toId, goodId, world.slowTick)
          ?? toSettlement.prices[goodId]

        if (!buyPrice || !sellPrice) continue
        if (sellPrice <= buyPrice) continue

        // How many units fit in the cart (weight-limited)?
        const goodDef = GOODS[goodId]
        const maxQty = Math.floor(merchant.cartCapacity / (goodDef?.weightPerUnit ?? 1))
        // Can't buy more than what's available at source
        const available = fromSettlement.inventory[goodId] ?? 0
        const quantity = Math.min(maxQty, Math.floor(available * 0.5)) // take at most half stock
        if (quantity <= 0) continue

        // Rough travel cost: 1 gold per day per unit weight (opportunity cost)
        const travelCostPerUnit = travelDays * 0.1

        const margin = estimateMargin(
          buyPrice, sellPrice, quantity,
          fromSettlement.tariffRate, toSettlement.tariffRate,
          travelCostPerUnit,
        )

        if (margin > bestMargin) {
          bestMargin = margin
          bestRoute = {
            id: tradeRouteId(),
            merchantId: merchant.id,
            fromId,
            toId,
            good: goodId,
            buyThreshold: buyPrice * 1.1,
            sellThreshold: sellPrice * 0.9,
            quantityPerTrip: quantity,
          }
        }
      }
    }
  }

  if (!bestRoute) return

  // Build cargo from identified good
  const cargo: Partial<Record<GoodId, number>> = {
    [bestRoute.good]: bestRoute.quantityPerTrip,
  }

  // Buy the cargo from source settlement (deduct from inventory)
  const fromSettlement = world.settlements[bestRoute.fromId]
  if (!fromSettlement) return

  const price = fromSettlement.prices[bestRoute.good] ?? 0
  const totalCost = price * bestRoute.quantityPerTrip * (1 + fromSettlement.tariffRate)

  if (merchant.gold < totalCost) {
    // Can't afford — scale down quantity
    const affordable = Math.floor(merchant.gold / (price * (1 + fromSettlement.tariffRate)))
    if (affordable <= 0) return
    cargo[bestRoute.good] = affordable
    bestRoute.quantityPerTrip = affordable
  }

  // Deduct purchase cost from merchant gold
  const actualQty = cargo[bestRoute.good] ?? 0
  merchant.gold -= price * actualQty * (1 + fromSettlement.tariffRate)
  fromSettlement.treasury += price * actualQty * fromSettlement.tariffRate

  // Update known prices before leaving
  updateKnownPrices(merchant, bestRoute.fromId, world)

  // Dispatch caravan
  const caravan = dispatchCaravan(merchant.id, bestRoute.fromId, bestRoute.toId, cargo, world)

  if (caravan) {
    merchant.assignedRoute = bestRoute
    // Merchant will update destination prices on arrival (handled in delivery)
  }
}

/**
 * Run merchant decisions for all NPC merchants in the world.
 */
export function runAllNpcMerchants(world: WorldState): void {
  for (const merchant of Object.values(world.merchants)) {
    if (merchant.isNpc) {
      runNpcMerchantDecision(merchant, world)
    }
  }
}

/**
 * Allocate workers across all buildings in every settlement.
 * Greedy fill in tier order — food production is highest priority.
 */
export function allocateWorkersFromDefs(world: WorldState): void {
  for (const settlement of Object.values(world.settlements)) {
    const availableWorkers = Math.floor(settlement.population * 0.45)
    let remaining = availableWorkers

    // Priority order: food production first, then processing, then crafting
    const prioritized = [...settlement.buildings].sort((a, b) => {
      const defA = BUILDINGS[a.type]
      const defB = BUILDINGS[b.type]
      const tierA = defA?.tier ?? 4
      const tierB = defB?.tier ?? 4
      // Infrastructure (tier 4) goes last
      if (tierA === 4) return 1
      if (tierB === 4) return -1
      return tierA - tierB
    })

    for (const building of prioritized) {
      if (building.buildProgress < 1.0) {
        building.workers = 0
        continue
      }
      const def = BUILDINGS[building.type]
      if (!def) continue
      const maxWorkers = def.workersByLevel[(building.level - 1) as 0 | 1 | 2]
      building.workers = clamp(Math.min(remaining, maxWorkers), 0, maxWorkers)
      remaining -= building.workers
    }
  }
}
