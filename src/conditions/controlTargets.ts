/**
 * Stable public control-target contract. Focused modules keep global, video, audio,
 * and default construction policies independently testable without moving the facade.
 */
export { getDefaultControlValues } from './controlDefaults'
export { resolveControl, type ResolvedControl } from './controlResolution'
