#!/usr/bin/env node
// Downloads generated GLB meshes and compresses them for the web.
//
//   node scripts/fetch-models.mjs
//
// Reads data/model-map.json — a hand-maintained slug -> source URL map — and
// writes apps/storefront/public/models/<slug>.glb.
//
// Raw meshes arrive around 55 MB: a 1.9M-triangle surface with three 4K PBR
// maps. Both need cutting, but they are separate problems with separate
// budgets, so each stage runs explicitly rather than through `optimize`.
//
// GEOMETRY. `--ratio 0.06` keeps ~115K triangles. That number is deliberate:
// an earlier pass used `optimize --simplify-error 0.001`, which collapsed the
// same mesh to 20K triangles and produced a visibly melted silhouette — straps
// lost their braid, the sole edge went soft. Holding the ratio and letting
// error float keeps the detail at effectively the same file size, because
// Draco encodes the extra triangles cheaply. Do not swap this back to an
// error-driven simplify without re-checking the triangle count that results.
//
// TEXTURES. Albedo stays 4K — it carries the branding, stitching and grain
// that the whole viewer exists to show. The normal and roughness maps drop to
// 2K, which is imperceptible in a 600px canvas and takes GPU memory from
// 268 MB to 134 MB. That ceiling matters: mobile Safari kills a tab that
// allocates too much VRAM, so the untouched version crashed phones.
//
// ffmpeg does the resize because gltf-transform's sharp/libvips build fails on
// these maps with "colourspace: parameter space not set" — the same bug that
// blocks its texture compression. ffmpeg is already a dependency of the photo
// pipeline, so this adds nothing new to install.

import { readFile, mkdir, rm, readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const MAP = join(root, 'data', 'model-map.json')
const OUT = join(root, 'apps', 'storefront', 'public', 'models')
const WORK = join(root, '.3d-work')

// Keep ~6% of the source triangles. See the geometry note above before changing.
const SIMPLIFY_RATIO = '0.06'
// Maps that describe surface response rather than colour; safe to halve.
const SECONDARY_MAP_PX = 2048

// shell:true — on Windows npx is a .cmd shim, which Node refuses to spawn
// directly (EINVAL) since it added the batch-file argument guard.
const gltf = (...args) =>
  run('npx', ['--yes', '@gltf-transform/cli@latest', ...args.map((a) => `"${a}"`)], {
    shell: true,
  })

async function fetchModel(slug, url) {
  const dir = join(WORK, slug)
  await rm(dir, { recursive: true, force: true })
  await mkdir(dir, { recursive: true })

  const raw = join(dir, 'raw.glb')
  const simplified = join(dir, 'simplified.glb')
  const unpacked = join(dir, 'model.gltf')
  const final = join(OUT, `${slug}.glb`)

  // curl rather than fetch: the sandboxed Node runtime has no outbound socket,
  // so global fetch fails before it reaches the CDN.
  await run('curl', ['-sfL', '-o', raw, url])

  await gltf('simplify', raw, simplified, '--ratio', SIMPLIFY_RATIO, '--error', '0.0005')

  // Unpacking writes the textures out as loose files so ffmpeg can reach them.
  await gltf('copy', simplified, unpacked)

  for (const file of await readdir(dir)) {
    // Match the secondary maps by name and leave baseColor untouched.
    if (!/^(metallicRoughness|normal)_/i.test(file)) continue
    const path = join(dir, file)
    const resized = join(dir, `resized-${file}`)
    await run('ffmpeg', [
      '-y',
      '-loglevel', 'error',
      '-i', path,
      '-vf', `scale=${SECONDARY_MAP_PX}:${SECONDARY_MAP_PX}:flags=lanczos`,
      '-q:v', '3',
      resized,
    ])
    // Overwrite in place so the .gltf's existing URI still resolves.
    await run('cmd', ['/c', 'move', '/y', resized, path], { shell: true })
  }

  await gltf('draco', unpacked, final)
  await rm(dir, { recursive: true, force: true })
  return final
}

async function main() {
  await mkdir(OUT, { recursive: true })

  const map = JSON.parse(await readFile(MAP, 'utf8'))
  const entries = Object.entries(map).filter(([slug]) => !slug.startsWith('_'))

  console.log(`Fetching ${entries.length} models...`)
  const failures = []

  for (const [slug, url] of entries) {
    try {
      await fetchModel(slug, url)
      console.log(`  ${slug}`)
    } catch (err) {
      failures.push({ slug, message: err.message.split('\n')[0] })
    }
  }

  console.log(`\nDone: ${entries.length - failures.length}/${entries.length}`)
  if (failures.length) {
    console.log(`\n${failures.length} failed:`)
    for (const f of failures) console.log(`  ${f.slug}: ${f.message}`)
  }
}

main().catch((err) => {
  console.error(`FAILED: ${err.message}`)
  process.exit(1)
})
