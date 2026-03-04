<script lang="ts">
  import type { SettlementSnapshot, GoodId } from '../../simulation/types'
  import { GOODS } from '../../simulation/goods'

  interface Props {
    settlements: Record<string, SettlementSnapshot>
    good: GoodId
    zoom: number
  }
  let { settlements, good, zoom }: Props = $props()

  const basePrice = $derived(GOODS[good]?.basePrice ?? 1)

  // Compute price range across all settlements that have this good
  const priceRange = $derived(() => {
    const prices = Object.values(settlements)
      .map(s => s.prices[good] ?? 0)
      .filter(p => p > 0)
    if (prices.length === 0) return { min: 0, max: 1 }
    return { min: Math.min(...prices), max: Math.max(...prices) }
  })

  // Map a price to a color:  low (cheap/buy) = blue → mid = grey → high (expensive/sell) = red
  function priceColor(price: number, min: number, max: number): string {
    if (max <= min) return 'rgba(150,150,150,0.5)'
    const t = (price - min) / (max - min)  // 0 = cheapest, 1 = most expensive
    if (t < 0.5) {
      // blue → grey
      const u = t * 2
      const r = Math.round(58 + u * 80)
      const g = Math.round(107 + u * 20)
      const b = Math.round(139 - u * 20)
      return `rgba(${r},${g},${b},0.65)`
    } else {
      // grey → red
      const u = (t - 0.5) * 2
      const r = Math.round(138 + u * 65)
      const g = Math.round(127 - u * 69)
      const b = Math.round(119 - u * 61)
      return `rgba(${r},${g},${b},0.65)`
    }
  }

  const range = $derived(priceRange())
  const r = $derived(3.5 / zoom)
</script>

{#each Object.values(settlements) as s}
  {@const price = s.prices[good] ?? 0}
  {#if price > 0}
    <circle
      cx={s.position.x}
      cy={s.position.y}
      r={r}
      fill={priceColor(price, range.min, range.max)}
      stroke="rgba(255,255,255,0.25)"
      stroke-width={0.3 / zoom}
    />
    <text
      x={s.position.x}
      y={s.position.y + 0.4 / zoom}
      text-anchor="middle"
      font-size={1.0 / zoom}
      fill="#e8d5a3"
      pointer-events="none"
    >{price.toFixed(0)}g</text>
  {/if}
{/each}

<!-- Legend bar (positioned in map-space top-left, will be fixed at screen edge) -->
<!-- Handled in WorldMap.svelte as an HTML overlay instead -->
