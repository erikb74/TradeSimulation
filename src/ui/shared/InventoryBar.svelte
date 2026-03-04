<script lang="ts">
  import type { GoodId } from '../../simulation/types'
  import { GOODS } from '../../simulation/goods'

  interface Props {
    goodId: GoodId
    stock: number
    price: number
    basePrice: number
    productionRate?: number   // units/day, optional
    consumptionRate?: number  // units/day, optional
    history?: number[]        // recent price history for sparkline
  }
  let { goodId, stock, price, basePrice, productionRate, consumptionRate, history }: Props = $props()

  const def = $derived(GOODS[goodId])

  // Days of supply remaining (if consuming but not producing enough)
  const daysOfSupply = $derived(() => {
    const net = (productionRate ?? 0) - (consumptionRate ?? 0)
    if (consumptionRate && consumptionRate > 0 && net < 0) {
      return stock / consumptionRate
    }
    return null
  })

  // Stock "fill" as a fraction — target = 10 days of consumption
  const targetStock = $derived(() => {
    const target = (consumptionRate ?? 1) * 10
    return Math.min(stock / Math.max(target, 1), 1)
  })

  // Color class based on fill level
  const barClass = $derived(() => {
    const fill = targetStock()
    if (fill < 0.25) return 'bar-shortage'
    if (fill < 0.5)  return 'bar-warning'
    if (fill > 1.5)  return 'bar-surplus'
    return 'bar-normal'
  })

  // Price deviation from base
  const priceRatio = $derived(price / basePrice)
  const priceClass = $derived(
    priceRatio > 1.5 ? 'price-high' :
    priceRatio < 0.7 ? 'price-low' :
    'price-normal'
  )

  // Category color
  const CATEGORY_COLORS: Record<string, string> = {
    staple_food:        'var(--color-surplus)',
    preserved_food:     '#6b8b5a',
    raw_material:       'var(--color-text-muted)',
    processed_material: '#7a7068',
    tool_weapon:        '#a09070',
    textile:            '#8b6b8b',
    luxury:             'var(--color-luxury)',
    service:            'var(--color-gold)',
  }
  const dotColor = $derived(CATEGORY_COLORS[def.category] ?? 'var(--color-text-muted)')

  // Sparkline path (SVG)
  const sparkPath = $derived(() => {
    if (!history || history.length < 2) return null
    const w = 40
    const h = 14
    const minP = Math.min(...history)
    const maxP = Math.max(...history)
    const range = maxP - minP || 1
    const pts = history.map((p, i) => {
      const x = (i / (history!.length - 1)) * w
      const y = h - ((p - minP) / range) * h
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    return `M${pts.join('L')}`
  })
</script>

<div class="inv-row">
  <!-- Good name with category dot -->
  <span class="good-dot" style="background:{dotColor}"></span>
  <span class="good-name">{def.name}</span>

  <!-- Stock bar -->
  <div class="bar-track" title="{stock.toFixed(1)} units">
    <div class="bar-fill {barClass()}" style="width:{(targetStock() * 100).toFixed(0)}%"></div>
  </div>

  <!-- Stock number -->
  <span class="stock-num mono">{stock >= 100 ? Math.floor(stock) : stock.toFixed(1)}</span>

  <!-- Sparkline -->
  {#if sparkPath()}
    <svg class="spark" viewBox="0 0 40 14" preserveAspectRatio="none">
      <path d={sparkPath()!} fill="none" stroke="var(--color-text-muted)" stroke-width="1.5" />
    </svg>
  {:else}
    <span class="spark-empty"></span>
  {/if}

  <!-- Price -->
  <span class="price {priceClass} mono">{price.toFixed(1)}g</span>

  <!-- Net flow indicator -->
  {#if productionRate !== undefined || consumptionRate !== undefined}
    {@const net = (productionRate ?? 0) - (consumptionRate ?? 0)}
    <span class="net-flow mono {net > 0 ? 'flow-pos' : net < 0 ? 'flow-neg' : 'flow-zero'}">
      {net >= 0 ? '+' : ''}{net.toFixed(1)}/d
    </span>
  {:else}
    <span class="net-flow"></span>
  {/if}
</div>

<style>
  .inv-row {
    display: grid;
    grid-template-columns: 6px 82px 1fr 42px 40px 36px 48px;
    align-items: center;
    gap: 4px;
    padding: 2px 0;
    border-bottom: 1px solid rgba(61, 48, 32, 0.35);
    font-size: 11px;
  }
  .inv-row:hover { background: rgba(255,255,255,0.03); }

  .good-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .good-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bar-track {
    height: 8px;
    background: rgba(255,255,255,0.08);
    border-radius: 2px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.3s ease;
    min-width: 2px;
  }

  .bar-shortage { background: var(--color-shortage); }
  .bar-warning  { background: var(--color-warning); }
  .bar-normal   { background: #4a6b50; }
  .bar-surplus  { background: var(--color-surplus); }

  .stock-num { text-align: right; color: var(--color-text-muted); }

  .spark {
    width: 40px;
    height: 14px;
    display: block;
  }
  .spark-empty { width: 40px; display: inline-block; }

  .price { text-align: right; }
  .price-normal { color: var(--color-text-muted); }
  .price-high   { color: var(--color-shortage); }
  .price-low    { color: var(--color-trade); }

  .net-flow     { text-align: right; font-size: 10px; }
  .flow-pos     { color: var(--color-surplus); }
  .flow-neg     { color: var(--color-shortage); }
  .flow-zero    { color: var(--color-text-muted); }
</style>
