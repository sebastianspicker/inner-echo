import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { EvidenceDocPath } from '../evidence/docs'
import { listEvidenceDocPaths, loadEvidenceDoc } from '../evidence/docs'
import { renderEvidenceMarkdown } from '../evidence/markdown'
import { useAsyncEffect } from './hooks/useAsyncEffect'
import { resolveEvidenceHref } from './evidenceHref'
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
  | { status: 'ready'; title: string; html: string; raw: string }

function isIndexLike(p: EvidenceDocPath): boolean {
  return p.endsWith('/INDEX.md') || p.endsWith('/README.md') || p.endsWith('/EVIDENCE_MATRIX.md')
}

export function EvidenceDrawer(props: EvidenceDrawerProps) {
  const [state, setState] = useState<DocState>({ status: 'loading' })
  const backdropRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const navRef = useRef<HTMLElement | null>(null)
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
        const { html, title } = renderEvidenceMarkdown(md)
        setState({ status: 'ready', html, title, raw: md })
      } catch (err) {
        if (!ctx.cancelled) {
          setState({ status: 'error', message: err instanceof Error ? err.message : String(err) })
        }
      }
    },
    [props.open, props.docPath]
  )

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
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
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

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const root = backdropRef.current
      if (!root) return

      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.getAttribute('aria-hidden') !== 'true' && el.tabIndex >= 0)

      if (focusables.length === 0) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null

      if (e.shiftKey) {
        if (!active || active === first || !root.contains(active)) {
          e.preventDefault()
          last.focus()
        }
        return
      }

      if (active === last || !active || !root.contains(active)) {
        e.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [props.open])

  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) props.onClose()
    },
    [props]
  )

  const handleNavKeyDown = useCallback((e: ReactKeyboardEvent<HTMLElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const root = navRef.current
    if (!root) return
    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('a.evidence-navLink'))
    if (links.length === 0) return

    e.preventDefault()
    const current = links.findIndex((link) => link === document.activeElement)
    const nextIndex =
      current < 0
        ? 0
        : e.key === 'ArrowDown'
          ? (current + 1) % links.length
          : (current - 1 + links.length) % links.length
    links[nextIndex].focus()
  }, [])

  if (!props.open) return null

  return (
    <div
      ref={backdropRef}
      className="evidence-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="evidence-title"
      aria-label="Evidence viewer"
      onMouseDown={handleBackdrop}
    >
      <div className="evidence-drawer" tabIndex={-1}>
        <div className="evidence-top">
          <div id="evidence-title" className="evidence-title">{state.status === 'ready' ? state.title : 'Evidence'}</div>
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
                  <a
                    className={p === props.docPath ? 'evidence-navLink evidence-navLink--active' : 'evidence-navLink'}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      props.onNavigate(p)
                    }}
                  >
                    <code>{p.replace('docs/references/', '').replace('docs/', '')}</code>
                  </a>
                </li>
              ))}
            </ul>
            <div className="evidence-navHint">
              Tip: use the “Evidence” buttons in the selector to jump directly to a dimension or condition page.
            </div>
          </nav>

          <main className="evidence-content" aria-label="Evidence content">
            {state.status === 'loading' && <div className="evidence-loading">Loading…</div>}
            {state.status === 'error' && <div className="evidence-error">{state.message}</div>}
            {state.status === 'ready' && (
              <article
                className="evidence-markdown"
                onClick={(e) => {
                  const target = e.target as HTMLElement | null
                  const a = target?.closest?.('a') as HTMLAnchorElement | null
                  if (!a) return
                  const href = a.getAttribute('href') ?? ''
                  const resolved = resolveEvidenceHref(props.docPath, href)
                  if (resolved) {
                    e.preventDefault()
                    props.onNavigate(resolved)
                  } else {
                    // For non-evidence links, open in a new tab for clarity and security.
                    a.setAttribute('target', '_blank')
                    a.setAttribute('rel', 'noreferrer noopener')
                  }
                }}
                dangerouslySetInnerHTML={{ __html: state.html }}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
