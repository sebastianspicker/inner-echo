/**
 * CameraView Component
 *
 * Top-level coordinator for the browser-only runtime. React state owns the user-facing
 * controls; refs hand the latest values to long-lived WebGL/WebAudio loops without
 * rebuilding those loops on every slider move.
 */

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCatalog } from './hooks/useCatalog'
import { useProfileLoad } from './hooks/useProfileLoad'
import { useCameraController } from './hooks/useCameraController'
import { useOverlayController } from './hooks/useOverlayController'
import { useReactivePipeline } from './hooks/useReactivePipeline'
import { profileHasTemporalNodes, TEMPORAL_NODE_TYPES } from '../conditions/motionPolicy'
import { CameraHeader } from './CameraHeader'
import { CameraStage } from './CameraStage'
import { AudioMicControls } from './AudioMicControls'
import { EffectControls } from './EffectControls'
import { SafetyControls } from './SafetyControls'
import { RuntimeRail } from './RuntimeRail'

import type { CatalogEntry, Profile } from '../conditions/schema'
import type { OverlayControl, OverlayRuntimeState, VideoMetrics } from '../engine/canvas'
import {
  clampIntensity,
  getReducedMotionDisableNodes,
  getSafetyContext,
} from '../conditions/normalize'
import { type CameraState } from '../engine/video'
import {
  startAudioContext,
  createAudioEngine,
  type AudioEngineControl,
  type AudioContextStatus,
  type MicStatus,
  type AudioInputMode,
} from '../engine/audio'
import { ConditionComposerPanel } from './ConditionComposerPanel'
import { WelcomeStep, getWelcomeAcknowledged } from './WelcomeStep'
import { DebugPanel } from './DebugPanel'
import type { EvidenceDocPath } from '../evidence/docs'
import type { ComposerMode, SelectedDimension, SelectedPreset } from '../composer'
import {
  releaseCameraRuntime,
  startCameraRuntime,
  startRmsMeter,
  stopCameraRuntime,
  syncConditionAudio,
  type CameraRuntimeContext,
} from './cameraRuntime'
import {
  CAMERA_STREAM_INTERRUPTED_MESSAGE,
  handleCameraStreamInterruption,
  monitorCameraStream,
  subscribeToCameraDeviceChanges,
  type CameraInterruptionContext,
} from './cameraViewSupport'

const EvidenceDrawer = lazy(() =>
  import('./EvidenceDrawer').then((mod) => ({ default: mod.EvidenceDrawer })),
)

const DEFAULT_INTENSITY = 0.5
const DEFAULT_CONDITION_ID = 'none'
const DEFAULT_PICKER_OPTIONS: CatalogEntry[] = [
  { id: 'none', label: 'None (Clean)', description: 'No overlay. Baseline camera view.' },
  {
    id: 'anxiety',
    label: 'Anxiety',
    description: 'Metaphor of heightened tension; grain overlay.',
  },
]

function getActiveVideoNodeIds(profile: Profile | null, reducedMotion: boolean): string[] {
  if (!profile) return []
  const disabled = getReducedMotionDisableNodes(profile)
  const active: string[] = []
  for (const def of profile.video_stack) {
    const node = String(def.node ?? '').toLowerCase()
    if (!node) continue
    const blocked = reducedMotion && (TEMPORAL_NODE_TYPES.has(node) || disabled.has(node))
    if (!blocked) active.push(node)
  }
  return active
}

function profileHasEnabledAudio(profile: Profile | null): boolean {
  return profile?.audio_stack?.enabled === true
}

function selectAudioStack(
  profile: Profile | null,
  profileHasAudio: boolean,
  audioRequested: boolean,
): Profile['audio_stack'] | null {
  if (profileHasAudio) return profile?.audio_stack ?? { enabled: false }
  if (audioRequested) return profile?.audio_stack ?? null
  return { enabled: false }
}

function selectMasterVolume(profile: Profile | null, audioRequested: boolean): number {
  return audioRequested ? (profile?.audio_stack?.master?.volume ?? 0.22) : 0
}

function seedPresetStack(previous: SelectedPreset[], conditionId: string): SelectedPreset[] {
  if (previous.length > 0) return previous
  return conditionId && conditionId !== 'none' ? [{ profileId: conditionId, weight: 1 }] : []
}

export function CameraView() {
  const catalogLoad = useCatalog()
  const [conditionId, setConditionId] = useState(DEFAULT_CONDITION_ID)
  const [composerMode, setComposerMode] = useState<ComposerMode>('symptom')
  const [selectedPresets, setSelectedPresets] = useState<SelectedPreset[]>([])
  const [selectedDimensions, setSelectedDimensions] = useState<SelectedDimension[]>([])
  const [cameraState, setCameraState] = useState<CameraState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [intensity, setIntensity] = useState(DEFAULT_INTENSITY)
  const [safeMode, setSafeMode] = useState(true)
  const [stressMode, setStressMode] = useState(false)
  const [audioStatus, setAudioStatus] = useState<AudioContextStatus>('off')
  const [audioError, setAudioError] = useState<string | null>(null)
  const [masterVolume, setMasterVolume] = useState(0.22)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [micStatus, setMicStatus] = useState<MicStatus>('off')
  const [micError, setMicError] = useState<string | null>(null)
  const [inputMode, setInputMode] = useState<AudioInputMode>('synth')
  const [welcomeAcknowledged, setWelcomeAcknowledged] = useState(getWelcomeAcknowledged)
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  )
  const [micSensitivity, setMicSensitivity] = useState(0.5)
  const [micGate, setMicGate] = useState(0.25)
  const [couplingStrength, setCouplingStrength] = useState(0.5)
  const [maxFeedback, setMaxFeedback] = useState(0.35)
  const [interactionAmount, setInteractionAmount] = useState(0.15)
  const [debugOverlay, setDebugOverlay] = useState(false)
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const [overlayState, setOverlayState] = useState<OverlayRuntimeState>({
    rendererMode: 'unavailable',
    effectsActive: false,
    error: null,
  })
  const [evidenceDocPath, setEvidenceDocPath] = useState<EvidenceDocPath>(
    'docs/references/README.md',
  )

  const {
    profile,
    composeReport,
    controlValues,
    setControlValues,
    isProfileLoading,
    profileLoadStatus,
    profileLoadError,
    retryProfileLoad,
  } = useProfileLoad({
    conditionId,
    composerMode,
    selectedPresets,
    selectedDimensions,
    setIntensity,
    intensity,
    safeMode,
    reducedMotion,
    audioEnabled,
    maxFeedback,
    interactionAmount,
  })

  // Render-loop consumers should read settings from refs to avoid stale captures.
  // By using mutable refs, the WebGL render loop running at 60fps can read the latest UI slider
  // values immediately without needing React to re-render the whole `CameraView` component tree.
  const inputModeRef = useRef(inputMode)
  const micSensitivityRef = useRef(micSensitivity)
  const micGateRef = useRef(micGate)
  const couplingStrengthRef = useRef(couplingStrength)
  const maxFeedbackRef = useRef(maxFeedback)
  const safeModeRef = useRef(safeMode)
  const intensityRef = useRef(intensity)
  const controlValuesRef = useRef(controlValues)
  const stressModeRef = useRef(stressMode)
  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fallbackCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayControlRef = useRef<OverlayControl | null>(null)
  const audioEngineControlRef = useRef<AudioEngineControl | null>(null)
  const rmsDebugRef = useRef<HTMLSpanElement | null>(null)
  const videoMetricsRef = useRef<VideoMetrics | null>(null)
  const cameraRequestSeqRef = useRef(0)
  const audioRequestSeqRef = useRef(0)
  const reducedMotionPrevRef = useRef(reducedMotion)
  const profilePrevRef = useRef<Profile | null>(null)
  const profileRef = useRef<Profile | null>(profile)
  const audioEnabledRef = useRef(audioEnabled)
  const cameraStateRef = useRef<CameraState>(cameraState)

  const cameraRuntimeContext = useMemo<CameraRuntimeContext>(
    () => ({
      streamRef,
      videoRef,
      canvasRef,
      fallbackCanvasRef,
      overlayControlRef,
      audioEngineControlRef,
      cameraRequestSeqRef,
      audioRequestSeqRef,
      setCameraState,
      setErrorMessage,
      setAudioStatus,
      setAudioError,
      setMicStatus,
      setMicError,
    }),
    [],
  )

  const cameraInterruptionContext = useMemo<CameraInterruptionContext>(
    () => ({
      streamRef,
      videoRef,
      overlayControlRef,
      cameraStateRef,
      setCameraState,
      setErrorMessage,
    }),
    [],
  )

  inputModeRef.current = inputMode
  micSensitivityRef.current = micSensitivity
  micGateRef.current = micGate
  couplingStrengthRef.current = couplingStrength
  maxFeedbackRef.current = maxFeedback
  safeModeRef.current = safeMode
  intensityRef.current = intensity
  controlValuesRef.current = controlValues
  stressModeRef.current = stressMode
  profileRef.current = profile
  audioEnabledRef.current = audioEnabled
  cameraStateRef.current = cameraState

  const openEvidence = useCallback((docPath: EvidenceDocPath) => {
    setEvidenceDocPath(docPath)
    setEvidenceOpen(true)
  }, [])

  const { getOverlayDiagnostics, getAudioDebugState, getAppliedClamps } = useOverlayController({
    overlayControlRef,
    audioControlRef: audioEngineControlRef,
    profile,
    reducedMotion,
    safeMode,
    intensity,
  })

  const handleCameraStreamInterrupted = useCallback(
    (stream: MediaStream | null | undefined, message: string) =>
      handleCameraStreamInterruption(cameraInterruptionContext, stream, message),
    [cameraInterruptionContext],
  )

  /**
   * Primary entry point to turn the camera on.
   * Requests device permissions via WebRTC `getUserMedia`.
   */
  const handleStart = useCallback(
    () =>
      startCameraRuntime(cameraRuntimeContext, (stream) =>
        handleCameraStreamInterrupted(stream, CAMERA_STREAM_INTERRUPTED_MESSAGE),
      ),
    [cameraRuntimeContext, handleCameraStreamInterrupted],
  )

  useEffect(
    () => subscribeToCameraDeviceChanges(cameraStateRef, streamRef, handleCameraStreamInterrupted),
    [handleCameraStreamInterrupted],
  )

  useEffect(
    () => monitorCameraStream(cameraState, streamRef, handleCameraStreamInterrupted),
    [cameraState, handleCameraStreamInterrupted],
  )

  const handleStop = useCallback(
    () => stopCameraRuntime(cameraRuntimeContext),
    [cameraRuntimeContext],
  )

  // Ensure all runtime resources are released even if the view unmounts unexpectedly.
  useEffect(() => () => releaseCameraRuntime(cameraRuntimeContext), [cameraRuntimeContext])

  const handleMicStatusChange = (status: MicStatus, error?: string): void => {
    setMicStatus(status)
    setMicError(error ?? null)
    if (status === 'on') {
      setInputMode('mix')
      audioEngineControlRef.current?.setInputMode('mix')
      return
    }
    if (!['off', 'denied', 'error'].includes(status) || inputModeRef.current === 'synth') return
    setInputMode('synth')
    audioEngineControlRef.current?.setInputMode('synth')
  }

  function installAudioEngine(forceEnabled: boolean, requestSeq: number): void {
    audioEngineControlRef.current?.stop()
    audioEngineControlRef.current = null
    const currentProfile = profileRef.current
    const currentAudioEnabled = forceEnabled || audioEnabledRef.current
    const profileHasAudio = profileHasEnabledAudio(currentProfile)
    const audioRequested = profileHasAudio || currentAudioEnabled
    const audioStack = selectAudioStack(currentProfile, profileHasAudio, audioRequested)
    if (profileHasAudio || forceEnabled) setAudioEnabled(true)
    const control = createAudioEngine(audioStack, {
      onStatusChange(status, error) {
        setAudioStatus(status)
        setAudioError(error ?? null)
      },
      onMicStatusChange: handleMicStatusChange,
    })
    if (requestSeq !== audioRequestSeqRef.current) {
      control.stop()
      return
    }
    audioEngineControlRef.current = control
    setAudioStatus('on')
    const volume = selectMasterVolume(currentProfile, audioRequested)
    control.setMasterVolume(volume)
    control.setInputMode(inputModeRef.current)
    control.setMicSensitivity(micSensitivityRef.current)
    control.setMicGate(micGateRef.current)
    setMasterVolume(volume)
  }

  const finishAudioStart = (
    status: AudioContextStatus,
    forceEnabled: boolean,
    requestSeq: number,
  ): void => {
    if (requestSeq !== audioRequestSeqRef.current) return
    if (status === 'on') installAudioEngine(forceEnabled, requestSeq)
    else setAudioStatus(status)
  }

  const failAudioStart = (error: unknown, requestSeq: number): void => {
    if (requestSeq !== audioRequestSeqRef.current) return
    setAudioStatus('error')
    setAudioError(error instanceof Error ? error.message : String(error))
  }

  function startAudio(forceEnabled: boolean): void {
    const requestSeq = ++audioRequestSeqRef.current
    setAudioError(null)
    setAudioStatus('starting')
    startAudioContext()
      .then((status) => finishAudioStart(status, forceEnabled, requestSeq))
      .catch((error) => failAudioStart(error, requestSeq))
  }

  const handleEnableAudio = (): void => {
    startAudio(false)
  }

  const handleDisableAudio = useCallback(() => {
    audioRequestSeqRef.current += 1
    audioEngineControlRef.current?.stop()
    audioEngineControlRef.current = null
    setAudioEnabled(false)
    setAudioStatus('off')
    setAudioError(null)
    setMicStatus('off')
    setMicError(null)
    setInputMode('synth')
  }, [])

  const handleAudioEnabledChange = (enabled: boolean): void => {
    setAudioEnabled(enabled)
    if (enabled && audioStatus !== 'on' && audioStatus !== 'starting') {
      startAudio(true)
    }
  }

  const handleMasterVolumeChange = useCallback((value: number) => {
    setMasterVolume(value)
    audioEngineControlRef.current?.setMasterVolume(value)
  }, [])

  const handleEnableMic = useCallback(() => {
    setMicError(null)
    setInputMode('mix')
    audioEngineControlRef.current?.setInputMode('mix')
    audioEngineControlRef.current?.requestMic()
  }, [])

  const handleDisableMic = useCallback(() => {
    audioEngineControlRef.current?.stopMic()
    if (inputModeRef.current !== 'synth') {
      setInputMode('synth')
      audioEngineControlRef.current?.setInputMode('synth')
    }
    setMicStatus('off')
    setMicError(null)
  }, [])

  const handleInputModeChange = useCallback((mode: AudioInputMode) => {
    setInputMode(mode)
    audioEngineControlRef.current?.setInputMode(mode)
  }, [])

  useEffect(() => {
    if (micStatus === 'on') return
    if (inputMode !== 'mic') return
    setInputMode('synth')
    audioEngineControlRef.current?.setInputMode('synth')
  }, [micStatus, inputMode])

  useEffect(() => {
    reducedMotionPrevRef.current = reducedMotion
    profilePrevRef.current = profile
  }, [profile, reducedMotion])

  // Seed multimorbid preset stack from current preset for convenience.
  useEffect(() => {
    if (composerMode !== 'multimorbid') return
    setSelectedPresets((previous) => seedPresetStack(previous, conditionId))
  }, [composerMode, conditionId])

  useReactivePipeline({
    cameraState,
    reducedMotion,
    profile,
    videoRef,
    canvasRef,
    fallbackCanvasRef,
    containerRef,
    overlayControlRef,
    audioEngineControlRef,
    videoMetricsRef,
    couplingStrengthRef,
    maxFeedbackRef,
    safeModeRef,
    intensityRef,
    controlValuesRef,
    stressModeRef,
    onOverlayStateChange: setOverlayState,
  })

  // Push params to the overlay when they change (only has effect when WebGL is active).
  useEffect(() => {
    if (!profile) return
    const safetyCtx = getSafetyContext(profile)
    const clampedIntensity = clampIntensity(profile, intensity, safeMode)
    overlayControlRef.current?.setParams({
      intensity: clampedIntensity,
      safeMode,
      controlValues: { ...controlValues, intensity: clampedIntensity, safeMode },
      stressMode,
      safetyContext: safetyCtx,
    })
  }, [intensity, safeMode, controlValues, stressMode, profile])

  // When condition changes and audio is on, rewire audio graph (with ramp).
  useEffect(
    () =>
      syncConditionAudio(
        audioEngineControlRef.current,
        audioStatus,
        audioEnabled,
        profile,
        setMasterVolume,
      ),
    [profile, audioStatus, audioEnabled],
  )

  // Dev-only live RMS display; avoid React state so the audio meter does not re-render each frame.
  useEffect(
    () =>
      startRmsMeter(
        import.meta.env.DEV && audioStatus === 'on' && debugOverlay,
        audioEngineControlRef,
        rmsDebugRef,
      ),
    [audioStatus, debugOverlay],
  )

  const cameraController = useCameraController({
    cameraState,
    audioStatus,
    micStatus,
    onStart: handleStart,
    onStop: handleStop,
  })

  const warnings: string[] = profile?.safety?.warnings ?? []
  const showReducedMotionHint = reducedMotion && profile != null && profileHasTemporalNodes(profile)
  const activeVideoNodeIds = getActiveVideoNodeIds(profile, reducedMotion)
  const profileDefinesReducedMotionControl = (profile?.ui?.controls ?? []).some(
    (c) => c.id === 'reduced_motion',
  )
  const effectsLabel =
    cameraState !== 'active'
      ? 'Off'
      : overlayState.effectsActive
        ? 'Active'
        : overlayState.rendererMode === 'webgl'
          ? 'Clean preview'
          : overlayState.rendererMode === '2d' || overlayState.rendererMode === 'raw'
            ? 'Raw preview'
            : 'Unavailable'

  return (
    <section className="ie-shell" aria-label="Inner Echo">
      {welcomeAcknowledged && (
        <CameraHeader
          cameraState={cameraState}
          audioStatus={audioStatus}
          audioEnabled={audioEnabled}
          effectsLabel={effectsLabel}
          canStop={cameraController.canStop}
          onOpenEvidence={openEvidence}
          onStop={cameraController.stop}
        />
      )}

      <div className="ie-liveRegion" role="status" aria-live="polite" aria-atomic="true">
        Camera {cameraState}. Effects {effectsLabel}. Sound {audioStatus}.
      </div>

      <main className="ie-main">
        {!welcomeAcknowledged ? (
          <WelcomeStep
            onContinue={() => setWelcomeAcknowledged(true)}
            onOpenEvidence={openEvidence}
          />
        ) : (
          <>
            {errorMessage && (
              <div className="ie-callout ie-callout--error" role="alert" aria-label="Camera notice">
                <div className="ie-calloutTitle">Camera problem</div>
                <div className="ie-calloutBody">{errorMessage}</div>
              </div>
            )}

            {catalogLoad.status === 'error' && (
              <div className="ie-callout ie-callout--error" role="alert">
                <div className="ie-calloutTitle">Setup unavailable</div>
                <div className="ie-calloutBody">
                  {catalogLoad.error} A limited fallback list is available.{' '}
                  <button type="button" className="ie-inlineAction" onClick={catalogLoad.retry}>
                    Retry catalog
                  </button>
                </div>
              </div>
            )}

            {profileLoadStatus === 'error' && (
              <div className="ie-callout ie-callout--error" role="alert">
                <div className="ie-calloutTitle">Experience fallback active</div>
                <div className="ie-calloutBody">
                  {profileLoadError}{' '}
                  <button type="button" className="ie-inlineAction" onClick={retryProfileLoad}>
                    Retry experience
                  </button>
                </div>
              </div>
            )}

            {cameraState === 'active' &&
              !overlayState.effectsActive &&
              overlayState.rendererMode !== 'webgl' && (
                <div className="ie-callout ie-callout--warn" role="status">
                  <div className="ie-calloutTitle">Effects unavailable</div>
                  <div className="ie-calloutBody">
                    Showing the unmodified camera preview. Comfort and Stop controls remain
                    available.
                  </div>
                </div>
              )}

            {warnings.length > 0 && (
              <div
                className="ie-callout ie-callout--warn ie-callout--safety"
                role="region"
                aria-label="Things to be aware of"
              >
                <div className="ie-calloutTitle">Please be aware</div>
                <ul className="ie-calloutList">
                  {warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div
              className={`ie-layout ie-layout--${cameraController.isActive ? 'live' : 'setup'}`}
              aria-label="Experience workspace"
            >
              {cameraController.isActive && (
                <RuntimeRail
                  cameraState={cameraState}
                  audioStatus={audioStatus}
                  effectsActive={overlayState.effectsActive}
                />
              )}
              <div className="ie-stageColumn">
                <CameraStage
                  containerRef={containerRef}
                  videoRef={videoRef}
                  webglCanvasRef={canvasRef}
                  fallbackCanvasRef={fallbackCanvasRef}
                  rmsDebugRef={rmsDebugRef}
                  isActive={cameraController.isActive}
                  audioStatus={audioStatus}
                  debugOverlay={debugOverlay}
                />
                <SafetyControls
                  intensity={intensity}
                  safeMode={safeMode}
                  reducedMotion={reducedMotion}
                  isRequesting={cameraController.isRequesting}
                  isActive={cameraController.isActive}
                  canStart={welcomeAcknowledged}
                  canStop={cameraController.canStop}
                  onIntensityChange={setIntensity}
                  onSafeModeChange={setSafeMode}
                  onReducedMotionChange={setReducedMotion}
                  onStart={cameraController.start}
                  onStop={cameraController.stop}
                  variant={cameraController.isActive ? 'live' : 'setup'}
                  showCameraActions={cameraController.isActive}
                />
              </div>

              <aside className="ie-panel" aria-label="Controls panel">
                <div className="ie-panelScroll">
                  <div className="ie-panelSection" aria-label="Condition and settings">
                    {isProfileLoading && (
                      <p className="ie-hint" role="status" aria-live="polite">
                        Preparing your experience…
                      </p>
                    )}
                    <ConditionComposerPanel
                      catalog={catalogLoad.catalog ?? DEFAULT_PICKER_OPTIONS}
                      mode={composerMode}
                      onModeChange={setComposerMode}
                      conditionId={conditionId}
                      onConditionIdChange={setConditionId}
                      presets={selectedPresets}
                      onPresetsChange={setSelectedPresets}
                      dimensions={selectedDimensions}
                      onDimensionsChange={setSelectedDimensions}
                      intensity={intensity}
                      onIntensityChange={setIntensity}
                      safeMode={safeMode}
                      onSafeModeChange={setSafeMode}
                      reducedMotion={reducedMotion}
                      onReducedMotionChange={setReducedMotion}
                      audioEnabled={audioEnabled}
                      onAudioEnabledChange={handleAudioEnabledChange}
                      couplingStrength={couplingStrength}
                      onCouplingStrengthChange={setCouplingStrength}
                      maxFeedback={maxFeedback}
                      onMaxFeedbackChange={setMaxFeedback}
                      interactionAmount={interactionAmount}
                      onInteractionAmountChange={setInteractionAmount}
                      onOpenEvidence={openEvidence}
                      variant={cameraController.isActive ? 'compact' : 'setup'}
                      cameraRequesting={cameraController.isRequesting}
                      onStartCamera={cameraController.isActive ? undefined : cameraController.start}
                    />

                    {!profileDefinesReducedMotionControl && showReducedMotionHint && (
                      <p className="ie-hint" role="status">
                        Reduced Motion is on. Motion-heavy and temporal effects are disabled.
                      </p>
                    )}
                  </div>

                  {import.meta.env.DEV && (
                    <details className="ie-panelSection">
                      <summary className="ie-summary">Composer report (dev)</summary>
                      <div className="ie-panelBody">
                        {composerMode === 'preset' && (
                          <p className="ie-hint">
                            Only shown when combining collections or choosing experience dimensions.
                            A single curated collection does not need a composition report.
                          </p>
                        )}
                        {composerMode !== 'preset' && composeReport && (
                          <>
                            {composeReport.missingPresets.length > 0 && (
                              <>
                                <div className="ie-subsectionTitle">Missing presets</div>
                                <ul className="ie-codeList">
                                  {composeReport.missingPresets.map((id) => (
                                    <li key={id}>
                                      <code>{id}</code>
                                    </li>
                                  ))}
                                </ul>
                              </>
                            )}
                            {(composeReport.missingNodes.video.length > 0 ||
                              composeReport.missingNodes.audio.length > 0) && (
                              <>
                                <div className="ie-subsectionTitle">
                                  Missing nodes (not applied)
                                </div>
                                <ul className="ie-codeList">
                                  {composeReport.missingNodes.video.map((n) => (
                                    <li key={`v-${n}`}>
                                      video: <code>{n}</code>
                                    </li>
                                  ))}
                                  {composeReport.missingNodes.audio.map((n) => (
                                    <li key={`a-${n}`}>
                                      audio: <code>{n}</code>
                                    </li>
                                  ))}
                                </ul>
                              </>
                            )}
                            {composeReport.evidence.gaps.length > 0 && (
                              <>
                                <div className="ie-subsectionTitle">Evidence gaps</div>
                                <ul className="ie-codeList">
                                  {composeReport.evidence.gaps.map((g) => (
                                    <li key={`${g.dimensionId}-${g.reason}`}>
                                      <code>{g.dimensionId}</code>: {g.reason}
                                    </li>
                                  ))}
                                </ul>
                              </>
                            )}
                            {composeReport.missingPresets.length === 0 &&
                              composeReport.missingNodes.video.length === 0 &&
                              composeReport.missingNodes.audio.length === 0 &&
                              (composeReport.evidence.gaps?.length ?? 0) === 0 && (
                                <p className="ie-hint">
                                  Composition applied. No missing presets or nodes.
                                </p>
                              )}
                          </>
                        )}
                      </div>
                    </details>
                  )}

                  <AudioMicControls
                    audioStatus={audioStatus}
                    audioEnabled={audioEnabled}
                    audioError={audioError}
                    masterVolume={masterVolume}
                    micStatus={micStatus}
                    micError={micError}
                    micSensitivity={micSensitivity}
                    micGate={micGate}
                    inputMode={inputMode}
                    onEnableAudio={handleEnableAudio}
                    onDisableAudio={handleDisableAudio}
                    onEnableMic={handleEnableMic}
                    onDisableMic={handleDisableMic}
                    onMasterVolumeChange={handleMasterVolumeChange}
                    onMicSensitivityChange={(v) => {
                      setMicSensitivity(v)
                      audioEngineControlRef.current?.setMicSensitivity?.(v)
                    }}
                    onMicGateChange={(v) => {
                      setMicGate(v)
                      audioEngineControlRef.current?.setMicGate?.(v)
                    }}
                    onInputModeChange={handleInputModeChange}
                    defaultOpen={cameraController.isActive}
                  />

                  {cameraController.isActive && (
                    <EffectControls
                      profile={profile}
                      intensity={intensity}
                      safeMode={safeMode}
                      stressMode={stressMode}
                      reducedMotion={reducedMotion}
                      audioEnabled={audioEnabled}
                      controlValues={controlValues}
                      onIntensityChange={setIntensity}
                      onSafeModeChange={setSafeMode}
                      onStressModeChange={setStressMode}
                      onReducedMotionChange={setReducedMotion}
                      onAudioEnabledChange={handleAudioEnabledChange}
                      onControlValuesChange={setControlValues}
                    />
                  )}

                  {import.meta.env.DEV && (
                    <div
                      className="ie-panelSection"
                      role="group"
                      aria-label="Debug (development only)"
                    >
                      <label className="ie-toggle">
                        <input
                          type="checkbox"
                          aria-label="Debug overlay (dev)"
                          checked={debugOverlay}
                          onChange={(e) => setDebugOverlay(e.target.checked)}
                        />
                        <span>Debug overlay (dev)</span>
                      </label>
                      {debugOverlay && (
                        <DebugPanel
                          getOverlayDiagnostics={getOverlayDiagnostics}
                          audioStatus={audioStatus}
                          micStatus={micStatus}
                          lastError={errorMessage ?? audioError ?? micError}
                          getAudioMetrics={() => audioEngineControlRef.current?.getMetrics?.()}
                          getVideoMetrics={() => videoMetricsRef.current ?? undefined}
                          getAudioDebugState={getAudioDebugState}
                          getAppliedClamps={getAppliedClamps}
                          couplingStrength={couplingStrength}
                          maxFeedback={maxFeedback}
                          micSensitivity={micSensitivity}
                          micGate={micGate}
                        />
                      )}
                      {debugOverlay && activeVideoNodeIds.length > 0 && (
                        <p className="ie-hint" role="status">
                          Active video nodes: {activeVideoNodeIds.join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </>
        )}
      </main>

      {evidenceOpen && (
        <Suspense fallback={null}>
          <EvidenceDrawer
            open={evidenceOpen}
            docPath={evidenceDocPath}
            onNavigate={setEvidenceDocPath}
            onClose={() => setEvidenceOpen(false)}
            safeMode={safeMode}
            reducedMotion={reducedMotion}
            mediaActive={cameraController.canStop}
          />
        </Suspense>
      )}
    </section>
  )
}
