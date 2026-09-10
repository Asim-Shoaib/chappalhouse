// node --test scripts/import-stock.test.mjs

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import XLSX from 'xlsx'
import { parseSheet } from './import-stock.mjs'

async function loadBatch1() {
  const buf = await readFile(new URL('../docs/Chappal House.xlsx', import.meta.url))
  const wb = XLSX.read(buf, { type: 'buffer' })
  return parseSheet(wb.Sheets[wb.SheetNames[0]])
}

test('parses every product from the batch 1 sheet', async () => {
  const products = await loadBatch1()
  assert.equal(products.length, 23)
  assert.equal(products.filter((p) => p.category === 'chappal').length, 18)
  assert.equal(products.filter((p) => p.category === 'khussa').length, 5)
})

test('totals match the physical stock count', async () => {
  const products = await loadBatch1()
  const total = products.reduce((s, p) => s + p.total, 0)
  assert.equal(total, 93)

  const chappals = products.filter((p) => p.category === 'chappal')
  assert.equal(chappals.reduce((s, p) => s + p.total, 0), 82)

  const khussay = products.filter((p) => p.category === 'khussa')
  assert.equal(khussay.reduce((s, p) => s + p.total, 0), 11)
})

test('does not read the size header row as stock', async () => {
  const products = await loadBatch1()
  // D1 is "Chappal" with E1:J1 = 36..41. Read naively that row yields 231 pairs.
  assert.ok(!products.some((p) => p.name.toLowerCase() === 'chappal'))
  assert.ok(!products.some((p) => p.total === 231))
})

test('keeps per-size breakdown intact', async () => {
  const products = await loadBatch1()
  const brownBraids = products.find((p) => p.name === 'Brown Braids')
  assert.deepEqual(brownBraids.counts, { 36: 1, 38: 2, 39: 3 })
  assert.equal(brownBraids.total, 6)

  const white = products.find((p) => p.name === 'White' && p.category === 'khussa')
  assert.deepEqual(white.counts, { 36: 1, 37: 1, 38: 1, 39: 1, 40: 1 })
})

test('generates url-safe slugs', async () => {
  const products = await loadBatch1()
  for (const p of products) {
    assert.match(p.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, `bad slug for "${p.name}": ${p.slug}`)
  }
  assert.equal(products.find((p) => p.name === 'Sea Green Bow').slug, 'sea-green-bow')
})

test('slugs are unique across categories', async () => {
  const products = await loadBatch1()
  const slugs = products.map((p) => p.slug)
  assert.equal(new Set(slugs).size, slugs.length, 'duplicate slug would collide on upsert')
})

test('rejects fractional stock counts', () => {
  const worksheet = XLSX.utils.aoa_to_sheet([
    [null, null, null, 'Chappal', 36, 37, 38, 39, 40, 41],
    [null, null, null, 'Test Pair', 1.5],
  ])
  assert.throws(() => parseSheet(worksheet), /whole number/)
})
