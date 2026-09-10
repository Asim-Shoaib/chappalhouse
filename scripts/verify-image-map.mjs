#!/usr/bin/env node
// Checks data/image-map.json against the real catalog and the converted images.
//
//   node scripts/verify-image-map.mjs
//
// Fails on: unknown slug, missing file, or one photo assigned to two products.

import { readFile, readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'
import { parseSheet } from './import-stock.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const IMAGES = join(root, 'apps', 'storefront', 'public', 'products')

const wb = XLSX.read(await readFile(join(root, 'docs', 'Chappal House.xlsx')), {
  type: 'buffer',
})
const products = parseSheet(wb.Sheets[wb.SheetNames[0]])
const validSlugs = new Set(products.map((p) => p.slug))

const map = JSON.parse(await readFile(join(root, 'data', 'image-map.json'), 'utf8'))
const entries = Object.entries(map).filter(([k]) => !k.startsWith('_'))

const available = new Set(
  (await readdir(IMAGES))
    .filter((f) => f.endsWith('.webp') && !f.endsWith('-thumb.webp'))
    .map((f) => f.replace('.webp', '')),
)

const errors = []
const seen = new Map()

for (const [slug, images] of entries) {
  if (!validSlugs.has(slug)) {
    errors.push(`unknown slug "${slug}" — not in the stock sheet`)
  }
  for (const img of images) {
    if (!available.has(img)) {
      errors.push(`${slug}: missing image file "${img}.webp"`)
    }
    if (seen.has(img)) {
      errors.push(`${img} assigned to both "${seen.get(img)}" and "${slug}"`)
    }
    seen.set(img, slug)
  }
}

const mapped = new Set(entries.map(([s]) => s))
const unmapped = [...validSlugs].filter((s) => !mapped.has(s))
const unused = [...available].filter((i) => !seen.has(i))

console.log(`Products with photos: ${mapped.size}/${validSlugs.size}`)
console.log(`Photos assigned:      ${seen.size}/${available.size}`)

if (unmapped.length) {
  console.log(`\nProducts with NO photos (${unmapped.length}):`)
  for (const s of unmapped) console.log(`  ${s}`)
}
if (unused.length) {
  console.log(`\nUnassigned photos (${unused.length}):`)
  for (const i of unused.sort()) console.log(`  ${i}`)
}

if (errors.length) {
  console.log(`\n${errors.length} ERRORS:`)
  for (const e of errors) console.log(`  ${e}`)
  process.exit(1)
}
console.log('\nImage map valid.')
