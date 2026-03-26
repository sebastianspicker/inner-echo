import {
  TEMPORAL_NODE_TYPES,
  buildVideoNodes,
  getProfileEntryForBuiltIndex,
} from '../../src/conditions/graphBuilder'
import { clampIntensity } from '../../src/conditions/normalize'
import type { Profile } from '../../src/conditions/schema'
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
  CheckStatus,
  ContractIssue,
  ContractNodeDefinition,
  ContractParamMetadata,
  ContractReference,
  ContractVerificationReport,
  PolicyCheckResult,
  RangeCheckResult,
} from '../../src/contractVerification/types'
import { loadContractJsonReferences } from './jsonContracts'

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function differs(a: unknown, b: unknown, epsilon = 1e-6): boolean {
  const na = asNumber(a)
  const nb = asNumber(b)
  if (na != null && nb != null) return Math.abs(na - nb) > epsilon
  return JSON.stringify(a) !== JSON.stringify(b)
}

function defaultProbeLow(meta: ContractParamMetadata): unknown {
  if (meta.probeLow !== undefined) return meta.probeLow
  if (meta.type === 'boolean') return false
  if (meta.type === 'enum') return meta.enumValues?.[0]
  if (typeof meta.min === 'number') return meta.min
  if (typeof meta.defaultValue === 'number') return meta.defaultValue
  return 0
}

function defaultProbeHigh(meta: ContractParamMetadata): unknown {
  if (meta.probeHigh !== undefined) return meta.probeHigh
  if (meta.type === 'boolean') return true
  if (meta.type === 'enum') {
    const values = meta.enumValues ?? []
    return values[values.length - 1]
  }
  if (typeof meta.max === 'number') return meta.max
  if (typeof meta.defaultValue === 'number') return meta.defaultValue + 1
  return 1
}

function outOfRangeLow(min: number): number {
  return min - Math.max(1, Math.abs(min) + 1)
}

function outOfRangeHigh(max: number): number {
  return max + Math.max(1, Math.abs(max) + 1)
}

function severityForReference(ref: ContractReference): 'error' | 'warning' {
  // Contract references are authoritative across profile + mapping sources.
  // Unknown node/param references should fail verification, not degrade silently.
  void ref
  return 'error'
}

function hasSafeModeControl(profile: Profile): boolean {
  return (profile.ui?.controls ?? []).some((c) => {
    const id = String(c.id ?? '').toLowerCase()
    const target = String(c.target ?? '').toLowerCase()
    return (
      id === 'safe_mode' ||
      id === 'safemode' ||
      target === 'safe_mode' ||
      target === 'safemode'
    )
  })
}

function hasReducedMotionControl(profile: Profile): boolean {
  return (profile.ui?.controls ?? []).some((c) => {
    const id = String(c.id ?? '').toLowerCase()
    const target = String(c.target ?? '').toLowerCase()
    return (
      id === 'reduced_motion' ||
      id === 'reducedmotion' ||
      target === 'reduced_motion' ||
      target === 'reducedmotion'
    )
  })
}

function runUsageCheck(
  nodeDef: ContractNodeDefinition,
  paramKey: string
): {
  changed: boolean
  low: unknown
  high: unknown
  observedLow: unknown
  observedHigh: unknown
} {
  const meta = nodeDef.params[paramKey]
  const low = defaultProbeLow(meta)
  const high = defaultProbeHigh(meta)
  const hLow = nodeDef.createHarness()
  try {
    hLow.applyParam(paramKey, low, { intensity: 1, safeMode: false })
    const observedLow = meta.readEffective(hLow)
    hLow.dispose()

    const hHigh = nodeDef.createHarness()
    try {
      hHigh.applyParam(paramKey, high, { intensity: 1, safeMode: false })
      const observedHigh = meta.readEffective(hHigh)
      return {
        changed: differs(observedLow, observedHigh, meta.epsilon ?? 1e-6),
        low,
        high,
        observedLow,
        observedHigh,
      }
    } finally {
      hHigh.dispose()
    }
  } catch (error) {
    return {
      changed: false,
      low,
      high,
      observedLow: `probe-error:${String(error)}`,
      observedHigh: `probe-error:${String(error)}`,
    }
  }
}

function runRangeCheck(
  nodeDef: ContractNodeDefinition,
  paramKey: string
): RangeCheckResult | null {
  const meta = nodeDef.params[paramKey]
  if (meta.type !== 'number') return null
  if (typeof meta.min !== 'number' || typeof meta.max !== 'number') return null

  const lowInput = outOfRangeLow(meta.min)
  const highInput = outOfRangeHigh(meta.max)

  const hLow = nodeDef.createHarness()
  let observedLow: number | null = null
  let observedHigh: number | null = null
  try {
    hLow.applyParam(paramKey, lowInput, { intensity: 1, safeMode: false })
    observedLow = asNumber(meta.readEffective(hLow))
  } finally {
    hLow.dispose()
  }

  const hHigh = nodeDef.createHarness()
  try {
    hHigh.applyParam(paramKey, highInput, { intensity: 1, safeMode: false })
    observedHigh = asNumber(meta.readEffective(hHigh))
  } finally {
    hHigh.dispose()
  }

  if (observedLow == null || observedHigh == null) {
    return {
      kind: nodeDef.kind,
      node: nodeDef.node,
      param: paramKey,
      min: meta.min,
      max: meta.max,
      status: 'error',
      message: 'Could not read numeric runtime value for range check',
    }
  }

  const lowOk = observedLow >= meta.min - (meta.epsilon ?? 1e-6)
  const highOk = observedHigh <= meta.max + (meta.epsilon ?? 1e-6)
  const status: CheckStatus = lowOk && highOk ? 'ok' : 'error'
  return {
    kind: nodeDef.kind,
    node: nodeDef.node,
    param: paramKey,
    min: meta.min,
    max: meta.max,
    observedMin: observedLow,
    observedMax: observedHigh,
    status,
    message:
      status === 'ok'
        ? 'Runtime clamps numeric parameter into declared range'
        : 'Runtime clamp does not match declared numeric bounds',
  }
}

function uniqueParamKey(kind: 'video' | 'audio', node: string, param: string): string {
  return `${kind}:${node}:${param}`
}

export function verifyContracts(rootDir: string): ContractVerificationReport {
  const loaded = loadContractJsonReferences(rootDir)
  const videoLookup = buildVideoNodeLookup()
  const audioLookup = buildAudioNodeLookup()

  const issues: ContractIssue[] = []
  const missingNodes: ContractIssue[] = []
  const missingParams: ContractIssue[] = []
  const unusedParams: ContractIssue[] = []
  const rangeChecks: RangeCheckResult[] = []
  const policyChecks: PolicyCheckResult[] = []

  issues.push(...loaded.parseErrors)

  for (const ref of loaded.references) {
    if (ref.referenceType === 'profile_reactive_target') continue
    const lookup = ref.kind === 'video' ? videoLookup : audioLookup
    const nodeDef = lookup.get(ref.node)
    if (!nodeDef) {
      const issue: ContractIssue = {
        severity: severityForReference(ref),
        code: 'MISSING_NODE',
        message: `Referenced ${ref.kind} node "${ref.node}" is not implemented`,
        kind: ref.kind,
        node: ref.node,
        sourceFile: ref.sourceFile,
        profileId: ref.profileId,
        location: ref.location,
      }
      issues.push(issue)
      missingNodes.push(issue)
      continue
    }
    if (!ref.param) continue
    if (!nodeDef.params[ref.param]) {
      const issue: ContractIssue = {
        severity: severityForReference(ref),
        code: 'MISSING_PARAM',
        message: `Referenced ${ref.kind} param "${ref.param}" is not defined for node "${nodeDef.node}"`,
        kind: ref.kind,
        node: nodeDef.node,
        param: ref.param,
        sourceFile: ref.sourceFile,
        profileId: ref.profileId,
        location: ref.location,
      }
      issues.push(issue)
      missingParams.push(issue)
    }
  }

  for (const p of loaded.profiles) {
    const reactive = p.profile.reactive?.analyser_to_params ?? []
    for (let i = 0; i < reactive.length; i++) {
      const mapping = reactive[i]
      const resolved = resolveAnalyserTarget(mapping.target, p.profile, {
        reducedMotion: false,
      })
      if (!resolved) {
        const issue: ContractIssue = {
          severity: 'error',
          code: 'REACTIVE_TARGET_UNRESOLVED',
          message: `Reactive target "${mapping.target}" cannot be resolved`,
          profileId: p.profileId,
          sourceFile: p.sourceFile,
          location: `reactive.analyser_to_params[${i}].target`,
        }
        issues.push(issue)
        missingNodes.push(issue)
        continue
      }
      if (resolved.kind === 'video') {
        const dot = resolved.paramKey.indexOf('.')
        const builtIndex = Number(resolved.paramKey.slice(0, dot))
        const param = resolved.paramKey.slice(dot + 1)
        const entry = getProfileEntryForBuiltIndex(p.profile, builtIndex, {
          reducedMotion: false,
        })
        const nodeName = String(entry?.node ?? '').toLowerCase()
        const def = videoLookup.get(nodeName)
        if (!def) {
          const issue: ContractIssue = {
            severity: 'error',
            code: 'REACTIVE_VIDEO_NODE_MISSING',
            message: `Reactive target resolved to unknown video node "${nodeName}"`,
            profileId: p.profileId,
            sourceFile: p.sourceFile,
            location: `reactive.analyser_to_params[${i}].target`,
            kind: 'video',
            node: nodeName,
          }
          issues.push(issue)
          missingNodes.push(issue)
          continue
        }
        if (!def.params[param]) {
          const issue: ContractIssue = {
            severity: 'error',
            code: 'REACTIVE_VIDEO_PARAM_MISSING',
            message: `Reactive target param "${param}" is not implemented on video node "${def.node}"`,
            profileId: p.profileId,
            sourceFile: p.sourceFile,
            location: `reactive.analyser_to_params[${i}].target`,
            kind: 'video',
            node: def.node,
            param,
          }
          issues.push(issue)
          missingParams.push(issue)
        }
      } else {
        const parts = resolved.paramKey.split('.')
        const chainIndex = Number(parts[1])
        const param = parts.slice(2).join('.')
        const nodeName = String(
          p.profile.audio_stack?.chain?.[chainIndex]?.node ?? ''
        ).toLowerCase()
        const def = audioLookup.get(nodeName)
        if (!def) {
          const issue: ContractIssue = {
            severity: 'error',
            code: 'REACTIVE_AUDIO_NODE_MISSING',
            message: `Reactive target resolved to unknown audio node "${nodeName}"`,
            profileId: p.profileId,
            sourceFile: p.sourceFile,
            location: `reactive.analyser_to_params.target`,
            kind: 'audio',
            node: nodeName,
          }
          issues.push(issue)
          missingNodes.push(issue)
          continue
        }
        if (!def.params[param]) {
          const issue: ContractIssue = {
            severity: 'error',
            code: 'REACTIVE_AUDIO_PARAM_MISSING',
            message: `Reactive target param "${param}" is not implemented on audio node "${def.node}"`,
            profileId: p.profileId,
            sourceFile: p.sourceFile,
            location: `reactive.analyser_to_params.target`,
            kind: 'audio',
            node: def.node,
            param,
          }
          issues.push(issue)
          missingParams.push(issue)
        }
      }
    }
  }

  const referencedParams = new Map<
    string,
    {
      nodeDef: ContractNodeDefinition
      param: string
      fromProfile: boolean
    }
  >()
  for (const ref of loaded.references) {
    if (!ref.param) continue
    const lookup = ref.kind === 'video' ? videoLookup : audioLookup
    const nodeDef = lookup.get(ref.node)
    if (!nodeDef) continue
    if (!nodeDef.params[ref.param]) continue
    const key = uniqueParamKey(ref.kind, nodeDef.node, ref.param)
    const previous = referencedParams.get(key)
    const fromProfile = ref.referenceType.startsWith('profile_')
    referencedParams.set(key, {
      nodeDef,
      param: ref.param,
      fromProfile: (previous?.fromProfile ?? false) || fromProfile,
    })
  }

  for (const { nodeDef, param, fromProfile } of referencedParams.values()) {
    const usage = runUsageCheck(nodeDef, param)
    if (!usage.changed) {
      const issue: ContractIssue = {
        severity: fromProfile ? 'error' : 'warning',
        code: 'UNUSED_PARAM',
        message: `No measurable runtime effect detected for ${nodeDef.kind}.${nodeDef.node}.${param}`,
        kind: nodeDef.kind,
        node: nodeDef.node,
        param,
        details: {
          probeLow: usage.low,
          probeHigh: usage.high,
          observedLow: usage.observedLow,
          observedHigh: usage.observedHigh,
        },
      }
      issues.push(issue)
      unusedParams.push(issue)
    }

    const range = runRangeCheck(nodeDef, param)
    if (range) {
      rangeChecks.push(range)
      if (range.status === 'error') {
        issues.push({
          severity: 'error',
          code: 'RANGE_CLAMP_MISMATCH',
          message: `${range.kind}.${range.node}.${range.param}: ${range.message}`,
          kind: range.kind,
          node: range.node,
          param: range.param,
          details: {
            min: range.min,
            max: range.max,
            observedMin: range.observedMin,
            observedMax: range.observedMax,
          },
        })
      }
    }
  }

  for (const p of loaded.profiles) {
    const profile = p.profile
    const safeControl = hasSafeModeControl(profile)
    const reducedControl = hasReducedMotionControl(profile)

    if (!safeControl) {
      issues.push({
        severity: 'error',
        code: 'SAFE_MODE_CONTROL_MISSING',
        message: `Profile "${p.profileId}" does not expose a Safe Mode control`,
        profileId: p.profileId,
        sourceFile: p.sourceFile,
      })
      policyChecks.push({
        profileId: p.profileId,
        policy: 'safe_mode',
        status: 'error',
        message: 'Safe Mode control missing in UI controls',
      })
    }

    if (!reducedControl) {
      issues.push({
        severity: 'warning',
        code: 'REDUCED_MOTION_CONTROL_MISSING',
        message: `Profile "${p.profileId}" does not expose a Reduced Motion control`,
        profileId: p.profileId,
        sourceFile: p.sourceFile,
      })
      policyChecks.push({
        profileId: p.profileId,
        policy: 'reduced_motion',
        status: 'warning',
        message: 'Reduced Motion control missing in UI controls',
      })
    }

    const safeIntensity = clampIntensity(profile, 1, true)
    const normalIntensity = clampIntensity(profile, 1, false)
    const maxIntensityClamp = asNumber(
      profile.safety.safe_mode_clamps.max_intensity
    )
    const safeIntensityOk =
      safeIntensity <= normalIntensity + 1e-6 &&
      (maxIntensityClamp == null || safeIntensity <= maxIntensityClamp + 1e-6)
    policyChecks.push({
      profileId: p.profileId,
      policy: 'safe_mode',
      status: safeIntensityOk ? 'ok' : 'error',
      message: safeIntensityOk
        ? 'Safe Mode intensity ceiling is enforced'
        : 'Safe Mode intensity ceiling is not stricter than normal intensity clamp',
      param: 'max_intensity',
    })
    if (!safeIntensityOk) {
      issues.push({
        severity: 'error',
        code: 'SAFE_MODE_INTENSITY_MISMATCH',
        message: `Safe mode intensity clamp mismatch in profile "${p.profileId}"`,
        profileId: p.profileId,
        sourceFile: p.sourceFile,
      })
    }

    const disabled = new Set(
      (profile.safety.reduced_motion_policy?.disable_nodes ?? []).map((n) =>
        String(n).toLowerCase()
      )
    )
    const expectedBuiltCount = profile.video_stack.filter((def) => {
      const node = String(def.node).toLowerCase()
      return (
        videoLookup.has(node) &&
        !disabled.has(node) &&
        !TEMPORAL_NODE_TYPES.has(node)
      )
    }).length
    const actualBuiltCount = buildVideoNodes(profile, {
      reducedMotion: true,
    }).length
    const reducedMotionOk = expectedBuiltCount === actualBuiltCount
    policyChecks.push({
      profileId: p.profileId,
      policy: 'reduced_motion',
      status: reducedMotionOk ? 'ok' : 'error',
      message: reducedMotionOk
        ? 'Reduced Motion disables expected nodes'
        : `Reduced Motion mismatch: expected ${expectedBuiltCount} built nodes, got ${actualBuiltCount}`,
    })
    if (!reducedMotionOk) {
      issues.push({
        severity: 'error',
        code: 'REDUCED_MOTION_DISABLE_MISMATCH',
        message: `Reduced Motion did not disable nodes as expected in profile "${p.profileId}"`,
        profileId: p.profileId,
        sourceFile: p.sourceFile,
      })
    }

    const temporalSensitive = [
      'temporal_smear',
      'feedback_loop',
      'pulse',
      'focus_jitter',
    ]
    for (const def of profile.video_stack) {
      const node = String(def.node).toLowerCase()
      if (!temporalSensitive.includes(node)) continue
      if (!disabled.has(node)) {
        const issue: ContractIssue = {
          severity: 'warning',
          code: 'REDUCED_MOTION_TEMPORAL_NODE_NOT_DISABLED',
          message: `Profile "${p.profileId}" keeps temporal node "${node}" active in reduced motion policy`,
          profileId: p.profileId,
          sourceFile: p.sourceFile,
          kind: 'video',
          node,
        }
        issues.push(issue)
        policyChecks.push({
          profileId: p.profileId,
          policy: 'reduced_motion',
          status: 'warning',
          node,
          message:
            'Temporal node should be listed in reduced motion disable policy',
        })
      }
    }

    for (const def of profile.video_stack) {
      const node = String(def.node).toLowerCase()
      const nodeDef = videoLookup.get(node)
      if (!nodeDef) continue
      for (const paramName of Object.keys(def.params ?? {})) {
        const paramMeta = nodeDef.params[paramName]
        if (!paramMeta?.safeModeClampKey) continue
        const clampKey = paramMeta.safeModeClampKey
        const clampValue = asNumber(profile.safety.safe_mode_clamps[clampKey])
        if (clampValue == null) continue
        const harness = nodeDef.createHarness()
        let observed: number | null = null
        try {
          harness.applyParam(paramName, outOfRangeHigh(clampValue), {
            intensity: 1,
            safeMode: true,
            safetyContext: {
              global: { [clampKey]: outOfRangeHigh(clampValue) },
              safeMode: { [clampKey]: clampValue },
            },
          })
          observed = asNumber(paramMeta.readEffective(harness))
        } finally {
          harness.dispose()
        }
        if (observed == null) continue
        const ok = observed <= clampValue + (paramMeta.epsilon ?? 1e-6)
        policyChecks.push({
          profileId: p.profileId,
          policy: 'safe_mode',
          status: ok ? 'ok' : 'error',
          node: nodeDef.node,
          param: paramName,
          message: ok
            ? `Safe Mode clamp "${clampKey}" is enforced`
            : `Safe Mode clamp "${clampKey}" not enforced (observed ${observed}, clamp ${clampValue})`,
        })
        if (!ok) {
          issues.push({
            severity: 'error',
            code: 'SAFE_MODE_PARAM_CLAMP_MISMATCH',
            message: `Safe mode clamp mismatch for ${nodeDef.node}.${paramName} in "${p.profileId}"`,
            profileId: p.profileId,
            sourceFile: p.sourceFile,
            kind: 'video',
            node: nodeDef.node,
            param: paramName,
            details: { clampKey, clampValue, observed },
          })
        }
      }
    }

    for (const chainDef of profile.audio_stack?.chain ?? []) {
      const node = String(chainDef.node).toLowerCase()
      const nodeDef = audioLookup.get(node)
      if (!nodeDef) continue
      for (const [paramName, value] of Object.entries(chainDef.params ?? {})) {
        const paramMeta = nodeDef.params[paramName]
        if (!paramMeta?.safeModeClampKey) continue
        const clampValue = asNumber(
          profile.safety.safe_mode_clamps[paramMeta.safeModeClampKey]
        )
        const numericValue = asNumber(value)
        if (clampValue == null || numericValue == null) continue
        const ok = numericValue <= clampValue + (paramMeta.epsilon ?? 1e-6)
        policyChecks.push({
          profileId: p.profileId,
          policy: 'safe_mode',
          status: ok ? 'ok' : 'error',
          node: nodeDef.node,
          param: paramName,
          message: ok
            ? `Audio param respects safe clamp "${paramMeta.safeModeClampKey}"`
            : `Audio param exceeds safe clamp "${paramMeta.safeModeClampKey}" (${numericValue} > ${clampValue})`,
        })
        if (!ok) {
          issues.push({
            severity: 'error',
            code: 'SAFE_MODE_AUDIO_CLAMP_MISMATCH',
            message: `Audio safe clamp mismatch for ${nodeDef.node}.${paramName} in "${p.profileId}"`,
            profileId: p.profileId,
            sourceFile: p.sourceFile,
            kind: 'audio',
            node: nodeDef.node,
            param: paramName,
            details: {
              clampKey: paramMeta.safeModeClampKey,
              clampValue,
              value: numericValue,
            },
          })
        }
      }
    }
  }

  const warnings = issues.filter((i) => i.severity === 'warning')
  const errors = issues.filter((i) => i.severity === 'error')

  const okCount =
    Array.from(referencedParams.values()).length -
    unusedParams.filter((i) => i.severity === 'error').length +
    rangeChecks.filter((r) => r.status === 'ok').length +
    policyChecks.filter((p) => p.status === 'ok').length

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      profiles: loaded.profiles.length,
      references: loaded.references.length,
      ok: Math.max(0, okCount),
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
    registry: {
      video: getVideoRegistrySummaries(),
      audio: getAudioRegistrySummaries(),
    },
  }
}
