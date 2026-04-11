import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { verifyContracts } from './lib/verifyContracts'
import type {
  ContractIssue,
  ContractVerificationReport,
  PolicyCheckResult,
  RangeCheckResult,
} from '../src/contractVerification/types'

function rel(p: string): string {
  return p.replaceAll(path.sep, '/')
}

function mdIssue(issue: ContractIssue): string {
  const where = [
    issue.sourceFile,
    issue.location,
    issue.profileId ? `profile=${issue.profileId}` : null,
  ]
    .filter(Boolean)
    .join(' | ')
  const target = [issue.kind, issue.node, issue.param].filter(Boolean).join('.')
  return `- [${issue.severity.toUpperCase()}] \`${issue.code}\` ${issue.message}${
    target ? ` (\`${target}\`)` : ''
  }${where ? ` — ${where}` : ''}`
}

function mdRange(r: RangeCheckResult): string {
  return `- [${r.status.toUpperCase()}] \`${r.kind}.${r.node}.${r.param}\` min=${String(
    r.min,
  )} max=${String(r.max)} observedMin=${String(
    r.observedMin,
  )} observedMax=${String(r.observedMax)} — ${r.message}`
}

function mdPolicy(p: PolicyCheckResult): string {
  const target = [p.node, p.param].filter(Boolean).join('.')
  return `- [${p.status.toUpperCase()}] profile=\`${p.profileId}\` policy=\`${
    p.policy
  }\`${target ? ` target=\`${target}\`` : ''} — ${p.message}`
}

function toMarkdown(report: ContractVerificationReport): string {
  const lines: string[] = []
  lines.push('# Contract Verification Report')
  lines.push('')
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  lines.push(`- Profiles: ${report.summary.profiles}`)
  lines.push(`- References: ${report.summary.references}`)
  lines.push(`- OK checks: ${report.summary.ok}`)
  lines.push(`- Warnings: ${report.summary.warnings}`)
  lines.push(`- Errors: ${report.summary.errors}`)
  lines.push('')
  lines.push('## Missing Nodes')
  lines.push('')
  if (report.missingNodes.length === 0) lines.push('- None')
  else lines.push(...report.missingNodes.map(mdIssue))
  lines.push('')
  lines.push('## Missing Params')
  lines.push('')
  if (report.missingParams.length === 0) lines.push('- None')
  else lines.push(...report.missingParams.map(mdIssue))
  lines.push('')
  lines.push('## Unused Params')
  lines.push('')
  if (report.unusedParams.length === 0) lines.push('- None')
  else lines.push(...report.unusedParams.map(mdIssue))
  lines.push('')
  lines.push('## Out-of-Range Handling')
  lines.push('')
  if (report.rangeChecks.length === 0) lines.push('- No numeric range checks were executed')
  else lines.push(...report.rangeChecks.map(mdRange))
  lines.push('')
  lines.push('## Policy Compliance')
  lines.push('')
  if (report.policyChecks.length === 0) lines.push('- No policy checks were executed')
  else lines.push(...report.policyChecks.map(mdPolicy))
  lines.push('')
  lines.push('## All Warnings')
  lines.push('')
  if (report.warnings.length === 0) lines.push('- None')
  else lines.push(...report.warnings.map(mdIssue))
  lines.push('')
  lines.push('## All Errors')
  lines.push('')
  if (report.errors.length === 0) lines.push('- None')
  else lines.push(...report.errors.map(mdIssue))
  lines.push('')
  return lines.join('\n')
}

function logWarnings(warnings: ContractIssue[]): void {
  for (const warning of warnings) {
    const msg = `${warning.code}: ${warning.message}`
    if (process.env.GITHUB_ACTIONS === 'true') {
      console.log(`::warning::${msg}`)
    } else {
      console.warn(`[verify:contracts] WARN ${msg}`)
    }
  }
}

function main(): void {
  const rootDir = process.cwd()
  const report = verifyContracts(rootDir)

  const reportsDir = path.join(rootDir, 'reports')
  mkdirSync(reportsDir, { recursive: true })

  const jsonPath = path.join(reportsDir, 'contract-verification.json')
  const mdPath = path.join(reportsDir, 'contract-verification.md')

  writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8')
  writeFileSync(mdPath, toMarkdown(report), 'utf-8')

  console.log(`[verify:contracts] report written: ${rel(path.relative(rootDir, jsonPath))}`)
  console.log(`[verify:contracts] report written: ${rel(path.relative(rootDir, mdPath))}`)
  console.log(
    `[verify:contracts] summary: ok=${report.summary.ok} warnings=${report.summary.warnings} errors=${report.summary.errors}`,
  )

  if (report.warnings.length > 0) {
    logWarnings(report.warnings)
  }

  if (report.errors.length > 0) {
    process.exitCode = 1
  }
}

main()
