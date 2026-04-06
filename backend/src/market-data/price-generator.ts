/**
 * Pure functions for simulating price ticks via random walk.
 * Kept stateless for unit testability.
 */

export interface PriceTick {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  timestamp: number;
}

/**
 * Box-Muller transform: produces a sample from N(0,1)
 * using two uniform random numbers in (0,1).
 */
export function boxMuller(rng: () => number = Math.random): number {
  let u1 = rng();
  let u2 = rng();
  // Avoid log(0)
  if (u1 === 0) u1 = Number.EPSILON;
  if (u2 === 0) u2 = Number.EPSILON;
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Generates the next price using a random walk with drift.
 * @param prevPrice  the previous price (must be positive)
 * @param volatility the per-tick standard deviation as a fraction (e.g., 0.02 = 2%)
 * @param drift      optional per-tick drift as a fraction (default 0)
 * @param rng        optional RNG (defaults to Math.random) for testability
 * @returns the next price, always > 0
 */
export function nextPrice(
  prevPrice: number,
  volatility: number,
  drift = 0,
  rng: () => number = Math.random,
): number {
  const z = boxMuller(rng);
  const change = prevPrice * (drift + volatility * z);
  const next = prevPrice + change;
  // Hard floor to keep prices positive
  return Math.max(0.01, next);
}
