import { describe, it, expect } from 'vitest'
import { getSeason, getYear, getDayOfSeason, seasonProductionMultiplier, seasonSpeedMultiplier } from '../seasons'
import { TICKS_PER_SEASON } from '../../lib/constants'

describe('time helpers', () => {
  it('getSeason returns spring at tick 0', () => {
    expect(getSeason(0)).toBe('spring')
  })

  it('getSeason advances correctly through seasons', () => {
    expect(getSeason(TICKS_PER_SEASON * 0)).toBe('spring')
    expect(getSeason(TICKS_PER_SEASON * 1)).toBe('summer')
    expect(getSeason(TICKS_PER_SEASON * 2)).toBe('autumn')
    expect(getSeason(TICKS_PER_SEASON * 3)).toBe('winter')
    // Wraps back to spring
    expect(getSeason(TICKS_PER_SEASON * 4)).toBe('spring')
  })

  it('getYear increments after 4 seasons', () => {
    expect(getYear(0)).toBe(1)
    expect(getYear(TICKS_PER_SEASON * 4)).toBe(2)
    expect(getYear(TICKS_PER_SEASON * 8)).toBe(3)
  })

  it('getDayOfSeason resets each season', () => {
    expect(getDayOfSeason(0)).toBe(1)
    expect(getDayOfSeason(TICKS_PER_SEASON - 1)).toBe(TICKS_PER_SEASON)
    expect(getDayOfSeason(TICKS_PER_SEASON)).toBe(1)
  })
})

describe('seasonProductionMultiplier', () => {
  it('grain_farm peaks in autumn', () => {
    const autumn = seasonProductionMultiplier('grain_farm', 'autumn')
    const summer = seasonProductionMultiplier('grain_farm', 'summer')
    const winter = seasonProductionMultiplier('grain_farm', 'winter')
    expect(autumn).toBeGreaterThan(summer)
    expect(autumn).toBeGreaterThan(winter)
  })

  it('grain_farm is nearly zero in winter', () => {
    expect(seasonProductionMultiplier('grain_farm', 'winter')).toBeLessThan(0.2)
  })

  it('iron_mine is less affected by season than grain_farm', () => {
    const farmWinter = seasonProductionMultiplier('grain_farm', 'winter')
    const mineWinter = seasonProductionMultiplier('iron_mine', 'winter')
    expect(mineWinter).toBeGreaterThan(farmWinter)
  })

  it('bakery is not much affected by winter (indoor work)', () => {
    const bakeryWinter = seasonProductionMultiplier('bakery', 'winter')
    expect(bakeryWinter).toBeGreaterThan(0.8)
  })
})

describe('seasonSpeedMultiplier', () => {
  it('winter slows caravans the most', () => {
    const winter = seasonSpeedMultiplier('winter')
    const summer = seasonSpeedMultiplier('summer')
    const spring = seasonSpeedMultiplier('spring')
    expect(winter).toBeLessThan(summer)
    expect(spring).toBeGreaterThanOrEqual(summer)
  })

  it('all multipliers are positive', () => {
    for (const season of ['spring', 'summer', 'autumn', 'winter'] as const) {
      expect(seasonSpeedMultiplier(season)).toBeGreaterThan(0)
    }
  })
})
