import { describe, expect, it } from 'vitest'
import { initials } from '../initials'

describe('initials', () => {
  it('returns the first two uppercase initials of a two-word name', () => {
    expect(initials('Grace Hopper')).toBe('GH')
  })

  it('returns the first two initials when given more than two words', () => {
    expect(initials('John Fitzgerald Kennedy')).toBe('JF')
  })

  it('returns a single initial when given a single word', () => {
    expect(initials('Cher')).toBe('C')
  })

  it('uppercases lowercase initials', () => {
    expect(initials('ada lovelace')).toBe('AL')
  })

  it('returns an empty string when the name is empty', () => {
    expect(initials('')).toBe('')
  })
})
