/**
 * Phase 12: Consistent logging strategy (dev vs prod).
 * - Dev: log debug/info/warn/error to console.
 * - Prod: no debug/info; warn/error only (no sensitive data in any case).
 * Never log device IDs, media content, user identifiers, or stream/track details.
 */

const isDev = import.meta.env.DEV

export const logger = {
  debug(...args: unknown[]): void {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.debug('[inner-echo]', ...args)
    }
  },

  info(...args: unknown[]): void {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.info('[inner-echo]', ...args)
    }
  },

  warn(...args: unknown[]): void {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.warn('[inner-echo]', ...args)
    }
  },

  error(...args: unknown[]): void {
    // Always log errors (dev and prod) but never include sensitive data
    // eslint-disable-next-line no-console
    console.error('[inner-echo]', ...args)
  },
}
