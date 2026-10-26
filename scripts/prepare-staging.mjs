import { copyFile, cp, mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const npmCli = process.env.npm_execpath
if (!npmCli) throw new Error('Use npm run prepare:staging.')
const baseline = join(root, 'release/local-baseline-manifest.json')
await mkdir(join(root, 'release'), { recursive: true })
try { await copyFile(join(root, 'release/manifest.json'), baseline, constants.COPYFILE_EXCL) }
catch (error) { if (error.code !== 'EEXIST') throw error }

try { await access(join(root, 'staging-dist')); throw new Error('staging-dist already exists. Preserve the reviewed candidate before creating a new one.') }
catch (error) { if (error.code !== 'ENOENT') throw error }
const result = spawnSync(process.execPath, [npmCli, 'run', 'build'], { cwd: root, stdio: 'inherit' })
if (result.status !== 0) process.exit(result.status ?? 1)
await cp(join(root, 'dist'), join(root, 'staging-dist'), { recursive: true, errorOnExist: true, force: false })
const headers = await readFile(join(root, 'staging-dist/_headers'), 'utf8')
await writeFile(join(root, 'staging-dist/_headers'), headers + '\n/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n')
console.log('Prepared a separate staging runtime. No upload, DNS change or production deployment was performed.')
const checked = spawnSync(process.execPath, [join(root, 'scripts/check-staging.mjs')], { cwd: root, stdio: 'inherit' })
process.exitCode = checked.status ?? 1
