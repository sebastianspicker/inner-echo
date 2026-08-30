import type { AudioInputMode } from '../../../runtime/audio'
import { AudioInputModeControl } from './AudioInputModeControl'
import { LabeledSlider } from './controls/LabeledSlider'

interface MicrophoneActiveControlsProps {
  micSensitivity: number
  micGate: number
  inputMode: AudioInputMode
  onDisableMic: () => void
  onMicSensitivityChange: (value: number) => void
  onMicGateChange: (value: number) => void
  onInputModeChange: (mode: AudioInputMode) => void
}

export function MicrophoneActiveControls({
  micSensitivity,
  micGate,
  inputMode,
  onDisableMic,
  onMicSensitivityChange,
  onMicGateChange,
  onInputModeChange,
}: MicrophoneActiveControlsProps) {
  return (
    <>
      <button
        type="button"
        className="ie-btn"
        onClick={onDisableMic}
        aria-label="Disable microphone"
      >
        Disable microphone
      </button>
      <LabeledSlider
        label="Mic sensitivity"
        className="ie-control ie-control--range"
        min={0}
        max={1}
        step={0.01}
        value={micSensitivity}
        onChange={onMicSensitivityChange}
      />
      <LabeledSlider
        label="Noise gate"
        className="ie-control ie-control--range"
        min={0}
        max={1}
        step={0.01}
        value={micGate}
        onChange={onMicGateChange}
      />
      <AudioInputModeControl inputMode={inputMode} onInputModeChange={onInputModeChange} />
    </>
  )
}
