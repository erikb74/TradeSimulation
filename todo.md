# Medieval Trade Simulation — Implementation Todo

> Track progress here. Each task is sized to be a single focused coding session.
> Phases must be completed in order. Within a phase, items can be parallelized.
> Mark: `[ ]` = pending, `[x]` = done, `[~]` = in progress, `[!]` = blocked

---

## Phase 0 — Project Scaffolding

### 0.1 Initialize Project
- [ ] Run `npm create vite@latest . -- --template svelte-ts` in repo root
- [ ] Verify `vite.config.ts`, `tsconfig.json`, `package.json` are created correctly
- [ ] Delete placeholder `src/` content (App.svelte boilerplate, counter component, etc.)
- [ ] Set `"strict": true` in `tsconfig.json` and verify it compiles clean

### 0.2 Configure TailwindCSS v4
- [ ] Install: `npm install -D tailwindcss @tailwindcss/vite`
- [ ] Add Tailwind Vite plugin to `vite.config.ts`
- [ ] Create `src/app.css` with `@import "tailwindcss";`
- [ ] Import `app.css` in `src/main.ts`
- [ ] Verify Tailwind utility classes render in dev server

### 0.3 Configure Vitest
- [ ] Install: `npm install -D vitest`
- [ ] Add `test` config block to `vite.config.ts` (environment: 'node')
- [ ] Create `src/simulation/__tests__/` directory
- [ ] Add `"test": "vitest run"` and `"test:watch": "vitest"` to `package.json` scripts
- [ ] Write a trivial passing test to verify the setup works

### 0.4 Install Remaining Dependencies
- [ ] `npm install simplex-noise` (map generation)
- [ ] `npm install idb` (IndexedDB wrapper for saves)
- [ ] `npm install -D d3-scale d3-shape d3-path @types/d3-scale @types/d3-shape @types/d3-path` (sparklines)
- [ ] Verify all imports resolve with no TypeScript errors

### 0.5 Folder Structure
- [ ] Create the following directory tree:
  ```
  src/
    simulation/          # All simulation logic (runs in Web Worker)
      types.ts           # All TypeScript interfaces and type aliases
      goods.ts           # Good definitions (base prices, weights, names)
      buildings.ts       # Building definitions (inputs, outputs, workers)
      engine.ts          # SimulationEngine class (main tick orchestrator)
      production.ts      # Building production tick logic
      consumption.ts     # Population consumption logic
      pricing.ts         # Supply/demand price model
      merchants.ts       # NPC and player merchant AI
      caravans.ts        # Caravan movement logic
      seasons.ts         # Seasonal effects
      events.ts          # Event generation and log
      save.ts            # Serialize/deserialize WorldState
      worker.ts          # Web Worker entry point (postMessage protocol)
      __tests__/         # Vitest unit tests
    mapgen/              # Procedural map generation (runs once on new game)
      noise.ts           # Simplex noise helpers (seeded)
      terrain.ts         # Tile generation + terrain classification
      rivers.ts          # River carving
      settlements.ts     # Settlement placement algorithm
      resources.ts       # Resource node placement
      roads.ts           # Road network generation (Delaunay + MST)
      names.ts           # Procedural settlement name generation
      index.ts           # Public API: generateMap(seed) → MapData
      __tests__/
    ui/                  # Svelte components (main thread only)
      App.svelte          # Root component, full-viewport layout
      map/
        WorldMap.svelte   # SVG map container + pan/zoom
        Terrain.svelte    # SVG terrain regions
        Rivers.svelte     # SVG river paths
        Roads.svelte      # SVG road paths
        Settlements.svelte # SVG settlement icons
        TradeRoutes.svelte # SVG trade route lines
        Caravans.svelte   # Animated caravan dots
      panels/
        RightPanel.svelte  # Tabbed panel container
        SettlementTab.svelte
        RoutesTab.svelte
        LedgerTab.svelte
        MerchantsTab.svelte
        PriceHeatmap.svelte
      topbar/
        Topbar.svelte
        TimeControls.svelte
        TreasuryDisplay.svelte
        AlertBell.svelte
      modals/
        BuySellModal.svelte
        AssignRouteModal.svelte
        BuildModal.svelte
        OfflineSummaryModal.svelte
      mobile/
        BottomDrawer.svelte
      shared/
        InventoryBar.svelte  # Color-coded stock level bar
        Sparkline.svelte     # D3 price history chart
        GoodIcon.svelte      # Icon/badge for a good type
    stores/              # Svelte reactive state (main thread)
      simulation.ts      # Snapshot from worker, player commands
      ui.ts              # Selected settlement, active panel tab, etc.
      settings.ts        # Game speed, display preferences
    lib/                 # Shared utilities (used by both threads)
      constants.ts       # Game constants (tick rates, caps, etc.)
      math.ts            # Clamp, lerp, seeded random helpers
      ids.ts             # nanoid wrapper for ID generation
  ```

### 0.6 Base App Shell
- [ ] Create `src/main.ts` — mounts App.svelte to `#app`
- [ ] Create `src/ui/App.svelte` — full-viewport fixed layout (no scrolling page)
  - `html, body { height: 100%; overflow: hidden; margin: 0; }`
  - Root div: `position: fixed; inset: 0; display: grid;`
  - Grid areas: topbar | (map + right panel) | event log
- [ ] Apply base color theme in `app.css`:
  - Background: `#1a1410`
  - Text: `#e8d5a3`
  - Accent gold: `#c8961e`
  - Set font: readable serif for labels, monospace for numbers
- [ ] Verify app renders blank but correctly fills viewport on desktop and mobile

---

## Phase 1 — Simulation Engine

### 1.1 Type Definitions (`src/simulation/types.ts`)
- [ ] Define `GoodId` type (union of all good string IDs)
- [ ] Define `TerrainType` union
- [ ] Define `Settlement` interface (id, name, position, type, population, populationCap, treasury, ownerId, buildings, inventory, prices, marketHistory, tariffRate)
- [ ] Define `Building` interface (id, type, level, workers, maxWorkers, inputs, outputs, efficiency)
- [ ] Define `BuildingType` union (all building type string IDs)
- [ ] Define `Caravan` interface (id, merchantId, fromId, toId, cargo, progress, speed, returning)
- [ ] Define `TradeRoute` interface (id, merchantId, fromId, toId, good, buyThreshold, sellThreshold, quantityPerTrip)
- [ ] Define `Merchant` interface (id, name, homeSettlementId, cartCapacity, gold, mode, assignedRoute, caravan, knownPrices)
- [ ] Define `Road` interface (fromId, toId, quality, length)
- [ ] Define `River` (array of `{x, y}` points)
- [ ] Define `GameEvent` interface (id, tick, type, message, relatedIds)
- [ ] Define `Season` union: `'spring' | 'summer' | 'autumn' | 'winter'`
- [ ] Define `WorldState` interface (all top-level state)
- [ ] Define `SimCommand` discriminated union — all player commands:
  - `SetRoute`, `CancelRoute`, `BuySell`, `BuildBuilding`, `UpgradeBuilding`, `HireMerchant`, `SetMerchantMode`, `SetGameSpeed`
- [ ] Define `StateSnapshot` — serializable subset of WorldState sent to UI
- [ ] Export all types; verify zero TypeScript errors

### 1.2 Goods Definitions (`src/simulation/goods.ts`)
- [ ] Create `GoodDefinition` interface: `{ id, name, basePrice, weightPerUnit, tier, category }`
- [ ] Define all goods:
  - **Tier 1 Raw:** grain, cattle, timber, iron_ore, stone, fish, salt, wool, herbs, grapes, beeswax
  - **Tier 2 Processed:** flour, bread, meat, hides, salted_fish, iron_bar, planks, mortar, cloth, ale, wine, candles, medicine
  - **Tier 3 Crafted:** tools, iron_weapons, iron_armor, carts, leather, boots, clothing, saddles
- [ ] Export `GOODS: Record<GoodId, GoodDefinition>`
- [ ] Export `GOOD_IDS: GoodId[]` (all good IDs as array)

### 1.3 Building Definitions (`src/simulation/buildings.ts`)
- [ ] Create `BuildingDefinition` interface:
  ```typescript
  {
    id: BuildingType
    name: string
    tier: 1 | 2 | 3 | 4
    requiredTerrain: TerrainType[]   // which terrain types allow this building
    maxLevel: 3
    workersByLevel: [number, number, number]
    inputsPerFastTick: Record<GoodId, number>[]   // one entry per level
    outputsPerFastTick: Record<GoodId, number>[]  // one entry per level
    buildCostByLevel: number[]   // gold cost to build/upgrade
    buildTimeByLevel: number[]   // in slow ticks (days)
  }
  ```
- [ ] Define all buildings (Tier 1–4 from planning.md production chains)
  - Grain Farm, Cattle Ranch, Logging Camp, Iron Mine, Stone Quarry, Fishing Wharf, Salt Pans, Sheep Ranch, Herb Garden, Vineyard, Apiary
  - Windmill, Bakery, Slaughterhouse, Smokehouse, Smelter, Sawmill, Lime Kiln, Tannery, Loom, Brewery, Winery, Chandler, Apothecary
  - Blacksmith, Shipwright/Cartwright, Cobbler, Tailor, Saddler, Fletcher
  - Warehouse, Market, Tavern, Guild Hall
- [ ] Export `BUILDINGS: Record<BuildingType, BuildingDefinition>`
- [ ] Write unit tests: verify every building's inputs are valid GoodIds; every output is a valid GoodId; every required terrain is a valid TerrainType

### 1.4 Production Logic (`src/simulation/production.ts`)
- [ ] `runProductionTick(settlement: Settlement): SettlementDelta` — for each building:
  - Check if inputs are available in inventory (at required quantities × efficiency)
  - Deduct inputs from inventory
  - Calculate efficiency: `min(workers/maxWorkers, inputAvailabilityRatio) × seasonMultiplier`
  - Add outputs × efficiency to inventory
  - Clamp inventory at warehouse capacity
  - Return delta (what changed)
- [ ] `getSeasonMultiplier(buildingType, season): number` — farms slow in winter, etc.
- [ ] Unit tests:
  - Bakery with no flour in inventory produces nothing
  - Bakery at 50% workers runs at 50% efficiency
  - Winter reduces farm output by expected multiplier
  - Warehouse capacity is respected

### 1.5 Population Consumption (`src/simulation/consumption.ts`)
- [ ] Define `CONSUMPTION_PER_100_POP_PER_DAY: Partial<Record<GoodId, number>>` — how much of each good 100 people consume per slow tick:
  - Bread: 2 units, Ale: 0.5, Clothing: 0.1, Boots: 0.05, Medicine: 0.02, etc.
- [ ] `runConsumptionTick(settlement: Settlement): SettlementDelta` — deduct consumption from inventory; track what was fully met vs. shortfall
- [ ] `updatePopulation(settlement, consumptionResult): number` — return new population:
  - Food fully met + housing available → +0.5% growth
  - Food shortfall → −1% per tick (starvation)
  - Disease (medicine shortage) → −0.3% per tick
  - Prosperous economy (high treasury, surplus goods) → attract immigration +0.2%
  - Max population capped by housing buildings
- [ ] Unit tests: starvation shrinks population; surplus food + housing grows it; max cap respected

### 1.6 Price Model (`src/simulation/pricing.ts`)
- [ ] `updatePrices(settlement: Settlement, delta: SettlementDelta): Record<GoodId, number>` — for each good:
  - `demandPressure = consumptionRate / max(stockLevel, 1)`
  - `supplyPressure = productionRate / max(targetStock, 1)`
  - `newPrice = currentPrice × (1 + (demandPressure - supplyPressure) × 0.1)`
  - Clamp: `max(basePrice × 0.3, min(newPrice, basePrice × 8))`
  - Mean-reversion: nudge 1% toward basePrice each day
- [ ] `getTargetStock(good, settlement): number` — sensible default stock for this good in this settlement (based on consumption rate × 7 days buffer)
- [ ] `recordPriceHistory(settlement, prices)` — append to `marketHistory` arrays (cap at 30 entries)
- [ ] Unit tests: price rises when stock low; price falls when surplus; clamping works; mean-reversion prevents runaway prices

### 1.7 NPC Merchant AI (`src/simulation/merchants.ts`)
- [ ] `npcMerchantDecision(merchant: Merchant, world: WorldState): TradeRoute | null`:
  - Skip if merchant has active caravan
  - Build list of candidate routes: for each pair of (fromSettlement, toSettlement) × good:
    - buyPrice = fromSettlement.prices[good]
    - sellPrice = toSettlement.prices[good] (if merchant has recently visited, else estimate)
    - margin = (sellPrice − buyPrice) − tariffs − travelCostEstimate
    - Only include if fits in cartCapacity and margin > minProfitThreshold
  - Pick highest-margin route; return it or null if none profitable
- [ ] `dispatchNpcCaravan(merchant, route, world): Caravan` — create caravan entity, buy cargo from source settlement (deduct from inventory, pay gold), update merchant's known prices
- [ ] `npcUpdateKnownPrices(merchant, settlement)` — update merchant's price memory for this settlement with current actual prices
- [ ] Unit tests: merchant picks highest-margin route; merchant doesn't pick routes that lose money; known prices update correctly

### 1.8 Caravan Movement (`src/simulation/caravans.ts`)
- [ ] `getRoadDistance(fromId, toId, roads: Road[]): number` — graph shortest path using road network (Dijkstra); cache results
- [ ] `moveCaravans(caravans: Caravan[], roads: Road[], season: Season): Caravan[]` — for each caravan:
  - `progress += speed × seasonSpeedMultiplier / roadDistance`
  - If `progress >= 1.0` → caravan has arrived, mark for delivery
- [ ] `deliverCaravan(caravan, world): WorldState` — on arrival:
  - Add cargo to destination settlement inventory
  - Receive payment (sell cargo at destination price)
  - Pay merchant
  - Generate `caravan_arrived` event
  - Remove caravan from world; merchant becomes available
- [ ] `getSeasonSpeedMultiplier(season): number` — winter slows caravans (snow, mud)
- [ ] Unit tests: caravan progress increments correctly; delivery fires at progress=1; winter multiplier applied; road quality affects speed

### 1.9 Seasons (`src/simulation/seasons.ts`)
- [ ] `TICKS_PER_SEASON = 30` (slow ticks; 30 days per season)
- [ ] `getSeason(dayTick: number): Season`
- [ ] `getYear(dayTick: number): number`
- [ ] `seasonProductionMultiplier(buildingType, season): number`
  - Spring: farms at 80% (planting, not yet producing)
  - Summer: all at 100%
  - Autumn: farms at 130% (harvest surplus)
  - Winter: farms at 20%, mines at 80%, all others at 90%
- [ ] `seasonSpeedMultiplier(season): number`
  - Spring: 1.1 (roads clear)
  - Summer: 1.0
  - Autumn: 0.9 (mud)
  - Winter: 0.6 (snow and ice)

### 1.10 Event Generation (`src/simulation/events.ts`)
- [ ] Define `EventType` union: `'caravan_arrived' | 'shortage_warning' | 'surplus_alert' | 'population_growth' | 'population_decline' | 'era_progress' | 'merchant_idle' | 'price_spike'`
- [ ] `generateSettlementEvents(settlement, prevState, nextState): GameEvent[]` — detect:
  - Stock of a critical good (bread, tools) drops below 3-day supply → `shortage_warning`
  - Stock > 5× target → `surplus_alert`
  - Population crossed a round threshold (100, 500, 1000, etc.) → `population_growth` or `population_decline`
  - Price of a good rises >50% in one day → `price_spike`
- [ ] `pruneEvents(events, maxCount = 200): GameEvent[]` — keep only the most recent N events
- [ ] Cap event log at 200 entries; old events drop off

### 1.11 Save / Load (`src/simulation/save.ts`)
- [ ] `serializeWorld(world: WorldState): string` — JSON.stringify with Map→object conversion
- [ ] `deserializeWorld(json: string): WorldState` — parse and reconstruct Maps
- [ ] `saveToIndexedDB(world): Promise<void>` — save serialized world under key `'autosave'`
- [ ] `loadFromIndexedDB(): Promise<WorldState | null>` — load and deserialize; return null if no save
- [ ] `autosaveInterval` — trigger save every 60 slow ticks (every ~5 real minutes)
- [ ] Unit tests: serialize → deserialize round-trip produces identical state (deep equal)

### 1.12 Simulation Engine Orchestrator (`src/simulation/engine.ts`)
- [ ] `SimulationEngine` class:
  - Constructor: accepts `WorldState`
  - `fastTick(): void` — move caravans, run production, check deliveries
  - `slowTick(): void` — consumption, price update, population, NPC decisions, seasons, events, autosave check
  - `applyCommand(cmd: SimCommand): void` — dispatch to appropriate handler
  - `serializeSnapshot(): StateSnapshot` — create UI-safe read-only snapshot
  - `idleCatchup(missedSlowTicks: number): void` — run `slowTick()` N times (no emit between ticks)
- [ ] Command handlers (within engine or imported):
  - `handleSetRoute(cmd)`, `handleCancelRoute(cmd)`, `handleBuySell(cmd)`, `handleBuildBuilding(cmd)`, `handleUpgradeBuilding(cmd)`, `handleHireMerchant(cmd)`, `handleSetMerchantMode(cmd)`
- [ ] Unit tests:
  - Full tick cycle runs without throwing
  - applyCommand(SetRoute) creates correct TradeRoute on merchant
  - applyCommand(BuySell) correctly transfers goods and gold
  - idleCatchup(30) advances world by 30 slow ticks

---

## Phase 2 — Procedural Map Generation

### 2.1 Noise Helpers (`src/mapgen/noise.ts`)
- [ ] Install and import `simplex-noise`
- [ ] `createSeededNoise(seed: string)` — convert string seed to numeric seed, return `{ noise2D(x,y): number }` (normalized 0–1)
- [ ] `fractalNoise(noise2D, x, y, octaves, persistence): number` — layered noise for more natural terrain
- [ ] Unit test: same seed always produces same values; different seeds produce different values

### 2.2 Terrain Generation (`src/mapgen/terrain.ts`)
- [ ] Define `MapConfig`: `{ width, height, seed, settlementCount }`
- [ ] `generateTerrain(config: MapConfig): TerrainTile[][]` — 2D grid of tiles
  - Elevation = fractalNoise(x, y, octaves=4, persistence=0.5)
  - Moisture = noise2D(x+500, y+500) with different scale
  - Temperature = linear gradient (north cold, south warm) + small noise
  - Classify terrain from elevation + moisture table
- [ ] `isLand(tile): boolean` — elevation > sea level threshold
- [ ] `getBiomeColor(terrain): string` — CSS color for SVG map rendering:
  - plains: `#8fa876`, forest: `#4a6741`, hills: `#9b8a6e`, mountains: `#7a7068`, marsh: `#5c7a6e`, coast/beach: `#c4b07a`, water: `#3a6b8b`
- [ ] Unit test: terrain grid dimensions match config; all tiles have valid terrain type

### 2.3 River Carving (`src/mapgen/rivers.ts`)
- [ ] `carveRivers(terrain: TerrainTile[][], seed: string, count: number): River[]`
  - Find N highest-elevation land tiles that are spaced apart (river sources)
  - From each source, follow steepest-descent path until reaching water or map edge
  - Record river as array of `{x, y}` waypoints
  - Mark river tiles in terrain grid
- [ ] `getRiverFertilityBonus(tile, rivers): number` — adjacency to river increases farm yield
- [ ] Unit test: rivers flow downhill; rivers terminate at water; no river loops

### 2.4 Settlement Placement (`src/mapgen/settlements.ts`)
- [ ] `scoreSettlementTile(tile, terrain, rivers): number` — heuristic score:
  - River confluence: +4, River adjacent: +3
  - Coastal bay: +3
  - Plains tile: +2
  - Hill tile with iron nearby: +3
  - Mountain pass (narrow high-elevation strip): +2
  - Already near another settlement: −10 (enforce min spacing)
- [ ] `placeSettlements(terrain, rivers, config): SettlementSeed[]` — find top-N scored tiles, enforcing minimum distance between them
- [ ] `classifySettlementType(tile, terrain, rivers): SettlementType` — infer type from geography:
  - Coastal → port
  - High elevation + narrow pass → fortress
  - River confluence, large plains area → town
  - Forest surrounded → village
  - Isolated mountain → fortress or monastery
- [ ] `generateSettlementName(seed, index): string` — from `names.ts` (see below)
- [ ] `buildInitialSettlements(seeds, terrain, rivers): Settlement[]` — construct full Settlement objects with:
  - Starting population (100–800 based on type)
  - Starting buildings (1–3 based on terrain specialty)
  - Starting inventory (small stock of locally produced goods)
  - Starting prices (at base price)
  - NPC lord assigned

### 2.5 Settlement Name Generation (`src/mapgen/names.ts`)
- [ ] Define name component lists:
  - Prefixes: `['Iron', 'Stone', 'Grey', 'Black', 'High', 'Old', 'North', 'South', 'East', 'West', 'Red', 'White', 'Green', 'Cold', 'Ash', 'Crest', 'Storm', 'River', 'Oak', 'Elm', ...]`
  - Suffixes: `['hold', 'gate', 'mere', 'ford', 'wick', 'burg', 'moor', 'fell', 'crest', 'haven', 'mouth', 'bridge', 'mill', 'keep', 'vale', 'cliff', ...]`
- [ ] `generateName(seededRng): string` — combine prefix + suffix; avoid duplicates across the map
- [ ] Unit test: 20 generated names are all unique

### 2.6 Resource Node Placement (`src/mapgen/resources.ts`)
- [ ] Define `ResourceNode`: `{ id, type: 'iron_deposit' | 'stone_quarry' | 'ancient_forest' | 'fertile_plains', position, richness: number }`
- [ ] `placeResourceNodes(terrain, settlements, seed): ResourceNode[]`
  - Iron deposits: place in hill/mountain tiles, away from settlements (to incentivize trade)
  - Stone quarries: in hills
  - Ancient forests: in deep forest tiles (bonus timber)
  - Fertile plains: in high-moisture plains (bonus grain)
- [ ] Nearby settlements get a production bonus if they have the matching building

### 2.7 Road Network (`src/mapgen/roads.ts`)
- [ ] `delaunayTriangulate(settlements: SettlementSeed[]): [number, number][]` — list of settlement index pairs that form triangulation edges (use simple incremental Delaunay or Bowyer-Watson)
- [ ] `minimumSpanningTree(nodes, edges): Edge[]` — Kruskal's algorithm; weight = Euclidean distance
- [ ] `addRedundantRoads(mst, settlements): Edge[]` — add any Delaunay edge where both endpoints are large towns/cities (connect major centers even if not on MST)
- [ ] `classifyRoadQuality(from, to, terrain): 'dirt' | 'gravel' | 'stone'`
  - Mountains → dirt
  - Between large settlements → stone
  - Otherwise → gravel
- [ ] `buildRoads(settlements, terrain): Road[]` — returns final `Road[]` with quality and computed length
- [ ] Unit test: all settlements connected (no isolated nodes); MST has exactly N-1 edges

### 2.8 Map Generation Entry Point (`src/mapgen/index.ts`)
- [ ] Define `MapData`: `{ seed, terrain, rivers, settlements, roads, resourceNodes, width, height }`
- [ ] `generateMap(seed: string, config?: Partial<MapConfig>): MapData` — runs full pipeline:
  1. generateTerrain
  2. carveRivers
  3. placeSettlements
  4. placeResourceNodes
  5. buildRoads
  6. Return MapData
- [ ] `generateInitialWorldState(mapData: MapData): WorldState` — wraps map data in WorldState, assigns NPC lords, initializes player house
- [ ] Unit test: generateMap produces consistent results for same seed; different seeds produce different settlement positions

---

## Phase 3 — Web Worker Integration

### 3.1 Worker Entry Point (`src/simulation/worker.ts`)
- [ ] Set up Web Worker file (Vite handles `?worker` import suffix)
- [ ] On `message` event, parse `SimCommand` and route to engine
- [ ] On `'INIT'` command: create SimulationEngine from WorldState; start tick intervals
- [ ] On `'LOAD'` command: load from IndexedDB, init engine, run idle catch-up
- [ ] On `'NEW_GAME'` command: generate map, init WorldState, init engine
- [ ] After every `slowTick`, post `StateSnapshot` to main thread
- [ ] After every `fastTick`, post caravan position updates only (lightweight, 500ms)

### 3.2 Tick Timing
- [ ] `startFastTick(speed: GameSpeed)`: set interval for fast tick
  - pause: clear interval
  - 1x: 500ms per fast tick
  - 2x: 250ms per fast tick
  - 5x: 100ms per fast tick
  - debug: 50ms (included at user's request for debugging)
- [ ] `startSlowTick(speed: GameSpeed)`: slow tick fires every 10 fast ticks (ratio kept constant)
- [ ] On speed change command: clear intervals, restart at new speed
- [ ] Ensure intervals don't pile up (clear old interval before setting new one)

### 3.3 Idle Catch-Up
- [ ] On `LOAD`: compare `savedAt` timestamp in save data vs. `Date.now()`
- [ ] `missedMs = Date.now() - savedAt`
- [ ] `missedSlowTicks = Math.floor(missedMs / 5000)` (5000ms per slow tick at 1x)
- [ ] Cap: `min(missedSlowTicks, 3 * 24 * 12)` (3 days at 12 slow ticks/min = 51840 — actually cap is 3 real days worth of 1x ticks)
- [ ] Run `engine.idleCatchup(cappedTicks)` — runs ticks without posting UI updates
- [ ] Post special `IDLE_SUMMARY` message with events generated during catch-up

### 3.4 Worker Store (Main Thread) (`src/stores/simulation.ts`)
- [ ] Create Svelte store `worldSnapshot` — holds latest `StateSnapshot` from worker
- [ ] `workerSend(cmd: SimCommand): void` — post command to worker
- [ ] `initWorker()` — create worker, wire up `onmessage` handler to update `worldSnapshot`
- [ ] On `IDLE_SUMMARY` message: set `idleSummary` store for modal
- [ ] `selectSettlement(id: string)` — update `uiStore.selectedSettlementId`

---

## Phase 4 — SVG World Map

### 4.1 Full-Viewport App Layout (`src/ui/App.svelte`)
- [ ] CSS Grid layout:
  ```
  grid-template-rows: 40px 1fr 80px;
  grid-template-columns: 1fr 380px;
  grid-template-areas:
    "topbar topbar"
    "map    panel"
    "log    log";
  ```
- [ ] Each area is a positioned container; overflow hidden on root
- [ ] Wire up worker init on mount
- [ ] Pass `worldSnapshot` down to child components via context or prop

### 4.2 Pan + Zoom (`src/ui/map/WorldMap.svelte`)
- [ ] SVG element with `viewBox` controlled by `panX, panY, zoom` state
- [ ] Mouse wheel: adjust zoom (min 0.5×, max 8×); zoom toward cursor position
- [ ] Mouse drag (left button held): pan `panX, panY`
- [ ] Touch: single finger drag to pan; two-finger pinch to zoom (use `TouchEvent`)
- [ ] Keyboard: arrow keys to pan; +/- to zoom
- [ ] `resetView()` button in topbar — centers map and resets zoom
- [ ] Export `toWorldCoords(screenX, screenY): {x, y}` for click handling

### 4.3 Terrain Rendering (`src/ui/map/Terrain.svelte`)
- [ ] Render terrain as SVG `<rect>` per tile — but tiles are small so this will be many elements
- [ ] Optimization: group adjacent same-terrain tiles into SVG `<path>` polygons (or use a pre-baked SVG for terrain layer)
- [ ] Alternative: render terrain to an off-screen canvas once on map load, export as base64 PNG, embed as SVG `<image>` — much faster
- [ ] Decision: use canvas-rendered-to-image approach for terrain (performance), pure SVG for interactive elements
- [ ] Terrain image updates only when map changes (not per tick)

### 4.4 Rivers (`src/ui/map/Rivers.svelte`)
- [ ] Render each river as SVG `<polyline>` or `<path>`
- [ ] Style: `stroke: #3a6b8b; stroke-width: varies (1–4 based on width); stroke-linecap: round; fill: none`
- [ ] Rivers don't update per tick (static after map gen)

### 4.5 Roads (`src/ui/map/Roads.svelte`)
- [ ] Render each road as SVG `<line>` between settlement positions
- [ ] Style by quality: dirt = `#8b7355 dashed`, gravel = `#a09070`, stone = `#c8b898 solid`
- [ ] Roads update only when new roads are built (rare)

### 4.6 Settlement Icons (`src/ui/map/Settlements.svelte`)
- [ ] For each settlement, render SVG `<g>` centered at settlement position
- [ ] Icon by type: simple SVG path — castle/tower for fortress, circle+dot for village, house cluster for town, ship hull for port, cross for monastery
- [ ] Size scales slightly with population (min/max clamped)
- [ ] Player-owned: gold outline; NPC-owned: grey outline
- [ ] Hover: show tooltip with settlement name + population
- [ ] Click: dispatch `selectSettlement` event
- [ ] Name label: SVG `<text>` below icon, only visible at zoom > 2×

### 4.7 Trade Route Lines (`src/ui/map/TradeRoutes.svelte`)
- [ ] For each active `TradeRoute`, render SVG `<path>` between from→to settlements
- [ ] Color by good category:
  - Food (grain, bread): `#8fa876`
  - Metal (iron, tools): `#7a7068`
  - Cloth/leather: `#8b6b8b`
  - Luxury (wine, candles): `#8b3a8b`
  - Default: `#3a6b8b`
- [ ] Slight curve offset if multiple routes share the same endpoints (avoid overlap)
- [ ] Player routes: solid line; NPC routes: dashed, slightly transparent

### 4.8 Caravan Dots (`src/ui/map/Caravans.svelte`)
- [ ] For each active `Caravan`, compute screen position:
  - Interpolate between from-settlement and to-settlement position using `progress`
- [ ] Render as small SVG `<circle>` (radius 4)
- [ ] Player caravans: filled gold; NPC: filled white/grey
- [ ] Update on every `fastTick` snapshot (500ms or faster depending on speed)
- [ ] Smooth movement: use CSS `transition: cx 0.4s linear, cy 0.4s linear` on circles (only when speed is 1x)
- [ ] At high speeds (5x, debug): disable CSS transitions to prevent visual lag

### 4.9 Price Heatmap Mode (`src/ui/map/PriceHeatmap.svelte`)
- [ ] Activated from the panel (select a good → toggle heatmap)
- [ ] Overlay a colored circle on each settlement scaled by that good's local price:
  - Low price (cheap buy): blue hue
  - Mid price: neutral
  - High price (expensive sell): red hue
- [ ] Color interpolated between min/max price across all known settlements
- [ ] Heatmap legend in top-left corner (gradient bar with min/max labels)
- [ ] Deactivated when a different tab is selected or good is deselected

---

## Phase 5 — Information Panels

### 5.1 Topbar (`src/ui/topbar/Topbar.svelte`)
- [ ] Left: game title / dynasty name
- [ ] Center: `TimeControls.svelte` — ⏸ 1× 2× 5× 🐛 buttons; active speed highlighted
  - Sends `SetGameSpeed` command to worker on click
  - Display current in-game date: "Day 14, Summer, Year 2"
- [ ] Right: `TreasuryDisplay.svelte` — player gold with icon; `AlertBell.svelte` — badge with unread event count
- [ ] Mobile: collapse to icons only, tap for labels

### 5.2 Right Panel Container (`src/ui/panels/RightPanel.svelte`)
- [ ] Tab bar: Settlement | Routes | Ledger | Merchants
- [ ] Tab content area: scrollable within panel, no outer scroll
- [ ] When no settlement selected: Settlement tab shows "Click a settlement on the map"
- [ ] Panel width: fixed 380px on desktop; full-width bottom drawer on mobile

### 5.3 Settlement Tab (`src/ui/panels/SettlementTab.svelte`)
- [ ] Header: settlement name, type badge, ownership indicator (player / NPC lord name)
- [ ] Population row: current pop / pop cap, growth rate per day (green if positive, red if negative)
- [ ] Treasury row: gold balance, daily net income (last 7 days average)
- [ ] Tariff row: current tariff rate, option to bribe (if NPC) or set directly (if player-owned)
- [ ] **Inventory Table** (the main info surface):
  - Columns: Good | Stock | Cap | Prod/day | Cons/day | Price | 7d trend
  - Row exists for every good that has stock > 0 OR is being produced/consumed
  - `InventoryBar.svelte` component: colored bar showing stock as % of target:
    - 0–20%: red background
    - 20–60%: yellow
    - 60–100%: green
    - >100% (surplus): blue
  - Price column: colored — red if much higher than base, blue if much lower
  - 7d trend: mini sparkline (d3) of last 7 price entries from `marketHistory`
  - Sort by: good name, stock level, price (click column header)
- [ ] **Buildings Section**: list of all buildings in this settlement
  - Name, level, worker count / max workers, efficiency %
  - If player owns this settlement: Upgrade button (if affordable) + Build button (opens modal)
- [ ] **Trade Routes Section**: list of routes into/out of this settlement
  - Each route: good icon + name, from→to arrows, est. daily volume
  - Player routes: edit/cancel button; NPC routes: view-only

### 5.4 Routes Tab (`src/ui/panels/RoutesTab.svelte`)
- [ ] Table of all player trade routes:
  - Merchant name | From | To | Good | Qty/trip | Last profit | Status
  - Status: traveling (animated), idle, suspended
- [ ] "Assign New Route" button → opens `AssignRouteModal.svelte`
- [ ] Click row: select that merchant and show their active caravan position on map
- [ ] Profitability column: estimated gold per day on this route (green positive, red negative)
- [ ] Sort by merchant, good, or profitability

### 5.5 Ledger Tab (`src/ui/panels/LedgerTab.svelte`)
- [ ] **Summary**: total gold, 7-day income, 7-day expenses, net
- [ ] **Income breakdown**:
  - Trade profits (by merchant/route)
  - Production profits (goods sold from owned buildings)
- [ ] **Expense breakdown**:
  - Merchant wages
  - Building maintenance (per owned building per day)
  - Tariffs paid on trade
- [ ] **Assets table**:
  - All player-owned buildings: settlement, type, level, estimated value
  - All owned warehouse slots
  - All merchants: name, level, estimated value
  - Total asset value
- [ ] **Net worth** = gold + asset value

### 5.6 Merchants Tab (`src/ui/panels/MerchantsTab.svelte`)
- [ ] List of all player merchants:
  - Name, cart capacity, current gold purse, home settlement
  - Status: idle (with how long), traveling (with destination + ETA), route name
  - Mode: auto / manual toggle (fires `SetMerchantMode` command)
- [ ] "Hire Merchant" button → costs gold, opens hire modal (pick name, home settlement)
- [ ] Click merchant → highlights their caravan on the map

### 5.7 Event Log (`src/ui/EventLog.svelte`)
- [ ] Bottom bar: horizontally scrollable list of recent events (newest left)
- [ ] Each event: icon + short message + timestamp (in-game)
- [ ] Click event: if it references a settlement, select that settlement on the map
- [ ] Event types have icons:
  - shortage_warning: 🔴 or red triangle
  - surplus_alert: 🔵 or blue circle
  - caravan_arrived: cart icon
  - population_growth: up arrow
  - price_spike: lightning bolt
- [ ] "View all" button → full-screen scrollable event log modal

### 5.8 Shared Components
- [ ] `InventoryBar.svelte`: props `{ value, max, target }` → renders colored bar + text
- [ ] `Sparkline.svelte`: props `{ data: number[], width, height, color }` → d3 line chart
- [ ] `GoodIcon.svelte`: props `{ goodId }` → colored badge with good name abbreviation
- [ ] `GoldAmount.svelte`: props `{ amount }` → formatted number with gold coin icon

---

## Phase 6 — Player Controls

### 6.1 Buy / Sell Modal (`src/ui/modals/BuySellModal.svelte`)
- [ ] Triggered by clicking "Trade" button in Settlement tab
- [ ] Good selector: dropdown or searchable list; shows local price next to each good
- [ ] Mode toggle: Buy or Sell
- [ ] Quantity input: number field with +/- buttons; max capped by inventory/gold
- [ ] Preview: "You pay/receive X gold; settlement inventory changes by Y"
- [ ] Confirm button → fires `BuySell` command to worker
- [ ] Validation: can't buy more than player gold allows; can't sell more than player has

### 6.2 Assign Route Modal (`src/ui/modals/AssignRouteModal.svelte`)
- [ ] Step 1: Pick merchant (dropdown of idle merchants with capacity shown)
- [ ] Step 2: Pick good to trade (dropdown; shows price at all settlements for context)
- [ ] Step 3: Pick source settlement (where to buy)
- [ ] Step 4: Pick destination settlement (where to sell)
- [ ] Step 5: Set thresholds (buy if price ≤ X, sell if price ≥ Y) — auto-filled with sensible defaults
- [ ] Step 6: Confirm — shows projected margin, confirms → fires `SetRoute` command
- [ ] Cancel at any step returns to previous step

### 6.3 Build Modal (`src/ui/modals/BuildModal.svelte`)
- [ ] Shows only buildings available for this settlement's terrain
- [ ] Shows buildings already present (can't double-build, but can upgrade)
- [ ] Each building card: name, inputs→outputs diagram, workers needed, cost, build time
- [ ] "Build" or "Upgrade to Lv2/3" button — only enabled if player has enough gold and owns a building slot here
- [ ] Cost deducted immediately; building appears but at 0% efficiency until build time elapses

### 6.4 Player Merchant Hire
- [ ] "Hire Merchant" button in Merchants tab
- [ ] Cost: scales with merchant number (1st = 200g, 2nd = 500g, 3rd = 1200g, etc.)
- [ ] Pick home settlement from dropdown of settlements where player has warehouse
- [ ] Merchant gets procedurally generated name
- [ ] Fires `HireMerchant` command to worker

### 6.5 Road Investment
- [ ] In Settlement tab → "Infrastructure" section: list of roads connected to this settlement
- [ ] Show current quality and upgrade cost (dirt→gravel→stone)
- [ ] "Invest in Road" button: deducts gold, upgrades road quality in WorldState
- [ ] Effect: increases caravan speed on that road segment for all caravans

### 6.6 Keyboard Shortcuts
- [ ] `Space` — toggle pause / play
- [ ] `1`, `2`, `5` — set speed to 1x, 2x, 5x
- [ ] `D` — debug speed toggle
- [ ] `Escape` — close open modal or deselect settlement
- [ ] `H` — toggle price heatmap mode
- [ ] `L` — switch to Ledger tab
- [ ] `M` — switch to Merchants tab
- [ ] Arrow keys — pan map

---

## Phase 7 — Idle & Progression Layer

### 7.1 Offline Summary Modal (`src/ui/modals/OfflineSummaryModal.svelte`)
- [ ] Shown on load if idle catch-up was significant (> 6 in-game hours)
- [ ] Shows: time elapsed, gold earned/lost, notable events (shortages, surpluses, caravan deliveries)
- [ ] "Resume" button dismisses modal and begins live ticking

### 7.2 Era Progression System
- [ ] Define `EraDefinition`: thresholds that must be met to complete an era
  - Era I: accumulate 5,000g + have 3 active trade routes
  - Era II: own buildings in 3 settlements + have 3 merchants
  - Era III: control >25% of trade in 2 different goods
  - Era IV: control >50% of trade in 5 goods or total gold > 100,000g
- [ ] Track progress toward current era in `WorldState.eraProgress`
- [ ] Check era completion each `slowTick`; generate `era_progress` event at 25%, 50%, 75%, 100%
- [ ] On era completion: show `EraCompleteModal` with summary and new unlocks

### 7.3 Unlock Tracking
- [ ] Define `Unlock` type: building types, merchant slots, trading charter access, etc.
- [ ] `WorldState.unlockedFeatures: Set<string>`
- [ ] Era I → II transition unlocks: production buildings, 3rd merchant slot
- [ ] Era II → III transition unlocks: trading charters, road investment, bribe mechanic
- [ ] Era III → IV transition unlocks: found new settlements, fund lords, sea trade (if coastal map)
- [ ] UI respects unlocks (greyed out / locked state on future features)

### 7.4 Prestige / Dynasty Reset
- [ ] "Pass the Dynasty" button in Ledger tab (visible after completing Era II)
- [ ] Confirmation modal: shows bonuses that will be earned, warns that gold/buildings reset
- [ ] `calculateDynastyBonuses(world): DynastyBonus[]` — based on achievements:
  - Peak gold reached, buildings owned, routes operated, eras completed
- [ ] Store dynasty bonuses in `localStorage` (persist across prestige)
- [ ] On new game after prestige: apply bonuses to starting conditions
- [ ] Dynasty counter shown in topbar ("Dynasty 3")

### 7.5 Dynasty Bonus Application
- [ ] Define `DynastyBonus`: `{ type, value }` where type covers:
  - `starting_gold_multiplier`, `starting_merchants`, `caravan_speed_bonus`, `production_bonus_<good>`, `extra_build_slot`, `knowledge_bonus` (start with more settlement prices known)
- [ ] `applyDynastyBonuses(initialWorld, bonuses): WorldState` — modify starting WorldState
- [ ] Show active dynasty bonuses in settings/info panel

---

## Phase 8 — Polish & Performance

### 8.1 Seasonal Visual Effects
- [ ] Apply CSS filter/overlay to terrain SVG image based on season:
  - Spring: slight green tint + lighter brightness
  - Summer: warm saturation boost
  - Autumn: amber/orange color shift
  - Winter: blue-grey desaturation + slight brightness reduction
- [ ] Animate tint transition over 2–3 seconds when season changes
- [ ] Snow particles on map in winter (simple CSS keyframe snow dots, optional)

### 8.2 Price History Sparklines
- [ ] Wire up `Sparkline.svelte` in the Settlement inventory table
- [ ] Use `d3-scale` (linear scale) + `d3-shape` (line generator) + `d3-path`
- [ ] Display 30-day price history as a small 60×20px SVG line
- [ ] Color: line is green if current price < base price, red if above

### 8.3 Mobile Layout
- [ ] Breakpoint at 768px: switch from side panel to bottom drawer
- [ ] `BottomDrawer.svelte`:
  - Fixed to bottom, starts collapsed (showing handle)
  - Swipe up to expand (half or full height)
  - Swipe down to collapse
  - Contains same tab content as RightPanel
- [ ] Topbar on mobile: collapse to icons, expand on tap
- [ ] Map: full-width below topbar; bottom drawer overlays it when open

### 8.4 Performance Profiling
- [ ] Measure SVG render time with 50 settlements + 100 caravans at 5x speed
- [ ] If SVG is slow: consider throttling caravan updates to every 2 fast ticks at 5x
- [ ] Ensure Svelte reactivity doesn't cause full-component re-renders on every tick — use `$derived` carefully; avoid reactive re-rendering of the entire settlement list when only one changes
- [ ] Profile Web Worker serialization cost — if `postMessage` of full snapshot is expensive, switch to delta updates (only send changed settlements)

### 8.5 Error Handling & Edge Cases
- [ ] Graceful handling if IndexedDB is unavailable (Safari private mode) — fall back to localStorage with size warning
- [ ] Handle map generation failure (infinite loop guard on settlement placement)
- [ ] Handle worker crash — detect via `onerror`, show error modal, offer restart
- [ ] NaN price guard — if any price calculation produces NaN, reset to basePrice and log warning

### 8.6 Loading Screen
- [ ] Simple full-page loading state (dark background, parchment-colored text) shown while:
  - Worker initializing
  - Map generating
  - Save loading + idle catch-up running
- [ ] Show progress message: "Generating terrain...", "Placing settlements...", "Catching up 3 days of trade..."
- [ ] Fade out smoothly when done

### 8.7 Accessibility
- [ ] All interactive elements keyboard-accessible (focus ring visible on dark theme)
- [ ] Aria labels on icon-only buttons
- [ ] Modal focus trapping (Tab cycles within open modal)
- [ ] Color is never the *only* indicator (always paired with icon or text label)

---

## Ongoing / Maintenance

- [ ] Keep `planning.md` updated as design decisions are made during implementation
- [ ] Run `vitest` before every commit — simulation engine must maintain 100% test pass rate
- [ ] Comment all non-obvious simulation formulas with the reasoning behind the numbers
- [ ] Keep all TypeScript `strict` errors at zero — never use `any` without a comment explaining why
- [ ] Document the Web Worker message protocol in `src/simulation/worker.ts` as a block comment
