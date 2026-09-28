import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  devContentSecurityPolicy,
  headerContentSecurityPolicy,
  pagesContentSecurityPolicy,
} from '../../tools/shared/csp.mjs'

const repoRoot = path.resolve(import.meta.dirname, '../..')

function headersContentSecurityPolicy(): string {
  const text = fs.readFileSync(path.join(repoRoot, 'public/_headers'), 'utf8')
  const line = text.split('\n').find((entry) => entry.trim().startsWith('Content-Security-Policy:'))
  return line?.replace(/^\s*Content-Security-Policy:\s*/, '').trim() ?? ''
}

describe('shared Content-Security-Policy directives', () => {
  it('keeps public/_headers in sync with the derived header policy', () => {
    expect(headersContentSecurityPolicy()).toBe(headerContentSecurityPolicy)
  })

  it('enforces frame-ancestors only in response-header variants', () => {
    expect(headerContentSecurityPolicy).toContain("frame-ancestors 'none'")
    expect(devContentSecurityPolicy).toContain("frame-ancestors 'none'")
    expect(pagesContentSecurityPolicy).not.toContain('frame-ancestors')
  })

  it('only relaxes script-src and style-src for dev', () => {
    expect(devContentSecurityPolicy).toContain("script-src 'self' 'unsafe-inline'")
    expect(devContentSecurityPolicy).toContain("style-src 'self' 'unsafe-inline'")
    expect(headerContentSecurityPolicy).not.toContain('unsafe-inline')
    expect(pagesContentSecurityPolicy).not.toContain('unsafe-inline')
  })
})
