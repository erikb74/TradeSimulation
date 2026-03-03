import type {
  WorldState, StateSnapshot, SimCommand, Settlement,
  GoodId, CaravanSnapshot, MerchantSnapshot, SettlementSnapshot,
} from './types'
import { ALL_GOOD_IDS } from './types'
import { runProductionTick, computeProductionRates } from './production'
import { runConsumptionTick, updatePopulation, computeConsumptionRates, computePopulationCap } from './consumption'
import { updatePrices, recordPriceHistory } from './pricing'
import { moveCaravans, deliverCaravan } from './caravans'
import { runAllNpcMerchants, allocateWorkersFromDefs, updateKnownPrices } from './merchants'
import {
  getSeason, getYear, getDayOfSeason,
} from './seasons'
import {
  generateSettlementEvents, generatePopulationEvent,
  generateSeasonEvent, appendEvents,
} from './events'
import { saveToIndexedDB } from './save'
import { AUTOSAVE_INTERVAL, EVENT_LOG_MAX } from '../lib/constants'

export class SimulationEngine {
  private world: WorldState

  constructor(world: WorldState) {
    this.world = world
  }

  getWorld(): WorldState {
    return this.world
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FAST TICK — runs every 500ms at 1x speed (1 game hour)
  // ─────────────────────────────────────────────────────────────────────────

  fastTick(): void {
    const w = this.world
    w.fastTick++

    // Move all caravans forward
    const arrived = moveCaravans(w)

    // Deliver arrived caravans and collect events
    const deliveryEvents = arrived.flatMap(caravan => {
      // Update merchant's known prices on arrival
      const merchant = w.merchants[caravan.merchantId]
      if (merchant) updateKnownPrices(merchant, caravan.toId, w)
      return deliverCaravan(caravan, w)
    })
    appendEvents(w, deliveryEvents)

    // Run production for all settlements
    for (const settlement of Object.values(w.settlements)) {
      runProductionTick(settlement, w)

      // Advance construction on buildings under construction
      for (const building of settlement.buildings) {
        if (building.buildProgress < 1.0) {
          // Each fast tick advances by 1/(buildTimeDays * 10) — 10 fast ticks per slow tick
          // buildTimeDays is stored per level but here we just nudge by a small fixed rate
          building.buildProgress = Math.min(1.0, building.buildProgress + 0.01)
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SLOW TICK — runs every 5000ms at 1x speed (1 game day)
  // ─────────────────────────────────────────────────────────────────────────

  slowTick(): void {
    const w = this.world
    w.slowTick++

    // Update time
    const prevSeason = w.season
    w.season = getSeason(w.slowTick)
    w.year = getYear(w.slowTick)
    w.day = getDayOfSeason(w.slowTick)

    // Season change event
    if (w.season !== prevSeason) {
      appendEvents(w, [generateSeasonEvent(w)])
    }

    // Update rates (used for pricing and events)
    for (const settlement of Object.values(w.settlements)) {
      settlement.productionRates = computeProductionRates(settlement, w)
      settlement.consumptionRates = computeConsumptionRates(settlement)
    }

    // Consumption, population, prices — per settlement
    for (const settlement of Object.values(w.settlements)) {
      const prevInventory = { ...settlement.inventory }
      const prevPrices = { ...settlement.prices }
      const prevPop = settlement.population

      // Population consumes goods
      const consumptionResult = runConsumptionTick(settlement)

      // Population changes based on consumption
      settlement.population = updatePopulation(settlement, consumptionResult)
      settlement.populationCap = computePopulationCap(settlement)

      // Prices update based on supply/demand
      updatePrices(settlement)
      recordPriceHistory(settlement)

      // Generate events from state changes
      const settlementEvents = generateSettlementEvents(settlement, prevInventory, prevPrices, w)
      const popEvent = generatePopulationEvent(settlement, prevPop, w)
      if (popEvent) settlementEvents.push(popEvent)
      appendEvents(w, settlementEvents)
    }

    // Reallocate workers across all settlements
    allocateWorkersFromDefs(w)

    // NPC merchant decisions
    runAllNpcMerchants(w)

    // Autosave check
    w.ticksSinceAutosave++
    if (w.ticksSinceAutosave >= AUTOSAVE_INTERVAL) {
      w.ticksSinceAutosave = 0
      void saveToIndexedDB(w)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // IDLE CATCH-UP
  // ─────────────────────────────────────────────────────────────────────────

  idleCatchup(missedSlowTicks: number): void {
    for (let i = 0; i < missedSlowTicks; i++) {
      // Run fast ticks within each slow tick
      for (let f = 0; f < 10; f++) {
        this.fastTick()
      }
      this.slowTick()
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COMMAND HANDLER
  // ─────────────────────────────────────────────────────────────────────────

  applyCommand(cmd: SimCommand): void {
    const w = this.world
    switch (cmd.type) {
      case 'SET_SPEED':
        // Speed is handled by the worker's interval management, not the engine
        break

      case 'SET_ROUTE': {
        const merchant = w.merchants[cmd.merchantId]
        if (!merchant) break
        merchant.assignedRoute = {
          id: `r_${cmd.merchantId}`,
          merchantId: cmd.merchantId,
          fromId: cmd.fromId,
          toId: cmd.toId,
          good: cmd.good,
          buyThreshold: cmd.buyThreshold,
          sellThreshold: cmd.sellThreshold,
          quantityPerTrip: cmd.quantityPerTrip,
        }
        break
      }

      case 'CANCEL_ROUTE': {
        const merchant = w.merchants[cmd.merchantId]
        if (!merchant) break
        merchant.assignedRoute = undefined
        break
      }

      case 'BUY_SELL': {
        const settlement = w.settlements[cmd.settlementId]
        if (!settlement) break
        const price = settlement.prices[cmd.good] ?? 0
        const tariff = settlement.tariffRate

        if (cmd.action === 'buy') {
          const cost = price * cmd.quantity * (1 + tariff)
          if (w.playerGold < cost) break
          const available = settlement.inventory[cmd.good] ?? 0
          if (available < cmd.quantity) break
          settlement.inventory[cmd.good] = available - cmd.quantity
          w.playerGold -= cost
          settlement.treasury += cost
        } else {
          const revenue = price * cmd.quantity * (1 - tariff)
          w.playerGold += revenue
          settlement.inventory[cmd.good] = (settlement.inventory[cmd.good] ?? 0) + cmd.quantity
        }
        break
      }

      case 'BUILD_BUILDING': {
        // Building placement is a Phase 6 feature; basic stub here
        break
      }

      case 'UPGRADE_BUILDING': {
        // Upgrade stub
        break
      }

      case 'HIRE_MERCHANT': {
        // Merchant hire stub
        break
      }

      case 'NEW_GAME':
      case 'LOAD_SAVE':
        // These are handled at the worker level before engine init
        break
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SNAPSHOT — serialized read-only view sent to main thread
  // ─────────────────────────────────────────────────────────────────────────

  serializeSnapshot(): StateSnapshot {
    const w = this.world

    const settlements: Record<string, SettlementSnapshot> = {}
    for (const [id, s] of Object.entries(w.settlements)) {
      settlements[id] = {
        id: s.id,
        name: s.name,
        position: s.position,
        type: s.type,
        terrain: s.terrain,
        population: s.population,
        populationCap: s.populationCap,
        treasury: s.treasury,
        lordId: s.lordId,
        tariffRate: s.tariffRate,
        buildings: s.buildings.map(b => ({ ...b })),
        inventory: { ...s.inventory } as Record<GoodId, number>,
        prices: { ...s.prices } as Record<GoodId, number>,
        marketHistory: { ...s.marketHistory },
        productionRates: { ...s.productionRates },
        consumptionRates: { ...s.consumptionRates },
      }
    }

    const caravans: Record<string, CaravanSnapshot> = {}
    for (const [id, c] of Object.entries(w.caravans)) {
      const merchant = w.merchants[c.merchantId]
      caravans[id] = {
        id: c.id,
        merchantId: c.merchantId,
        fromId: c.fromId,
        toId: c.toId,
        cargo: { ...c.cargo },
        progress: c.progress,
        returning: c.returning,
        isPlayerOwned: !merchant?.isNpc,
      }
    }

    const merchants: Record<string, MerchantSnapshot> = {}
    for (const [id, m] of Object.entries(w.merchants)) {
      merchants[id] = {
        id: m.id,
        name: m.name,
        homeSettlementId: m.homeSettlementId,
        cartCapacity: m.cartCapacity,
        gold: m.gold,
        mode: m.mode,
        assignedRoute: m.assignedRoute ? { ...m.assignedRoute } : undefined,
        caravanId: m.caravanId,
        isNpc: m.isNpc,
        idleTicks: m.idleTicks,
      }
    }

    const recentEvents = w.events.slice(-20)

    return {
      fastTick: w.fastTick,
      slowTick: w.slowTick,
      season: w.season,
      year: w.year,
      day: w.day,
      playerGold: w.playerGold,
      settlements,
      caravans,
      merchants,
      roads: w.roads,
      rivers: w.rivers,
      resourceNodes: w.resourceNodes,
      mapWidth: w.mapWidth,
      mapHeight: w.mapHeight,
      events: w.events,
      recentEvents,
    }
  }
}
