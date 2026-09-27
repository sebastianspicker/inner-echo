import { lazy, Suspense } from 'react'

import { AudioMicControls } from '../media/AudioMicControls'
import { CameraHeader } from '../media/CameraHeader'
import { CameraStage } from '../media/CameraStage'
import { ComposerReport } from '../composer/ComposerReport'
import { DebugPanel } from '../debug/DebugPanel'
import { EffectControls } from '../media/EffectControls'
import { ExperienceComposerPanel } from '../composer/ExperienceComposerPanel'
import { ExperienceFraming } from '../composer/ExperienceFraming'
import { PlateCaption } from '../media/PlateCaption'
import { SafetyControls } from '../media/SafetyControls'
import type { ExperienceWorkspaceModel } from './useExperienceWorkspace'
import { DEBUG_UI_ENABLED, DEFAULT_PICKER_OPTIONS } from './presentation'

const EvidenceDrawer = lazy(() =>
  import('../evidence/EvidenceDrawer').then((module) => ({ default: module.EvidenceDrawer })),
)

type ModelProps = { model: ExperienceWorkspaceModel }

function WorkspaceHeader({ model }: ModelProps) {
  return (
    <CameraHeader
      cameraState={model.camera.cameraState}
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
  const { errorMessage, cameraState, overlayState } = model.camera
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
  return (
    <section className="ie-panelSection" aria-label="Condition and settings">
      {model.profileLoad.isProfileLoading && (
        <p className="ie-hint" role="status" aria-live="polite">
          Preparing your experience…
        </p>
      )}
      <ExperienceComposerPanel
        catalog={model.catalogLoad.catalog ?? DEFAULT_PICKER_OPTIONS}
        settings={model.settings}
        setComposerMode={model.setComposerMode}
        setConditionId={model.setConditionId}
        setPresets={model.setPresets}
        setDimensions={model.setDimensions}
        setCouplingStrength={model.setCouplingStrength}
        setMaxFeedback={model.setMaxFeedback}
        setInteractionAmount={model.setInteractionAmount}
        audioEnabled={model.audio.audioEnabled}
        onApplyPreset={model.onApplyPreset}
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
  const { settings } = model
  return (
    <SafetyControls
      intensity={settings.intensity}
      safeMode={settings.safeMode}
      reducedMotion={settings.reducedMotion}
      isRequesting={model.cameraController.isRequesting}
      isActive={model.cameraController.isActive}
      canStart
      canStop={model.cameraController.canStop}
      onIntensityChange={model.setIntensity}
      onSafeModeChange={model.setSafeMode}
      onReducedMotionChange={model.setReducedMotion}
      onStart={model.cameraController.start}
      onStop={model.cameraController.stop}
      variant={model.cameraController.isActive ? 'live' : 'setup'}
      showCameraActions={false}
    />
  )
}

function MediaControls({ model }: ModelProps) {
  const { audio, settings } = model
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
          intensity={settings.intensity}
          safeMode={settings.safeMode}
          stressMode={settings.stressMode}
          reducedMotion={settings.reducedMotion}
          audioEnabled={audio.audioEnabled}
          controlValues={model.profileLoad.controlValues}
          onIntensityChange={model.setIntensity}
          onSafeModeChange={model.setSafeMode}
          onStressModeChange={model.setStressMode}
          onReducedMotionChange={model.setReducedMotion}
          onAudioEnabledChange={audio.handleAudioEnabledChange}
          onControlValuesChange={model.profileLoad.setControlValues}
        />
      )}
    </>
  )
}

function WorkspaceDebugSection({ model }: ModelProps) {
  if (!DEBUG_UI_ENABLED) return null
  const { debugOverlay, setDebugOverlay } = model.ui
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
          lastError={model.camera.errorMessage ?? model.audio.audioError ?? model.audio.micError}
          getAudioMetrics={model.diagnostics.getAudioMetrics}
          getVideoMetrics={model.diagnostics.getVideoMetrics}
          getAudioDebugState={model.diagnostics.getAudioDebugState}
          getAppliedClamps={model.diagnostics.getAppliedClamps}
          couplingStrength={model.settings.couplingStrength}
          maxFeedback={model.settings.maxFeedback}
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

function WorkspacePreview({ model }: ModelProps) {
  const { cameraController } = model
  return (
    <section className="ie-previewSection" aria-labelledby="preview-title">
      <h2 id="preview-title" className="ie-sectionHead">
        <span className="ie-sectionNo" aria-hidden="true">
          3
        </span>
        Preview <span className="ie-previewOptional">(camera optional)</span>
      </h2>
      <figure className="ie-plate">
        <CameraStage
          containerRef={model.refs.containerRef}
          videoRef={model.refs.videoRef}
          webglCanvasRef={model.refs.canvasRef}
          fallbackCanvasRef={model.refs.fallbackCanvasRef}
          rmsDebugRef={model.refs.rmsDebugRef}
          isActive={cameraController.isActive}
          cameraState={model.camera.cameraState}
          audioStatus={model.audio.audioStatus}
          rendererMode={model.camera.overlayState.rendererMode}
          effectsActive={model.camera.overlayState.effectsActive}
          debugOverlay={model.ui.debugOverlay}
        />
        <PlateCaption
          selection={model.settings}
          catalog={model.catalogLoad.catalog ?? DEFAULT_PICKER_OPTIONS}
        />
      </figure>
      {!cameraController.isActive && (
        <div className="ie-previewStart">
          <button
            type="button"
            className="ie-btn ie-btn--accent"
            onClick={cameraController.start}
            disabled={cameraController.isRequesting}
            aria-busy={cameraController.isRequesting}
          >
            {cameraController.isRequesting ? 'Requesting camera…' : 'Start camera'}
          </button>
          <p className="ie-hint">Camera access does not enable sound or microphone.</p>
        </div>
      )}
    </section>
  )
}

function WorkspaceChoices({ model }: ModelProps) {
  return (
    <div className="ie-choiceColumn" id="experience-choices" tabIndex={-1}>
      <div className="ie-workspaceIntro">
        <h1>Choose what the mirror shows.</h1>
        <p>
          Pick experience dimensions or a curated collection and set your comfort limits. The camera
          starts only when you ask; sound is separate.
        </p>
        <nav className="ie-workspaceNav" aria-label="Workspace sections">
          <a href="#experience-choices">Pattern</a>
          <a href="#comfort-preview">Comfort &amp; preview</a>
        </nav>
      </div>
      <ExperienceFraming
        profile={model.profileLoad.profile}
        isLoading={model.profileLoad.isProfileLoading}
      />
      <h2 className="ie-sectionHead">
        <span className="ie-sectionNo" aria-hidden="true">
          1
        </span>
        Pattern
      </h2>
      <ComposerControls model={model} />
      <ComposerReport model={model} />
    </div>
  )
}

function WorkspacePanel({ model }: ModelProps) {
  return (
    <aside className="ie-panel" aria-label="Controls panel" id="comfort-preview" tabIndex={-1}>
      <WorkspaceComfort model={model} />
      <WorkspacePreview model={model} />
      <MediaControls model={model} />
      <WorkspaceDebugSection model={model} />
    </aside>
  )
}

/**
 * Setup reads choices first; live leads with the mirror. The order changes in the DOM, not just
 * visually, so focus order matches what is on screen. The children are keyed so React moves the
 * choice column and never remounts the panel that holds the video and canvases.
 */
function WorkspaceLayout({ model }: ModelProps) {
  const live = model.cameraController.isActive
  const choices = <WorkspaceChoices key="choices" model={model} />
  const panel = <WorkspacePanel key="panel" model={model} />
  return (
    <section
      className={`ie-layout ie-layout--${live ? 'live' : 'setup'}`}
      aria-label="Experience workspace"
    >
      {live ? [panel, choices] : [choices, panel]}
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
  if (!model.ui.evidenceOpen) return null
  return (
    <Suspense
      fallback={
        <p className="ie-callout" role="status">
          Loading evidence…
        </p>
      }
    >
      <EvidenceDrawer
        open={model.ui.evidenceOpen}
        docPath={model.ui.evidenceDocPath}
        onNavigate={model.ui.setEvidenceDocPath}
        onClose={() => model.ui.setEvidenceOpen(false)}
        safeMode={model.settings.safeMode}
        reducedMotion={model.settings.reducedMotion}
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
        Camera {model.camera.cameraState}. Effects {model.presentation.effectsLabel}. Sound{' '}
        {model.audio.audioStatus}.
      </div>
      <main className="ie-main">
        <AcknowledgedWorkspace model={model} />
      </main>
      <EvidenceLayer model={model} />
    </section>
  )
}
