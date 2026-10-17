import { spawnSync } from 'node:child_process'
import { getPagesBasePath } from './pages-config.mjs'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const basePath = getPagesBasePath()
const result = spawnSync(
  npmCommand,
  ['run', 'preview', '--', `--base=${basePath}`, ...process.argv.slice(2)],
  // Node refuses to spawn .cmd files without a shell on Windows.
  { stdio: 'inherit', shell: process.platform === 'win32' },
)

if (result.error) throw result.error
process.exit(result.status ?? 1)
