// Shared DOM and mounting helpers for driving the real workspace through accessible
// roles/names/aria-labels only. No internal module is imported by path here.
import { act, createElement } from 'react'
import type { Root } from 'react-dom/client'
import { disposeTestRoot, enableReactActEnvironment, renderTestRoot } from './reactDomHarness'
import { ExperienceWorkspace } from '../../src/app/experience/ExperienceWorkspace'

enableReactActEnvironment()

function textMatches(value: string | null, matcher: string | RegExp): boolean {
  if (!value) return false
  return typeof matcher === 'string' ? value.includes(matcher) : matcher.test(value)
}

/** Find a button by visible text or aria-label; throws with a helpful message if absent. */
export function getButton(root: ParentNode, matcher: string | RegExp): HTMLButtonElement {
  const found = queryButton(root, matcher)
  if (!found) throw new Error(`No button matched ${String(matcher)}`)
  return found
}

/** Query a button by visible text or aria-label, returning null when it is absent. */
export function queryButton(root: ParentNode, matcher: string | RegExp): HTMLButtonElement | null {
  const buttons = Array.from(root.querySelectorAll('button'))
  return (
    buttons.find(
      (button) =>
        textMatches(button.textContent, matcher) ||
        textMatches(button.getAttribute('aria-label'), matcher),
    ) ?? null
  )
}

export function getInput(root: ParentNode, id: string): HTMLInputElement {
  const input = root.querySelector<HTMLInputElement>(`#${id}`)
  if (!input) throw new Error(`No input found for #${id}`)
  return input
}

export function getSelect(root: ParentNode, id: string): HTMLSelectElement {
  const select = root.querySelector<HTMLSelectElement>(`#${id}`)
  if (!select) throw new Error(`No select found for #${id}`)
  return select
}

/** Finds a checkbox by the visible text of its wrapping <label> (dimension/condition rows). */
export function getCheckboxByLabel(root: ParentNode, labelSubstring: string): HTMLInputElement {
  return getInputByLabel(root, labelSubstring, 'checkbox')
}

/** Finds a radio/checkbox by the visible text of its wrapping <label> (e.g. mode choosers). */
export function getInputByLabel(
  root: ParentNode,
  labelSubstring: string,
  type: 'checkbox' | 'radio' = 'radio',
): HTMLInputElement {
  const labels = Array.from(root.querySelectorAll('label'))
  const label = labels.find((element) => element.textContent?.includes(labelSubstring))
  const input = label?.querySelector<HTMLInputElement>(`input[type="${type}"]`)
  if (!input) throw new Error(`No ${type} found for label containing "${labelSubstring}"`)
  return input
}

/** Sets a <select>'s value like a real user pick, bypassing React's value-tracking shim. */
export function selectOption(select: HTMLSelectElement, value: string): void {
  const setValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set
  act(() => {
    setValue?.call(select, value)
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

/** Advance several microtask turns inside act() so chained promises settle and flush. */
export async function flushAsync(ticks = 6): Promise<void> {
  for (let i = 0; i < ticks; i += 1) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

export interface WaitForOptions {
  timeoutMs?: number
  intervalMs?: number
}

/** Polls a condition with real timers until it is true, flushing React work each turn. */
export async function waitFor(
  predicate: () => boolean,
  { timeoutMs = 2000, intervalMs = 10 }: WaitForOptions = {},
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('waitFor: condition was not met before timeout')
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    })
  }
}

export interface WorkspaceHandle {
  container: HTMLDivElement
  root: Root
}

/** Mounts the real, accessible workspace tree (no internal hook/session module is imported). */
export async function mountWorkspace(): Promise<WorkspaceHandle> {
  const rendered = await renderTestRoot(createElement(ExperienceWorkspace))
  await flushAsync(2)
  return { container: rendered.container, root: rendered.root }
}

export async function unmountWorkspace(handle: WorkspaceHandle | null): Promise<void> {
  await disposeTestRoot(handle?.root ?? null)
}

export function click(element: HTMLElement): void {
  act(() => element.click())
}

function textIncludes(container: HTMLElement, needle: string): boolean {
  return container.textContent?.includes(needle) ?? false
}

/** Clicks "Start camera" and waits for the visible active-camera state. */
export async function startCamera(container: HTMLElement): Promise<void> {
  click(getButton(container, 'Start camera'))
  await waitFor(() => textIncludes(container, 'Camera active'))
}

/** Clicks the direct sound-activation action and waits for "Audio: on". */
export async function enableSound(container: HTMLElement): Promise<void> {
  click(getButton(container, 'Enable audio'))
  await waitFor(() => textIncludes(container, 'Audio: on'))
}

/** Clicks the optional microphone action (only available once sound is on). */
export async function enableMicrophone(container: HTMLElement): Promise<void> {
  click(getButton(container, 'Enable microphone (optional)'))
  await waitFor(() => textIncludes(container, 'Mic: on'))
}

export function stopEverything(container: HTMLElement): void {
  click(getButton(container, 'Stop Everything'))
}
