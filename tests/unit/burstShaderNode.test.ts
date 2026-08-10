import { describe, expect, it } from 'vitest'
import * as THREE from 'three'

import { InterferenceNode } from '../../src/engine/effects/interferenceNode'
import { IntrusionBurstNode } from '../../src/engine/effects/intrusionBurstNode'
import type { VideoNode } from '../../src/engine/effects/VideoNode'

function dummyTexture(): THREE.Texture {
  return new THREE.Texture()
}

describe('engine/effects burst shader lifecycle', () => {
  it.each([
    ['InterferenceNode', () => new InterferenceNode()],
    ['IntrusionBurstNode', () => new IntrusionBurstNode()],
  ])('%s retains its material, rebinds input, and recreates after disposal', (_name, createNode) => {
    const node: VideoNode = createNode()
    const firstTexture = dummyTexture()
    const firstMaterial = node.getMaterial(firstTexture) as THREE.ShaderMaterial
    const nextTexture = dummyTexture()

    expect(node.getMaterial(nextTexture)).toBe(firstMaterial)
    expect(firstMaterial.uniforms.u_map.value).toBe(nextTexture)

    node.dispose()

    const recreatedMaterial = node.getMaterial(dummyTexture())
    expect(recreatedMaterial).not.toBe(firstMaterial)
    node.dispose()
  })
})
