# Medieval Trade Simulation — Planning Document

> **Status:** Active iteration
> **Goal:** A medieval economic simulation game inspired by X4 Foundations, featuring castle economies, trade routes, and worker supply chains — with an idle game layer on top.

---

## 1. Vision & Core Pillars

### What We're Building
A living medieval world where:
- **Castles / Towns** produce and consume goods based on their population, industry, and geography
- **Trade routes** form organically or are set by the player between settlements
- **Workers** (farmers, miners, smiths, merchants) drive production chains
- **Merchants and caravans** physically carry goods across the map
- The economy runs whether the player is active or not (idle layer)
- The player can zoom from the macro view (map of the realm) down to a settlement's trade ledger

### Inspirations
| Game | What to Borrow |
|------|---------------|
| X4 Foundations | Autonomous economy, supply chain simulation, live market prices |
| Anno 1800 | Production chain clarity, settlement upgrade tiers |
| Dwarf Fortress / RimWorld | Deep simulation, emergent stories from systems |
| Crusader Kings III | Political/geographic flavor on the map |
| Idle games (e.g., Idle Loops) | Offline progress, prestige loops, incremental upgrades |

---

## 2. Core Systems

### 2.1 Production Chains
Classic medieval chains to model:

```
Grain Farm → Mill → Bakery → Bread (consumed by population)
Iron Mine → Smelter → Blacksmith → Tools / Weapons / Armor
Forest → Lumber Mill → Carpenter → Buildings / Carts
Sheep Farm → Weaver → Cloth → Tailor → Clothing
Vineyard → Winery → Wine (luxury, tavern)
Cattle Farm → Tannery → Leather → Saddler → Saddles / Boots
```

Each building has:
- **Input goods** (consumed per tick)
- **Output goods** (produced per tick)
- **Workers required** (with a skill level modifier)
- **Throughput** (variable based on worker count, upgrades, season)

### 2.2 Settlement Economy
Each settlement (castle town, village, monastery, etc.) has:
- A population that grows/shrinks based on food, housing, happiness
- A list of buildings with production rates
- An inventory / warehouse with capacity limits
- Local prices derived from supply/demand (shortage = high price, surplus = low)
- A tax system that siphons goods/gold to the ruling lord

### 2.3 Trade & Merchants
- Merchants evaluate price differentials between settlements
- They have a cargo capacity, a home base, and a route preference
- Trade routes can be manually assigned by the player or left autonomous
- Caravans travel at a speed affected by road quality, season, and bandits
- Sea routes (if coastal settlements exist) are faster but require ships

### 2.4 Worker Supply
- Workers are drawn from the settlement population
- Skilled workers (smiths, weavers) take time to train
- Workers can be poached from other settlements (with a gold incentive)
- Migration: if a settlement is poor, workers emigrate; if prosperous, they immigrate

### 2.5 Idle / Offline Layer
- Economy ticks continue while the player is away (capped at some max offline duration)
- Idle income: player earns a trickle of gold/goods from trade routes passively
- Prestige / Dynasty loop: reset with bonuses — e.g., faster worker training, better road network
- Research / upgrades unlock over real or in-game time (like idle game timers)

### 2.6 Player Interaction
The player acts as a **Trade Lord** / **Merchant Prince**:
- Build and upgrade production buildings
- Assign merchants to trade routes
- Set prices and tariffs at their owned settlements
- Negotiate (or war) with rival lords for resource access
- Unlock technologies (double-entry bookkeeping, steel tools, canal networks)

---

## 3. UI / UX Philosophy

### Problem with Typical Web Games
Most browser games render into a fixed canvas `<div>` that feels like an applet embedded in a webpage. This feels wrong because:
- Fixed resolution doesn't adapt to the browser window
- Canvas sits inside HTML "chrome" that competes visually
- No sense of immersion or "fullscreen app"

### Our Approach
- The game **IS** the page — full-viewport layout, no outer chrome
- Responsive layout: map takes most of the screen, side panels appear on the right/bottom
- Think of it more like a **web app** (like a trading dashboard) than a game canvas
- HTML/CSS panels for info displays (not drawn on canvas) — this means crisp text, scrollable tables, easy browser zoom support
- The map/world view is a rendered layer (SVG or canvas) underneath HTML UI panels

### UI Regions
```
┌─────────────────────────────────────────────────────────────┐
│  TOOLBAR: Time controls │ Treasury │ Realm name │ Alerts     │
├────────────────────────────────┬────────────────────────────┤
│                                │  SELECTED ENTITY PANEL     │
│                                │  ─────────────────────     │
│        WORLD MAP               │  Settlement: Ironhold       │
│   (SVG / Canvas layer)         │  Pop: 1,240  Gold: 4,820   │
│                                │  ─────────────────────     │
│   ● = town   ▲ = mine          │  Production                │
│   lines = trade routes         │  Goods inventory           │
│   animated dots = caravans     │  Active trade routes       │
│                                │  Build / Upgrade           │
├────────────────────────────────┴────────────────────────────┤
│  BOTTOM BAR: Event log / recent trades / alerts             │
└─────────────────────────────────────────────────────────────┘
```

### Information Density
Inspired by trading terminals and strategy games:
- Settlement panel shows live-updating numbers (prices, stock levels, production rate)
- Color-coded inventory bars (red = shortage, green = surplus)
- Trade route list with profitability indicator per route
- Global ledger: a spreadsheet-style view of all goods across all your settlements
- Price history charts (sparklines) for key goods

---

## 4. Technology Stack

### Option A: Pure Web (HTML/CSS/JS + Canvas/SVG)
**Recommended for this project.**

| Layer | Technology | Reason |
|-------|-----------|--------|
| Language | TypeScript | Type safety crucial for complex simulation state |
| Build | Vite | Fast dev server, simple config, good HMR |
| UI Framework | Svelte or Vue 3 | Reactive data binding for live-updating panels without React overhead |
| World Map | SVG (inline, reactive) | Scales perfectly, easy to bind click handlers, no pixel art needed |
| Simulation Engine | Pure TypeScript module | Runs in a Web Worker for non-blocking ticks |
| State | Zustand or Svelte stores | Lightweight, works well with simulation pattern |
| Persistence | localStorage + IndexedDB | Offline idle progress, save states |
| Styling | TailwindCSS | Rapid UI iteration, utility-first, no CSS conflicts |
| Charts | d3.js (minimal) | Sparklines and price charts |

**Why not React?** React's re-render model doesn't suit high-frequency simulation updates well. Svelte compiles to vanilla JS updates — perfect for ticking numbers.

**Why SVG for the map?**
- Resolution-independent (looks good on any screen size)
- CSS animations for caravans moving along paths
- Click/hover events are native
- No pixel art assets needed — we use geometric shapes + CSS for visual style

### Option B: Godot (Export to Web)
Godot can export to WebAssembly and run in a browser. Worth considering if:
- You want sprite-based medieval art assets later
- You want physics/pathfinding built in
- You're comfortable with GDScript / C#

**Downsides for this specific game:**
- Godot web exports embed a full WASM runtime (~40MB+ download)
- All UI in Godot is built with its own UI system — less flexible than HTML/CSS
- Information-dense panels (tables, scrolling lists) are painful in Godot
- The "game in a box" problem is *worse* with Godot web — it literally renders into a canvas element
- Loading times are significant

**Verdict:** For a simulation/idle game with dense information UI, **pure web (Option A) is significantly better**. Godot shines for action games or games where you want 2D/3D rendering with sprites. Our game's value is in the simulation + data display, not in graphics.

### Recommended Stack: TypeScript + Svelte + Vite + SVG Map

---

## 5. Architecture

### Simulation Engine (Web Worker)
The simulation runs in a separate thread so the UI never freezes:

```
Main Thread                    Web Worker
───────────────                ──────────────────────
UI / Svelte app       ←───    Simulation state (snapshot)
Player commands       ───→    Apply player actions
                              Tick every N ms
                              Recalculate prices
                              Move caravans
                              Update inventories
                      ←───    Post updated state snapshot
```

### Tick System
- **Fast tick** (every 500ms real time = 1 game hour): caravan movement, production output
- **Slow tick** (every 5s real time = 1 game day): price recalculation, population change, merchant decisions
- **Idle catch-up**: on load, calculate ticks missed since last session (capped at e.g. 7 days)

### Data Model (TypeScript types, simplified)

```typescript
type Good = 'grain' | 'bread' | 'iron_ore' | 'iron_bar' | 'tools' | 'wood' | 'cloth' | ...

interface Settlement {
  id: string
  name: string
  position: { x: number; y: number }
  population: number
  buildings: Building[]
  inventory: Record<Good, number>
  prices: Record<Good, number>       // local market price
  gold: number
}

interface Building {
  type: BuildingType
  level: number
  workers: number
  inputs: Record<Good, number>       // per tick
  outputs: Record<Good, number>      // per tick
}

interface Caravan {
  id: string
  from: string    // settlement id
  to: string      // settlement id
  cargo: Record<Good, number>
  progress: number   // 0.0 → 1.0 along route
  speed: number
}

interface TradeRoute {
  id: string
  from: string
  to: string
  good: Good
  quantity: number    // per trip
  assignedCaravans: string[]
}
```

### Price Model
Simple supply/demand:
```
basePrice * (demandRate / supplyRate)
```
With clamping (floor/ceiling) and slow mean-reversion to prevent runaway prices.

---

## 6. Visual Style

### No Pixel Art Required
- Map: SVG shapes — circles for towns, polygons for terrain regions, path lines for roads/rivers
- Colors communicate biome/wealth: green hills, grey mountains, blue rivers, warm tan for plains
- Settlement icons: simple SVG castle/tower glyphs (Unicode or simple paths)
- Caravans: small animated dots moving along trade route lines
- UI panels: dark theme ("parchment dark") — dark brown/black backgrounds, amber/cream text, gives a medieval ledger feel

### Color Language
| Color | Meaning |
|-------|---------|
| Red bar | Shortage / deficit |
| Green bar | Surplus |
| Amber | Gold / wealth |
| Blue | Trade route / water |
| Grey | Inactive / neutral |
| Purple | Luxury goods |

---

## 7. Idle Game Loop

### Core Idle Mechanic
- Passive income accumulates while offline (gold from trade routes, goods produced)
- Player returns to allocate accumulated resources (build, upgrade, expand)
- "Notify me" triggers for meaningful events (caravan arrived, settlement starving, trade boom)

### Prestige / Age System
- A "dynasty" runs for an in-game era
- At the end (or by choice), you can "pass on the realm" (prestige)
- Next dynasty starts with bonus multipliers based on what you built
- Examples: +10% caravan speed, unlocked building types, extra starting gold

### Progression Tree
```
Era I: Subsistence Economy
  → Grain farms, basic trade, one caravan

Era II: Artisan Economy
  → Iron working, cloth, more goods, road upgrades

Era III: Merchant Economy
  → Banking, credit, long-distance trade, guilds

Era IV: Imperial Economy
  → Multiple realms, diplomacy, sea trade
```

---

## 8. Open Questions / Decisions to Make

- [ ] **Map generation**: Procedural or hand-crafted starting map?
- [ ] **Player scope**: Do you control ONE settlement and trade with others, or do you control a whole realm?
- [ ] **Combat / conflict**: Is there a bandit/war mechanic that disrupts trade, or is it pure economics?
- [ ] **Multiplayer**: Future consideration or out of scope?
- [ ] **Mobile**: Should the UI be mobile-friendly or desktop-only?
- [ ] **Saving**: Browser localStorage only, or a backend for cloud saves?
- [ ] **Time scale**: How fast does in-game time pass? (affects idle pacing)
- [ ] **Monetization**: Pure hobby project, or planning for a released game?

---

## 9. Development Phases

### Phase 1 — Core Simulation (Prototype)
- TypeScript data model + simulation tick engine
- 3-5 settlements, 5-8 goods, basic production chains
- Caravans move between settlements
- No UI — verified via console/tests

### Phase 2 — Map UI
- Svelte app with full-viewport layout
- SVG map with clickable settlements
- Animated caravans along trade routes
- Basic info panel

### Phase 3 — Player Controls
- Build/upgrade buildings
- Assign trade routes manually
- Price/tariff controls
- Event log

### Phase 4 — Idle Layer
- Offline tick catch-up on load
- Idle income calculations
- Notification system
- Basic prestige loop

### Phase 5 — Depth & Polish
- Full production chain set
- Procedural map generation
- Price history charts
- Tech tree / research

---

## 10. Notes & References

- X4 economy reference: each station has a budget, buys inputs, sells outputs; prices are live across a shared market
- For SVG map inspiration: look at "Inkarnate" style maps — they use SVG + CSS filters for a parchment look
- Svelte tutorial: https://svelte.dev/tutorial
- Web Worker pattern for game loops: use `postMessage` with structured clone for state snapshots
