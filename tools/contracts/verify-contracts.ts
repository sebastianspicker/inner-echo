import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { logWarnings } from '../shared/cli'
import { contractReportMarkdown } from './reportMarkdown'
import { verifyContracts } from './verify'

function rel(p: string) {
  return p.replaceAll(path.sep, '/')
}

function main() {
  const rootDir = process.cwd()
  const report = verifyContracts(rootDir)

  const reportsDir = path.join(rootDir, 'reports')
  mkdirSync(reportsDir, { recursive: true })

  const jsonPath = path.join(reportsDir, 'contract-verification.json')
  const mdPath = path.join(reportsDir, 'contract-verification.md')

  writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8')
  writeFileSync(mdPath, contractReportMarkdown(report), 'utf-8')

  console.log(`[verify:contracts] report written: ${rel(path.relative(rootDir, jsonPath))}`)
  console.log(`[verify:contracts] report written: ${rel(path.relative(rootDir, mdPath))}`)
  console.log(
    `[verify:contracts] summary: ok=${report.summary.ok} warnings=${report.summary.warnings} errors=${report.summary.errors}`,
  )

  if (report.warnings.length > 0) {
    logWarnings('verify:contracts', report.warnings)
  }

  if (report.errors.length > 0) {
    process.exitCode = 1
  }
}

main()
