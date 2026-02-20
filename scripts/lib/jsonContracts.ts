import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { profileSchema, type Profile } from '../../src/conditions/schema'
import { parseFirstJsonObject } from '../../src/utils/jsonObjectParser'
import type {
  ContractIssue,
  ContractReference,
  LoadedContracts,
  LoadedProfileContract,
} from '../../src/contractVerification/types'

function parseReactiveTarget(
  target: string
): { kind: 'video' | 'audio'; node: string; param: string } | null {
  const raw = String(target ?? '').trim().toLowerCase()
  if (!raw) return null
  const isVideo = raw.startsWith('video.')
  const isAudio = raw.startsWith('audio.')
  if (!isVideo && !isAudio) return null
  const rest = raw.slice(isVideo ? 'video.'.length : 'audio.'.length)
  const dot = rest.indexOf('.')
  if (dot <= 0 || dot >= rest.length - 1) return null
  return {
    kind: isVideo ? 'video' : 'audio',
    node: rest.slice(0, dot),
    param: rest.slice(dot + 1),
  }
}

function rel(rootDir: string, filePath: string): string {
  return path.relative(rootDir, filePath).replaceAll(path.sep, '/')
}

export function loadContractJsonReferences(rootDir: string): LoadedContracts {
  const parseErrors: ContractIssue[] = []
  const references: ContractReference[] = []
  const profiles: LoadedProfileContract[] = []

  const profilesDir = path.join(rootDir, 'src', 'conditions', 'profiles')
  const profileFiles = readdirSync(profilesDir)
    .filter((name: string) => name.endsWith('.json'))
    .sort((a: string, b: string) => a.localeCompare(b))

  for (const fileName of profileFiles) {
    const absolute = path.join(profilesDir, fileName)
    const sourceFile = rel(rootDir, absolute)
    let raw: unknown
    try {
      raw = JSON.parse(readFileSync(absolute, 'utf-8'))
    } catch (error) {
      parseErrors.push({
        severity: 'error',
        code: 'PROFILE_JSON_PARSE_ERROR',
        message:
          error instanceof Error
            ? error.message
            : `Failed to parse ${sourceFile}`,
        sourceFile,
      })
      continue
    }

    const parsed = profileSchema.safeParse(raw)
    if (!parsed.success) {
      parseErrors.push({
        severity: 'error',
        code: 'PROFILE_SCHEMA_ERROR',
        message: `Profile schema validation failed for ${sourceFile}`,
        sourceFile,
        details: parsed.error.flatten(),
      })
      continue
    }

    const profile = parsed.data as Profile
    profiles.push({
      profileId: profile.id,
      sourceFile,
      profile,
    })

    for (let i = 0; i < profile.video_stack.length; i++) {
      const def = profile.video_stack[i]
      references.push({
        kind: 'video',
        node: String(def.node).toLowerCase(),
        sourceFile,
        profileId: profile.id,
        location: `video_stack[${i}].node`,
        referenceType: 'profile_video_stack_node',
      })
      for (const [param, value] of Object.entries(def.params ?? {})) {
        references.push({
          kind: 'video',
          node: String(def.node).toLowerCase(),
          param,
          value,
          sourceFile,
          profileId: profile.id,
          location: `video_stack[${i}].params.${param}`,
          referenceType: 'profile_video_stack_param',
        })
      }
    }

    const chain = profile.audio_stack?.chain ?? []
    for (let i = 0; i < chain.length; i++) {
      const def = chain[i]
      references.push({
        kind: 'audio',
        node: String(def.node).toLowerCase(),
        sourceFile,
        profileId: profile.id,
        location: `audio_stack.chain[${i}].node`,
        referenceType: 'profile_audio_stack_node',
      })
      for (const [param, value] of Object.entries(def.params ?? {})) {
        references.push({
          kind: 'audio',
          node: String(def.node).toLowerCase(),
          param,
          value,
          sourceFile,
          profileId: profile.id,
          location: `audio_stack.chain[${i}].params.${param}`,
          referenceType: 'profile_audio_stack_param',
        })
      }
    }

    const reactive = profile.reactive?.analyser_to_params ?? []
    for (let i = 0; i < reactive.length; i++) {
      const entry = reactive[i]
      const resolved = parseReactiveTarget(entry.target)
      if (!resolved) {
        parseErrors.push({
          severity: 'warning',
          code: 'REACTIVE_TARGET_PARSE_WARNING',
          message: `Could not parse reactive target "${entry.target}" in ${profile.id}`,
          sourceFile,
          profileId: profile.id,
          location: `reactive.analyser_to_params[${i}].target`,
        })
        continue
      }
      references.push({
        kind: resolved.kind,
        node: resolved.node,
        param: resolved.param,
        sourceFile,
        profileId: profile.id,
        location: `reactive.analyser_to_params[${i}].target`,
        referenceType: 'profile_reactive_target',
      })
    }
  }

  const mappingAbsolute = path.join(
    rootDir,
    'src',
    'conditions',
    'dimension-to-signal-mapping.json'
  )
  const mappingSource = rel(rootDir, mappingAbsolute)
  try {
    const mapping = parseFirstJsonObject<{
      mapping?: Record<
        string,
        {
          video_motifs?: Array<{
            node?: string
            params_hint?: Record<string, unknown>
          }>
          audio_motifs?: Array<{
            node?: string
            params_hint?: Record<string, unknown>
          }>
        }
      >
    }>(readFileSync(mappingAbsolute, 'utf-8'), {
      predicate(value) {
        const m = (value as { mapping?: unknown }).mapping
        return m != null && typeof m === 'object' && !Array.isArray(m)
      },
    })
    for (const [dimensionId, entry] of Object.entries(mapping.mapping ?? {})) {
      for (let i = 0; i < (entry.video_motifs ?? []).length; i++) {
        const motif = entry.video_motifs?.[i]
        const node = String(motif?.node ?? '').toLowerCase()
        if (!node) continue
        references.push({
          kind: 'video',
          node,
          sourceFile: mappingSource,
          location: `mapping.${dimensionId}.video_motifs[${i}].node`,
          referenceType: 'mapping_video_motif_node',
        })
        for (const [param, value] of Object.entries(motif?.params_hint ?? {})) {
          references.push({
            kind: 'video',
            node,
            param,
            value,
            sourceFile: mappingSource,
            location: `mapping.${dimensionId}.video_motifs[${i}].params_hint.${param}`,
            referenceType: 'mapping_video_motif_param',
          })
        }
      }
      for (let i = 0; i < (entry.audio_motifs ?? []).length; i++) {
        const motif = entry.audio_motifs?.[i]
        const node = String(motif?.node ?? '').toLowerCase()
        if (!node) continue
        references.push({
          kind: 'audio',
          node,
          sourceFile: mappingSource,
          location: `mapping.${dimensionId}.audio_motifs[${i}].node`,
          referenceType: 'mapping_audio_motif_node',
        })
        for (const [param, value] of Object.entries(motif?.params_hint ?? {})) {
          references.push({
            kind: 'audio',
            node,
            param,
            value,
            sourceFile: mappingSource,
            location: `mapping.${dimensionId}.audio_motifs[${i}].params_hint.${param}`,
            referenceType: 'mapping_audio_motif_param',
          })
        }
      }
    }
  } catch (error) {
    parseErrors.push({
      severity: 'error',
      code: 'MAPPING_PARSE_ERROR',
      message:
        error instanceof Error
          ? error.message
          : `Failed to parse ${mappingSource}`,
      sourceFile: mappingSource,
    })
  }

  const dimensionsAbsolute = path.join(
    rootDir,
    'src',
    'conditions',
    'experience-dimensions.json'
  )
  const dimensionsSource = rel(rootDir, dimensionsAbsolute)
  try {
    const dimensions = parseFirstJsonObject<{
      dimensions?: Array<{
        id?: string
        motif_summary?: {
          video_nodes?: string[]
          audio_nodes?: string[]
        }
      }>
    }>(readFileSync(dimensionsAbsolute, 'utf-8'), {
      predicate(value) {
        const dims = (value as { dimensions?: unknown }).dimensions
        return Array.isArray(dims)
      },
    })
    for (let i = 0; i < (dimensions.dimensions ?? []).length; i++) {
      const dim = dimensions.dimensions?.[i]
      const id = String(dim?.id ?? `dim_${i}`)
      for (let j = 0; j < (dim?.motif_summary?.video_nodes ?? []).length; j++) {
        const node = String(dim?.motif_summary?.video_nodes?.[j] ?? '').toLowerCase()
        if (!node) continue
        references.push({
          kind: 'video',
          node,
          sourceFile: dimensionsSource,
          location: `dimensions[${i}].motif_summary.video_nodes[${j}] (${id})`,
          referenceType: 'dimensions_video_node',
        })
      }
      for (let j = 0; j < (dim?.motif_summary?.audio_nodes ?? []).length; j++) {
        const node = String(dim?.motif_summary?.audio_nodes?.[j] ?? '').toLowerCase()
        if (!node) continue
        references.push({
          kind: 'audio',
          node,
          sourceFile: dimensionsSource,
          location: `dimensions[${i}].motif_summary.audio_nodes[${j}] (${id})`,
          referenceType: 'dimensions_audio_node',
        })
      }
    }
  } catch (error) {
    parseErrors.push({
      severity: 'error',
      code: 'DIMENSIONS_PARSE_ERROR',
      message:
        error instanceof Error
          ? error.message
          : `Failed to parse ${dimensionsSource}`,
      sourceFile: dimensionsSource,
    })
  }

  return { profiles, references, parseErrors }
}
