import {
  createEmptyMicrophoneGraph,
  type MicLifecycleOptions,
  type MicrophoneGraph,
} from './micTypes'

export function stopMediaTracks(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop()
}

/** Preserve teardown order: source path, analyser, gate, then mixer routing. */
export function disposeMicrophoneGraph(
  graph: MicrophoneGraph,
  options: Pick<MicLifecycleOptions, 'safeDisconnect'>,
): MicrophoneGraph {
  if (graph.stream) stopMediaTracks(graph.stream)
  options.safeDisconnect(graph.source)
  options.safeDisconnect(graph.preGain)
  graph.limiter?.dispose()
  options.safeDisconnect(graph.analyser)
  options.safeDisconnect(graph.gateGain)
  options.safeDisconnect(graph.routingGain)
  return createEmptyMicrophoneGraph()
}
