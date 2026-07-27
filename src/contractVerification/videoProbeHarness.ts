import { Texture } from 'three'
import type { VideoNode } from '../engine/effects'
import type { ProbeHarness, ProbeOptions, SafetyContextShape } from './types'
import { getByPath } from './utils'

const DEFAULT_SAFETY_CONTEXT: SafetyContextShape = {
  global: {
    max_intensity: 1,
    max_chroma: 0.12,
    max_global_contrast: 0.25,
    max_feedback: 0.18,
    max_jitter: 0.06,
    max_pulse_depth: 0.18,
    max_flash_hz: 3,
    max_luminance_delta_per_frame: 0.25,
  },
  safeMode: {},
}

export class VideoProbeHarness implements ProbeHarness {
  readonly node: VideoNode & Record<string, unknown>
  private readonly input = new Texture()
  private readonly previous = new Texture()

  constructor(factory: () => VideoNode) {
    this.node = factory() as VideoNode & Record<string, unknown>
    if (this.node.needsPreviousFrame) this.node.getMaterial(this.input, this.previous)
    else this.node.getMaterial(this.input)
    if (typeof this.node.time === 'number') this.node.time = 1
  }

  applyParam(paramKey: string, value: unknown, options?: ProbeOptions): void {
    const controlValues: Record<string, number | boolean | string> = {}
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
      controlValues[`0.${paramKey}`] = value
    }
    this.node.setParams({
      intensity: options?.intensity ?? 1,
      safeMode: options?.safeMode === true,
      safetyContext: options?.safetyContext ?? DEFAULT_SAFETY_CONTEXT,
      controlValues,
      nodeIndex: 0,
      uvScale: [1, 1],
      uvOffset: [0, 0],
    })
  }

  readPath(path: string): unknown {
    return getByPath({ node: this.node }, path)
  }

  dispose(): void {
    this.node.dispose()
    this.input.dispose()
    this.previous.dispose()
  }
}
