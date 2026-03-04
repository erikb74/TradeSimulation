<script lang="ts">
  import type { StateSnapshot, GoodId } from '../../simulation/types'
  import { GOODS } from '../../simulation/goods'

  interface Props {
    snapshot: StateSnapshot
    selectedSettlementId: string | null
  }
  let { snapshot, selectedSettlementId }: Props = $props()

  const settlements = $derived(snapshot.settlements)
  const caravans = $derived(Object.values(snapshot.caravans))

  // Show caravans filtered to selected settlement (or all if none selected)
  const filteredCaravans = $derived(
    selectedSettlementId
      ? caravans.filter(c =>
          c.fromId === selectedSettlementId ||
          c.toId === selectedSettlementId
        )
      : caravans
  )

  // Sort by player-owned first, then by progress descending
  const sortedCaravans = $derived(
    [...filteredCaravans].sort((a, b) => {
      if (a.isPlayerOwned && !b.isPlayerOwned) return -1
      if (!a.isPlayerOwned && b.isPlayerOwned) return 1
      return b.progress - a.progress
    })
  )

  function cargoSummary(cargo: Partial<Record<GoodId, number>>): string {
    const entries = Object.entries(cargo).filter(([, v]) => (v as number) > 0)
    if (entries.length === 0) return 'empty'
    return entries
      .map(([id, qty]) => `${GOODS[id as GoodId]?.name ?? id} ×${(qty as number).toFixed(0)}`)
      .join(', ')
  }

  function settlementName(id: string): string {
    return settlements[id]?.name ?? id
  }
</script>

<div class="routes-tab">
  <div class="routes-header">
    <span class="text-muted">
      {#if selectedSettlementId}
        Caravans at <strong>{settlementName(selectedSettlementId)}</strong>
        ({filteredCaravans.length})
      {:else}
        All Caravans ({caravans.length})
      {/if}
    </span>
  </div>

  {#if sortedCaravans.length === 0}
    <p class="empty-msg text-muted">No active caravans.</p>
  {:else}
    <div class="caravan-list">
      {#each sortedCaravans as c (c.id)}
        {@const merchant = snapshot.merchants[c.merchantId]}
        <div class="caravan-card" class:player-card={c.isPlayerOwned}>
          <div class="cv-route">
            <span class="cv-from">{settlementName(c.fromId)}</span>
            <span class="cv-arrow">→</span>
            <span class="cv-to">{settlementName(c.toId)}</span>
            {#if c.isPlayerOwned}
              <span class="badge-player">You</span>
            {/if}
          </div>
          <div class="cv-detail">
            <span class="cv-cargo text-muted">{cargoSummary(c.cargo)}</span>
            <span class="cv-returning text-muted">{c.returning ? '↩ returning' : ''}</span>
          </div>
          <div class="cv-progress-row">
            <div class="cv-track">
              <div class="cv-fill" style="width:{(c.progress * 100).toFixed(0)}%"></div>
            </div>
            <span class="cv-pct mono text-muted">{(c.progress * 100).toFixed(0)}%</span>
          </div>
          {#if merchant}
            <div class="cv-merchant text-muted">{merchant.name}</div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .routes-tab { padding: 10px 12px; }

  .routes-header {
    font-size: 11px;
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--color-border);
  }

  .empty-msg { font-size: 11px; padding: 12px 0; text-align: center; }

  .caravan-list { display: flex; flex-direction: column; gap: 4px; }

  .caravan-card {
    background: var(--color-bg-raised);
    border: 1px solid var(--color-border);
    border-radius: 2px;
    padding: 6px 8px;
  }
  .player-card { border-color: var(--color-gold); }

  .cv-route {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    margin-bottom: 3px;
  }
  .cv-from, .cv-to { font-weight: 500; }
  .cv-arrow { color: var(--color-text-muted); font-size: 10px; }

  .badge-player {
    font-size: 9px;
    padding: 1px 4px;
    border: 1px solid var(--color-gold);
    border-radius: 2px;
    color: var(--color-gold);
    text-transform: uppercase;
    margin-left: 2px;
  }

  .cv-detail {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    margin-bottom: 4px;
  }
  .cv-cargo {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 200px;
  }

  .cv-progress-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .cv-track {
    flex: 1;
    height: 4px;
    background: rgba(255,255,255,0.1);
    border-radius: 2px;
    overflow: hidden;
  }
  .cv-fill {
    height: 100%;
    background: var(--color-trade);
    border-radius: 2px;
    transition: width 0.5s linear;
  }
  .cv-pct { font-size: 10px; min-width: 28px; text-align: right; }

  .cv-merchant { font-size: 10px; margin-top: 2px; }
</style>
