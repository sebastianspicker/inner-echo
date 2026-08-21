const DEFAULT_PROJECT_BASE_PATH = '/inner-echo/'

export const pagesContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

export function getPagesBasePath(environment = process.env) {
  const configured = Object.hasOwn(environment, 'INNER_ECHO_PAGES_BASE_PATH')
    ? environment.INNER_ECHO_PAGES_BASE_PATH
    : DEFAULT_PROJECT_BASE_PATH
  const trimmed = configured?.trim() ?? ''

  if (trimmed === '' || trimmed === '/') return '/'

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  const normalized = withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`

  const segments = normalized.split('/').filter(Boolean)
  if (
    !/^\/(?:[A-Za-z0-9._~-]+\/)*$/.test(normalized) ||
    segments.some((segment) => segment === '.' || segment === '..')
  ) {
    throw new Error(`Invalid GitHub Pages base path: ${configured}`)
  }

  return normalized
}
