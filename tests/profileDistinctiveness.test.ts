import { describe, expect, it } from 'vitest'

import adhd from '../src/conditions/profiles/adhd.json'
import anxiety from '../src/conditions/profiles/anxiety.json'
import depression from '../src/conditions/profiles/depression.json'
import dpdr from '../src/conditions/profiles/dpdr.json'
import ocd from '../src/conditions/profiles/ocd.json'
import panic from '../src/conditions/profiles/panic.json'
import traumaPtsd from '../src/conditions/profiles/trauma_ptsd.json'
import { getDefaultControlValues } from '../src/conditions/controlTargets'
import { getProfileEntryForBuiltIndex, TEMPORAL_NODE_TYPES } from '../src/conditions/graphBuilder'
import { getReducedMotionDisableNodes } from '../src/conditions/normalize'
import type { Profile, VideoStackNodeDef } from '../src/conditions/schema'
import { createCouplingEngine } from '../src/engine/reactive/couplingEngine'
import { resolveAnalyserTarget } from '../src/engine/reactive/analyserToParamsResolver'
import type { AudioMetrics } from '../src/engine/audio/types'
import type { VideoMetrics } from '../src/engine/canvas/videoMetrics'

const conditionProfiles: Profile[] = [
  anxiety as Profile,
  panic as Profile,
  traumaPtsd as Profile,
  adhd as Profile,
  depression as Profile,
  dpdr as Profile,
  ocd as Profile,
]

const FEATURE_KEYS = [
  'gaze',
  'edge',
  'somatic',
  'intrusion',
  'salience',
  'mute',
  'inertia',
  'glass',
  'loop',
  'grid',
  'texture',
  'fog',
  'blur',
] as const
const REDUCED_MOTION_MIN_DISTANCE = 0.05

type FeatureKey = (typeof FEATURE_KEYS)[number]
type Signature = Record<FeatureKey, number>
type EffectiveStackOptions = { reducedMotion?: boolean }

function emptySignature(): Signature {
  return {
    gaze: 0,
    edge: 0,
    somatic: 0,
    intrusion: 0,
    salience: 0,
    mute: 0,
    inertia: 0,
    glass: 0,
    loop: 0,
    grid: 0,
    texture: 0,
    fog: 0,
    blur: 0,
  }
}

function num(node: VideoStackNodeDef, key: string): number {
  const value = node.params?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function effectiveVideoStack(
  profile: Profile,
  options?: EffectiveStackOptions,
): VideoStackNodeDef[] {
  const entries: VideoStackNodeDef[] = []
  for (let builtIndex = 0; ; builtIndex++) {
    const entry = getProfileEntryForBuiltIndex(profile, builtIndex, options)
    if (!entry) return entries
    entries.push(entry)
  }
}

function visualSignature(profile: Profile, options?: EffectiveStackOptions): Signature {
  const signature = emptySignature()
  for (const node of effectiveVideoStack(profile, options)) {
    switch (node.node) {
      case 'gaze_tunnel':
        signature.gaze += num(node, 'amount')
        signature.edge += num(node, 'edge_gain')
        break
      case 'edge_sharpen':
        signature.edge += num(node, 'amount') * 0.8
        break
      case 'somatic_pulse':
        signature.somatic +=
          num(node, 'depth') + num(node, 'tunnel') * 0.45 + num(node, 'blur') * 0.35
        break
      case 'intrusion_burst':
        signature.intrusion +=
          num(node, 'amount') + num(node, 'burst_probability') * 0.12 + num(node, 'zoom') * 0.06
        break
      case 'salience_competition':
        signature.salience +=
          num(node, 'amount') + num(node, 'marker_strength') * 0.12 + num(node, 'shift') * 1.5
        break
      case 'color_grade':
        signature.mute +=
          Math.max(0, -num(node, 'saturation')) + Math.max(0, -num(node, 'contrast'))
        signature.edge += Math.max(0, num(node, 'contrast')) * 0.25
        break
      case 'temporal_smear':
        signature.inertia += num(node, 'feedback') + Math.max(0, num(node, 'decay') - 0.9)
        break
      case 'glass_veil':
        signature.glass +=
          num(node, 'veil') +
          num(node, 'feedback') +
          num(node, 'refraction') * 2 +
          num(node, 'chroma')
        break
      case 'feedback_loop':
        signature.loop += num(node, 'feedback') + Math.max(0, num(node, 'decay') - 0.9)
        break
      case 'grid_hint':
        signature.grid += num(node, 'amount') * 2
        break
      case 'grain':
        signature.texture += num(node, 'amount')
        break
      case 'haze':
        signature.fog += num(node, 'amount')
        break
      case 'soft_blur':
        signature.blur += num(node, 'amount')
        break
    }
  }

  for (const key of FEATURE_KEYS) {
    signature[key] = clamp01(signature[key])
  }
  return signature
}

function distance(a: Signature, b: Signature): number {
  let sum = 0
  for (const key of FEATURE_KEYS) {
    const delta = a[key] - b[key]
    sum += delta * delta
  }
  return Math.sqrt(sum)
}

function hasNode(profile: Profile, node: string): boolean {
  return profile.video_stack.some((entry) => entry.node === node)
}

function findNode(profile: Profile, node: string): VideoStackNodeDef {
  const entry = profile.video_stack.find((candidate) => candidate.node === node)
  if (!entry) throw new Error(`missing ${profile.id}.${node}`)
  return entry
}

function zeroVideo(): VideoMetrics {
  return { motion: 0, luminance: 0.5, edge: 0, instability: 0 }
}

function quietAudio(): AudioMetrics {
  return { rms: 0.02, centroid: 0.2, flux: 0.01, micRms: 0.02, micCentroid: 0.2, micFlux: 0.01 }
}

function loudMicAudio(): AudioMetrics {
  return { rms: 0.03, centroid: 0.2, flux: 0.01, micRms: 0.85, micCentroid: 0.8, micFlux: 0.6 }
}

function settleCoupling(profile: Profile, audio: AudioMetrics): ReturnType<typeof engineStep> {
  const engine = createCouplingEngine(profile, {
    couplingStrength: 1,
    maxFeedback: 1,
    reducedMotion: false,
    safeMode: false,
  })
  const base = getDefaultControlValues(profile, { reducedMotion: false })
  let result = engine.step(1 / 60, audio, zeroVideo(), base)
  for (let i = 0; i < 140; i++) {
    result = engine.step(1 / 60, audio, zeroVideo(), base)
  }
  return result
}

function engineStep(
  engine: ReturnType<typeof createCouplingEngine>,
  audio: AudioMetrics,
  video: VideoMetrics,
  base: Record<string, number | boolean>,
) {
  return engine.step(1 / 60, audio, video, base)
}

function resolvedKey(profile: Profile, target: string): string {
  const resolved = resolveAnalyserTarget(target, profile, { reducedMotion: false })
  if (!resolved) throw new Error(`target did not resolve: ${profile.id}.${target}`)
  return resolved.paramKey
}

describe('condition profile distinctiveness acceptance gate', () => {
  it('keeps pairwise visual mechanism distance above the minimum', () => {
    const failures: string[] = []
    for (let i = 0; i < conditionProfiles.length; i++) {
      for (let j = i + 1; j < conditionProfiles.length; j++) {
        const left = conditionProfiles[i]
        const right = conditionProfiles[j]
        const d = distance(visualSignature(left), visualSignature(right))
        if (d < 0.34) failures.push(`${left.id} vs ${right.id}: ${d.toFixed(3)}`)
      }
    }
    expect(failures).toEqual([])
  })

  it('keeps reduced-motion effective profiles distinct without temporal video nodes', () => {
    const distanceFailures: string[] = []
    const temporalFailures: string[] = []

    for (const profile of conditionProfiles) {
      const reducedMotionDisabled = getReducedMotionDisableNodes(profile)
      for (const node of effectiveVideoStack(profile, { reducedMotion: true })) {
        const nodeType = String(node.node ?? '').toLowerCase()
        if (TEMPORAL_NODE_TYPES.has(nodeType) || reducedMotionDisabled.has(nodeType)) {
          temporalFailures.push(`${profile.id}.${nodeType}`)
        }
      }
    }

    for (let i = 0; i < conditionProfiles.length; i++) {
      for (let j = i + 1; j < conditionProfiles.length; j++) {
        const left = conditionProfiles[i]
        const right = conditionProfiles[j]
        const d = distance(
          visualSignature(left, { reducedMotion: true }),
          visualSignature(right, { reducedMotion: true }),
        )
        if (d < REDUCED_MOTION_MIN_DISTANCE) {
          distanceFailures.push(`${left.id} vs ${right.id}: ${d.toFixed(3)}`)
        }
      }
    }

    expect(temporalFailures).toEqual([])
    expect(distanceFailures).toEqual([])
  })

  it('pins each profile to its requested mechanism-specific primitive', () => {
    const anxietyGaze = findNode(anxiety as Profile, 'gaze_tunnel')
    expect(num(anxietyGaze, 'amount')).toBeGreaterThanOrEqual(0.55)
    expect(num(findNode(anxiety as Profile, 'grain'), 'amount')).toBeLessThanOrEqual(0.03)

    const panicPulse = findNode(panic as Profile, 'somatic_pulse')
    expect(num(panicPulse, 'depth')).toBeGreaterThanOrEqual(0.12)
    expect(num(panicPulse, 'tunnel')).toBeGreaterThanOrEqual(0.4)
    expect(num(panicPulse, 'blur')).toBeGreaterThanOrEqual(0.18)

    const traumaIntrusion = findNode(traumaPtsd as Profile, 'intrusion_burst')
    expect(num(traumaIntrusion, 'burst_probability')).toBeGreaterThanOrEqual(0.4)
    expect(hasNode(traumaPtsd as Profile, 'interference')).toBe(false)

    const adhdSalience = findNode(adhd as Profile, 'salience_competition')
    expect(num(adhdSalience, 'amount')).toBeGreaterThanOrEqual(0.24)
    expect(hasNode(adhd as Profile, 'interference')).toBe(false)

    expect(num(findNode(depression as Profile, 'color_grade'), 'saturation')).toBeLessThanOrEqual(
      -0.4,
    )
    expect(
      num(findNode(depression as Profile, 'temporal_smear'), 'feedback'),
    ).toBeGreaterThanOrEqual(0.14)

    const dpdrGlass = findNode(dpdr as Profile, 'glass_veil')
    expect(num(dpdrGlass, 'veil')).toBeGreaterThanOrEqual(0.2)
    expect(num(dpdrGlass, 'feedback')).toBeGreaterThanOrEqual(0.1)

    expect(hasNode(ocd as Profile, 'feedback_loop')).toBe(true)
    expect(hasNode(ocd as Profile, 'grid_hint')).toBe(true)
    expect(hasNode(ocd as Profile, 'interference')).toBe(false)
  })

  it('proves mic coupling reaches condition-specific visual and audio mechanisms', () => {
    const panicQuiet = settleCoupling(panic as Profile, quietAudio())
    const panicLoud = settleCoupling(panic as Profile, loudMicAudio())
    const panicDepthKey = resolvedKey(panic as Profile, 'video.somatic_pulse.depth')
    const panicToneKey = resolvedKey(panic as Profile, 'audio.pulse_tone.mix')
    expect(panicLoud.video[panicDepthKey]).toBeGreaterThan(panicQuiet.video[panicDepthKey] ?? 0)
    expect(panicLoud.audio[panicToneKey]).toBeGreaterThan(panicQuiet.audio[panicToneKey] ?? 0)

    const adhdQuiet = settleCoupling(adhd as Profile, quietAudio())
    const adhdLoud = settleCoupling(adhd as Profile, loudMicAudio())
    const salienceKey = resolvedKey(adhd as Profile, 'video.salience_competition.amount')
    expect(adhdLoud.video[salienceKey]).toBeGreaterThan(adhdQuiet.video[salienceKey] ?? 0)

    const dpdrQuiet = settleCoupling(dpdr as Profile, quietAudio())
    const dpdrLoud = settleCoupling(dpdr as Profile, loudMicAudio())
    const veilKey = resolvedKey(dpdr as Profile, 'video.glass_veil.veil')
    expect(dpdrLoud.video[veilKey]).toBeGreaterThan(dpdrQuiet.video[veilKey] ?? 0)
  })
})
