import type { ExperienceWorkspaceModel } from '../hooks/useExperienceWorkspaceModel'
import { DEBUG_UI_ENABLED } from '../workspacePresentation'

type ModelProps = { model: ExperienceWorkspaceModel }

function MissingPresetsReport({ model }: ModelProps) {
  const missing = model.profileLoad.composeReport?.missingPresets ?? []
  if (missing.length === 0) return null
  return (
    <>
      <div className="ie-subsectionTitle">Missing presets</div>
      <ul className="ie-codeList">
        {missing.map((id) => (
          <li key={id}>
            <code>{id}</code>
          </li>
        ))}
      </ul>
    </>
  )
}

function MissingNodesReport({ model }: ModelProps) {
  const missing = model.profileLoad.composeReport?.missingNodes
  if (!missing || (missing.video.length === 0 && missing.audio.length === 0)) return null
  return (
    <>
      <div className="ie-subsectionTitle">Missing nodes (not applied)</div>
      <ul className="ie-codeList">
        {missing.video.map((node) => (
          <li key={`v-${node}`}>
            video: <code>{node}</code>
          </li>
        ))}
        {missing.audio.map((node) => (
          <li key={`a-${node}`}>
            audio: <code>{node}</code>
          </li>
        ))}
      </ul>
    </>
  )
}

function EvidenceGapsReport({ model }: ModelProps) {
  const gaps = model.profileLoad.composeReport?.evidence.gaps ?? []
  if (gaps.length === 0) return null
  return (
    <>
      <div className="ie-subsectionTitle">Evidence gaps</div>
      <ul className="ie-codeList">
        {gaps.map((gap) => (
          <li key={`${gap.dimensionId}-${gap.reason}`}>
            <code>{gap.dimensionId}</code>: {gap.reason}
          </li>
        ))}
      </ul>
    </>
  )
}

function CompositionSuccessReport({ model }: ModelProps) {
  const report = model.profileLoad.composeReport
  if (!report) return null
  const hasMissing =
    report.missingPresets.length > 0 ||
    report.missingNodes.video.length > 0 ||
    report.missingNodes.audio.length > 0 ||
    report.evidence.gaps.length > 0
  if (hasMissing) return null
  return <p className="ie-hint">Composition applied. No missing presets or nodes.</p>
}

export function ComposerReport({ model }: ModelProps) {
  if (!DEBUG_UI_ENABLED) return null
  const isPreset = model.state.composition.composerMode === 'preset'
  return (
    <details className="ie-panelSection">
      <summary className="ie-summary">Composer report (dev)</summary>
      <div className="ie-panelBody">
        {isPreset && (
          <p className="ie-hint">
            Only shown when combining collections or choosing experience dimensions. A single
            curated collection does not need a composition report.
          </p>
        )}
        {!isPreset && model.profileLoad.composeReport && (
          <>
            <MissingPresetsReport model={model} />
            <MissingNodesReport model={model} />
            <EvidenceGapsReport model={model} />
            <CompositionSuccessReport model={model} />
          </>
        )}
      </div>
    </details>
  )
}
