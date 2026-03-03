// All game constants in one place — change here only, never hardcode in logic.

export const FAST_TICK_MS = 500          // ms per fast tick at 1x speed
export const SLOW_TICK_MS = 5000         // ms per slow tick at 1x speed
export const FAST_TICKS_PER_SLOW = 10   // slow tick fires every N fast ticks
export const TICKS_PER_SEASON = 30      // slow ticks per season (~30 days)
export const TICKS_PER_YEAR = 120       // slow ticks per year (4 seasons × 30)

// Offline catch-up cap: 3 real days worth of slow ticks at 1x speed
// (1 slow tick = 5s; 3 days = 259200s; 259200/5 = 51840)
export const MAX_OFFLINE_SLOW_TICKS = 51840

// Price model
export const PRICE_CLAMP_MIN = 0.3      // minimum price as multiplier of base price
export const PRICE_CLAMP_MAX = 8.0      // maximum price as multiplier of base price
export const PRICE_MEAN_REVERSION = 0.01 // fraction nudged back toward base per slow tick
export const PRICE_SENSITIVITY = 0.15  // how strongly stock imbalance moves price

// Trade
export const MIN_PROFIT_THRESHOLD = 10  // gold — merchants ignore routes below this margin
export const CARAVAN_BASE_SPEED = 0.02  // progress per fast tick on a gravel road (0→1)
export const ROAD_SPEED: Record<string, number> = {
  dirt:   0.010,
  gravel: 0.020,
  stone:  0.035,
}

// Population
export const POPULATION_FOOD_GROWTH = 0.005   // growth rate per slow tick when fed
export const POPULATION_STARVATION = -0.010   // decline rate per slow tick when starving
export const POPULATION_MEDICINE_BONUS = 0.002 // extra growth when medicine available
export const POPULATION_IMMIGRATION_BONUS = 0.002 // extra growth when prosperous

// Merchant AI
export const NPC_MERCHANT_SCAN_RANGE = 5       // max settlements an NPC scans per decision
export const NPC_PRICE_KNOWLEDGE_DECAY = 60    // slow ticks before an NPC's price memory goes stale

// Building
export const BUILDING_MAINTENANCE_RATE = 0.1  // gold per level per slow tick

// Economy
export const AUTOSAVE_INTERVAL = 60    // slow ticks between autosaves (~5 minutes at 1x)
export const EVENT_LOG_MAX = 200       // max events kept in WorldState
export const MARKET_HISTORY_DAYS = 30  // price history entries kept per good

// Target stock: settlement aims to keep this many days of consumption in stock
export const TARGET_STOCK_DAYS = 7

// Game speeds (interval multipliers — lower = faster)
export const GAME_SPEEDS = {
  pause: null,
  '1x':  1.0,
  '2x':  0.5,
  '5x':  0.2,
  debug: 0.1,
} as const

export type GameSpeed = keyof typeof GAME_SPEEDS
