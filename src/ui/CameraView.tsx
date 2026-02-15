import { useCallback, useEffect, useRef, useState } from 'react'
import { loadCatalog, loadProfile } from '../conditions/loader'
import { buildVideoNodes, profileHasTemporalNodes } from '../conditions/graphBuilder'
import {
  getDefaultControlValues,
  resolveControl,
  type ResolvedControl,
} from '../conditions/controlTargets'
import type { CatalogEntry, Profile } from '../conditions/schema'
import { createReactiveDriver } from '../engine/reactive'
import { createCouplingEngine } from '../engine/reactive'
import { startOverlayLoop, type OverlayControl } from '../engine/canvas'
import { clampIntensity, getSafetyContext } from '../conditions/normalize'
import { composeEffectiveProfile, type ComposeReport } from '../composer'
import {
  requestVideoStream,
  stopVideoStream,
  type CameraState,
} from '../engine/video'
import {
  startAudioContext,
  createAudioEngine,
  type AudioContextStatus,
  type MicStatus,
  type AudioInputMode,
} from '../engine/audio'
import { getCameraErrorMessage, getCameraStateLabel } from './cameraMessages'
import { ConditionComposerPanel } from './ConditionComposerPanel'
import {
  OnboardingModal,
  getOnboardingAccepted,
} from './OnboardingModal'
import { DebugPanel } from './DebugPanel'
import type { ComposerMode, SelectedDimension, SelectedPreset } from '../composer'
import type { VideoMetrics } from '../engine/canvas'

const DEFAULT_INTENSITY = 0.5
const DEFAULT_CONDITION_ID = 'none'
const FALLBACK_PROFILE: Profile = {
  id: 'none',
  label: 'None (Clean)',
  summary: 'No overlay. Baseline camera view.',
  framing: { type: 'baseline' },
  experience_dimensions: [],
  safety: {
    intensity_default: 0,
    intensity_max: 0,
    warnings: [],
    safe_mode_clamps: { max_intensity: 0 },
  },
  ui: { controls: [] },
  video_stack: [],
  audio_stack: { enabled: false },
  reactive: { analyser_to_params: [] },
  references: { dimensions: [] },
}
const DEFAULT_PICKER_OPTIONS: CatalogEntry[] = [
  { id: 'none', label: 'None (Clean)', description: 'No overlay. Baseline camera view.' },
  { id: 'anxiety', label: 'Anxiety', description: 'Metaphor of heightened tension; grain overlay.' },
]

export function CameraView() {
  const [catalog, setCatalog] = useState<CatalogEntry[] | null>(null)
  const [conditionId, setConditionId] = useState(DEFAULT_CONDITION_ID)
  const [composerMode, setComposerMode] = useState<ComposerMode>('preset')
  const [selectedPresets, setSelectedPresets] = useState<SelectedPreset[]>([])
  const [selectedDimensions, setSelectedDimensions] = useState<SelectedDimension[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [composeReport, setComposeReport] = useState<ComposeReport | null>(null)
  const [cameraState, setCameraState] = useState<CameraState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [intensity, setIntensity] = useState(DEFAULT_INTENSITY)
  const [safeMode, setSafeMode] = useState(false)
  const [controlValues, setControlValues] = useState<Record<string, number | boolean>>({})
  const [stressMode, setStressMode] = useState(false)
  const [audioStatus, setAudioStatus] = useState<AudioContextStatus>('off')
  const [audioError, setAudioError] = useState<string | null>(null)
  const [masterVolume, setMasterVolume] = useState(0.22)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [micStatus, setMicStatus] = useState<MicStatus>('off')
  const [micError, setMicError] = useState<string | null>(null)
  const [inputMode, setInputMode] = useState<AudioInputMode>('synth')
  const [onboardingAccepted, setOnboardingAccepted] = useState(getOnboardingAccepted)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [micEnabled, setMicEnabled] = useState(false)
  const [micSensitivity, setMicSensitivity] = useState(0.5)
  const [micGate, setMicGate] = useState(0.25)
  const [couplingStrength, setCouplingStrength] = useState(0.5)
  const [maxFeedback, setMaxFeedback] = useState(0.35)
  const [interactionAmount, setInteractionAmount] = useState(0.15)
  const [debugOverlay, setDebugOverlay] = useState(false)
  // Render-loop consumers should read settings from refs to avoid stale captures.
  const couplingStrengthRef = useRef(couplingStrength)
  const maxFeedbackRef = useRef(maxFeedback)
  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayControlRef = useRef<OverlayControl | null>(null)
  const audioEngineControlRef = useRef<ReturnType<typeof createAudioEngine> | null>(null)
  const rmsDebugRef = useRef<HTMLSpanElement | null>(null)
  const videoMetricsRef = useRef<VideoMetrics | null>(null)

  useEffect(() => {
    couplingStrengthRef.current = couplingStrength
  }, [couplingStrength])
  useEffect(() => {
    maxFeedbackRef.current = maxFeedback
  }, [maxFeedback])

  const getOverlayDiagnostics = useCallback(
    () => overlayControlRef.current?.getDiagnostics?.(),
    []
  )

  const handleStart = useCallback(async () => {
    setErrorMessage(null)
    setCameraState('requesting')

    const result = await requestVideoStream()

    if (result.ok) {
      streamRef.current = result.stream
      const video = videoRef.current
      if (video) {
        video.srcObject = result.stream
        video.play().catch(() => {
          // Autoplay may be restricted; playsInline + srcObject often still shows first frame
        })
      }
      setCameraState('active')
    } else {
      streamRef.current = null
      const isDenied =
        result.error.name === 'NotAllowedError' ||
        result.error.name === 'PermissionDeniedError'
      setCameraState(isDenied ? 'denied' : 'error')
      setErrorMessage(getCameraErrorMessage(result.error))
    }
  }, [])

  const handleStop = useCallback(() => {
    if (overlayControlRef.current) {
      overlayControlRef.current.stop()
      overlayControlRef.current = null
    }
    audioEngineControlRef.current?.stop()
    audioEngineControlRef.current = null
    setAudioStatus('off')
    setAudioError(null)
    setMicStatus('off')
    setMicError(null)
    setMicEnabled(false)
    stopVideoStream(streamRef.current ?? undefined)
    streamRef.current = null
    const video = videoRef.current
    if (video) {
      video.srcObject = null
    }
    const canvas = canvasRef.current
    if (canvas && canvas.width > 0 && canvas.height > 0) {
      canvas.width = canvas.width
      canvas.height = canvas.height
    }
    setCameraState('idle')
    setErrorMessage(null)
  }, [])

  const handleEnableAudio = useCallback(() => {
    setAudioError(null)
    setAudioStatus('starting')
    startAudioContext().then((status) => {
      if (status === 'on') {
        const audioStack = audioEnabled ? (profile?.audio_stack ?? null) : { enabled: false }
        const control = createAudioEngine(audioStack, {
          onStatusChange(s, err) {
            setAudioStatus(s)
            setAudioError(err ?? null)
          },
          onMicStatusChange(s, err) {
            setMicStatus(s)
            setMicError(err ?? null)
          },
        })
        audioEngineControlRef.current = control
        const vol = audioEnabled ? (profile?.audio_stack?.master?.volume ?? 0.22) : 0
        setMasterVolume(vol)
      } else {
        setAudioStatus(status)
      }
    })
  }, [profile?.audio_stack, audioEnabled])

  const handleMasterVolumeChange = useCallback((value: number) => {
    setMasterVolume(value)
    audioEngineControlRef.current?.setMasterVolume(value)
  }, [])

  const handleEnableMic = useCallback(() => {
    setMicError(null)
    audioEngineControlRef.current?.requestMic()
  }, [])

  const handleDisableMic = useCallback(() => {
    audioEngineControlRef.current?.stopMic()
    setMicStatus('off')
    setMicError(null)
  }, [])

  const handleMicEnabledChange = useCallback(
    (enabled: boolean) => {
      setMicEnabled(enabled)
      if (audioStatus !== 'on') {
        if (enabled) setMicError('Enable audio first, then enable microphone (optional).')
        return
      }
      if (enabled) handleEnableMic()
      else handleDisableMic()
    },
    [audioStatus, handleDisableMic, handleEnableMic]
  )

  const handleQuickPreset = useCallback(
    (preset: 'calm' | 'balanced' | 'intense') => {
      // Conservative defaults; clamps still apply at runtime.
      if (preset === 'calm') {
        setIntensity(0.25)
        setCouplingStrength(0.2)
        setInteractionAmount(0.1)
        setMaxFeedback(0.25)
      } else if (preset === 'balanced') {
        setIntensity(0.5)
        setCouplingStrength(0.5)
        setInteractionAmount(0.15)
        setMaxFeedback(0.35)
      } else {
        setIntensity(0.8)
        setCouplingStrength(0.75)
        setInteractionAmount(0.25)
        setMaxFeedback(0.45)
      }
    },
    []
  )

  const handleInputModeChange = useCallback((mode: AudioInputMode) => {
    setInputMode(mode)
    audioEngineControlRef.current?.setInputMode(mode)
  }, [])

  // Load catalog once on mount (for condition picker).
  useEffect(() => {
    loadCatalog().then((c) => {
      if (c?.conditions?.length) setCatalog(c.conditions)
    })
  }, [])

  // Load profile when condition changes; set defaults for intensity and control values.
  useEffect(() => {
    if (composerMode !== 'preset') return
    if (!conditionId) return
    loadProfile(conditionId).then((p) => {
      const prof = p ?? FALLBACK_PROFILE
      setProfile(prof)
      setComposeReport(null)
      const defaults = getDefaultControlValues(prof)
      setControlValues(defaults)
      const safe = (prof as { safety?: { intensity_default?: number } }).safety
      if (typeof safe?.intensity_default === 'number') {
        setIntensity(safe.intensity_default)
      }
      // Audio is always optional in SSOT; default off.
      setAudioEnabled(false)
    })
  }, [conditionId, composerMode])

  // Compose profile when in multimorbid or symptom-first modes.
  useEffect(() => {
    if (composerMode === 'preset') return
    let cancelled = false
    const settings = {
      intensity,
      safeMode,
      reducedMotion,
      audioEnabled,
      micEnabled,
      couplingStrength,
      maxFeedback,
      interactionAmount,
      debugOverlay,
    }
    composeEffectiveProfile(selectedPresets, selectedDimensions, settings).then((res) => {
      if (cancelled) return
      setProfile(res.profile)
      setComposeReport(res.report)
      setControlValues({})
    })
    return () => {
      cancelled = true
    }
  }, [
    composerMode,
    selectedPresets,
    selectedDimensions,
    safeMode,
    reducedMotion,
    audioEnabled,
    micEnabled,
    couplingStrength,
    maxFeedback,
    interactionAmount,
    debugOverlay,
    intensity,
  ])

  // Seed multimorbid preset stack from current preset for convenience.
  useEffect(() => {
    if (composerMode !== 'multimorbid') return
    setSelectedPresets((prev) => {
      if (prev.length > 0) return prev
      return conditionId && conditionId !== 'none' ? [{ profileId: conditionId, weight: 1 }] : []
    })
  }, [composerMode, conditionId])

  // Canvas overlay: start loop when camera is active (after video has dimensions), using current condition profile.
  // When conditionId changes, cleanup stops the loop and we restart with the new profile (pipeline update without page refresh).
  useEffect(() => {
    if (cameraState !== 'active') {
      if (overlayControlRef.current) {
        overlayControlRef.current.stop()
        overlayControlRef.current = null
      }
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!video || !canvas || !container) return
    if (!profile) return

    let listener: (() => void) | null = null

    function startLoop(): void {
      if (overlayControlRef.current) return
      const prof = profile ?? FALLBACK_PROFILE
      const nodes = buildVideoNodes(prof, { reducedMotion })
      const reactiveList = (prof as { reactive?: { analyser_to_params?: unknown[] } }).reactive
        ?.analyser_to_params
      const couplingEngine = createCouplingEngine(prof, {
        couplingStrength: couplingStrengthRef.current,
        maxFeedback: maxFeedbackRef.current,
        reducedMotion,
        safeMode,
      })
      const reactiveOptions =
        (reactiveList?.length ?? 0) > 0 || couplingStrength > 0
          ? {
              getAudioMetrics: () => audioEngineControlRef.current?.getMetrics?.() ?? { rms: 0, centroid: 0, flux: 0 },
              getRms: () => audioEngineControlRef.current?.getRms?.() ?? 0, // back-compat
              applyAudioOverrides: (overrides: Record<string, number>) => {
                audioEngineControlRef.current?.applyReactiveParams?.(overrides)
              },
              onVideoMetrics: (m: VideoMetrics) => {
                videoMetricsRef.current = m
              },
              getOverrides: (() => {
                const driver = createReactiveDriver(prof, { reducedMotion })
                return (
                  delta: number,
                  audio: { rms: number; centroid: number; flux: number },
                  video: { motion: number; luminance: number; edge: number; instability: number },
                  baseControlValues: Record<string, number | boolean>
                ) => {
                  // Existing SSOT reactive (RMS-only)
                  const videoReactive = driver.getVideoOverrides(delta, audio.rms)
                  const audioReactive = driver.getAudioOverrides(delta, audio.rms)

                  // Coupling layer (audio↔video)
                  const baseAfterReactive = { ...baseControlValues, ...videoReactive }
                  // Ensure coupling uses the latest UI settings (sliders can change while loop runs).
                  couplingEngine.setSettings({
                    couplingStrength: couplingStrengthRef.current,
                    maxFeedback: maxFeedbackRef.current,
                  })
                  const coupled = couplingEngine.step(delta, audio, video, baseAfterReactive)

                  const audioOut = { ...audioReactive, ...coupled.audio }
                  return {
                    video: { ...videoReactive, ...coupled.video },
                    audio: audioOut,
                  }
                }
              })(),
            }
          : undefined
      const control = startOverlayLoop(
        video,
        canvas,
        container,
        nodes,
        reactiveOptions ?? undefined
      )
      overlayControlRef.current = control
      const safetyCtx = getSafetyContext(prof)
      const clampedIntensity = clampIntensity(prof, intensity, safeMode)
      control.setParams({
        intensity: clampedIntensity,
        safeMode,
        controlValues: { ...controlValues, intensity: clampedIntensity, safeMode },
        stressMode,
        safetyContext: safetyCtx,
      })
    }

    if (video.readyState >= 1 && video.videoWidth > 0 && video.videoHeight > 0) {
      startLoop()
    } else {
      listener = (): void => {
        video.removeEventListener('loadedmetadata', listener!)
        listener = null
        startLoop()
      }
      video.addEventListener('loadedmetadata', listener)
    }

    return () => {
      if (listener) video.removeEventListener('loadedmetadata', listener)
      if (overlayControlRef.current) {
        overlayControlRef.current.stop()
        overlayControlRef.current = null
      }
    }
  }, [cameraState, conditionId, reducedMotion, profile, controlValues, intensity, safeMode, stressMode])

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
  useEffect(() => {
    if (audioStatus !== 'on' || !audioEngineControlRef.current) return
    const audioStack = audioEnabled ? (profile?.audio_stack ?? null) : { enabled: false }
    audioEngineControlRef.current.setConditionAudio(audioStack)
    const vol = audioEnabled ? (profile?.audio_stack?.master?.volume ?? 0.22) : 0
    setMasterVolume(vol)
  }, [conditionId, profile?.audio_stack, audioStatus, audioEnabled, composerMode])

  // Phase 8: Dev-only live RMS display (no React state to avoid re-renders every frame).
  useEffect(() => {
    if (!import.meta.env.DEV || audioStatus !== 'on' || !debugOverlay) return
    let rafId: number | null = null
    function tick(): void {
      const rms = audioEngineControlRef.current?.getRms?.() ?? 0
      if (rmsDebugRef.current) {
        rmsDebugRef.current.textContent = `RMS ${rms.toFixed(3)}`
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId)
    }
  }, [audioStatus, debugOverlay])

  const isRequesting = cameraState === 'requesting'
  const isActive = cameraState === 'active'

  const warnings: string[] =
    (profile as { safety?: { warnings?: string[] } })?.safety?.warnings ?? []
  const showReducedMotionHint =
    reducedMotion && profile != null && profileHasTemporalNodes(profile)
  const profileDefinesReducedMotionControl =
    (profile?.ui?.controls ?? []).some((c) => c.id === 'reduced_motion')

  return (
    <section className="ie-shell" aria-label="Inner Echo — camera and controls">
      {!onboardingAccepted && (
        <OnboardingModal onAccept={() => setOnboardingAccepted(true)} />
      )}

      <header className="ie-header" role="banner">
        <div className="ie-brand" aria-label="Inner Echo">
          <div className="ie-title">Inner Echo</div>
          <div className="ie-subtitle">Local-only AV overlay • calm, minimal, safety-first</div>
        </div>

        <div className="ie-headerRight">
          <div className="ie-statusRow" role="status" aria-live="polite" aria-label="Runtime status">
            <span className="ie-pill">
              <span className="ie-pillKey">Camera</span>
              <span className="ie-pillVal">{getCameraStateLabel(cameraState)}</span>
            </span>
            <span className="ie-pill">
              <span className="ie-pillKey">Audio</span>
              <span className="ie-pillVal">{audioStatus}</span>
            </span>
          </div>

          <div className="ie-actions">
            <button
              type="button"
              className="ie-btn"
              onClick={handleStart}
              disabled={!onboardingAccepted || isRequesting || isActive}
              aria-busy={isRequesting}
              aria-describedby={!onboardingAccepted ? 'onboarding-required-desc' : undefined}
            >
              {isRequesting ? 'Requesting…' : 'Start camera'}
            </button>
            <button
              type="button"
              className="ie-btn ie-btn--danger"
              onClick={handleStop}
              disabled={!isActive}
              aria-label="Stop Everything — stop camera, audio, microphone, and all effects"
            >
              Stop Everything
            </button>
          </div>
        </div>
      </header>

      {errorMessage && (
        <div className="ie-callout ie-callout--error" role="alert" aria-label="Camera error">
          <div className="ie-calloutTitle">Camera</div>
          <div className="ie-calloutBody">{errorMessage}</div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="ie-callout ie-callout--warn" role="region" aria-label="Condition warnings">
          <div className="ie-calloutTitle">Hinweise</div>
          <ul className="ie-calloutList">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="ie-layout" aria-label="Main layout">
        <div ref={containerRef} className="ie-stage" aria-label="Camera stage">
          <video ref={videoRef} className="ie-video" playsInline muted aria-label="Camera feed" />
          <canvas ref={canvasRef} className="ie-canvas" aria-hidden="true" />
          {import.meta.env.DEV && debugOverlay && audioStatus === 'on' && (
            <span ref={rmsDebugRef} className="ie-debugChip" data-phase="reactive" aria-hidden="true" />
          )}
          {!isActive && <div className="ie-placeholder" aria-hidden="true">No image</div>}
        </div>

        <aside className="ie-panel" aria-label="Controls panel">
          <div className="ie-panelScroll">
            {!onboardingAccepted && (
              <p id="onboarding-required-desc" className="ie-hint" role="status">
                Accept the onboarding notice above to start the camera.
              </p>
            )}

            <div className="ie-panelSection" aria-label="Condition and settings">
              <ConditionComposerPanel
                catalog={catalog ?? DEFAULT_PICKER_OPTIONS}
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
                onAudioEnabledChange={setAudioEnabled}
                micEnabled={micEnabled}
                onMicEnabledChange={handleMicEnabledChange}
                couplingStrength={couplingStrength}
                onCouplingStrengthChange={setCouplingStrength}
                maxFeedback={maxFeedback}
                onMaxFeedbackChange={setMaxFeedback}
                interactionAmount={interactionAmount}
                onInteractionAmountChange={setInteractionAmount}
                debugOverlay={debugOverlay}
                onDebugOverlayChange={setDebugOverlay}
                onQuickPreset={handleQuickPreset}
              />

              {!profileDefinesReducedMotionControl && showReducedMotionHint && (
                <p className="ie-hint" role="status">
                  Reduced Motion is on; temporal effects are disabled for this condition.
                </p>
              )}
            </div>

            {import.meta.env.DEV && composerMode !== 'preset' && composeReport && (
              <details className="ie-panelSection">
                <summary className="ie-summary">Composer report (dev)</summary>
                <div className="ie-panelBody">
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
                  {(composeReport.missingNodes.video.length > 0 || composeReport.missingNodes.audio.length > 0) && (
                    <>
                      <div className="ie-subsectionTitle">Missing nodes (not applied)</div>
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
                </div>
              </details>
            )}

            <details className="ie-panelSection">
              <summary className="ie-summary">Audio & microphone</summary>
              <div className="ie-panelBody">
                <div className="camera-view__audio" role="group" aria-label="Audio">
                  <div className="camera-view__audio-status" role="status" aria-live="polite">
                    Audio: {audioStatus === 'off' && 'off'}
                    {audioStatus === 'starting' && 'starting…'}
                    {audioStatus === 'on' && 'on'}
                    {audioStatus === 'error' && 'error'}
                  </div>
                  {audioError && (
                    <p className="camera-view__error" role="alert">
                      {audioError}
                    </p>
                  )}
                  {audioStatus === 'off' && (
                    <button
                      type="button"
                      className="camera-view__btn camera-view__btn--audio"
                      onClick={handleEnableAudio}
                      aria-label="Enable audio"
                    >
                      Enable audio
                    </button>
                  )}
                  {audioStatus === 'on' && (
                    <label className="camera-view__control">
                      <span className="camera-view__control-label">Master volume</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(masterVolume * 100)}
                        onChange={(e) => handleMasterVolumeChange(Number(e.target.value) / 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(masterVolume * 100)}
                        aria-valuetext={`${Math.round(masterVolume * 100)}%`}
                      />
                    </label>
                  )}

                  {audioStatus === 'on' && (
                    <div className="camera-view__mic" role="group" aria-label="Microphone (optional)">
                      <p className="camera-view__mic-desc">
                        Microphone is optional, local-only, and can be turned off anytime. Not recorded or sent anywhere.
                      </p>
                      <div className="camera-view__mic-status" role="status" aria-live="polite">
                        Mic: {micStatus === 'off' && 'off'}
                        {micStatus === 'requesting' && 'requesting…'}
                        {micStatus === 'on' && 'on'}
                        {micStatus === 'denied' && 'denied'}
                        {micStatus === 'error' && 'error'}
                      </div>
                      {micError && (
                        <p className="camera-view__error" role="alert">
                          {micError}
                        </p>
                      )}
                      {micStatus !== 'on' && micStatus !== 'requesting' && (
                        <button
                          type="button"
                          className="camera-view__btn camera-view__btn--mic"
                          onClick={handleEnableMic}
                          aria-label="Enable microphone (optional)"
                        >
                          Enable microphone (optional)
                        </button>
                      )}
                      {micStatus === 'on' && (
                        <>
                          <button
                            type="button"
                            className="camera-view__btn camera-view__btn--mic-off"
                            onClick={handleDisableMic}
                            aria-label="Disable microphone"
                          >
                            Disable microphone
                          </button>
                          <label className="camera-view__control">
                            <span className="camera-view__control-label">Mic sensitivity</span>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={Math.round(micSensitivity * 100)}
                              onChange={(e) => {
                                const v = Number(e.target.value) / 100
                                setMicSensitivity(v)
                                audioEngineControlRef.current?.setMicSensitivity?.(v)
                              }}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={Math.round(micSensitivity * 100)}
                              aria-valuetext={`${Math.round(micSensitivity * 100)}%`}
                            />
                          </label>
                          <label className="camera-view__control">
                            <span className="camera-view__control-label">Noise gate</span>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={Math.round(micGate * 100)}
                              onChange={(e) => {
                                const v = Number(e.target.value) / 100
                                setMicGate(v)
                                audioEngineControlRef.current?.setMicGate?.(v)
                              }}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={Math.round(micGate * 100)}
                              aria-valuetext={`${Math.round(micGate * 100)}%`}
                            />
                          </label>
                          <div className="camera-view__input-mode" role="group" aria-label="Audio input">
                            <span className="camera-view__control-label">Input</span>
                            <div className="camera-view__input-mode-options">
                              {(['synth', 'mic', 'mix'] as const).map((mode) => (
                                <label key={mode} className="camera-view__control camera-view__control--toggle">
                                  <input
                                    type="radio"
                                    name="audio-input-mode"
                                    checked={inputMode === mode}
                                    onChange={() => handleInputModeChange(mode)}
                                    aria-label={mode === 'synth' ? 'Synth only' : mode === 'mic' ? 'Mic only' : 'Mix'}
                                  />
                                  <span>{mode === 'synth' ? 'Synth only' : mode === 'mic' ? 'Mic only' : 'Mix'}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </details>

            {isActive && (
              <details className="ie-panelSection">
                <summary className="ie-summary">Controls</summary>
                <div className="ie-panelBody">
                  <div className="camera-view__controls" role="group" aria-label="Effect controls">
                    {profile?.ui?.controls?.length
                      ? (() => {
                          const resolved: ResolvedControl[] = []
                          for (const c of profile.ui!.controls!) {
                            const r = resolveControl(c, profile)
                            if (r) resolved.push(r)
                          }
                          return resolved.map((r) => {
                            const value =
                              r.kind === 'intensity'
                                ? intensity
                                : r.kind === 'safeMode'
                                  ? safeMode
                              : r.kind === 'reducedMotion'
                                ? reducedMotion
                              : r.kind === 'audioEnabled'
                                ? audioEnabled
                                  : (controlValues[r.paramKey] ?? r.defaultValue) as number | boolean
                            const onChange = (v: number | boolean) => {
                              if (r.kind === 'intensity') setIntensity(v as number)
                              else if (r.kind === 'safeMode') setSafeMode(v as boolean)
                              else if (r.kind === 'reducedMotion') setReducedMotion(v as boolean)
                              else if (r.kind === 'audioEnabled') setAudioEnabled(v as boolean)
                              else setControlValues((prev) => ({ ...prev, [r.paramKey]: v }))
                            }
                            if (r.control.type === 'slider') {
                              const num = typeof value === 'number' ? value : 0
                              const min = r.control.min ?? 0
                              const max = r.control.max ?? 1
                              const step = r.control.step ?? 0.01
                              return (
                                <label key={r.control.id} className="camera-view__control">
                                  <span className="camera-view__control-label">{r.control.label ?? r.control.id}</span>
                                  <input
                                    type="range"
                                    min={min}
                                    max={max}
                                    step={step}
                                    value={num}
                                    onChange={(e) => onChange(Number(e.target.value))}
                                    aria-valuemin={min}
                                    aria-valuemax={max}
                                    aria-valuenow={num}
                                    aria-valuetext={`${Math.round(num * 100)}%`}
                                  />
                                </label>
                              )
                            }
                            return (
                              <label key={r.control.id} className="camera-view__control camera-view__control--toggle">
                                <input
                                  type="checkbox"
                                  checked={value === true}
                                  onChange={(e) => onChange(e.target.checked)}
                                  aria-describedby={r.kind === 'safeMode' ? 'safe-mode-desc' : undefined}
                                />
                                <span>{r.control.label ?? r.control.id}</span>
                              </label>
                            )
                          })
                        })()
                      : (
                        <>
                          <label className="camera-view__control">
                            <span className="camera-view__control-label">Intensity</span>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={Math.round(intensity * 100)}
                              onChange={(e) => setIntensity(Number(e.target.value) / 100)}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={Math.round(intensity * 100)}
                              aria-valuetext={`${Math.round(intensity * 100)}%`}
                            />
                          </label>
                          <label className="camera-view__control camera-view__control--toggle">
                            <input
                              type="checkbox"
                              checked={safeMode}
                              onChange={(e) => setSafeMode(e.target.checked)}
                              aria-describedby="safe-mode-desc"
                            />
                            <span>Safe Mode</span>
                          </label>
                        </>
                      )}
                    <label className="camera-view__control camera-view__control--toggle">
                      <input
                        type="checkbox"
                        checked={stressMode}
                        onChange={(e) => setStressMode(e.target.checked)}
                        aria-describedby="stress-mode-desc"
                      />
                      <span>Stress Mode (test FPS guard)</span>
                    </label>
                    <p id="safe-mode-desc" className="camera-view__control-hint">
                      Limits effect strength so it stays comfortable.
                    </p>
                    <p id="stress-mode-desc" className="camera-view__control-hint">
                      Simulates load to trigger resolution scale-down when FPS &lt; 30.
                    </p>
                  </div>
                </div>
              </details>
            )}

            {import.meta.env.DEV && (
              <div className="ie-panelSection" role="group" aria-label="Debug (development only)">
                <label className="ie-toggle">
                  <input type="checkbox" checked={debugOverlay} onChange={(e) => setDebugOverlay(e.target.checked)} />
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
                    couplingStrength={couplingStrength}
                    maxFeedback={maxFeedback}
                    micSensitivity={micSensitivity}
                    micGate={micGate}
                  />
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}
