<script lang="ts">
  import { onMount } from 'svelte'

  interface Props {
    colors: string[]
    mapWidth: number
    mapHeight: number
  }
  let { colors, mapWidth, mapHeight }: Props = $props()

  let imageHref = $state('')

  onMount(() => {
    const canvas = document.createElement('canvas')
    canvas.width = mapWidth
    canvas.height = mapHeight
    const ctx = canvas.getContext('2d')!

    // Draw each tile as a 1×1 pixel; canvas pixel = map unit
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        ctx.fillStyle = colors[y * mapWidth + x] ?? '#3a6b8b'
        ctx.fillRect(x, y, 1, 1)
      }
    }

    // Export as PNG data URL and use as an SVG <image>
    imageHref = canvas.toDataURL('image/png')
  })
</script>

{#if imageHref}
  <!-- image-rendering: pixelated keeps tiles crisp when zoomed in -->
  <image
    href={imageHref}
    x={0} y={0}
    width={mapWidth} height={mapHeight}
    style="image-rendering: pixelated"
  />
{:else}
  <!-- Placeholder while canvas bakes -->
  <rect x={0} y={0} width={mapWidth} height={mapHeight} fill="#1a2e1a" />
{/if}
