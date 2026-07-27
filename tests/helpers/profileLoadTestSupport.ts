import type { Profile } from '../../src/conditions/schema'
import type { UseProfileLoadParams } from '../../src/ui/hooks/useProfileLoad'
import { useProfileLoad } from '../../src/ui/hooks/useProfileLoad'

export function createProfileLoader(slow: Promise<Profile>, fast: Promise<Profile>) {
  return (conditionId: string): Promise<Profile> => {
    if (conditionId === 'slow') return slow
    if (conditionId === 'fast') return fast
    return Promise.resolve({ id: conditionId } as Profile)
  }
}

export function useProfileForCondition(params: UseProfileLoadParams, conditionId: string) {
  return useProfileLoad({ ...params, conditionId })
}

export function useProfileForComposerMode(
  params: UseProfileLoadParams,
  composerMode: 'preset' | 'multimorbid',
  multimorbidPresets: { profileId: string; weight: number }[],
) {
  return useProfileLoad({
    ...params,
    composerMode,
    selectedPresets: composerMode === 'multimorbid' ? multimorbidPresets : [],
  })
}
