import type { InspectHarnessReport, InspectIssue, ProfileInspectResult } from './types'

export function appendUnhandledRejections(issues: InspectIssue[], rejections: unknown[]): void {
  for (const reason of rejections) {
    issues.push({
      severity: 'error',
      code: 'UNHANDLED_REJECTION',
      message: reason instanceof Error ? reason.message : `Unhandled rejection: ${String(reason)}`,
    })
  }
}

function buildSummary(
  profiles: ProfileInspectResult[],
  warnings: InspectIssue[],
  errors: InspectIssue[],
): InspectHarnessReport['summary'] {
  const scenarios = profiles.length * 3
  const failedScenarios = new Set(errors.map((issue) => issue.profileId ?? '')).size
  return {
    profiles: profiles.length,
    scenarios,
    ok: Math.max(0, scenarios - failedScenarios),
    warnings: warnings.length,
    errors: errors.length,
  }
}

export function buildInspectReport(
  profiles: ProfileInspectResult[],
  issues: InspectIssue[],
): InspectHarnessReport {
  const warnings = issues.filter((issue) => issue.severity === 'warning')
  const errors = issues.filter((issue) => issue.severity === 'error')
  return {
    generatedAt: new Date().toISOString(),
    environment: { node: process.version, platform: process.platform, arch: process.arch },
    summary: buildSummary(profiles, warnings, errors),
    profiles,
    warnings,
    errors,
  }
}
