import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { profileSchema } from '../../src/domain/experience/schema'
import type { ContractIssue, LoadedProfileContract } from './probes/types'

function rel(rootDir: string, filePath: string): string {
  return path.relative(rootDir, filePath).replaceAll(path.sep, '/')
}

export function loadProfileContracts(rootDir: string): {
  profiles: LoadedProfileContract[]
  issues: ContractIssue[]
} {
  const issues: ContractIssue[] = []
  const profiles: LoadedProfileContract[] = []
  const profilesDir = path.join(rootDir, 'src', 'content', 'experience', 'profiles')
  const profileFiles = readdirSync(profilesDir)
    .filter((name) => name.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b))

  for (const fileName of profileFiles) {
    const absolute = path.join(profilesDir, fileName)
    const sourceFile = rel(rootDir, absolute)
    let raw: unknown
    try {
      raw = JSON.parse(readFileSync(absolute, 'utf-8'))
    } catch (error) {
      issues.push({
        severity: 'error',
        code: 'PROFILE_JSON_PARSE_ERROR',
        message: error instanceof Error ? error.message : `Failed to parse ${sourceFile}`,
        sourceFile,
      })
      continue
    }

    const parsed = profileSchema.safeParse(raw)
    if (!parsed.success) {
      issues.push({
        severity: 'error',
        code: 'PROFILE_SCHEMA_ERROR',
        message: `Profile schema validation failed for ${sourceFile}`,
        sourceFile,
        details: parsed.error.flatten(),
      })
      continue
    }

    profiles.push({
      profileId: parsed.data.id,
      sourceFile,
      profile: parsed.data,
    })
  }

  return { profiles, issues }
}
