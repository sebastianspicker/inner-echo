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
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';",
}

const productionHeaders = {
  ...baseSecurityHeaders,
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';",
}

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false, // Defence-in-depth: never ship sourcemaps to production.
    chunkSizeWarningLimit: 1100, // Three.js main chunk is ~1004 KB; acknowledge known size.
  },
  server: { headers: devHeaders },
  preview: { headers: productionHeaders },
  // Vitest defaults to the 'node' environment which suits the current test
  // suite (contract verification, audio graph, shader unit tests). No
  // explicit environmentMatchGlobs needed unless browser-specific tests are added.
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'clover'],
      exclude: ['scripts/**'],
      thresholds: {
        statements: 80,
        branches: 65,
        functions: 85,
        lines: 80,
      },
    },
  },
})
