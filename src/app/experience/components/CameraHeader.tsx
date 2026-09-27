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
  canStop,
  onOpenEvidence,
  onStop,
}: CameraHeaderProps) {
  return (
    <header className="ie-header">
      <div className="ie-brand">
        <img className="ie-brandMark" src={brandMarkUrl} alt="" aria-hidden="true" />
        <div className="ie-brandCopy">
          <div className="ie-title">Inner Echo</div>
          <div className="ie-subtitle">Processed locally</div>
        </div>
      </div>

      <div className="ie-headerRight">
        {canStop && (
          <div className="ie-headerStatus">
            Camera {getCameraStateLabel(cameraState).toLowerCase()} · Sound{' '}
            {getAudioStateLabel(audioStatus, audioEnabled).toLowerCase()}
          </div>
        )}

        <div className="ie-actions">
          <button
            type="button"
            className="ie-btn"
            onClick={() => onOpenEvidence('docs/references/README.md')}
            aria-label="Open Method and Evidence"
          >
            Evidence
          </button>
          {canStop && (
            <button
              type="button"
              className="ie-btn ie-btn--danger"
              onClick={onStop}
              aria-label="Stop Everything"
            >
              <span className="ie-stopIcon" aria-hidden="true" />
              Stop Everything
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
