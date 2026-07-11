import { getCameraStateLabel } from './cameraMessages'
import { getAudioStateLabel } from './audioStatusMessages'
import type { CameraState } from '../engine/video'
import type { AudioContextStatus } from '../engine/audio'
import type { EvidenceDocPath } from '../evidence/docs'

export interface CameraHeaderProps {
  cameraState: CameraState
  audioStatus: AudioContextStatus
  audioEnabled: boolean
  effectsLabel: string
  canStop: boolean
  onOpenEvidence: (docPath: EvidenceDocPath) => void
  onStop: () => void
}

export function CameraHeader({
  cameraState,
  audioStatus,
  audioEnabled,
  effectsLabel,
  canStop,
  onOpenEvidence,
  onStop,
}: CameraHeaderProps) {
  return (
    <header className="ie-header" role="banner">
      <div className="ie-brand" aria-label="Inner Echo">
        <div className="ie-title">Inner Echo</div>
        <div className="ie-subtitle">Reflective audiovisual metaphors, processed locally</div>
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
          <span className="ie-pill">
            <span className="ie-pillKey">Effects</span>
            <span className="ie-pillVal">{effectsLabel}</span>
          </span>
        </div>

        <div className="ie-actions">
          <button
            type="button"
            className="ie-btn"
            onClick={() => onOpenEvidence('docs/references/README.md')}
            aria-label="Open Method and Evidence"
          >
            Method &amp; Evidence
          </button>
          <button
            type="button"
            className="ie-btn ie-btn--danger"
            onClick={onStop}
            disabled={!canStop}
            aria-label="Stop camera, microphone, sound, and effects"
          >
            Stop Everything
          </button>
        </div>
      </div>
    </header>
  )
}
