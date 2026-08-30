import { getCameraStateLabel } from '../session/cameraMessages'
import { getAudioStateLabel } from '../session/audioStatusMessages'
import type { CameraState } from '../../../runtime/camera'
import type { AudioContextStatus } from '../../../runtime/audio'
import type { EvidenceDocPath } from '../../../content/evidence'
import brandMarkUrl from '../../../../assets/brand/inner-echo-mark.svg'

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
        <img className="ie-brandMark" src={brandMarkUrl} alt="" aria-hidden="true" />
        <div className="ie-brandCopy">
          <div className="ie-title">Inner Echo</div>
          <div className="ie-subtitle">Processed locally</div>
        </div>
      </div>

      <div className="ie-headerRight">
        <div className="ie-statusRow" role="status" aria-live="polite" aria-label="Runtime status">
          <span className="ie-pill">
            <span className="ie-pillKey">Camera</span>
            <span className={`ie-pillVal${cameraState === 'active' ? ' is-active' : ''}`}>
              {getCameraStateLabel(cameraState)}
            </span>
          </span>
          <span className="ie-pill">
            <span className="ie-pillKey">Audio</span>
            <span className={`ie-pillVal${audioStatus === 'on' ? ' is-active' : ''}`}>
              {getAudioStateLabel(audioStatus, audioEnabled)}
            </span>
          </span>
          <span className="ie-pill">
            <span className="ie-pillKey">Effects</span>
            <span className={`ie-pillVal${effectsLabel === 'Active' ? ' is-active' : ''}`}>
              {effectsLabel}
            </span>
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
            aria-label="Stop Everything: stop camera, microphone, sound, and effects"
          >
            <span className="ie-stopIcon" aria-hidden="true" />
            Stop Everything
          </button>
        </div>
      </div>
    </header>
  )
}
