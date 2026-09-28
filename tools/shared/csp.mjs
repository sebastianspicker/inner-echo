/**
 * Content-Security-Policy directive set shared by Vite's dev/preview
 * response headers, the GitHub Pages meta-delivered policy
 * (`tools/deployment/pages-config.mjs`), and the static `public/_headers`
 * file. The directives are declared once here; only the delivery mechanism
 * (response header vs. `<meta>`, dev vs. production) varies per export.
 */

const BASE_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
]

const FRAME_ANCESTORS_NONE = "frame-ancestors 'none'"

function withDevUnsafeInline(directives) {
  return directives.map((directive) =>
    directive.startsWith('script-src') || directive.startsWith('style-src')
      ? `${directive} 'unsafe-inline'`
      : directive,
  )
}

/**
 * Meta-delivered policy: a `<meta http-equiv="Content-Security-Policy">`
 * element cannot enforce `frame-ancestors`, so it is omitted here. Has no
 * trailing `;`; callers append one when rendering the `content` attribute.
 */
export const pagesContentSecurityPolicy = BASE_DIRECTIVES.join('; ')

/** Production response-header policy (`Content-Security-Policy` header, includes `frame-ancestors`). */
export const headerContentSecurityPolicy = `${[...BASE_DIRECTIVES, FRAME_ANCESTORS_NONE].join('; ')};`

/**
 * Dev-only response-header policy: adds `'unsafe-inline'` to `script-src`
 * and `style-src` for Vite's dev-time inline styles and scripts.
 */
export const devContentSecurityPolicy = `${[...withDevUnsafeInline(BASE_DIRECTIVES), FRAME_ANCESTORS_NONE].join('; ')};`
