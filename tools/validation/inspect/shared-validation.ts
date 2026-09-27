import type { LoadedProfileContract } from '../../contracts/probes/types'
import { loadProfileContracts } from '../../contracts/profiles'
import type { InspectIssue } from './types'

export type LoadedProfile = LoadedProfileContract

export interface IssueSink {
  push(issue: InspectIssue): void
}

export interface IssuesByProfile {
  warnings: number
  errors: number
}

export interface ProfileIssueContext {
  profileId: string
  sourceFile: string
  sink: IssueSink
  perProfile: Map<string, IssuesByProfile>
}

export function toNodeName(value: unknown): string {
  if (!value || typeof value !== 'object') return 'unknown'
  const ctor = (value as { constructor?: { name?: string } }).constructor?.name
  if (!ctor) return 'unknown'
  const stripped = ctor.replace(/Node$/, '')
  return stripped
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase()
}

export function loadProfiles(rootDir: string): {
  profiles: LoadedProfile[]
  issues: InspectIssue[]
} {
  return loadProfileContracts(rootDir)
}

export function collectFiniteIssues(value: unknown, keyPath: string, output: string[]): void {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) output.push(keyPath)
    return
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      collectFiniteIssues(value[i], `${keyPath}[${i}]`, output)
    }
    return
  }
  if (value == null || typeof value !== 'object') return

  const record = value as Record<string, unknown>
  collectFiniteComponentIssues(record, keyPath, output)
  collectFiniteElementIssues(record.elements, keyPath, output)
}

function collectFiniteComponentIssues(
  value: Record<string, unknown>,
  keyPath: string,
  output: string[],
): void {
  for (const k of ['x', 'y', 'z', 'w', 'r', 'g', 'b', 'a']) {
    const numeric = value[k]
    if (typeof numeric === 'number' && !Number.isFinite(numeric)) {
      output.push(`${keyPath}.${k}`)
    }
  }
}

function collectFiniteElementIssues(elements: unknown, keyPath: string, output: string[]): void {
  if (Array.isArray(elements) || ArrayBuffer.isView(elements)) {
    const list = Array.from(elements as ArrayLike<unknown>)
    for (let i = 0; i < list.length; i++) {
      const item = list[i]
      if (typeof item === 'number' && !Number.isFinite(item)) {
        output.push(`${keyPath}.elements[${i}]`)
      }
    }
  }
}

export function recordIssue(
  sink: IssueSink,
  index: Map<string, IssuesByProfile>,
  issue: InspectIssue,
): void {
  sink.push(issue)
  if (!issue.profileId) return
  const stats = index.get(issue.profileId) ?? { warnings: 0, errors: 0 }
  if (issue.severity === 'warning') stats.warnings++
  else stats.errors++
  index.set(issue.profileId, stats)
}
