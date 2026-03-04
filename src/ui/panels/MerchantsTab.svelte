<script lang="ts">
  import type { StateSnapshot, GoodId } from '../../simulation/types'
  import { GOODS } from '../../simulation/goods'

  interface Props {
    snapshot: StateSnapshot
  }
  let { snapshot }: Props = $props()

  const merchants = $derived(Object.values(snapshot.merchants))
  const npcMerchants = $derived(merchants.filter(m => m.isNpc))
  const playerMerchants = $derived(merchants.filter(m => !m.isNpc))

  function homeName(id: string): string {
    return snapshot.settlements[id]?.name ?? id
  }

  function routeDesc(m: typeof merchants[0]): string {
    if (!m.assignedRoute) return 'Idle'
    const r = m.assignedRoute
    const fromName = snapshot.settlements[r.fromId]?.name ?? r.fromId
    const toName   = snapshot.settlements[r.toId]?.name ?? r.toId
    return `${GOODS[r.good]?.name ?? r.good}: ${fromName} → ${toName}`
  }

  function caravanProgress(m: typeof merchants[0]): number | null {
    if (!m.caravanId) return null
    return snapshot.caravans[m.caravanId]?.progress ?? null
  }
</script>

<div class="merchants-tab">
  {#if playerMerchants.length > 0}
    <div class="section-header">Your Merchants ({playerMerchants.length})</div>
    <div class="merchant-list">
      {#each playerMerchants as m (m.id)}
        {@const progress = caravanProgress(m)}
        <div class="merchant-card player-card">
          <div class="m-header">
            <span class="m-name">{m.name}</span>
            <span class="m-home text-muted">{homeName(m.homeSettlementId)}</span>
            <span class="m-gold text-gold mono">{Math.floor(m.gold)}g</span>
          </div>
          <div class="m-route">{routeDesc(m)}</div>
          {#if progress !== null}
            <div class="m-progress-row">
              <div class="m-track"><div class="m-fill" style="width:{(progress * 100).toFixed(0)}%"></div></div>
              <span class="m-pct text-muted mono">{(progress * 100).toFixed(0)}%</span>
            </div>
          {:else if m.idleTicks > 0}
            <div class="m-idle text-muted">Idle {m.idleTicks} ticks</div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <div class="section-header">NPC Merchants ({npcMerchants.length})</div>
  <div class="merchant-list">
    {#each npcMerchants.slice(0, 24) as m (m.id)}
      {@const progress = caravanProgress(m)}
      <div class="merchant-card">
        <div class="m-header">
          <span class="m-name">{m.name}</span>
          <span class="m-home text-muted">{homeName(m.homeSettlementId)}</span>
          <span class="m-gold text-muted mono">{Math.floor(m.gold)}g</span>
        </div>
        <div class="m-route text-muted">{routeDesc(m)}</div>
        {#if progress !== null}
          <div class="m-progress-row">
            <div class="m-track"><div class="m-fill npc-fill" style="width:{(progress * 100).toFixed(0)}%"></div></div>
            <span class="m-pct text-muted mono">{(progress * 100).toFixed(0)}%</span>
          </div>
        {/if}
      </div>
    {/each}
    {#if npcMerchants.length > 24}
      <p class="text-muted" style="font-size:10px; padding: 4px 0">…and {npcMerchants.length - 24} more</p>
    {/if}
  </div>
</div>

<style>
  .merchants-tab { padding: 10px 12px; }

  .section-header {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
    padding: 6px 0 3px;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 6px;
  }

  .merchant-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }

  .merchant-card {
    background: var(--color-bg-raised);
    border: 1px solid var(--color-border);
    border-radius: 2px;
    padding: 5px 8px;
  }
  .player-card { border-color: rgba(200, 150, 30, 0.5); }

  .m-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 2px;
  }
  .m-name { font-size: 12px; font-weight: 500; }
  .m-home { font-size: 10px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .m-gold { font-size: 11px; }

  .m-route { font-size: 10px; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .m-progress-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 3px;
  }
  .m-track {
    flex: 1;
    height: 3px;
    background: rgba(255,255,255,0.1);
    border-radius: 2px;
    overflow: hidden;
  }
  .m-fill {
    height: 100%;
    background: var(--color-gold);
    border-radius: 2px;
    transition: width 0.5s linear;
  }
  .npc-fill { background: var(--color-trade); }
  .m-pct { font-size: 10px; min-width: 28px; text-align: right; }

  .m-idle { font-size: 10px; margin-top: 2px; }
</style>
