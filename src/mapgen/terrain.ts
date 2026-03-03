import type { TerrainType, MapTile } from '../simulation/types'
import { createSeededNoise, fractalNoise } from './noise'

export interface MapConfig {
  width: number
  height: number
  seed: string
  settlementCount: number
  seaLevel: number       // 0–1; tiles below this elevation are water
}

export const DEFAULT_MAP_CONFIG: MapConfig = {
  width: 120,
  height: 80,
  seed: 'medieval',
  settlementCount: 16,
  seaLevel: 0.35,
}

/**
 * Classify terrain from elevation and moisture.
 */
export function classifyTerrain(elevation: number, moisture: number, seaLevel: number): TerrainType {
  if (elevation < seaLevel) return 'water'
  if (elevation < seaLevel + 0.04) return 'coast'

  if (elevation > 0.75) return 'mountains'
  if (elevation > 0.58) return 'hills'

  if (moisture > 0.65) return 'forest'
  if (moisture < 0.25 && elevation < 0.5) return 'plains' // dry plains
  if (moisture > 0.80 && elevation < 0.45) return 'marsh'

  return 'plains'
}

/**
 * Get the display color for a terrain type (used for SVG map rendering).
 */
export const TERRAIN_COLORS: Record<TerrainType, string> = {
  plains:    '#8fa876',
  forest:    '#4a6741',
  hills:     '#9b8a6e',
  mountains: '#7a7068',
  marsh:     '#5c7a6e',
  coast:     '#c4b07a',
  water:     '#3a6b8b',
}

/**
 * Generate the full terrain grid.
 * Returns a 2D array indexed [y][x].
 */
export function generateTerrain(config: MapConfig): MapTile[][] {
  const { width, height, seed, seaLevel } = config

  // Three independent noise functions for elevation, moisture, temperature
  const elevNoise  = createSeededNoise(seed, 0)
  const moistNoise = createSeededNoise(seed, 1000)
  const tempNoise  = createSeededNoise(seed, 2000)

  // Scale factors — smaller = more zoomed-in / fewer terrain features
  const elevScale  = 0.025
  const moistScale = 0.035

  const grid: MapTile[][] = []

  for (let y = 0; y < height; y++) {
    grid[y] = []
    for (let x = 0; x < width; x++) {
      // Fractal elevation — 4 octaves for natural-looking ridges
      let elevation = fractalNoise(elevNoise, x, y, 4, 0.5, elevScale)

      // Push edges of map toward water (island/continent feel)
      const edgeX = Math.min(x, width - x) / (width / 2)
      const edgeY = Math.min(y, height - y) / (height / 2)
      const edgeFactor = Math.pow(Math.min(edgeX, edgeY), 0.7)
      elevation = elevation * edgeFactor

      const moisture     = fractalNoise(moistNoise, x, y, 3, 0.6, moistScale)
      // Temperature: linear gradient north(cold)→south(warm) + noise
      const temperature  = (y / height) * 0.6 + fractalNoise(tempNoise, x, y, 2, 0.5, 0.04) * 0.4

      const terrain = classifyTerrain(elevation, moisture, seaLevel)

      grid[y][x] = {
        x, y, terrain, elevation, moisture, temperature,
        riverAdjacent: false,  // filled in by river carving pass
      }
    }
  }

  return grid
}

/**
 * Check if a tile is land (not water).
 */
export function isLand(tile: MapTile): boolean {
  return tile.terrain !== 'water'
}

/**
 * Get neighbors of a tile (4-directional).
 */
export function getNeighbors(grid: MapTile[][], x: number, y: number): MapTile[] {
  const neighbors: MapTile[] = []
  const deltas = [[-1,0],[1,0],[0,-1],[0,1]]
  for (const [dx, dy] of deltas) {
    const nx = x + dx
    const ny = y + dy
    if (ny >= 0 && ny < grid.length && nx >= 0 && nx < grid[ny].length) {
      neighbors.push(grid[ny][nx])
    }
  }
  return neighbors
}
