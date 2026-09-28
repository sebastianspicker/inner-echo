import type { DebugDiagnosticsSnapshot } from './useDebugDiagnostics'
import type { DebugDiagnosticsSources } from './diagnosticsFormatting'

interface DebugMetricsGridProps
  extends Pick<
      DebugDiagnosticsSources,
      'audioStatus' | 'micStatus' | 'couplingStrength' | 'maxFeedback' | 'lastError'
    >,
    DebugDiagnosticsSnapshot {}

function OverlayRows({
  overlay,
  audioStatus,
  micStatus,
}: Pick<DebugMetricsGridProps, 'overlay' | 'audioStatus' | 'micStatus'>) {
  return (
    <>
      <dt>renderer</dt>
      <dd>{overlay?.rendererMode ?? '-'}</dd>
      <dt>fps</dt>
      <dd>{overlay?.fps != null ? overlay.fps.toFixed(1) : '-'}</dd>
      <dt>frame ms</dt>
      <dd>{overlay?.frameTimeMs != null ? overlay.frameTimeMs.toFixed(2) : '-'}</dd>
      <dt>renderScale</dt>
      <dd>{overlay?.renderScale ?? '-'}</dd>
      <dt>RTs</dt>
      <dd>{overlay?.resourceCounts?.renderTargets ?? '-'}</dd>
      <dt>FBOs</dt>
      <dd>{overlay?.resourceCounts?.estimatedFramebuffers ?? '-'}</dd>
      <dt>textures</dt>
      <dd>{overlay?.resourceCounts?.estimatedTextures ?? '-'}</dd>
      <dt>audio</dt>
      <dd>{audioStatus}</dd>
      <dt>mic</dt>
      <dd>{micStatus}</dd>
      <dt>video nodes</dt>
      <dd>{overlay?.activeVideoNodes?.join(', ') || '-'}</dd>
    </>
  )
}

function CouplingRows({
  couplingStrength,
  maxFeedback,
}: Pick<DebugMetricsGridProps, 'couplingStrength' | 'maxFeedback'>) {
  if (couplingStrength == null && maxFeedback == null) return null
  return (
    <>
      {couplingStrength != null && (
        <>
          <dt>coupling</dt>
          <dd>{couplingStrength.toFixed(2)}</dd>
        </>
      )}
      {maxFeedback != null && (
        <>
          <dt>maxFeedback</dt>
          <dd>{maxFeedback.toFixed(2)}</dd>
        </>
      )}
    </>
  )
}

function AudioRows({ audioMetrics }: Pick<DebugMetricsGridProps, 'audioMetrics'>) {
  if (!audioMetrics) return null
  return (
    <>
      <dt>rms</dt>
      <dd>{audioMetrics.rms.toFixed(3)}</dd>
      <dt>centroid</dt>
      <dd>{audioMetrics.centroid.toFixed(3)}</dd>
      <dt>flux</dt>
      <dd>{audioMetrics.flux.toFixed(3)}</dd>
      {typeof audioMetrics.micRms === 'number' && (
        <>
          <dt>micRms</dt>
          <dd>{audioMetrics.micRms.toFixed(3)}</dd>
        </>
      )}
      {typeof audioMetrics.micCentroid === 'number' && (
        <>
          <dt>micCentroid</dt>
          <dd>{audioMetrics.micCentroid.toFixed(3)}</dd>
        </>
      )}
      {typeof audioMetrics.micFlux === 'number' && (
        <>
          <dt>micFlux</dt>
          <dd>{audioMetrics.micFlux.toFixed(3)}</dd>
        </>
      )}
    </>
  )
}

function AudioDebugRows({ audioDebug }: Pick<DebugMetricsGridProps, 'audioDebug'>) {
  if (!audioDebug) return null
  return (
    <>
      <dt>audio nodes</dt>
      <dd>{audioDebug.activeNodes.join(', ') || '-'}</dd>
      <dt>input mode</dt>
      <dd>{audioDebug.inputMode}</dd>
      <dt>gate gain</dt>
      <dd>{audioDebug.micGateGain != null ? audioDebug.micGateGain.toFixed(3) : '-'}</dd>
    </>
  )
}

function VideoRows({ videoMetrics }: Pick<DebugMetricsGridProps, 'videoMetrics'>) {
  if (!videoMetrics) return null
  return (
    <>
      <dt>motion</dt>
      <dd>{videoMetrics.motion.toFixed(3)}</dd>
      <dt>luma</dt>
      <dd>{videoMetrics.luminance.toFixed(3)}</dd>
      <dt>edge</dt>
      <dd>{videoMetrics.edge.toFixed(3)}</dd>
    </>
  )
}

function ClampRows({ appliedClamps }: Pick<DebugMetricsGridProps, 'appliedClamps'>) {
  if (!appliedClamps) return null
  return (
    <>
      <dt>intensity</dt>
      <dd>
        {appliedClamps.intensityInput.toFixed(2)} → {appliedClamps.intensityEffective.toFixed(2)}
      </dd>
      <dt>safe mode keys</dt>
      <dd>{appliedClamps.safeModeClampKeys.join(', ') || '-'}</dd>
      <dt>rm disabled</dt>
      <dd>{appliedClamps.reducedMotionDisabledNodes.join(', ') || '-'}</dd>
    </>
  )
}

function ErrorRows({ lastError }: Pick<DebugMetricsGridProps, 'lastError'>) {
  if (!lastError) return null
  return (
    <>
      <dt>last error</dt>
      <dd className="debug-panel__error">{lastError}</dd>
    </>
  )
}

export function DebugMetricsGrid(props: DebugMetricsGridProps) {
  return (
    <dl className="debug-panel__grid">
      <OverlayRows {...props} />
      <CouplingRows {...props} />
      <AudioRows {...props} />
      <AudioDebugRows {...props} />
      <VideoRows {...props} />
      <ClampRows {...props} />
      <ErrorRows {...props} />
    </dl>
  )
}
