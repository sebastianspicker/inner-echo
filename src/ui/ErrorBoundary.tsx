/**
 * Phase 12: React error boundary. Catches UI crashes and shows a "Reset App" button.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'

export interface ErrorBoundaryProps {
  children: ReactNode
  /** Optional fallback; default shows message + Reset App button. */
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log without sensitive data (no stack in prod if desired; stack is not user data here)
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('[inner-echo] ErrorBoundary caught:', error.message, errorInfo.componentStack)
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div
          role="alert"
          style={{
            padding: '2rem',
            maxWidth: '32rem',
            margin: '2rem auto',
            textAlign: 'center',
            background: '#fef2f2',
            borderRadius: '0.5rem',
            border: '1px solid #fecaca',
          }}
        >
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: '#991b1b' }}>
            Something went wrong
          </h2>
          <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: '#b91c1c' }}>
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '1rem',
              cursor: 'pointer',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
            }}
          >
            Reset App
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
