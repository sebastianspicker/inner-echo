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
    // Keep raw error details out of the production console; the error name is enough to report.
    if (import.meta.env.DEV) {
      logger.error('ErrorBoundary caught:', error.message, errorInfo.componentStack)
    } else {
      logger.error('ErrorBoundary caught', error.name)
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
    pageRecovery.reload()
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        <div role="alert" className="ie-errorBoundary">
          <h2 className="ie-errorBoundaryTitle">Something unexpected happened</h2>
          <p className="ie-errorBoundaryBody">
            This is not your fault. The experience ran into an issue it could not recover from.
          </p>
          {import.meta.env.DEV ? (
            <p className="ie-errorBoundaryMessage">{this.state.error.message}</p>
          ) : null}
          <button type="button" onClick={this.handleReset} className="ie-errorBoundaryAction">
            Start fresh
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
