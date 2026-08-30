import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { logWarnings } from '../../shared/cli'
import { runInspectHarness } from './harness'
import type { InspectIssue } from './types'

function rel(p: string): string {
  return p.replaceAll(path.sep, '/')
}

async function main(): Promise<void> {
  const rootDir = process.cwd()
  const framesRaw = Number(process.env.INSPECT_FRAMES ?? 120)
  const frames = Number.isFinite(framesRaw) ? Math.max(1, Math.floor(framesRaw)) : 120

  const report = await runInspectHarness(rootDir, { frames })

  const reportsDir = path.join(rootDir, 'reports')
  mkdirSync(reportsDir, { recursive: true })

  const reportPath = path.join(reportsDir, 'inspect.json')
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8')

  console.log(`[debug:inspect] report written: ${rel(path.relative(rootDir, reportPath))}`)
  console.log(
    `[debug:inspect] summary: profiles=${report.summary.profiles} scenarios=${report.summary.scenarios} ok=${report.summary.ok} warnings=${report.summary.warnings} errors=${report.summary.errors}`,
  )

  if (report.warnings.length > 0) {
    logWarnings('debug:inspect', report.warnings, true)
  }

  if (report.errors.length > 0) {
    process.exitCode = 1
  }
}

void main()
