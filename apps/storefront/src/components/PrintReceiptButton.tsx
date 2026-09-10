'use client'

export function PrintReceiptButton() {
  return <button type="button" className="button receipt-print" onClick={() => window.print()}>Print / Save as PDF</button>
}
