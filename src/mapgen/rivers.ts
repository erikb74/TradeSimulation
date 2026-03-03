import type { MapTile, River } from '../simulation/types'
import { seededRandom, hashSeed } from '../lib/math'
import { isLand, getNeighbors } from './terrain'

/**
 * Carve rivers into the terrain grid.
 * Each river starts from a high-elevation source and follows steepest descent to water.
 */
export function carveRivers(grid: MapTile[][], seed: string, count: number = 5): River[] {
  const rng = seededRandom(hashSeed(seed + '_rivers'))
  const height = grid.length
  const width = grid[0]?.length ?? 0
  const rivers: River[] = []

  // Find candidate source tiles: high elevation, land, away from edges
  const candidates: MapTile[] = []
  for (let y = 5; y < height - 5; y++) {
    for (let x = 5; x < width - 5; x++) {
      const tile = grid[y][x]
      if (tile.elevation > 0.65 && isLand(tile)) {
        candidates.push(tile)
      }
    }
  }

  // Shuffle candidates and pick source tiles spread across the map
  const sources: MapTile[] = []
  const usedSources = new Set<string>()
  const shuffled = [...candidates].sort(() => rng() - 0.5)

  for (const candidate of shuffled) {
    if (sources.length >= count) break
    // Enforce minimum spacing between sources
    const tooClose = sources.some(s => Math.abs(s.x - candidate.x) + Math.abs(s.y - candidate.y) < 15)
    if (!tooClose) {
      sources.push(candidate)
    }
  }

  for (const source of sources) {
    const points: River['points'] = []
    const visited = new Set<string>()
    let current = source

    // Follow steepest descent; cap at 200 steps (prevents infinite loops)
    for (let step = 0; step < 200; step++) {
      const key = `${current.x},${current.y}`
      if (visited.has(key)) break
      visited.add(key)

      points.push({ x: current.x, y: current.y })

      // Mark tile as river-adjacent
      current.riverAdjacent = true
      getNeighbors(grid, current.x, current.y).forEach(n => { n.riverAdjacent = true })

      // Reached water — river terminates
      if (current.terrain === 'water') break

      // Find lowest neighbor
      const neighbors = getNeighbors(grid, current.x, current.y)
      const lowest = neighbors.reduce((min, n) => n.elevation < min.elevation ? n : min, neighbors[0])

      if (!lowest || lowest.elevation >= current.elevation) {
        // At a local minimum (lake) — done
        break
      }

      current = lowest
    }

    if (points.length > 3) {
      rivers.push({ points })
    }
  }

  return rivers
}
