import { ExperienceWorkspaceView } from './workspace/ExperienceWorkspaceView'
import { useExperienceWorkspace } from './workspace/useExperienceWorkspace'

export function ExperienceWorkspace() {
  const model = useExperienceWorkspace()

  return <ExperienceWorkspaceView model={model} />
}
