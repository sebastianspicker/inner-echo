import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(self)',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';",
}

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false, // Defence-in-depth: never ship sourcemaps to production.
  },
  server: { headers: securityHeaders },
  preview: { headers: securityHeaders },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'clover'],
      thresholds: {
        statements: 80,
        branches: 65,
        functions: 85,
        lines: 80,
      },
    },
  },
})
