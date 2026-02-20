import { getCameraStateLabel } from './cameraMessages'
import type { CameraState } from '../engine/video'
import type { AudioContextStatus } from '../engine/audio'
import type { EvidenceDocPath } from '../evidence/docs'

export interface CameraHeaderProps {
    cameraState: CameraState
    audioStatus: AudioContextStatus
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
                        className="ie-btn"
                        onClick={onStart}
                        disabled={!onboardingAccepted || isRequesting || isActive}
                        aria-busy={isRequesting}
                        aria-describedby={!onboardingAccepted ? 'onboarding-required-desc' : undefined}
                    >
                        {isRequesting ? 'Requesting…' : 'Start camera'}
                    </button>
                    <button
                        type="button"
                        className="ie-btn ie-btn--danger"
                        onClick={onStop}
                        disabled={!canStop}
                        aria-label="Stop Everything — stop camera, audio, microphone, and all effects"
                    >
                        Stop Everything
                    </button>
                </div>
            </div>
        </header>
    )
}
