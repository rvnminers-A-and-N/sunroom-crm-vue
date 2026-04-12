/**
 * Convert a 3- or 6-digit hex color to the `rgb(r, g, b)` form jsdom emits
 * when reading back inline style attributes. Tests should use this when
 * asserting on style strings produced by Vue components that bind hex values.
 */
export function hexToRgb(hex: string): string {
  const normalized = hex.replace('#', '')
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgb(${r}, ${g}, ${b})`
}
