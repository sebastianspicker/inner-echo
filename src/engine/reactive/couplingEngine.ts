import type { Profile } from '../../conditions/schema'
import type { AudioMetrics } from '../audio'
import type { VideoMetrics } from '../canvas'
import { resolveAnalyserTarget } from './analyserToParamsResolver'

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

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.min(1, x))
}

function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x))
}

function smoothStep(current: number, target: number, dt: number, attack: number, release: number): number {
  const tau = target > current ? attack : release
  if (tau <= 0) return target
  const t = 1 - Math.exp(-dt / tau)
  return current + (target - current) * t
}

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
  fallback: number
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
  // We avoid importing getProfileEntryForBuiltIndex here to keep coupling decoupled.
  // Instead, approximate base as 0 unless UI already provides a value.
  void profile
  void reducedMotion
  return 0
}

function getProfileAudioBase(profile: Profile, key: string): number {
  // key is "audio.<chainIndex>.<param>"
  const parts = key.split('.')
  if (parts.length < 3) return 0
  const idx = Number(parts[1])
  if (!Number.isFinite(idx) || idx < 0) return 0
  const param = parts.slice(2).join('.')
  const chain = (profile as { audio_stack?: { chain?: Array<{ params?: Record<string, unknown> }> } }).audio_stack
    ?.chain ?? []
  const params = chain[idx]?.params
  const v = params?.[param]
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

function resolveVideoKey(profile: Profile, target: string, reducedMotion: boolean): string | null {
  const res = resolveAnalyserTarget(target, profile, { reducedMotion })
  return res?.kind === 'video' ? res.paramKey : null
}

function resolveAudioKey(profile: Profile, nodeId: string, param: string): string | null {
  const res = resolveAnalyserTarget(`audio.${nodeId}.${param}`, profile, { reducedMotion: false })
  return res?.kind === 'audio' ? res.paramKey : null
}

export function createCouplingEngine(profile: Profile, settings: CouplingSettings): {
  setSettings: (next: Pick<CouplingSettings, 'couplingStrength' | 'maxFeedback'>) => void
  step: (deltaSec: number, audio: AudioMetrics, video: VideoMetrics, baseControlValues: Record<string, number | boolean>) => CouplingStepResult
} {
  const reducedMotion = settings.reducedMotion
  let couplingStrength = clamp01(settings.couplingStrength)
  let maxFeedback = clamp01(settings.maxFeedback)

  const videoGrainAmount = resolveVideoKey(profile, 'video.grain.amount', reducedMotion)
  const videoVignetteAmount = resolveVideoKey(profile, 'video.vignette.amount', reducedMotion)
  const videoInterferenceAmount = resolveVideoKey(profile, 'video.interference.amount', reducedMotion)
  const videoSharpenAmount = resolveVideoKey(profile, 'video.edge_sharpen.amount', reducedMotion)
  const videoChromaAmount = resolveVideoKey(profile, 'video.chroma_aberration.amount', reducedMotion)
  const videoPulseDepth = resolveVideoKey(profile, 'video.pulse.depth', reducedMotion)

  const audioTremoloRate = resolveAudioKey(profile, 'tremolo', 'rate')
  const audioTremoloDepth = resolveAudioKey(profile, 'tremolo', 'depth')
  const audioLowpassCutoff = resolveAudioKey(profile, 'lowpass', 'cutoff')
  const audioNoiseLevel = resolveAudioKey(profile, 'noise_bed', 'level')

  const mappings: Mapping[] = []

  // Audio → Video (gentle, always smoothed)
  // Prefer mic-specific metrics (when available) for "live" responsiveness; fall back to mixed/post-chain metrics.
  const micRmsOr = (a: AudioMetrics) => (typeof a.micRms === 'number' ? a.micRms : a.rms)
  const micCentroidOr = (a: AudioMetrics) => (typeof a.micCentroid === 'number' ? a.micCentroid : a.centroid)
  const micFluxOr = (a: AudioMetrics) => (typeof a.micFlux === 'number' ? a.micFlux : a.flux)

  if (videoGrainAmount) {
    mappings.push({
      kind: 'video',
      key: videoGrainAmount,
      attack: 0.12,
      release: 0.35,
      clampMin: 0,
      clampMax: 0.5,
      smoothed: 0,
      compute: (a, _v, strength, base) => base + micRmsOr(a) * (0.18 * strength),
    })
  }
  if (videoVignetteAmount) {
    mappings.push({
      kind: 'video',
      key: videoVignetteAmount,
      attack: 0.18,
      release: 0.45,
      clampMin: 0,
      clampMax: 0.6,
      smoothed: 0,
      compute: (a, _v, strength, base) => base + micRmsOr(a) * (0.10 * strength),
    })
  }
  if (videoInterferenceAmount) {
    mappings.push({
      kind: 'video',
      key: videoInterferenceAmount,
      attack: 0.25,
      release: 0.6,
      clampMin: 0,
      clampMax: 0.2,
      smoothed: 0,
      compute: (a, _v, strength, base) => base + micRmsOr(a) * (0.08 * strength),
    })
  }
  if (videoSharpenAmount) {
    mappings.push({
      kind: 'video',
      key: videoSharpenAmount,
      attack: 0.35,
      release: 0.7,
      clampMin: 0,
      clampMax: 0.2,
      smoothed: 0,
      compute: (a, _v, strength, base) => base + micCentroidOr(a) * (0.06 * strength),
    })
  }
  if (videoChromaAmount) {
    mappings.push({
      kind: 'video',
      key: videoChromaAmount,
      attack: 0.35,
      release: 0.8,
      clampMin: 0,
      clampMax: 0.25,
      smoothed: 0,
      compute: (a, _v, strength, base) => base + Math.max(0, micCentroidOr(a) - 0.4) * (0.08 * strength),
    })
  }
  // Flux → pulse depth (very conservative; no strobe). If Reduced Motion removes pulse, resolver returns null.
  if (videoPulseDepth) {
    mappings.push({
      kind: 'video',
      key: videoPulseDepth,
      attack: 0.35,
      release: 0.9,
      clampMin: 0,
      clampMax: 0.18,
      smoothed: 0,
      compute: (a, _v, strength, base) => base + micFluxOr(a) * (0.06 * strength),
    })
  }

  // Video → Audio (subtle)
  if (audioTremoloDepth) {
    const base0 = getProfileAudioBase(profile, audioTremoloDepth)
    mappings.push({
      kind: 'audio',
      key: audioTremoloDepth,
      attack: 0.25,
      release: 0.6,
      clampMin: 0,
      clampMax: 0.15,
      base0,
      smoothed: base0,
      compute: (_a, v, strength, base) => base + v.motion * (0.05 * strength),
    })
  }
  if (audioTremoloRate) {
    const base0 = getProfileAudioBase(profile, audioTremoloRate)
    mappings.push({
      kind: 'audio',
      key: audioTremoloRate,
      attack: 0.35,
      release: 0.8,
      clampMin: 0.1,
      clampMax: 4,
      base0,
      smoothed: base0,
      compute: (_a, v, strength, base) => base + v.motion * (1.0 * strength),
    })
  }
  if (audioLowpassCutoff) {
    const base0 = getProfileAudioBase(profile, audioLowpassCutoff)
    mappings.push({
      kind: 'audio',
      key: audioLowpassCutoff,
      attack: 0.4,
      release: 0.9,
      clampMin: 300,
      clampMax: 12000,
      base0,
      smoothed: base0,
      compute: (_a, v, strength, base) => {
        // Brighter luminance => slightly higher cutoff; subtle range.
        const delta = (v.luminance - 0.5) * 2000 * strength
        return base + delta
      },
    })
  }
  if (audioNoiseLevel) {
    const base0 = getProfileAudioBase(profile, audioNoiseLevel)
    mappings.push({
      kind: 'audio',
      key: audioNoiseLevel,
      attack: 0.25,
      release: 0.65,
      clampMin: 0,
      clampMax: 0.08,
      base0,
      smoothed: base0,
      compute: (_a, v, strength, base) => base + v.edge * (0.02 * strength),
    })
  }

  // Reuse output objects to avoid per-frame allocations (callers spread/copy).
  const outVideo: Record<string, number> = {}
  const outAudio: Record<string, number> = {}

  function clear(obj: Record<string, number>): void {
    for (const k of Object.keys(obj)) delete obj[k]
  }

  return {
    setSettings(next) {
      couplingStrength = clamp01(next.couplingStrength)
      maxFeedback = clamp01(next.maxFeedback)
    },
    step(deltaSec, audio, video, baseControlValues) {
      const strength = couplingStrength * maxFeedback
      clear(outVideo)
      clear(outAudio)

      for (const m of mappings) {
        let base = 0
        if (m.kind === 'video') {
          // Prefer current UI/base control value if present; else fallback to 0.
          base = getBaseNumeric(baseControlValues, m.key, getProfileVideoBase(profile, m.key, reducedMotion))
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

