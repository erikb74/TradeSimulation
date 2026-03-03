import type { ResourceNode, MapTile, Settlement } from '../simulation/types'
import { seededRandom, hashSeed, distance } from '../lib/math'
import { generateId } from '../lib/ids'

/**
 * Place resource nodes across the map.
 * Nodes are placed near terrain-appropriate areas and linked to the nearest settlement.
 */
export function placeResourceNodes(
  grid: MapTile[][],
  settlements: Settlement[],
  seed: string,
): ResourceNode[] {
  const rng = seededRandom(hashSeed(seed + '_resources'))
  const height = grid.length
  const width = grid[0]?.length ?? 0
  const nodes: ResourceNode[] = []

  // Helper: find nearest settlement to a position
  function nearestSettlement(x: number, y: number): string {
    let minDist = Infinity
    let nearestId = settlements[0]?.id ?? ''
    for (const s of settlements) {
      const d = distance(x, y, s.position.x, s.position.y)
      if (d < minDist) { minDist = d; nearestId = s.id }
    }
    return nearestId
  }

  // Iron deposits: place in hill/mountain tiles
  const hillTiles = grid.flat().filter(t => (t.terrain === 'hills' || t.terrain === 'mountains'))
  const ironSources = hillTiles.sort(() => rng() - 0.5).slice(0, Math.max(3, Math.floor(settlements.length / 3)))
  for (const tile of ironSources) {
    const nearestId = nearestSettlement(tile.x, tile.y)
    const node: ResourceNode = {
      id: generateId('res_'),
      type: 'iron_deposit',
      position: { x: tile.x, y: tile.y },
      richness: 0.8 + rng() * 1.2,
      nearestSettlementId: nearestId,
    }
    nodes.push(node)
    // Link to nearest settlement
    const s = settlements.find(s => s.id === nearestId)
    if (s) s.resourceNodeIds.push(node.id)
  }

  // Ancient forests: deep forest tiles far from settlements
  const deepForest = grid.flat().filter(t => t.terrain === 'forest' && t.moisture > 0.6)
  const forestSources = deepForest.sort(() => rng() - 0.5).slice(0, Math.max(2, Math.floor(settlements.length / 4)))
  for (const tile of forestSources) {
    const nearestId = nearestSettlement(tile.x, tile.y)
    const node: ResourceNode = {
      id: generateId('res_'),
      type: 'ancient_forest',
      position: { x: tile.x, y: tile.y },
      richness: 1.0 + rng() * 0.8,
      nearestSettlementId: nearestId,
    }
    nodes.push(node)
    const s = settlements.find(s => s.id === nearestId)
    if (s) s.resourceNodeIds.push(node.id)
  }

  // Fertile plains: high-moisture plain tiles
  const fertilePlains = grid.flat().filter(t => t.terrain === 'plains' && t.moisture > 0.5)
  const farmSources = fertilePlains.sort(() => rng() - 0.5).slice(0, Math.max(3, Math.floor(settlements.length / 3)))
  for (const tile of farmSources) {
    const nearestId = nearestSettlement(tile.x, tile.y)
    const node: ResourceNode = {
      id: generateId('res_'),
      type: 'fertile_plains',
      position: { x: tile.x, y: tile.y },
      richness: 0.9 + rng() * 0.8,
      nearestSettlementId: nearestId,
    }
    nodes.push(node)
    const s = settlements.find(s => s.id === nearestId)
    if (s) s.resourceNodeIds.push(node.id)
  }

  return nodes
}
