import { lazy, Suspense, useCallback, useState } from 'react'

import type { EvidenceDocPath } from '../../content/evidence'
import { WelcomeStep } from './WelcomeStep'

const EvidenceDrawer = lazy(() =>
  import('../experience/evidence/EvidenceDrawer').then((module) => ({
    default: module.EvidenceDrawer,
  })),
)

export interface WelcomeEntryProps {
  onContinue: () => void
}

function EvidenceLoading() {
  return (
    <p className="welcome-step__note" role="status" aria-live="polite">
      Loading evidence…
    </p>
  )
}

export function WelcomeEntry({ onContinue }: WelcomeEntryProps) {
  const [evidenceDocPath, setEvidenceDocPath] = useState<EvidenceDocPath>(
    'docs/references/README.md',
  )
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const openEvidence = useCallback((docPath: EvidenceDocPath) => {
    setEvidenceDocPath(docPath)
    setEvidenceOpen(true)
  }, [])

  return (
    <>
      <WelcomeStep onContinue={onContinue} onOpenEvidence={openEvidence} />
      {evidenceOpen && (
        <Suspense fallback={<EvidenceLoading />}>
          <EvidenceDrawer
            open
            docPath={evidenceDocPath}
            onNavigate={setEvidenceDocPath}
            onClose={() => setEvidenceOpen(false)}
          />
        </Suspense>
      )}
    </>
  )
}
