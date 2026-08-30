/**
 * Per-profile audiovisual coupling orchestration.
 *
 * Mapping definitions and their frame evaluation live alongside this entry point
 * so this module can remain responsible for profile settings and lifecycle only.
 */

import type { Profile } from '../../domain/experience/schema'
import type { AudioMetrics } from '../audio'
import type { VideoMetrics } from '../visual/overlay'
import { clamp01 } from '../../shared/numbers'
import { getBaseNumeric } from './baseNumeric'
import { getProfileVideoBase } from './profileVideoBase'
import { evaluateCouplingMappings } from './couplingEvaluation'
import {
  createAudioCouplingMappings,
  createVideoCouplingMappings,
  type CouplingMapping,
} from './couplingMappings'

export interface CouplingSettings {
  couplingStrength: number
  maxFeedback: number
  reducedMotion: boolean
  safeMode: boolean
}

export interface CouplingStepResult {
  video: Record<string, number>
  audio: Record<string, number>
}

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
  let mappings: CouplingMapping[] = [
    ...createVideoCouplingMappings(profile, reducedMotion),
    ...createAudioCouplingMappings(profile),
  ]

  const rebuildVideoMappings = () => {
    const audioMappings = mappings.filter((mapping) => mapping.kind === 'audio')
    mappings = [...createVideoCouplingMappings(profile, reducedMotion), ...audioMappings]
  }

  return {
    setSettings(next) {
      couplingStrength = clamp01(next.couplingStrength)
      maxFeedback = clamp01(next.maxFeedback)
      safeMode = next.safeMode === true
      if (typeof next.reducedMotion === 'boolean' && next.reducedMotion !== reducedMotion) {
        reducedMotion = next.reducedMotion
        rebuildVideoMappings()
      }
    },
    step(deltaSec, audio, video, baseControlValues) {
      const safetyDamping = safeMode ? 0.6 : 1
      const strength = couplingStrength * maxFeedback * safetyDamping
      return evaluateCouplingMappings(mappings, deltaSec, audio, video, strength, (mapping) =>
        mapping.kind === 'audio'
          ? (mapping.base0 ?? 0)
          : getBaseNumeric(
              baseControlValues,
              mapping.key,
              getProfileVideoBase(profile, mapping.key, reducedMotion),
            ),
      )
    },
  }
}
