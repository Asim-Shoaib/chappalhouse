import 'server-only'

import { createHash, createHmac } from 'node:crypto'
import type { NextRequest, NextResponse } from 'next/server'

const COOKIE_PRODUCTION = '__Host-chappal_receipts'
const COOKIE_DEVELOPMENT = 'chappal_receipts'
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export function receiptCookieName() {
  return process.env.NODE_ENV === 'production' ? COOKIE_PRODUCTION : COOKIE_DEVELOPMENT
}

export function getReceiptSecret() {
  const secret = process.env.RECEIPT_TOKEN_SECRET
  if (!secret || secret.length < 32) throw new Error('Receipt security is not configured')
  return secret
}

export function deriveReceiptToken(idempotencyKey: string) {
  return createHmac('sha256', getReceiptSecret())
    .update(`receipt-session:${idempotencyKey}`)
    .digest('base64url')
}

export function receiptTokenHash(token: string) {
  if (!TOKEN_PATTERN.test(token)) throw new Error('Invalid receipt session')
  return createHash('sha256').update(token).digest('hex')
}

export function receiptTokenFromRequest(request: NextRequest) {
  const token = request.cookies.get(receiptCookieName())?.value
  return token && TOKEN_PATTERN.test(token) ? token : null
}

export function setReceiptCookie(response: NextResponse, token: string) {
  if (!TOKEN_PATTERN.test(token)) throw new Error('Invalid receipt session')
  response.cookies.set(receiptCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  })
}
