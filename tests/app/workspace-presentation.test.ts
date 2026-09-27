// @vitest-environment jsdom

import { act, createElement, createRef } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, expect, it } from 'vitest'
import { CameraStage, type CameraStageProps } from '../../src/app/experience/components/CameraStage'
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
