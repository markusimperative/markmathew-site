import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { resolve, dirname, basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { counterEntry } from './counter-entry.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const game = resolve(root, '../the-counter')
const output = join(root, 'dist')
const npmCli = process.env.npm_execpath
if (!npmCli) throw new Error('Run this build with npm run build.')

const built = spawnSync(process.execPath, [npmCli, '--prefix', game, 'run', 'build:site'], { stdio: 'inherit' })
if (built.status !== 0) process.exit(built.status ?? 1)

// Only the independently built runtime is consumed. Source, QA and responses never enter the website.
const allowed = ['index.html', 'favicon.svg', 'assets', 'art', 'audio']
const entries = await readdir(join(game, 'dist'))
if (entries.some(entry => !allowed.includes(entry)) || !entries.includes('index.html')) throw new Error('Unexpected game build contents; nothing copied.')
if (dirname(resolve(output)) !== root || basename(output) !== 'dist') throw new Error('Unsafe output directory')
console.log('Rebuilding only:', output)
await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })
await cp(join(root, 'site'), output, { recursive: true })
const destination = join(output, 'experiments', 'the-counter')
await mkdir(destination, { recursive: true })
for (const entry of entries) await cp(join(game, 'dist', entry), join(destination, entry), { recursive: (await stat(join(game, 'dist', entry))).isDirectory() })
const entry = join(destination, 'index.html')
await writeFile(entry, counterEntry(await readFile(entry, 'utf8')))
console.log('Prepared /, /experiments/, and /experiments/the-counter/. No deployment performed.')
