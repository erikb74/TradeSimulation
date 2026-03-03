<script lang="ts">
  import { onMount } from 'svelte'
  import { initWorker, worldSnapshot, workerReady, workerError } from '../stores/simulation'
  import { gameSpeed, selectedSettlementId } from '../stores/ui'
  import { workerSend } from '../stores/simulation'

  onMount(() => {
    initWorker()
  })

  // Keyboard shortcuts
  function onKeydown(e: KeyboardEvent) {
    // Don't fire if typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

    switch (e.key) {
      case ' ':
        e.preventDefault()
        const newSpeed = $gameSpeed === 'pause' ? '1x' : 'pause'
        gameSpeed.set(newSpeed)
        workerSend({ type: 'SET_SPEED', speed: newSpeed })
        break
      case '1':
        gameSpeed.set('1x'); workerSend({ type: 'SET_SPEED', speed: '1x' })
        break
      case '2':
        gameSpeed.set('2x'); workerSend({ type: 'SET_SPEED', speed: '2x' })
        break
      case '5':
        gameSpeed.set('5x'); workerSend({ type: 'SET_SPEED', speed: '5x' })
        break
      case 'd': case 'D':
        gameSpeed.set('debug'); workerSend({ type: 'SET_SPEED', speed: 'debug' })
        break
      case 'Escape':
        selectedSettlementId.set(null)
        break
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<div class="app-root">
  {#if $workerError}
    <div class="error-overlay">
      <div class="error-box">
        <h2>Simulation Error</h2>
        <p>{$workerError}</p>
        <button onclick={() => window.location.reload()}>Reload</button>
      </div>
    </div>
  {:else if !$workerReady}
    <div class="loading-screen">
      <div class="loading-content">
        <h1>Medieval Trade Simulation</h1>
        <p class="loading-msg">Generating world…</p>
        <div class="loading-dots">
          <span>.</span><span>.</span><span>.</span>
        </div>
      </div>
    </div>
  {:else if $worldSnapshot}
    <!-- Main game layout — full viewport grid -->
    <div class="game-layout">

      <!-- TOP BAR -->
      <header class="topbar panel">
        <div class="topbar-left">
          <span class="game-title">⚔ Trade Empires</span>
        </div>

        <div class="topbar-center">
          <span class="time-info mono">
            Day {$worldSnapshot.day} ·
            {$worldSnapshot.season.charAt(0).toUpperCase() + $worldSnapshot.season.slice(1)} ·
            Year {$worldSnapshot.year}
          </span>
          <div class="speed-controls">
            {#each ['pause', '1x', '2x', '5x', 'debug'] as spd}
              <button
                class="btn speed-btn"
                class:active={$gameSpeed === spd}
                onclick={() => {
                  gameSpeed.set(spd as any)
                  workerSend({ type: 'SET_SPEED', speed: spd as any })
                }}
              >
                {spd === 'pause' ? '⏸' : spd === 'debug' ? '🐛' : spd}
              </button>
            {/each}
          </div>
        </div>

        <div class="topbar-right">
          <span class="treasury mono">
            Treasury: <span class="text-gold">{Math.floor($worldSnapshot.playerGold).toLocaleString()}g</span>
          </span>
          <span class="event-count text-muted mono">
            {$worldSnapshot.settlements ? Object.keys($worldSnapshot.settlements).length : 0} settlements ·
            {Object.keys($worldSnapshot.caravans).length} caravans
          </span>
        </div>
      </header>

      <!-- MAP AREA (placeholder until Phase 4) -->
      <main class="map-area">
        <div class="map-placeholder">
          <div class="map-stats">
            <h2>Simulation Running</h2>
            <p class="text-muted">Fast tick: {$worldSnapshot.fastTick} &nbsp;|&nbsp; Slow tick: {$worldSnapshot.slowTick}</p>

            <div class="settlement-grid">
              {#each Object.values($worldSnapshot.settlements) as s}
                <button
                  class="settlement-card panel-raised"
                  class:selected={$selectedSettlementId === s.id}
                  onclick={() => selectedSettlementId.set(s.id)}
                >
                  <div class="s-name">{s.name}</div>
                  <div class="s-type text-muted">{s.type}</div>
                  <div class="s-pop mono">Pop: {s.population}</div>
                  <div class="s-gold mono">Gold: {Math.floor(s.treasury)}g</div>
                </button>
              {/each}
            </div>
          </div>
        </div>
      </main>

      <!-- RIGHT PANEL -->
      <aside class="right-panel panel">
        {#if $selectedSettlementId && $worldSnapshot.settlements[$selectedSettlementId]}
          {@const s = $worldSnapshot.settlements[$selectedSettlementId]}
          <div class="panel-content">
            <div class="s-header">
              <h3>{s.name}</h3>
              <span class="badge">{s.type}</span>
            </div>
            <table>
              <tbody>
                <tr><td class="text-muted">Population</td><td class="mono">{s.population} / {s.populationCap}</td></tr>
                <tr><td class="text-muted">Treasury</td><td class="mono text-gold">{Math.floor(s.treasury)}g</td></tr>
                <tr><td class="text-muted">Tariff</td><td class="mono">{(s.tariffRate * 100).toFixed(0)}%</td></tr>
                <tr><td class="text-muted">Buildings</td><td class="mono">{s.buildings.length}</td></tr>
              </tbody>
            </table>

            <h4>Inventory</h4>
            <table>
              <thead>
                <tr><th>Good</th><th>Stock</th><th>Price</th></tr>
              </thead>
              <tbody>
                {#each Object.entries(s.inventory).filter(([,v]) => v > 0.1).sort((a,b) => b[1]-a[1]) as [goodId, stock]}
                  <tr>
                    <td>{goodId}</td>
                    <td class="mono">{stock.toFixed(1)}</td>
                    <td class="mono text-gold">{(s.prices[goodId as import('../simulation/types').GoodId] ?? 0).toFixed(1)}g</td>
                  </tr>
                {/each}
              </tbody>
            </table>

            <h4>Buildings</h4>
            {#each s.buildings as b}
              <div class="building-row">
                <span>{b.type.replace(/_/g, ' ')}</span>
                <span class="text-muted mono">Lv{b.level} · {b.workers}w · {(b.efficiency * 100).toFixed(0)}%</span>
              </div>
            {/each}
          </div>
        {:else}
          <div class="panel-empty">
            <p class="text-muted">Click a settlement to inspect it.</p>
          </div>
        {/if}
      </aside>

      <!-- EVENT LOG -->
      <footer class="event-log panel">
        {#each [...$worldSnapshot.recentEvents].reverse().slice(0, 8) as evt}
          <span class="event-entry text-muted">
            <span class="event-type">[{evt.type.replace(/_/g,' ')}]</span>
            {evt.message}
          </span>
        {/each}
      </footer>

    </div>
  {/if}
</div>

<style>
  .app-root {
    position: fixed;
    inset: 0;
    background: var(--color-bg);
    color: var(--color-text);
  }

  /* Grid layout — topbar | map+panel | log */
  .game-layout {
    display: grid;
    width: 100%;
    height: 100%;
    grid-template-rows: 44px 1fr 70px;
    grid-template-columns: 1fr 380px;
    grid-template-areas:
      "topbar topbar"
      "map    panel"
      "log    log";
  }

  .topbar {
    grid-area: topbar;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    border-bottom: 1px solid var(--color-border);
  }
  .topbar-left  { display: flex; align-items: center; gap: 8px; }
  .topbar-center{ display: flex; align-items: center; gap: 12px; }
  .topbar-right { display: flex; align-items: center; gap: 12px; font-size: 12px; }

  .game-title { font-size: 15px; color: var(--color-gold); letter-spacing: 0.05em; }
  .time-info  { font-size: 12px; color: var(--color-text-muted); }

  .speed-controls { display: flex; gap: 3px; }
  .speed-btn { font-size: 11px; padding: 2px 7px; }

  .map-area {
    grid-area: map;
    overflow: hidden;
    position: relative;
    background: #111009;
  }

  .map-placeholder {
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    padding: 16px;
    height: 100%;
    overflow-y: auto;
  }

  .map-stats h2 { color: var(--color-gold); font-size: 14px; margin: 0 0 4px; }
  .map-stats p  { font-size: 12px; margin: 0 0 12px; }

  .settlement-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 8px;
    margin-top: 8px;
  }

  .settlement-card {
    padding: 8px;
    border-radius: 2px;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.1s;
    border: 1px solid var(--color-border);
    background: var(--color-bg-raised);
    color: var(--color-text);
    font-family: inherit;
  }
  .settlement-card:hover   { border-color: var(--color-gold); }
  .settlement-card.selected{ border-color: var(--color-gold); background: #352a1a; }
  .s-name { font-weight: bold; font-size: 13px; }
  .s-type { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; margin: 2px 0; }
  .s-pop, .s-gold { font-size: 11px; }

  .right-panel {
    grid-area: panel;
    overflow-y: auto;
    border-left: 1px solid var(--color-border);
  }

  .panel-content { padding: 12px; }
  .panel-empty   { padding: 20px; text-align: center; }

  .s-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .s-header h3 { margin: 0; font-size: 15px; color: var(--color-gold); }
  .badge {
    font-size: 10px;
    padding: 1px 5px;
    border: 1px solid var(--color-border);
    border-radius: 2px;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-muted); margin: 12px 0 4px; }

  .building-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    padding: 2px 0;
    border-bottom: 1px solid rgba(61,48,32,0.4);
    text-transform: capitalize;
  }

  .event-log {
    grid-area: log;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 0 12px;
    overflow-x: auto;
    white-space: nowrap;
    border-top: 1px solid var(--color-border);
    font-size: 11px;
  }

  .event-entry { flex-shrink: 0; }
  .event-type  { color: var(--color-gold); margin-right: 4px; }

  /* Loading screen */
  .loading-screen {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg);
  }
  .loading-content {
    text-align: center;
  }
  .loading-content h1 { color: var(--color-gold); font-size: 28px; margin-bottom: 16px; }
  .loading-msg { color: var(--color-text-muted); font-size: 14px; }
  .loading-dots { color: var(--color-gold); font-size: 24px; margin-top: 8px; }
  .loading-dots span { animation: dot-blink 1.4s infinite; }
  .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
  .loading-dots span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes dot-blink {
    0%, 80%, 100% { opacity: 0; }
    40% { opacity: 1; }
  }

  /* Error overlay */
  .error-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.85);
  }
  .error-box {
    background: var(--color-bg-raised);
    border: 1px solid var(--color-shortage);
    padding: 24px;
    max-width: 400px;
    text-align: center;
  }
  .error-box h2 { color: var(--color-shortage); }
</style>
