import { ExperienceWorkspaceView } from './components/ExperienceWorkspaceView'
import { useExperienceWorkspaceModel } from './hooks/useExperienceWorkspaceModel'

export function ExperienceWorkspace() {
  const model = useExperienceWorkspaceModel()

  return <ExperienceWorkspaceView model={model} />
}
