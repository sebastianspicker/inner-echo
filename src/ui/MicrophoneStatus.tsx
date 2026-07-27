import type { MicStatus } from '../engine/audio'

interface MicrophoneStatusProps {
  status: MicStatus
  error: string | null
}

function microphoneStatusLabel(status: MicStatus): string {
  if (status === 'requesting') return 'requesting…'
  return status
}

export function MicrophoneStatus({ status, error }: MicrophoneStatusProps) {
  return (
    <>
      <div className="ie-controlStatus" role="status" aria-live="polite">
        Mic: {microphoneStatusLabel(status)}
      </div>
      {error && (
        <p className="ie-inlineError" role="alert">
          {error}
        </p>
      )}
    </>
  )
}
