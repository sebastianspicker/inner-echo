/**
 * App-side convenience wrapper around domain control resolution.
 *
 * Domain control resolution requires the runtime-supported node set explicitly (it must
 * not import runtime). This wrapper supplies `IMPLEMENTED_VIDEO_NODES` so app call sites
 * keep the short `{ reducedMotion }` shape instead of repeating it everywhere.
 */
import type { Profile, UIControl } from '../../../domain/experience/schema'
import {
  getDefaultControlValues as domainGetDefaultControlValues,
  mergeControlValuesWithDefaults,
  mergePersistedControlValues as domainMergePersistedControlValues,
  resolveControl as domainResolveControl,
  resolveProfileControls as domainResolveProfileControls,
  type ResolvedControl,
} from '../../../domain/experience/controls'
import { IMPLEMENTED_VIDEO_NODES } from '../../../runtime/capabilities'

export { mergeControlValuesWithDefaults }
export type { ResolvedControl }

export function getDefaultControlValues(
  profile: Profile,
  options: { reducedMotion?: boolean } = {},
): Record<string, number | boolean> {
  return domainGetDefaultControlValues(profile, {
    ...options,
    supportedNodeIds: IMPLEMENTED_VIDEO_NODES,
  })
}

export function resolveControl(
  control: UIControl,
  profile: Profile,
  options: { reducedMotion?: boolean } = {},
): ResolvedControl | null {
  return domainResolveControl(control, profile, {
    ...options,
    supportedNodeIds: IMPLEMENTED_VIDEO_NODES,
  })
}

export function resolveProfileControls(
  profile: Profile,
  reducedMotion: boolean,
): ResolvedControl[] {
  return domainResolveProfileControls(profile, {
    reducedMotion,
    supportedNodeIds: IMPLEMENTED_VIDEO_NODES,
  })
}

export function mergePersistedControlValues(
  profile: Profile,
  reducedMotion: boolean,
  previous: Record<string, number | boolean>,
): Record<string, number | boolean> {
  return domainMergePersistedControlValues(
    profile,
    { reducedMotion, supportedNodeIds: IMPLEMENTED_VIDEO_NODES },
    previous,
  )
}
