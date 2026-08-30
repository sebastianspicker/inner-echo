import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const baseSecurityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(self)',
}

const devHeaders = {
  ...baseSecurityHeaders,
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';",
}

const productionHeaders = {
  ...baseSecurityHeaders,
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';",
}

export default defineConfig({
  plugins: [react()],
  build: {
    manifest: 'manifest.json',
    sourcemap: false, // Defence-in-depth: never ship sourcemaps to production.
  },
  server: { headers: devHeaders },
  preview: { headers: productionHeaders },
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
