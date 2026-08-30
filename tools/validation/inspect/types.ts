export type InspectSeverity = 'warning' | 'error'

export interface InspectIssue {
  severity: InspectSeverity
  code: string
  message: string
  profileId?: string
  sourceFile?: string
  details?: Record<string, unknown>
}

export interface InspectScenarioResult {
  reducedMotion: boolean
  safeMode: boolean
  frames: number
  activeNodes: string[]
  nonFiniteReadings: number
}

export interface ProfileInspectResult {
  profileId: string
  sourceFile: string
  video: InspectScenarioResult[]
  audio: {
    enabled: boolean
    frames: number
    activeNodes: string[]
    nonFiniteReadings: number
  }
  warnings: number
  errors: number
}

export interface InspectHarnessReport {
  generatedAt: string
  environment: {
    node: string
    platform: string
    arch: string
  }
  summary: {
    profiles: number
    scenarios: number
    ok: number
    warnings: number
    errors: number
  }
  profiles: ProfileInspectResult[]
  warnings: InspectIssue[]
  errors: InspectIssue[]
}

export interface InspectHarnessOptions {
  frames?: number
}
