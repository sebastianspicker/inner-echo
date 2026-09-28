// The design system loads first so feature stylesheets can refine it.
import './index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from './app/ErrorBoundary'
import App from './app/App'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element "#root" was not found.')
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
