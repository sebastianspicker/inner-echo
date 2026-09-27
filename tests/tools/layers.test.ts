import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { demoAllowedLayers, listSourceLayers } from '../../tools/architecture/layers.mjs'

const roots: string[] = []
function fixture(layerNames: string[]): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'inner-echo-layers-'))
  roots.push(root)
  for (const name of layerNames) fs.mkdirSync(path.join(root, 'src', name), { recursive: true })
  fs.writeFileSync(path.join(root, 'src', 'main.tsx'), '')
  return root
}
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true })
})

describe('source layer discovery', () => {
  it('lists only directories directly under src/, not files', () => {
    const root = fixture(['app', 'shared'])
    expect(listSourceLayers(root).sort()).toEqual(['app', 'shared'])
  })

  it('reflects a newly added layer directory without a hand-maintained list', () => {
    const root = fixture(['app', 'content', 'domain', 'platform', 'runtime', 'shared', 'demo'])
    expect(listSourceLayers(root).sort()).toEqual(
      ['app', 'content', 'demo', 'domain', 'platform', 'runtime', 'shared'].sort(),
    )
  })
})

describe('demo forbidden layer derivation', () => {
  it('excludes only the layers the demo entry is allowed to depend on', () => {
    const root = fixture(['app', 'content', 'demo', 'domain', 'platform', 'runtime', 'shared'])
    const forbidden = listSourceLayers(root).filter((layer) => !demoAllowedLayers.has(layer))
    expect(forbidden.sort()).toEqual(['app', 'content', 'domain', 'platform', 'runtime'])
  })

  it('fails closed on a newly added production layer', () => {
    const root = fixture(['app', 'demo', 'shared', 'newlayer'])
    const forbidden = listSourceLayers(root).filter((layer) => !demoAllowedLayers.has(layer))
    expect(forbidden).toContain('newlayer')
  })
})
