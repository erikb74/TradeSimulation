<script lang="ts">
  import type { Road, SettlementSnapshot } from '../../simulation/types'

  interface Props {
    roads: Road[]
    settlements: Record<string, SettlementSnapshot>
  }
  let { roads, settlements }: Props = $props()

  const ROAD_STROKE: Record<string, { color: string; width: number; dasharray?: string }> = {
    stone:  { color: '#c8b898', width: 0.5 },
    gravel: { color: '#a09070', width: 0.35 },
    dirt:   { color: '#7a6550', width: 0.25, dasharray: '1,0.8' },
  }
</script>

{#each roads as road}
  {@const from = settlements[road.fromId]}
  {@const to   = settlements[road.toId]}
  {#if from && to}
    {@const style = ROAD_STROKE[road.quality] ?? ROAD_STROKE.gravel}
    <line
      x1={from.position.x} y1={from.position.y}
      x2={to.position.x}   y2={to.position.y}
      stroke={style.color}
      stroke-width={style.width}
      stroke-dasharray={style.dasharray ?? 'none'}
      opacity="0.75"
    />
  {/if}
{/each}
