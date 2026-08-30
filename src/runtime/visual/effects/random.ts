/** Fast non-cryptographic PRNG for audiovisual texture and timing. */

export type FastRandom = () => number

function normalizeSeed(seed: number): number {
  const normalized = seed >>> 0
  return normalized === 0 ? 0x6d2b79f5 : normalized
}

/** Creates a deterministic Mulberry32 generator for tests and isolated consumers. */
export function createFastRandom(seed: number): FastRandom {
  let state = normalizeSeed(seed)
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000
  }
}

function seedFromCrypto(): number {
  const values = new Uint32Array(1)
  globalThis.crypto.getRandomValues(values)
  return values[0] ?? 0
}

let sharedRandom = createFastRandom(seedFromCrypto())

/** Shared runtime generator, seeded once from the platform CSPRNG. */
export const fastRandom: FastRandom = () => sharedRandom()

/** Replaces the shared seed for deterministic runtime tests. */
export function setFastRandomSeedForTests(seed: number): void {
  sharedRandom = createFastRandom(seed)
}
