import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
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
  | { status: 'ready'; title: string; fragment: DocumentFragment; raw: string }

function isIndexLike(p: EvidenceDocPath): boolean {
  return p.endsWith('/INDEX.md') || p.endsWith('/README.md') || p.endsWith('/EVIDENCE_MATRIX.md')
}

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => {
    if (element.getAttribute('aria-hidden') === 'true' || element.tabIndex < 0) return false
    const style = window.getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden') return false
    return element.offsetParent !== null || style.position === 'fixed'
  })
}

function trapFocus(e: KeyboardEvent, root: HTMLElement | null): void {
  if (e.key !== 'Tab' || !root) return
  const focusables = getFocusableElements(root)
  if (!focusables.length) return
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  const active = document.activeElement as HTMLElement | null
  const outside = !active || !root.contains(active)
  const wrapBackward = e.shiftKey && (outside || active === first)
  const wrapForward = !e.shiftKey && (outside || active === last)
  if (!wrapBackward && !wrapForward) return
  e.preventDefault()
  ;(wrapBackward ? last : first).focus()
}

function handleEvidenceLink(
  e: ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>,
  docPath: EvidenceDocPath,
  onNavigate: (path: EvidenceDocPath) => void,
): void {
  const anchor = (e.target as HTMLElement | null)?.closest?.('a') as HTMLAnchorElement | null
  if (!anchor) return
  const href = anchor.getAttribute('href') ?? ''
  const protocol = href.trim().toLowerCase()
  if (protocol.startsWith('javascript:') || protocol.startsWith('data:')) {
    e.preventDefault()
    return
  }
  const resolved = resolveEvidenceHref(docPath, href)
  if (resolved) {
    e.preventDefault()
    onNavigate(resolved)
    return
  }
  anchor.setAttribute('target', '_blank')
  anchor.setAttribute('rel', 'noreferrer noopener')
}

export function EvidenceDrawer(props: EvidenceDrawerProps) {
  const [state, setState] = useState<DocState>({ status: 'loading' })
  const backdropRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const navRef = useRef<HTMLElement | null>(null)
  const evidenceContentRef = useRef<HTMLElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const navItems = useMemo(() => {
    const all = listEvidenceDocPaths()
    const curated: EvidenceDocPath[] = [
      'docs/references/README.md',
      'docs/references/INDEX.md',
      'docs/references/EVIDENCE_MATRIX.md',
      'docs/references/motifs/INDEX.md',
      'docs/references/CONTRIBUTIONS_AND_LIMITS.md',
      'docs/REFERENCES_AUDIT.md',
    ]
    // Ensure curated items exist (filter missing) and then add other index-like docs.
    const set = new Set<EvidenceDocPath>()
    const out: EvidenceDocPath[] = []
    for (const p of curated) {
      if (all.includes(p)) {
        set.add(p)
        out.push(p)
      }
    }
    for (const p of all) {
      if (!set.has(p) && isIndexLike(p)) out.push(p)
    }
    return out
  }, [])

  useAsyncEffect(
    async (ctx) => {
      if (!props.open) return
      setState({ status: 'loading' })
      try {
        const md = await loadEvidenceDoc(props.docPath)
        if (ctx.cancelled) return
        if (!md) {
          setState({ status: 'error', message: `Evidence doc not found: ${props.docPath}` })
          return
        }
        const { fragment, title } = renderEvidenceMarkdown(md)
        setState({ status: 'ready', fragment, title, raw: md })
      } catch (err) {
        if (!ctx.cancelled) {
          logger.error('Failed to load evidence document', props.docPath, err)
          setState({ status: 'error', message: 'Could not load evidence document.' })
        }
      }
    },
    [props.open, props.docPath],
  )

  useEffect(() => {
    if (state.status !== 'ready') return
    const content = evidenceContentRef.current
    if (!content) return
    content.replaceChildren(state.fragment.cloneNode(true))
  }, [state])

  // Escape to close
  useEffect(() => {
    if (!props.open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [props.open, props.onClose])

  useEffect(() => {
    if (!props.open) return
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const id = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus()
    })
    return () => {
      window.cancelAnimationFrame(id)
      previousFocusRef.current?.focus()
      previousFocusRef.current = null
    }
  }, [props.open])

  useEffect(() => {
    if (!props.open) return

    const onKey = (e: KeyboardEvent) => trapFocus(e, backdropRef.current)

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [props.open])

  const handleBackdrop = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) props.onClose()
    },
    [props.onClose],
  )

  const handleBackdropKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      props.onClose()
    },
    [props.onClose],
  )

  const handleNavKeyDown = useCallback((e: ReactKeyboardEvent<HTMLElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const root = navRef.current
    if (!root) return
    const links = Array.from(root.querySelectorAll<HTMLButtonElement>('button.evidence-navLink'))
    if (links.length === 0) return

    e.preventDefault()
    const current = links.indexOf(document.activeElement as HTMLButtonElement)
    const nextIndex =
      current < 0
        ? 0
        : e.key === 'ArrowDown'
          ? (current + 1) % links.length
          : (current - 1 + links.length) % links.length
    links[nextIndex].focus()
  }, [])

  return (
    <div
      ref={backdropRef}
      className={props.open ? 'evidence-backdrop' : 'evidence-backdrop evidence-backdrop--hidden'}
      role="dialog"
      aria-modal="true"
      aria-labelledby="evidence-title"
      aria-label="Evidence viewer"
      tabIndex={-1}
      onClick={handleBackdrop}
      onKeyDown={handleBackdropKeyDown}
    >
      <div className="evidence-drawer">
        <div className="evidence-top">
          <div id="evidence-title" className="evidence-title">
            {state.status === 'ready' ? state.title : 'Evidence'}
          </div>
          <div className="evidence-actions">
            <button
              ref={closeButtonRef}
              type="button"
              className="evidence-btn"
              onClick={props.onClose}
              aria-label="Close evidence viewer"
            >
              Close
            </button>
          </div>
        </div>

        <div className="evidence-body">
          <nav
            ref={navRef}
            className="evidence-nav"
            aria-label="Evidence navigation"
            onKeyDown={handleNavKeyDown}
          >
            <div className="evidence-navTitle">Evidence</div>
            <ul className="evidence-navList">
              {navItems.map((p) => (
                <li key={p}>
                  <button
                    type="button"
                    className={
                      p === props.docPath
                        ? 'evidence-navLink evidence-navLink--active'
                        : 'evidence-navLink'
                    }
                    onClick={() => {
                      props.onNavigate(p)
                    }}
                  >
                    <code>{p.replace('docs/references/', '').replace('docs/', '')}</code>
                  </button>
                </li>
              ))}
            </ul>
            <div className="evidence-navHint">
              Tip: use the “Evidence” buttons in the selector to jump directly to a dimension or
              condition page.
            </div>
          </nav>

          <main className="evidence-content" aria-label="Evidence content">
            {state.status === 'loading' && <div className="evidence-loading">Loading…</div>}
            {state.status === 'error' && <div className="evidence-error">{state.message}</div>}
            {state.status === 'ready' && (
              <article
                ref={evidenceContentRef}
                className="evidence-markdown"
                onClick={(e) => handleEvidenceLink(e, props.docPath, props.onNavigate)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return
                  handleEvidenceLink(e, props.docPath, props.onNavigate)
                }}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
