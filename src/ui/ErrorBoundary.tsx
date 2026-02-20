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
      // eslint-disable-next-line no-console
      console.error('[inner-echo] ErrorBoundary caught:', error.message, errorInfo.componentStack)
    }
  }

  /**
   * Resets the error state, allowing the application to attempt to re-render 
   * the component tree from scratch. 
   */
  handleReset = (): void => {
    if (this.props.onReset) {
      this.props.onReset()
    }
    // Clearing the error state forces the boundary to render `this.props.children` again.
    this.setState({ hasError: false, error: null })
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
