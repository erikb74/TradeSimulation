<script lang="ts">
  import type { SettlementSnapshot, SettlementType } from '../../simulation/types'

  interface Props {
    settlements: Record<string, SettlementSnapshot>
    selectedId: string | null
    zoom: number
    onSelect: (id: string) => void
  }
  let { settlements, selectedId, zoom, onSelect }: Props = $props()

  // Scale icons inversely with zoom so they stay a consistent screen size
  function iconSize(type: SettlementType, pop: number): number {
    const base = type === 'city' ? 1.6 : type === 'town' || type === 'port' ? 1.2 : 0.9
    const popBonus = Math.log10(Math.max(pop, 100)) / 4
    return base + popBonus
  }

  function iconColor(type: SettlementType): string {
    switch (type) {
      case 'port':      return '#3a6b8b'
      case 'fortress':  return '#7a5a3a'
      case 'monastery': return '#6b3a8b'
      case 'city':      return '#c8961e'
      default:          return '#9c8a6a'
    }
  }

  // Label visible only when zoomed in enough
  function showLabel(z: number): boolean { return z >= 2 }
</script>

{#each Object.values(settlements) as s}
  {@const r = iconSize(s.type, s.population) / zoom}
  {@const selected = selectedId === s.id}
  {@const color = iconColor(s.type)}

  <g
    transform="translate({s.position.x},{s.position.y})"
    style="cursor:pointer"
    role="button"
    tabindex="0"
    aria-label={s.name}
    onclick={() => onSelect(s.id)}
    onkeydown={e => e.key === 'Enter' && onSelect(s.id)}
  >
    <!-- Outer ring (selection highlight) -->
    {#if selected}
      <circle r={r * 1.8} fill="none" stroke="#f0b830" stroke-width={0.4 / zoom} opacity="0.9" />
    {/if}

    <!-- Settlement icon by type -->
    {#if s.type === 'fortress'}
      <!-- Diamond for fortress -->
      <polygon
        points="0,{-r} {r},0 0,{r} {-r},0"
        fill={color}
        stroke={selected ? '#f0b830' : '#1a1410'}
        stroke-width={0.25 / zoom}
      />
    {:else if s.type === 'monastery'}
      <!-- Cross for monastery -->
      <rect x={-r*0.25} y={-r} width={r*0.5} height={r*2} fill={color} />
      <rect x={-r} y={-r*0.2} width={r*2} height={r*0.4} fill={color} />
    {:else}
      <!-- Circle for all others -->
      <circle
        r={r}
        fill={color}
        stroke={selected ? '#f0b830' : '#1a1410'}
        stroke-width={0.25 / zoom}
      />
      <!-- Port anchor dot -->
      {#if s.type === 'port'}
        <circle r={r * 0.4} fill="#e8d5a3" opacity="0.6" />
      {/if}
    {/if}

    <!-- Name label at higher zoom levels -->
    {#if showLabel(zoom)}
      <text
        y={r * 2.2}
        text-anchor="middle"
        font-size={1.2 / zoom}
        fill="#e8d5a3"
        stroke="#1a1410"
        stroke-width={0.3 / zoom}
        paint-order="stroke"
        pointer-events="none"
      >{s.name}</text>
    {/if}
  </g>
{/each}
