import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  toLocalDateStr,
  localDateOffset,
  isOverdue,
  daysUntil,
  calcStreak,
  isThisWeek,
  formatDate,
  formatDateTime,
} from '../../utils/dates'

describe('toLocalDateStr', () => {
  it('returns YYYY-MM-DD format for a given date', () => {
    const date = new Date(2025, 6, 14) // July 14 2025
    expect(toLocalDateStr(date)).toBe('2025-07-14')
  })

  it('pads month and day with leading zeros', () => {
    const date = new Date(2025, 0, 5) // Jan 5 2025
    expect(toLocalDateStr(date)).toBe('2025-01-05')
  })

  it('uses today when no argument is passed', () => {
    const result = toLocalDateStr()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('localDateOffset', () => {
  it('returns today with offset 0', () => {
    const today = toLocalDateStr(new Date())
    expect(localDateOffset(0)).toBe(today)
  })

  it('returns yesterday with offset 1', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(localDateOffset(1)).toBe(toLocalDateStr(yesterday))
  })
})

describe('isOverdue', () => {
  it('returns false for null/undefined', () => {
    expect(isOverdue(null)).toBe(false)
    expect(isOverdue(undefined)).toBe(false)
  })

  it('returns true for a past date', () => {
    expect(isOverdue('2020-01-01')).toBe(true)
  })

  it('returns false for a future date', () => {
    const future = new Date()
    future.setFullYear(future.getFullYear() + 1)
    expect(isOverdue(toLocalDateStr(future))).toBe(false)
  })
})

describe('daysUntil', () => {
  it('returns null for falsy input', () => {
    expect(daysUntil(null)).toBeNull()
    expect(daysUntil(undefined)).toBeNull()
  })

  it('returns a negative number for past dates', () => {
    expect(daysUntil('2020-01-01')).toBeLessThan(0)
  })

  it('returns a positive number for future dates', () => {
    const future = new Date()
    future.setDate(future.getDate() + 10)
    expect(daysUntil(toLocalDateStr(future))).toBeGreaterThan(0)
  })
})

describe('calcStreak', () => {
  it('returns 0 for empty array', () => {
    expect(calcStreak([])).toBe(0)
  })

  it('returns 0 when neither today nor yesterday have activity', () => {
    expect(calcStreak(['2020-01-01', '2020-01-02'])).toBe(0)
  })

  it('returns 1 when only today has activity', () => {
    const today = localDateOffset(0)
    expect(calcStreak([today])).toBe(1)
  })

  it('counts consecutive days starting from today', () => {
    const dates = [0, 1, 2].map(localDateOffset)
    expect(calcStreak(dates)).toBe(3)
  })

  it('counts consecutive days starting from yesterday when today is missing', () => {
    const dates = [1, 2, 3].map(localDateOffset)
    expect(calcStreak(dates)).toBe(3)
  })

  it('stops counting when a day is missing', () => {
    const dates = [localDateOffset(0), localDateOffset(2)] // gap on day 1
    expect(calcStreak(dates)).toBe(1)
  })
})

describe('isThisWeek', () => {
  it('returns true for today', () => {
    expect(isThisWeek(new Date().toISOString())).toBe(true)
  })

  it('returns false for a date from last year', () => {
    expect(isThisWeek('2020-01-01T00:00:00.000Z')).toBe(false)
  })
})

describe('formatDate', () => {
  it('returns a non-empty string for a valid date', () => {
    const result = formatDate('2025-07-14')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('formatDateTime', () => {
  it('returns a non-empty string for a valid ISO datetime', () => {
    const result = formatDateTime('2025-07-14T10:30:00.000Z')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})
