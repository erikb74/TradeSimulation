import type { WorldState } from './types'
import { openDB } from 'idb'

const DB_NAME = 'MedievalTradeSim'
const DB_VERSION = 1
const STORE_NAME = 'saves'
const AUTOSAVE_KEY = 'autosave'

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    },
  })
}

/**
 * Serialize WorldState to a JSON string.
 * All data is plain objects/arrays — safe to JSON.stringify directly.
 */
export function serializeWorld(world: WorldState): string {
  return JSON.stringify({ ...world, lastSavedAt: Date.now() })
}

/**
 * Deserialize WorldState from a JSON string.
 */
export function deserializeWorld(json: string): WorldState {
  const parsed = JSON.parse(json) as WorldState
  return parsed
}

/**
 * Save the world state to IndexedDB under the autosave key.
 */
export async function saveToIndexedDB(world: WorldState): Promise<void> {
  try {
    const db = await getDb()
    const serialized = serializeWorld(world)
    await db.put(STORE_NAME, serialized, AUTOSAVE_KEY)
  } catch (err) {
    console.error('[save] Failed to write to IndexedDB:', err)
    // Fallback: try localStorage (limited to ~5MB but better than losing progress)
    try {
      localStorage.setItem(AUTOSAVE_KEY, serializeWorld(world))
    } catch {
      // Both failed — nothing we can do without alerting the user
    }
  }
}

/**
 * Load the world state from IndexedDB.
 * Returns null if no save exists.
 */
export async function loadFromIndexedDB(): Promise<WorldState | null> {
  try {
    const db = await getDb()
    const json = await db.get(STORE_NAME, AUTOSAVE_KEY) as string | undefined
    if (!json) {
      // Try localStorage fallback
      const local = localStorage.getItem(AUTOSAVE_KEY)
      return local ? deserializeWorld(local) : null
    }
    return deserializeWorld(json)
  } catch (err) {
    console.error('[save] Failed to load from IndexedDB:', err)
    return null
  }
}

/**
 * Delete the autosave (used on prestige/new game).
 */
export async function deleteSave(): Promise<void> {
  try {
    const db = await getDb()
    await db.delete(STORE_NAME, AUTOSAVE_KEY)
    localStorage.removeItem(AUTOSAVE_KEY)
  } catch {
    // Ignore errors on delete
  }
}
