import type { Profile } from '../../domain/experience/schema'
import { getBuiltVideoStackEntries } from '../../domain/experience/videoStack'
import { IMPLEMENTED_VIDEO_NODES } from '../capabilities'
import { resolveVideoKeysFromIndex } from './videoKeyResolver'

export { resolveVideoKeysFromIndex } from './videoKeyResolver'

export function resolveCouplingVideoKeys(profile: Profile, reducedMotion: boolean) {
  const index = buildVideoNodeIndex(profile, reducedMotion)
  const resolve = (target: string) => resolveVideoKeysFromIndex(index, target)
  return {
    grain: resolve('video.grain.amount'),
    vignette: resolve('video.vignette.amount'),
    interference: resolve('video.interference.amount'),
    sharpen: resolve('video.edge_sharpen.amount'),
    chroma: resolve('video.chroma_aberration.amount'),
    pulse: resolve('video.pulse.depth'),
    gaze: resolve('video.gaze_tunnel.amount'),
    gazeEdge: resolve('video.gaze_tunnel.edge_gain'),
    somaticDepth: resolve('video.somatic_pulse.depth'),
    somaticTunnel: resolve('video.somatic_pulse.tunnel'),
    intrusion: resolve('video.intrusion_burst.amount'),
    salience: resolve('video.salience_competition.amount'),
    salienceShift: resolve('video.salience_competition.shift'),
    glassVeil: resolve('video.glass_veil.veil'),
    glassRefraction: resolve('video.glass_veil.refraction'),
  }
}

export const buildVideoNodeIndex = (profile: Profile, reducedMotion: boolean) => {
  const index = new Map<string, number[]>()
  for (const { def, index: builtIndex } of getBuiltVideoStackEntries(profile, {
    reducedMotion,
    supportedNodeIds: IMPLEMENTED_VIDEO_NODES,
  })) {
    for (const key of [(def.id ?? def.node).toLowerCase(), def.node.toLowerCase()]) {
      const indices = index.get(key) ?? []
      if (!indices.includes(builtIndex)) indices.push(builtIndex)
      index.set(key, indices)
    }
  }
  return index
}

export const resolveAudioKeys = (profile: Profile, nodeId: string, param: string) =>
  (profile.audio_stack?.chain ?? [])
    .map((node, index) =>
      (node.id ?? node.node ?? '').toLowerCase() === nodeId.toLowerCase() ? index : -1,
    )
    .filter((index) => index >= 0)
    .map((index) => `audio.${index}.${param}`)
