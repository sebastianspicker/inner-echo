import type { ContractParamMetadata } from '../../src/contractVerification/types'

export function probeHigh(meta: ContractParamMetadata): unknown {
  if (meta.probeHigh !== undefined) return meta.probeHigh
  if (meta.type === 'boolean') return true
  if (meta.type === 'enum') {
    const values = meta.enumValues ?? []
    return values[values.length - 1]
  }
  if (typeof meta.max === 'number') return meta.max
  return typeof meta.defaultValue === 'number' ? meta.defaultValue + 1 : meta.defaultValue
}
