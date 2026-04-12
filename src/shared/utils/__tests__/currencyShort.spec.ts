import { describe, expect, it } from 'vitest'
import { currencyShort } from '../currencyShort'

describe('currencyShort', () => {
  it('formats values >= 1,000,000 with an M suffix and one decimal', () => {
    expect(currencyShort(1_000_000)).toBe('$1.0M')
    expect(currencyShort(1_250_000)).toBe('$1.3M')
    expect(currencyShort(9_900_000)).toBe('$9.9M')
  })

  it('formats values >= 1,000 and < 1,000,000 with a K suffix and one decimal', () => {
    expect(currencyShort(1_000)).toBe('$1.0K')
    expect(currencyShort(1_500)).toBe('$1.5K')
    expect(currencyShort(999_500)).toBe('$999.5K')
  })

  it('formats values < 1,000 as plain dollars without any suffix', () => {
    expect(currencyShort(0)).toBe('$0')
    expect(currencyShort(1)).toBe('$1')
    expect(currencyShort(999)).toBe('$999')
  })

  it('treats negative values as < 1,000 and prints them verbatim', () => {
    expect(currencyShort(-100)).toBe('$-100')
  })
})
