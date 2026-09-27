import type { AudioContextStatus } from '../../../runtime/audio'
import type { CameraState } from '../../../runtime/camera'

interface RuntimeRailProps {
  cameraState: CameraState
  audioStatus: AudioContextStatus
  effectsActive: boolean
}

const TRACE_SEGMENTS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']

function ActivityTrace({ active }: { active: boolean }) {
  return (
    <span className={`runtime-rail__trace${active ? ' is-active' : ''}`}>
      {TRACE_SEGMENTS.map((segment) => (
        <i key={segment} />
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
