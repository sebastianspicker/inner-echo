import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'

// The Vite manifest is a build-time input for pages:verify and bundle:verify. It is removed only
// here, as the last step before the candidate handoff, so both verifiers stay repeatable.
const manifestPath = resolve(import.meta.dirname, '../..', 'dist', 'manifest.json')

await rm(manifestPath, { force: true })

console.log('Pages artifact finalized: removed the build manifest.')
