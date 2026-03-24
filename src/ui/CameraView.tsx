/**
 * CameraView Component
 * 
 * Architecture Overview:
 * This component is the primary orchestrator of the entire Inner Echo application.
 * It strictly acts as a conductor, bridging four distinct technological layers:
 * 
 * 1. UI State (React): Manages the panels, buttons, and user preferences (e.g., intensity, safe mode).
 * 2. Video Capture (WebRTC): Solicits and maintains the raw camera feed (`requestVideoStream`).
 * 3. Audio Engine (Web Audio API): Manages background audio, microphone inputs, and volume (`contextManager.ts`).
 * 4. Visual Engine (WebGL): Feeds the raw video into WebGL shaders for pixel manipulation (`startOverlayLoop`).
 * 
 * Note on Performance:
 * To avoid freezing the UI when heavy WebGL calculations occur, `CameraView` heavily utilizes
 * `useRef` to pass real-time config values (like slider values) into the WebGL requestAnimationFrame loop
 * without triggering full React re-renders.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useCatalog } from './hooks/useCatalog'
import { useProfileLoad } from './hooks/useProfileLoad'
import { useImmersiveIdleState } from './hooks/useImmersiveIdleState'
import { useCameraController } from './hooks/useCameraController'
import { useAudioController } from './hooks/useAudioController'
import { useOverlayController } from './hooks/useOverlayController'
import { useReactivePipeline } from './hooks/useReactivePipeline'
import { logger } from '../utils/logger'
import {
  profileHasTemporalNodes,
  TEMPORAL_NODE_TYPES,
} from '../conditions/graphBuilder'
import { CameraHeader } from './CameraHeader'
import { CameraStage } from './CameraStage'
import { AudioMicControls } from './AudioMicControls'
import { EffectControls } from './EffectControls'

import type { CatalogEntry, Profile } from '../conditions/schema'
import type { OverlayControl, VideoMetrics } from '../engine/canvas'
import {
  clampIntensity,
  getReducedMotionDisableNodes,
  getSafetyContext,
} from '../conditions/normalize'
import {
  requestVideoStream,
  stopVideoStream,
  type CameraState,
} from '../engine/video'
import {
  startAudioContext,
  createAudioEngine,
  type AudioEngineControl,
  type AudioContextStatus,
  type MicStatus,
  type AudioInputMode,
} from '../engine/audio'
import { getCameraErrorMessage } from './cameraMessages'
import { ConditionComposerPanel } from './ConditionComposerPanel'
import {
  OnboardingModal,
  getOnboardingAccepted,
} from './OnboardingModal'
import { DebugPanel } from './DebugPanel'
import { EvidenceDrawer } from './EvidenceDrawer'
import type { EvidenceDocPath } from '../evidence/docs'
import type { ComposerMode, SelectedDimension, SelectedPreset } from '../composer'


const DEFAULT_INTENSITY = 0.5
const DEFAULT_CONDITION_ID = 'none'
const DEFAULT_PICKER_OPTIONS: CatalogEntry[] = [
  { id: 'none', label: 'None (Clean)', description: 'No overlay. Baseline camera view.' },
  { id: 'anxiety', label: 'Anxiety', description: 'Metaphor of heightened tension; grain overlay.' },
]
const CAMERA_STREAM_INTERRUPTED_MESSAGE =
  'Kamerasignal wurde unterbrochen. Bitte starten Sie die Kamera erneut.'
const CAMERA_DEVICE_DISCONNECTED_MESSAGE =
  'Kamera wurde getrennt. Bitte starten Sie die Kamera erneut.'

function getActiveVideoNodeIds(
  profile: Profile | null,
  reducedMotion: boolean
): string[] {
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

function hasLiveVideoTrack(stream: MediaStream): boolean {
  return stream.getVideoTracks().some((track) => track.readyState === 'live')
}

function clearVideoTrackEndHandlers(stream: MediaStream | null | undefined): void {
  if (!stream) return
  for (const track of stream.getVideoTracks()) {
    track.onended = null
  }
}

export function CameraView() {
  const catalog = useCatalog()
  const [conditionId, setConditionId] = useState(DEFAULT_CONDITION_ID)
  const [composerMode, setComposerMode] = useState<ComposerMode>('preset')
  const [selectedPresets, setSelectedPresets] = useState<SelectedPreset[]>([])
  const [selectedDimensions, setSelectedDimensions] = useState<SelectedDimension[]>([])
  const [cameraState, setCameraState] = useState<CameraState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [intensity, setIntensity] = useState(DEFAULT_INTENSITY)
  const [safeMode, setSafeMode] = useState(false)
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
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const [evidenceDocPath, setEvidenceDocPath] = useState<EvidenceDocPath>('docs/references/README.md')

  const { profile, composeReport, controlValues, setControlValues, isProfileLoading } = useProfileLoad({
    conditionId,
    composerMode,
    selectedPresets,
    selectedDimensions,
    setIntensity,
    setAudioEnabled,
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
  const overlayControlRef = useRef<OverlayControl | null>(null)
  const audioEngineControlRef = useRef<AudioEngineControl | null>(null)
  const rmsDebugRef = useRef<HTMLSpanElement | null>(null)
  const videoMetricsRef = useRef<VideoMetrics | null>(null)
  const cameraRequestSeqRef = useRef(0)
  const audioRequestSeqRef = useRef(0)
  const reducedMotionPrevRef = useRef(reducedMotion)
  const profilePrevRef = useRef<Profile | null>(null)
  const cameraStateRef = useRef<CameraState>(cameraState)

  couplingStrengthRef.current = couplingStrength
  maxFeedbackRef.current = maxFeedback
  safeModeRef.current = safeMode
  intensityRef.current = intensity
  controlValuesRef.current = controlValues
  stressModeRef.current = stressMode
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
    (stream: MediaStream | null | undefined, message: string) => {
      if (!stream) return
      if (cameraStateRef.current !== 'active') return
      if (streamRef.current !== stream) return
      if (overlayControlRef.current) {
        overlayControlRef.current.stop()
        overlayControlRef.current = null
      }
      clearVideoTrackEndHandlers(stream)
      stopVideoStream(stream)
      streamRef.current = null
      const video = videoRef.current
      if (video) video.srcObject = null
      setCameraState('error')
      setErrorMessage(message)
    },
    []
  )

  /**
   * Primary entry point to turn the camera on.
   * Prompts the user for device permissions via WebRTC `getUserMedia`.
   */
  const handleStart = useCallback(async () => {
    const requestSeq = ++cameraRequestSeqRef.current
    setErrorMessage(null)
    setCameraState('requesting')

    const result = await requestVideoStream()
    if (requestSeq !== cameraRequestSeqRef.current) {
      if (result.ok) stopVideoStream(result.stream)
      return
    }

    if (result.ok) {
      streamRef.current = result.stream
      const stream = result.stream
      for (const track of stream.getVideoTracks()) {
        track.onended = () => {
          handleCameraStreamInterrupted(stream, CAMERA_STREAM_INTERRUPTED_MESSAGE)
        }
      }
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        video.play().catch((err) => {
          // Autoplay may be restricted; playsInline + srcObject often still shows first frame
          if (import.meta.env?.DEV) {
            logger.warn('video.play failed', err)
          }
          setCameraState('error')
          setErrorMessage('Playback error. Please interact with the page or restart the camera.')
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
  }, [handleCameraStreamInterrupted])

  useEffect(() => {
    const mediaDevices = navigator.mediaDevices
    if (!mediaDevices?.addEventListener) return
    const onDeviceChange = (): void => {
      if (cameraStateRef.current !== 'active') return
      const stream = streamRef.current
      if (!stream) return
      if (hasLiveVideoTrack(stream)) return
      handleCameraStreamInterrupted(stream, CAMERA_DEVICE_DISCONNECTED_MESSAGE)
    }
    mediaDevices.addEventListener('devicechange', onDeviceChange)
    return () => {
      mediaDevices.removeEventListener('devicechange', onDeviceChange)
    }
  }, [handleCameraStreamInterrupted])

  useEffect(() => {
    if (cameraState !== 'active') return
    const timer = window.setInterval(() => {
      const stream = streamRef.current
      if (!stream) return
      if (hasLiveVideoTrack(stream)) return
      handleCameraStreamInterrupted(stream, CAMERA_STREAM_INTERRUPTED_MESSAGE)
    }, 250)
    return () => {
      window.clearInterval(timer)
    }
  }, [cameraState, handleCameraStreamInterrupted])

  const handleStop = useCallback(() => {
    // Invalidate any in-flight camera request; stale streams are closed when they resolve.
    cameraRequestSeqRef.current += 1
    // Invalidate any in-flight audio start request.
    audioRequestSeqRef.current += 1
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
    clearVideoTrackEndHandlers(streamRef.current)
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

  // Ensure all runtime resources are released even if the view unmounts unexpectedly.
  useEffect(() => {
    return () => {
      cameraRequestSeqRef.current += 1
      audioRequestSeqRef.current += 1
      overlayControlRef.current?.stop()
      overlayControlRef.current = null
      audioEngineControlRef.current?.stop()
      audioEngineControlRef.current = null
      clearVideoTrackEndHandlers(streamRef.current)
      stopVideoStream(streamRef.current ?? undefined)
      streamRef.current = null
      const video = videoRef.current
      if (video) video.srcObject = null
    }
  }, [])

  const handleEnableAudio = useCallback(() => {
    const requestSeq = ++audioRequestSeqRef.current
    setAudioError(null)
    setAudioStatus('starting')
    startAudioContext()
      .then((status) => {
        if (requestSeq !== audioRequestSeqRef.current) return
        if (status === 'on') {
          if (audioEngineControlRef.current) {
            audioEngineControlRef.current.stop()
            audioEngineControlRef.current = null
          }
          const profileHasAudio = !!profile?.audio_stack?.enabled
          const audioStack =
            profileHasAudio
              ? (profile?.audio_stack ?? { enabled: false })
              : (audioEnabled ? (profile?.audio_stack ?? null) : { enabled: false })
          if (profileHasAudio) setAudioEnabled(true)
          const control = createAudioEngine(audioStack, {
            onStatusChange(s, err) {
              setAudioStatus(s)
              setAudioError(err ?? null)
            },
            onMicStatusChange(s, err) {
              setMicStatus(s)
              setMicError(err ?? null)
              if (s === 'on') setMicEnabled(true)
              else if (s === 'off' || s === 'denied' || s === 'error') setMicEnabled(false)
            },
          })
          if (requestSeq !== audioRequestSeqRef.current) {
            control.stop()
            return
          }
          audioEngineControlRef.current = control
          setAudioStatus('on')
          const vol = profileHasAudio || audioEnabled ? (profile?.audio_stack?.master?.volume ?? 0.22) : 0
          control.setMasterVolume(vol)
          control.setInputMode(inputMode)
          control.setMicSensitivity(micSensitivity)
          control.setMicGate(micGate)
          setMasterVolume(vol)
        } else {
          setAudioStatus(status)
        }
      })
      .catch((err) => {
        if (requestSeq === audioRequestSeqRef.current) {
          setAudioStatus('error')
          setAudioError(err instanceof Error ? err.message : String(err))
        }
      })
  }, [profile, audioEnabled, inputMode, micSensitivity, micGate])

  const handleMasterVolumeChange = useCallback((value: number) => {
    setMasterVolume(value)
    audioEngineControlRef.current?.setMasterVolume(value)
  }, [])

  const handleEnableMic = useCallback(() => {
    setMicError(null)
    setMicEnabled(true)
    audioEngineControlRef.current?.requestMic()
  }, [])

  const handleDisableMic = useCallback(() => {
    audioEngineControlRef.current?.stopMic()
    if (inputMode === 'mic') {
      setInputMode('synth')
      audioEngineControlRef.current?.setInputMode('synth')
    }
    setMicEnabled(false)
    setMicStatus('off')
    setMicError(null)
  }, [inputMode])

  const { toggleMic: handleMicEnabledChange } = useAudioController({
    audioStatus,
    enableMic: handleEnableMic,
    disableMic: handleDisableMic,
    setMicEnabled,
    setMicError,
  })

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
    setSelectedPresets((prev) => {
      if (prev.length > 0) return prev
      return conditionId && conditionId !== 'none' ? [{ profileId: conditionId, weight: 1 }] : []
    })
  }, [composerMode, conditionId])

  useReactivePipeline({
    cameraState,
    reducedMotion,
    profile,
    videoRef,
    canvasRef,
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
  useEffect(() => {
    if (audioStatus !== 'on' || !audioEngineControlRef.current) return
    const audioStack = audioEnabled ? (profile?.audio_stack ?? null) : { enabled: false }
    audioEngineControlRef.current.setConditionAudio(audioStack)
    const vol = audioEnabled ? (profile?.audio_stack?.master?.volume ?? 0.22) : 0
    setMasterVolume(vol)
    audioEngineControlRef.current.setMasterVolume(vol)
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

  const isIdle = useImmersiveIdleState(cameraState)
  const cameraController = useCameraController({
    cameraState,
    audioStatus,
    micStatus,
    onStart: handleStart,
    onStop: handleStop,
  })

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      const node = target as HTMLElement | null
      if (!node) return false
      const tag = node.tagName.toLowerCase()
      return tag === 'input' || tag === 'textarea' || tag === 'select' || node.isContentEditable
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      if (isEditableTarget(e.target)) return
      const key = e.key.toLowerCase()
      if (key === 'k') {
        e.preventDefault()
        if (cameraController.isActive || cameraController.isRequesting) cameraController.stop()
        else if (onboardingAccepted) cameraController.start()
      } else if (key === 'e') {
        e.preventDefault()
        openEvidence('docs/references/README.md')
      } else if (key === 'd' && import.meta.env.DEV) {
        e.preventDefault()
        setDebugOverlay((prev) => !prev)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [cameraController, onboardingAccepted, openEvidence])

  const warnings: string[] =
    profile?.safety?.warnings ?? []
  const showReducedMotionHint =
    reducedMotion && profile != null && profileHasTemporalNodes(profile)
  const activeVideoNodeIds = getActiveVideoNodeIds(profile, reducedMotion)
  const profileDefinesReducedMotionControl =
    (profile?.ui?.controls ?? []).some((c) => c.id === 'reduced_motion')

  return (
    <section className={`ie-shell ${isIdle ? 'ie-shell--idle' : ''}`} aria-label="Inner Echo — camera and controls">
      {!onboardingAccepted && (
        <OnboardingModal onAccept={() => setOnboardingAccepted(true)} />
      )}

      <CameraHeader
        cameraState={cameraState}
        audioStatus={audioStatus}
        isRequesting={cameraController.isRequesting}
        isActive={cameraController.isActive}
        canStop={cameraController.canStop}
        onboardingAccepted={onboardingAccepted}
        onOpenEvidence={openEvidence}
        onStart={cameraController.start}
        onStop={cameraController.stop}
      />

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
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="ie-layout" aria-label="Main layout">
        <CameraStage
          containerRef={containerRef}
          videoRef={videoRef}
          canvasRef={canvasRef}
          rmsDebugRef={rmsDebugRef}
          isActive={cameraController.isActive}
          audioStatus={audioStatus}
          debugOverlay={debugOverlay}
        />

        <aside className="ie-panel" aria-label="Controls panel">
          <div className="ie-panelScroll">
            {!onboardingAccepted && (
              <p id="onboarding-required-desc" className="ie-hint" role="status">
                Accept the onboarding notice above to start the camera.
              </p>
            )}

            <div className="ie-panelSection" aria-label="Condition and settings">
              {isProfileLoading && (
                <p className="ie-hint" role="status" aria-live="polite">
                  Loading condition…
                </p>
              )}
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
                micRequiresAudio={audioStatus !== 'on'}
                micRequiresAudioHint="Enable audio first to enable microphone (optional)."
                couplingStrength={couplingStrength}
                onCouplingStrengthChange={setCouplingStrength}
                maxFeedback={maxFeedback}
                onMaxFeedbackChange={setMaxFeedback}
                interactionAmount={interactionAmount}
                onInteractionAmountChange={setInteractionAmount}
                debugOverlay={debugOverlay}
                onDebugOverlayChange={setDebugOverlay}
                onQuickPreset={handleQuickPreset}
                onOpenEvidence={openEvidence}
              />

              {!profileDefinesReducedMotionControl && showReducedMotionHint && (
                <p className="ie-hint" role="status">
                  Reduced Motion is on; temporal effects are disabled for this condition.
                </p>
              )}
            </div>

            {import.meta.env.DEV && (
              <details className="ie-panelSection">
                <summary className="ie-summary">Composer report (dev)</summary>
                <div className="ie-panelBody">
                  {composerMode === 'preset' && (
                    <p className="ie-hint">Only shown in Multimorbid or Symptom-first mode. In Preset mode a single condition is loaded; no composition report.</p>
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
                      {composeReport.missingPresets.length === 0 &&
                        composeReport.missingNodes.video.length === 0 &&
                        composeReport.missingNodes.audio.length === 0 &&
                        (composeReport.evidence.gaps?.length ?? 0) === 0 && (
                          <p className="ie-hint">Composition applied. No missing presets or nodes.</p>
                        )}
                    </>
                  )}
                </div>
              </details>
            )}

            <AudioMicControls
              audioStatus={audioStatus}
              audioError={audioError}
              masterVolume={masterVolume}
              micStatus={micStatus}
              micError={micError}
              micSensitivity={micSensitivity}
              micGate={micGate}
              inputMode={inputMode}
              onEnableAudio={handleEnableAudio}
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
                onAudioEnabledChange={setAudioEnabled}
                onControlValuesChange={setControlValues}
              />
            )}

            {import.meta.env.DEV && (
              <div className="ie-panelSection" role="group" aria-label="Debug (development only)">
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

      <EvidenceDrawer
        open={evidenceOpen}
        docPath={evidenceDocPath}
        onNavigate={setEvidenceDocPath}
        onClose={() => setEvidenceOpen(false)}
      />
    </section>
  )
}
