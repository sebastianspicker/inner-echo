interface WarningIssue {
  code: string
  message: string
  profileId?: string
}

export function logWarnings(
  prefix: string,
  warnings: WarningIssue[],
  includeProfile = false,
): void {
  for (const warning of warnings) {
    const profile = includeProfile && warning.profileId ? ` profile=${warning.profileId}` : ''
    const message = `${warning.code}:${profile} ${warning.message}`
    if (process.env.GITHUB_ACTIONS === 'true') {
      console.log(`::warning::${message}`)
    } else {
      console.warn(`[${prefix}] WARN ${message}`)
    }
  }
}
