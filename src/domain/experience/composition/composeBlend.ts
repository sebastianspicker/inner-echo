/**
 * Weighted parameter merge and stack-ordering helpers for composition.
 * Used by composeCore to blend preset and dimension contributions.
 */

import type { VideoStackNodeDef } from '../schema'
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
  const keys = collectSafeKeys(contribs)
  const out: Record<string, unknown> = {}
  for (const key of Array.from(keys).sort((a, b) => a.localeCompare(b))) {
    const value = mergeParamForKey(contribs, key)
    if (value !== undefined) out[key] = value
  }
  return out
}

function collectSafeKeys(contribs: Array<{ params: Record<string, unknown> }>): Set<string> {
  const keys = new Set<string>()
  for (const c of contribs) {
    const p = c.params ?? {}
    for (const k of Object.keys(p)) {
      if (isSafeKey(k)) keys.add(k)
    }
  }
  return keys
}

function mergeParamForKey(
  contribs: Array<{ w: number; params: Record<string, unknown>; source: SourceId }>,
  key: string,
): unknown {
  const numerics: Array<{ w: number; v: number }> = []
  const nonNumerics: Array<{ w: number; v: unknown; source: SourceId }> = []
  for (const contribution of contribs) {
    const value = contribution.params?.[key]
    if (typeof value === 'number') numerics.push({ w: contribution.w, v: value })
    else if (value != null)
      nonNumerics.push({ w: contribution.w, v: value, source: contribution.source })
  }
  if (numerics.length) return mergeNumericWeighted(numerics)
  return pickHighestWeightedValue(nonNumerics)
}

function pickHighestWeightedValue(
  items: Array<{ w: number; v: unknown; source: SourceId }>,
): unknown {
  items.sort((a, b) => clamp01(b.w) - clamp01(a.w) || a.source.localeCompare(b.source))
  return items[0]?.v
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
  chroma_aberration: 50,
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
  for (const key of Array.from(keys).sort((a, b) => a.localeCompare(b))) {
    const value = mergeClampValue(items, key)
    if (value !== undefined) out[key] = value
  }
  return out
}

function mergeClampValue(items: Array<Record<string, unknown> | undefined>, key: string): unknown {
  const values = items.map((item) => item?.[key]).filter((value) => value != null)
  if (!values.length) return undefined
  if (values.every((value): value is number => typeof value === 'number'))
    return Math.min(...values)
  if (values.every((value): value is boolean => typeof value === 'boolean'))
    return values.some(Boolean)
  return values[0]
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

function motifsToDefs(
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

export function motifsToVideoDefs(
  motifs: MotifDef[] | undefined,
  strength = 1,
): VideoStackNodeDef[] {
  return motifsToDefs(motifs, strength).map(({ node, params }) => ({ id: node, node, params }))
}

export function motifsToAudioDefs(
  motifs: MotifDef[] | undefined,
  strength = 1,
): Array<{ node: string; params: Record<string, unknown> }> {
  return motifsToDefs(motifs, strength)
}
