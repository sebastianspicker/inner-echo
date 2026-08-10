import { useEffect, useRef, useState } from 'react'
import { loadEvidenceDoc, type EvidenceDocPath } from '../../evidence/docs'
import { renderEvidenceMarkdown } from '../../evidence/markdown'
import { logger } from '../../utils/logger'
import { useAsyncEffect, type AsyncEffectContext } from './useAsyncEffect'

export type EvidenceDocumentState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; title: string; fragment: DocumentFragment }

async function loadEvidenceState(
  ctx: AsyncEffectContext,
  open: boolean,
  docPath: EvidenceDocPath,
  setState: (state: EvidenceDocumentState) => void,
): Promise<void> {
  if (!open) return
  setState({ status: 'loading' })
  try {
    const markdown = await loadEvidenceDoc(docPath)
    if (ctx.cancelled) return
    if (!markdown) {
      setState({ status: 'error', message: 'This evidence topic could not be found.' })
      return
    }
    const { fragment, title } = renderEvidenceMarkdown(markdown)
    setState({ status: 'ready', fragment, title })
  } catch (error) {
    if (ctx.cancelled) return
    logger.error('Failed to load evidence document', docPath, error)
    setState({ status: 'error', message: 'This evidence topic could not be loaded.' })
  }
}

export function useEvidenceDocument(open: boolean, docPath: EvidenceDocPath) {
  const [state, setState] = useState<EvidenceDocumentState>({ status: 'loading' })
  const [retryToken, setRetryToken] = useState(0)
  const contentRef = useRef<HTMLElement | null>(null)

  useAsyncEffect(
    (ctx) => loadEvidenceState(ctx, open, docPath, setState),
    [open, docPath, retryToken],
  )

  useEffect(() => {
    if (state.status !== 'ready') return
    contentRef.current?.replaceChildren(state.fragment.cloneNode(true))
  }, [state])

  return {
    state,
    contentRef,
    retry: () => setRetryToken((value) => value + 1),
  }
}
