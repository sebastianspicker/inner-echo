import type { AudioContextStatus } from '../../../runtime/audio'
import type { CameraState } from '../../../runtime/camera'

interface RuntimeRailProps {
  cameraState: CameraState
  audioStatus: AudioContextStatus
  effectsActive: boolean
}

function ActivityTrace({ active }: { active: boolean }) {
  return (
    <span className={`runtime-rail__trace${active ? ' is-active' : ''}`}>
      {Array.from({ length: 11 }, (_, index) => (
        <i key={index} />
      ))}
    </span>
  )
}

export function RuntimeRail({ cameraState, audioStatus, effectsActive }: RuntimeRailProps) {
  return (
    <aside className="runtime-rail" aria-hidden="true">
      <div>
        <span>Camera</span>
        <ActivityTrace active={cameraState === 'active'} />
      </div>
      <div>
        <span>Audio</span>
        <ActivityTrace active={audioStatus === 'on'} />
      </div>
      <div>
        <span>Effects</span>
        <ActivityTrace active={effectsActive} />
      </div>
    </aside>
  )
}
