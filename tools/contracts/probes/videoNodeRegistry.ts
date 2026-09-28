import type { ContractNodeDefinition } from './types'
import { buildNodeLookup, summarizeNodeDefinitions } from './nodeRegistry'
import { PRIMARY_VIDEO_NODE_DEFINITIONS } from './videoNodeDefinitionsPrimary'
import { SECONDARY_VIDEO_NODE_DEFINITIONS } from './videoNodeDefinitionsSecondary'

export const videoNodeDefinitions: ContractNodeDefinition[] = [
  ...PRIMARY_VIDEO_NODE_DEFINITIONS,
  ...SECONDARY_VIDEO_NODE_DEFINITIONS,
]

export function buildVideoNodeLookup(): Map<string, ContractNodeDefinition> {
  return buildNodeLookup(videoNodeDefinitions)
}

export function getVideoRegistrySummaries() {
  return summarizeNodeDefinitions(videoNodeDefinitions)
}
