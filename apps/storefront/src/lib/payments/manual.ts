// Manual transfer details — Easypaisa, JazzCash, or a bank account the buyer
// sends to before the order is confirmed by hand.
//
// These are read from the environment rather than committed, so the account
// numbers never enter git history and can differ between preview and
// production. Every field is optional: a method with no account number simply
// does not appear at checkout.

export type ManualAccount = {
  id: 'easypaisa' | 'jazzcash' | 'bank'
  label: string
  accountName: string
  accountNumber: string
  extra?: string
}

function account(
  id: ManualAccount['id'],
  label: string,
  number: string | undefined,
  name: string | undefined,
  extra?: string,
): ManualAccount | null {
  const accountNumber = number?.trim()
  const accountName = name?.trim()
  if (!accountNumber || !accountName) return null
  return { id, label, accountName, accountNumber, extra: extra?.trim() || undefined }
}

export function manualAccounts(): ManualAccount[] {
  const holder = process.env.MANUAL_PAYMENT_ACCOUNT_NAME

  return [
    account('easypaisa', 'Easypaisa', process.env.MANUAL_PAYMENT_EASYPAISA, holder),
    account('jazzcash', 'JazzCash', process.env.MANUAL_PAYMENT_JAZZCASH, holder),
    account(
      'bank',
      process.env.MANUAL_PAYMENT_BANK_NAME?.trim() || 'Bank transfer',
      process.env.MANUAL_PAYMENT_BANK_IBAN,
      holder,
      process.env.MANUAL_PAYMENT_BANK_NAME,
    ),
  ].filter((entry): entry is ManualAccount => entry !== null)
}

export const isManualPaymentConfigured = () => manualAccounts().length > 0

// How long the buyer has to send payment before the reservation lapses. Matches
// the 24h reservation window in create_storefront_order.
export const MANUAL_PAYMENT_WINDOW_HOURS = 24
