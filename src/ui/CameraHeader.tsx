import { getCameraStateLabel } from './cameraMessages'
import { getAudioStateLabel } from './audioStatusMessages'
import type { CameraState } from '../engine/video'
import type { AudioContextStatus } from '../engine/audio'
import type { EvidenceDocPath } from '../evidence/docs'

export interface CameraHeaderProps {
  cameraState: CameraState
  audioStatus: AudioContextStatus
  audioEnabled: boolean
  isRequesting: boolean
  isActive: boolean
  canStop: boolean
  onboardingAccepted: boolean
  onOpenEvidence: (docPath: EvidenceDocPath) => void
  onStart: () => void
  onStop: () => void
}

export function CameraHeader({
  cameraState,
  audioStatus,
  audioEnabled,
  isRequesting,
  isActive,
  canStop,
  onboardingAccepted,
  onOpenEvidence,
  onStart,
  onStop,
}: CameraHeaderProps) {
  return (
    <header className="ie-header" role="banner">
      <div className="ie-brand" aria-label="Inner Echo">
        <div className="ie-title">Inner Echo</div>
        <div className="ie-subtitle">A private, calming space for reflection</div>
        <div
          className="ie-subtitle ie-subtitle--shortcuts keyboard-hint"
          aria-label="Keyboard shortcuts"
        >
          K start/stop · E evidence
        </div>
      </div>

      <div className="ie-headerRight">
        <div className="ie-statusRow" role="status" aria-live="polite" aria-label="Runtime status">
          <span className="ie-pill">
            <span className="ie-pillKey">Camera</span>
            <span className="ie-pillVal">{getCameraStateLabel(cameraState)}</span>
          </span>
          <span className="ie-pill">
            <span className="ie-pillKey">Audio</span>
            <span className="ie-pillVal">{getAudioStateLabel(audioStatus, audioEnabled)}</span>
          </span>
          <button
            type="button"
            className="ie-btn"
            onClick={() => onOpenEvidence('docs/references/README.md')}
            aria-label="Open Evidence & Method"
            title="Evidence & Method"
          >
            Evidence
          </button>
        </div>

        <div className="ie-actions">
          <button
            type="button"
            className="ie-btn ie-btn--accent"
            onClick={onStart}
            disabled={!onboardingAccepted || isRequesting || isActive}
            aria-busy={isRequesting}
            aria-label={isRequesting ? 'Requesting camera access' : 'Start camera'}
            aria-describedby={!onboardingAccepted ? 'onboarding-required-desc' : undefined}
          >
            {isRequesting ? 'Preparing\u2026' : 'Begin'}
          </button>
          <button
            type="button"
            className="ie-btn ie-btn--danger"
            onClick={onStop}
            disabled={!canStop}
            aria-label="Gently stop everything — camera, audio, and all effects"
          >
            Stop Everything
          </button>
        </div>
      </div>
    </header>
  )
}
