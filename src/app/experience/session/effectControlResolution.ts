import type { Profile } from '../../../domain/experience/schema'
import { resolveControl, type ResolvedControl } from '../controls/controlTargets'

const GLOBAL_CONTROL_KINDS = new Set(['intensity', 'safeMode', 'reducedMotion', 'audioEnabled'])

export function resolveProfileControls(
  profile: Profile,
  reducedMotion: boolean,
): ResolvedControl[] {
  const controls: ResolvedControl[] = []
  for (const control of profile.ui?.controls ?? []) {
    const resolved = resolveControl(control, profile, { reducedMotion })
    if (resolved && !GLOBAL_CONTROL_KINDS.has(resolved.kind)) controls.push(resolved)
  }
  return controls
}
