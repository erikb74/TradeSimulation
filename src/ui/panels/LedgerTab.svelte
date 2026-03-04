<script lang="ts">
  import type { StateSnapshot, GoodId } from '../../simulation/types'
  import { GOODS, } from '../../simulation/goods'
  import { ALL_GOOD_IDS } from '../../simulation/types'
  import Sparkline from '../shared/Sparkline.svelte'

  interface Props {
    snapshot: StateSnapshot
  }
  let { snapshot }: Props = $props()

  const settlements = $derived(Object.values(snapshot.settlements))

  // Global price table: for each good, min/max/avg price across settlements
  const priceTable = $derived(() => {
    return ALL_GOOD_IDS.map(id => {
      const prices = settlements
        .map(s => s.prices[id])
        .filter((p): p is number => p !== undefined && p > 0)

      if (prices.length === 0) return null

      const min = Math.min(...prices)
      const max = Math.max(...prices)
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length
      const spread = max - min
      const base = GOODS[id].basePrice

      // Find cheapest and most expensive settlement
      const cheapestS = settlements.reduce((best, s) => {
        const p = s.prices[id] ?? Infinity
        return p < (best?.prices[id] ?? Infinity) ? s : best
      }, settlements[0])

      const expensiveS = settlements.reduce((best, s) => {
        const p = s.prices[id] ?? -Infinity
        return p > (best?.prices[id] ?? -Infinity) ? s : best
      }, settlements[0])

      return { id, min, max, avg, spread, base, cheapestS, expensiveS }
    }).filter(Boolean)
  })

  // Sort by spread descending (best arbitrage opportunities first)
  const sortedGoods = $derived(
    [...priceTable()].sort((a, b) => b!.spread - a!.spread)
  )

  // Economy-wide totals
  const totalGold = $derived(settlements.reduce((s, x) => s + x.treasury, 0) + snapshot.playerGold)
  const totalPop  = $derived(settlements.reduce((s, x) => s + x.population, 0))
  const totalCaravans = $derived(Object.keys(snapshot.caravans).length)
</script>

<div class="ledger-tab">
  <!-- Summary row -->
  <div class="economy-summary">
    <div class="econ-stat">
      <div class="es-label">Total Pop.</div>
      <div class="es-value">{totalPop.toLocaleString()}</div>
    </div>
    <div class="econ-stat">
      <div class="es-label">World Gold</div>
      <div class="es-value text-gold">{Math.floor(totalGold).toLocaleString()}g</div>
    </div>
    <div class="econ-stat">
      <div class="es-label">Caravans</div>
      <div class="es-value">{totalCaravans}</div>
    </div>
    <div class="econ-stat">
      <div class="es-label">Settlements</div>
      <div class="es-value">{settlements.length}</div>
    </div>
  </div>

  <!-- Price spread table (arbitrage opportunities) -->
  <div class="section-header">Price Spreads — Arbitrage Opportunities</div>

  <div class="spread-header-row">
    <span>Good</span>
    <span class="mono" style="text-align:right">Min</span>
    <span style="text-align:center">→</span>
    <span class="mono" style="text-align:right">Max</span>
    <span class="mono" style="text-align:right">Spread</span>
    <span>Cheapest</span>
    <span>Expensive</span>
  </div>

  <div class="spread-list">
    {#each sortedGoods as row}
      {#if row}
        <div class="spread-row">
          <span class="good-name">{GOODS[row.id].name}</span>
          <span class="mono text-trade" style="text-align:right">{row.min.toFixed(1)}g</span>
          <span class="arrow text-muted">→</span>
          <span class="mono text-shortage" style="text-align:right">{row.max.toFixed(1)}g</span>
          <span class="mono spread-val" class:spread-good={row.spread > row.base * 0.5} style="text-align:right">
            +{row.spread.toFixed(1)}g
          </span>
          <span class="settle-name text-muted" title={row.cheapestS?.name}>{row.cheapestS?.name?.slice(0, 10) ?? '—'}</span>
          <span class="settle-name text-muted" title={row.expensiveS?.name}>{row.expensiveS?.name?.slice(0, 10) ?? '—'}</span>
        </div>
      {/if}
    {/each}
  </div>

  <!-- Settlement population ranking -->
  <div class="section-header" style="margin-top: 10px">Population Ranking</div>
  <div class="pop-list">
    {#each [...settlements].sort((a, b) => b.population - a.population).slice(0, 8) as s}
      <div class="pop-row">
        <span class="pop-name">{s.name}</span>
        <span class="pop-type text-muted badge">{s.type}</span>
        <div class="pop-bar-track">
          <div class="pop-bar-fill" style="width:{(s.population / Math.max(...settlements.map(x => x.population))) * 100}%"></div>
        </div>
        <span class="pop-num mono">{s.population.toLocaleString()}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .ledger-tab { padding: 10px 12px; }

  /* Economy summary */
  .economy-summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    margin-bottom: 12px;
  }
  .econ-stat {
    background: var(--color-bg-raised);
    border: 1px solid var(--color-border);
    padding: 6px 8px;
    border-radius: 2px;
  }
  .es-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); }
  .es-value { font-size: 14px; font-variant-numeric: tabular-nums; margin-top: 2px; }

  .section-header {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
    padding: 4px 0 3px;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 4px;
  }

  /* Spread table */
  .spread-header-row,
  .spread-row {
    display: grid;
    grid-template-columns: 70px 38px 12px 38px 40px 1fr 1fr;
    gap: 3px;
    align-items: center;
    font-size: 10px;
    padding: 2px 0;
  }
  .spread-header-row {
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding-bottom: 3px;
    border-bottom: 1px solid rgba(61,48,32,0.5);
  }
  .spread-row { border-bottom: 1px solid rgba(61,48,32,0.25); }
  .spread-row:hover { background: rgba(255,255,255,0.02); }

  .good-name { font-size: 11px; }
  .arrow { text-align: center; }
  .settle-name {
    font-size: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .spread-val { color: var(--color-text-muted); }
  .spread-good { color: var(--color-surplus); font-weight: bold; }
  .text-trade { color: var(--color-trade); }
  .text-shortage { color: var(--color-shortage); }

  /* Population ranking */
  .pop-list { display: flex; flex-direction: column; gap: 2px; }
  .pop-row {
    display: grid;
    grid-template-columns: 1fr auto 80px 45px;
    gap: 6px;
    align-items: center;
    font-size: 11px;
    padding: 2px 0;
    border-bottom: 1px solid rgba(61,48,32,0.25);
  }
  .pop-name { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pop-type { font-size: 9px; }
  .pop-bar-track {
    height: 5px;
    background: rgba(255,255,255,0.08);
    border-radius: 2px;
    overflow: hidden;
  }
  .pop-bar-fill {
    height: 100%;
    background: var(--color-trade);
    border-radius: 2px;
  }
  .pop-num { text-align: right; font-size: 11px; }

  .badge {
    font-size: 9px;
    padding: 1px 4px;
    border: 1px solid var(--color-border);
    border-radius: 2px;
    text-transform: uppercase;
    color: var(--color-text-muted);
    white-space: nowrap;
  }
</style>
