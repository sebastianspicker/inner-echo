import type { AudioMetrics } from '../../../audio'
import type { VideoMetrics } from '../videoMetrics'

export interface ReactiveLoopOptions {
  /** Live demand signal for video canvas readback and metric tracking. */
  needsVideoMetrics?(): boolean
  /** Live demand signal for Web Audio analyser sampling. */
  needsAudioMetrics?(): boolean
  /** Live demand signal for evaluating reactive and coupling mappings. */
  needsOverrides?(): boolean
  /** Reset retained mapping state once when override evaluation becomes inactive. */
  onInactive?(baseControlValues: Record<string, number | boolean>): void
  getAudioMetrics?(): AudioMetrics
  getOverrides(
    delta: number,
    audio: AudioMetrics,
    video: VideoMetrics,
    baseControlValues: Record<string, number | boolean>,
  ): { video: Record<string, number>; audio?: Record<string, number> }
  applyAudioOverrides?(overrides: Record<string, number>): void
  onVideoMetrics?(metrics: VideoMetrics): void
}
