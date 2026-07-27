import { getProfileEntryForBuiltIndex } from '../../src/conditions/graphBuilder'
import { resolveAnalyserTarget } from '../../src/engine/reactive/analyserToParamsResolver'
import {
  buildAudioNodeLookup,
  getAudioRegistrySummaries,
} from '../../src/contractVerification/audioNodeRegistry'
import {
  buildVideoNodeLookup,
  getVideoRegistrySummaries,
} from '../../src/contractVerification/videoNodeRegistry'
import type {
  ContractIssue,
  ContractNodeDefinition,
  ContractReference,
  ContractVerificationReport,
  LoadedProfileContract,
  LoadedContracts,
  PolicyCheckResult,
  RangeCheckResult,
} from '../../src/contractVerification/types'
import {
  asNumber,
  differs,
  evaluateReferencedParams,
  outOfRangeHigh,
  outOfRangeLow,
} from './contractParamChecks'
import { evaluatePolicyChecks } from './contractPolicyChecks'
import { loadContractJsonReferences } from './jsonContracts'

export { asNumber, differs, outOfRangeHigh, outOfRangeLow }

function appendIssue(issues: ContractIssue[], category: ContractIssue[], issue: ContractIssue) {
  issues.push(issue)
  category.push(issue)
}

function verifyNodeReferences(
  references: ContractReference[],
  videoLookup: Map<string, ContractNodeDefinition>,
  audioLookup: Map<string, ContractNodeDefinition>,
  issues: ContractIssue[],
  missingNodes: ContractIssue[],
  missingParams: ContractIssue[],
) {
  for (const ref of references) {
    if (ref.referenceType === 'profile_reactive_target') continue
    const nodeDef = (ref.kind === 'video' ? videoLookup : audioLookup).get(ref.node)
    if (!nodeDef) {
      appendIssue(issues, missingNodes, {
        severity: 'error',
        code: 'MISSING_NODE',
        message: `Referenced ${ref.kind} node "${ref.node}" is not implemented`,
        kind: ref.kind,
        node: ref.node,
        sourceFile: ref.sourceFile,
        profileId: ref.profileId,
        location: ref.location,
      })
    } else if (ref.param && !nodeDef.params[ref.param]) {
      appendIssue(issues, missingParams, {
        severity: 'error',
        code: 'MISSING_PARAM',
        message: `Referenced ${ref.kind} param "${ref.param}" is not defined for node "${nodeDef.node}"`,
        kind: ref.kind,
        node: nodeDef.node,
        param: ref.param,
        sourceFile: ref.sourceFile,
        profileId: ref.profileId,
        location: ref.location,
      })
    }
  }
}

function reactiveLocation(index: number) {
  return `reactive.analyser_to_params[${index}].target`
}

function verifyReactiveVideo(
  profileContract: LoadedProfileContract,
  index: number,
  paramKey: string,
  videoLookup: Map<string, ContractNodeDefinition>,
  issues: ContractIssue[],
  missingNodes: ContractIssue[],
  missingParams: ContractIssue[],
) {
  const dot = paramKey.indexOf('.')
  const entry = getProfileEntryForBuiltIndex(
    profileContract.profile,
    Number(paramKey.slice(0, dot)),
    { reducedMotion: false },
  )
  const nodeName = String(entry?.node ?? '').toLowerCase()
  const definition = videoLookup.get(nodeName)
  if (!definition) {
    appendIssue(issues, missingNodes, {
      severity: 'error',
      code: 'REACTIVE_VIDEO_NODE_MISSING',
      message: `Reactive target resolved to unknown video node "${nodeName}"`,
      profileId: profileContract.profileId,
      sourceFile: profileContract.sourceFile,
      location: reactiveLocation(index),
      kind: 'video',
      node: nodeName,
    })
  } else if (!definition.params[paramKey.slice(dot + 1)]) {
    const param = paramKey.slice(dot + 1)
    appendIssue(issues, missingParams, {
      severity: 'error',
      code: 'REACTIVE_VIDEO_PARAM_MISSING',
      message: `Reactive target param "${param}" is not implemented on video node "${definition.node}"`,
      profileId: profileContract.profileId,
      sourceFile: profileContract.sourceFile,
      location: reactiveLocation(index),
      kind: 'video',
      node: definition.node,
      param,
    })
  }
}

function verifyReactiveAudio(
  profileContract: LoadedProfileContract,
  paramKey: string,
  audioLookup: Map<string, ContractNodeDefinition>,
  issues: ContractIssue[],
  missingNodes: ContractIssue[],
  missingParams: ContractIssue[],
) {
  const parts = paramKey.split('.')
  const param = parts.slice(2).join('.')
  const nodeName = String(
    profileContract.profile.audio_stack?.chain?.[Number(parts[1])]?.node ?? '',
  ).toLowerCase()
  const definition = audioLookup.get(nodeName)
  if (!definition) {
    appendIssue(issues, missingNodes, {
      severity: 'error',
      code: 'REACTIVE_AUDIO_NODE_MISSING',
      message: `Reactive target resolved to unknown audio node "${nodeName}"`,
      profileId: profileContract.profileId,
      sourceFile: profileContract.sourceFile,
      location: 'reactive.analyser_to_params.target',
      kind: 'audio',
      node: nodeName,
    })
  } else if (!definition.params[param]) {
    appendIssue(issues, missingParams, {
      severity: 'error',
      code: 'REACTIVE_AUDIO_PARAM_MISSING',
      message: `Reactive target param "${param}" is not implemented on audio node "${definition.node}"`,
      profileId: profileContract.profileId,
      sourceFile: profileContract.sourceFile,
      location: 'reactive.analyser_to_params.target',
      kind: 'audio',
      node: definition.node,
      param,
    })
  }
}

function verifyReactiveTargets(
  profiles: LoadedProfileContract[],
  videoLookup: Map<string, ContractNodeDefinition>,
  audioLookup: Map<string, ContractNodeDefinition>,
  issues: ContractIssue[],
  missingNodes: ContractIssue[],
  missingParams: ContractIssue[],
) {
  for (const profileContract of profiles) {
    const mappings = profileContract.profile.reactive?.analyser_to_params ?? []
    for (const [index, mapping] of mappings.entries()) {
      const resolved = resolveAnalyserTarget(mapping.target, profileContract.profile, {
        reducedMotion: false,
      })
      if (!resolved) {
        appendIssue(issues, missingNodes, {
          severity: 'error',
          code: 'REACTIVE_TARGET_UNRESOLVED',
          message: `Reactive target "${mapping.target}" cannot be resolved`,
          profileId: profileContract.profileId,
          sourceFile: profileContract.sourceFile,
          location: reactiveLocation(index),
        })
      } else if (resolved.kind === 'video') {
        verifyReactiveVideo(
          profileContract,
          index,
          resolved.paramKey,
          videoLookup,
          issues,
          missingNodes,
          missingParams,
        )
      } else {
        verifyReactiveAudio(
          profileContract,
          resolved.paramKey,
          audioLookup,
          issues,
          missingNodes,
          missingParams,
        )
      }
    }
  }
}

function buildReport(
  loaded: LoadedContracts,
  issues: ContractIssue[],
  missingNodes: ContractIssue[],
  missingParams: ContractIssue[],
  unusedParams: ContractIssue[],
  rangeChecks: RangeCheckResult[],
  policyChecks: PolicyCheckResult[],
  referencedParamCount: number,
): ContractVerificationReport {
  const warnings = issues.filter((issue) => issue.severity === 'warning')
  const errors = issues.filter((issue) => issue.severity === 'error')
  const ok =
    referencedParamCount -
    unusedParams.filter((issue) => issue.severity === 'error').length +
    rangeChecks.filter((check) => check.status === 'ok').length +
    policyChecks.filter((check) => check.status === 'ok').length
  return {
    generatedAt: new Date().toISOString(),
    summary: {
      profiles: loaded.profiles.length,
      references: loaded.references.length,
      ok: Math.max(0, ok),
      warnings: warnings.length,
      errors: errors.length,
    },
    missingNodes,
    missingParams,
    unusedParams,
    rangeChecks,
    policyChecks,
    warnings,
    errors,
    registry: { video: getVideoRegistrySummaries(), audio: getAudioRegistrySummaries() },
  }
}

export function verifyContracts(rootDir: string) {
  const loaded = loadContractJsonReferences(rootDir)
  const videoLookup = buildVideoNodeLookup()
  const audioLookup = buildAudioNodeLookup()
  const issues: ContractIssue[] = [...loaded.parseErrors]
  const missingNodes: ContractIssue[] = []
  const missingParams: ContractIssue[] = []
  verifyNodeReferences(
    loaded.references,
    videoLookup,
    audioLookup,
    issues,
    missingNodes,
    missingParams,
  )
  verifyReactiveTargets(
    loaded.profiles,
    videoLookup,
    audioLookup,
    issues,
    missingNodes,
    missingParams,
  )
  const { unusedParams, rangeChecks, referencedParamCount } = evaluateReferencedParams(
    loaded.references,
    videoLookup,
    audioLookup,
    issues,
  )
  const policyChecks = evaluatePolicyChecks(loaded.profiles, videoLookup, audioLookup, issues)
  return buildReport(
    loaded,
    issues,
    missingNodes,
    missingParams,
    unusedParams,
    rangeChecks,
    policyChecks,
    referencedParamCount,
  )
}
