import * as THREE from 'three'

import { getDefaultControlValues } from '../../../src/app/experience/controls/controlTargets'
import { IMPLEMENTED_AUDIO_NODES, IMPLEMENTED_VIDEO_NODES } from '../../../src/runtime/capabilities'
import { buildVideoNodes } from '../../../src/runtime/visual/graph'
import { clampIntensity, getSafetyContext } from '../../../src/domain/experience/safety'
import { buildAudioChain, connectAudioChain } from '../../../src/runtime/audio'
import type { AudioModule } from '../../../src/runtime/audio'
import { FakeAudioContext, type FakeCreatedNodes } from '../../contracts/probes/fakeAudioContext'
import type { LoadedProfileContract } from '../../contracts/probes/types'
import { withSeededRandom } from '../../contracts/probes/utils'
import { appendUnhandledRejections, buildInspectReport } from './report'
import { loadProfileContracts } from '../../contracts/profiles'
import type {
  InspectHarnessOptions,
  InspectHarnessReport,
  InspectIssue,
  InspectScenarioResult,
  ProfileInspectResult,
} from './types'

type LoadedProfile = LoadedProfileContract

interface IssueSink {
  push(issue: InspectIssue): void
}

interface IssuesByProfile {
  warnings: number
  errors: number
}

interface ProfileIssueContext {
  profileId: string
  sourceFile: string
  sink: IssueSink
  perProfile: Map<string, IssuesByProfile>
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

  const record = value as Record<string, unknown>
  collectFiniteComponentIssues(record, keyPath, output)
  collectFiniteElementIssues(record.elements, keyPath, output)
}

function collectFiniteComponentIssues(
  value: Record<string, unknown>,
  keyPath: string,
  output: string[],
): void {
  for (const k of ['x', 'y', 'z', 'w', 'r', 'g', 'b', 'a']) {
    const numeric = value[k]
    if (typeof numeric === 'number' && !Number.isFinite(numeric)) {
      output.push(`${keyPath}.${k}`)
    }
  }
}

function collectFiniteElementIssues(elements: unknown, keyPath: string, output: string[]): void {
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

type AudioFiniteInspection = {
  output: string[]
  seen: Set<unknown>
  depth: number
}

function collectAudioFiniteNumber(value: unknown, keyPath: string, output: string[]) {
  if (typeof value !== 'number') return false
  if (!Number.isFinite(value)) output.push(keyPath)
  return true
}

function nestedAudioFiniteInspection(inspection: AudioFiniteInspection): AudioFiniteInspection {
  return { ...inspection, depth: inspection.depth + 1 }
}

function collectAudioArrayFiniteIssues(
  values: unknown[],
  keyPath: string,
  inspection: AudioFiniteInspection,
): void {
  const nested = nestedAudioFiniteInspection(inspection)
  for (let index = 0; index < values.length; index++) {
    collectAudioFiniteIssues(values[index], `${keyPath}[${index}]`, nested)
  }
}

function collectAudioRecordFiniteIssues(
  record: Record<string, unknown>,
  keyPath: string,
  inspection: AudioFiniteInspection,
): void {
  const nested = nestedAudioFiniteInspection(inspection)
  for (const [key, value] of Object.entries(record)) {
    if (key === 'buffer') continue
    collectAudioFiniteIssues(value, `${keyPath}.${key}`, nested)
  }
}

function collectAudioFiniteIssues(
  value: unknown,
  keyPath: string,
  inspection: AudioFiniteInspection,
): void {
  if (inspection.depth > 6 || collectAudioFiniteNumber(value, keyPath, inspection.output)) return
  if (value == null || typeof value !== 'object' || inspection.seen.has(value)) return
  inspection.seen.add(value)

  if (Array.isArray(value)) {
    collectAudioArrayFiniteIssues(value, keyPath, inspection)
    return
  }
  collectAudioRecordFiniteIssues(value as Record<string, unknown>, keyPath, inspection)
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

function assertAudioDisposal(created: FakeCreatedNodes, issues: ProfileIssueContext): void {
  assertScheduledSourcesStopped(
    created.oscillators,
    'AUDIO_OSCILLATOR_NOT_STOPPED',
    'Audio oscillator remained running after dispose',
    issues,
  )
  assertScheduledSourcesStopped(
    created.bufferSources,
    'AUDIO_BUFFER_SOURCE_NOT_STOPPED',
    'Audio buffer source remained running after dispose',
    issues,
  )
  assertScheduledSourcesStopped(
    created.constantSources,
    'AUDIO_CONSTANT_SOURCE_NOT_STOPPED',
    'Audio constant source remained running after dispose',
    issues,
  )
}

function assertScheduledSourcesStopped(
  sources: Array<{ started: boolean; stopped: boolean }>,
  code: string,
  message: string,
  issues: ProfileIssueContext,
): void {
  for (const source of sources) {
    if (source.started && !source.stopped) {
      recordIssue(issues.sink, issues.perProfile, {
        severity: 'error',
        code,
        message,
        profileId: issues.profileId,
        sourceFile: issues.sourceFile,
      })
    }
  }
}

type VideoScenarioResources = {
  nodes: ReturnType<typeof buildVideoNodes>
  activeNodes: string[]
  input: THREE.Texture
  previous: THREE.Texture
  controlValues: ReturnType<typeof getDefaultControlValues>
  safetyContext: ReturnType<typeof getSafetyContext>
}

type VideoScenarioContext = {
  loaded: LoadedProfile
  reducedMotion: boolean
  safeMode: boolean
  frames: number
  resources: VideoScenarioResources
  issues: ProfileIssueContext
  stats: VideoScenarioStats
}

type VideoScenarioStats = {
  nonFiniteReadings: number
}

function createVideoScenarioResources(
  loaded: LoadedProfile,
  reducedMotion: boolean,
): VideoScenarioResources {
  const nodes = buildVideoNodes(loaded.profile, {
    reducedMotion,
    supportedNodeIds: IMPLEMENTED_VIDEO_NODES,
  })
  return {
    nodes,
    activeNodes: nodes.map((node) => toNodeName(node)),
    input: new THREE.Texture(),
    previous: new THREE.Texture(),
    controlValues: getDefaultControlValues(loaded.profile, { reducedMotion }),
    safetyContext: getSafetyContext(loaded.profile),
  }
}

function scenarioIntensity(profile: LoadedProfile['profile'], frame: number, safeMode: boolean) {
  const base =
    typeof profile.safety.intensity_default === 'number' ? profile.safety.intensity_default : 0.5
  return clampIntensity(profile, base + Math.sin((frame + 1) * 0.1) * 0.15, safeMode)
}

function inspectVideoNode(
  node: ReturnType<typeof buildVideoNodes>[number],
  nodeIndex: number,
  intensity: number,
  safeMode: boolean,
  resources: VideoScenarioResources,
): string[] {
  node.setParams({
    intensity,
    safeMode,
    safetyContext: resources.safetyContext,
    controlValues: resources.controlValues,
    nodeIndex,
    uvScale: [1, 1],
    uvOffset: [0, 0],
  })
  const tickNode = node as { tick?: (delta: number) => void }
  if (typeof tickNode.tick === 'function') tickNode.tick(1 / 60)

  const material = node.needsPreviousFrame
    ? node.getMaterial(resources.input, resources.previous)
    : node.getMaterial(resources.input)
  const uniforms = (
    material as THREE.ShaderMaterial & { uniforms?: Record<string, { value: unknown }> }
  ).uniforms
  if (!uniforms) return []

  const finiteIssues: string[] = []
  for (const [name, uniform] of Object.entries(uniforms)) {
    collectFiniteIssues(uniform?.value, name, finiteIssues)
  }
  return finiteIssues
}

function inspectVideoFrames(context: VideoScenarioContext) {
  for (let frame = 0; frame < context.frames; frame++) {
    const intensity = scenarioIntensity(context.loaded.profile, frame, context.safeMode)
    for (let nodeIndex = 0; nodeIndex < context.resources.nodes.length; nodeIndex++) {
      const finiteIssues = inspectVideoNode(
        context.resources.nodes[nodeIndex],
        nodeIndex,
        intensity,
        context.safeMode,
        context.resources,
      )
      if (finiteIssues.length === 0) continue
      context.stats.nonFiniteReadings += finiteIssues.length
      recordIssue(context.issues.sink, context.issues.perProfile, {
        severity: 'error',
        code: 'VIDEO_NON_FINITE_UNIFORM',
        message: `Non-finite uniform values detected (${finiteIssues.length})`,
        profileId: context.issues.profileId,
        sourceFile: context.issues.sourceFile,
        details: {
          reducedMotion: context.reducedMotion,
          safeMode: context.safeMode,
          node: context.resources.activeNodes[nodeIndex] ?? `node_${nodeIndex}`,
          frame,
          paths: finiteIssues,
        },
      })
    }
  }
}

function disposeVideoScenarioResources(context: VideoScenarioContext): void {
  for (const node of context.resources.nodes) {
    try {
      node.dispose()
    } catch (error) {
      recordIssue(context.issues.sink, context.issues.perProfile, {
        severity: 'error',
        code: 'VIDEO_DISPOSE_ERROR',
        message: `Video node dispose failed: ${String(error)}`,
        profileId: context.issues.profileId,
        sourceFile: context.issues.sourceFile,
        details: {
          node: toNodeName(node),
          reducedMotion: context.reducedMotion,
          safeMode: context.safeMode,
        },
      })
    }

    const maybeMaterial = (node as unknown as Record<string, unknown>).material
    if (maybeMaterial != null) {
      recordIssue(context.issues.sink, context.issues.perProfile, {
        severity: 'error',
        code: 'VIDEO_DISPOSE_LEAK',
        message: 'Video node material still attached after dispose',
        profileId: context.issues.profileId,
        sourceFile: context.issues.sourceFile,
        details: {
          node: toNodeName(node),
          reducedMotion: context.reducedMotion,
          safeMode: context.safeMode,
        },
      })
    }
  }
  context.resources.input.dispose()
  context.resources.previous.dispose()
}

function inspectVideoScenario(
  loaded: LoadedProfile,
  reducedMotion: boolean,
  safeMode: boolean,
  frames: number,
  sink: IssueSink,
  perProfile: Map<string, IssuesByProfile>,
): InspectScenarioResult {
  const resources = createVideoScenarioResources(loaded, reducedMotion)
  const issues: ProfileIssueContext = {
    profileId: loaded.profileId,
    sourceFile: loaded.sourceFile,
    sink,
    perProfile,
  }
  const context: VideoScenarioContext = {
    loaded,
    reducedMotion,
    safeMode,
    frames,
    resources,
    issues,
    stats: { nonFiniteReadings: 0 },
  }

  try {
    inspectVideoFrames(context)
  } catch (error) {
    recordIssue(issues.sink, issues.perProfile, {
      severity: 'error',
      code: 'VIDEO_SCENARIO_CRASH',
      message:
        error instanceof Error
          ? error.message
          : `Video scenario crashed for profile ${loaded.profileId}`,
      profileId: issues.profileId,
      sourceFile: issues.sourceFile,
      details: { reducedMotion, safeMode },
    })
  } finally {
    disposeVideoScenarioResources(context)
  }

  return {
    reducedMotion,
    safeMode,
    frames,
    activeNodes: resources.activeNodes,
    nonFiniteReadings: context.stats.nonFiniteReadings,
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
  const issues: ProfileIssueContext = { profileId, sourceFile, sink, perProfile }
  const audioStack = profile.audio_stack ?? { enabled: false }
  const chainDefs = (audioStack.chain ?? []).filter((def) =>
    IMPLEMENTED_AUDIO_NODES.has(String(def.node).toLowerCase()),
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
    const frameContext: AudioFrameContext = { chain, chainDefs, created, issues }

    for (let frame = 0; frame < frames; frame++)
      nonFiniteReadings += inspectAudioFrame(frameContext, frame)

    disposeAudioModules(chain)

    assertAudioDisposal(created, issues)
  } catch (error) {
    recordIssue(issues.sink, issues.perProfile, {
      severity: 'error',
      code: 'AUDIO_PIPELINE_CRASH',
      message:
        error instanceof Error ? error.message : `Audio pipeline crashed for profile ${profileId}`,
      profileId: issues.profileId,
      sourceFile: issues.sourceFile,
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

type AudioFrameContext = {
  chain: AudioModule[]
  chainDefs: Array<{ params?: Record<string, unknown> }>
  created: FakeCreatedNodes
  issues: ProfileIssueContext
}

function inspectAudioFrame(context: AudioFrameContext, frame: number) {
  for (let i = 0; i < context.chain.length; i++)
    context.chain[i].setParams(dynamicAudioParams(context.chainDefs[i]?.params ?? {}, frame, i))
  const finiteIssues: string[] = []
  collectAudioFiniteIssues(context.created, 'audioCreated', {
    output: finiteIssues,
    seen: new Set<unknown>(),
    depth: 0,
  })
  if (finiteIssues.length > 0)
    recordIssue(context.issues.sink, context.issues.perProfile, {
      severity: 'error',
      code: 'AUDIO_NON_FINITE_STATE',
      message: `Non-finite audio state detected (${finiteIssues.length})`,
      profileId: context.issues.profileId,
      sourceFile: context.issues.sourceFile,
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
