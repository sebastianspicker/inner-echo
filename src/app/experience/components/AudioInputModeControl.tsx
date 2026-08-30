import type { AudioInputMode } from '../../../runtime/audio'

const INPUT_MODES = ['synth', 'mic', 'mix'] as const

interface AudioInputModeControlProps {
  inputMode: AudioInputMode
  onInputModeChange: (mode: AudioInputMode) => void
}

function inputModeLabel(mode: AudioInputMode): string {
  if (mode === 'synth') return 'Synth only'
  if (mode === 'mic') return 'Mic only'
  return 'Mix'
}

export function AudioInputModeControl({
  inputMode,
  onInputModeChange,
}: AudioInputModeControlProps) {
  return (
    <div className="ie-controlInputMode" role="group" aria-label="Audio input">
      <span className="ie-controlLabel">Input</span>
      <div className="ie-controlOptions">
        {INPUT_MODES.map((mode) => (
          <label key={mode} className="ie-control ie-control--toggle">
            <input
              type="radio"
              name="audio-input-mode"
              checked={inputMode === mode}
              onChange={() => onInputModeChange(mode)}
              aria-label={inputModeLabel(mode)}
            />
            <span>{inputModeLabel(mode)}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
