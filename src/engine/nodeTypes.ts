/**
 * Canonical node-type sets: single source of truth.
 *
 * Video node types are derived from `NODE_FACTORY` in conditions/graphBuilder.ts
 * (the authoritative video-node factory). Audio node types are derived from
 * `AUDIO_NODE_TYPE_KEYS` exported by engine/audio/audioGraphBuilder.ts (the
 * authoritative audio-node factory).
 *
 * Every module that needs to know "which node types are implemented?" should
 * import from here instead of maintaining its own list.
 */

import { NODE_FACTORY } from '../conditions/graphBuilder'
import { AUDIO_NODE_TYPE_KEYS } from './audio/audioGraphBuilder'

/** All implemented video-node type names (derived from NODE_FACTORY keys). */
export const IMPLEMENTED_VIDEO_NODES: ReadonlySet<string> = new Set(Object.keys(NODE_FACTORY))

/** All implemented audio-node type names (derived from FX_FACTORY keys). */
export const IMPLEMENTED_AUDIO_NODES: ReadonlySet<string> = new Set(AUDIO_NODE_TYPE_KEYS)
