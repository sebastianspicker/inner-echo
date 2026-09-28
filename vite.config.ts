import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { devContentSecurityPolicy, headerContentSecurityPolicy } from './tools/shared/csp.mjs'

const baseSecurityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(self)',
}

const devHeaders = {
  ...baseSecurityHeaders,
  'Content-Security-Policy': devContentSecurityPolicy,
}

const productionHeaders = {
  ...baseSecurityHeaders,
  'Content-Security-Policy': headerContentSecurityPolicy,
}

export default defineConfig({
  plugins: [react()],
  build: {
    modulePreload: { polyfill: false },
    manifest: 'manifest.json',
    sourcemap: false, // Defence-in-depth: never ship sourcemaps to production.
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        demo: fileURLToPath(new URL('./demo/index.html', import.meta.url)),
      },
    },
  },
  server: { headers: devHeaders },
  preview: { headers: productionHeaders },
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
