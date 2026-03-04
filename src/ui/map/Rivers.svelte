<script lang="ts">
  import type { River } from '../../simulation/types'

  interface Props { rivers: River[] }
  let { rivers }: Props = $props()
</script>

{#each rivers as river, i}
  {#if river.points.length > 1}
    <polyline
      points={river.points.map(p => `${p.x},${p.y}`).join(' ')}
      fill="none"
      stroke="#3a6b8b"
      stroke-width="0.4"
      stroke-linecap="round"
      stroke-linejoin="round"
      opacity="0.8"
    />
  {/if}
{/each}
