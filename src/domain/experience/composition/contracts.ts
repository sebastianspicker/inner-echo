import type { Profile } from '../schema'
import type { ComposerSettings, DimensionSignalMappingEntry, ExperienceDimensionDef } from './types'

export type MissingNodesReport = {
  video: string[]
  audio: string[]
}

export type EvidenceReport = {
  dimensions: Array<{ dimensionId: string; rationaleDoc?: string; evidenceStrength?: string }>
  gaps: Array<{ dimensionId: string; reason: string }>
}

export type ComposeReport = {
  missingNodes: MissingNodesReport
  missingPresets: string[]
  evidence: EvidenceReport
  warnings: string[]
}

export type ComposeResult = {
  profile: Profile
  report: ComposeReport
}

/** Immutable runtime capabilities injected by the application composition boundary. */
export type CompositionCapabilities = {
  readonly supportedVideoNodeIds: ReadonlySet<string>
  readonly supportedAudioNodeIds: ReadonlySet<string>
}

/** Content ports injected into the pure composition engine. */
export type ComposeSources = {
  loadPresetProfile: (profileId: string) => Promise<Profile | null>
  getDimensionMappingEntry: (dimensionId: string) => DimensionSignalMappingEntry | null
  getExperienceDimensions: () => ExperienceDimensionDef[]
}

export type ComposeRequest = {
  settings: ComposerSettings
  capabilities: CompositionCapabilities
}
