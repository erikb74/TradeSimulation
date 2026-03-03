import type { BuildingDefinition, BuildingType, GoodId, TerrainType } from './types'

// Helper: build a 3-level input/output triplet where each level scales up.
// Pass the level-1 rates; level 2 = 1.8×, level 3 = 3.0× (more workers = more output).
function scale(
  base: Partial<Record<GoodId, number>>,
): [Partial<Record<GoodId, number>>, Partial<Record<GoodId, number>>, Partial<Record<GoodId, number>>] {
  const scale2: Partial<Record<GoodId, number>> = {}
  const scale3: Partial<Record<GoodId, number>> = {}
  for (const [k, v] of Object.entries(base) as [GoodId, number][]) {
    scale2[k] = +(v * 1.8).toFixed(4)
    scale3[k] = +(v * 3.0).toFixed(4)
  }
  return [base, scale2, scale3]
}

// All terrain types that are land (not water) — used for buildings with no terrain restriction
const LAND: TerrainType[] = ['plains', 'forest', 'hills', 'mountains', 'marsh', 'coast']

export const BUILDINGS: Record<BuildingType, BuildingDefinition> = {

  // ─────────────────────────────────────────────────────────────────────────
  // TIER 1 — Raw Resource Extraction
  // ─────────────────────────────────────────────────────────────────────────

  grain_farm: {
    id: 'grain_farm', name: 'Grain Farm', tier: 1, maxLevel: 3,
    requiredTerrain: ['plains'],
    workersByLevel: [4, 8, 14],
    // 0.125 grain/hour → ~3 grain/day at level 1 (1 slow tick = 10 fast ticks ≈ 1 game day)
    inputsPerFastTick:  scale({}),
    outputsPerFastTick: scale({ grain: 0.125 }),
    buildCostByLevel: [80, 200, 500],
    buildTimeDays: [3, 7, 14],
    description: 'Produces grain from fertile plains. Affected strongly by season.',
  },

  cattle_ranch: {
    id: 'cattle_ranch', name: 'Cattle Ranch', tier: 1, maxLevel: 3,
    requiredTerrain: ['plains', 'hills'],
    workersByLevel: [3, 6, 10],
    inputsPerFastTick:  scale({}),
    outputsPerFastTick: scale({ cattle: 0.025 }),
    buildCostByLevel: [120, 300, 700],
    buildTimeDays: [4, 10, 20],
    description: 'Raises cattle for meat and hides. Slow output, high value.',
  },

  logging_camp: {
    id: 'logging_camp', name: 'Logging Camp', tier: 1, maxLevel: 3,
    requiredTerrain: ['forest'],
    workersByLevel: [4, 8, 14],
    inputsPerFastTick:  scale({ tools: 0.002 }),
    outputsPerFastTick: scale({ timber: 0.15 }),
    buildCostByLevel: [60, 150, 380],
    buildTimeDays: [2, 6, 12],
    description: 'Fells timber from nearby forests. Requires tools.',
  },

  iron_mine: {
    id: 'iron_mine', name: 'Iron Mine', tier: 1, maxLevel: 3,
    requiredTerrain: ['hills', 'mountains'],
    workersByLevel: [5, 10, 18],
    inputsPerFastTick:  scale({ tools: 0.003 }),
    outputsPerFastTick: scale({ iron_ore: 0.10 }),
    buildCostByLevel: [150, 400, 900],
    buildTimeDays: [5, 12, 25],
    description: 'Extracts iron ore from hillside deposits. Requires tools.',
  },

  stone_quarry: {
    id: 'stone_quarry', name: 'Stone Quarry', tier: 1, maxLevel: 3,
    requiredTerrain: ['hills', 'mountains'],
    workersByLevel: [4, 8, 14],
    inputsPerFastTick:  scale({ tools: 0.002 }),
    outputsPerFastTick: scale({ stone: 0.20 }),
    buildCostByLevel: [100, 260, 600],
    buildTimeDays: [4, 9, 18],
    description: 'Quarries stone for construction. Requires tools.',
  },

  fishing_wharf: {
    id: 'fishing_wharf', name: 'Fishing Wharf', tier: 1, maxLevel: 3,
    requiredTerrain: ['coast'],
    workersByLevel: [3, 6, 10],
    inputsPerFastTick:  scale({}),
    outputsPerFastTick: scale({ fish: 0.20 }),
    buildCostByLevel: [70, 180, 440],
    buildTimeDays: [3, 7, 15],
    description: 'Catches fish from coastal waters. No inputs required.',
  },

  salt_pans: {
    id: 'salt_pans', name: 'Salt Pans', tier: 1, maxLevel: 3,
    requiredTerrain: ['coast', 'marsh'],
    workersByLevel: [3, 6, 10],
    inputsPerFastTick:  scale({}),
    outputsPerFastTick: scale({ salt: 0.08 }),
    buildCostByLevel: [90, 220, 520],
    buildTimeDays: [3, 8, 16],
    description: 'Evaporates seawater to produce salt. Slow but essential.',
  },

  sheep_ranch: {
    id: 'sheep_ranch', name: 'Sheep Ranch', tier: 1, maxLevel: 3,
    requiredTerrain: ['plains', 'hills'],
    workersByLevel: [3, 6, 10],
    inputsPerFastTick:  scale({}),
    outputsPerFastTick: scale({ wool: 0.10 }),
    buildCostByLevel: [80, 200, 480],
    buildTimeDays: [3, 7, 14],
    description: 'Raises sheep for wool, a key textile input.',
  },

  herb_garden: {
    id: 'herb_garden', name: 'Herb Garden', tier: 1, maxLevel: 3,
    requiredTerrain: ['plains', 'forest', 'hills'],
    workersByLevel: [2, 4, 7],
    inputsPerFastTick:  scale({}),
    outputsPerFastTick: scale({ herbs: 0.05 }),
    buildCostByLevel: [50, 130, 310],
    buildTimeDays: [2, 5, 10],
    description: 'Cultivates medicinal herbs for the apothecary.',
  },

  vineyard: {
    id: 'vineyard', name: 'Vineyard', tier: 1, maxLevel: 3,
    requiredTerrain: ['plains', 'hills'],
    workersByLevel: [3, 6, 10],
    inputsPerFastTick:  scale({}),
    outputsPerFastTick: scale({ grapes: 0.08 }),
    buildCostByLevel: [100, 250, 600],
    buildTimeDays: [4, 10, 20],
    description: 'Grows grapes for the winery. Peaks in autumn.',
  },

  apiary: {
    id: 'apiary', name: 'Apiary', tier: 1, maxLevel: 3,
    requiredTerrain: ['plains', 'forest'],
    workersByLevel: [2, 3, 5],
    inputsPerFastTick:  scale({}),
    outputsPerFastTick: scale({ beeswax: 0.04 }),
    buildCostByLevel: [40, 100, 240],
    buildTimeDays: [2, 4, 8],
    description: 'Keeps bees for beeswax used in candle-making.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TIER 2 — Processing
  // ─────────────────────────────────────────────────────────────────────────

  windmill: {
    id: 'windmill', name: 'Windmill', tier: 2, maxLevel: 3,
    requiredTerrain: ['plains', 'hills', 'coast'],
    workersByLevel: [2, 4, 6],
    inputsPerFastTick:  scale({ grain: 0.15 }),
    outputsPerFastTick: scale({ flour: 0.12 }),
    buildCostByLevel: [120, 300, 700],
    buildTimeDays: [5, 12, 24],
    description: 'Grinds grain into flour. High conversion efficiency.',
  },

  bakery: {
    id: 'bakery', name: 'Bakery', tier: 2, maxLevel: 3,
    requiredTerrain: LAND,
    workersByLevel: [2, 4, 7],
    inputsPerFastTick:  scale({ flour: 0.10 }),
    outputsPerFastTick: scale({ bread: 0.12 }),
    buildCostByLevel: [80, 200, 480],
    buildTimeDays: [3, 7, 14],
    description: 'Bakes bread from flour. Bread is the primary food staple.',
  },

  slaughterhouse: {
    id: 'slaughterhouse', name: 'Slaughterhouse', tier: 2, maxLevel: 3,
    requiredTerrain: LAND,
    workersByLevel: [3, 5, 8],
    inputsPerFastTick:  scale({ cattle: 0.020 }),
    outputsPerFastTick: scale({ meat: 0.030, hides: 0.020 }),
    buildCostByLevel: [100, 250, 580],
    buildTimeDays: [4, 9, 18],
    description: 'Processes cattle into meat and hides. Yields two products.',
  },

  smokehouse: {
    id: 'smokehouse', name: 'Smokehouse', tier: 2, maxLevel: 3,
    requiredTerrain: LAND,
    workersByLevel: [2, 4, 6],
    inputsPerFastTick:  scale({ fish: 0.15, salt: 0.05 }),
    outputsPerFastTick: scale({ salted_fish: 0.14 }),
    buildCostByLevel: [70, 180, 430],
    buildTimeDays: [3, 7, 14],
    description: 'Preserves fish with salt. Salted fish travels far without spoiling.',
  },

  smelter: {
    id: 'smelter', name: 'Smelter', tier: 2, maxLevel: 3,
    requiredTerrain: ['hills', 'mountains', 'plains'],
    workersByLevel: [4, 8, 13],
    inputsPerFastTick:  scale({ iron_ore: 0.12, timber: 0.05 }),
    outputsPerFastTick: scale({ iron_bar: 0.06 }),
    buildCostByLevel: [180, 460, 1050],
    buildTimeDays: [6, 14, 28],
    description: 'Smelts iron ore into iron bars using timber as fuel.',
  },

  sawmill: {
    id: 'sawmill', name: 'Sawmill', tier: 2, maxLevel: 3,
    requiredTerrain: ['forest', 'plains'],
    workersByLevel: [3, 6, 10],
    inputsPerFastTick:  scale({ timber: 0.15, tools: 0.001 }),
    outputsPerFastTick: scale({ planks: 0.18 }),
    buildCostByLevel: [110, 280, 650],
    buildTimeDays: [4, 10, 20],
    description: 'Cuts timber into planks. Planks are needed for construction.',
  },

  lime_kiln: {
    id: 'lime_kiln', name: 'Lime Kiln', tier: 2, maxLevel: 3,
    requiredTerrain: ['hills', 'mountains', 'plains'],
    workersByLevel: [2, 4, 7],
    inputsPerFastTick:  scale({ stone: 0.15, timber: 0.04 }),
    outputsPerFastTick: scale({ mortar: 0.10 }),
    buildCostByLevel: [90, 230, 540],
    buildTimeDays: [3, 8, 16],
    description: 'Burns limestone to produce mortar for construction.',
  },

  tannery: {
    id: 'tannery', name: 'Tannery', tier: 2, maxLevel: 3,
    requiredTerrain: LAND,
    workersByLevel: [3, 5, 8],
    inputsPerFastTick:  scale({ hides: 0.08 }),
    outputsPerFastTick: scale({ leather: 0.07 }),
    buildCostByLevel: [100, 250, 580],
    buildTimeDays: [4, 9, 18],
    description: 'Tans hides into leather for cobblers and saddlers.',
  },

  loom: {
    id: 'loom', name: 'Loom', tier: 2, maxLevel: 3,
    requiredTerrain: LAND,
    workersByLevel: [3, 6, 10],
    inputsPerFastTick:  scale({ wool: 0.10 }),
    outputsPerFastTick: scale({ cloth: 0.08 }),
    buildCostByLevel: [90, 230, 540],
    buildTimeDays: [3, 8, 16],
    description: 'Weaves wool into cloth for tailors and trade.',
  },

  brewery: {
    id: 'brewery', name: 'Brewery', tier: 2, maxLevel: 3,
    requiredTerrain: LAND,
    workersByLevel: [3, 5, 8],
    inputsPerFastTick:  scale({ grain: 0.12 }),
    outputsPerFastTick: scale({ ale: 0.10 }),
    buildCostByLevel: [100, 260, 600],
    buildTimeDays: [4, 10, 20],
    description: 'Brews ale from grain. Ale raises population morale.',
  },

  winery: {
    id: 'winery', name: 'Winery', tier: 2, maxLevel: 3,
    requiredTerrain: ['plains', 'hills'],
    workersByLevel: [3, 5, 8],
    inputsPerFastTick:  scale({ grapes: 0.10 }),
    outputsPerFastTick: scale({ wine: 0.07 }),
    buildCostByLevel: [130, 330, 780],
    buildTimeDays: [5, 12, 24],
    description: 'Ferments grapes into wine. A high-value luxury export.',
  },

  chandler: {
    id: 'chandler', name: 'Chandler', tier: 2, maxLevel: 3,
    requiredTerrain: LAND,
    workersByLevel: [2, 3, 5],
    inputsPerFastTick:  scale({ beeswax: 0.05 }),
    outputsPerFastTick: scale({ candles: 0.06 }),
    buildCostByLevel: [70, 180, 430],
    buildTimeDays: [2, 6, 12],
    description: 'Makes candles from beeswax. Candles sold to churches and manors.',
  },

  apothecary: {
    id: 'apothecary', name: 'Apothecary', tier: 2, maxLevel: 3,
    requiredTerrain: LAND,
    workersByLevel: [2, 4, 6],
    inputsPerFastTick:  scale({ herbs: 0.06 }),
    outputsPerFastTick: scale({ medicine: 0.03 }),
    buildCostByLevel: [120, 300, 700],
    buildTimeDays: [4, 10, 20],
    description: 'Compounds herbs into medicine, reducing population death rates.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TIER 3 — Crafted Goods
  // ─────────────────────────────────────────────────────────────────────────

  blacksmith: {
    id: 'blacksmith', name: 'Blacksmith', tier: 3, maxLevel: 3,
    requiredTerrain: LAND,
    workersByLevel: [3, 6, 10],
    inputsPerFastTick:  scale({ iron_bar: 0.04 }),
    // Primary output is tools; also produces weapons and armor (split by level)
    outputsPerFastTick: scale({ tools: 0.03, iron_weapons: 0.010 }),
    buildCostByLevel: [200, 500, 1200],
    buildTimeDays: [6, 14, 28],
    description: 'Forges iron bars into tools, weapons, and armor. Tools are critical for all other production.',
  },

  cartwright: {
    id: 'cartwright', name: 'Cartwright', tier: 3, maxLevel: 3,
    requiredTerrain: LAND,
    workersByLevel: [3, 5, 8],
    inputsPerFastTick:  scale({ planks: 0.05, iron_bar: 0.01 }),
    outputsPerFastTick: scale({ carts: 0.005 }),
    buildCostByLevel: [160, 400, 950],
    buildTimeDays: [5, 12, 24],
    description: 'Builds wooden carts for merchants, increasing caravan capacity.',
  },

  cobbler: {
    id: 'cobbler', name: 'Cobbler', tier: 3, maxLevel: 3,
    requiredTerrain: LAND,
    workersByLevel: [2, 4, 6],
    inputsPerFastTick:  scale({ leather: 0.06 }),
    outputsPerFastTick: scale({ boots: 0.05 }),
    buildCostByLevel: [80, 200, 480],
    buildTimeDays: [3, 7, 14],
    description: 'Makes boots from leather. Boots consumed by the population.',
  },

  tailor: {
    id: 'tailor', name: 'Tailor', tier: 3, maxLevel: 3,
    requiredTerrain: LAND,
    workersByLevel: [2, 4, 6],
    inputsPerFastTick:  scale({ cloth: 0.08 }),
    outputsPerFastTick: scale({ clothing: 0.07 }),
    buildCostByLevel: [80, 200, 480],
    buildTimeDays: [3, 7, 14],
    description: 'Sews cloth into clothing consumed by the population.',
  },

  saddler: {
    id: 'saddler', name: 'Saddler', tier: 3, maxLevel: 3,
    requiredTerrain: LAND,
    workersByLevel: [2, 3, 5],
    inputsPerFastTick:  scale({ leather: 0.04 }),
    outputsPerFastTick: scale({ saddles: 0.02 }),
    buildCostByLevel: [100, 250, 580],
    buildTimeDays: [4, 9, 18],
    description: 'Crafts leather saddles for lords and cavalry.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // INFRASTRUCTURE
  // ─────────────────────────────────────────────────────────────────────────

  warehouse: {
    id: 'warehouse', name: 'Warehouse', tier: 4, maxLevel: 3,
    requiredTerrain: LAND,
    workersByLevel: [1, 2, 3],
    inputsPerFastTick:  scale({}),
    outputsPerFastTick: scale({}),
    buildCostByLevel: [150, 400, 1000],
    buildTimeDays: [5, 12, 25],
    description: 'Increases settlement storage capacity and population cap.',
  },

  market: {
    id: 'market', name: 'Market', tier: 4, maxLevel: 3,
    requiredTerrain: LAND,
    workersByLevel: [2, 4, 7],
    inputsPerFastTick:  scale({}),
    outputsPerFastTick: scale({}),
    buildCostByLevel: [200, 500, 1200],
    buildTimeDays: [6, 14, 28],
    description: 'Attracts more merchant traffic, increasing trade volume and tariff income.',
  },

  tavern: {
    id: 'tavern', name: 'Tavern', tier: 4, maxLevel: 3,
    requiredTerrain: LAND,
    workersByLevel: [2, 3, 5],
    inputsPerFastTick:  scale({ ale: 0.02 }),
    outputsPerFastTick: scale({}),
    buildCostByLevel: [100, 250, 600],
    buildTimeDays: [4, 9, 18],
    description: 'Consumes ale to boost population morale and immigration.',
  },

  guild_hall: {
    id: 'guild_hall', name: 'Guild Hall', tier: 4, maxLevel: 3,
    requiredTerrain: LAND,
    workersByLevel: [3, 5, 8],
    inputsPerFastTick:  scale({}),
    outputsPerFastTick: scale({}),
    buildCostByLevel: [500, 1200, 3000],
    buildTimeDays: [14, 30, 60],
    description: 'Attracts skilled workers, increasing building efficiency across the settlement.',
  },
}
