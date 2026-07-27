import type {
  ContractIssue,
  ContractNodeDefinition,
  ContractParamMetadata,
  ContractReference,
  RangeCheckResult,
} from '../../src/contractVerification/types'
import { runRangeCheck } from './contractRangeChecks'

export function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function differs(a: unknown, b: unknown, epsilon = 1e-6) {
  const na = asNumber(a)
  const nb = asNumber(b)
  return na != null && nb != null
    ? Math.abs(na - nb) > epsilon
    : JSON.stringify(a) !== JSON.stringify(b)
}

export function outOfRangeLow(min: number) {
  return min - Math.max(1, Math.abs(min) + 1)
}

export function outOfRangeHigh(max: number) {
  return max + Math.max(1, Math.abs(max) + 1)
}

function probeLow(meta: ContractParamMetadata) {
  if (meta.probeLow !== undefined) return meta.probeLow
  if (meta.type === 'boolean') return false
  if (meta.type === 'enum') return meta.enumValues?.[0]
  return typeof meta.min === 'number' ? meta.min : (meta.defaultValue ?? 0)
}

function probeHigh(meta: ContractParamMetadata) {
  if (meta.probeHigh !== undefined) return meta.probeHigh
  if (meta.type === 'boolean') return true
  if (meta.type === 'enum') return meta.enumValues?.at(-1)
  return typeof meta.max === 'number' ? meta.max : (meta.defaultValue ?? 1)
}

function observeParam(nodeDef: ContractNodeDefinition, param: string, value: unknown) {
  const harness = nodeDef.createHarness()
  try {
    harness.applyParam(param, value, { intensity: 1, safeMode: false })
    return nodeDef.params[param].readEffective(harness)
  } finally {
    harness.dispose()
  }
}

function usageCheck(nodeDef: ContractNodeDefinition, param: string) {
  const meta = nodeDef.params[param]
  const low = probeLow(meta)
  const high = probeHigh(meta)
  try {
    const observedLow = observeParam(nodeDef, param, low)
    const observedHigh = observeParam(nodeDef, param, high)
    return {
      changed: differs(observedLow, observedHigh, meta.epsilon),
      low,
      high,
      observedLow,
      observedHigh,
    }
  } catch (error) {
    const observed = `probe-error:${String(error)}`
    return { changed: false, low, high, observedLow: observed, observedHigh: observed }
  }
}

function referencedParams(
  references: ContractReference[],
  videoLookup: Map<string, ContractNodeDefinition>,
  audioLookup: Map<string, ContractNodeDefinition>,
) {
  const params = new Map<
    string,
    { nodeDef: ContractNodeDefinition; param: string; fromProfile: boolean }
  >()
  for (const ref of references) {
    if (!ref.param) continue
    const nodeDef = (ref.kind === 'video' ? videoLookup : audioLookup).get(ref.node)
    if (!nodeDef?.params[ref.param]) continue
    const key = `${ref.kind}:${nodeDef.node}:${ref.param}`
    const previous = params.get(key)
    params.set(key, {
      nodeDef,
      param: ref.param,
      fromProfile: Boolean(previous?.fromProfile || ref.referenceType.startsWith('profile_')),
    })
  }
  return params
}

function usageIssue(
  nodeDef: ContractNodeDefinition,
  param: string,
  fromProfile: boolean,
  usage: ReturnType<typeof usageCheck>,
): ContractIssue {
  return {
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
}

function rangeMismatch(range: RangeCheckResult): ContractIssue {
  return {
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
  }
}

export function evaluateReferencedParams(
  references: ContractReference[],
  videoLookup: Map<string, ContractNodeDefinition>,
  audioLookup: Map<string, ContractNodeDefinition>,
  issues: ContractIssue[],
) {
  const params = referencedParams(references, videoLookup, audioLookup)
  const unusedParams: ContractIssue[] = []
  const rangeChecks: RangeCheckResult[] = []
  for (const { nodeDef, param, fromProfile } of params.values()) {
    const usage = usageCheck(nodeDef, param)
    if (!usage.changed) {
      const issue = usageIssue(nodeDef, param, fromProfile, usage)
      issues.push(issue)
      unusedParams.push(issue)
    }
    const range = runRangeCheck(nodeDef, param)
    if (!range) continue
    rangeChecks.push(range)
    if (range.status === 'error') issues.push(rangeMismatch(range))
  }
  return { unusedParams, rangeChecks, referencedParamCount: params.size }
}
