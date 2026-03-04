<script lang="ts">
  interface Props {
    values: number[]
    width?: number
    height?: number
    color?: string
    fillColor?: string
  }
  let { values, width = 60, height = 20, color = 'var(--color-text-muted)', fillColor }: Props = $props()

  const path = $derived(() => {
    if (values.length < 2) return { line: null, area: null }
    const minV = Math.min(...values)
    const maxV = Math.max(...values)
    const range = maxV - minV || 1

    const pts = values.map((v, i) => ({
      x: (i / (values.length - 1)) * width,
      y: height - ((v - minV) / range) * height,
    }))

    const line = `M${pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L')}`
    const area = fillColor
      ? `${line}L${width},${height}L0,${height}Z`
      : null

    return { line, area }
  })

  const { line, area } = $derived(path())
</script>

{#if line}
  <svg viewBox="0 0 {width} {height}" style="width:{width}px; height:{height}px; display:block; overflow:visible">
    {#if area && fillColor}
      <path d={area} fill={fillColor} opacity="0.2" />
    {/if}
    <path d={line} fill="none" stroke={color} stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
  </svg>
{/if}
