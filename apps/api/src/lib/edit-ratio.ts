/**
 * Edit-ratio utility used by the human/AI collaboration gate on
 * `POST /api/books/:id/publish` (PRD Task 3.4).
 *
 * Given an AI draft `a` and a final (author-edited) body `b`, we compute
 * the Levenshtein distance between the two strings and divide by the
 * length of the longer string.
 *
 * Rationale:
 *   - Levenshtein captures insertions, deletions, and substitutions,
 *     which matches the "how much of this is the human's edit vs. the
 *     raw AI output" question better than a token diff.
 *   - Dividing by `max(len(a), len(b))` normalises the result to [0, 1],
 *     so the gate threshold (0.20) is interpretable as "at least 20%
 *     of the larger text had to change to get from draft to final".
 *
 * Complexity: O(|a| * |b|) time, O(min(|a|, |b|)) extra space. Chapters
 * are capped at 50k chars (see `chapterSchema`), so even the worst case
 * is well under 1s on a Worker isolate.
 */

export function editRatio(a: string, b: string): number {
  // If both are empty, there is nothing to compare — treat as "identical".
  if (a.length === 0 && b.length === 0) return 0
  // If exactly one is empty, the edit distance equals the length of the
  // other — the ratio is therefore 1 (completely different).
  if (a.length === 0 || b.length === 0) return 1

  // Cheap fast path: identical strings need no computation.
  if (a === b) return 0

  // Ensure `a` is the shorter string so `dp` stays O(min(|a|, |b|)).
  if (a.length > b.length) {
    const tmp = a
    a = b
    b = tmp
  }

  const m = a.length
  const n = b.length

  // `dp[j]` holds the edit distance between `a[0..i-1]` and `b[0..j-1]`
  // for the current row `i`. We roll a single 1D buffer.
  const dp: number[] = new Array(m + 1)
  for (let j = 0; j <= m; j++) dp[j] = j

  for (let i = 1; i <= n; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= m; j++) {
      const tmp = dp[j]
      if (b[i - 1] === a[j - 1]) {
        dp[j] = prev
      } else {
        dp[j] = Math.min(prev, dp[j], dp[j - 1]) + 1
      }
      prev = tmp
    }
  }

  return dp[m] / Math.max(m, n)
}

/**
 * Aggregate edit ratio across a list of (draft, final) pairs, weighted
 * by the length of the longer string in each pair. This means a tiny
 * forewords chapter cannot single-handedly drag the ratio above the
 * gate when the main chapters are nearly unchanged, and vice versa.
 */
export function aggregateEditRatio(pairs: Array<{ draft: string; final: string }>): number {
  if (pairs.length === 0) return 0
  let totalDistance = 0
  let totalLength = 0
  for (const { draft, final } of pairs) {
    const maxLen = Math.max(draft.length, final.length)
    if (maxLen === 0) continue
    const r = editRatio(draft, final)
    totalDistance += r * maxLen
    totalLength += maxLen
  }
  if (totalLength === 0) return 0
  return totalDistance / totalLength
}
