import { useEffect, useMemo, useRef, type KeyboardEvent, type MouseEvent } from 'react'
import { listEvidenceDocPaths, type EvidenceDocPath } from '../../../content/evidence'
import { resolveEvidenceHref } from './evidenceHref'
import { useEvidenceDocument } from './useEvidenceDocument'
import './EvidencePrecision.css'

export interface EvidenceDrawerProps {
  open: boolean
  docPath: EvidenceDocPath
  onNavigate: (docPath: EvidenceDocPath) => void
  onClose: () => void
  safeMode?: boolean
  reducedMotion?: boolean
  mediaActive?: boolean
}

const TOPIC_LABELS: Partial<Record<EvidenceDocPath, string>> = {
  'docs/references/README.md': 'Overview',
  'docs/references/INDEX.md': 'Experience dimensions',
  'docs/references/EVIDENCE_MATRIX.md': 'Evidence matrix',
  'docs/references/motifs/INDEX.md': 'Audiovisual motifs',
  'docs/references/CONTRIBUTIONS_AND_LIMITS.md': 'Limits and contributions',
  'docs/references/MAPPING_SUMMARY.md': 'Mapping summary',
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

function syncEvidenceDialog(
  dialog: HTMLDialogElement | null,
  closeButton: HTMLButtonElement | null,
  open: boolean,
): (() => void) | undefined {
  if (!dialog || !open) return
  if (!dialog.open) {
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
  }
  closeButton?.focus()
  return () => {
    if (!dialog.open) return
    if (typeof dialog.close === 'function') dialog.close()
    else dialog.removeAttribute('open')
  }
}

export function EvidenceDrawer(props: EvidenceDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const {
    state,
    contentRef: evidenceContentRef,
    retry,
  } = useEvidenceDocument(props.open, props.docPath)

  const navItems = useMemo(() => {
    const all = listEvidenceDocPaths()
    const curated = Object.keys(TOPIC_LABELS) as EvidenceDocPath[]
    return [
      ...curated.filter((path) => all.includes(path)),
      ...all.filter((path) => isIndexLike(path) && !curated.includes(path)),
    ]
  }, [])

  useEffect(
    () => syncEvidenceDialog(dialogRef.current, closeButtonRef.current, props.open),
    [props.open],
  )

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
          <h2 id="evidence-title" className="evidence-title">
            Method &amp; Evidence
          </h2>
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
                <button type="button" className="evidence-btn" onClick={retry}>
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

          <aside className="evidence-safety" aria-label="Safety boundaries">
            <div className="evidence-kicker">Safety boundaries</div>
            <dl>
              <div>
                <dt>Safe Mode</dt>
                <dd>{props.safeMode === false ? 'Off' : 'On'}</dd>
              </div>
              <div>
                <dt>Reduced Motion</dt>
                <dd>{props.reducedMotion ? 'On' : 'System'}</dd>
              </div>
              <div>
                <dt>Media processing</dt>
                <dd>Local</dd>
              </div>
              <div>
                <dt>Recording</dt>
                <dd>None</dd>
              </div>
            </dl>
            <p>
              Stop Everything remains available whenever media is{' '}
              {props.mediaActive ? 'active' : 'started'}.
            </p>
          </aside>
        </div>
        <footer className="evidence-footer">Sanitized Markdown / Local document</footer>
      </div>
    </dialog>
  )
}
