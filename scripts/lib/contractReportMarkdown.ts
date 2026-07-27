import type {
  ContractIssue,
  ContractVerificationReport,
  PolicyCheckResult,
  RangeCheckResult,
} from '../../src/contractVerification/types'

function issueLine(issue: ContractIssue) {
  const where = [
    issue.sourceFile,
    issue.location,
    issue.profileId ? `profile=${issue.profileId}` : null,
  ]
    .filter(Boolean)
    .join(' | ')
  const target = [issue.kind, issue.node, issue.param].filter(Boolean).join('.')
  return `- [${issue.severity.toUpperCase()}] \`${issue.code}\` ${issue.message}${target ? ` (\`${target}\`)` : ''}${where ? `: ${where}` : ''}`
}

function rangeLine(range: RangeCheckResult) {
  return `- [${range.status.toUpperCase()}] \`${range.kind}.${range.node}.${range.param}\` min=${String(range.min)} max=${String(range.max)} observedMin=${String(range.observedMin)} observedMax=${String(range.observedMax)}: ${range.message}`
}

function policyLine(policy: PolicyCheckResult) {
  const target = [policy.node, policy.param].filter(Boolean).join('.')
  return `- [${policy.status.toUpperCase()}] profile=\`${policy.profileId}\` policy=\`${policy.policy}\`${target ? ` target=\`${target}\`` : ''}: ${policy.message}`
}

function section(lines: string[], heading: string, entries: string[], empty: string) {
  lines.push(`## ${heading}`, '')
  lines.push(...(entries.length === 0 ? [empty] : entries), '')
}

export function contractReportMarkdown(report: ContractVerificationReport) {
  const lines = [
    '# Contract Verification Report',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Profiles: ${report.summary.profiles}`,
    `- References: ${report.summary.references}`,
    `- OK checks: ${report.summary.ok}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Errors: ${report.summary.errors}`,
    '',
  ]
  section(lines, 'Missing Nodes', report.missingNodes.map(issueLine), '- None')
  section(lines, 'Missing Params', report.missingParams.map(issueLine), '- None')
  section(lines, 'Unused Params', report.unusedParams.map(issueLine), '- None')
  section(
    lines,
    'Out-of-Range Handling',
    report.rangeChecks.map(rangeLine),
    '- No numeric range checks were executed',
  )
  section(
    lines,
    'Policy Compliance',
    report.policyChecks.map(policyLine),
    '- No policy checks were executed',
  )
  section(lines, 'All Warnings', report.warnings.map(issueLine), '- None')
  section(lines, 'All Errors', report.errors.map(issueLine), '- None')
  return lines.join('\n')
}
