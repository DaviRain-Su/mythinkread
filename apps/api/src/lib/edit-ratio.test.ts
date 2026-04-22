import { describe, it, expect } from 'vitest'
import { editRatio, aggregateEditRatio } from './edit-ratio'

describe('editRatio', () => {
  it('returns 0 for identical strings', () => {
    expect(editRatio('hello world', 'hello world')).toBe(0)
  })

  it('returns 0 when both strings are empty', () => {
    expect(editRatio('', '')).toBe(0)
  })

  it('returns 1 when one string is empty', () => {
    expect(editRatio('abc', '')).toBe(1)
    expect(editRatio('', 'abcdef')).toBe(1)
  })

  it('returns 1 when strings are completely different and equal length', () => {
    // "abcd" -> "wxyz" requires 4 substitutions over max length 4.
    expect(editRatio('abcd', 'wxyz')).toBe(1)
  })

  it('measures a small single-character substitution as 1 / max(len)', () => {
    // "hello" -> "hallo" = 1 edit; max length = 5.
    expect(editRatio('hello', 'hallo')).toBeCloseTo(0.2, 5)
  })

  it('measures insertion at the end correctly', () => {
    // "foo" -> "foobar" = 3 inserts; max length = 6.
    expect(editRatio('foo', 'foobar')).toBeCloseTo(0.5, 5)
  })

  it('is symmetric', () => {
    const a = 'The quick brown fox jumps over the lazy dog.'
    const b = 'The quick brown fox leaps over the lazy cat.'
    expect(editRatio(a, b)).toBeCloseTo(editRatio(b, a), 10)
  })

  it('is below 0.20 for tiny author touch-ups (AI gate should reject)', () => {
    const ai = 'The sun rose slowly over the quiet village, painting the rooftops gold.'
    // Author changed exactly three characters.
    const final = 'The sun rose slowly over the quiet village, painting the rooftops red!'
    expect(editRatio(ai, final)).toBeLessThan(0.2)
  })

  it('is above 0.20 for substantive rewrites (AI gate should accept)', () => {
    const ai = 'The sun rose slowly over the quiet village, painting the rooftops gold.'
    const final = 'Dawn crept through the fog, and the old fisherman pushed his boat out to sea.'
    expect(editRatio(ai, final)).toBeGreaterThan(0.2)
  })

  it('scales with string size without running unreasonably slow', () => {
    const base = 'chapter content '.repeat(500) // ~8000 chars
    const edited = base.replace(/chapter/g, 'section') // substitution every ~15 chars
    const ratio = editRatio(base, edited)
    expect(ratio).toBeGreaterThan(0)
    expect(ratio).toBeLessThan(1)
  })
})

describe('aggregateEditRatio', () => {
  it('returns 0 for empty input', () => {
    expect(aggregateEditRatio([])).toBe(0)
  })

  it('weights by the longer string in each pair', () => {
    const pairs = [
      // Tiny chapter with huge ratio contributes little…
      { draft: 'ab', final: 'xy' }, // ratio 1.0, max_len 2
      // …while the big chapter with near-zero ratio dominates.
      { draft: 'x'.repeat(100), final: 'x'.repeat(100) } // ratio 0.0, max_len 100
    ]
    const ratio = aggregateEditRatio(pairs)
    // total distance = 1.0 * 2 + 0 * 100 = 2; total length = 102 → ~0.0196
    expect(ratio).toBeGreaterThan(0)
    expect(ratio).toBeLessThan(0.05)
  })

  it('returns the same value as editRatio for a single pair', () => {
    const single = aggregateEditRatio([{ draft: 'hello', final: 'hallo' }])
    expect(single).toBeCloseTo(editRatio('hello', 'hallo'), 10)
  })

  it('is 0 when every pair is identical', () => {
    const pairs = [
      { draft: 'alpha', final: 'alpha' },
      { draft: 'beta beta beta', final: 'beta beta beta' }
    ]
    expect(aggregateEditRatio(pairs)).toBe(0)
  })
})
