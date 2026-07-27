import * as THREE from 'three'

import { getDefaultControlValues } from '../../src/conditions/controlTargets'
import { buildVideoNodes } from '../../src/conditions/graphBuilder'
import { clampIntensity, getSafetyContext } from '../../src/conditions/normalize'
import {
  buildAudioChain,
  connectAudioChain,
  isKnownAudioNodeType,
} from '../../src/engine/audio/audioGraphBuilder'
import type { AudioModule } from '../../src/engine/audio/types'
import {
  FakeAudioContext,
  type FakeCreatedNodes,
} from '../../src/contractVerification/fakeAudioContext'
import { withSeededRandom } from '../../src/contractVerification/utils'
import { appendUnhandledRejections, buildInspectReport } from './inspectReport'
import { loadProfileContracts } from './profileContracts'

export type InspectSeverity = 'warning' | 'error'

export interface InspectIssue {
  severity: InspectSeverity
  code: string
  message: string
  profileId?: string
  sourceFile?: string
  details?: Record<string, unknown>
}

export interface InspectScenarioResult {
  reducedMotion: boolean
  safeMode: boolean
  frames: number
  activeNodes: string[]
  nonFiniteReadings: number
}

export interface ProfileInspectResult {
  profileId: string
  sourceFile: string
  video: InspectScenarioResult[]
  audio: {
    enabled: boolean
    frames: number
    activeNodes: string[]
    nonFiniteReadings: number
  }
  warnings: number
  errors: number
}

export interface InspectHarnessReport {
  generatedAt: string
  environment: {
    node: string
    platform: string
    arch: string
  }
  summary: {
    profiles: number
    scenarios: number
    ok: number
    warnings: number
    errors: number
  }
  profiles: ProfileInspectResult[]
  warnings: InspectIssue[]
  errors: InspectIssue[]
}

export interface InspectHarnessOptions {
  frames?: number
}

type LoadedProfile = import('../../src/contractVerification/types').LoadedProfileContract

interface IssueSink {
  push(issue: InspectIssue): void
}

interface IssuesByProfile {
  warnings: number
  errors: number
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function toNodeName(value: unknown): string {
  if (!value || typeof value !== 'object') return 'unknown'
  const ctor = (value as { constructor?: { name?: string } }).constructor?.name
  if (!ctor) return 'unknown'
  const stripped = ctor.replace(/Node$/, '')
  return stripped
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase()
}

function loadProfiles(rootDir: string): {
  profiles: LoadedProfile[]
  issues: InspectIssue[]
} {
  return loadProfileContracts(rootDir)
}

function collectFiniteIssues(value: unknown, keyPath: string, output: string[]): void {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) output.push(keyPath)
    return
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      collectFiniteIssues(value[i], `${keyPath}[${i}]`, output)
    }
    return
  }
  if (value == null || typeof value !== 'object') return

  const v = value as Record<string, unknown>

  for (const k of ['x', 'y', 'z', 'w', 'r', 'g', 'b', 'a']) {
    const numeric = v[k]
    if (typeof numeric === 'number' && !Number.isFinite(numeric)) {
      output.push(`${keyPath}.${k}`)
    }
  }

  const elements = v.elements
  if (Array.isArray(elements) || ArrayBuffer.isView(elements)) {
    const list = Array.from(elements as ArrayLike<unknown>)
    for (let i = 0; i < list.length; i++) {
      const item = list[i]
      if (typeof item === 'number' && !Number.isFinite(item)) {
        output.push(`${keyPath}.elements[${i}]`)
      }
    }
  }
}

function collectAudioFiniteIssues(
  value: unknown,
  keyPath: string,
  output: string[],
  seen: Set<unknown>,
  depth = 0,
): void {
  if (depth > 6) return
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) output.push(keyPath)
    return
  }
  if (value == null || typeof value !== 'object') return
  if (seen.has(value)) return
  seen.add(value)

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      collectAudioFiniteIssues(value[i], `${keyPath}[${i}]`, output, seen, depth + 1)
    }
    return
  }

  const record = value as Record<string, unknown>
  for (const [k, v] of Object.entries(record)) {
    if (k === 'buffer') continue
    collectAudioFiniteIssues(v, `${keyPath}.${k}`, output, seen, depth + 1)
  }
}

function recordIssue(
  sink: IssueSink,
  index: Map<string, IssuesByProfile>,
  issue: InspectIssue,
): void {
  sink.push(issue)
  if (!issue.profileId) return
  const stats = index.get(issue.profileId) ?? { warnings: 0, errors: 0 }
  if (issue.severity === 'warning') stats.warnings++
  else stats.errors++
  index.set(issue.profileId, stats)
}

function dynamicAudioParams(
  base: Record<string, unknown>,
  frame: number,
  nodeIndex: number,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const wave = Math.sin((frame + 1) * (nodeIndex + 1) * 0.07)
  for (const [key, value] of Object.entries(base)) {
    if (typeof value === 'number') {
      const scaled = value * (1 + wave * 0.15)
      out[key] = Number.isFinite(scaled) ? scaled : value
      continue
    }
    out[key] = value
  }
  return out
}

function assertAudioDisposal(
  created: FakeCreatedNodes,
  profileId: string,
  sourceFile: string,
  sink: IssueSink,
  perProfile: Map<string, IssuesByProfile>,
): void {
  for (const osc of created.oscillators) {
    if (osc.started && !osc.stopped) {
      recordIssue(sink, perProfile, {
        severity: 'error',
        code: 'AUDIO_OSCILLATOR_NOT_STOPPED',
        message: 'Audio oscillator remained running after dispose',
        profileId,
        sourceFile,
      })
    }
  }

  for (const source of created.bufferSources) {
    if (source.started && !source.stopped) {
      recordIssue(sink, perProfile, {
        severity: 'error',
        code: 'AUDIO_BUFFER_SOURCE_NOT_STOPPED',
        message: 'Audio buffer source remained running after dispose',
        profileId,
        sourceFile,
      })
    }
  }

  for (const source of created.constantSources) {
    if (source.started && !source.stopped) {
      recordIssue(sink, perProfile, {
        severity: 'error',
        code: 'AUDIO_CONSTANT_SOURCE_NOT_STOPPED',
        message: 'Audio constant source remained running after dispose',
        profileId,
        sourceFile,
      })
    }
  }
}

function inspectVideoScenario(
  loaded: LoadedProfile,
  reducedMotion: boolean,
  safeMode: boolean,
  frames: number,
  sink: IssueSink,
  perProfile: Map<string, IssuesByProfile>,
): InspectScenarioResult {
  const { profile, profileId, sourceFile } = loaded
  const nodes = buildVideoNodes(profile, { reducedMotion })
  const activeNodes = nodes.map((node) => toNodeName(node))
  const input = new THREE.Texture()
  const previous = new THREE.Texture()
  const controlValues = getDefaultControlValues(profile, { reducedMotion })
  const safetyContext = getSafetyContext(profile)

  let nonFiniteReadings = 0

  try {
    for (let frame = 0; frame < frames; frame++) {
      const base =
        typeof profile.safety.intensity_default === 'number'
          ? profile.safety.intensity_default
          : 0.5
      const intensity = clampIntensity(profile, base + Math.sin((frame + 1) * 0.1) * 0.15, safeMode)

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        node.setParams({
          intensity,
          safeMode,
          safetyContext,
          controlValues,
          nodeIndex: i,
          uvScale: [1, 1],
          uvOffset: [0, 0],
        })

        const tickNode = node as { tick?: (delta: number) => void }
        if (typeof tickNode.tick === 'function') {
          tickNode.tick(1 / 60)
        }

        const material = node.needsPreviousFrame
          ? node.getMaterial(input, previous)
          : node.getMaterial(input)

        const uniforms = (
          material as THREE.ShaderMaterial & {
            uniforms?: Record<string, { value: unknown }>
          }
        ).uniforms

        if (!uniforms) continue

        const finiteIssues: string[] = []
        for (const [name, uniform] of Object.entries(uniforms)) {
          collectFiniteIssues(uniform?.value, name, finiteIssues)
        }

        if (finiteIssues.length > 0) {
          nonFiniteReadings += finiteIssues.length
          recordIssue(sink, perProfile, {
            severity: 'error',
            code: 'VIDEO_NON_FINITE_UNIFORM',
            message: `Non-finite uniform values detected (${finiteIssues.length})`,
            profileId,
            sourceFile,
            details: {
              reducedMotion,
              safeMode,
              node: activeNodes[i] ?? `node_${i}`,
              frame,
              paths: finiteIssues,
            },
          })
        }
      }
    }
  } catch (error) {
    recordIssue(sink, perProfile, {
      severity: 'error',
      code: 'VIDEO_SCENARIO_CRASH',
      message:
        error instanceof Error ? error.message : `Video scenario crashed for profile ${profileId}`,
      profileId,
      sourceFile,
      details: { reducedMotion, safeMode },
    })
  } finally {
    for (const node of nodes) {
      try {
        node.dispose()
      } catch (error) {
        recordIssue(sink, perProfile, {
          severity: 'error',
          code: 'VIDEO_DISPOSE_ERROR',
          message: `Video node dispose failed: ${String(error)}`,
          profileId,
          sourceFile,
          details: { node: toNodeName(node), reducedMotion, safeMode },
        })
      }

      const maybeMaterial = (node as Record<string, unknown>).material
      if (maybeMaterial != null) {
        recordIssue(sink, perProfile, {
          severity: 'error',
          code: 'VIDEO_DISPOSE_LEAK',
          message: 'Video node material still attached after dispose',
          profileId,
          sourceFile,
          details: { node: toNodeName(node), reducedMotion, safeMode },
        })
      }
    }

    input.dispose()
    previous.dispose()
  }

  return {
    reducedMotion,
    safeMode,
    frames,
    activeNodes,
    nonFiniteReadings,
  }
}

function inspectAudioPipeline(
  loaded: LoadedProfile,
  frames: number,
  sink: IssueSink,
  perProfile: Map<string, IssuesByProfile>,
): {
  enabled: boolean
  frames: number
  activeNodes: string[]
  nonFiniteReadings: number
} {
  const { profile, profileId, sourceFile } = loaded
  const audioStack = profile.audio_stack ?? { enabled: false }
  const chainDefs = (audioStack.chain ?? []).filter((def) =>
    isKnownAudioNodeType(String(def.node).toLowerCase()),
  )
  const activeNodes = chainDefs.map((def) => String(def.node).toLowerCase())

  const context = new FakeAudioContext()
  const source = context.createGain()
  const destination = context.createGain()
  const mark = context.mark()

  let nonFiniteReadings = 0
  let chain: AudioModule[] = []

  try {
    chain = buildAudioChain(context as unknown as BaseAudioContext, audioStack)
    connectAudioChain(source as unknown as AudioNode, chain, destination as unknown as AudioNode)

    const created = context.collectSince(mark)

    for (let frame = 0; frame < frames; frame++)
      nonFiniteReadings += inspectAudioFrame(
        chain,
        chainDefs,
        created,
        frame,
        profileId,
        sourceFile,
        sink,
        perProfile,
      )

    disposeAudioModules(chain)

    assertAudioDisposal(created, profileId, sourceFile, sink, perProfile)
  } catch (error) {
    recordIssue(sink, perProfile, {
      severity: 'error',
      code: 'AUDIO_PIPELINE_CRASH',
      message:
        error instanceof Error ? error.message : `Audio pipeline crashed for profile ${profileId}`,
      profileId,
      sourceFile,
    })
  } finally {
    disposeAudioModulesQuietly(chain)
  }

  return {
    enabled: audioStack.enabled === true,
    frames,
    activeNodes,
    nonFiniteReadings,
  }
}

function inspectAudioFrame(
  chain: AudioModule[],
  chainDefs: Array<{ params?: Record<string, unknown> }>,
  created: unknown[],
  frame: number,
  profileId: string,
  sourceFile: string,
  sink: IssueSink,
  perProfile: Map<string, IssuesByProfile>,
) {
  for (let i = 0; i < chain.length; i++)
    chain[i].setParams(dynamicAudioParams(chainDefs[i]?.params ?? {}, frame, i))
  const finiteIssues: string[] = []
  collectAudioFiniteIssues(created, 'audioCreated', finiteIssues, new Set<unknown>())
  if (finiteIssues.length > 0)
    recordIssue(sink, perProfile, {
      severity: 'error',
      code: 'AUDIO_NON_FINITE_STATE',
      message: `Non-finite audio state detected (${finiteIssues.length})`,
      profileId,
      sourceFile,
      details: { frame, paths: finiteIssues.slice(0, 24) },
    })
  return finiteIssues.length
}

function disposeAudioModules(chain: AudioModule[]) {
  for (const module of chain) module.dispose()
}

function disposeAudioModulesQuietly(chain: AudioModule[]) {
  for (const module of chain) {
    try {
      module.dispose()
    } catch {
      /* idempotency best-effort; first dispose already validated above */
    }
  }
}

function inspectProfile(
  profile: LoadedProfile,
  frames: number,
  sink: IssueSink,
  countsByProfile: Map<string, IssuesByProfile>,
  seed: number,
): ProfileInspectResult {
  const video: InspectScenarioResult[] = []
  withSeededRandom(seed, () =>
    video.push(inspectVideoScenario(profile, false, false, frames, sink, countsByProfile)),
  )
  withSeededRandom(seed + 1, () =>
    video.push(inspectVideoScenario(profile, true, true, frames, sink, countsByProfile)),
  )
  let audio: ProfileInspectResult['audio'] = {
    enabled: false,
    frames,
    activeNodes: [],
    nonFiniteReadings: 0,
  }
  withSeededRandom(seed + 2, () => {
    audio = inspectAudioPipeline(profile, frames, sink, countsByProfile)
  })
  const counts = countsByProfile.get(profile.profileId) ?? { warnings: 0, errors: 0 }
  return {
    profileId: profile.profileId,
    sourceFile: profile.sourceFile,
    video,
    audio,
    warnings: counts.warnings,
    errors: counts.errors,
  }
}

export async function runInspectHarness(
  rootDir: string,
  options: InspectHarnessOptions = {},
): Promise<InspectHarnessReport> {
  const frames =
    typeof options.frames === 'number' && Number.isFinite(options.frames)
      ? Math.max(1, Math.floor(options.frames))
      : 120

  const issues: InspectIssue[] = []
  const perProfileIssueCounts = new Map<string, IssuesByProfile>()
  const sink: IssueSink = {
    push(issue) {
      issues.push(issue)
    },
  }

  const unhandledRejections: unknown[] = []
  const rejectionHandler = (reason: unknown): void => {
    unhandledRejections.push(reason)
  }
  process.on('unhandledRejection', rejectionHandler)

  const loaded = loadProfiles(rootDir)
  issues.push(...loaded.issues)

  const profileResults: ProfileInspectResult[] = []
  let seed = 11

  for (const profile of loaded.profiles) {
    profileResults.push(inspectProfile(profile, frames, sink, perProfileIssueCounts, seed))
    seed += 3
  }

  appendUnhandledRejections(issues, unhandledRejections)

  process.off('unhandledRejection', rejectionHandler)

  return buildInspectReport(profileResults, issues)
}
