import type { ContractParamMetadata } from '../../src/contractVerification/types'

export function probeLow(meta: ContractParamMetadata): unknown {
  if (meta.probeLow !== undefined) return meta.probeLow
  if (meta.type === 'boolean') return false
  if (meta.type === 'enum') return meta.enumValues?.[0]
  return typeof meta.min === 'number' ? meta.min : meta.defaultValue
}
