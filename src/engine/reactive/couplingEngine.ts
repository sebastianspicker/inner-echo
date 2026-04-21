/**
 * Coupling Engine
 *
 * This module manages "cross-domain coupling", meaning it allows the Video to affect the Audio,
 * and the Audio to affect the Video in subtle, complex feedback loops.
 *
 * Example:
 * - If the user is speaking loudly (High Audio RMS), the video might become more grainy or vignette heavily.
 * - If the video is highly unstable (High Motion metrics), the audio might develop a tremolo effect or
 *   the lowpass filter might open up.
 *
 * It runs every frame within the main WebGL render loop, taking both AudioMetrics and VideoMetrics
 * to produce real-time smoothed parameter overrides.
 */

import type { Profile } from '../../conditions/schema'
import {
  getProfileEntryForBuiltIndex,
  NODE_FACTORY,
  shouldSkipNode,
} from '../../conditions/graphBuilder'
import { getReducedMotionDisableNodes } from '../../conditions/normalize'
import type { AudioMetrics } from '../audio'
import type { VideoMetrics } from '../canvas'

export interface CouplingSettings {
  couplingStrength: number // 0..1
  maxFeedback: number // 0..1 hard cap
  reducedMotion: boolean
  safeMode: boolean
}

export interface CouplingStepResult {
  video: Record<string, number>
  audio: Record<string, number>
}

import { clamp, clamp01, smoothStep } from '../../utils/numeric'

type Mapping = {
  kind: 'video' | 'audio'
  key: string
  attack: number
  release: number
  clampMin: number
  clampMax: number
  /** Base value for audio params (read once from profile); video bases come from UI/controlValues. */
  base0?: number
  // compute target absolute value
  compute: (audio: AudioMetrics, video: VideoMetrics, strength: number, base: number) => number
  smoothed: number
}

function getBaseNumeric(
  baseControlValues: Record<string, number | boolean>,
  key: string,
  fallback: number,
): number {
  const v = baseControlValues[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function getProfileVideoBase(profile: Profile, key: string, reducedMotion: boolean): number {
  // key is "builtIndex.param"
  const dot = key.indexOf('.')
  if (dot <= 0) return 0
  const builtIndex = Number(key.slice(0, dot))
  const param = key.slice(dot + 1)
  if (!Number.isFinite(builtIndex) || !param) return 0
  const entry = getProfileEntryForBuiltIndex(profile, builtIndex, { reducedMotion })
  const params = entry?.params
  const v = params?.[param]
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

function getProfileAudioBase(profile: Profile, key: string): number {
  // key is "audio.<chainIndex>.<param>"
  const parts = key.split('.')
  if (parts.length < 3) return 0
  const idx = Number(parts[1])
  if (!Number.isFinite(idx) || idx < 0) return 0
  const param = parts.slice(2).join('.')
  const chain = profile.audio_stack?.chain ?? []
  const params = chain[idx]?.params
  const v = params?.[param]
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

/**
 * Build a mapping from lowercase node id/type to built indices, scanning the
 * video stack only once. Reused by all video key lookups for the same profile
 * and reducedMotion setting.
 */
function buildVideoNodeIndex(profile: Profile, reducedMotion: boolean): Map<string, number[]> {
  const index = new Map<string, number[]>()
  let builtIndex = 0
  const reducedMotionDisable = getReducedMotionDisableNodes(profile)
  for (const def of profile.video_stack) {
    const nodeType = def.node
    if (!nodeType || typeof nodeType !== 'string') continue
    if (shouldSkipNode(nodeType, reducedMotion, reducedMotionDisable)) continue
    if (!NODE_FACTORY[nodeType]) continue
    const entryId = (def.id ?? nodeType).toLowerCase()
    const entryType = nodeType.toLowerCase()
    for (const key of [entryId, entryType]) {
      let arr = index.get(key)
      if (!arr) {
        arr = []
        index.set(key, arr)
      }
      if (!arr.includes(builtIndex)) arr.push(builtIndex)
    }
    builtIndex++
  }
  return index
}

function resolveVideoKeysFromIndex(videoIndex: Map<string, number[]>, target: string): string[] {
  const t = target.trim().toLowerCase()
  if (!t.startsWith('video.')) return []
  const rest = t.slice(6)
  const dot = rest.indexOf('.')
  if (dot === -1) return []
  const nodeId = rest.slice(0, dot)
  const param = rest.slice(dot + 1)
  const indices = videoIndex.get(nodeId) ?? []
  return indices.map((i) => `${i}.${param}`)
}

function resolveAudioKeys(profile: Profile, nodeId: string, param: string): string[] {
  const chain = profile.audio_stack?.chain ?? []
  const indices: number[] = []
  chain.forEach((n, idx) => {
    if ((n.id ?? n.node ?? '').toLowerCase() === nodeId.toLowerCase()) {
      indices.push(idx)
    }
  })
  return indices.map((idx) => `audio.${idx}.${param}`)
}

/**
 * Creates a coupling engine instance for the given profile and UI settings.
 *
 * It pre-calculates which specific audio/video parameters exist in the current profile
 * (e.g., checking if the 'noise_bed' or 'pulse' nodes actually exist in the stack).
 * If they don't, it skips coupling them to save CPU cycles.
 *
 * @param profile The active condition profile.
 * @param settings The user's current UI slider settings (Coupling Strength, Safe Mode, etc.)
 */
export function createCouplingEngine(
  profile: Profile,
  settings: CouplingSettings,
): {
  setSettings: (
    next: Pick<CouplingSettings, 'couplingStrength' | 'maxFeedback' | 'safeMode'> & {
      reducedMotion?: boolean
    },
  ) => void
  step: (
    deltaSec: number,
    audio: AudioMetrics,
    video: VideoMetrics,
    baseControlValues: Record<string, number | boolean>,
  ) => CouplingStepResult
} {
  let reducedMotion = settings.reducedMotion
  let couplingStrength = clamp01(settings.couplingStrength)
  let maxFeedback = clamp01(settings.maxFeedback)
  let safeMode = settings.safeMode === true

  let videoIndex = buildVideoNodeIndex(profile, reducedMotion)
  let videoGrainAmounts = resolveVideoKeysFromIndex(videoIndex, 'video.grain.amount')
  let videoVignetteAmounts = resolveVideoKeysFromIndex(videoIndex, 'video.vignette.amount')
  let videoInterferenceAmounts = resolveVideoKeysFromIndex(videoIndex, 'video.interference.amount')
  let videoSharpenAmounts = resolveVideoKeysFromIndex(videoIndex, 'video.edge_sharpen.amount')
  let videoChromaAmounts = resolveVideoKeysFromIndex(videoIndex, 'video.chroma_aberration.amount')
  let videoPulseDepths = resolveVideoKeysFromIndex(videoIndex, 'video.pulse.depth')

  const audioTremoloRates = resolveAudioKeys(profile, 'tremolo', 'rate')
  const audioTremoloDepths = resolveAudioKeys(profile, 'tremolo', 'depth')
  const audioLowpassCutoffs = resolveAudioKeys(profile, 'lowpass', 'cutoff')
  const audioNoiseLevels = resolveAudioKeys(profile, 'noise_bed', 'level')

  const micRmsOr = (a: AudioMetrics) => (typeof a.micRms === 'number' ? a.micRms : a.rms)
  const micCentroidOr = (a: AudioMetrics) =>
    typeof a.micCentroid === 'number' ? a.micCentroid : a.centroid
  const micFluxOr = (a: AudioMetrics) => (typeof a.micFlux === 'number' ? a.micFlux : a.flux)

  function buildVideoMappings(): Mapping[] {
    const out: Mapping[] = []
    for (const k of videoGrainAmounts) {
      out.push({
        kind: 'video',
        key: k,
        attack: 0.12,
        release: 0.35,
        clampMin: 0,
        clampMax: 0.5,
        smoothed: 0,
        compute: (a, _v, strength, base) => base + micRmsOr(a) * (0.18 * strength),
      })
    }
    for (const k of videoVignetteAmounts) {
      out.push({
        kind: 'video',
        key: k,
        attack: 0.18,
        release: 0.45,
        clampMin: 0,
        clampMax: 0.6,
        smoothed: 0,
        compute: (a, _v, strength, base) => base + micRmsOr(a) * (0.1 * strength),
      })
    }
    for (const k of videoInterferenceAmounts) {
      out.push({
        kind: 'video',
        key: k,
        attack: 0.25,
        release: 0.6,
        clampMin: 0,
        clampMax: 0.2,
        smoothed: 0,
        compute: (a, _v, strength, base) => base + micRmsOr(a) * (0.08 * strength),
      })
    }
    for (const k of videoSharpenAmounts) {
      out.push({
        kind: 'video',
        key: k,
        attack: 0.35,
        release: 0.7,
        clampMin: 0,
        clampMax: 0.2,
        smoothed: 0,
        compute: (a, _v, strength, base) => base + micCentroidOr(a) * (0.06 * strength),
      })
    }
    for (const k of videoChromaAmounts) {
      out.push({
        kind: 'video',
        key: k,
        attack: 0.35,
        release: 0.8,
        clampMin: 0,
        clampMax: 0.25,
        smoothed: 0,
        compute: (a, _v, strength, base) =>
          base + Math.max(0, micCentroidOr(a) - 0.4) * (0.08 * strength),
      })
    }
    for (const k of videoPulseDepths) {
      out.push({
        kind: 'video',
        key: k,
        attack: 0.35,
        release: 0.9,
        clampMin: 0,
        clampMax: 0.18,
        smoothed: 0,
        compute: (a, _v, strength, base) => base + micFluxOr(a) * (0.06 * strength),
      })
    }
    return out
  }

  function buildAudioMappings(): Mapping[] {
    const out: Mapping[] = []
    for (const k of audioTremoloDepths) {
      const base0 = getProfileAudioBase(profile, k)
      out.push({
        kind: 'audio',
        key: k,
        attack: 0.25,
        release: 0.6,
        clampMin: 0,
        clampMax: 0.15,
        base0,
        smoothed: base0,
        compute: (_a, v, strength, base) => base + v.motion * (0.05 * strength),
      })
    }
    for (const k of audioTremoloRates) {
      const base0 = getProfileAudioBase(profile, k)
      out.push({
        kind: 'audio',
        key: k,
        attack: 0.35,
        release: 0.8,
        clampMin: 0.1,
        clampMax: 4,
        base0,
        smoothed: base0,
        compute: (_a, v, strength, base) => base + v.motion * (1.0 * strength),
      })
    }
    for (const k of audioLowpassCutoffs) {
      const base0 = getProfileAudioBase(profile, k)
      out.push({
        kind: 'audio',
        key: k,
        attack: 0.4,
        release: 0.9,
        clampMin: 300,
        clampMax: 12000,
        base0,
        smoothed: base0,
        compute: (_a, v, strength, base) => {
          const delta = (v.luminance - 0.5) * 2000 * strength
          return base + delta
        },
      })
    }
    for (const k of audioNoiseLevels) {
      const base0 = getProfileAudioBase(profile, k)
      out.push({
        kind: 'audio',
        key: k,
        attack: 0.25,
        release: 0.65,
        clampMin: 0,
        clampMax: 0.08,
        base0,
        smoothed: base0,
        compute: (_a, v, strength, base) => base + v.edge * (0.02 * strength),
      })
    }
    return out
  }

  function rebuildVideoKeys(): void {
    videoIndex = buildVideoNodeIndex(profile, reducedMotion)
    videoGrainAmounts = resolveVideoKeysFromIndex(videoIndex, 'video.grain.amount')
    videoVignetteAmounts = resolveVideoKeysFromIndex(videoIndex, 'video.vignette.amount')
    videoInterferenceAmounts = resolveVideoKeysFromIndex(videoIndex, 'video.interference.amount')
    videoSharpenAmounts = resolveVideoKeysFromIndex(videoIndex, 'video.edge_sharpen.amount')
    videoChromaAmounts = resolveVideoKeysFromIndex(videoIndex, 'video.chroma_aberration.amount')
    videoPulseDepths = resolveVideoKeysFromIndex(videoIndex, 'video.pulse.depth')
    const audioMappings = mappings.filter((m) => m.kind === 'audio')
    mappings = [...buildVideoMappings(), ...audioMappings]
  }

  let mappings: Mapping[] = [...buildVideoMappings(), ...buildAudioMappings()]

  return {
    setSettings(next) {
      couplingStrength = clamp01(next.couplingStrength)
      maxFeedback = clamp01(next.maxFeedback)
      safeMode = next.safeMode === true
      if (typeof next.reducedMotion === 'boolean' && next.reducedMotion !== reducedMotion) {
        reducedMotion = next.reducedMotion
        rebuildVideoKeys()
      }
    },
    step(deltaSec, audio, video, baseControlValues) {
      const safetyDamping = safeMode ? 0.6 : 1
      const strength = couplingStrength * maxFeedback * safetyDamping
      const outVideo: Record<string, number> = {}
      const outAudio: Record<string, number> = {}

      for (const m of mappings) {
        let base = 0
        if (m.kind === 'video') {
          base = getBaseNumeric(
            baseControlValues,
            m.key,
            getProfileVideoBase(profile, m.key, reducedMotion),
          )
        } else {
          base = m.base0 ?? 0
        }

        const target = m.compute(audio, video, strength, base)
        const smoothed = smoothStep(m.smoothed, target, deltaSec, m.attack, m.release)
        m.smoothed = smoothed
        const v = clamp(smoothed, m.clampMin, m.clampMax)
        if (m.kind === 'video') outVideo[m.key] = v
        else outAudio[m.key] = v
      }

      return { video: outVideo, audio: outAudio }
    },
  }
}
