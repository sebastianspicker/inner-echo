/**
 * Application Logger
 * 
 * A simple wrapper around `console` methods that ensures debug information
 * is ONLY printed when the application is running in Development mode.
 * 
 * In Production mode:
 * - `debug`, `info`, and `warn` are silenced.
 * - `error` is always logged.
 * 
 * Critical security note: Never log sensitive user data, media streams, or device IDs.
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
