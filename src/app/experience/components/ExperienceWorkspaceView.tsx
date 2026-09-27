import { lazy, Suspense } from 'react'

import { AudioMicControls } from './AudioMicControls'
import { CameraHeader } from './CameraHeader'
import { CameraStage } from './CameraStage'
import { ComposerReport } from './ComposerReport'
import { DebugPanel } from './DebugPanel'
import { EffectControls } from './EffectControls'
import { ExperienceComposerPanel } from './ExperienceComposerPanel'
import { ExperienceFraming } from './ExperienceFraming'
import { SafetyControls } from './SafetyControls'
import type { ExperienceWorkspaceModel } from '../hooks/useExperienceWorkspaceModel'
import { DEBUG_UI_ENABLED, DEFAULT_PICKER_OPTIONS } from '../workspacePresentation'

const EvidenceDrawer = lazy(() =>
  import('../evidence/EvidenceDrawer').then((module) => ({ default: module.EvidenceDrawer })),
)

type ModelProps = { model: ExperienceWorkspaceModel }

function WorkspaceHeader({ model }: ModelProps) {
  return (
    <CameraHeader
      cameraState={model.state.camera.cameraState}
      audioStatus={model.audio.audioStatus}
      audioEnabled={model.audio.audioEnabled}
      effectsLabel={model.presentation.effectsLabel}
      canStop={model.cameraController.canStop}
      onOpenEvidence={model.openEvidence}
      onStop={model.cameraController.stop}
    />
  )
}

function WorkspaceNotices({ model }: ModelProps) {
  const { errorMessage, cameraState, overlayState } = model.state.camera
  const { profileLoadStatus, profileLoadError, retryProfileLoad } = model.profileLoad
  return (
    <>
      {errorMessage && (
        <div className="ie-callout ie-callout--error" role="alert" aria-label="Camera notice">
          <div className="ie-calloutTitle">Camera problem</div>
          <div className="ie-calloutBody">{errorMessage}</div>
        </div>
      )}
      {model.catalogLoad.status === 'error' && (
        <div className="ie-callout ie-callout--error" role="alert">
          <div className="ie-calloutTitle">Setup unavailable</div>
          <div className="ie-calloutBody">
            {model.catalogLoad.error} A limited fallback list is available.{' '}
            <button type="button" className="ie-inlineAction" onClick={model.catalogLoad.retry}>
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
              Showing the unmodified camera preview. Comfort and Stop controls remain available.
            </div>
          </div>
        )}
      {model.presentation.warnings.length > 0 && (
        <details className="ie-callout ie-callout--warn ie-callout--safety">
          <summary className="ie-summary">Comfort notes</summary>
          <ul className="ie-calloutList">
            {model.presentation.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </details>
      )}
    </>
  )
}

function ComposerControls({ model }: ModelProps) {
  const { composition, safety, coupling } = model.state
  return (
    <section className="ie-panelSection" aria-label="Condition and settings">
      {model.profileLoad.isProfileLoading && (
        <p className="ie-hint" role="status" aria-live="polite">
          Preparing your experience…
        </p>
      )}
      <ExperienceComposerPanel
        catalog={model.catalogLoad.catalog ?? DEFAULT_PICKER_OPTIONS}
        mode={composition.composerMode}
        onModeChange={composition.setComposerMode}
        conditionId={composition.conditionId}
        onConditionIdChange={composition.setConditionId}
        presets={composition.selectedPresets}
        onPresetsChange={composition.setSelectedPresets}
        dimensions={composition.selectedDimensions}
        onDimensionsChange={composition.setSelectedDimensions}
        intensity={safety.intensity}
        onIntensityChange={safety.setIntensity}
        safeMode={safety.safeMode}
        onSafeModeChange={safety.setSafeMode}
        reducedMotion={safety.reducedMotion}
        onReducedMotionChange={safety.setReducedMotion}
        audioEnabled={model.audio.audioEnabled}
        onAudioEnabledChange={model.audio.handleAudioEnabledChange}
        couplingStrength={coupling.couplingStrength}
        onCouplingStrengthChange={coupling.setCouplingStrength}
        maxFeedback={coupling.maxFeedback}
        onMaxFeedbackChange={coupling.setMaxFeedback}
        interactionAmount={coupling.interactionAmount}
        onInteractionAmountChange={coupling.setInteractionAmount}
        onOpenEvidence={model.openEvidence}
        variant={model.cameraController.isActive ? 'compact' : 'setup'}
        cameraRequesting={model.cameraController.isRequesting}
      />
      {!model.presentation.profileDefinesReducedMotionControl &&
        model.presentation.showReducedMotionHint && (
          <p className="ie-hint" role="status">
            Reduced Motion is on. Motion-heavy and temporal effects are disabled.
          </p>
        )}
    </section>
  )
}

function WorkspaceComfort({ model }: ModelProps) {
  const { safety } = model.state
  return (
    <SafetyControls
      intensity={safety.intensity}
      safeMode={safety.safeMode}
      reducedMotion={safety.reducedMotion}
      isRequesting={model.cameraController.isRequesting}
      isActive={model.cameraController.isActive}
      canStart
      canStop={model.cameraController.canStop}
      onIntensityChange={safety.setIntensity}
      onSafeModeChange={safety.setSafeMode}
      onReducedMotionChange={safety.setReducedMotion}
      onStart={model.cameraController.start}
      onStop={model.cameraController.stop}
      variant={model.cameraController.isActive ? 'live' : 'setup'}
      showCameraActions={false}
    />
  )
}

function MediaControls({ model }: ModelProps) {
  const { audio } = model
  return (
    <>
      <AudioMicControls
        audioStatus={audio.audioStatus}
        audioEnabled={audio.audioEnabled}
        audioError={audio.audioError}
        masterVolume={audio.masterVolume}
        micStatus={audio.micStatus}
        micError={audio.micError}
        micSensitivity={audio.micSensitivity}
        micGate={audio.micGate}
        inputMode={audio.inputMode}
        onEnableAudio={audio.handleEnableAudio}
        onDisableAudio={audio.handleDisableAudio}
        onEnableMic={audio.handleEnableMic}
        onDisableMic={audio.handleDisableMic}
        onMasterVolumeChange={audio.handleMasterVolumeChange}
        onMicSensitivityChange={audio.handleMicSensitivityChange}
        onMicGateChange={audio.handleMicGateChange}
        onInputModeChange={audio.handleInputModeChange}
        defaultOpen={model.cameraController.isActive}
      />
      {model.cameraController.isActive && (
        <EffectControls
          profile={model.profileLoad.profile}
          intensity={model.state.safety.intensity}
          safeMode={model.state.safety.safeMode}
          stressMode={model.state.safety.stressMode}
          reducedMotion={model.state.safety.reducedMotion}
          audioEnabled={audio.audioEnabled}
          controlValues={model.profileLoad.controlValues}
          onIntensityChange={model.state.safety.setIntensity}
          onSafeModeChange={model.state.safety.setSafeMode}
          onStressModeChange={model.state.safety.setStressMode}
          onReducedMotionChange={model.state.safety.setReducedMotion}
          onAudioEnabledChange={audio.handleAudioEnabledChange}
          onControlValuesChange={model.profileLoad.setControlValues}
        />
      )}
    </>
  )
}

function WorkspaceDebugSection({ model }: ModelProps) {
  if (!DEBUG_UI_ENABLED) return null
  const { debugOverlay, setDebugOverlay } = model.state.ui
  return (
    <fieldset className="ie-panelSection">
      <legend className="sr-only">Debug (development only)</legend>
      <label className="ie-toggle">
        <input
          type="checkbox"
          aria-label="Debug overlay (dev)"
          checked={debugOverlay}
          onChange={(event) => setDebugOverlay(event.target.checked)}
        />
        <span>Debug overlay (dev)</span>
      </label>
      {debugOverlay && (
        <DebugPanel
          getOverlayDiagnostics={model.diagnostics.getOverlayDiagnostics}
          audioStatus={model.audio.audioStatus}
          micStatus={model.audio.micStatus}
          lastError={
            model.state.camera.errorMessage ?? model.audio.audioError ?? model.audio.micError
          }
          getAudioMetrics={() => model.audio.audioEngineControlRef.current?.getMetrics?.()}
          getVideoMetrics={() => model.refs.videoMetricsRef.current ?? undefined}
          getAudioDebugState={model.diagnostics.getAudioDebugState}
          getAppliedClamps={model.diagnostics.getAppliedClamps}
          couplingStrength={model.state.coupling.couplingStrength}
          maxFeedback={model.state.coupling.maxFeedback}
          micSensitivity={model.audio.micSensitivity}
          micGate={model.audio.micGate}
        />
      )}
      {debugOverlay && model.presentation.activeVideoNodeIds.length > 0 && (
        <p className="ie-hint" role="status">
          Active video nodes: {model.presentation.activeVideoNodeIds.join(', ')}
        </p>
      )}
    </fieldset>
  )
}

function WorkspaceLayout({ model }: ModelProps) {
  return (
    <section
      className={`ie-layout ie-layout--${model.cameraController.isActive ? 'live' : 'setup'}`}
      aria-label="Experience workspace"
    >
      <div className="ie-choiceColumn" id="experience-choices" tabIndex={-1}>
        <div className="ie-workspaceIntro">
          <h1>Shape your experience.</h1>
          <p>Choose patterns, adjust for comfort, then explore with optional camera and sound.</p>
          <nav className="ie-workspaceNav" aria-label="Workspace sections">
            <a href="#experience-choices">Choose</a>
            <a href="#comfort-preview">Comfort &amp; preview</a>
          </nav>
        </div>
        <ExperienceFraming
          profile={model.profileLoad.profile}
          isLoading={model.profileLoad.isProfileLoading}
        />
        <ComposerControls model={model} />
        <ComposerReport model={model} />
      </div>
      <aside className="ie-panel" aria-label="Controls panel" id="comfort-preview" tabIndex={-1}>
        <WorkspaceComfort model={model} />
        <section className="ie-previewSection" aria-labelledby="preview-title">
          <h2 id="preview-title">
            Preview <span className="ie-previewOptional">(camera optional)</span>
          </h2>
          <CameraStage
            containerRef={model.refs.containerRef}
            videoRef={model.refs.videoRef}
            webglCanvasRef={model.refs.canvasRef}
            fallbackCanvasRef={model.refs.fallbackCanvasRef}
            rmsDebugRef={model.refs.rmsDebugRef}
            isActive={model.cameraController.isActive}
            cameraState={model.state.camera.cameraState}
            audioStatus={model.audio.audioStatus}
            rendererMode={model.state.camera.overlayState.rendererMode}
            effectsActive={model.state.camera.overlayState.effectsActive}
            debugOverlay={model.state.ui.debugOverlay}
          />
          {!model.cameraController.isActive && (
            <button
              type="button"
              className="ie-btn ie-btn--accent"
              onClick={model.cameraController.start}
              disabled={model.cameraController.isRequesting}
              aria-busy={model.cameraController.isRequesting}
            >
              {model.cameraController.isRequesting ? 'Requesting camera…' : 'Start camera'}
            </button>
          )}
          <p className="ie-hint">Camera access does not enable sound or microphone.</p>
        </section>
        <MediaControls model={model} />
        <WorkspaceDebugSection model={model} />
      </aside>
    </section>
  )
}

function AcknowledgedWorkspace({ model }: ModelProps) {
  return (
    <>
      <WorkspaceNotices model={model} />
      <WorkspaceLayout model={model} />
    </>
  )
}

function EvidenceLayer({ model }: ModelProps) {
  if (!model.state.ui.evidenceOpen) return null
  return (
    <Suspense
      fallback={
        <p className="ie-callout" role="status">
          Loading evidence…
        </p>
      }
    >
      <EvidenceDrawer
        open={model.state.ui.evidenceOpen}
        docPath={model.state.ui.evidenceDocPath}
        onNavigate={model.state.ui.setEvidenceDocPath}
        onClose={() => model.state.ui.setEvidenceOpen(false)}
        safeMode={model.state.safety.safeMode}
        reducedMotion={model.state.safety.reducedMotion}
        mediaActive={model.cameraController.canStop}
      />
    </Suspense>
  )
}

export function ExperienceWorkspaceView({ model }: ModelProps) {
  return (
    <section className="ie-shell" aria-label="Inner Echo">
      <WorkspaceHeader model={model} />
      <div className="ie-liveRegion" role="status" aria-live="polite" aria-atomic="true">
        Camera {model.state.camera.cameraState}. Effects {model.presentation.effectsLabel}. Sound{' '}
        {model.audio.audioStatus}.
      </div>
      <main className="ie-main">
        <AcknowledgedWorkspace model={model} />
      </main>
      <EvidenceLayer model={model} />
    </section>
  )
}
