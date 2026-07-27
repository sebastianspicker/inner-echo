import { render, waitFor } from '@testing-library/react'
import { expect } from 'vitest'

import {
  ConditionComposerPanel,
  type ConditionComposerPanelProps,
} from '../../src/ui/ConditionComposerPanel'
import { LEGACY_PRESET_STORAGE_KEY, PRESET_LIBRARY_STORAGE_KEY } from '../../src/ui/presetSnapshot'

export async function assertValidLegacyMigrationIsRetained(
  storageMap: Map<string, string>,
  buildProps: () => ConditionComposerPanelProps,
): Promise<void> {
  storageMap.set(
    LEGACY_PRESET_STORAGE_KEY,
    JSON.stringify({ conditionId: 'panic', intensity: 0.6, safeMode: false }),
  )

  render(<ConditionComposerPanel {...buildProps()} />)

  await waitFor(() => {
    expect(storageMap.has(PRESET_LIBRARY_STORAGE_KEY)).toBe(true)
  })
  const migrated = JSON.parse(storageMap.get(PRESET_LIBRARY_STORAGE_KEY) ?? '[]')
  expect(migrated).toHaveLength(1)
  expect(migrated[0].name).toBe('Migrated Preset')
  expect(migrated[0].payload.conditionId).toBe('panic')
  expect(storageMap.has(LEGACY_PRESET_STORAGE_KEY)).toBe(false)
}
