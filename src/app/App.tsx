import { lazy, Suspense, useState } from 'react'
import { WelcomeEntry } from './welcome/WelcomeEntry'
import { getWelcomeAcknowledged } from './welcome/WelcomeStep'
import './experience/workspace/ExperienceWorkspace.css'

const ExperienceWorkspace = lazy(() =>
  import('./experience/ExperienceWorkspace').then((module) => ({
    default: module.ExperienceWorkspace,
  })),
)

function WorkspaceLoading() {
  return (
    <main className="welcome-step" aria-busy="true">
      <p className="welcome-step__note" role="status" aria-live="polite">
        Loading setup…
      </p>
    </main>
  )
}

function App() {
  const [welcomeAcknowledged, setWelcomeAcknowledged] = useState(getWelcomeAcknowledged)

  return (
    <div className="ie-app">
      {welcomeAcknowledged ? (
        <Suspense fallback={<WorkspaceLoading />}>
          <ExperienceWorkspace />
        </Suspense>
      ) : (
        <WelcomeEntry onContinue={() => setWelcomeAcknowledged(true)} />
      )}
    </div>
  )
}

export default App
