import * as THREE from 'three'

import { getDefaultControlValues } from '../../../src/domain/experience/controls'
import { clampIntensity, getSafetyContext } from '../../../src/domain/experience/safety'
import { IMPLEMENTED_VIDEO_NODES } from '../../../src/runtime/capabilities'
import { buildVideoNodes } from '../../../src/runtime/visual/graph'
import type { InspectScenarioResult } from './types'
import {
  collectFiniteIssues,
  type IssueSink,
  type IssuesByProfile,
  type LoadedProfile,
  type ProfileIssueContext,
  recordIssue,
  toNodeName,
} from './shared-validation'

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
    controlValues: getDefaultControlValues(loaded.profile, {
      reducedMotion,
      supportedNodeIds: IMPLEMENTED_VIDEO_NODES,
    }),
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

function inspectVideoFrames(context: VideoScenarioContext): void {
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

export function inspectVideoScenario(
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
