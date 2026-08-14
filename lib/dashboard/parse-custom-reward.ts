// The send-bonus panel's free-text field (mockup: "או הקלידי סכום/פינוק משלך")
// accepts either a custom money amount or a custom privilege — the mock never
// disambiguates the two beyond a placeholder hint, but real data needs a
// definite `kind` before it can be written to reward_ledger. Rule: if the
// trimmed text is nothing but a number (optionally with a ₪ sign), it's a money
// amount; otherwise it's a privilege label, verbatim.

export type ParsedCustomReward =
  | { kind: 'money'; label: string; amountNis: number }
  | { kind: 'privilege'; label: string; amountNis: null }

const MONEY_PATTERN = /^₪?\s*(\d+(?:\.\d{1,2})?)\s*₪?$/

export function parseCustomReward(raw: string): ParsedCustomReward | null {
  const text = raw.trim()
  if (!text) return null

  const match = text.match(MONEY_PATTERN)
  if (match) {
    const amountNis = Number(match[1])
    if (amountNis > 0) return { kind: 'money', label: `₪${amountNis}`, amountNis }
  }

  return { kind: 'privilege', label: text, amountNis: null }
}
