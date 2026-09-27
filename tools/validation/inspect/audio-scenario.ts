import { IMPLEMENTED_AUDIO_NODES } from '../../../src/runtime/capabilities'
import { buildAudioChain, connectAudioChain } from '../../../src/runtime/audio'
import type { AudioModule } from '../../../src/runtime/audio'
import { FakeAudioContext, type FakeCreatedNodes } from '../../shared/fakeWebAudio'
import type { ProfileInspectResult } from './types'
import {
  type IssueSink,
  type IssuesByProfile,
  type LoadedProfile,
  type ProfileIssueContext,
  recordIssue,
} from './shared-validation'

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

function disposeAudioModules(chain: AudioModule[]): void {
  for (const module of chain) module.dispose()
}

function disposeAudioModulesQuietly(chain: AudioModule[]): void {
  for (const module of chain) {
    try {
      module.dispose()
    } catch {
      /* idempotency best-effort; first dispose already validated above */
    }
  }
}

export function inspectAudioPipeline(
  loaded: LoadedProfile,
  frames: number,
  sink: IssueSink,
  perProfile: Map<string, IssuesByProfile>,
): ProfileInspectResult['audio'] {
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
