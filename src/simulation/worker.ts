/**
 * Web Worker entry point for the simulation engine.
 *
 * Message protocol:
 *   Main → Worker:  SimCommand (see types.ts)
 *   Worker → Main:  WorkerMessage (see types.ts)
 *
 * The worker owns the authoritative WorldState.
 * The UI only receives read-only StateSnapshot copies.
 */

import { SimulationEngine } from './engine'
import { generateMap, buildWorldState } from '../mapgen/index'
import { loadFromIndexedDB, saveToIndexedDB } from './save'
import { flattenTerrainColors, generateTerrain, DEFAULT_MAP_CONFIG } from '../mapgen/terrain'
import type { SimCommand, WorkerMessage } from './types'
import { FAST_TICK_MS, FAST_TICKS_PER_SLOW, MAX_OFFLINE_SLOW_TICKS, GAME_SPEEDS, type GameSpeed } from '../lib/constants'

let engine: SimulationEngine | null = null
let fastTickInterval: ReturnType<typeof setInterval> | null = null
let currentSpeed: GameSpeed = '1x'
let fastTickCount = 0

function postMessage(msg: WorkerMessage): void {
  self.postMessage(msg)
}

function stopTicks(): void {
  if (fastTickInterval !== null) {
    clearInterval(fastTickInterval)
    fastTickInterval = null
  }
}

function startTicks(speed: GameSpeed): void {
  stopTicks()
  if (!engine) return
  if (speed === 'pause') return

  const multiplier = GAME_SPEEDS[speed]
  if (multiplier === null) return

  const intervalMs = FAST_TICK_MS * multiplier
  fastTickCount = 0

  fastTickInterval = setInterval(() => {
    if (!engine) return

    engine.fastTick()
    fastTickCount++

    // Run slow tick every FAST_TICKS_PER_SLOW fast ticks
    if (fastTickCount % FAST_TICKS_PER_SLOW === 0) {
      engine.slowTick()
      // Post full snapshot after every slow tick
      postMessage({ type: 'SNAPSHOT', snapshot: engine.serializeSnapshot() })
    } else {
      // Post lightweight caravan-only update on fast ticks (for smooth animation)
      const snap = engine.serializeSnapshot()
      postMessage({ type: 'CARAVAN_UPDATE', caravans: snap.caravans })
    }
  }, intervalMs)
}

async function handleNewGame(seed?: string): Promise<void> {
  const mapSeed = seed ?? String(Date.now())
  const map = generateMap(mapSeed)
  const world = buildWorldState(map)

  engine = new SimulationEngine(world)
  await saveToIndexedDB(world)

  // Send terrain colors once — they're static and don't need to be in every snapshot
  const terrainColors = flattenTerrainColors(map.terrain)
  postMessage({ type: 'MAP_READY', terrainColors, mapWidth: map.config.width, mapHeight: map.config.height })

  postMessage({ type: 'SNAPSHOT', snapshot: engine.serializeSnapshot() })
  postMessage({ type: 'READY' })

  startTicks(currentSpeed)
}

async function handleLoad(): Promise<void> {
  const saved = await loadFromIndexedDB()

  if (!saved) {
    // No save found — start a new game
    await handleNewGame()
    return
  }

  // Calculate how many slow ticks were missed since last save
  const elapsedMs = Date.now() - saved.lastSavedAt
  const missedSlowTicks = Math.floor(elapsedMs / FAST_TICK_MS / FAST_TICKS_PER_SLOW)
  const cappedMissedTicks = Math.min(missedSlowTicks, MAX_OFFLINE_SLOW_TICKS)

  engine = new SimulationEngine(saved)

  // Regenerate terrain image from seed (terrain is deterministic)
  const terrainGrid = generateTerrain({ ...DEFAULT_MAP_CONFIG, seed: saved.seed, width: saved.mapWidth, height: saved.mapHeight })
  const terrainColors = flattenTerrainColors(terrainGrid)
  postMessage({ type: 'MAP_READY', terrainColors, mapWidth: saved.mapWidth, mapHeight: saved.mapHeight })

  if (cappedMissedTicks > 0) {
    engine.idleCatchup(cappedMissedTicks)
    postMessage({
      type: 'IDLE_SUMMARY',
      missedSlowTicks: cappedMissedTicks,
      events: engine.serializeSnapshot().recentEvents,
    })
  }

  postMessage({ type: 'SNAPSHOT', snapshot: engine.serializeSnapshot() })
  postMessage({ type: 'READY' })

  startTicks(currentSpeed)
}

// ─── Message handler ───────────────────────────────────────────────────────

self.onmessage = async (event: MessageEvent<SimCommand>) => {
  const cmd = event.data

  try {
    switch (cmd.type) {
      case 'NEW_GAME':
        stopTicks()
        await handleNewGame(cmd.seed)
        break

      case 'LOAD_SAVE':
        stopTicks()
        await handleLoad()
        break

      case 'SET_SPEED':
        currentSpeed = cmd.speed
        startTicks(currentSpeed)
        break

      default:
        if (engine) {
          engine.applyCommand(cmd)
          // Post updated snapshot after any command
          postMessage({ type: 'SNAPSHOT', snapshot: engine.serializeSnapshot() })
        }
        break
    }
  } catch (err) {
    console.error('[worker] Error handling command:', cmd.type, err)
    postMessage({ type: 'ERROR', message: String(err) })
  }
}

// Signal that the worker is ready to receive commands
postMessage({ type: 'READY' })
