import type { Road, Settlement, RoadQuality } from '../simulation/types'
import { distance } from '../lib/math'

interface Edge {
  from: number   // index into settlements array
  to: number
  dist: number
}

/**
 * Minimal Delaunay-approximation: for each settlement, connect to its
 * nearest neighbors (within a radius cap). This is fast and produces
 * a good-enough triangulation without a full Bowyer-Watson implementation.
 */
function nearestNeighborEdges(settlements: Settlement[], maxNeighbors: number = 5): Edge[] {
  const n = settlements.length
  const edges: Edge[] = []
  const seen = new Set<string>()

  for (let i = 0; i < n; i++) {
    // Distance to all others
    const dists = settlements
      .map((s, j) => ({ j, dist: distance(settlements[i].position.x, settlements[i].position.y, s.position.x, s.position.y) }))
      .filter(d => d.j !== i)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, maxNeighbors)

    for (const { j, dist } of dists) {
      const key = [Math.min(i, j), Math.max(i, j)].join(',')
      if (seen.has(key)) continue
      seen.add(key)
      edges.push({ from: i, to: j, dist })
    }
  }

  return edges
}

/**
 * Kruskal's algorithm: minimum spanning tree over a set of edges.
 * Guarantees all settlements are connected with minimum total road length.
 */
function minimumSpanningTree(n: number, edges: Edge[]): Edge[] {
  const sorted = [...edges].sort((a, b) => a.dist - b.dist)
  const parent = Array.from({ length: n }, (_, i) => i)

  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]
      x = parent[x]
    }
    return x
  }

  function union(x: number, y: number): boolean {
    const px = find(x)
    const py = find(y)
    if (px === py) return false
    parent[px] = py
    return true
  }

  const mst: Edge[] = []
  for (const edge of sorted) {
    if (union(edge.from, edge.to)) {
      mst.push(edge)
      if (mst.length === n - 1) break
    }
  }

  return mst
}

/**
 * Determine road quality based on settlement types and distance.
 * Larger/more important connections get better roads.
 */
function classifyRoadQuality(from: Settlement, to: Settlement, dist: number): RoadQuality {
  const important = ['city', 'town', 'port']
  const bothImportant = important.includes(from.type) && important.includes(to.type)
  const eitherImportant = important.includes(from.type) || important.includes(to.type)

  const mountainTerrain = from.terrain === 'mountains' || to.terrain === 'mountains'

  if (mountainTerrain) return 'dirt'
  if (bothImportant && dist < 30) return 'stone'
  if (eitherImportant) return 'gravel'
  return 'dirt'
}

/**
 * Generate the full road network for all settlements.
 * Uses MST for connectivity + extra edges between major settlements.
 */
export function buildRoads(settlements: Settlement[]): Road[] {
  if (settlements.length < 2) return []

  const allEdges = nearestNeighborEdges(settlements, 5)
  const mstEdges = minimumSpanningTree(settlements.length, allEdges)

  // Add some extra connections between nearby major settlements (not just MST)
  const extraEdges: Edge[] = allEdges.filter(e => {
    const fromS = settlements[e.from]
    const toS = settlements[e.to]
    const onMst = mstEdges.some(m =>
      (m.from === e.from && m.to === e.to) || (m.from === e.to && m.to === e.from)
    )
    if (onMst) return false
    // Add extra road if both are large and relatively close
    const bothMajor = ['city', 'town', 'port'].includes(fromS.type) && ['city', 'town', 'port'].includes(toS.type)
    return bothMajor && e.dist < 25
  })

  const usedEdges = [...mstEdges, ...extraEdges]

  return usedEdges.map(e => {
    const fromS = settlements[e.from]
    const toS = settlements[e.to]
    return {
      fromId: fromS.id,
      toId:   toS.id,
      quality: classifyRoadQuality(fromS, toS, e.dist),
      length: e.dist,
    }
  })
}
