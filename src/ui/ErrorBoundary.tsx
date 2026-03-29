/**
 * ErrorBoundary Component
 *
 * In React, standard try/catch blocks don't work for catching errors inside component rendering,
 * lifecycle methods, or child component constructors. Instead, React uses "Error Boundaries".
 *
 * An Error Boundary is a special class component that catches JavaScript errors anywhere in its
 * child component tree, logs those errors, and displays a fallback UI instead of crashing the
 * whole application.
 *
 * This component wraps the main application to ensure that if a fatal UI error occurs,
 * the user gets a friendly "Reset App" button rather than a blank white screen.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { logger } from '../utils/logger'

export interface ErrorBoundaryProps {
  children: ReactNode
  /** Optional fallback; default shows message + Reset App button. */
  fallback?: ReactNode
  /** Optional reset handler to clear parent state or perform side effects before error state clears. */
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Initial state: no errors.
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  }

  /**
   * Called automatically by React when a child component throws an error.
   * We return the new state object here so the next render shows the fallback UI.
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  /**
   * Called automatically by React after an error has been thrown.
   * This is the ideal place to log the error to a reporting service.
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // We only log the error stack to the console in development mode.
    // In production, we avoid exposing raw stack traces to the user.
    if (import.meta.env.DEV) {
      logger.error('[inner-echo] ErrorBoundary caught:', error.message, errorInfo.componentStack)
    }
  }

  /**
   * Clean up resources when the boundary unmounts while in an error state.
   * Without this, resources (audio contexts, streams, etc.) may leak if the
   * boundary is removed from the tree without the user clicking "Reset".
   */
  componentWillUnmount(): void {
    if (this.state.hasError && this.props.onReset) {
      this.props.onReset()
    }
  }

  /**
   * Resets the error state, allowing the application to attempt to re-render
   * the component tree from scratch.
   */
  handleReset = (): void => {
    // Clear error state first so the boundary recovers even if onReset throws.
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render(): ReactNode {
    // If an error occurred, render the fallback UI instead of the broken children.
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div
          role="alert"
          style={{
            padding: '2rem',
            maxWidth: '28rem',
            margin: '3rem auto',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '18px',
            border: '1px solid rgba(255, 255, 255, 0.09)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          <h2
            style={{
              margin: '0 0 0.75rem',
              fontSize: '14px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase' as const,
              color: 'rgba(255, 255, 255, 0.86)',
              fontWeight: 650,
            }}
          >
            Something unexpected happened
          </h2>
          <p
            style={{
              margin: '0 0 0.5rem',
              fontSize: '13px',
              lineHeight: '1.6',
              color: 'rgba(255, 255, 255, 0.58)',
            }}
          >
            This is not your fault. The experience ran into an issue it could not recover from.
          </p>
          <p
            style={{
              margin: '0 0 1.25rem',
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.38)',
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 520,
              cursor: 'pointer',
              backgroundColor: 'rgba(123, 200, 192, 0.10)',
              color: 'rgba(255, 255, 255, 0.86)',
              border: '1px solid rgba(123, 200, 192, 0.25)',
              borderRadius: '999px',
            }}
          >
            Start fresh
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
