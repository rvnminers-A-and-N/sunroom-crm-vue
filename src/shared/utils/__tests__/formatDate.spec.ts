import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime } from '../formatDate'

describe('formatDate', () => {
  it('formats an ISO date string in en-US short month format', () => {
    expect(formatDate('2026-04-09T12:00:00.000Z')).toMatch(/Apr \d{1,2}, 2026/)
  })

  it('returns an em dash when given null', () => {
    expect(formatDate(null)).toBe('—')
  })

  it('returns an em dash when given undefined', () => {
    expect(formatDate(undefined)).toBe('—')
  })

  it('returns an em dash when given an empty string', () => {
    expect(formatDate('')).toBe('—')
  })
})

describe('formatDateTime', () => {
  it('formats an ISO date string with both date and time components', () => {
    const result = formatDateTime('2026-04-09T15:30:00.000Z')
    expect(result).toMatch(/Apr \d{1,2}, 2026/)
    expect(result).toMatch(/\d{1,2}:\d{2}/)
  })

  it('returns an em dash when given null', () => {
    expect(formatDateTime(null)).toBe('—')
  })

  it('returns an em dash when given undefined', () => {
    expect(formatDateTime(undefined)).toBe('—')
  })

  it('returns an em dash when given an empty string', () => {
    expect(formatDateTime('')).toBe('—')
  })
})
