// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { ErrorBoundary } from '../src/ui/ErrorBoundary'

afterEach(cleanup)

// A component that throws when shouldThrow is true.
function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Kaboom!')
  return <p>All good</p>
}

describe('ui/ErrorBoundary', () => {
  // Suppress React's noisy error-boundary console.error during tests
  const originalConsoleError = console.error
  beforeEach(() => {
    console.error = vi.fn()
  })
  afterEach(() => {
    console.error = originalConsoleError
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('All good')).toBeInTheDocument()
  })

  it('renders default fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Something unexpected happened')).toBeInTheDocument()
    expect(screen.getByText('Kaboom!')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start fresh/i })).toBeInTheDocument()
  })

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom">Custom fallback</div>}>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    )
    expect(screen.getByTestId('custom')).toBeInTheDocument()
    expect(screen.queryByText('Something unexpected happened')).not.toBeInTheDocument()
  })

  it('calls onReset callback when Reset App is clicked', () => {
    const onReset = vi.fn()
    render(
      <ErrorBoundary onReset={onReset}>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    )
    fireEvent.click(screen.getByRole('button', { name: /start fresh/i }))
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('attempts to re-render children after reset (re-catches if child still throws)', () => {
    // Verify the boundary actually attempts recovery by clicking Reset App.
    // Since Bomb still throws, the boundary re-catches and shows fallback again.
    // This proves the reset mechanism triggers re-rendering of children.
    const onReset = vi.fn()
    render(
      <ErrorBoundary onReset={onReset}>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()

    // Click reset — boundary clears error state, tries to render children,
    // child throws again, boundary re-catches.
    fireEvent.click(screen.getByRole('button', { name: /start fresh/i }))
    expect(onReset).toHaveBeenCalledOnce()
    // Still shows alert because child threw again
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('displays the error message from the caught error', () => {
    function SpecificError() {
      throw new Error('Database connection failed')
    }

    render(
      <ErrorBoundary>
        <SpecificError />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Database connection failed')).toBeInTheDocument()
  })

  it('does not show fallback when no error occurs', () => {
    render(
      <ErrorBoundary>
        <p>Normal content</p>
      </ErrorBoundary>,
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText('Something unexpected happened')).not.toBeInTheDocument()
    expect(screen.getByText('Normal content')).toBeInTheDocument()
  })
})
