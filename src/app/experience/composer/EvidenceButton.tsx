import type { EvidenceDocPath } from '../../../content/evidence'

export function EvidenceButton({
  doc,
  onOpen,
}: {
  doc?: string
  onOpen: (docPath: EvidenceDocPath) => void
}) {
  if (!doc) return null
  return (
    <button
      type="button"
      className="composer__evidenceBtn"
      onClick={() => onOpen(doc as EvidenceDocPath)}
      aria-label={`Open evidence doc ${doc}`}
      title={doc}
    >
      Evidence
    </button>
  )
}
