<script lang="ts">
  import type { StateSnapshot, GoodId } from '../../simulation/types'
  import TerrainCanvas from './TerrainCanvas.svelte'
  import Rivers       from './Rivers.svelte'
  import Roads        from './Roads.svelte'
  import Settlements  from './Settlements.svelte'
  import TradeRoutes  from './TradeRoutes.svelte'
  import Caravans     from './Caravans.svelte'
  import PriceHeatmap from './PriceHeatmap.svelte'
  import { clamp } from '../../lib/math'

  interface Props {
    snapshot: StateSnapshot
    terrain: { colors: string[]; width: number; height: number } | null
    selectedId: string | null
    heatmapGood: GoodId | null
    gameSpeed: string
    onSelect: (id: string) => void
  }
  let { snapshot, terrain, selectedId, heatmapGood, gameSpeed, onSelect }: Props = $props()

  const mapW = $derived(snapshot.mapWidth)
  const mapH = $derived(snapshot.mapHeight)

  // ── View state (pan + zoom) ─────────────────────────────────────────────
  let zoom  = $state(1)
  let viewX = $state(0)
  let viewY = $state(0)

  const viewW  = $derived(mapW / zoom)
  const viewH  = $derived(mapH / zoom)
  const viewBox = $derived(`${viewX} ${viewY} ${viewW} ${viewH}`)

  function clampView() {
    viewX = clamp(viewX, 0, Math.max(0, mapW - viewW))
    viewY = clamp(viewY, 0, Math.max(0, mapH - viewH))
  }

  // ── Pan (drag) ──────────────────────────────────────────────────────────
  let dragging = $state(false)
  let dragOrigin = { mx: 0, my: 0, vx: 0, vy: 0 } // map coords at drag start

  let svgEl: SVGSVGElement

  function svgSize() {
    const rect = svgEl.getBoundingClientRect()
    return { w: rect.width, h: rect.height }
  }

  function screenToMap(clientX: number, clientY: number) {
    const rect = svgEl.getBoundingClientRect()
    return {
      x: viewX + (clientX - rect.left) / rect.width  * viewW,
      y: viewY + (clientY - rect.top)  / rect.height * viewH,
    }
  }

  function onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return
    dragging = true
    const m = screenToMap(e.clientX, e.clientY)
    dragOrigin = { mx: m.x, my: m.y, vx: viewX, vy: viewY }
    e.preventDefault()
  }

  function onMouseMove(e: MouseEvent) {
    if (!dragging) return
    const m = screenToMap(e.clientX, e.clientY)
    viewX = dragOrigin.vx - (m.x - dragOrigin.mx)
    viewY = dragOrigin.vy - (m.y - dragOrigin.my)
    clampView()
  }

  function onMouseUp() { dragging = false }

  // ── Zoom (wheel) ─────────────────────────────────────────────────────────
  function onWheel(e: WheelEvent) {
    e.preventDefault()
    const m = screenToMap(e.clientX, e.clientY)
    const factor = e.deltaY > 0 ? 0.82 : 1.22
    const newZoom = clamp(zoom * factor, 0.5, 14)
    const newViewW = mapW / newZoom
    const newViewH = mapH / newZoom
    // Keep cursor position fixed in map space
    const { w, h } = svgSize()
    const rect = svgEl.getBoundingClientRect()
    viewX = m.x - (e.clientX - rect.left) / rect.width  * newViewW
    viewY = m.y - (e.clientY - rect.top)  / rect.height * newViewH
    zoom  = newZoom
    clampView()
  }

  // ── Touch (pinch-to-zoom + pan) ──────────────────────────────────────────
  let lastTouches: Touch[] = []

  function onTouchStart(e: TouchEvent) {
    lastTouches = Array.from(e.touches)
  }

  function onTouchMove(e: TouchEvent) {
    e.preventDefault()
    const touches = Array.from(e.touches)

    if (touches.length === 1 && lastTouches.length === 1) {
      // Single-finger pan
      const dx = touches[0].clientX - lastTouches[0].clientX
      const dy = touches[0].clientY - lastTouches[0].clientY
      viewX -= (dx / svgEl.getBoundingClientRect().width)  * viewW
      viewY -= (dy / svgEl.getBoundingClientRect().height) * viewH
      clampView()
    } else if (touches.length === 2 && lastTouches.length === 2) {
      // Pinch zoom
      const prevDist = Math.hypot(
        lastTouches[0].clientX - lastTouches[1].clientX,
        lastTouches[0].clientY - lastTouches[1].clientY,
      )
      const currDist = Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY,
      )
      if (prevDist > 0) {
        const factor = currDist / prevDist
        const newZoom = clamp(zoom * factor, 0.5, 14)
        zoom = newZoom
        clampView()
      }
    }

    lastTouches = touches
  }

  // ── Reset view ───────────────────────────────────────────────────────────
  export function resetView() {
    zoom  = 1
    viewX = 0
    viewY = 0
  }

  // Disable caravan CSS transitions at high speed (they'd look jittery)
  const animating = $derived(gameSpeed === '1x' || gameSpeed === '2x')
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<svg
  bind:this={svgEl}
  {viewBox}
  style="width:100%; height:100%; cursor:{dragging ? 'grabbing' : 'grab'}; display:block"
  role="application"
  aria-label="World map"
  onmousedown={onMouseDown}
  onmousemove={onMouseMove}
  onmouseup={onMouseUp}
  onmouseleave={onMouseUp}
  onwheel={onWheel}
  ontouchstart={onTouchStart}
  ontouchmove={onTouchMove}
  ontouchend={() => { lastTouches = [] }}
>
  <!-- Layer 1: Terrain (baked canvas image — static) -->
  {#if terrain}
    <TerrainCanvas
      colors={terrain.colors}
      mapWidth={terrain.width}
      mapHeight={terrain.height}
    />
  {:else}
    <rect x={0} y={0} width={mapW} height={mapH} fill="#2a3a2a" />
  {/if}

  <!-- Layer 2: Rivers (static) -->
  <Rivers rivers={snapshot.rivers} />

  <!-- Layer 3: Roads (rarely change) -->
  <Roads roads={snapshot.roads} settlements={snapshot.settlements} />

  <!-- Layer 4: Active trade route lines (from live caravans) -->
  <TradeRoutes
    caravans={snapshot.caravans}
    settlements={snapshot.settlements}
    {zoom}
  />

  <!-- Layer 5: Price heatmap overlay (optional) -->
  {#if heatmapGood}
    <PriceHeatmap
      settlements={snapshot.settlements}
      good={heatmapGood}
      {zoom}
    />
  {/if}

  <!-- Layer 6: Settlement icons (clickable) -->
  <Settlements
    settlements={snapshot.settlements}
    {selectedId}
    {zoom}
    {onSelect}
  />

  <!-- Layer 7: Animated caravan dots (updates every fast tick) -->
  <Caravans
    caravans={snapshot.caravans}
    settlements={snapshot.settlements}
    {zoom}
    {animating}
  />
</svg>
