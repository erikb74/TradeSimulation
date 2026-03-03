# CLAUDE.md — Medieval Trade Simulation

This file provides context, conventions, and development guidance for Claude Code (and any engineer) working on this codebase.

---

## Project Overview

A medieval economic simulation game running entirely in the browser. The world economy runs autonomously: settlements produce goods, NPC merchants trade between them, and prices emerge from supply and demand. The player enters as a Merchant House — growing from a single cart to a trade empire through arbitrage, infrastructure investment, and market control.

Key inspirations: X4 Foundations (autonomous economy), Port Royale (player-as-merchant), Victoria 3 (supply/demand pricing), idle games (offline accumulation, prestige loops).

**See `planning.md` for full design documentation. See `todo.md` for implementation task tracking.**

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Language | TypeScript | 5.x (strict mode, no `any`) |
| Build | Vite | 6.x |
| UI Framework | Svelte | 5.x (runes syntax) |
| Styling | TailwindCSS | 4.x |
| Simulation thread | Web Worker | Native browser API |
| Map generation | simplex-noise | npm |
| Persistence | IndexedDB | via `idb` npm package |
| Charts | d3-scale, d3-shape, d3-path | (minimal subset only) |
| Testing | Vitest | matched to Vite version |

**No backend. No server. No database.** Fully static. Deployable to GitHub Pages, Netlify, or Cloudflare Pages with zero configuration.

---

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (hot module reloading)
npm run dev

# Type-check without building
npm run check

# Run unit tests (single pass)
npm test

# Run unit tests in watch mode
npm run test:watch

# Production build
npm run build

# Preview production build locally
npm run preview
```

---

## Repository Structure

```
/
├── planning.md          # Game design document — update as design evolves
├── todo.md              # Implementation task list — check off as work is done
├── CLAUDE.md            # This file
├── index.html           # Vite entry point
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts   # (or inline in vite.config if using v4 plugin)
├── package.json
└── src/
    ├── main.ts          # Mounts App.svelte; initializes worker
    ├── app.css          # Global styles + Tailwind import + CSS variables
    ├── simulation/      # ALL simulation logic — must run in Web Worker context
    │   ├── types.ts     # All TypeScript interfaces (WorldState, Settlement, etc.)
    │   ├── goods.ts     # Good definitions (base prices, weights, names)
    │   ├── buildings.ts # Building definitions (inputs, outputs, workers by level)
    │   ├── engine.ts    # SimulationEngine class — main tick orchestrator
    │   ├── production.ts
    │   ├── consumption.ts
    │   ├── pricing.ts
    │   ├── merchants.ts # NPC and player merchant AI
    │   ├── caravans.ts
    │   ├── seasons.ts
    │   ├── events.ts
    │   ├── save.ts      # Serialize/deserialize WorldState for IndexedDB
    │   ├── worker.ts    # Web Worker entry point + postMessage protocol
    │   └── __tests__/   # Vitest unit tests for simulation
    ├── mapgen/          # Procedural map generation — runs on new game only
    │   ├── noise.ts     # Seeded simplex noise helpers
    │   ├── terrain.ts
    │   ├── rivers.ts
    │   ├── settlements.ts
    │   ├── resources.ts
    │   ├── roads.ts     # Delaunay triangulation + MST
    │   ├── names.ts     # Procedural settlement name generation
    │   ├── index.ts     # Public API: generateMap(seed) → MapData
    │   └── __tests__/
    ├── ui/              # Svelte components — main thread only
    │   ├── App.svelte
    │   ├── map/         # SVG world map components
    │   ├── panels/      # Right panel tabs
    │   ├── topbar/
    │   ├── modals/
    │   ├── mobile/      # Bottom drawer for mobile
    │   └── shared/      # Reusable components (InventoryBar, Sparkline, etc.)
    ├── stores/          # Svelte reactive stores (main thread)
    │   ├── simulation.ts # worldSnapshot from worker + workerSend()
    │   ├── ui.ts        # selectedSettlementId, activeTab, heatmapGood
    │   └── settings.ts  # gameSpeed, display preferences
    └── lib/             # Shared utilities (safe to import from either thread)
        ├── constants.ts
        ├── math.ts
        └── ids.ts
```

---

## Architecture — The Two-Thread Model

The simulation runs in a **Web Worker** (background thread). The UI runs on the **main thread**. They communicate via `postMessage`.

```
MAIN THREAD                           WEB WORKER
────────────────────────────          ────────────────────────────
App.svelte + Svelte stores            SimulationEngine
  │                                     │
  │  SimCommand (player action)         │  fastTick() every 500ms
  │ ─────────────────────────────→      │  slowTick() every 5000ms
  │                                     │
  │  StateSnapshot (read-only)          │
  │ ←─────────────────────────────      │
  ↓                                     │
UI reads snapshot reactively          Worker owns authoritative state
```

**Critical rule:** The UI never modifies simulation state directly. All state changes go through `workerSend(command)`. The worker applies the command, runs any affected logic, and posts an updated snapshot.

### Tick Rates (at 1x speed)

| Tick | Interval | In-game time | What runs |
|------|----------|-------------|-----------|
| Fast tick | 500ms | 1 hour | Caravan movement, production output, delivery |
| Slow tick | 5000ms | 1 day | Prices, population, NPC decisions, wages, events |
| Season | 30 slow ticks | 1 month | Seasonal effect update |

Speed multipliers: `1x = 1.0`, `2x = 0.5×`, `5x = 0.2×`, `debug = 0.1×` (intervals scale inversely).

---

## Simulation Design Principles

### Economy is Autonomous
The world runs without player input. NPC lords and merchants make decisions every tick. Do not add "waiting for player" logic to the core simulation — the economy should evolve whether or not the player acts.

### Prices Are Emergent
Never set a price directly in game logic (outside of initialization). Prices must always be the output of the supply/demand formula in `pricing.ts`. Hard-coding a price for a situation is a design smell.

### No Global Market
Every settlement has its own local price for every good. There is no single "world price." Price differences between settlements are what makes trade profitable and interesting.

### Workers First
Every production building requires workers (drawn from population). A building with no workers produces nothing. This means population and labor supply are the primary constraint on production, not just raw inputs.

### Tools Are the Backbone
Tools (produced by Blacksmiths from Iron Bars) are consumed by every Tier 1 and Tier 2 production building. A settlement that runs out of tools stops producing everything. This creates a critical trade dependency: every economy needs access to a Blacksmith or a trade route to one.

---

## TypeScript Conventions

- **`strict: true`** is enforced. No implicit `any`. No `as any`.
- Use explicit `Record<GoodId, number>` rather than `{ [key: string]: number }` so the type system enforces valid good IDs.
- Prefer `Map<string, T>` for runtime lookups; `Record<K, T>` for static definitions.
- All `WorldState` mutations happen in the worker thread only. Types that cross thread boundaries must be serializable (no functions, no class instances — plain objects and Maps that JSON-serialize cleanly).
- Use `type` for unions and aliases; `interface` for object shapes that may be extended.
- Every simulation formula should have a brief inline comment explaining the intent, not just the math.

---

## Svelte 5 Conventions

- Use **runes syntax** (`$state`, `$derived`, `$effect`, `$props`) — not the legacy Options API.
- Prefer `$derived` over `$effect` for values computed from state. Only use `$effect` for true side effects (DOM manipulation, worker messages).
- Avoid deep reactive objects — keep `$state` at the top level and pass values down as props.
- The `worldSnapshot` store (in `stores/simulation.ts`) is the single source of truth for all simulation data on the main thread. Components read from it; they never maintain their own copy of simulation state.
- `ui.ts` store holds purely presentational state (which settlement is selected, which tab is active). This is kept separate from simulation state to make it easy to reset UI without touching the simulation.

---

## Testing Policy

- **Unit test the simulation engine thoroughly.** Production logic, price model, merchant AI, caravan movement — all must have Vitest tests.
- **Do not unit test Svelte components** (too brittle, too slow to set up). Instead, test the stores and any pure functions called by components.
- **Every simulation formula change requires a corresponding test.** If you change the price update formula, update the test for the price model.
- Run `npm test` before committing. All tests must pass.
- Test naming: `describe('pricingModel') → it('raises price when stock is below target')`

---

## UI/UX Non-Negotiables

1. **Full viewport, no scrolling the page.** `html, body` are `overflow: hidden`. The game fills 100% of the screen.
2. **No canvas-in-a-box.** The world map is an SVG inside the Svelte layout — not a `<canvas>` inside a wrapping `<div>` that sits in the middle of the page.
3. **Information density over prettiness.** When in doubt, show more numbers. The player should be able to see production rates, stock levels, prices, and route profitability all at once.
4. **Color is always paired with text or icons.** Never use color as the only indicator (accessibility).
5. **Desktop layout is the primary target.** Mobile gets the same content via a bottom-drawer pattern, not a degraded experience.

---

## Color Palette (CSS Variables)

Defined in `src/app.css`:

```css
:root {
  --color-bg:           #1a1410;   /* Very dark brown-black */
  --color-bg-panel:     #221c16;   /* Slightly lighter for panels */
  --color-bg-raised:    #2e2419;   /* Cards, modals */
  --color-text:         #e8d5a3;   /* Aged parchment cream */
  --color-text-muted:   #9c8a6a;   /* Secondary text */
  --color-gold:         #c8961e;   /* Accent: gold, wealth, important values */
  --color-gold-bright:  #f0b830;   /* Hover/active gold states */
  --color-surplus:      #4a7c59;   /* Green: surplus stock, positive numbers */
  --color-shortage:     #8b3a3a;   /* Red: shortage, danger, negative */
  --color-warning:      #9c7a28;   /* Amber: low stock, caution */
  --color-trade:        #3a6b8b;   /* Blue: trade routes, water, neutral info */
  --color-luxury:       #6b3a8b;   /* Purple: luxury goods */
  --color-border:       #3d3020;   /* Subtle panel borders */
}
```

---

## Good Categories & Colors

| Category | Color variable | Examples |
|----------|---------------|---------|
| Staple food | `--color-surplus` (green) | grain, flour, bread, fish |
| Preserved food | `#6b8b5a` | salted_fish, smoked_meat |
| Raw materials | `--color-text-muted` (grey-tan) | timber, iron_ore, stone |
| Processed materials | `#7a7068` | iron_bar, planks, mortar |
| Tools & weapons | `#a09070` | tools, iron_weapons, iron_armor |
| Textile | `#8b6b8b` (muted purple) | cloth, leather, clothing, boots |
| Luxury | `--color-luxury` (purple) | wine, candles, medicine |
| Services/buildings | `--color-gold` | carts, saddles |

---

## Simulation Constants

Defined in `src/lib/constants.ts`. Change here only — never hardcode in simulation logic:

```typescript
export const FAST_TICK_MS = 500          // ms per fast tick at 1x speed
export const SLOW_TICK_MS = 5000         // ms per slow tick at 1x speed
export const TICKS_PER_SEASON = 30       // slow ticks per season (30 days)
export const MAX_OFFLINE_SLOW_TICKS = 51840  // 3 real days at 1x
export const PRICE_CLAMP_MIN = 0.3       // minimum price as multiplier of base
export const PRICE_CLAMP_MAX = 8.0       // maximum price as multiplier of base
export const PRICE_MEAN_REVERSION = 0.01 // fraction back toward base per slow tick
export const MIN_PROFIT_THRESHOLD = 10   // gold — merchants ignore routes below this
export const EVENT_LOG_MAX = 200         // maximum events kept in WorldState
export const AUTOSAVE_INTERVAL = 60      // slow ticks between autosaves
export const CARAVAN_BASE_SPEED = 0.02   // progress per fast tick on a gravel road
```

---

## Common Mistakes to Avoid

- **Do not import from `src/ui/` in simulation files.** The simulation module runs in a Web Worker and has no access to the DOM. Any import of a Svelte component or DOM API in simulation code will crash the worker.
- **Do not use `setInterval` or `setTimeout` anywhere except `worker.ts`.** Tick timing is managed exclusively by the worker.
- **Do not call `workerSend()` inside a `$derived` block.** Derived values are recomputed often. Commands should only be sent in response to explicit user actions (`on:click`, form submission, etc.).
- **Do not store the full `WorldState` in a Svelte `$state`.** It's too large and will trigger excessive re-renders. The `worldSnapshot` store should contain only the `StateSnapshot` — a serialized, pruned version of world state for display purposes.
- **Do not add `console.log` to hot paths** (fast tick, slow tick). The tick loops run hundreds of times per minute. Logging inside them will tank performance and spam the console.
- **Never use `as any` to silence a type error.** Fix the type or leave a `// TODO:` comment explaining why the type is wrong — it might indicate a deeper design issue.

---

## Adding a New Good

1. Add the good ID to the `GoodId` union in `src/simulation/types.ts`
2. Add a `GoodDefinition` entry in `src/simulation/goods.ts`
3. Add it as an input/output to any relevant `BuildingDefinition` in `src/simulation/buildings.ts`
4. Add consumption rate to `CONSUMPTION_PER_100_POP_PER_DAY` in `src/simulation/consumption.ts` (if consumed by population)
5. Add a color/category entry in the table in this file and in `GoodIcon.svelte`
6. Run `npm test` — existing tests for building input/output validation should catch mismatches

## Adding a New Building

1. Add the building type to the `BuildingType` union in `src/simulation/types.ts`
2. Add a `BuildingDefinition` entry in `src/simulation/buildings.ts` — include all inputs, outputs, terrain requirements, worker counts, build costs
3. Verify in the unit test for `buildings.ts` that all inputs/outputs are valid `GoodId`s
4. Add the building name/description to the build modal display logic in `BuildModal.svelte`
5. Run `npm test`

---

## Deployment

The built output (`dist/`) is a fully static site. Deploy anywhere that serves static files:

```bash
npm run build
# dist/ can be deployed to:
# - GitHub Pages (push dist/ to gh-pages branch)
# - Netlify (drag and drop dist/ folder)
# - Cloudflare Pages (connect repo, set build command: npm run build, output: dist)
```

No server-side code, no environment variables, no API keys.

---

## Future Considerations (Not Current Scope)

- **Cloud saves**: would require a lightweight backend (Cloudflare Workers + KV, or Supabase). Not planned yet — use IndexedDB.
- **Multiplayer**: explicitly out of scope. The simulation architecture (single authoritative worker) would need significant rethinking.
- **Mobile app**: the web game is responsive but not a native app. PWA (Progressive Web App) manifest can be added cheaply if offline-first mobile is desired.
- **Pixel art / sprite assets**: the current design uses SVG geometry intentionally. If art assets are added later, consider using SVG symbols or embedded PNG sprites into the SVG layer — not switching to a canvas renderer.
