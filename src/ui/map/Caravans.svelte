<script lang="ts">
  import type { CaravanSnapshot, SettlementSnapshot } from '../../simulation/types'

  interface Props {
    caravans: Record<string, CaravanSnapshot>
    settlements: Record<string, SettlementSnapshot>
    zoom: number
    animating: boolean  // disable CSS transitions at high speed
  }
  let { caravans, settlements, zoom, animating }: Props = $props()

  // Interpolate position along the from→to segment by progress
  function caravanPos(c: CaravanSnapshot) {
    const from = settlements[c.fromId]
    const to   = settlements[c.toId]
    if (!from || !to) return null
    return {
      x: from.position.x + (to.position.x - from.position.x) * c.progress,
      y: from.position.y + (to.position.y - from.position.y) * c.progress,
    }
  }

  const r = $derived(0.9 / zoom)
</script>

{#each Object.values(caravans) as c (c.id)}
  {@const pos = caravanPos(c)}
  {#if pos}
    <circle
      cx={pos.x}
      cy={pos.y}
      r={r}
      fill={c.isPlayerOwned ? '#f0b830' : '#e8d5a3'}
      stroke="#1a1410"
      stroke-width={0.15 / zoom}
      style={animating ? 'transition: cx 0.45s linear, cy 0.45s linear' : ''}
    />
  {/if}
{/each}
