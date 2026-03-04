<script lang="ts">
  import type { CaravanSnapshot, SettlementSnapshot, GoodId } from '../../simulation/types'

  interface Props {
    caravans: Record<string, CaravanSnapshot>
    settlements: Record<string, SettlementSnapshot>
    zoom: number
  }
  let { caravans, settlements, zoom }: Props = $props()

  // Color trade route lines by first good in cargo
  function routeColor(cargo: Partial<Record<GoodId, number>>): string {
    const first = Object.keys(cargo)[0] as GoodId | undefined
    if (!first) return '#3a6b8b'
    if (['grain','flour','bread','fish','salted_fish','meat'].includes(first)) return '#6b8b5a'
    if (['iron_ore','iron_bar','tools','iron_weapons','iron_armor'].includes(first)) return '#7a7068'
    if (['cloth','leather','clothing','boots','wool'].includes(first)) return '#8b6b8b'
    if (['wine','candles','medicine','ale'].includes(first)) return '#8b3a8b'
    return '#3a6b8b'
  }

  // Unique active routes (deduplicated by from→to endpoint pair)
  const uniqueRoutes = $derived(() => {
    const seen = new Set<string>()
    const routes: { fromId: string; toId: string; color: string }[] = []
    for (const c of Object.values(caravans)) {
      const key = [c.fromId, c.toId].sort().join('|')
      if (!seen.has(key)) {
        seen.add(key)
        routes.push({ fromId: c.fromId, toId: c.toId, color: routeColor(c.cargo) })
      }
    }
    return routes
  })
</script>

{#each uniqueRoutes() as route}
  {@const from = settlements[route.fromId]}
  {@const to   = settlements[route.toId]}
  {#if from && to}
    <line
      x1={from.position.x} y1={from.position.y}
      x2={to.position.x}   y2={to.position.y}
      stroke={route.color}
      stroke-width={0.6 / zoom}
      opacity="0.5"
      stroke-dasharray="{2/zoom},{1/zoom}"
    />
  {/if}
{/each}
