import { collectChunkClosure } from '../shared/viteManifest.mjs'

const lazySources = {
  workspace: 'src/app/experience/ExperienceWorkspace.tsx',
  audio: 'src/runtime/audio/audioEngine.ts',
  evidence: 'src/app/experience/evidence/EvidenceDrawer.tsx',
  graphics: 'src/runtime/visual/graph/index.ts',
}
const forbidden = {
  welcome: ['workspace', 'audio', 'evidence', 'graphics'],
  workspace: ['audio', 'evidence', 'graphics'],
  audio: ['workspace', 'evidence', 'graphics'],
  evidence: ['workspace', 'audio', 'graphics'],
}

function findEntries(manifest, failures) {
  const entries = {}
  for (const [name, source] of Object.entries({ welcome: 'index.html', ...lazySources })) {
    const key = Object.keys(manifest).find((entry) => manifest[entry]?.src === source)
    const entryType = name === 'welcome' ? 'isEntry' : 'isDynamicEntry'
    if (!key || !manifest[key][entryType]) failures.push(`missing ${name} ${entryType}: ${source}`)
    entries[name] = key
  }
  return entries
}

function inspectClosure(manifest, name, closure) {
  const failures = []
  for (const key of closure) {
    const chunk = manifest[key]
    const identity = `${key} ${chunk?.src ?? ''} ${chunk?.file ?? ''} ${chunk?.name ?? ''}`
    const includesVisualRuntime = /three(?:\.core)?|runtime\/visual\/(?:effects|graph)/i.test(
      identity,
    )
    const includesAudioRuntime = /runtime\/audio\/(?:audioEngine|fx)/i.test(identity)
    if (includesVisualRuntime || (name !== 'audio' && includesAudioRuntime)) {
      failures.push(`${name} static closure contains deferred runtime: ${identity}`)
    }
  }
  return failures
}

export function inspectRuntimeBoundaries(manifest) {
  const failures = []
  const entries = findEntries(manifest, failures)
  for (const [name, deferred] of Object.entries(forbidden)) {
    if (!entries[name]) continue
    const closure = collectChunkClosure(manifest, [entries[name]], { includeDynamicImports: false })
    for (const boundary of deferred) {
      if (entries[boundary] && closure.includes(entries[boundary])) {
        failures.push(`${name} eagerly loads ${boundary}`)
      }
    }
    failures.push(...inspectClosure(manifest, name, closure))
  }
  return failures
}
