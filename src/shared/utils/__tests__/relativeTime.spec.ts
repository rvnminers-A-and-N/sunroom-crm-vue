import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { relativeTime } from '../relativeTime'

const NOW = new Date('2026-04-10T12:00:00.000Z')

function isoSecondsAgo(seconds: number): string {
  return new Date(NOW.getTime() - seconds * 1000).toISOString()
}

describe('relativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "just now" for timestamps under one minute old', () => {
    expect(relativeTime(isoSecondsAgo(0))).toBe('just now')
    expect(relativeTime(isoSecondsAgo(59))).toBe('just now')
  })

  it('returns "<n>m ago" for timestamps between 1 and 59 minutes old', () => {
    expect(relativeTime(isoSecondsAgo(60))).toBe('1m ago')
    expect(relativeTime(isoSecondsAgo(60 * 30))).toBe('30m ago')
    expect(relativeTime(isoSecondsAgo(60 * 59))).toBe('59m ago')
  })

  it('returns "<n>h ago" for timestamps between 1 and 23 hours old', () => {
    expect(relativeTime(isoSecondsAgo(60 * 60))).toBe('1h ago')
    expect(relativeTime(isoSecondsAgo(60 * 60 * 23))).toBe('23h ago')
  })

  it('returns "<n>d ago" for timestamps between 1 and 29 days old', () => {
    expect(relativeTime(isoSecondsAgo(60 * 60 * 24))).toBe('1d ago')
    expect(relativeTime(isoSecondsAgo(60 * 60 * 24 * 29))).toBe('29d ago')
  })

  it('returns "<n>mo ago" for timestamps between 1 and 11 months old', () => {
    expect(relativeTime(isoSecondsAgo(60 * 60 * 24 * 30))).toBe('1mo ago')
    expect(relativeTime(isoSecondsAgo(60 * 60 * 24 * 30 * 11))).toBe('11mo ago')
  })

  it('returns "<n>y ago" for timestamps a year or older', () => {
    expect(relativeTime(isoSecondsAgo(60 * 60 * 24 * 30 * 12))).toBe('1y ago')
    expect(relativeTime(isoSecondsAgo(60 * 60 * 24 * 30 * 12 * 5))).toBe('5y ago')
  })
})
