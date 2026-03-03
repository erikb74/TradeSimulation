import { writable } from 'svelte/store'
import type { GoodId, GameSpeed } from '../lib/constants'

export type PanelTab = 'settlement' | 'routes' | 'ledger' | 'merchants'

/** ID of the currently selected settlement on the map (null = none). */
export const selectedSettlementId = writable<string | null>(null)

/** Active tab in the right panel. */
export const activeTab = writable<PanelTab>('settlement')

/** Good selected for price heatmap mode (null = heatmap off). */
export const heatmapGood = writable<GoodId | null>(null)

/** Current game speed. */
export const gameSpeed = writable<import('../lib/constants').GameSpeed>('1x')

/** Whether the offline summary modal should be shown. */
export const showIdleSummary = writable<boolean>(false)

/** Select a settlement and switch to the settlement tab. */
export function selectSettlement(id: string): void {
  selectedSettlementId.set(id)
  activeTab.set('settlement')
}

/** Clear selection. */
export function clearSelection(): void {
  selectedSettlementId.set(null)
}
