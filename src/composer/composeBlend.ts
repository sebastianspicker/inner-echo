/**
 * Weighted parameter merge and stack-ordering helpers for composition.
 * Used by composeCore to blend preset and dimension contributions.
 */

import type { VideoStackNodeDef } from '../conditions/schema'
import { clamp01, type MotifDef } from './types'

export type SourceId = string

/**
 * Security: Prevents Prototype Pollution by filtering out forbidden keys.
 */
function isSafeKey(key: string): boolean {
  if (typeof key !== 'string') return false
  const k = key.trim()
  return k !== '__proto__' && k !== 'constructor' && k !== 'prototype'
}

export function mergeNumericWeighted(items: Array<{ w: number; v: number }>): number {
  let sumW = 0
  let sum = 0
  for (const it of items) {
    const w = clamp01(it.w)
    const v = it.v
    if (!Number.isFinite(v) || w <= 0) continue
    sumW += w
    sum += v * w
  }
  if (sumW <= 0) return 0
  return sum / sumW
}

export function mergeParams(
  contribs: Array<{ w: number; params: Record<string, unknown>; source: SourceId }>,
): Record<string, unknown> {
  const keys = new Set<string>()
  for (const c of contribs) {
    const p = c.params ?? {}
    for (const k of Object.keys(p)) {
      if (isSafeKey(k)) keys.add(k)
    }
  }
  const out: Record<string, unknown> = {}
  const orderedKeys = Array.from(keys).sort((a, b) => a.localeCompare(b))
  for (const k of orderedKeys) {
    const numerics: Array<{ w: number; v: number }> = []
    const nonNumerics: Array<{ w: number; v: unknown; source: SourceId }> = []
    for (const c of contribs) {
      const v = c.params?.[k]
      if (typeof v === 'number') numerics.push({ w: c.w, v })
      else if (v != null) nonNumerics.push({ w: c.w, v, source: c.source })
    }
    if (numerics.length) {
      out[k] = mergeNumericWeighted(numerics)
    } else if (nonNumerics.length) {
      nonNumerics.sort((a, b) => {
        const dw = clamp01(b.w) - clamp01(a.w)
        if (dw !== 0) return dw
        return a.source.localeCompare(b.source)
      })
      out[k] = nonNumerics[0].v
    }
  }
  return out
}

export function sortStackKeys<
  T extends { key: string; node: string; minIndex: number; minOrderGroup: number },
>(items: T[]): T[] {
  return items.sort((a, b) => {
    if (a.minOrderGroup !== b.minOrderGroup) return a.minOrderGroup - b.minOrderGroup
    if (a.minIndex !== b.minIndex) return a.minIndex - b.minIndex
    const dn = a.node.localeCompare(b.node)
    if (dn !== 0) return dn
    return a.key.localeCompare(b.key)
  })
}

export const VIDEO_ORDER_GROUP: Record<string, number> = {
  grain: 10,
  edge_sharpen: 20,
  soft_blur: 22,
  vignette: 25,
  haze: 30,
  color_grade: 40,
  chromatic_aberration: 50,
  temporal_smear: 60,
  feedback_loop: 70,
  pulse: 80,
  interference: 90,
  focus_jitter: 95,
  grid_hint: 100,
}

export const AUDIO_ORDER_GROUP: Record<string, number> = {
  noise_bed: 10,
  highpass: 20,
  lowpass: 30,
  tremolo: 40,
  flutter: 45,
  delay: 60,
  reverb: 70,
  pulse_tone: 80,
  compressor_limiter: 90,
}

export function normalizeNodeType(s: string): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
}

export function makeIdForNode(def: { id?: string; node: string }): string {
  return (def.id ?? def.node ?? '').toString()
}

/**
 * Deduplicate IDs in a stack: when multiple entries share the same `id`,
 * append a counter suffix (`_1`, `_2`, ...) so each entry is distinguishable
 * in debug views. Entries with unique IDs are left untouched.
 */
export function deduplicateStackIds<T extends { id: string }>(items: T[]): T[] {
  const counts = new Map<string, number>()
  for (const it of items) {
    counts.set(it.id, (counts.get(it.id) ?? 0) + 1)
  }
  const seen = new Map<string, number>()
  return items.map((it) => {
    const total = counts.get(it.id) ?? 1
    if (total <= 1) return it
    const idx = (seen.get(it.id) ?? 0) + 1
    seen.set(it.id, idx)
    return { ...it, id: `${it.id}_${idx}` }
  })
}

export function mergeWarnings(lists: string[][]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const list of lists) {
    for (const w of list ?? []) {
      const s = String(w).trim()
      if (!s || seen.has(s)) continue
      seen.add(s)
      out.push(s)
    }
  }
  return out
}

export function mergeDisableNodes(lists: Array<string[] | undefined>): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const list of lists) {
    for (const n of list ?? []) {
      const s = String(n).trim().toLowerCase()
      if (!s || seen.has(s)) continue
      seen.add(s)
      out.push(s)
    }
  }
  return out.sort((a, b) => a.localeCompare(b))
}

export function mergeSafeModeClamps(
  items: Array<Record<string, unknown> | undefined>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const keys = new Set<string>()
  for (const it of items) {
    const obj = it ?? {}
    for (const k of Object.keys(obj)) {
      if (isSafeKey(k)) keys.add(k)
    }
  }
  for (const k of Array.from(keys).sort((a, b) => a.localeCompare(b))) {
    const vs = items.map((it) => it?.[k]).filter((v) => v != null)
    if (!vs.length) continue
    const numVs = vs.filter((v): v is number => typeof v === 'number')
    if (numVs.length === vs.length) {
      out[k] = Math.min(...numVs)
      continue
    }
    const boolVs = vs.filter((v): v is boolean => typeof v === 'boolean')
    if (boolVs.length === vs.length) {
      // OR semantics: if ANY preset sets the flag, the merged result is true.
      // This is correct for "no_" prefixed keys (e.g. no_strobe) where true = safe,
      // so any single preset requesting safety wins.
      out[k] = boolVs.some(Boolean)
      continue
    }
    out[k] = vs[0]
  }
  return out
}

function parseNumberHints(hint: unknown): number[] {
  if (typeof hint !== 'string') return []
  const nums = hint.match(/-?\d+(\.\d+)?/g) ?? []
  return nums.map((s) => Number(s)).filter((n) => Number.isFinite(n))
}

function pickFromHint(hint: unknown, strength01: number): unknown {
  const nums = parseNumberHints(hint)
  if (nums.length >= 2) {
    const a = nums[0]
    const b = nums[1]
    const lo = Math.min(a, b)
    const hi = Math.max(a, b)
    return lo + (hi - lo) * clamp01(strength01)
  }
  if (nums.length === 1) return nums[0]
  if (typeof hint === 'string') {
    const s = hint.toLowerCase()
    if (s.includes('pink')) return 'pink'
    if (s.includes('brown')) return 'brown'
    if (s.includes('white')) return 'white'
  }
  return undefined
}

/**
 * Scale all numeric values in a params record by `strength`, leaving non-numeric values unchanged.
 */
export function scaleNumericParams(
  params: Record<string, unknown>,
  strength: number,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(params)) {
    out[k] = typeof v === 'number' ? v * strength : v
  }
  return out
}

export function motifsToVideoDefs(
  motifs: MotifDef[] | undefined,
  strength = 1,
): VideoStackNodeDef[] {
  if (!motifs?.length) return []
  return motifs.map((m) => {
    const node = normalizeNodeType(m.node)
    const hint = m.params_hint ?? {}
    const params: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(hint)) {
      const chosen = pickFromHint(v, strength)
      if (chosen != null) params[k] = chosen
    }
    return { id: node, node, params }
  })
}

export function motifsToAudioDefs(
  motifs: MotifDef[] | undefined,
  strength = 1,
): Array<{ node: string; params: Record<string, unknown> }> {
  if (!motifs?.length) return []
  return motifs.map((m) => {
    const node = normalizeNodeType(m.node)
    const hint = m.params_hint ?? {}
    const params: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(hint)) {
      const chosen = pickFromHint(v, strength)
      if (chosen != null) params[k] = chosen
    }
    return { node, params }
  })
}
