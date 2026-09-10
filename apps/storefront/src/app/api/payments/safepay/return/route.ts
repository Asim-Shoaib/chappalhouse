import { NextRequest, NextResponse } from 'next/server'

function returnToReceipt(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/order/received', request.url), 303)
  response.headers.set('Cache-Control', 'no-store')
  response.headers.set('Referrer-Policy', 'no-referrer')
  return response
}

export const GET = returnToReceipt
export const POST = returnToReceipt
