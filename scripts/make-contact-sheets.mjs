#!/usr/bin/env node
// Builds contact sheets from the already-converted WebP thumbnails so photos
// can be matched to SKUs by eye. Output goes to a directory you pass in.
//
//   node scripts/make-contact-sheets.mjs <outputDir>
//
// Cells are laid out left-to-right, top-to-bottom in filename order, and the
// mapping is written alongside as sheet-NN.txt. Labels are not burned into the
// image: drawtext needs a fontconfig setup that many ffmpeg builds lack.

import { readdir, mkdir, writeFile } from 'node:fs/promises'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = join(root, 'apps', 'storefront', 'public', 'products')
const OUT = process.argv[2]

const COLS = 4
const ROWS = 3
const CELL = 300

if (!OUT) {
  console.error('Usage: make-contact-sheets.mjs <outputDir>')
  process.exit(1)
}

await mkdir(OUT, { recursive: true })

const thumbs = (await readdir(SOURCE))
  .filter((f) => f.endsWith('-thumb.webp'))
  .sort()

const perSheet = COLS * ROWS
const sheets = Math.ceil(thumbs.length / perSheet)

for (let s = 0; s < sheets; s++) {
  const batch = thumbs.slice(s * perSheet, (s + 1) * perSheet)
  const sheetName = `sheet-${String(s + 1).padStart(2, '0')}`

  const args = []
  for (const t of batch) args.push('-i', join(SOURCE, t))

  const scaled = batch
    .map(
      (_, i) =>
        `[${i}:v]scale=${CELL}:${CELL}:force_original_aspect_ratio=decrease,` +
        `pad=${CELL}:${CELL}:(ow-iw)/2:(oh-ih)/2:color=0x1a1a1a[c${i}]`,
    )
    .join(';')

  const layout = batch
    .map((_, i) => `${(i % COLS) * CELL}_${Math.floor(i / COLS) * CELL}`)
    .join('|')

  args.push(
    '-filter_complex',
    `${scaled};${batch.map((_, i) => `[c${i}]`).join('')}` +
      `xstack=inputs=${batch.length}:layout=${layout}:fill=0x1a1a1a[out]`,
    '-map',
    '[out]',
    '-y',
    '-loglevel',
    'error',
    join(OUT, `${sheetName}.jpg`),
  )

  try {
    await run('ffmpeg', args)
    const legend = batch
      .map((t, i) => {
        const row = Math.floor(i / COLS) + 1
        const col = (i % COLS) + 1
        return `r${row}c${col}  ${basename(t, '-thumb.webp')}`
      })
      .join('\n')
    await writeFile(join(OUT, `${sheetName}.txt`), legend + '\n')
    console.log(`${sheetName}.jpg — ${batch.length} images`)
  } catch (err) {
    console.error(`${sheetName} failed: ${err.message.split('\n')[0]}`)
  }
}

console.log(`\n${sheets} sheets in ${OUT}`)
