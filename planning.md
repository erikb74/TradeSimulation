# Medieval Trade Simulation — Planning Document

> **Status:** Active iteration — decisions locked in, ready for todo.md
> **Goal:** A medieval economic simulation where the world economy runs autonomously first, and the player is one more agent within it — building a trade empire through commerce, not conquest.

---

## 1. Vision & Core Pillars

### What We're Building
A living medieval world that runs *with or without* the player:
- Settlements produce and consume goods based on terrain, population, and buildings
- NPC lords and merchants make autonomous trade decisions — the economy breathes on its own
- The player enters as a **Merchant House** — not a ruler, but an economic agent who can grow to be the most powerful trading force in the realm
- Player influence is earned by accumulating capital, buying buildings, hiring merchants, and cornering markets
- An idle layer ensures the world keeps ticking when the player is away

### Core Philosophy: Simulation First
The world does not wait for the player. Before the player takes their first action:
- Grain farms are producing, mills are grinding, bakers are baking
- NPC merchants are already running caravans between settlements
- Prices are already fluctuating based on local supply and demand
- Settlements are already growing or struggling based on their trade connections

The player is **not** a god who builds the world from scratch. They are a newcomer merchant family who starts with a small amount of capital and must find where they fit in the existing economy — then reshape it.

### Inspirations
| Game | What to Borrow |
|------|---------------|
| X4 Foundations | Autonomous economy, every station has a budget and acts independently, player ships are just better agents |
| Port Royale / Patrician IV | Player as merchant in a living world, trade routes as the core mechanic |
| Victoria 3 | Supply/demand price model, pops consuming goods, factories as economic actors |
| Anno 1800 | Production chain clarity, settlement tiers, visual trade route lines |
| Dwarf Fortress | Emergent complexity from simple rules, deep simulation |
| Idle games (Idle Loops, Cookie Clicker) | Offline accumulation, prestige loops, numbers going up as reward |

---

## 2. Decisions Locked In

| Question | Decision |
|----------|----------|
| Simulation vs player-first | **Simulation first** — world runs autonomously, player is an agent within it |
| Combat / conflict | **No combat** — pure economic competition; challenges come from markets, scarcity, rivals |
| Map type | **Procedurally generated** — seeded so it's shareable/reproducible |
| Platform | **Desktop primary**, mobile responsive secondary |
| Player role | **Merchant House** — not a lord, but can grow to own buildings across the realm |

---

## 3. The Autonomous Economy

This is the heart of the game. Everything else builds on this.

### 3.1 Settlements as Economic Agents
Every settlement (village, town, castle, monastery, port) is an independent economic actor with:
- A **treasury** (gold) used to buy inputs and collect from sales
- A **production profile** determined by terrain (see §4 on map)
- A **population** that consumes goods and provides labor
- A **market** where goods are bought and sold at local prices
- A **lord** (NPC) who sets tariffs and makes infrastructure investments

Settlements are not the player's pawns. They have their own logic:
```
each day, settlement:
  1. Collect production outputs from all buildings → add to warehouse
  2. Pay workers from treasury (if treasury < wage bill → workers quit)
  3. Consume goods for population needs (food, fuel, clothing)
  4. Evaluate inventory vs. needs → generate buy/sell orders
  5. If surplus good → lower price slightly; if shortage → raise price
  6. NPC merchants respond to buy/sell orders and make trade runs
  7. Treasury collects tariff from all trades that passed through
  8. Population grows if food stable + housing available; shrinks if starving
```

### 3.2 NPC Merchants
NPC merchants are autonomous agents owned by settlements or lords:
- Each has a **home base**, a **gold purse**, and a **cart capacity**
- Each tick they scan prices across known settlements
- They buy where cheap, sell where expensive, pocketing the margin
- They prefer short routes but will travel further for better margins
- They are **not omniscient** — they only know prices of settlements they've recently visited
- Over time they build "knowledge" of profitable corridors

The player's merchants do the same thing, but the player can override their decisions.

### 3.3 Price Model
Prices are purely supply/demand driven. No global "fair price" — every market is local.

```
localPrice(good) = baseValue(good) × demandPressure / supplyPressure

demandPressure = consumptionRate / max(stockLevel, 1)
supplyPressure = productionRate / max(targetStock, 1)
```

- Prices are updated each "day" tick
- Prices have a floor (cost of production) and a soft ceiling (100× base value)
- Prices slowly mean-revert toward base value over time (prevents permanent extremes)
- **Arbitrage is the core mechanic**: buy where supply > demand, sell where demand > supply

### 3.4 Seasonal Effects
Four seasons affect production rates and travel:
| Season | Effects |
|--------|---------|
| Spring | Planting — grain farms start producing, roads thaw (faster travel) |
| Summer | Peak production — all farms at full output |
| Autumn | Harvest surplus — grain floods market, prices drop; smart players stockpile |
| Winter | Production slows — fuel and food prices spike; caravans slower (mud/snow) |

Seasons create the economic rhythm that makes timing matter.

### 3.5 Production Chains

Full set of chains, organized by tier:

**Tier 1 — Raw Resources** (require only land + workers)
```
Plains  → Grain Farm     → Grain
Plains  → Cattle Ranch   → Cattle (live)
Forest  → Logging Camp   → Timber
Hills   → Iron Mine      → Iron Ore
Hills   → Stone Quarry   → Stone
Coast   → Fishing Wharf  → Fish
Marsh   → Salt Pans      → Salt
```

**Tier 2 — Processing** (require Tier 1 inputs)
```
Grain + Windmill       → Flour
Flour + Bakery         → Bread           (staple food)
Cattle + Slaughterhouse → Meat + Hides
Fish + Salt + Smokehouse → Salted Fish    (preserved food, trade good)
Iron Ore + Smelter     → Iron Bars
Timber + Sawmill       → Planks
Stone + Lime Kiln      → Mortar
```

**Tier 3 — Crafted Goods** (require Tier 2 inputs)
```
Iron Bars + Blacksmith    → Tools          (needed by ALL Tier 1+2 buildings)
Iron Bars + Blacksmith    → Iron Weapons   (sold to lords)
Iron Bars + Blacksmith    → Iron Armor
Planks + Planks + Shipwright → Carts      (increases caravan capacity)
Hides + Tannery           → Leather
Leather + Cobbler         → Boots         (consumed by population)
Wool (from Sheep Ranch) + Loom → Cloth
Cloth + Tailor            → Clothing      (consumed by population)
```

**Tier 4 — Luxury & Services** (high value, optional consumption)
```
Grain + Brewery     → Ale               (tavern consumption, morale)
Grape Farm + Winery → Wine              (luxury export)
Beeswax + Chandler  → Candles           (used in churches, manors)
Herbs + Apothecary  → Medicine          (reduces population death rate)
```

**Critical dependency — Tools:**
Tools are consumed by every production building. If a settlement runs out of tools, all production slows. This creates a natural dependency: every economy needs a blacksmith or a trade route to one. This is the backbone of the trade network.

---

## 4. Procedural Map Generation

### 4.1 Terrain Generation
Using layered Perlin/simplex noise:
1. **Elevation map** — determines land vs. water, plains vs. hills vs. mountains
2. **Moisture map** — determines forest density, marsh vs. plains
3. **Temperature map** — affects growing season length (north cold, south warm)

Terrain types derived from elevation + moisture:
| Elevation | Moisture | Terrain |
|-----------|----------|---------|
| Low | High | Marsh / Wetland |
| Low | Medium | Plains / Farmland |
| Low | Low | Dry Plains / Steppe |
| Medium | High | Forest |
| Medium | Low | Shrubland |
| High | Any | Hills / Mountains |
| Below sea level | — | Ocean / Lake |

### 4.2 Rivers
Rivers flow from high elevation to low, following steepest descent. They:
- Make adjacent tiles more fertile (farming bonus)
- Provide faster travel corridors (river boats in later eras)
- Create natural borders between regions

### 4.3 Settlement Placement
Settlements are seeded at geographically sensible locations:
- River confluences → Towns (access to water, natural crossroads)
- Coastal bays → Port towns (fishing + sea trade)
- Mountain passes → Fortified posts (control movement, tolls)
- Rich plains → Agricultural villages
- Near iron/stone deposits → Mining settlements
- Hilltops → Castle seats (strategic, not economically optimal — creates tension)

Each settlement gets a **terrain profile** that determines which Tier 1 buildings are available to it. A mountain settlement cannot build a grain farm; a plains settlement cannot mine iron. This geographic specialization forces trade.

### 4.4 Road Network
Roads are generated after settlements:
- Delaunay triangulation to find nearest neighbors
- Minimum spanning tree gives the base road network (connects all settlements with minimum total road)
- Additional roads added for high-traffic corridors (between large settlements)
- Road quality affects caravan speed (dirt path < gravel road < stone road)
- Player can invest gold to upgrade road segments

### 4.5 Seed System
- Every map is generated from a numeric seed
- Seed is shown on the main screen — players can share seeds
- New game = random seed; custom seed = same map every time

---

## 5. Player Role — The Merchant House

### 5.1 Who the Player Is
The player is the head of a **Merchant House** — a trading family with ambitions to become the dominant economic power in the realm. They are not a noble; they have no army, no castle of their own (initially), no political power. Their weapon is gold and information.

Starting position:
- 1 merchant (caravan leader) with a small cart
- A modest purse of starting gold
- A small warehouse in the realm's largest market town (rented, not owned)
- Access to the local market — can buy and sell immediately

### 5.2 Player Actions
All player actions are economic, not military:

**Immediate actions (always available):**
- Buy and sell goods at any market the player has visited
- Set merchant instructions (route, buy/sell thresholds, good to trade)
- View prices at all settlements the player has scouted
- View the player's own ledger (income, expenses, assets)

**Buildable / purchasable (requires gold):**
- Buy a building permit in a settlement → build a production building
- Hire additional merchants
- Upgrade owned buildings (increases output)
- Purchase a warehouse in a new town (enables storage there)
- Commission road improvements (benefits everyone but costs player gold)
- Bribe a lord to lower tariffs on player goods

**Strategic (later game):**
- Buy a "trading charter" → exclusive rights to sell a specific good in a region
- Establish a Guild Hall → attracts skilled workers to a settlement
- Fund a new settlement (costs a lot; player gains founding merchant status = reduced tariffs forever)

### 5.3 Information as Advantage
The player has one key advantage over NPC merchants: **they can see the whole map**.

NPC merchants only know prices they've personally observed. The player sees a live price dashboard for all settlements they've visited. This means:
- Scouting new settlements is genuinely valuable (reveals price data)
- Early game: limited info, making decisions with incomplete data
- Mid game: full map awareness, optimizing arbitrage
- Late game: shaping prices intentionally (corner a market, create artificial scarcity)

---

## 6. UI / UX Design

### 6.1 The "Full Page App" Principle
The game takes up 100% of the browser viewport — no scrolling the outer page, no canvas-in-a-box. It is a web application that happens to be a game, not a game widget embedded in a webpage.

Achieved by:
- `html, body { height: 100%; overflow: hidden; }`
- Root Svelte component is `position: fixed; inset: 0;`
- All scrolling happens *within* panels, not the page
- No navbar, no footer, no "play game" button — the game IS the page

### 6.2 Desktop Layout
```
┌──────────────────────────────────────────────────────────────────┐
│ TOPBAR │ ⏸ ▶ ▶▶ ▶▶▶ │ Day 47, Autumn │ Treasury: 4,820g │ Alerts │
├───────────────────────────────────┬──────────────────────────────┤
│                                   │  RIGHT PANEL (tabbed)        │
│                                   │  ┌──────────────────────┐   │
│         WORLD MAP                 │  │ [Settlement] [Routes] │   │
│      (SVG, pan + zoom)            │  │ [Ledger]   [Merchants]│   │
│                                   │  └──────────────────────┘   │
│  ◉ = player settlement            │                              │
│  ○ = NPC settlement               │  << selected entity detail   │
│  ▲ = resource node                │     updates based on what    │
│  ── = road  ≈ = river             │     is clicked on map >>     │
│  → animated dots = caravans       │                              │
│  colored lines = trade routes     │  inventory bars              │
│                                   │  production rates            │
│                                   │  price table                 │
│                                   │  build menu (if owned)       │
├───────────────────────────────────┴──────────────────────────────┤
│ EVENT LOG │ Caravan arrived │ Iron shortage in Stormgate │ ...   │
└──────────────────────────────────────────────────────────────────┘
```

### 6.3 Mobile Layout
On mobile, the panel system collapses:
```
┌─────────────────────────┐
│ TOPBAR (compact)        │
├─────────────────────────┤
│                         │
│    WORLD MAP            │
│    (touch pan/zoom)     │
│    (tap settlement      │
│     to open drawer)     │
│                         │
├─────────────────────────┤
│ BOTTOM DRAWER (swipe ↑) │
│ Settlement detail       │
│ or global ledger        │
└─────────────────────────┘
```
- Bottom drawer slides up on tap, dismisses on swipe down
- Map is touch-pan and pinch-to-zoom
- All key actions accessible via large touch targets (no tiny buttons)
- Trade route assignment simplified to a 3-step flow (pick good → pick from → pick to)

### 6.4 Information Density Goals
Inspired by trading terminals and strategy game UIs (EVE Online market, Victoria 3 trade screen):

**Settlement panel shows:**
- Population, growth rate
- Treasury balance, daily income/loss
- Inventory table: good | stock | capacity | production/day | consumption/day | local price
- Color bars: red (critically low) → yellow (low) → green (healthy) → blue (surplus)
- Active trade routes in/out with volume and profitability
- Build slots with current buildings and upgrade options (if player owns any)

**Global Ledger (player's empire view):**
- All player-owned settlements/buildings in a table
- Income breakdown: which routes / buildings generate what
- Expense breakdown: wages, tariffs, maintenance
- Net worth calculation: gold + asset value of buildings

**Price Heatmap:**
- Select a good → map shows price across all known settlements
- Hot (red) = high price (good place to sell)
- Cool (blue) = low price (good place to buy)
- Immediately communicates arbitrage opportunities visually

### 6.5 Visual Style
"Parchment Terminal" — medieval flavor meets information density:
- Dark background: `#1a1410` (very dark brown-black)
- Text primary: `#e8d5a3` (aged parchment cream)
- Accent gold: `#c8961e` (amber gold for important values)
- Surplus green: `#4a7c59`
- Shortage red: `#8b3a3a`
- Trade route blue: `#3a6b8b`
- Fonts: a readable serif for flavor text, monospace for numbers/tables
- Map: muted earthy tones, terrain visible but not distracting
- No pixel art — SVG geometry + CSS gives the look
- Subtle CSS drop-shadow on panels creates depth without imagery

---

## 7. Technology Stack (Final)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Language | **TypeScript** | Complex simulation state demands type safety |
| Build | **Vite** | Fast dev server, HMR, minimal config |
| UI Framework | **Svelte 5** | Reactivity compiles away — no VDOM overhead, ideal for 60fps updating numbers |
| World Map | **SVG** (reactive via Svelte) | Resolution-independent, native events, CSS animations for caravans |
| Simulation | **Web Worker** (TypeScript) | Runs economy tick off main thread — UI never jank |
| State sync | **postMessage + structured clone** | Worker posts state snapshot; UI reads it reactively |
| Persistence | **IndexedDB** (via idb library) | Handles large save states; localStorage too small |
| Styling | **TailwindCSS v4** | Utility-first, rapid iteration, mobile responsive built in |
| Map generation | **simplex-noise** (npm) | Lightweight, fast, seeded noise for terrain |
| Charts | **d3-scale + d3-shape** (minimal) | Sparklines for price history; only pull what's needed |
| Testing | **Vitest** | Same config as Vite; unit test the simulation engine thoroughly |

**No backend required** — everything runs client-side. Saves live in IndexedDB. This keeps the game hostable as a static site (GitHub Pages, Netlify, Cloudflare Pages).

### Why Svelte 5 over Vue 3 / React
- Svelte's fine-grained reactivity is a better fit than React's VDOM diffing for simulation data (100s of cells updating per tick)
- Svelte 5's runes system (`$state`, `$derived`) maps naturally to simulation state
- Smaller bundle than Vue + Pinia
- Excellent Vite integration

### Why Not Godot
Godot exports to WebAssembly — the "game in a box" problem is *worse*, not better. 40MB+ WASM bundle, long load, all UI built in Godot's own system (not HTML/CSS). For an information-dense simulation, native web is strictly superior.

---

## 8. Architecture Deep Dive

### 8.1 Simulation Worker
```
┌─────────────────────────────────────────────────────┐
│  MAIN THREAD                                        │
│  ┌──────────────┐    postMessage(command)            │
│  │  Svelte App  │ ─────────────────────────────→    │
│  │  (UI/Input)  │                                   │
│  │              │ ←─────────────────────────────    │
│  └──────────────┘    postMessage(stateSnapshot)     │
└─────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────┐
│  WEB WORKER                                         │
│  ┌──────────────────────────────────────────────┐   │
│  │  SimulationEngine                            │   │
│  │  - World state (settlements, caravans, etc)  │   │
│  │  - fastTick() → every 500ms                  │   │
│  │  - slowTick() → every 5000ms                 │   │
│  │  - applyCommand(cmd) → player actions        │   │
│  │  - serializeSnapshot() → send to UI          │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

The worker owns the authoritative world state. The UI only holds a read-only snapshot. Player actions are sent as commands (e.g., `{ type: 'SET_ROUTE', merchantId, from, to, good }`) and applied in the worker before the next snapshot is sent.

### 8.2 Tick Architecture
```
fastTick (500ms = 1 game hour):
  - Move caravans along routes (update progress 0→1)
  - Deliver cargo when caravan reaches destination
  - Apply production outputs to warehouses
  - Check for warehouse overflow (sell excess at low price)

slowTick (5000ms = 1 game day):
  - Recalculate all prices (supply/demand model)
  - Population consumption (deduct food, fuel, clothing)
  - Population growth/decline
  - NPC merchant decision cycle (scan prices, choose route)
  - Wage payments (settlement treasury → worker wages)
  - Player merchant AI (if set to autonomous mode)
  - Seasonal effects update (every 30 slow ticks = 1 month)
  - Generate events (shortage warning, trade opportunity, etc)

idleCatchup (on game load):
  - Calculate elapsed real time since last save
  - Cap at maxOfflineTime (default: 3 days of game ticks)
  - Run slowTicks in batch (no rendering) to catch up economy
  - Summarize what happened during offline period for player
```

### 8.3 Core Data Model

```typescript
// Goods taxonomy
type GoodId = string  // e.g. 'grain', 'bread', 'iron_ore', 'iron_bar', 'tools', ...

// Terrain and map
type TerrainType = 'plains' | 'hills' | 'mountains' | 'forest' | 'marsh' | 'coast' | 'water'

interface MapTile {
  x: number; y: number
  terrain: TerrainType
  elevation: number
  moisture: number
}

// Settlements
interface Settlement {
  id: string
  name: string
  position: { x: number; y: number }
  type: 'village' | 'town' | 'city' | 'port' | 'fortress' | 'monastery'
  population: number
  populationCap: number     // determined by housing buildings
  treasury: number          // gold
  ownerId: string           // 'player' | npc lord id
  buildings: Building[]
  inventory: Map<GoodId, number>
  prices: Map<GoodId, number>
  marketHistory: Map<GoodId, number[]>  // last 30 days of prices (for sparklines)
  tariffRate: number        // 0.0–0.3, tax on all trades through this settlement
}

// Production buildings
interface Building {
  id: string
  type: BuildingType
  level: number             // 1–3, affects throughput multiplier
  workers: number           // currently assigned
  maxWorkers: number        // at current level
  inputs: Map<GoodId, number>   // consumed per fastTick
  outputs: Map<GoodId, number>  // produced per fastTick
  efficiency: number        // 0.0–1.0 (reduced if short on inputs or workers)
}

// Trade
interface Caravan {
  id: string
  merchantId: string
  fromId: string
  toId: string
  cargo: Map<GoodId, number>
  progress: number          // 0.0 → 1.0
  speed: number             // tiles/hour, affected by road quality + season
  returning: boolean        // true = heading back empty (or with return cargo)
}

interface TradeRoute {
  id: string
  merchantId: string
  fromId: string
  toId: string
  good: GoodId
  buyThreshold: number      // only buy if price ≤ this
  sellThreshold: number     // only sell if price ≥ this
  quantityPerTrip: number
}

// Merchants (player-owned)
interface Merchant {
  id: string
  name: string
  homeSettlementId: string
  cartCapacity: number      // in units of goods
  gold: number              // merchant's own purse (separate from settlement)
  mode: 'manual' | 'auto'  // auto = AI runs the route; manual = player sets it
  assignedRoute?: TradeRoute
  caravan?: Caravan         // set when currently traveling
  knownPrices: Map<string, Map<GoodId, { price: number; observedAt: number }>>
}

// World state (what the worker owns)
interface WorldState {
  seed: string
  tick: number              // total fastTicks elapsed
  dayTick: number           // total slowTicks elapsed
  season: 'spring' | 'summer' | 'autumn' | 'winter'
  year: number
  settlements: Map<string, Settlement>
  caravans: Map<string, Caravan>
  roads: Road[]
  rivers: River[]
  playerHouseId: string
  events: GameEvent[]       // last N events for the log
}
```

### 8.4 NPC Merchant AI (Simple but Effective)
```
Every slowTick, each NPC merchant:
  1. If currently traveling → skip (wait until caravan arrives)
  2. Scan known settlement prices for best arbitrage opportunity:
     - For each good: find cheapest buy price and most expensive sell price
     - Calculate expected margin (sell price - buy price - tariffs - estimated travel cost)
     - Pick the route with best margin that fits in cart capacity
  3. If good margin found → dispatch caravan on that route
  4. If no good margin → wait (merchant sits idle, which is intentional)
  5. After each delivery → update known prices for visited settlements
```

This creates realistic NPC behavior: merchants flock to profitable routes, equalizing prices. When the player spots a new opportunity, NPCs will eventually find it too — but the player, with full map vision, can act first.

---

## 9. Idle / Offline Layer

### Idle Accumulation
When offline, the world continues to tick (calculated on load). The player returns to:
- A gold balance that has grown (or shrunk) based on trade route performance
- Events summarizing what happened ("Grain shortage in Eastmere drove prices up, your caravan profited")
- Resources accumulated in player-owned warehouses

### Prestige / Dynasty System
Each "run" is a dynasty. The player can end a dynasty at any time (or it ends after a certain era is reached). On prestige:
- All buildings, merchants, gold reset
- The player keeps **dynasty bonuses** (permanent multipliers unlocked by achievements)
- The map regenerates (new seed) — fresh economic landscape

Dynasty bonuses (examples):
| Achievement | Bonus Unlocked |
|-------------|---------------|
| Reached 10,000g | +5% starting gold per prestige |
| Built 10 production buildings | +1 building slot in starting town |
| Ran 5 simultaneous trade routes | +1 starting merchant |
| Controlled 50% of grain trade | Grain farms produce 10% more |
| Completed the Merchant Prince era | New building type unlocked |

### Era Progression
```
Era I: Village Merchant
  Unlock: basic trade, 1 merchant, grain + tools economy
  Goal: accumulate 5,000g and establish 3 trade routes

Era II: Town Factor
  Unlock: own production buildings, hire 3 merchants, cloth + iron
  Goal: own buildings in 3 different settlements

Era III: Regional Magnate
  Unlock: trading charters, road investment, banking (credit)
  Goal: control >30% of trade in a region

Era IV: Merchant Prince
  Unlock: found settlements, fund lords, sea trade (if map has coast)
  Goal: be the dominant economic power in the realm
```

---

## 10. Procedural Map — Implementation Plan

### Step 1: Noise-Based Terrain
```typescript
// Using simplex-noise npm package
const noise = createNoise2D(seededRandom(seed))

for each tile (x, y):
  elevation = (noise(x * 0.03, y * 0.03) + 1) / 2   // 0–1
  moisture  = (noise(x * 0.05 + 100, y * 0.05) + 1) / 2
  terrain   = classifyTerrain(elevation, moisture)
```

### Step 2: River Carving
- Place river sources at high-elevation tiles
- Flow downhill using gradient descent
- Rivers widen as they merge
- Rivers terminate at ocean/lake tiles

### Step 3: Settlement Seeding
- Score each tile for settlement desirability:
  - River adjacency: +3
  - Coast: +2
  - Plains/farmland: +2
  - Mountain pass (high elevation, narrow): +2
  - Forest: +1
  - Near existing resource nodes: +1
- Place settlements at local desirability maxima, with minimum spacing enforced

### Step 4: Resource Node Placement
- Iron deposits: placed in hills/mountains
- Stone quarries: in hills
- Forests: naturally follow moisture map
- Fishing: coastal tiles
- Vineyards: warm, southern, low-elevation tiles (if temperature map used)

### Step 5: Road Generation
- Compute Delaunay triangulation of all settlements
- Find minimum spanning tree (ensures connectivity)
- Add redundant paths for well-connected settlements
- Road quality varies: mountain passes = dirt (slow), plains = gravel, near large towns = stone

---

## 11. Development Phases

### Phase 0 — Project Setup
- Vite + Svelte 5 + TypeScript scaffolding
- Tailwind v4 configured
- Vitest configured
- Git structure, basic README

### Phase 1 — Simulation Engine (no UI)
- Core data model (all TypeScript types)
- Production chain definitions (all buildings, inputs, outputs)
- Settlement tick logic (production, consumption, price update)
- NPC merchant AI (basic arbitrage loop)
- Caravan movement
- Save/load (serialize/deserialize WorldState)
- Unit tests for price model, production chains, merchant AI

### Phase 2 — Map Generation
- Simplex noise terrain generation
- River generation
- Settlement placement algorithm
- Road network generation
- Seed system
- Map serialization (save the generated map with the game)

### Phase 3 — Web Worker Integration
- Move simulation engine into Web Worker
- postMessage protocol (commands → worker, snapshots ← worker)
- Idle catch-up on load
- Tick timing (fast/slow tick intervals)

### Phase 4 — SVG Map Rendering
- Full-viewport Svelte app layout
- SVG map layer: terrain, rivers, roads
- Settlement icons (SVG glyphs by type)
- Trade route lines (colored by good type)
- Animated caravan dots (CSS transition along SVG path)
- Pan + zoom (mouse wheel + drag; pinch-to-zoom on mobile)

### Phase 5 — Information Panels
- Right panel with tabs: Settlement | Routes | Ledger | Merchants
- Settlement detail: inventory table with color bars, price table, building list
- Player ledger: income/expense breakdown, net worth
- Event log (bottom bar)
- Price heatmap mode (select good → color settlements by price)

### Phase 6 — Player Controls
- Buy/sell at markets (modal: pick good, quantity, confirm)
- Assign merchant routes (pick good, from, to, thresholds)
- Build/upgrade buildings (if player owns building slot)
- Merchant management (hire, fire, set mode auto/manual)

### Phase 7 — Idle Layer
- Offline accumulation calculation on load
- Offline summary screen ("while you were away...")
- Era progression system + unlock tracking
- Prestige / dynasty reset flow
- Dynasty bonus system

### Phase 8 — Polish
- Seasonal visual effects on map (color tint, snow in winter)
- Price sparkline charts in settlement panel
- Notifications / alerts system (shortage, opportunity, era complete)
- Sound effects (optional, simple)
- Mobile layout tuning
- Performance profiling (ensure 60fps with 50+ settlements)

---

## 12. Open Questions (Remaining)

- [ ] **Saving**: LocalStorage + IndexedDB (client only) — is this sufficient or do we want a simple backend for cloud sync later?
- [ ] **Time speed controls**: Should the player be able to pause and fast-forward? (Almost certainly yes — what speeds: 1x, 2x, 5x, pause?)
- [ ] **Number of settlements**: Start with 12–20 for prototype; what's the target for a full map?
- [ ] **Player starting scenario**: Same every game (tutorial-like) or randomized based on map seed?
- [ ] **Multiplayer**: Explicitly out of scope for now — confirm?
