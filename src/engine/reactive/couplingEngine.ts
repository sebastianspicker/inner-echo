/**
 * Coupling Engine
 *
 * Per-profile AV coupling layer. It runs inside the WebGL frame loop and returns
 * small, smoothed, clamped overrides so audio metrics can nudge video parameters
 * and camera-derived video metrics can nudge audio FX parameters.
 *
 * This is a metaphorical feedback layer, not a clinical model. Keep new mappings
 * conservative and profile-specific so Safe Mode and Reduced Motion remain effective.
 */

import type { Profile } from '../../conditions/schema'
import {
  getProfileEntryForBuiltIndex,
  NODE_FACTORY,
  normalizeVideoNodeName,
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

const VIDEO_NODE_ALIASES: Record<string, string[]> = {
  chroma_aberration: ['chroma_aberration', 'chromatic_aberration'],
  chromatic_aberration: ['chromatic_aberration', 'chroma_aberration'],
}

const getBaseNumeric = (
  baseControlValues: Record<string, number | boolean>,
  key: string,
  fallback: number,
): number => {
  const v = baseControlValues[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

const getProfileVideoBase = (profile: Profile, key: string, reducedMotion: boolean): number => {
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

const getProfileAudioBase = (profile: Profile, key: string): number => {
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
const buildVideoNodeIndex = (profile: Profile, reducedMotion: boolean): Map<string, number[]> => {
  const index = new Map<string, number[]>()
  let builtIndex = 0
  const reducedMotionDisable = getReducedMotionDisableNodes(profile)
  for (const def of profile.video_stack) {
    const nodeType = def.node
    if (!nodeType || typeof nodeType !== 'string') continue
    if (shouldSkipNode(nodeType, reducedMotion, reducedMotionDisable)) continue
    const entryType = normalizeVideoNodeName(nodeType)
    if (!NODE_FACTORY[entryType]) continue
    const entryId = (def.id ?? nodeType).toLowerCase()
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

const resolveVideoKeysFromIndex = (videoIndex: Map<string, number[]>, target: string): string[] => {
  const t = target.trim().toLowerCase()
  if (!t.startsWith('video.')) return []
  const rest = t.slice(6)
  const dot = rest.indexOf('.')
  if (dot === -1) return []
  const nodeId = rest.slice(0, dot)
  const param = rest.slice(dot + 1)
  const nodeIds = VIDEO_NODE_ALIASES[nodeId] ?? [nodeId]
  const indices = new Set<number>()
  for (const id of nodeIds) {
    for (const index of videoIndex.get(id) ?? []) indices.add(index)
  }
  return [...indices].map((i) => `${i}.${param}`)
}

const resolveAudioKeys = (profile: Profile, nodeId: string, param: string): string[] => {
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
  let videoChromaAmounts = resolveVideoKeysFromIndex(
    videoIndex,
    'video.chromatic_aberration.amount',
  )
  let videoPulseDepths = resolveVideoKeysFromIndex(videoIndex, 'video.pulse.depth')
  let videoGazeAmounts = resolveVideoKeysFromIndex(videoIndex, 'video.gaze_tunnel.amount')
  let videoGazeEdgeGains = resolveVideoKeysFromIndex(videoIndex, 'video.gaze_tunnel.edge_gain')
  let videoSomaticDepths = resolveVideoKeysFromIndex(videoIndex, 'video.somatic_pulse.depth')
  let videoSomaticTunnels = resolveVideoKeysFromIndex(videoIndex, 'video.somatic_pulse.tunnel')
  let videoIntrusionAmounts = resolveVideoKeysFromIndex(videoIndex, 'video.intrusion_burst.amount')
  let videoSalienceAmounts = resolveVideoKeysFromIndex(
    videoIndex,
    'video.salience_competition.amount',
  )
  let videoSalienceShifts = resolveVideoKeysFromIndex(
    videoIndex,
    'video.salience_competition.shift',
  )
  let videoGlassVeils = resolveVideoKeysFromIndex(videoIndex, 'video.glass_veil.veil')
  let videoGlassRefractions = resolveVideoKeysFromIndex(videoIndex, 'video.glass_veil.refraction')

  const audioTremoloRates = resolveAudioKeys(profile, 'tremolo', 'rate')
  const audioTremoloDepths = resolveAudioKeys(profile, 'tremolo', 'depth')
  const audioLowpassCutoffs = resolveAudioKeys(profile, 'lowpass', 'cutoff')
  const audioNoiseLevels = resolveAudioKeys(profile, 'noise_bed', 'level')
  const audioDelayMixes = resolveAudioKeys(profile, 'delay', 'mix')
  const audioReverbMixes = resolveAudioKeys(profile, 'reverb', 'mix')
  const audioPulseToneMixes = resolveAudioKeys(profile, 'pulse_tone', 'mix')

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
    for (const k of videoGazeAmounts) {
      out.push({
        kind: 'video',
        key: k,
        attack: 0.18,
        release: 0.45,
        clampMin: 0,
        clampMax: 0.85,
        smoothed: 0,
        compute: (a, _v, strength, base) => base + micRmsOr(a) * (0.1 * strength),
      })
    }
    for (const k of videoGazeEdgeGains) {
      out.push({
        kind: 'video',
        key: k,
        attack: 0.25,
        release: 0.55,
        clampMin: 0,
        clampMax: 0.35,
        smoothed: 0,
        compute: (a, _v, strength, base) =>
          base + Math.max(0, micCentroidOr(a) - 0.35) * (0.08 * strength),
      })
    }
    for (const k of videoSomaticDepths) {
      out.push({
        kind: 'video',
        key: k,
        attack: 0.12,
        release: 0.45,
        clampMin: 0,
        clampMax: 0.18,
        smoothed: 0,
        compute: (a, _v, strength, base) =>
          base + (micRmsOr(a) * 0.04 + micFluxOr(a) * 0.05) * strength,
      })
    }
    for (const k of videoSomaticTunnels) {
      out.push({
        kind: 'video',
        key: k,
        attack: 0.16,
        release: 0.5,
        clampMin: 0,
        clampMax: 0.75,
        smoothed: 0,
        compute: (a, _v, strength, base) => base + micRmsOr(a) * (0.12 * strength),
      })
    }
    for (const k of videoIntrusionAmounts) {
      out.push({
        kind: 'video',
        key: k,
        attack: 0.08,
        release: 0.32,
        clampMin: 0,
        clampMax: 0.26,
        smoothed: 0,
        compute: (a, _v, strength, base) =>
          base + (micFluxOr(a) * 0.04 + micRmsOr(a) * 0.03) * strength,
      })
    }
    for (const k of videoSalienceAmounts) {
      out.push({
        kind: 'video',
        key: k,
        attack: 0.08,
        release: 0.28,
        clampMin: 0,
        clampMax: 0.3,
        smoothed: 0,
        compute: (a, _v, strength, base) =>
          base + (micCentroidOr(a) * 0.05 + micFluxOr(a) * 0.04) * strength,
      })
    }
    for (const k of videoSalienceShifts) {
      out.push({
        kind: 'video',
        key: k,
        attack: 0.08,
        release: 0.3,
        clampMin: 0,
        clampMax: 0.08,
        smoothed: 0,
        compute: (a, _v, strength, base) => base + micFluxOr(a) * (0.02 * strength),
      })
    }
    for (const k of videoGlassVeils) {
      out.push({
        kind: 'video',
        key: k,
        attack: 0.4,
        release: 0.9,
        clampMin: 0,
        clampMax: 0.45,
        smoothed: 0,
        compute: (a, v, strength, base) =>
          base + (micRmsOr(a) * 0.04 + Math.max(0, 0.5 - v.luminance) * 0.08) * strength,
      })
    }
    for (const k of videoGlassRefractions) {
      out.push({
        kind: 'video',
        key: k,
        attack: 0.35,
        release: 0.85,
        clampMin: 0,
        clampMax: 0.06,
        smoothed: 0,
        compute: (a, _v, strength, base) =>
          base + Math.max(0, micCentroidOr(a) - 0.4) * (0.018 * strength),
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
        compute: (a, v, strength, base) =>
          base + v.motion * (0.05 * strength) + micRmsOr(a) * (0.07 * strength),
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
        compute: (a, v, strength, base) =>
          base + v.motion * (1.0 * strength) + micFluxOr(a) * (1.2 * strength),
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
        compute: (a, v, strength, base) => {
          const delta = (v.luminance - 0.5) * 2000 * strength
          const micDelta =
            micRmsOr(a) * (1400 * strength) +
            Math.max(0, micCentroidOr(a) - 0.45) * (1200 * strength)
          return base + delta + micDelta
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
        compute: (a, v, strength, base) =>
          base + v.edge * (0.02 * strength) + micRmsOr(a) * (0.035 * strength),
      })
    }
    for (const k of audioDelayMixes) {
      const base0 = getProfileAudioBase(profile, k)
      out.push({
        kind: 'audio',
        key: k,
        attack: 0.18,
        release: 0.55,
        clampMin: 0,
        clampMax: 0.12,
        base0,
        smoothed: base0,
        compute: (a, _v, strength, base) =>
          base + micRmsOr(a) * (0.015 * strength) + micFluxOr(a) * (0.025 * strength),
      })
    }
    for (const k of audioReverbMixes) {
      const base0 = getProfileAudioBase(profile, k)
      out.push({
        kind: 'audio',
        key: k,
        attack: 0.35,
        release: 0.9,
        clampMin: 0,
        clampMax: 0.12,
        base0,
        smoothed: base0,
        compute: (a, _v, strength, base) => base + micRmsOr(a) * (0.02 * strength),
      })
    }
    for (const k of audioPulseToneMixes) {
      const base0 = getProfileAudioBase(profile, k)
      out.push({
        kind: 'audio',
        key: k,
        attack: 0.12,
        release: 0.45,
        clampMin: 0,
        clampMax: 0.12,
        base0,
        smoothed: base0,
        compute: (a, _v, strength, base) =>
          base + micRmsOr(a) * (0.035 * strength) + micFluxOr(a) * (0.02 * strength),
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
    videoChromaAmounts = resolveVideoKeysFromIndex(videoIndex, 'video.chromatic_aberration.amount')
    videoPulseDepths = resolveVideoKeysFromIndex(videoIndex, 'video.pulse.depth')
    videoGazeAmounts = resolveVideoKeysFromIndex(videoIndex, 'video.gaze_tunnel.amount')
    videoGazeEdgeGains = resolveVideoKeysFromIndex(videoIndex, 'video.gaze_tunnel.edge_gain')
    videoSomaticDepths = resolveVideoKeysFromIndex(videoIndex, 'video.somatic_pulse.depth')
    videoSomaticTunnels = resolveVideoKeysFromIndex(videoIndex, 'video.somatic_pulse.tunnel')
    videoIntrusionAmounts = resolveVideoKeysFromIndex(videoIndex, 'video.intrusion_burst.amount')
    videoSalienceAmounts = resolveVideoKeysFromIndex(
      videoIndex,
      'video.salience_competition.amount',
    )
    videoSalienceShifts = resolveVideoKeysFromIndex(videoIndex, 'video.salience_competition.shift')
    videoGlassVeils = resolveVideoKeysFromIndex(videoIndex, 'video.glass_veil.veil')
    videoGlassRefractions = resolveVideoKeysFromIndex(videoIndex, 'video.glass_veil.refraction')
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
