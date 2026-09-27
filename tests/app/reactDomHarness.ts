import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'

export interface RenderedTestRoot {
  container: HTMLDivElement
  root: Root
}

export function enableReactActEnvironment(): void {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
}

export async function renderTestRoot(element: ReactNode): Promise<RenderedTestRoot> {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => root.render(element))
  return { container, root }
}

export async function disposeTestRoot(root: Root | null): Promise<void> {
  if (root) await act(async () => root.unmount())
  document.body.replaceChildren()
}
