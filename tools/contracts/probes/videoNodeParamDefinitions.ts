import type { ContractParamMetadata, ProbeHarness } from './types'
import { numberParam } from './nodeRegistry'
import type { VideoProbeHarness } from './videoProbeHarness'

export function pulseParams(defaultSmoothing: number): Record<string, ContractParamMetadata> {
  return {
    depth: numberParam('node.material.uniforms.u_depth.value', {
      defaultValue: 0,
      min: 0,
      max: 1,
      safeModeClampKey: 'max_pulse_depth',
    }),
    rate: numberParam('node.rateHz', {
      defaultValue: 1,
      min: 0.05,
      max: 10,
      safeModeClampKey: 'max_flash_hz',
    }),
    smoothing: numberParam('node.smoothing', {
      defaultValue: defaultSmoothing,
      min: 0,
      max: 0.999,
    }),
  }
}

export function millisecondsParam(
  readPath: string,
  config: { defaultValue: number; min: number; max: number },
): ContractParamMetadata {
  return {
    type: 'number',
    ...config,
    readEffective(harness: ProbeHarness): unknown {
      const seconds = (harness as VideoProbeHarness).readPath(readPath)
      return typeof seconds === 'number' ? seconds * 1000 : seconds
    },
  }
}
