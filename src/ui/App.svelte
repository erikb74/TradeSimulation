<script lang="ts">
  import { onMount } from 'svelte'
  import { initWorker, worldSnapshot, workerReady, workerError, terrainData } from '../stores/simulation'
  import { gameSpeed, selectedSettlementId, heatmapGood, selectSettlement } from '../stores/ui'
  import { workerSend } from '../stores/simulation'
  import WorldMap  from './map/WorldMap.svelte'
  import RightPanel from './panels/RightPanel.svelte'

  let mapComponent: WorldMap | undefined

  onMount(() => {
    initWorker()
  })

  // Keyboard shortcuts
  function onKeydown(e: KeyboardEvent) {
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
      case 'h': case 'H':
        // Toggle heatmap off
        heatmapGood.set(null)
        break
      case 'r': case 'R':
        // Reset map view
        mapComponent?.resetView()
        break
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="app-root">
  {#if $workerError}
    <div class="error-overlay">
      <div class="error-box">
        <h2>Simulation Error</h2>
        <p>{$workerError}</p>
        <button class="btn" onclick={() => window.location.reload()}>Reload</button>
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
    <div class="game-layout">

      <!-- TOP BAR -->
      <header class="topbar panel">
        <div class="topbar-left">
          <span class="game-title">Trade Empires</span>
        </div>

        <div class="topbar-center">
          <span class="time-info mono">
            Day {$worldSnapshot.day} ·
            {$worldSnapshot.season.charAt(0).toUpperCase() + $worldSnapshot.season.slice(1)} ·
            Year {$worldSnapshot.year}
          </span>
          <div class="speed-controls">
            {#each (['pause', '1x', '2x', '5x', 'debug'] as const) as spd}
              <button
                class="btn speed-btn"
                class:active={$gameSpeed === spd}
                onclick={() => {
                  gameSpeed.set(spd)
                  workerSend({ type: 'SET_SPEED', speed: spd })
                }}
              >
                {spd === 'pause' ? '⏸' : spd === 'debug' ? 'DBG' : spd}
              </button>
            {/each}
          </div>
        </div>

        <div class="topbar-right">
          <span class="treasury mono">
            <span class="text-muted">Treasury</span>
            <span class="text-gold">{Math.floor($worldSnapshot.playerGold).toLocaleString()}g</span>
          </span>
          <span class="world-stats text-muted mono">
            {Object.keys($worldSnapshot.settlements).length} settlements ·
            {Object.keys($worldSnapshot.caravans).length} caravans ·
            tick {$worldSnapshot.slowTick}
          </span>
          <button class="btn btn-sm" onclick={() => mapComponent?.resetView()} title="Reset view (R)">⌂</button>
          <button
            class="btn btn-sm"
            onclick={() => workerSend({ type: 'NEW_GAME' })}
            title="New game"
          >New</button>
        </div>
      </header>

      <!-- MAP AREA -->
      <main class="map-area">
        {#if $worldSnapshot}
          <WorldMap
            bind:this={mapComponent}
            snapshot={$worldSnapshot}
            terrain={$terrainData}
            selectedId={$selectedSettlementId}
            heatmapGood={$heatmapGood}
            gameSpeed={$gameSpeed}
            onSelect={(id) => selectSettlement(id)}
          />
        {/if}
      </main>

      <!-- RIGHT PANEL -->
      <aside class="right-panel-area panel">
        {#if $worldSnapshot}
          <RightPanel
            snapshot={$worldSnapshot}
            selectedId={$selectedSettlementId}
          />
        {/if}
      </aside>

      <!-- EVENT LOG -->
      <footer class="event-log panel">
        {#each [...($worldSnapshot.recentEvents ?? [])].reverse().slice(0, 10) as evt (evt.id)}
          <span class="event-entry">
            <span class="evt-type">[{evt.type.replace(/_/g, ' ')}]</span>
            <span class="evt-msg text-muted">{evt.message}</span>
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
    font-family: inherit;
  }

  /* Full-viewport CSS grid: topbar / map+panel / log */
  .game-layout {
    display: grid;
    width: 100%;
    height: 100%;
    grid-template-rows: 44px 1fr 64px;
    grid-template-columns: 1fr 360px;
    grid-template-areas:
      "topbar topbar"
      "map    panel"
      "log    log";
  }

  /* ── Top bar ─────────────────────────────────────────────────────────────── */
  .topbar {
    grid-area: topbar;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    border-bottom: 1px solid var(--color-border);
    gap: 12px;
    z-index: 10;
  }
  .topbar-left  { display: flex; align-items: center; }
  .topbar-center{ display: flex; align-items: center; gap: 12px; flex: 1; justify-content: center; }
  .topbar-right { display: flex; align-items: center; gap: 8px; font-size: 12px; }

  .game-title  { font-size: 14px; color: var(--color-gold); letter-spacing: 0.07em; font-weight: bold; }
  .time-info   { font-size: 12px; color: var(--color-text-muted); }
  .treasury    { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; }
  .world-stats { font-size: 10px; }

  .speed-controls { display: flex; gap: 2px; }
  .speed-btn      { font-size: 11px; padding: 2px 6px; }

  /* ── Map area ────────────────────────────────────────────────────────────── */
  .map-area {
    grid-area: map;
    overflow: hidden;
    position: relative;
    background: #0f0d09;
  }

  /* ── Right panel ─────────────────────────────────────────────────────────── */
  .right-panel-area {
    grid-area: panel;
    overflow: hidden;
    border-left: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
  }

  /* ── Event log ───────────────────────────────────────────────────────────── */
  .event-log {
    grid-area: log;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 0 12px;
    overflow-x: auto;
    white-space: nowrap;
    border-top: 1px solid var(--color-border);
    font-size: 11px;
    scrollbar-width: none;
  }
  .event-log::-webkit-scrollbar { display: none; }

  .event-entry { flex-shrink: 0; display: flex; gap: 5px; align-items: center; }
  .evt-type    { color: var(--color-gold); font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
  .evt-msg     { font-size: 11px; }

  /* ── Loading screen ──────────────────────────────────────────────────────── */
  .loading-screen {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg);
  }
  .loading-content { text-align: center; }
  .loading-content h1 { color: var(--color-gold); font-size: 28px; margin-bottom: 16px; }
  .loading-msg        { color: var(--color-text-muted); font-size: 14px; }
  .loading-dots       { color: var(--color-gold); font-size: 24px; margin-top: 8px; }
  .loading-dots span  { animation: dot-blink 1.4s infinite; }
  .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
  .loading-dots span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes dot-blink {
    0%, 80%, 100% { opacity: 0; }
    40%            { opacity: 1; }
  }

  /* ── Error overlay ───────────────────────────────────────────────────────── */
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
    padding: 24px 32px;
    max-width: 400px;
    text-align: center;
    border-radius: 3px;
  }
  .error-box h2 { color: var(--color-shortage); margin: 0 0 12px; }

  /* ── Utility ─────────────────────────────────────────────────────────────── */
  .btn-sm { font-size: 11px; padding: 2px 7px; }
</style>
