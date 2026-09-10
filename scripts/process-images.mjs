#!/usr/bin/env node
// Converts the HEIC originals in assets/ to web-ready WebP.
//
//   node scripts/process-images.mjs
//
// Produces two sizes per photo into apps/storefront/public/products/:
//   <name>.webp        1400px wide — product detail
//   <name>-thumb.webp   600px wide — grid cards
//
// Requires ffmpeg on PATH. HEIC decoding uses a complex filtergraph internally,
// so scaling has to happen in a second pass — a `-vf` on the decode call fails
// with "Simple and complex filtering cannot be used together".

import { readdir, mkdir, rm } from 'node:fs/promises'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = join(root, 'assets')
const OUT = join(root, 'apps', 'storefront', 'public', 'products')
const TEMP = join(root, '.image-temp')

const SIZES = [
  { suffix: '', width: 1400, quality: 82 },
  { suffix: '-thumb', width: 600, quality: 80 },
]

async function convert(file) {
  const name = basename(file, '.HEIC').toLowerCase()
  const src = join(SOURCE, file)
  const intermediate = join(TEMP, `${name}.png`)

  // Pass 1: decode HEIC to PNG. No filters here.
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, intermediate])

  // Pass 2: scale and encode to WebP.
  for (const { suffix, width, quality } of SIZES) {
    await run('ffmpeg', [
      '-y',
      '-loglevel',
      'error',
      '-i',
      intermediate,
      '-vf',
      `scale=${width}:-1`,
      '-quality',
      String(quality),
      join(OUT, `${name}${suffix}.webp`),
    ])
  }

  await rm(intermediate, { force: true })
  return name
}

async function main() {
  await mkdir(OUT, { recursive: true })
  await mkdir(TEMP, { recursive: true })

  const files = (await readdir(SOURCE)).filter((f) => f.toUpperCase().endsWith('.HEIC')).sort()
  console.log(`Converting ${files.length} images...`)

  let done = 0
  const failures = []

  // Four at a time: ffmpeg is CPU-bound and unbounded concurrency thrashes.
  const queue = [...files]
  const workers = Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const file = queue.shift()
      try {
        await convert(file)
        done++
        if (done % 20 === 0) console.log(`  ${done}/${files.length}`)
      } catch (err) {
        failures.push({ file, message: err.message.split('\n')[0] })
      }
    }
  })
  await Promise.all(workers)

  await rm(TEMP, { recursive: true, force: true })

  console.log(`\nConverted ${done}/${files.length} to ${OUT}`)
  if (failures.length) {
    console.log(`\n${failures.length} failed:`)
    for (const f of failures) console.log(`  ${f.file}: ${f.message}`)
  }
}

main().catch((err) => {
  console.error(`FAILED: ${err.message}`)
  process.exit(1)
})
