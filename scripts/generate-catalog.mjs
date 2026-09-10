#!/usr/bin/env node
// Generates data/catalog.json from the stock sheet, merging in the photo
// assignments from data/image-map.json so the storefront can render a real
// catalog before Supabase is provisioned.
//
//   node scripts/generate-catalog.mjs ["docs/Chappal House.xlsx"]

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'
import { parseSheet } from './import-stock.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = process.argv[2] ?? join(root, 'docs', 'Chappal House.xlsx')

const wb = XLSX.read(await readFile(source), { type: 'buffer' })
const products = parseSheet(wb.Sheets[wb.SheetNames[0]])

// Photo assignments are maintained by hand in data/image-map.json, keyed by
// product slug. Missing entries are not an error — a product simply renders
// its placeholder until photos are assigned.
let imageMap = {}
try {
  imageMap = JSON.parse(await readFile(join(root, 'data', 'image-map.json'), 'utf8'))
} catch {
  console.warn('No data/image-map.json — products will render placeholders')
}

const withImages = products.map((p) => ({
  ...p,
  images: imageMap[p.slug] ?? [],
}))

await mkdir(join(root, 'data'), { recursive: true })
await writeFile(
  join(root, 'data', 'catalog.json'),
  JSON.stringify(withImages, null, 2) + '\n',
)

const pairs = withImages.reduce((s, p) => s + p.total, 0)
const withPhotos = withImages.filter((p) => p.images.length > 0).length
console.log(`Wrote data/catalog.json — ${withImages.length} products, ${pairs} pairs`)
console.log(`${withPhotos}/${withImages.length} products have photos`)
