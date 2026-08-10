import type { Profile } from '../../conditions/schema'
import type { AudioMetrics } from '../audio'
import type { VideoMetrics } from '../canvas'
import { resolveAudioKeys, resolveCouplingVideoKeys } from './couplingKeys'
import { getProfileAudioBase } from './couplingBaseValues'

export type CouplingMapping = {
  kind: 'video' | 'audio'
  key: string
  attack: number
  release: number
  clampMin: number
  clampMax: number
  base0?: number
  compute: (audio: AudioMetrics, video: VideoMetrics, strength: number, base: number) => number
  smoothed: number
}

type MappingSpec = Omit<CouplingMapping, 'key' | 'base0' | 'smoothed'>

const micRmsOr = (audio: AudioMetrics) =>
  typeof audio.micRms === 'number' ? audio.micRms : audio.rms
const micCentroidOr = (audio: AudioMetrics) =>
  typeof audio.micCentroid === 'number' ? audio.micCentroid : audio.centroid
const micFluxOr = (audio: AudioMetrics) =>
  typeof audio.micFlux === 'number' ? audio.micFlux : audio.flux

const videoSpecs: Record<string, MappingSpec> = {
  grain: {
    kind: 'video',
    attack: 0.12,
    release: 0.35,
    clampMin: 0,
    clampMax: 0.5,
    compute: (audio, _video, strength, base) => base + micRmsOr(audio) * (0.18 * strength),
  },
  vignette: {
    kind: 'video',
    attack: 0.18,
    release: 0.45,
    clampMin: 0,
    clampMax: 0.6,
    compute: (audio, _video, strength, base) => base + micRmsOr(audio) * (0.1 * strength),
  },
  interference: {
    kind: 'video',
    attack: 0.25,
    release: 0.6,
    clampMin: 0,
    clampMax: 0.2,
    compute: (audio, _video, strength, base) => base + micRmsOr(audio) * (0.08 * strength),
  },
  sharpen: {
    kind: 'video',
    attack: 0.35,
    release: 0.7,
    clampMin: 0,
    clampMax: 0.2,
    compute: (audio, _video, strength, base) => base + micCentroidOr(audio) * (0.06 * strength),
  },
  chroma: {
    kind: 'video',
    attack: 0.35,
    release: 0.8,
    clampMin: 0,
    clampMax: 0.25,
    compute: (audio, _video, strength, base) =>
      base + Math.max(0, micCentroidOr(audio) - 0.4) * (0.08 * strength),
  },
  pulse: {
    kind: 'video',
    attack: 0.35,
    release: 0.9,
    clampMin: 0,
    clampMax: 0.18,
    compute: (audio, _video, strength, base) => base + micFluxOr(audio) * (0.06 * strength),
  },
  gaze: {
    kind: 'video',
    attack: 0.18,
    release: 0.45,
    clampMin: 0,
    clampMax: 0.85,
    compute: (audio, _video, strength, base) => base + micRmsOr(audio) * (0.1 * strength),
  },
  gazeEdge: {
    kind: 'video',
    attack: 0.25,
    release: 0.55,
    clampMin: 0,
    clampMax: 0.35,
    compute: (audio, _video, strength, base) =>
      base + Math.max(0, micCentroidOr(audio) - 0.35) * (0.08 * strength),
  },
  somaticDepth: {
    kind: 'video',
    attack: 0.12,
    release: 0.45,
    clampMin: 0,
    clampMax: 0.18,
    compute: (audio, _video, strength, base) =>
      base + (micRmsOr(audio) * 0.04 + micFluxOr(audio) * 0.05) * strength,
  },
  somaticTunnel: {
    kind: 'video',
    attack: 0.16,
    release: 0.5,
    clampMin: 0,
    clampMax: 0.75,
    compute: (audio, _video, strength, base) => base + micRmsOr(audio) * (0.12 * strength),
  },
  intrusion: {
    kind: 'video',
    attack: 0.08,
    release: 0.32,
    clampMin: 0,
    clampMax: 0.26,
    compute: (audio, _video, strength, base) =>
      base + (micFluxOr(audio) * 0.04 + micRmsOr(audio) * 0.03) * strength,
  },
  salience: {
    kind: 'video',
    attack: 0.08,
    release: 0.28,
    clampMin: 0,
    clampMax: 0.3,
    compute: (audio, _video, strength, base) =>
      base + (micCentroidOr(audio) * 0.05 + micFluxOr(audio) * 0.04) * strength,
  },
  salienceShift: {
    kind: 'video',
    attack: 0.08,
    release: 0.3,
    clampMin: 0,
    clampMax: 0.08,
    compute: (audio, _video, strength, base) => base + micFluxOr(audio) * (0.02 * strength),
  },
  glassVeil: {
    kind: 'video',
    attack: 0.4,
    release: 0.9,
    clampMin: 0,
    clampMax: 0.45,
    compute: (audio, video, strength, base) =>
      base + (micRmsOr(audio) * 0.04 + Math.max(0, 0.5 - video.luminance) * 0.08) * strength,
  },
  glassRefraction: {
    kind: 'video',
    attack: 0.35,
    release: 0.85,
    clampMin: 0,
    clampMax: 0.06,
    compute: (audio, _video, strength, base) =>
      base + Math.max(0, micCentroidOr(audio) - 0.4) * (0.018 * strength),
  },
}

const audioSpecs: Array<{ node: string; param: string; spec: MappingSpec }> = [
  {
    node: 'tremolo',
    param: 'depth',
    spec: {
      kind: 'audio',
      attack: 0.25,
      release: 0.6,
      clampMin: 0,
      clampMax: 0.15,
      compute: (audio, video, strength, base) =>
        base + video.motion * (0.05 * strength) + micRmsOr(audio) * (0.07 * strength),
    },
  },
  {
    node: 'tremolo',
    param: 'rate',
    spec: {
      kind: 'audio',
      attack: 0.35,
      release: 0.8,
      clampMin: 0.1,
      clampMax: 4,
      compute: (audio, video, strength, base) =>
        base + video.motion * (1.0 * strength) + micFluxOr(audio) * (1.2 * strength),
    },
  },
  {
    node: 'lowpass',
    param: 'cutoff',
    spec: {
      kind: 'audio',
      attack: 0.4,
      release: 0.9,
      clampMin: 300,
      clampMax: 12000,
      compute: (audio, video, strength, base) => {
        const delta = (video.luminance - 0.5) * 2000 * strength
        const micDelta =
          micRmsOr(audio) * (1400 * strength) +
          Math.max(0, micCentroidOr(audio) - 0.45) * (1200 * strength)
        return base + delta + micDelta
      },
    },
  },
  {
    node: 'noise_bed',
    param: 'level',
    spec: {
      kind: 'audio',
      attack: 0.25,
      release: 0.65,
      clampMin: 0,
      clampMax: 0.08,
      compute: (audio, video, strength, base) =>
        base + video.edge * (0.02 * strength) + micRmsOr(audio) * (0.035 * strength),
    },
  },
  {
    node: 'delay',
    param: 'mix',
    spec: {
      kind: 'audio',
      attack: 0.18,
      release: 0.55,
      clampMin: 0,
      clampMax: 0.12,
      compute: (audio, _video, strength, base) =>
        base + micRmsOr(audio) * (0.015 * strength) + micFluxOr(audio) * (0.025 * strength),
    },
  },
  {
    node: 'reverb',
    param: 'mix',
    spec: {
      kind: 'audio',
      attack: 0.35,
      release: 0.9,
      clampMin: 0,
      clampMax: 0.12,
      compute: (audio, _video, strength, base) => base + micRmsOr(audio) * (0.02 * strength),
    },
  },
  {
    node: 'pulse_tone',
    param: 'mix',
    spec: {
      kind: 'audio',
      attack: 0.12,
      release: 0.45,
      clampMin: 0,
      clampMax: 0.12,
      compute: (audio, _video, strength, base) =>
        base + micRmsOr(audio) * (0.035 * strength) + micFluxOr(audio) * (0.02 * strength),
    },
  },
]

function mappingsForKeys(keys: readonly string[], spec: MappingSpec): CouplingMapping[] {
  return keys.map((key) => ({ ...spec, key, smoothed: 0 }))
}

export function createVideoCouplingMappings(
  profile: Profile,
  reducedMotion: boolean,
): CouplingMapping[] {
  const videoKeys = resolveCouplingVideoKeys(profile, reducedMotion)
  return Object.entries(videoSpecs).flatMap(([target, spec]) =>
    mappingsForKeys(videoKeys[target as keyof typeof videoKeys], spec),
  )
}

export function createAudioCouplingMappings(profile: Profile): CouplingMapping[] {
  return audioSpecs.flatMap(({ node, param, spec }) =>
    resolveAudioKeys(profile, node, param).map((key) => {
      const base0 = getProfileAudioBase(profile, key)
      return { ...spec, key, base0, smoothed: base0 }
    }),
  )
}
