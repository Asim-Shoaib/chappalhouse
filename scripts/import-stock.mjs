#!/usr/bin/env node
// Import stock counts from the Excel sheet into Supabase.
//
//   npm run stock:import -- docs/"Chappal House.xlsx" --batch 1
//   npm run stock:import -- docs/batch2.xlsx --batch 2 --dry-run
//
// Expected sheet layout (matches docs/Chappal House.xlsx):
//   column D  = product name, or a bare category header ("Chappal", "Khussay")
//   columns E..J = sizes 36..41, cell value = pairs in stock
//
// Stock is applied as a batch_intake movement, never by writing stock_qty
// directly. The ledger stays the single source of truth for how stock got there.

import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'

const SIZES = [36, 37, 38, 39, 40, 41]
const CATEGORY_HEADERS = new Map([
  ['chappal', 'chappal'],
  ['chappals', 'chappal'],
  ['khussa', 'khussa'],
  ['khussay', 'khussa'],
  ['khussey', 'khussa'],
])

function parseArgs(argv) {
  const args = { file: null, batch: null, dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') args.dryRun = true
    else if (a === '--batch') args.batch = argv[++i]
    else if (!a.startsWith('--')) args.file ??= a
  }
  if (!args.file) throw new Error('Usage: import-stock.mjs <file.xlsx> --batch <n> [--dry-run]')
  if (!args.batch) throw new Error('--batch is required so movements can be traced to an intake')
  return args
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Walks the sheet top to bottom. A row whose only content is a known category
// word switches the active category for the rows that follow it.
export function parseSheet(worksheet) {
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 'A', blankrows: false })
  const products = []
  let category = null

  for (const row of rows) {
    const rawName = row.D
    if (typeof rawName !== 'string') continue

    const name = rawName.trim()
    if (!name) continue

    const asCategory = CATEGORY_HEADERS.get(name.toLowerCase())
    const sizeCells = ['E', 'F', 'G', 'H', 'I', 'J']

    // The category row doubles as the size header: D="Chappal", E..J=36..41.
    // Those are the size labels, not stock, so this must be checked before
    // any cell is read as a quantity.
    const isSizeHeaderRow = sizeCells.every((c, i) => row[c] === SIZES[i])
    if (asCategory && isSizeHeaderRow) {
      category = asCategory
      continue
    }

    const counts = {}
    let total = 0

    for (let i = 0; i < SIZES.length; i++) {
      const v = row[sizeCells[i]]
      const n = typeof v === 'number' ? v : 0
      if (n > 0) {
        if (!Number.isInteger(n)) throw new Error(`"${name}" size ${SIZES[i]} must be a whole number`)
        counts[SIZES[i]] = n
        total += n
      }
    }

    // A bare category word with no stock also switches category — this is how
    // the second section ("Khussay") is written in the batch 1 sheet.
    if (asCategory && total === 0) {
      category = asCategory
      continue
    }

    if (!category) {
      console.warn(`  skipped "${name}" — appears before any category header`)
      continue
    }
    if (total === 0) {
      console.warn(`  skipped "${name}" — no stock in any size`)
      continue
    }

    products.push({ name, slug: slugify(name), category, counts, total })
  }

  return products
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  const buf = await readFile(args.file)
  const wb = XLSX.read(buf, { type: 'buffer' })
  const products = parseSheet(wb.Sheets[wb.SheetNames[0]])
  const slugs = products.map(({ slug }) => slug)
  if (new Set(slugs).size !== slugs.length) throw new Error('Duplicate product slug in stock sheet')

  const totalPairs = products.reduce((s, p) => s + p.total, 0)
  console.log(`Parsed ${products.length} products, ${totalPairs} pairs from ${args.file}`)
  for (const p of products) {
    const sizes = Object.entries(p.counts).map(([s, n]) => `${s}:${n}`).join(' ')
    console.log(`  ${p.category.padEnd(8)} ${p.name.padEnd(22)} ${String(p.total).padStart(3)}  ${sizes}`)
  }

  if (args.dryRun) {
    console.log('\n--dry-run: nothing written')
    return
  }

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }
  const db = createClient(url, key, { auth: { persistSession: false } })

  const lines = products.flatMap((product) => Object.entries(product.counts).map(([size, quantity]) => ({
    slug: product.slug,
    name: product.name,
    category: product.category,
    size: Number(size),
    quantity,
  })))
  const { data, error } = await db.rpc('import_storefront_stock', { p_intake_key: String(args.batch), p_lines: lines })
  if (error) throw new Error(`stock intake: ${error.message}`)

  console.log(data?.existing ? `\nBatch ${args.batch} was already imported; no stock changed.` : `\nImported batch ${args.batch}: ${products.length} products, ${totalPairs} pairs`)
  console.log('Set cost_paisa and price_paisa per product before launch.')
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`\nFAILED: ${err.message}`)
    process.exit(1)
  })
}
