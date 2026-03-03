import type { GoodDefinition, GoodId } from './types'

export const GOODS: Record<GoodId, GoodDefinition> = {
  // ── Tier 1: Raw Resources ──────────────────────────────────────────────────
  grain: {
    id: 'grain', name: 'Grain', basePrice: 4, weightPerUnit: 2,
    tier: 1, category: 'staple_food',
  },
  cattle: {
    id: 'cattle', name: 'Cattle', basePrice: 18, weightPerUnit: 8,
    tier: 1, category: 'raw_material',
  },
  timber: {
    id: 'timber', name: 'Timber', basePrice: 6, weightPerUnit: 3,
    tier: 1, category: 'raw_material',
  },
  iron_ore: {
    id: 'iron_ore', name: 'Iron Ore', basePrice: 8, weightPerUnit: 4,
    tier: 1, category: 'raw_material',
  },
  stone: {
    id: 'stone', name: 'Stone', basePrice: 3, weightPerUnit: 5,
    tier: 1, category: 'raw_material',
  },
  fish: {
    id: 'fish', name: 'Fish', basePrice: 5, weightPerUnit: 1,
    tier: 1, category: 'staple_food',
  },
  salt: {
    id: 'salt', name: 'Salt', basePrice: 10, weightPerUnit: 1,
    tier: 1, category: 'raw_material',
  },
  wool: {
    id: 'wool', name: 'Wool', basePrice: 7, weightPerUnit: 2,
    tier: 1, category: 'raw_material',
  },
  herbs: {
    id: 'herbs', name: 'Herbs', basePrice: 12, weightPerUnit: 1,
    tier: 1, category: 'raw_material',
  },
  grapes: {
    id: 'grapes', name: 'Grapes', basePrice: 8, weightPerUnit: 2,
    tier: 1, category: 'raw_material',
  },
  beeswax: {
    id: 'beeswax', name: 'Beeswax', basePrice: 14, weightPerUnit: 1,
    tier: 1, category: 'raw_material',
  },

  // ── Tier 2: Processed Goods ────────────────────────────────────────────────
  flour: {
    id: 'flour', name: 'Flour', basePrice: 8, weightPerUnit: 2,
    tier: 2, category: 'staple_food',
  },
  bread: {
    id: 'bread', name: 'Bread', basePrice: 14, weightPerUnit: 1,
    tier: 2, category: 'staple_food',
  },
  meat: {
    id: 'meat', name: 'Meat', basePrice: 22, weightPerUnit: 2,
    tier: 2, category: 'staple_food',
  },
  hides: {
    id: 'hides', name: 'Hides', basePrice: 12, weightPerUnit: 2,
    tier: 2, category: 'raw_material',
  },
  salted_fish: {
    id: 'salted_fish', name: 'Salted Fish', basePrice: 18, weightPerUnit: 1,
    tier: 2, category: 'preserved_food',
  },
  iron_bar: {
    id: 'iron_bar', name: 'Iron Bar', basePrice: 20, weightPerUnit: 4,
    tier: 2, category: 'processed_material',
  },
  planks: {
    id: 'planks', name: 'Planks', basePrice: 10, weightPerUnit: 2,
    tier: 2, category: 'processed_material',
  },
  mortar: {
    id: 'mortar', name: 'Mortar', basePrice: 7, weightPerUnit: 3,
    tier: 2, category: 'processed_material',
  },
  cloth: {
    id: 'cloth', name: 'Cloth', basePrice: 16, weightPerUnit: 1,
    tier: 2, category: 'textile',
  },
  ale: {
    id: 'ale', name: 'Ale', basePrice: 10, weightPerUnit: 2,
    tier: 2, category: 'luxury',
  },
  wine: {
    id: 'wine', name: 'Wine', basePrice: 30, weightPerUnit: 2,
    tier: 2, category: 'luxury',
  },
  candles: {
    id: 'candles', name: 'Candles', basePrice: 20, weightPerUnit: 1,
    tier: 2, category: 'luxury',
  },
  medicine: {
    id: 'medicine', name: 'Medicine', basePrice: 40, weightPerUnit: 1,
    tier: 2, category: 'luxury',
  },

  // ── Tier 3: Crafted Goods ──────────────────────────────────────────────────
  tools: {
    id: 'tools', name: 'Tools', basePrice: 35, weightPerUnit: 3,
    tier: 3, category: 'tool_weapon',
  },
  iron_weapons: {
    id: 'iron_weapons', name: 'Iron Weapons', basePrice: 55, weightPerUnit: 4,
    tier: 3, category: 'tool_weapon',
  },
  iron_armor: {
    id: 'iron_armor', name: 'Iron Armor', basePrice: 80, weightPerUnit: 6,
    tier: 3, category: 'tool_weapon',
  },
  carts: {
    id: 'carts', name: 'Carts', basePrice: 60, weightPerUnit: 10,
    tier: 3, category: 'service',
  },
  leather: {
    id: 'leather', name: 'Leather', basePrice: 22, weightPerUnit: 2,
    tier: 3, category: 'textile',
  },
  boots: {
    id: 'boots', name: 'Boots', basePrice: 28, weightPerUnit: 1,
    tier: 3, category: 'textile',
  },
  clothing: {
    id: 'clothing', name: 'Clothing', basePrice: 24, weightPerUnit: 1,
    tier: 3, category: 'textile',
  },
  saddles: {
    id: 'saddles', name: 'Saddles', basePrice: 45, weightPerUnit: 3,
    tier: 3, category: 'service',
  },
}
