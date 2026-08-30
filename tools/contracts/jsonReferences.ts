import { readFileSync } from 'node:fs'
import path from 'node:path'
import { parseFirstJsonObject } from '../shared/json/jsonObjectParser'
import type {
  ContractIssue,
  ContractReference,
  LoadedContracts,
  LoadedProfileContract,
} from './probes/types'
import { loadProfileContracts } from './profiles'

type ReferenceKind = ContractReference['kind']
type StackReferenceType = Extract<
  ContractReference['referenceType'],
  | 'profile_video_stack_node'
  | 'profile_video_stack_param'
  | 'profile_audio_stack_node'
  | 'profile_audio_stack_param'
>
type MotifReferenceType = Extract<
  ContractReference['referenceType'],
  | 'mapping_video_motif_node'
  | 'mapping_video_motif_param'
  | 'mapping_audio_motif_node'
  | 'mapping_audio_motif_param'
>
type DimensionReferenceType = Extract<
  ContractReference['referenceType'],
  'dimensions_video_node' | 'dimensions_audio_node'
>

interface NodeWithParams {
  node?: unknown
  params?: Record<string, unknown>
}

interface MappingMotif {
  node?: string
  params_hint?: Record<string, unknown>
}

interface MappingEntry {
  video_motifs?: MappingMotif[]
  audio_motifs?: MappingMotif[]
}

interface MappingDocument {
  mapping?: Record<string, MappingEntry>
}

interface DimensionEntry {
  id?: string
  motif_summary?: {
    video_nodes?: string[]
    audio_nodes?: string[]
  }
}

interface DimensionsDocument {
  dimensions?: DimensionEntry[]
}

interface NodeReferenceOptions {
  kind: ReferenceKind
  sourceFile: string
  locationPrefix: string
  nodeReferenceType: StackReferenceType | MotifReferenceType
  paramReferenceType: StackReferenceType | MotifReferenceType
  profileId?: string
}

function parseReactiveTarget(
  target: string,
): { kind: ReferenceKind; node: string; param: string } | null {
  const match = /^(video|audio)\.([^.]*)\.(.+)$/i.exec(String(target ?? '').trim())
  if (!match?.[2]) return null
  return {
    kind: match[1].toLowerCase() as ReferenceKind,
    node: match[2].toLowerCase(),
    param: match[3].toLowerCase(),
  }
}

function rel(rootDir: string, filePath: string): string {
  return path.relative(rootDir, filePath).replaceAll(path.sep, '/')
}

function addNodeAndParamReferences(
  references: ContractReference[],
  def: NodeWithParams,
  options: NodeReferenceOptions,
) {
  const { kind, sourceFile, locationPrefix, nodeReferenceType, paramReferenceType, profileId } =
    options
  const node = String(def.node ?? '').toLowerCase()
  references.push({
    kind,
    node,
    sourceFile,
    profileId,
    location: `${locationPrefix}.node`,
    referenceType: nodeReferenceType,
  })
  for (const [param, value] of Object.entries(def.params ?? {})) {
    references.push({
      kind,
      node,
      param,
      value,
      sourceFile,
      profileId,
      location: `${locationPrefix}.params.${param}`,
      referenceType: paramReferenceType,
    })
  }
}

function collectStackReferences(
  references: ContractReference[],
  stack: NodeWithParams[],
  kind: ReferenceKind,
  sourceFile: string,
  profileId: string,
  locationPrefix: string,
  nodeReferenceType: StackReferenceType,
  paramReferenceType: StackReferenceType,
) {
  for (let i = 0; i < stack.length; i++) {
    addNodeAndParamReferences(references, stack[i], {
      kind,
      sourceFile,
      locationPrefix: `${locationPrefix}[${i}]`,
      nodeReferenceType,
      paramReferenceType,
      profileId,
    })
  }
}

function collectReactiveReferences(
  references: ContractReference[],
  profile: LoadedProfileContract,
  parseErrors: ContractIssue[],
) {
  const reactive = profile.profile.reactive?.analyser_to_params ?? []
  for (let i = 0; i < reactive.length; i++) {
    const entry = reactive[i]
    const resolved = parseReactiveTarget(entry.target)
    const location = `reactive.analyser_to_params[${i}].target`
    if (!resolved) {
      parseErrors.push({
        severity: 'warning',
        code: 'REACTIVE_TARGET_PARSE_WARNING',
        message: `Could not parse reactive target "${entry.target}" in ${profile.profileId}`,
        sourceFile: profile.sourceFile,
        profileId: profile.profileId,
        location,
      })
      continue
    }
    references.push({
      kind: resolved.kind,
      node: resolved.node,
      param: resolved.param,
      sourceFile: profile.sourceFile,
      profileId: profile.profileId,
      location,
      referenceType: 'profile_reactive_target',
    })
  }
}

function collectProfileReferences(
  profiles: LoadedProfileContract[],
  references: ContractReference[],
  parseErrors: ContractIssue[],
) {
  for (const profile of profiles) {
    const { profile: data, profileId, sourceFile } = profile
    collectStackReferences(
      references,
      data.video_stack,
      'video',
      sourceFile,
      profileId,
      'video_stack',
      'profile_video_stack_node',
      'profile_video_stack_param',
    )
    collectStackReferences(
      references,
      data.audio_stack?.chain ?? [],
      'audio',
      sourceFile,
      profileId,
      'audio_stack.chain',
      'profile_audio_stack_node',
      'profile_audio_stack_param',
    )
    collectReactiveReferences(references, profile, parseErrors)
  }
}

function collectMappingMotifs(
  references: ContractReference[],
  motifs: MappingMotif[] | undefined,
  kind: ReferenceKind,
  sourceFile: string,
  locationPrefix: string,
  nodeReferenceType: MotifReferenceType,
  paramReferenceType: MotifReferenceType,
) {
  for (let i = 0; i < (motifs ?? []).length; i++) {
    const motif = motifs?.[i]
    const node = String(motif?.node ?? '').toLowerCase()
    if (!node) continue
    addNodeAndParamReferences(
      references,
      { node, params: motif?.params_hint },
      {
        kind,
        sourceFile,
        locationPrefix: `${locationPrefix}[${i}]`,
        nodeReferenceType,
        paramReferenceType,
      },
    )
  }
}

function collectMappingReferences(
  references: ContractReference[],
  mapping: MappingDocument,
  sourceFile: string,
) {
  for (const [dimensionId, entry] of Object.entries(mapping.mapping ?? {})) {
    const prefix = `mapping.${dimensionId}`
    collectMappingMotifs(
      references,
      entry.video_motifs,
      'video',
      sourceFile,
      `${prefix}.video_motifs`,
      'mapping_video_motif_node',
      'mapping_video_motif_param',
    )
    collectMappingMotifs(
      references,
      entry.audio_motifs,
      'audio',
      sourceFile,
      `${prefix}.audio_motifs`,
      'mapping_audio_motif_node',
      'mapping_audio_motif_param',
    )
  }
}

function addParseError(
  parseErrors: ContractIssue[],
  code: 'MAPPING_PARSE_ERROR' | 'DIMENSIONS_PARSE_ERROR',
  error: unknown,
  sourceFile: string,
) {
  parseErrors.push({
    severity: 'error',
    code,
    message: error instanceof Error ? error.message : `Failed to parse ${sourceFile}`,
    sourceFile,
  })
}

function collectMappingJsonReferences(
  rootDir: string,
  references: ContractReference[],
  parseErrors: ContractIssue[],
) {
  const absolute = path.join(
    rootDir,
    'src',
    'content',
    'experience',
    'dimension-to-signal-mapping.json',
  )
  const sourceFile = rel(rootDir, absolute)
  try {
    const mapping = parseFirstJsonObject<MappingDocument>(readFileSync(absolute, 'utf-8'), {
      predicate(value) {
        const m = (value as MappingDocument).mapping
        return m != null && typeof m === 'object' && !Array.isArray(m)
      },
    })
    collectMappingReferences(references, mapping, sourceFile)
  } catch (error) {
    addParseError(parseErrors, 'MAPPING_PARSE_ERROR', error, sourceFile)
  }
}

function collectDimensionNodes(
  references: ContractReference[],
  nodes: string[] | undefined,
  kind: ReferenceKind,
  sourceFile: string,
  locationPrefix: string,
  referenceType: DimensionReferenceType,
) {
  for (let i = 0; i < (nodes ?? []).length; i++) {
    const node = String(nodes?.[i] ?? '').toLowerCase()
    if (!node) continue
    references.push({
      kind,
      node,
      sourceFile,
      location: `${locationPrefix}[${i}]`,
      referenceType,
    })
  }
}

function collectDimensionsReferences(
  references: ContractReference[],
  dimensions: DimensionsDocument,
  sourceFile: string,
) {
  for (let i = 0; i < (dimensions.dimensions ?? []).length; i++) {
    const dim = dimensions.dimensions?.[i]
    const id = String(dim?.id ?? `dim_${i}`)
    const prefix = `dimensions[${i}].motif_summary`
    collectDimensionNodes(
      references,
      dim?.motif_summary?.video_nodes,
      'video',
      sourceFile,
      `${prefix}.video_nodes (${id})`,
      'dimensions_video_node',
    )
    collectDimensionNodes(
      references,
      dim?.motif_summary?.audio_nodes,
      'audio',
      sourceFile,
      `${prefix}.audio_nodes (${id})`,
      'dimensions_audio_node',
    )
  }
}

function collectDimensionsJsonReferences(
  rootDir: string,
  references: ContractReference[],
  parseErrors: ContractIssue[],
) {
  const absolute = path.join(rootDir, 'src', 'content', 'experience', 'experience-dimensions.json')
  const sourceFile = rel(rootDir, absolute)
  try {
    const dimensions = parseFirstJsonObject<DimensionsDocument>(readFileSync(absolute, 'utf-8'), {
      predicate(value) {
        return Array.isArray((value as DimensionsDocument).dimensions)
      },
    })
    collectDimensionsReferences(references, dimensions, sourceFile)
  } catch (error) {
    addParseError(parseErrors, 'DIMENSIONS_PARSE_ERROR', error, sourceFile)
  }
}

export function loadContractJsonReferences(rootDir: string): LoadedContracts {
  const { profiles, issues: parseErrors } = loadProfileContracts(rootDir)
  const references: ContractReference[] = []
  collectProfileReferences(profiles, references, parseErrors)
  collectMappingJsonReferences(rootDir, references, parseErrors)
  collectDimensionsJsonReferences(rootDir, references, parseErrors)
  return { profiles, references, parseErrors }
}
