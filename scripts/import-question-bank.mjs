// =============================================================================
// scripts/import-question-bank.mjs — import the bilingual question bank from a
// CSV file into the `questions` table.
//
// Same idempotency pattern as scripts/seed-questions.mjs: each question's id is
// a deterministic UUID derived from a stable key (category|difficulty_tier|
// text_en) and rows are upserted on `id`, so re-running updates in place rather
// than duplicating — and a question that happens to already exist (same
// category+tier+text_en) merges instead of double-counting.
//
// Usage:
//   node --env-file=.env.local scripts/import-question-bank.mjs [path/to.csv]
// Defaults to docs/question-bank-seed.csv if no path is given.
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
// =============================================================================

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error(
    'Missing env: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY\n' +
      '(run: node --env-file=.env.local scripts/import-question-bank.mjs)'
  )
  process.exit(1)
}

const csvPath = process.argv[2] ?? 'docs/question-bank-seed.csv'

// Same derivation as seed-questions.mjs — must stay identical so the two
// scripts can never independently mint two different ids for "the same"
// question.
function uuidFrom(key) {
  const h = createHash('md5').update(key).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}

const EXPECTED_CATEGORIES = ['math', 'science', 'israeli_history', 'general_knowledge']
const EXPECTED_TIERS = ['easy', 'medium', 'hard']
const EXPECTED_COLUMNS = ['category', 'difficulty_tier', 'text_he', 'text_en', 'answer_key_he', 'answer_key_en']

/**
 * Minimal RFC4180 CSV parser: quoted fields, embedded commas/newlines, and ""
 * as an escaped quote (needed here — several rows quote a field containing a
 * comma, e.g. "What is the average of 4, 9, 14, 21?", or a literal " for cm/
 * km abbreviations, e.g. 7 ס""מ). Returns an array of rows, each an array of
 * fields.
 */
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  let i = 0
  const s = text.replace(/\r\n/g, '\n')

  while (i < s.length) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += c
      i++
      continue
    }
    if (c === '"') {
      inQuotes = true
      i++
      continue
    }
    if (c === ',') {
      row.push(field)
      field = ''
      i++
      continue
    }
    if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i++
      continue
    }
    field += c
    i++
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''))
}

const csvText = readFileSync(csvPath, 'utf8')
const [header, ...dataRows] = parseCsv(csvText)

if (EXPECTED_COLUMNS.some((col, i) => header[i] !== col)) {
  console.error(`Unexpected CSV header.\n  expected: ${EXPECTED_COLUMNS.join(',')}\n  got:      ${header.join(',')}`)
  process.exit(1)
}

const rows = dataRows.map((cols, i) => {
  const lineNum = i + 2 // +1 for the header row, +1 for 1-indexing
  if (cols.length !== EXPECTED_COLUMNS.length) {
    console.error(`Row ${lineNum}: expected ${EXPECTED_COLUMNS.length} columns, got ${cols.length}`)
    process.exit(1)
  }
  const [category, difficulty_tier, text_he, text_en, answer_key_he, answer_key_en] = cols
  if (!EXPECTED_CATEGORIES.includes(category)) {
    console.error(`Row ${lineNum}: invalid category "${category}"`)
    process.exit(1)
  }
  if (!EXPECTED_TIERS.includes(difficulty_tier)) {
    console.error(`Row ${lineNum}: invalid difficulty_tier "${difficulty_tier}"`)
    process.exit(1)
  }
  if (!text_he || !text_en || !answer_key_he || !answer_key_en) {
    console.error(`Row ${lineNum}: missing a required field`)
    process.exit(1)
  }
  return {
    id: uuidFrom(`${category}|${difficulty_tier}|${text_en}`),
    category,
    difficulty_tier,
    text_he,
    text_en,
    answer_key_he,
    answer_key_en,
  }
})

// Guard against two CSV rows accidentally colliding on the same id (same
// category+tier+text_en) — upsert would silently keep only the last one.
const seenAt = new Map()
for (const [i, r] of rows.entries()) {
  if (seenAt.has(r.id)) {
    console.error(
      `Duplicate question (same category+tier+text_en) at CSV rows ${seenAt.get(r.id) + 2} and ${i + 2}: "${r.text_en}"`
    )
    process.exit(1)
  }
  seenAt.set(r.id, i)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { error } = await supabase.from('questions').upsert(rows, { onConflict: 'id' })
if (error) {
  console.error('Import failed:', error.message)
  process.exit(1)
}

const { count, error: countErr } = await supabase
  .from('questions')
  .select('id', { count: 'exact', head: true })
if (countErr) {
  console.error('Import succeeded, but the verification count query failed:', countErr.message)
  process.exit(1)
}

console.log(`Imported ${rows.length} question(s) from ${csvPath}.`)
console.log(`questions table now has ${count} row(s) total.`)
