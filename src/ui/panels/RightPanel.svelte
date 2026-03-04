<script lang="ts">
  import type { StateSnapshot, GoodId } from '../../simulation/types'
  import { activeTab, heatmapGood } from '../../stores/ui'
  import type { PanelTab } from '../../stores/ui'
  import SettlementTab from './SettlementTab.svelte'
  import RoutesTab     from './RoutesTab.svelte'
  import LedgerTab     from './LedgerTab.svelte'
  import MerchantsTab  from './MerchantsTab.svelte'

  interface Props {
    snapshot: StateSnapshot
    selectedId: string | null
  }
  let { snapshot, selectedId }: Props = $props()

  const TABS: Array<{ id: PanelTab; label: string }> = [
    { id: 'settlement', label: 'Settlement' },
    { id: 'routes',     label: 'Routes' },
    { id: 'ledger',     label: 'Ledger' },
    { id: 'merchants',  label: 'Merchants' },
  ]

  const selectedSettlement = $derived(
    selectedId ? snapshot.settlements[selectedId] : null
  )

  // Caravans associated with the selected settlement
  const settlementCaravans = $derived(
    selectedId
      ? Object.values(snapshot.caravans).filter(
          c => c.fromId === selectedId || c.toId === selectedId
        )
      : []
  )

  // Settlement name map for display in sub-panels
  const settlementNames = $derived(
    Object.fromEntries(
      Object.values(snapshot.settlements).map(s => [s.id, s.name])
    )
  )

  // GOODS from CLAUDE.md — heatmap good selector
  const HEATMAP_GOODS: GoodId[] = [
    'grain', 'bread', 'tools', 'iron_ore', 'iron_bar',
    'timber', 'cloth', 'wine', 'medicine',
  ]

  function setHeatmap(good: GoodId | null) {
    heatmapGood.set(good)
  }
</script>

<div class="right-panel">
  <!-- Tab strip -->
  <div class="tab-strip">
    {#each TABS as tab}
      <button
        class="tab-btn"
        class:active={$activeTab === tab.id}
        onclick={() => activeTab.set(tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <!-- Heatmap quick-select (always visible at top of panel) -->
  <div class="heatmap-bar">
    <span class="text-muted hm-label">Heatmap:</span>
    <button
      class="hm-btn"
      class:hm-active={$heatmapGood === null}
      onclick={() => setHeatmap(null)}
    >Off</button>
    {#each HEATMAP_GOODS as g}
      <button
        class="hm-btn"
        class:hm-active={$heatmapGood === g}
        onclick={() => setHeatmap($heatmapGood === g ? null : g)}
        title={g}
      >
        {g.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).slice(0, 6)}
      </button>
    {/each}
  </div>

  <!-- Tab content -->
  <div class="tab-content">
    {#if $activeTab === 'settlement'}
      {#if selectedSettlement}
        <SettlementTab
          settlement={selectedSettlement}
          caravansHere={settlementCaravans}
          {settlementNames}
        />
      {:else}
        <div class="empty-panel">
          <p class="text-muted">Click a settlement on the map to inspect it.</p>
          <p class="text-muted hint">Use scroll wheel to zoom · Drag to pan</p>
        </div>
      {/if}

    {:else if $activeTab === 'routes'}
      <RoutesTab snapshot={snapshot} selectedSettlementId={selectedId} />

    {:else if $activeTab === 'ledger'}
      <LedgerTab snapshot={snapshot} />

    {:else if $activeTab === 'merchants'}
      <MerchantsTab snapshot={snapshot} />
    {/if}
  </div>
</div>

<style>
  .right-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  /* Tab strip */
  .tab-strip {
    display: flex;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg-panel);
    flex-shrink: 0;
  }

  .tab-btn {
    flex: 1;
    padding: 7px 4px;
    font-size: 11px;
    text-align: center;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: color 0.1s, border-color 0.1s;
    font-family: inherit;
    letter-spacing: 0.04em;
  }
  .tab-btn:hover { color: var(--color-text); }
  .tab-btn.active {
    color: var(--color-gold);
    border-bottom-color: var(--color-gold);
  }

  /* Heatmap selector */
  .heatmap-bar {
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 4px 8px;
    border-bottom: 1px solid var(--color-border);
    flex-wrap: wrap;
    background: var(--color-bg-panel);
    flex-shrink: 0;
  }
  .hm-label { font-size: 10px; margin-right: 2px; }
  .hm-btn {
    font-size: 10px;
    padding: 2px 5px;
    background: var(--color-bg-raised);
    border: 1px solid var(--color-border);
    border-radius: 2px;
    color: var(--color-text-muted);
    cursor: pointer;
    font-family: inherit;
    transition: border-color 0.1s, color 0.1s;
  }
  .hm-btn:hover { border-color: var(--color-text-muted); color: var(--color-text); }
  .hm-btn.hm-active {
    border-color: var(--color-gold);
    color: var(--color-gold);
    background: rgba(200, 150, 30, 0.12);
  }

  /* Scrollable content area */
  .tab-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  /* Empty state */
  .empty-panel {
    padding: 32px 16px;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .hint { font-size: 10px; }
</style>
