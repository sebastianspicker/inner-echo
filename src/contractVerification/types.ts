import type { Profile } from '../conditions/schema'

export type ContractParamType = 'number' | 'boolean' | 'enum'
export type IssueSeverity = 'error' | 'warning'
export type CheckStatus = 'ok' | 'warning' | 'error'

export interface SafetyContextShape {
  global: Record<string, unknown>
  safeMode: Record<string, unknown>
}

export interface ProbeOptions {
  intensity?: number
  safeMode?: boolean
  safetyContext?: SafetyContextShape
}

export interface ProbeHarness {
  applyParam(paramKey: string, value: unknown, options?: ProbeOptions): void
  dispose(): void
}

export interface ContractParamMetadata {
  type: ContractParamType
  defaultValue: unknown
  min?: number
  max?: number
  enumValues?: readonly string[]
  safeModeClampKey?: string
  probeLow?: unknown
  probeHigh?: unknown
  epsilon?: number
  readEffective(harness: ProbeHarness): unknown
}

export interface ContractNodeDefinition {
  kind: 'video' | 'audio'
  node: string
  aliases?: readonly string[]
  params: Record<string, ContractParamMetadata>
  createHarness(): ProbeHarness
}

export interface ContractIssue {
  severity: IssueSeverity
  code: string
  message: string
  kind?: 'video' | 'audio'
  profileId?: string
  sourceFile?: string
  location?: string
  node?: string
  param?: string
  details?: Record<string, unknown>
}

export interface RangeCheckResult {
  kind: 'video' | 'audio'
  node: string
  param: string
  status: CheckStatus
  min?: number
  max?: number
  observedMin?: number
  observedMax?: number
  message: string
}

export interface PolicyCheckResult {
  profileId: string
  status: CheckStatus
  policy: 'reduced_motion' | 'safe_mode'
  message: string
  node?: string
  param?: string
}

export interface ContractReference {
  kind: 'video' | 'audio'
  node: string
  param?: string
  value?: unknown
  sourceFile: string
  location: string
  profileId?: string
  referenceType:
    | 'profile_video_stack_node'
    | 'profile_video_stack_param'
    | 'profile_audio_stack_node'
    | 'profile_audio_stack_param'
    | 'profile_reactive_target'
    | 'mapping_video_motif_node'
    | 'mapping_video_motif_param'
    | 'mapping_audio_motif_node'
    | 'mapping_audio_motif_param'
    | 'dimensions_video_node'
    | 'dimensions_audio_node'
}

export interface LoadedProfileContract {
  profileId: string
  sourceFile: string
  profile: Profile
}

export interface LoadedContracts {
  profiles: LoadedProfileContract[]
  references: ContractReference[]
  parseErrors: ContractIssue[]
}

export interface RegistryNodeSummary {
  kind: 'video' | 'audio'
  node: string
  aliases: string[]
  params: Record<
    string,
    {
      type: ContractParamType
      defaultValue: unknown
      min?: number
      max?: number
      enumValues?: readonly string[]
      safeModeClampKey?: string
    }
  >
}

export interface ContractVerificationReport {
  generatedAt: string
  summary: {
    profiles: number
    references: number
    ok: number
    warnings: number
    errors: number
  }
  missingNodes: ContractIssue[]
  missingParams: ContractIssue[]
  unusedParams: ContractIssue[]
  rangeChecks: RangeCheckResult[]
  policyChecks: PolicyCheckResult[]
  warnings: ContractIssue[]
  errors: ContractIssue[]
  registry: {
    video: RegistryNodeSummary[]
    audio: RegistryNodeSummary[]
  }
}
