import { describe, expect, it } from 'vitest'

import {
  collectChunkClosure,
  demoForbiddenCapabilities,
  demoForbiddenFrameworks,
  findForbiddenCapabilitiesInChunkClosure,
  findForbiddenDemoCapabilities,
  findForbiddenDemoFrameworks,
} from '../../tools/deployment/demo-artifact-policy.mjs'

describe('demo artifact policy', () => {
  it('collects nested static and dynamic chunks', () => {
    const manifest = {
      entry: { imports: ['static-chunk'], dynamicImports: ['dynamic-chunk'] },
      'static-chunk': { imports: ['shared-chunk'] },
      'dynamic-chunk': { dynamicImports: ['nested-dynamic-chunk'] },
      'shared-chunk': {},
      'nested-dynamic-chunk': {},
    }

    expect(collectChunkClosure(manifest, ['entry']).sort()).toEqual([
      'dynamic-chunk',
      'entry',
      'nested-dynamic-chunk',
      'shared-chunk',
      'static-chunk',
    ])
  })

  it('can restrict a closure to eager static imports', () => {
    const manifest = {
      entry: { imports: ['static-chunk'], dynamicImports: ['dynamic-chunk'] },
      'static-chunk': { imports: ['shared-chunk'] },
      'dynamic-chunk': {},
      'shared-chunk': {},
    }

    expect(
      collectChunkClosure(manifest, ['entry'], { includeDynamicImports: false }).sort(),
    ).toEqual(['entry', 'shared-chunk', 'static-chunk'])
  })

  it('scans a forbidden capability in a nested dynamic chunk', () => {
    const manifest = {
      entry: { dynamicImports: ['first-dynamic-chunk'] },
      'first-dynamic-chunk': { imports: ['nested-static-chunk'] },
      'nested-static-chunk': {},
    }
    const sourcesByChunk = new Map([
      ['entry', 'document.addEventListener("click", updateView)'],
      ['first-dynamic-chunk', 'export const state = {}'],
      ['nested-static-chunk', 'fetch("/not-allowed")'],
    ])

    expect(findForbiddenCapabilitiesInChunkClosure(manifest, ['entry'], sourcesByChunk)).toContain(
      'fetch',
    )
  })

  it.each(
    demoForbiddenCapabilities,
  )('rejects %s in any demo chunk', (capability, _pattern, example) => {
    expect(findForbiddenDemoCapabilities(example)).toContain(capability)
  })

  it.each(
    demoForbiddenFrameworks,
  )('rejects %s in the demo closure', (framework, _pattern, example) => {
    expect(findForbiddenDemoFrameworks(example)).toContain(framework)
  })

  it('accepts a clean demo closure', () => {
    const manifest = { entry: { imports: ['shared'] }, shared: {} }
    const sourcesByChunk = new Map([
      ['entry', 'document.addEventListener("click", updateView)'],
      ['shared', 'export const demoLabel = "simulated"'],
    ])

    expect(findForbiddenCapabilitiesInChunkClosure(manifest, ['entry'], sourcesByChunk)).toEqual([])
  })
})
