<script lang="ts">
  import type { SettlementSnapshot, GoodId } from '../../simulation/types'
  import { GOODS } from '../../simulation/goods'
  import { ALL_GOOD_IDS } from '../../simulation/types'
  import InventoryBar from '../shared/InventoryBar.svelte'

  interface Props {
    settlement: SettlementSnapshot
    caravansHere: Array<{ id: string; merchantId: string; fromId: string; toId: string; cargo: Partial<Record<GoodId, number>>; progress: number; returning: boolean; isPlayerOwned: boolean }>
    settlementNames: Record<string, string>
  }
  let { settlement: s, caravansHere, settlementNames }: Props = $props()

  // Only show goods that have non-trivial stock or production/consumption
  const activeGoods = $derived(
    ALL_GOOD_IDS.filter(id => {
      const stock = s.inventory[id] ?? 0
      const prod  = s.productionRates[id] ?? 0
      const cons  = s.consumptionRates[id] ?? 0
      return stock > 0.05 || prod > 0.001 || cons > 0.001
    })
  )

  // Sort: food first, then by stock descending
  const sortedGoods = $derived(
    [...activeGoods].sort((a, b) => {
      const catA = GOODS[a].category
      const catB = GOODS[b].category
      const foodCats = ['staple_food', 'preserved_food']
      if (foodCats.includes(catA) && !foodCats.includes(catB)) return -1
      if (!foodCats.includes(catA) && foodCats.includes(catB)) return 1
      return (s.inventory[b] ?? 0) - (s.inventory[a] ?? 0)
    })
  )

  // Incoming/outgoing caravan summary for this settlement
  const incoming = $derived(caravansHere.filter(c => c.toId === s.id && !c.returning))
  const outgoing = $derived(caravansHere.filter(c => c.fromId === s.id))

  function cargoSummary(cargo: Partial<Record<GoodId, number>>): string {
    const entries = Object.entries(cargo).filter(([, v]) => v > 0)
    if (entries.length === 0) return 'empty'
    return entries.map(([id, qty]) => `${GOODS[id as GoodId]?.name ?? id} ×${qty.toFixed(0)}`).join(', ')
  }

  function progressBar(p: number): string {
    return `${(p * 100).toFixed(0)}%`
  }
</script>

<div class="settlement-tab">
  <!-- Header stats -->
  <div class="stat-grid">
    <div class="stat">
      <div class="stat-label">Population</div>
      <div class="stat-value">{s.population.toLocaleString()} <span class="text-muted">/ {s.populationCap.toLocaleString()}</span></div>
    </div>
    <div class="stat">
      <div class="stat-label">Treasury</div>
      <div class="stat-value text-gold">{Math.floor(s.treasury).toLocaleString()}g</div>
    </div>
    <div class="stat">
      <div class="stat-label">Tariff</div>
      <div class="stat-value">{(s.tariffRate * 100).toFixed(0)}%</div>
    </div>
    <div class="stat">
      <div class="stat-label">Terrain</div>
      <div class="stat-value capitalize">{s.terrain}</div>
    </div>
  </div>

  <!-- Inventory section -->
  <div class="section-header">Inventory</div>
  <div class="inv-header-row">
    <span></span>
    <span>Good</span>
    <span>Stock</span>
    <span class="mono" style="text-align:right">Qty</span>
    <span>Trend</span>
    <span class="mono" style="text-align:right">Price</span>
    <span class="mono" style="text-align:right">Net/day</span>
  </div>
  <div class="inventory-list">
    {#each sortedGoods as goodId (goodId)}
      <InventoryBar
        {goodId}
        stock={s.inventory[goodId] ?? 0}
        price={s.prices[goodId] ?? GOODS[goodId].basePrice}
        basePrice={GOODS[goodId].basePrice}
        productionRate={s.productionRates[goodId]}
        consumptionRate={s.consumptionRates[goodId]}
        history={s.marketHistory[goodId]}
      />
    {/each}
    {#if sortedGoods.length === 0}
      <p class="text-muted empty-msg">No goods tracked yet.</p>
    {/if}
  </div>

  <!-- Buildings section -->
  <div class="section-header">Buildings ({s.buildings.length})</div>
  <div class="buildings-list">
    {#each s.buildings as b (b.id)}
      <div class="building-row">
        <span class="b-name capitalize">{b.type.replace(/_/g, ' ')}</span>
        <div class="b-meta">
          <span class="badge">Lv{b.level}</span>
          <span class="text-muted">{b.workers}w</span>
          {#if b.buildProgress < 1}
            <span class="badge badge-building">Building {(b.buildProgress * 100).toFixed(0)}%</span>
          {:else}
            <span class="eff-bar" title="Efficiency: {(b.efficiency * 100).toFixed(0)}%">
              <span class="eff-fill" style="width:{(b.efficiency * 100).toFixed(0)}%"></span>
            </span>
            <span class="text-muted">{(b.efficiency * 100).toFixed(0)}%</span>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <!-- Active caravans for this settlement -->
  {#if incoming.length > 0 || outgoing.length > 0}
    <div class="section-header">Trade Activity</div>
    <div class="caravan-list">
      {#each incoming as c (c.id)}
        <div class="caravan-row">
          <span class="cv-dir incoming">▼ IN</span>
          <span class="cv-from text-muted">{settlementNames[c.fromId] ?? c.fromId}</span>
          <span class="cv-cargo">{cargoSummary(c.cargo)}</span>
          <div class="cv-progress-track" title="{progressBar(c.progress)}">
            <div class="cv-progress-fill" style="width:{progressBar(c.progress)}"></div>
          </div>
          <span class="cv-pct mono text-muted">{progressBar(c.progress)}</span>
        </div>
      {/each}
      {#each outgoing as c (c.id)}
        <div class="caravan-row">
          <span class="cv-dir outgoing">▲ OUT</span>
          <span class="cv-from text-muted">{settlementNames[c.toId] ?? c.toId}</span>
          <span class="cv-cargo">{cargoSummary(c.cargo)}</span>
          <div class="cv-progress-track" title="{progressBar(c.progress)}">
            <div class="cv-progress-fill" style="width:{progressBar(c.progress)}"></div>
          </div>
          <span class="cv-pct mono text-muted">{progressBar(c.progress)}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .settlement-tab { padding: 10px 12px; display: flex; flex-direction: column; gap: 0; }

  /* Stat grid */
  .stat-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 10px;
    margin-bottom: 12px;
  }
  .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); }
  .stat-value { font-size: 13px; font-variant-numeric: tabular-nums; }
  .capitalize { text-transform: capitalize; }

  /* Section headers */
  .section-header {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
    padding: 6px 0 3px;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 4px;
  }

  /* Inventory header */
  .inv-header-row {
    display: grid;
    grid-template-columns: 6px 82px 1fr 42px 40px 36px 48px;
    gap: 4px;
    padding: 0 0 2px;
    font-size: 10px;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .inventory-list { margin-bottom: 4px; }
  .empty-msg { font-size: 11px; padding: 8px 0; }

  /* Buildings */
  .buildings-list { display: flex; flex-direction: column; gap: 1px; margin-bottom: 4px; }
  .building-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    padding: 3px 0;
    border-bottom: 1px solid rgba(61,48,32,0.3);
  }
  .b-name { text-transform: capitalize; }
  .b-meta { display: flex; align-items: center; gap: 5px; }

  .badge {
    font-size: 9px;
    padding: 1px 4px;
    border: 1px solid var(--color-border);
    border-radius: 2px;
    color: var(--color-text-muted);
    text-transform: uppercase;
  }
  .badge-building { border-color: var(--color-warning); color: var(--color-warning); }

  .eff-bar {
    width: 32px;
    height: 5px;
    background: rgba(255,255,255,0.1);
    border-radius: 2px;
    overflow: hidden;
    display: inline-block;
  }
  .eff-fill {
    height: 100%;
    background: var(--color-surplus);
    border-radius: 2px;
  }

  /* Caravans */
  .caravan-list { display: flex; flex-direction: column; gap: 2px; }
  .caravan-row {
    display: grid;
    grid-template-columns: 36px 70px 1fr 50px 32px;
    gap: 4px;
    align-items: center;
    font-size: 11px;
    padding: 2px 0;
    border-bottom: 1px solid rgba(61,48,32,0.25);
  }
  .cv-dir { font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; }
  .incoming { color: var(--color-surplus); }
  .outgoing { color: var(--color-warning); }
  .cv-cargo { font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cv-progress-track {
    height: 4px;
    background: rgba(255,255,255,0.1);
    border-radius: 2px;
    overflow: hidden;
  }
  .cv-progress-fill {
    height: 100%;
    background: var(--color-trade);
    border-radius: 2px;
  }
  .cv-pct { text-align: right; font-size: 10px; }
</style>
