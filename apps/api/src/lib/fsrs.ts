/**
 * FSRS (Free Spaced Repetition Scheduler) v6 Implementation
 * Based on open-spaced-repetition/fsrs4anki
 * 
 * DSR Model: Difficulty-Stability-Retrievability
 */

export interface FSRSState {
  d: number // Difficulty (1-10)
  s: number // Stability (days to 90% recall)
  r: number // Retrievability (0-1)
  lastReview: number // Unix timestamp (seconds)
  nextReview: number // Unix timestamp (seconds)
  reps: number // Total reviews
  lapses: number // Total failures (Again)
  state: CardState // 0=New, 1=Learning, 2=Review, 3=Relearning
}

export enum CardState {
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3,
}

export enum Grade {
  Again = 1, // Forgot
  Hard = 2,  // Difficult
  Good = 3,  // Normal
  Easy = 4,  // Easy
}

// Default weights (from FSRS-6 paper, can be trained per-user)
const DEFAULT_WEIGHTS = [
  0.4, 0.6, 2.4, 5.8, // w0-w3: initial stability for grades 1-4
  4.93, 0.94, 0.86, 0.01, // w4-w7: difficulty and stability modifiers
  1.49, 0.14, 0.94, 2.18, // w8-w11: difficulty update
  0.05, 0.34, 1.26, 0.29, // w12-w15: short-term stability
  2.61, 0.41, 0.72, 0.32, // w16-w19: various modifiers
  0.9, // w20: retrievability exponent (power-law)
]

export interface FSRSWeights {
  w: number[]
}

export interface ReviewResult {
  state: FSRSState
  elapsedDays: number
  scheduledDays: number
}

/**
 * Calculate retrievability R(t) = (1 + t/S)^(-w20)
 */
export function retrievability(
  elapsedDays: number,
  stability: number,
  weights: number[] = DEFAULT_WEIGHTS
): number {
  if (stability <= 0) return 1.0
  const w20 = weights[20] ?? 0.9
  return Math.pow(1 + elapsedDays / stability, -w20)
}

/**
 * Calculate next interval given desired retention
 */
export function nextInterval(
  stability: number,
  desiredRetention: number = 0.9,
  weights: number[] = DEFAULT_WEIGHTS
): number {
  if (stability <= 0) return 1
  const w20 = weights[20] ?? 0.9
  // Solve: desiredRetention = (1 + t/S)^(-w20)
  // t = S * ((1/desiredRetention)^(1/w20) - 1)
  const t = stability * (Math.pow(1 / desiredRetention, 1 / w20) - 1)
  return Math.max(1, Math.round(t))
}

/**
 * Initialize new card state based on first grade
 */
export function initState(
  grade: Grade,
  weights: number[] = DEFAULT_WEIGHTS
): FSRSState {
  const now = Math.floor(Date.now() / 1000)
  const initialStability = weights[grade - 1] ?? 0.4
  const initialDifficulty = 5.0 + weights[4] * (3 - grade)
  
  return {
    d: clamp(initialDifficulty, 1, 10),
    s: initialStability,
    r: 1.0,
    lastReview: now,
    nextReview: now + 86400, // Next day for new cards
    reps: 1,
    lapses: 0,
    state: CardState.Learning,
  }
}

/**
 * Update state after review
 */
export function review(
  state: FSRSState,
  grade: Grade,
  weights: number[] = DEFAULT_WEIGHTS,
  desiredRetention: number = 0.9
): ReviewResult {
  const now = Math.floor(Date.now() / 1000)
  const elapsedDays = Math.max(0, (now - state.lastReview) / 86400)
  
  // Calculate current retrievability
  const currentR = retrievability(elapsedDays, state.s, weights)
  
  let newD: number
  let newS: number
  let newState: CardState
  let scheduledDays: number
  
  if (grade === Grade.Again) {
    // Failed review
    newD = state.d + weights[8] * (1 - 3) * (1 - currentR)
    newS = Math.min(state.s * Math.exp(weights[7]), state.s)
    newState = CardState.Relearning
    scheduledDays = 1
  } else {
    // Successful review
    const hardBonus = grade === Grade.Hard ? weights[15] : 1.0
    const easyBonus = grade === Grade.Easy ? weights[16] : 1.0
    
    newD = state.d + weights[8] * (grade - 3) * (1 - currentR)
    
    const stabilityIncrease = 1 + Math.exp(weights[6]) * (11 - newD) * Math.pow(state.s, -weights[9]) * (Math.exp((1 - currentR) * weights[10]) - 1)
    newS = state.s * stabilityIncrease * hardBonus * easyBonus
    newState = CardState.Review
    scheduledDays = nextInterval(newS, desiredRetention, weights)
  }
  
  // Clamp values
  newD = clamp(newD, 1, 10)
  newS = Math.max(0.1, newS)
  
  const newState_obj: FSRSState = {
    d: newD,
    s: newS,
    r: retrievability(0, newS, weights), // R at t=0 is 1.0
    lastReview: now,
    nextReview: now + scheduledDays * 86400,
    reps: state.reps + 1,
    lapses: grade === Grade.Again ? state.lapses + 1 : state.lapses,
    state: newState,
  }
  
  return {
    state: newState_obj,
    elapsedDays,
    scheduledDays,
  }
}

/**
 * Get cards due for review
 */
export function getDueCards(
  cards: FSRSState[],
  now: number = Math.floor(Date.now() / 1000)
): FSRSState[] {
  return cards.filter((card) => card.nextReview <= now)
}

/**
 * Apply jitter to interval (±10%) to avoid cards clustering
 */
export function applyJitter(interval: number): number {
  const jitter = 0.9 + Math.random() * 0.2 // 0.9 to 1.1
  return Math.max(1, Math.round(interval * jitter))
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Serialize weights for storage
 */
export function serializeWeights(weights: number[]): string {
  return JSON.stringify(weights)
}

/**
 * Deserialize weights from storage
 */
export function deserializeWeights(weightsStr: string): number[] {
  try {
    const parsed = JSON.parse(weightsStr)
    if (Array.isArray(parsed) && parsed.length >= 21) {
      return parsed
    }
  } catch {
    // fall through
  }
  return [...DEFAULT_WEIGHTS]
}

export { DEFAULT_WEIGHTS }
