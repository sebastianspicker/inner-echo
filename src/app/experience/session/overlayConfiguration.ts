import type { Profile } from '../../../domain/experience/schema'
import { canonicalJson } from '../../../shared/canonicalJson'

/** Only definitions captured by the graph and coupling engines belong in this identity. */
export function overlayConfigurationKey(profile: Profile | null, reducedMotion: boolean): string {
  if (!profile) return 'unavailable'
  return (
    canonicalJson({
      video: profile.video_stack,
      audio: profile.audio_stack?.chain ?? [],
      reactive: profile.reactive?.analyser_to_params ?? [],
      safety: {
        intensityMax: profile.safety.intensity_max,
        clamps: profile.safety.safe_mode_clamps,
        disabledNodes: profile.safety.reduced_motion_policy?.disable_nodes ?? [],
      },
      reducedMotion,
    }) ?? 'unavailable'
  )
}
