import { type ChangeEvent, useCallback, useRef, useState } from 'react'

interface Draft {
  value: number
  /** The committed value the draft started from; an outside change discards the draft. */
  base: number
}

/** Keeps a slider draft locally and calls onCommit once when the user releases it. */
export function useCommitOnRelease(value: number, onCommit: (value: number) => void) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const latest = useRef({ value, onCommit, draft })
  latest.current = { value, onCommit, draft }

  const commit = useCallback((): void => {
    const { value: current, onCommit: commitValue, draft: pending } = latest.current
    if (!pending) return
    // Release signals arrive in pairs (change, pointerup, blur); only the first one commits.
    latest.current.draft = null
    setDraft(null)
    if (pending.base === current && pending.value !== current) commitValue(pending.value)
  }, [])

  // The native `change` event is the release signal for mouse, touch, keyboard and assistive
  // tech alike; React's onChange fires on every `input` step instead.
  const ref = useCallback(
    (input: HTMLInputElement | null) => {
      if (!input) return
      input.addEventListener('change', commit)
      return () => input.removeEventListener('change', commit)
    },
    [commit],
  )

  const shown = draft && draft.base === value ? draft.value : value
  const inputProps = {
    ref,
    value: shown,
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      const next = Number(event.target.value)
      if (!Number.isFinite(next)) return
      const base = latest.current.draft?.base ?? value
      // Updated synchronously so a `change` event in the same task commits this value.
      latest.current.draft = { value: next, base }
      setDraft({ value: next, base })
    },
    onPointerUp: commit,
    onPointerCancel: commit,
    onKeyUp: commit,
    onBlur: commit,
  }
  return { draft: shown, inputProps }
}
