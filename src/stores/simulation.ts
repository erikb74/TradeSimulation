import { writable } from 'svelte/store'
import type { StateSnapshot, SimCommand, WorkerMessage } from '../simulation/types'

// ── Worker instance ──────────────────────────────────────────────────────────
let worker: Worker | null = null

// ── Stores ───────────────────────────────────────────────────────────────────

/** The latest state snapshot from the simulation worker. */
export const worldSnapshot = writable<StateSnapshot | null>(null)

/** Whether the worker has initialized and a world is running. */
export const workerReady = writable<boolean>(false)

/** Offline summary data (shown in modal on load if idle > 0). */
export const idleSummary = writable<{ missedSlowTicks: number; events: StateSnapshot['events'] } | null>(null)

/** Last worker error message, if any. */
export const workerError = writable<string | null>(null)

/**
 * Terrain color data — sent once from worker on MAP_READY.
 * Flat row-major array of CSS color strings; index = y * mapWidth + x.
 * Null until the first MAP_READY is received.
 */
export const terrainData = writable<{ colors: string[]; width: number; height: number } | null>(null)

// ── Worker communication ─────────────────────────────────────────────────────

/**
 * Send a command to the simulation worker.
 * Safe to call before worker is fully ready — commands queue naturally.
 */
export function workerSend(cmd: SimCommand): void {
  if (!worker) {
    console.warn('[sim] Worker not initialized, dropping command:', cmd.type)
    return
  }
  worker.postMessage(cmd)
}

/**
 * Initialize the Web Worker and wire up message handling.
 * Call once on app startup.
 */
export function initWorker(): void {
  if (worker) return

  worker = new Worker(new URL('../simulation/worker.ts', import.meta.url), { type: 'module' })

  worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
    const msg = event.data
    switch (msg.type) {
      case 'SNAPSHOT':
        worldSnapshot.set(msg.snapshot)
        break

      case 'CARAVAN_UPDATE':
        // Lightweight update: only caravans changed (fast tick animation)
        worldSnapshot.update(snap => {
          if (!snap) return snap
          return { ...snap, caravans: msg.caravans }
        })
        break

      case 'MAP_READY':
        terrainData.set({ colors: msg.terrainColors, width: msg.mapWidth, height: msg.mapHeight })
        break

      case 'IDLE_SUMMARY':
        idleSummary.set({ missedSlowTicks: msg.missedSlowTicks, events: msg.events })
        break

      case 'READY':
        workerReady.set(true)
        break

      case 'ERROR':
        workerError.set(msg.message)
        console.error('[worker error]', msg.message)
        break
    }
  }

  worker.onerror = (err) => {
    workerError.set(err.message)
    console.error('[worker crash]', err)
  }

  // Immediately request load (will start new game if no save exists)
  worker.postMessage({ type: 'LOAD_SAVE' } satisfies SimCommand)
}
