import { describe, expect, it } from 'vitest'
import { inspectRuntimeBoundaries } from '../../tools/release/runtime-boundaries.mjs'

function manifest() {
  return {
    welcome: {
      src: 'index.html',
      isEntry: true,
      imports: ['react'],
      dynamicImports: ['workspace', 'evidence'],
    },
    react: { file: 'react.js' },
    workspace: {
      src: 'src/app/experience/ExperienceWorkspace.tsx',
      isDynamicEntry: true,
      imports: ['react'],
      dynamicImports: ['audio', 'graphics', 'evidence'],
    },
    audio: { src: 'src/runtime/audio/audioEngine.ts', isDynamicEntry: true },
    evidence: {
      src: 'src/app/experience/evidence/EvidenceDrawer.tsx',
      isDynamicEntry: true,
      imports: ['react'],
    },
    graphics: { src: 'src/runtime/visual/graph/index.ts', isDynamicEntry: true },
  }
}

describe('optional runtime bundle boundaries', () => {
  it('accepts separate lazy closures with shared React', () => {
    expect(inspectRuntimeBoundaries(manifest())).toEqual([])
  })
  it.each([
    'workspace',
    'audio',
    'evidence',
    'graphics',
  ] as const)('rejects eager %s loading from welcome', (boundary) => {
    const chunks = manifest()
    chunks.welcome.imports.push(boundary)
    expect(inspectRuntimeBoundaries(chunks)).toContain(`welcome eagerly loads ${boundary}`)
  })
  it.each([
    'workspace',
    'evidence',
  ] as const)('rejects an indirect audio dependency from %s', (entry) => {
    const chunks = { ...manifest(), shared: { imports: ['audio'] } }
    chunks[entry].imports.push('shared')
    expect(inspectRuntimeBoundaries(chunks)).toContain(`${entry} eagerly loads audio`)
  })
  it('rejects a lost lazy entry or eager Three dependency', () => {
    const chunks = { ...manifest(), three: { file: 'assets/three.core-abc.js' } }
    chunks.graphics.isDynamicEntry = false
    chunks.welcome.imports.push('three')
    const failures = inspectRuntimeBoundaries(chunks)
    expect(failures.some((failure: string) => failure.includes('missing graphics'))).toBe(true)
    expect(failures.some((failure: string) => failure.includes('welcome static closure'))).toBe(
      true,
    )
  })
})
