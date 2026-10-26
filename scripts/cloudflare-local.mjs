import { spawn } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const commands = {
  preview: ['dev', '--local', '--ip', '127.0.0.1', '--port', '8787'],
  check: ['deploy', '--dry-run', '--outdir', '.wrangler/dry-run'],
  'check-staging': ['deploy', '--dry-run', '--config', 'wrangler.staging.jsonc', '--outdir', '.wrangler/staging-dry-run'],
}
const args = commands[process.argv[2]]
if (!args) throw new Error('Only local preview and dry-run validation are supported.')
const child = spawn(process.execPath, [join(root, 'node_modules/wrangler/bin/wrangler.js'), ...args], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, XDG_CONFIG_HOME: join(root, '.wrangler/config'), WRANGLER_LOG_PATH: join(root, '.wrangler/logs'), WRANGLER_SEND_METRICS: 'false', DO_NOT_TRACK: '1' },
})
child.on('error', error => { console.error(error.message); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })
