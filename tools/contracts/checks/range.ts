import type {
  ContractNodeDefinition,
  ContractParamMetadata,
  RangeCheckResult,
} from '../probes/types'

export function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** A probe value safely outside the declared range, so the runtime clamp must act. */
function outOfRangeLow(min: number) {
  return min - Math.max(1, Math.abs(min) + 1)
}

export function outOfRangeHigh(max: number) {
  return max + Math.max(1, Math.abs(max) + 1)
}

function bounds(meta: ContractParamMetadata) {
  if (meta.type !== 'number') return null
  if (typeof meta.min !== 'number') return null
  if (typeof meta.max !== 'number') return null
  return { min: meta.min, max: meta.max }
}

function observe(nodeDef: ContractNodeDefinition, param: string, value: number) {
  const harness = nodeDef.createHarness()
  try {
    harness.applyParam(param, value, { intensity: 1, safeMode: false })
    return asNumber(nodeDef.params[param].readEffective(harness))
  } finally {
    harness.dispose()
  }
}

function unreadable(nodeDef: ContractNodeDefinition, param: string, min: number, max: number) {
  return {
    kind: nodeDef.kind,
    node: nodeDef.node,
    param,
    min,
    max,
    status: 'error' as const,
    message: 'Could not read numeric runtime value for range check',
  }
}

function checked(context: {
  nodeDef: ContractNodeDefinition
  param: string
  min: number
  max: number
  observedMin: number
  observedMax: number
}): RangeCheckResult {
  const { nodeDef, param, min, max, observedMin, observedMax } = context
  const epsilon = nodeDef.params[param].epsilon ?? 1e-6
  // One-sided on purpose: safety contexts may cap a value below its declared bound.
  const ok = observedMin >= min - epsilon && observedMax <= max + epsilon
  return {
    kind: nodeDef.kind,
    node: nodeDef.node,
    param,
    min,
    max,
    observedMin,
    observedMax,
    status: ok ? 'ok' : 'error',
    message: ok
      ? 'Runtime keeps numeric parameter within declared range'
      : 'Runtime lets numeric parameter leave declared range',
  }
}

export function runRangeCheck(
  nodeDef: ContractNodeDefinition,
  param: string,
): RangeCheckResult | null {
  const numericBounds = bounds(nodeDef.params[param])
  if (!numericBounds) return null
  const observedMin = observe(nodeDef, param, outOfRangeLow(numericBounds.min))
  if (observedMin == null) return unreadable(nodeDef, param, numericBounds.min, numericBounds.max)
  const observedMax = observe(nodeDef, param, outOfRangeHigh(numericBounds.max))
  if (observedMax == null) return unreadable(nodeDef, param, numericBounds.min, numericBounds.max)
  return checked({ nodeDef, param, ...numericBounds, observedMin, observedMax })
}
