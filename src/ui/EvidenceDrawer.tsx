import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { listEvidenceDocPaths, loadEvidenceDoc, type EvidenceDocPath } from '../evidence/docs'
import { renderEvidenceMarkdown } from '../evidence/markdown'
import { useAsyncEffect } from './hooks/useAsyncEffect'
import { resolveEvidenceHref } from './evidenceHref'
import { logger } from '../utils/logger'
import './EvidenceDrawer.css'

export interface EvidenceDrawerProps {
  open: boolean
  docPath: EvidenceDocPath
  onNavigate: (docPath: EvidenceDocPath) => void
  onClose: () => void
}

type DocState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; title: string; fragment: DocumentFragment }

const TOPIC_LABELS: Partial<Record<EvidenceDocPath, string>> = {
  'docs/references/README.md': 'Overview',
  'docs/references/INDEX.md': 'Experience dimensions',
  'docs/references/EVIDENCE_MATRIX.md': 'Evidence matrix',
  'docs/references/motifs/INDEX.md': 'Audiovisual motifs',
  'docs/references/CONTRIBUTIONS_AND_LIMITS.md': 'Limits and contributions',
  'docs/REFERENCES_AUDIT.md': 'Source review',
}

function isIndexLike(path: EvidenceDocPath): boolean {
  return (
    path.endsWith('/INDEX.md') ||
    path.endsWith('/README.md') ||
    path.endsWith('/EVIDENCE_MATRIX.md')
  )
}

function topicLabel(path: EvidenceDocPath): string {
  const segments = path.split('/')
  return (
    TOPIC_LABELS[path] ??
    segments[segments.length - 1]?.replace(/\.md$/i, '').replace(/_/g, ' ') ??
    'Topic'
  )
}

export function EvidenceDrawer(props: EvidenceDrawerProps) {
  const [state, setState] = useState<DocState>({ status: 'loading' })
  const [retryToken, setRetryToken] = useState(0)
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const evidenceContentRef = useRef<HTMLElement | null>(null)

  const navItems = useMemo(() => {
    const all = listEvidenceDocPaths()
    const curated = Object.keys(TOPIC_LABELS) as EvidenceDocPath[]
    return [
      ...curated.filter((path) => all.includes(path)),
      ...all.filter((path) => isIndexLike(path) && !curated.includes(path)),
    ]
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || !props.open) return
    if (!dialog.open) dialog.showModal()
    closeButtonRef.current?.focus()
    return () => {
      if (dialog.open) dialog.close()
    }
  }, [props.open])

  useAsyncEffect(
    async (ctx) => {
      if (!props.open) return
      setState({ status: 'loading' })
      try {
        const markdown = await loadEvidenceDoc(props.docPath)
        if (ctx.cancelled) return
        if (!markdown) {
          setState({ status: 'error', message: 'This evidence topic could not be found.' })
          return
        }
        const { fragment, title } = renderEvidenceMarkdown(markdown)
        setState({ status: 'ready', fragment, title })
      } catch (error) {
        if (ctx.cancelled) return
        logger.error('Failed to load evidence document', props.docPath, error)
        setState({ status: 'error', message: 'This evidence topic could not be loaded.' })
      }
    },
    [props.open, props.docPath, retryToken],
  )

  useEffect(() => {
    if (state.status !== 'ready') return
    evidenceContentRef.current?.replaceChildren(state.fragment.cloneNode(true))
  }, [state])

  const handleArticleActivation = (
    event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
  ): void => {
    if ('key' in event && event.key !== 'Enter' && event.key !== ' ') return
    const anchor = (event.target as HTMLElement | null)?.closest?.('a') as HTMLAnchorElement | null
    if (!anchor) return
    const href = anchor.getAttribute('href') ?? ''
    const normalized = href.trim().toLowerCase()
    if (normalized.startsWith('javascript:') || normalized.startsWith('data:')) {
      event.preventDefault()
      return
    }
    const resolved = resolveEvidenceHref(props.docPath, href)
    if (resolved) {
      event.preventDefault()
      props.onNavigate(resolved)
      return
    }
    anchor.setAttribute('target', '_blank')
    anchor.setAttribute('rel', 'noreferrer noopener')
  }

  return (
    <dialog
      ref={dialogRef}
      className="evidence-dialog"
      aria-labelledby="evidence-title"
      onCancel={(event) => {
        event.preventDefault()
        props.onClose()
      }}
    >
      <div className="evidence-drawer">
        <header className="evidence-top">
          <div>
            <div className="evidence-kicker">Method &amp; Evidence</div>
            <h2 id="evidence-title" className="evidence-title">
              {state.status === 'ready' ? state.title : topicLabel(props.docPath)}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="evidence-btn"
            onClick={props.onClose}
          >
            Close
          </button>
        </header>

        <label className="evidence-mobileNav">
          <span>Topic</span>
          <select
            value={props.docPath}
            onChange={(event) => props.onNavigate(event.target.value as EvidenceDocPath)}
          >
            {navItems.map((path) => (
              <option key={path} value={path}>
                {topicLabel(path)}
              </option>
            ))}
          </select>
        </label>

        <div className="evidence-body">
          <nav className="evidence-nav" aria-label="Evidence topics">
            <ul className="evidence-navList">
              {navItems.map((path) => (
                <li key={path}>
                  <button
                    type="button"
                    className={
                      path === props.docPath
                        ? 'evidence-navLink evidence-navLink--active'
                        : 'evidence-navLink'
                    }
                    aria-current={path === props.docPath ? 'page' : undefined}
                    onClick={() => props.onNavigate(path)}
                  >
                    {topicLabel(path)}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <section className="evidence-content" aria-label="Evidence content">
            {state.status === 'loading' && (
              <p className="evidence-loading" role="status">
                Loading evidence…
              </p>
            )}
            {state.status === 'error' && (
              <div className="evidence-error" role="alert">
                <p>{state.message}</p>
                <button
                  type="button"
                  className="evidence-btn"
                  onClick={() => setRetryToken((value) => value + 1)}
                >
                  Retry
                </button>
              </div>
            )}
            {state.status === 'ready' && (
              <article
                ref={evidenceContentRef}
                className="evidence-markdown"
                onClick={handleArticleActivation}
                onKeyDown={handleArticleActivation}
              />
            )}
          </section>
        </div>
      </div>
    </dialog>
  )
}
