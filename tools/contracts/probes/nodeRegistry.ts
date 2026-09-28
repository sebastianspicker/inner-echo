import type {
  ContractNodeDefinition,
  ContractParamMetadata,
  ProbeHarness,
  RegistryNodeSummary,
} from './types'

interface NumberParamConfig {
  defaultValue: number
  min?: number
  max?: number
  safeModeClampKey?: string
  probeLow?: number
  probeHigh?: number
  epsilon?: number
}

export function numberParam(readPath: string, config: NumberParamConfig): ContractParamMetadata {
  return {
    type: 'number',
    ...config,
    readEffective(harness: ProbeHarness): unknown {
      return (harness as ProbeHarness & { readPath(path: string): unknown }).readPath(readPath)
    },
  }
}

export function buildNodeLookup(
  definitions: readonly ContractNodeDefinition[],
): Map<string, ContractNodeDefinition> {
  const lookup = new Map<string, ContractNodeDefinition>()
  for (const definition of definitions) {
    lookup.set(definition.node, definition)
    for (const alias of definition.aliases ?? []) lookup.set(alias, definition)
  }
  return lookup
}

export function summarizeNodeDefinitions(
  definitions: readonly ContractNodeDefinition[],
): RegistryNodeSummary[] {
  return definitions.map((definition) => {
    const params: RegistryNodeSummary['params'] = {}
    for (const [key, metadata] of Object.entries(definition.params)) {
      params[key] = {
        type: metadata.type,
        defaultValue: metadata.defaultValue,
        min: metadata.min,
        max: metadata.max,
        enumValues: metadata.enumValues,
        safeModeClampKey: metadata.safeModeClampKey,
      }
    }
    return {
      kind: definition.kind,
      node: definition.node,
      aliases: [...(definition.aliases ?? [])],
      params,
    }
  })
}
