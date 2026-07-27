import { TEMPORAL_NODE_TYPES, buildVideoNodes } from '../../src/conditions/graphBuilder'
import { clampIntensity } from '../../src/conditions/normalize'
import type {
  ContractIssue,
  ContractNodeDefinition,
  LoadedProfileContract,
  PolicyCheckResult,
} from '../../src/contractVerification/types'
import { asNumber, outOfRangeHigh } from './contractParamChecks'

function hasControl(profile: LoadedProfileContract['profile'], names: readonly string[]) {
  return (profile.ui?.controls ?? []).some((control) => {
    const id = String(control.id ?? '').toLowerCase()
    const target = String(control.target ?? '').toLowerCase()
    return names.includes(id) || names.includes(target)
  })
}

function appendControlChecks(
  profileContract: LoadedProfileContract,
  issues: ContractIssue[],
  checks: PolicyCheckResult[],
) {
  const { profile, profileId, sourceFile } = profileContract
  if (!hasControl(profile, ['safe_mode', 'safemode'])) {
    issues.push({
      severity: 'error',
      code: 'SAFE_MODE_CONTROL_MISSING',
      message: `Profile "${profileId}" does not expose a Safe Mode control`,
      profileId,
      sourceFile,
    })
    checks.push({
      profileId,
      policy: 'safe_mode',
      status: 'error',
      message: 'Safe Mode control missing in UI controls',
    })
  }
  if (!hasControl(profile, ['reduced_motion', 'reducedmotion'])) {
    issues.push({
      severity: 'warning',
      code: 'REDUCED_MOTION_CONTROL_MISSING',
      message: `Profile "${profileId}" does not expose a Reduced Motion control`,
      profileId,
      sourceFile,
    })
    checks.push({
      profileId,
      policy: 'reduced_motion',
      status: 'warning',
      message: 'Reduced Motion control missing in UI controls',
    })
  }
}

function appendIntensityCheck(
  profileContract: LoadedProfileContract,
  issues: ContractIssue[],
  checks: PolicyCheckResult[],
) {
  const { profile, profileId, sourceFile } = profileContract
  const safeIntensity = clampIntensity(profile, 1, true)
  const normalIntensity = clampIntensity(profile, 1, false)
  const maxIntensityClamp = asNumber(profile.safety.safe_mode_clamps.max_intensity)
  const ok =
    safeIntensity <= normalIntensity + 1e-6 &&
    (maxIntensityClamp == null || safeIntensity <= maxIntensityClamp + 1e-6)
  checks.push({
    profileId,
    policy: 'safe_mode',
    status: ok ? 'ok' : 'error',
    message: ok
      ? 'Safe Mode intensity ceiling is enforced'
      : 'Safe Mode intensity ceiling is not stricter than normal intensity clamp',
    param: 'max_intensity',
  })
  if (!ok)
    issues.push({
      severity: 'error',
      code: 'SAFE_MODE_INTENSITY_MISMATCH',
      message: `Safe mode intensity clamp mismatch in profile "${profileId}"`,
      profileId,
      sourceFile,
    })
}

function disabledNodes(profile: LoadedProfileContract['profile']) {
  return new Set(
    (profile.safety.reduced_motion_policy?.disable_nodes ?? []).map((node) =>
      String(node).toLowerCase(),
    ),
  )
}

function appendReducedMotionCheck(
  profileContract: LoadedProfileContract,
  videoLookup: Map<string, ContractNodeDefinition>,
  disabled: Set<string>,
  issues: ContractIssue[],
  checks: PolicyCheckResult[],
) {
  const { profile, profileId, sourceFile } = profileContract
  const expected = profile.video_stack.filter((definition) => {
    const node = String(definition.node).toLowerCase()
    return videoLookup.has(node) && !disabled.has(node) && !TEMPORAL_NODE_TYPES.has(node)
  }).length
  const actual = buildVideoNodes(profile, { reducedMotion: true }).length
  const ok = expected === actual
  checks.push({
    profileId,
    policy: 'reduced_motion',
    status: ok ? 'ok' : 'error',
    message: ok
      ? 'Reduced Motion disables expected nodes'
      : `Reduced Motion mismatch: expected ${expected} built nodes, got ${actual}`,
  })
  if (!ok)
    issues.push({
      severity: 'error',
      code: 'REDUCED_MOTION_DISABLE_MISMATCH',
      message: `Reduced Motion did not disable nodes as expected in profile "${profileId}"`,
      profileId,
      sourceFile,
    })
}

function appendTemporalWarnings(
  profileContract: LoadedProfileContract,
  disabled: Set<string>,
  issues: ContractIssue[],
  checks: PolicyCheckResult[],
) {
  const temporal = new Set(['temporal_smear', 'feedback_loop', 'pulse', 'focus_jitter'])
  for (const definition of profileContract.profile.video_stack) {
    const node = String(definition.node).toLowerCase()
    if (!temporal.has(node) || disabled.has(node)) continue
    issues.push({
      severity: 'warning',
      code: 'REDUCED_MOTION_TEMPORAL_NODE_NOT_DISABLED',
      message: `Profile "${profileContract.profileId}" keeps temporal node "${node}" active in reduced motion policy`,
      profileId: profileContract.profileId,
      sourceFile: profileContract.sourceFile,
      kind: 'video',
      node,
    })
    checks.push({
      profileId: profileContract.profileId,
      policy: 'reduced_motion',
      status: 'warning',
      node,
      message: 'Temporal node should be listed in reduced motion disable policy',
    })
  }
}

function appendVideoClampCheck(
  profileContract: LoadedProfileContract,
  nodeDef: ContractNodeDefinition,
  param: string,
  issues: ContractIssue[],
  checks: PolicyCheckResult[],
) {
  const meta = nodeDef.params[param]
  if (!meta?.safeModeClampKey) return
  const clampKey = meta.safeModeClampKey
  const clampValue = asNumber(profileContract.profile.safety.safe_mode_clamps[clampKey])
  if (clampValue == null) return
  const harness = nodeDef.createHarness()
  let observed: number | null = null
  try {
    harness.applyParam(param, outOfRangeHigh(clampValue), {
      intensity: 1,
      safeMode: true,
      safetyContext: {
        global: { [clampKey]: outOfRangeHigh(clampValue) },
        safeMode: { [clampKey]: clampValue },
      },
    })
    observed = asNumber(meta.readEffective(harness))
  } finally {
    harness.dispose()
  }
  if (observed == null) return
  const ok = observed <= clampValue + (meta.epsilon ?? 1e-6)
  checks.push({
    profileId: profileContract.profileId,
    policy: 'safe_mode',
    status: ok ? 'ok' : 'error',
    node: nodeDef.node,
    param,
    message: ok
      ? `Safe Mode clamp "${clampKey}" is enforced`
      : `Safe Mode clamp "${clampKey}" not enforced (observed ${observed}, clamp ${clampValue})`,
  })
  if (!ok)
    issues.push({
      severity: 'error',
      code: 'SAFE_MODE_PARAM_CLAMP_MISMATCH',
      message: `Safe mode clamp mismatch for ${nodeDef.node}.${param} in "${profileContract.profileId}"`,
      profileId: profileContract.profileId,
      sourceFile: profileContract.sourceFile,
      kind: 'video',
      node: nodeDef.node,
      param,
      details: { clampKey, clampValue, observed },
    })
}

function appendVideoClampChecks(
  profileContract: LoadedProfileContract,
  videoLookup: Map<string, ContractNodeDefinition>,
  issues: ContractIssue[],
  checks: PolicyCheckResult[],
) {
  for (const definition of profileContract.profile.video_stack) {
    const nodeDef = videoLookup.get(String(definition.node).toLowerCase())
    if (!nodeDef) continue
    for (const param of Object.keys(definition.params ?? {}))
      appendVideoClampCheck(profileContract, nodeDef, param, issues, checks)
  }
}

function appendAudioClampCheck(
  profileContract: LoadedProfileContract,
  nodeDef: ContractNodeDefinition,
  param: string,
  value: unknown,
  issues: ContractIssue[],
  checks: PolicyCheckResult[],
) {
  const meta = nodeDef.params[param]
  if (!meta?.safeModeClampKey) return
  const values = audioClampValues(profileContract, meta.safeModeClampKey, value)
  if (!values) return
  const { clampValue, numericValue } = values
  const ok = numericValue <= clampValue + (meta.epsilon ?? 1e-6)
  checks.push({
    profileId: profileContract.profileId,
    policy: 'safe_mode',
    status: ok ? 'ok' : 'error',
    node: nodeDef.node,
    param,
    message: ok
      ? `Audio param respects safe clamp "${meta.safeModeClampKey}"`
      : `Audio param exceeds safe clamp "${meta.safeModeClampKey}" (${numericValue} > ${clampValue})`,
  })
  if (!ok)
    issues.push({
      severity: 'error',
      code: 'SAFE_MODE_AUDIO_CLAMP_MISMATCH',
      message: `Audio safe clamp mismatch for ${nodeDef.node}.${param} in "${profileContract.profileId}"`,
      profileId: profileContract.profileId,
      sourceFile: profileContract.sourceFile,
      kind: 'audio',
      node: nodeDef.node,
      param,
      details: { clampKey: meta.safeModeClampKey, clampValue, value: numericValue },
    })
}

function audioClampValues(
  profileContract: LoadedProfileContract,
  clampKey: string,
  value: unknown,
) {
  const clampValue = asNumber(profileContract.profile.safety.safe_mode_clamps[clampKey])
  const numericValue = asNumber(value)
  return clampValue == null || numericValue == null ? null : { clampValue, numericValue }
}

function appendAudioClampChecks(
  profileContract: LoadedProfileContract,
  audioLookup: Map<string, ContractNodeDefinition>,
  issues: ContractIssue[],
  checks: PolicyCheckResult[],
) {
  for (const definition of profileContract.profile.audio_stack?.chain ?? []) {
    const nodeDef = audioLookup.get(String(definition.node).toLowerCase())
    if (!nodeDef) continue
    for (const [param, value] of Object.entries(definition.params ?? {}))
      appendAudioClampCheck(profileContract, nodeDef, param, value, issues, checks)
  }
}

export function evaluatePolicyChecks(
  profiles: LoadedProfileContract[],
  videoLookup: Map<string, ContractNodeDefinition>,
  audioLookup: Map<string, ContractNodeDefinition>,
  issues: ContractIssue[],
) {
  const checks: PolicyCheckResult[] = []
  for (const profileContract of profiles) {
    const disabled = disabledNodes(profileContract.profile)
    appendControlChecks(profileContract, issues, checks)
    appendIntensityCheck(profileContract, issues, checks)
    appendReducedMotionCheck(profileContract, videoLookup, disabled, issues, checks)
    appendTemporalWarnings(profileContract, disabled, issues, checks)
    appendVideoClampChecks(profileContract, videoLookup, issues, checks)
    appendAudioClampChecks(profileContract, audioLookup, issues, checks)
  }
  return checks
}
