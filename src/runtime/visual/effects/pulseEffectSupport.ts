import type { ShaderMaterial, Texture } from 'three'
import type { VideoNodeParams } from './VideoNode'
import {
  clamp,
  getGlobalClampNumber,
  getSafeModeClampNumber,
  resolveNumberParam,
} from './paramUtils'
import { advancePulsePhase, smoothPulseValue } from './pulseOscillator'
import { bindInputTexture, createEffectMaterial } from './shaderMaterial'

export interface PulseParameters {
  depth: number
  rate: number
  smoothing: number
}

export interface PulseSmoothingConfig {
  tauScale: number
  minTau: number
  maxTau: number
}

export class PulseEnvelope {
  private phase = 0
  private smoothed = 0.5

  current(): number {
    return this.smoothed
  }

  advance(delta: number, rate: number, smoothing: number, config: PulseSmoothingConfig): number {
    this.phase = advancePulsePhase(this.phase, delta, rate)
    this.smoothed = smoothPulseValue(
      this.phase,
      this.smoothed,
      delta,
      smoothing,
      config.tauScale,
      config.minTau,
      config.maxTau,
    )
    return this.smoothed
  }
}

export function resolvePulseParameters(
  params: VideoNodeParams,
  defaultSmoothing: number,
): PulseParameters {
  const intensity = clamp(params.intensity ?? 0, 0, 1)
  const globalMaxDepth = getGlobalClampNumber(params, 'max_pulse_depth', 0.18)
  const globalMaxHz = getGlobalClampNumber(params, 'max_flash_hz', 3)
  let depth = clamp(
    resolveNumberParam(params, 'depth', 0) * intensity,
    0,
    clamp(globalMaxDepth, 0, 1),
  )
  let rate = clamp(resolveNumberParam(params, 'rate', 1), 0.05, clamp(globalMaxHz, 0.1, 10))
  if (params.safeMode) {
    const safeDepth = getSafeModeClampNumber(params, 'max_pulse_depth', globalMaxDepth)
    const safeHz = getSafeModeClampNumber(params, 'max_flash_hz', globalMaxHz)
    depth = Math.min(depth, clamp(safeDepth, 0, 1))
    rate = Math.min(rate, clamp(safeHz, 0.1, 10))
  }
  return {
    depth,
    rate,
    smoothing: clamp(resolveNumberParam(params, 'smoothing', defaultSmoothing), 0, 0.999),
  }
}

export function getPulseMaterial(
  material: ShaderMaterial | null,
  inputTexture: Texture,
  fragmentShader: string,
  uniforms: Record<string, { value: unknown }>,
): ShaderMaterial {
  if (!material) return createEffectMaterial(inputTexture, fragmentShader, uniforms)
  bindInputTexture(material, inputTexture)
  return material
}
