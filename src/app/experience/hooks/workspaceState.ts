import { useState } from 'react'

import type { EvidenceDocPath } from '../../../content/evidence'
import type {
  ComposerMode,
  SelectedDimension,
  SelectedPreset,
} from '../../../domain/experience/composition/types'
import type { CameraState } from '../../../runtime/camera'
import type { OverlayRuntimeState } from '../../../runtime/visual/overlay'
import { DEFAULT_CONDITION_ID, DEFAULT_INTENSITY } from '../workspacePresentation'

function useCompositionState() {
  const [conditionId, setConditionId] = useState(DEFAULT_CONDITION_ID)
  const [composerMode, setComposerMode] = useState<ComposerMode>('symptom')
  const [selectedPresets, setSelectedPresets] = useState<SelectedPreset[]>([])
  const [selectedDimensions, setSelectedDimensions] = useState<SelectedDimension[]>([])
  return {
    conditionId,
    setConditionId,
    composerMode,
    setComposerMode,
    selectedPresets,
    setSelectedPresets,
    selectedDimensions,
    setSelectedDimensions,
  }
}

function useSafetyState() {
  const [intensity, setIntensity] = useState(DEFAULT_INTENSITY)
  const [safeMode, setSafeMode] = useState(true)
  const [stressMode, setStressMode] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  )
  return {
    intensity,
    setIntensity,
    safeMode,
    setSafeMode,
    stressMode,
    setStressMode,
    reducedMotion,
    setReducedMotion,
  }
}

function useCouplingState() {
  const [couplingStrength, setCouplingStrength] = useState(0)
  const [maxFeedback, setMaxFeedback] = useState(0.35)
  const [interactionAmount, setInteractionAmount] = useState(0.15)
  return {
    couplingStrength,
    setCouplingStrength,
    maxFeedback,
    setMaxFeedback,
    interactionAmount,
    setInteractionAmount,
  }
}

function useCameraState() {
  const [cameraState, setCameraState] = useState<CameraState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [overlayState, setOverlayState] = useState<OverlayRuntimeState>({
    rendererMode: 'unavailable',
    effectsActive: false,
    error: null,
  })
  return {
    cameraState,
    setCameraState,
    errorMessage,
    setErrorMessage,
    overlayState,
    setOverlayState,
  }
}

function useWorkspaceUiState() {
  const [debugOverlay, setDebugOverlay] = useState(false)
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const [evidenceDocPath, setEvidenceDocPath] = useState<EvidenceDocPath>(
    'docs/references/README.md',
  )
  return {
    debugOverlay,
    setDebugOverlay,
    evidenceOpen,
    setEvidenceOpen,
    evidenceDocPath,
    setEvidenceDocPath,
  }
}

export function useWorkspaceState() {
  return {
    composition: useCompositionState(),
    safety: useSafetyState(),
    coupling: useCouplingState(),
    camera: useCameraState(),
    ui: useWorkspaceUiState(),
  }
}

export type WorkspaceState = ReturnType<typeof useWorkspaceState>
