// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { LabeledSlider } from '../src/ui/controls/LabeledSlider'
import { ToggleField } from '../src/ui/controls/ToggleField'

afterEach(cleanup)

describe('ui composer controls', () => {
  it('renders slider defaults and forwards numeric changes', () => {
    const onChange = vi.fn()
    render(<LabeledSlider label="Intensity" value={0.42} min={0} max={1} onChange={onChange} />)

    expect(screen.getByText('42%')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('slider', { name: /intensity/i }), {
      target: { value: '0.9' },
    })

    expect(onChange).toHaveBeenCalledWith(0.9)
  })

  it('supports custom formatting and aria value text', () => {
    const onChange = vi.fn()
    render(
      <LabeledSlider
        label="Feedback"
        value={12}
        min={0}
        max={20}
        formatValue={(value) => `${value} dB`}
        ariaValueText={(value) => `feedback ${value}`}
        onChange={onChange}
      />,
    )

    const slider = screen.getByRole('slider', { name: /feedback/i })
    expect(slider).toHaveAttribute('aria-valuetext', 'feedback 12')
    expect(screen.getByText('12 dB')).toBeInTheDocument()

    fireEvent.change(slider, { target: { value: '18' } })
    expect(onChange).toHaveBeenCalledWith(18)
  })

  it('forwards checkbox state and respects disabled toggles', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <ToggleField label="Audio" checked={false} name="audio" onChange={onChange} />,
    )

    fireEvent.click(screen.getByRole('checkbox', { name: /audio/i }))
    expect(onChange).toHaveBeenCalledWith(true)

    rerender(<ToggleField label="Microphone" checked={false} disabled onChange={vi.fn()} />)

    expect(screen.getByRole('checkbox', { name: /microphone/i })).toBeDisabled()
  })
})
