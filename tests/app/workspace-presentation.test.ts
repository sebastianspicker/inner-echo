// @vitest-environment jsdom

import { act, createElement, createRef } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, expect, it } from 'vitest'
import { CameraStage, type CameraStageProps } from '../../src/app/experience/media/CameraStage'
import { captionEntries, PlateCaption } from '../../src/app/experience/media/PlateCaption'
import { disposeTestRoot, enableReactActEnvironment, renderTestRoot } from './reactDomHarness'

let root: Root | null = null
enableReactActEnvironment()
afterEach(async () => {
  await disposeTestRoot(root)
  root = null
})

it('keeps media surfaces mounted when the optional preview becomes active and stops', async () => {
  const props: CameraStageProps = {
    containerRef: createRef(),
    videoRef: createRef(),
    webglCanvasRef: createRef(),
    fallbackCanvasRef: createRef(),
    rmsDebugRef: createRef(),
    isActive: false,
    cameraState: 'idle',
    audioStatus: 'off',
    rendererMode: 'unavailable',
    effectsActive: false,
    debugOverlay: false,
  }
  const rendered = await renderTestRoot(createElement(CameraStage, props))
  root = rendered.root
  const video = props.videoRef.current
  const canvas = props.webglCanvasRef.current
  expect(rendered.container.textContent).toContain('Your preview stays off until you start it.')

  await act(async () =>
    root?.render(createElement(CameraStage, { ...props, cameraState: 'requesting' })),
  )
  expect(rendered.container.textContent).toContain('Waiting for camera permission…')

  await act(async () =>
    root?.render(
      createElement(CameraStage, {
        ...props,
        isActive: true,
        cameraState: 'active',
        rendererMode: 'raw',
      }),
    ),
  )
  expect(rendered.container.textContent).toContain('Raw preview')
  expect(rendered.container.textContent).not.toContain('Your preview stays off')
  expect(props.videoRef.current).toBe(video)
  expect(props.webglCanvasRef.current).toBe(canvas)

  await act(async () => root?.render(createElement(CameraStage, props)))
  expect(props.videoRef.current).toBe(video)
  expect(props.webglCanvasRef.current).toBe(canvas)
  expect(rendered.container.textContent).toContain('Your preview stays off until you start it.')
})

it('keeps zero-weight selections out of the applied plate caption', () => {
  const entries = captionEntries(
    {
      composerMode: 'symptom',
      conditionId: 'none',
      presets: [],
      dimensions: [
        { dimensionId: 'hyperarousal', weight: 0 },
        { dimensionId: 'cognitive_fog', weight: 2 },
      ],
    },
    [],
  )

  expect(entries).toEqual([
    expect.objectContaining({ id: 'cognitive_fog', label: 'Cognitive Fog', weight: 1 }),
  ])
})

it('names pending and failed profiles instead of presenting the selection as applied', async () => {
  const selection = {
    composerMode: 'preset' as const,
    conditionId: 'anxiety',
    presets: [],
    dimensions: [],
  }
  const catalog = [{ id: 'anxiety', label: 'Anxiety-related tension and worry' }]
  const rendered = await renderTestRoot(
    createElement(PlateCaption, { selection, catalog, profileStatus: 'loading' }),
  )
  root = rendered.root
  expect(rendered.container.textContent).toContain('Preparing the selected interpretation')
  expect(rendered.container.textContent).not.toContain('Anxiety-related tension and worry')

  await act(async () =>
    root?.render(createElement(PlateCaption, { selection, catalog, profileStatus: 'error' })),
  )
  expect(rendered.container.textContent).toContain('Clean fallback: no overlay is applied.')
  expect(rendered.container.textContent).toContain(
    'The selected interpretation could not be applied.',
  )
})
