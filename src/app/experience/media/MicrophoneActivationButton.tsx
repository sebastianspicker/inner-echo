interface MicrophoneActivationButtonProps {
  canEnable: boolean
  onEnableMic: () => void
}

export function MicrophoneActivationButton({
  canEnable,
  onEnableMic,
}: MicrophoneActivationButtonProps) {
  if (!canEnable) return null

  return (
    <button
      type="button"
      className="ie-btn ie-btn--accent"
      onClick={onEnableMic}
      aria-label="Enable microphone (optional)"
    >
      Enable microphone (optional)
    </button>
  )
}
