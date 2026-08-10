// Compatibility facade for existing preset imports. Domain implementations live in ./preset.
export {
  applyPresetPayload,
  createPresetPayload,
  decodePresetPayload,
  encodePresetPayload,
  presetPayloadSchema,
} from './preset/payloadCodec'
export type { ApplyPresetPayloadCallbacks, PresetPayload } from './preset/payloadCodec'

export {
  DEFAULT_PRESET_NAME,
  LEGACY_PRESET_STORAGE_KEY,
  PRESET_LIBRARY_STORAGE_KEY,
  createPresetSnapshot,
  migrateLegacyPresetPayload,
  parsePresetLibrary,
  parsePresetLibraryWithDiagnostics,
  presetSnapshotV2Schema,
} from './preset/library'
export type {
  PresetLibraryParseDiagnostics,
  PresetLibraryParseReason,
  PresetLibraryParseResult,
  PresetSnapshotV2,
} from './preset/library'
