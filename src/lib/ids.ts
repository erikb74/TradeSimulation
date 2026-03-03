/**
 * Lightweight ID generator — no external dependency.
 * Produces short, URL-safe, collision-resistant IDs.
 * Not cryptographically secure, but fine for game entity IDs.
 */
let _counter = 0

export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36)
  const counter = (_counter++).toString(36).padStart(3, '0')
  const random = Math.random().toString(36).slice(2, 6)
  return `${prefix}${timestamp}${counter}${random}`
}

export function settlementId(): string  { return generateId('s_') }
export function merchantId(): string    { return generateId('m_') }
export function caravanId(): string     { return generateId('c_') }
export function tradeRouteId(): string  { return generateId('r_') }
export function buildingId(): string    { return generateId('b_') }
export function eventId(): string       { return generateId('e_') }
