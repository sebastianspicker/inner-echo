import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

// The Vitest suite is kept out of the public repository, so public clones and CI have no tests/.
if (!existsSync(resolve(root, 'tests'))) {
  console.log('[test] tests/ is not present in this checkout (the suite is private); skipping.')
  process.exit(0)
}

// Node 25+ exposes an experimental global localStorage that shadows the jsdom implementation.
const storageFlag = '--no-experimental-webstorage'
const nodeOptions = [process.env.NODE_OPTIONS, storageFlag].filter(Boolean).join(' ')
const env =
  process.allowedNodeEnvironmentFlags.has(storageFlag) &&
  !process.env.NODE_OPTIONS?.includes(storageFlag)
    ? { ...process.env, NODE_OPTIONS: nodeOptions }
    : process.env

function run(arguments_) {
  const result = spawnSync(npmCommand, ['exec', '--', ...arguments_], {
    cwd: root,
    env,
    stdio: 'inherit',
    // Node refuses to spawn .cmd files without a shell on Windows.
    shell: process.platform === 'win32',
  })

  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run(['tsc', '-p', 'tsconfig.tests.json', '--noEmit'])
run(['vitest', 'run', ...process.argv.slice(2)])
