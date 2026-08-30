import type { PresetSnapshotV2 } from '../presets/library'

export interface PresetLibraryPanelProps {
  library: PresetSnapshotV2[]
  selectedId: string
  name: string
  warning: string | null
  hasSelection: boolean
  canUndoDelete: boolean
  copyStatus: 'idle' | 'copied' | 'failed'
  copyAction: 'configuration' | 'share-link'
  saveStatus: 'idle' | 'saved' | 'deleted' | 'loaded'
  onNameChange: (name: string) => void
  onSelectionChange: (id: string) => void
  onSave: () => void
  onUpdate: () => void
  onLoad: () => void
  onDelete: () => void
  onCopyConfiguration: () => void
  onCopyShareLink: () => void
  onUndoDelete: () => void
}

export function PresetLibraryPanel(props: PresetLibraryPanelProps) {
  return (
    <details className="composer__advanced">
      <summary>Saved setups &amp; sharing</summary>
      <div className="composer__advanced-body">
        <label className="composer__slider" htmlFor="saved-setup-name">
          <span>Name</span>
          <input
            id="saved-setup-name"
            type="text"
            value={props.name}
            maxLength={200}
            onChange={(event) => props.onNameChange(event.target.value)}
          />
        </label>

        <label className="composer__slider" htmlFor="saved-setup-select">
          <span>Saved setups</span>
          <select
            id="saved-setup-select"
            value={props.selectedId}
            onChange={(event) => props.onSelectionChange(event.target.value)}
          >
            <option value="">None saved</option>
            {props.library.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}: {new Date(item.createdAt).toLocaleString()}
              </option>
            ))}
          </select>
          <span className="composer__slider-val">{props.library.length}</span>
        </label>

        {props.warning && (
          <p className="composer__hint" role="alert">
            {props.warning}
          </p>
        )}

        <div className="composer__quick-buttons">
          <button type="button" onClick={props.onSave}>
            Save new
          </button>
          <button type="button" onClick={props.onUpdate} disabled={!props.hasSelection}>
            Update
          </button>
          <button type="button" onClick={props.onLoad} disabled={!props.hasSelection}>
            Load
          </button>
          <button type="button" onClick={props.onDelete} disabled={!props.hasSelection}>
            Delete
          </button>
          <button type="button" onClick={props.onCopyConfiguration}>
            Copy configuration
          </button>
          <button type="button" onClick={props.onCopyShareLink}>
            Copy share link
          </button>
        </div>

        {props.copyStatus !== 'idle' && (
          <p className="composer__hint" role="status">
            {props.copyStatus === 'copied' &&
              props.copyAction === 'configuration' &&
              'Configuration copied.'}
            {props.copyStatus === 'copied' &&
              props.copyAction === 'share-link' &&
              'Share link copied.'}
            {props.copyStatus === 'failed' &&
              props.copyAction === 'configuration' &&
              'Configuration could not be copied.'}
            {props.copyStatus === 'failed' &&
              props.copyAction === 'share-link' &&
              'Share link could not be copied.'}
          </p>
        )}

        {(props.saveStatus !== 'idle' || props.canUndoDelete) && (
          <p className="composer__hint" role="status">
            {props.saveStatus === 'saved' && 'Saved setup updated.'}
            {props.saveStatus === 'loaded' && 'Saved setup loaded.'}
            {props.saveStatus === 'deleted' && 'Saved setup deleted. '}
            {props.canUndoDelete && (
              <button type="button" className="ie-inlineAction" onClick={props.onUndoDelete}>
                Undo
              </button>
            )}
          </p>
        )}
      </div>
    </details>
  )
}
