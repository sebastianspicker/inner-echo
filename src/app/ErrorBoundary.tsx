import { Component, type ErrorInfo, type ReactNode } from 'react'
import { logger } from '../platform/logger'
import './ErrorBoundary.css'

export const pageRecovery = {
  reload(): void {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  },
}

export interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
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
    // Keep raw error details out of the production console.
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

  handleReset = (): void => {
    // Clear error state first so the boundary recovers even if onReset throws.
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
      return
    }
    pageRecovery.reload()
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div role="alert" className="ie-errorBoundary">
          <h2 className="ie-errorBoundaryTitle">Something unexpected happened</h2>
          <p className="ie-errorBoundaryBody">
            This is not your fault. The experience ran into an issue it could not recover from.
          </p>
          <p className="ie-errorBoundaryMessage">{this.state.error.message}</p>
          <button type="button" onClick={this.handleReset} className="ie-errorBoundaryAction">
            Start fresh
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
