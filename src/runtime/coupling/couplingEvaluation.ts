import type { AudioMetrics } from '../audio'
import type { VideoMetrics } from '../visual/overlay'
import { clamp, smoothStep } from '../../shared/numbers'
import type { CouplingMapping } from './couplingMappings'

export function evaluateCouplingMappings(
  mappings: CouplingMapping[],
  deltaSec: number,
  audio: AudioMetrics,
  video: VideoMetrics,
  strength: number,
  resolveBase: (mapping: CouplingMapping) => number,
): { video: Record<string, number>; audio: Record<string, number> } {
  const outVideo: Record<string, number> = {}
  const outAudio: Record<string, number> = {}

  for (const mapping of mappings) {
    const target = mapping.compute(audio, video, strength, resolveBase(mapping))
    mapping.smoothed = smoothStep(
      mapping.smoothed,
      target,
      deltaSec,
      mapping.attack,
      mapping.release,
    )
    const value = clamp(mapping.smoothed, mapping.clampMin, mapping.clampMax)
    if (mapping.kind === 'video') outVideo[mapping.key] = value
    else outAudio[mapping.key] = value
  }

  return { video: outVideo, audio: outAudio }
}
