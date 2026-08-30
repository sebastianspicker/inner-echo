/**
 * Canonical node-type sets: single source of truth.
 *
 * This metadata intentionally has no constructor imports. Application composition can
 * validate declarative content without pulling Three.js or Web Audio implementations
 * into the initial bundle. Runtime factories prove parity with these identifiers through
 * TypeScript and contract tests.
 */

export const VIDEO_NODE_IDS = [
  'grain',
  'vignette',
  'chroma_aberration',
  'temporal_smear',
  'color_grade',
  'haze',
  'soft_blur',
  'edge_sharpen',
  'pulse',
  'interference',
  'focus_jitter',
  'feedback_loop',
  'grid_hint',
  'gaze_tunnel',
  'somatic_pulse',
  'intrusion_burst',
  'salience_competition',
  'glass_veil',
] as const

export const AUDIO_NODE_IDS = [
  'lowpass',
  'highpass',
  'tremolo',
  'flutter',
  'noise_bed',
  'delay',
  'reverb',
  'pulse_tone',
  'compressor_limiter',
] as const

export type VideoNodeId = (typeof VIDEO_NODE_IDS)[number]
export type AudioNodeId = (typeof AUDIO_NODE_IDS)[number]

function immutableNodeIdSet(ids: Iterable<string>): ReadonlySet<string> {
  const values = new Set(Array.from(ids, (id) => id.toLowerCase()))
  let view: ReadonlySet<string>
  view = Object.freeze({
    get size() {
      return values.size
    },
    has: (value: string) => values.has(value),
    entries: () => values.entries(),
    keys: () => values.keys(),
    values: () => values.values(),
    [Symbol.iterator]: () => values[Symbol.iterator](),
    forEach: (
      callback: (value: string, value2: string, set: ReadonlySet<string>) => void,
      thisArg?: unknown,
    ) => {
      values.forEach((value) => callback.call(thisArg, value, value, view))
    },
  })
  return view
}

/** All implemented video-node type names, exposed without mutation methods. */
export const IMPLEMENTED_VIDEO_NODES = immutableNodeIdSet(VIDEO_NODE_IDS)

/** All implemented audio-node type names, exposed without mutation methods. */
export const IMPLEMENTED_AUDIO_NODES = immutableNodeIdSet(AUDIO_NODE_IDS)
