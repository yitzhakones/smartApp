// =============================================================================
// scripts/import-mc-questions.mjs — import the multiple-choice starter bank
// (migration 013) from a CSV file into the `questions` table.
//
// Same idempotency pattern as scripts/import-question-bank.mjs: each row's id
// is a deterministic UUID derived from a stable key (category|age_band|
// text_en) and rows are upserted on `id`, so re-running (e.g. after a
// corrected CSV) updates in place rather than duplicating. difficulty_tier/
// answer_key_he/answer_key_en are deliberately NOT set — they stay NULL,
// which is what marks a row as legacy-vs-multiple-choice is actually
// correct_index (see migration 013's header): those three columns are
// meaningless for a fixed-option question.
//
// QA POLICY (explicit instruction): this script FLAGS anything that looks
// like a factual/structural problem — it never silently fixes or drops a row.
// Every flagged row still gets imported as-is; the flags are for a human to
// act on afterward. Two systematic issues are checked for on every run (see
// checkForKnownIssues below) because a first pass over the actual CSV content
// found them at meaningful scale — see this script's own console output, and
// the import commit message, for what was found the first time this ran.
//
// Usage:
//   node --env-file=.env.local scripts/import-mc-questions.mjs [path/to.csv]
// Defaults to docs/mc-question-bank-final.csv if no path is given.
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
      '(run: node --env-file=.env.local scripts/import-mc-questions.mjs)'
  )
  process.exit(1)
}

const csvPath = process.argv[2] ?? 'docs/mc-question-bank-final.csv'

// Same derivation family as import-question-bank.mjs/seed-questions.mjs, keyed
// on age_band instead of difficulty_tier (MC rows have no tier — age_band is
// their equivalent selection axis). Different key shape than the legacy
// scripts on purpose: an MC row and a legacy row for the "same" question text
// must never collide on id, since they're genuinely different content types.
function uuidFrom(key) {
  const h = createHash('md5').update(key).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}

const EXPECTED_CATEGORIES = [
  'math',
  'science',
  'israeli_history',
  'general_knowledge',
  'english_vocabulary',
]
const EXPECTED_AGE_BANDS = ['10-11', '12-13', '14-16']
const EXPECTED_COLUMNS = [
  'category',
  'age_band',
  'text_he',
  'text_en',
  'option1',
  'option2',
  'option3',
  'option1_en',
  'option2_en',
  'option3_en',
  'correct_index',
]

/**
 * Minimal RFC4180 CSV parser — identical to import-question-bank.mjs's own
 * (quoted fields, embedded commas/newlines, "" as an escaped quote).
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

// Hebrew Unicode block (U+0590-U+05FF), built via RegExp + fromCharCode
// rather than a literal character-class range so this source file stays pure
// ASCII (no embedded RTL characters) — used only to FLAG a suspicious *_en
// field, never to reject/alter a row.
const HEBREW_RE = new RegExp(`[${String.fromCharCode(0x0590)}-${String.fromCharCode(0x05ff)}]`)

const csvText = readFileSync(csvPath, 'utf8')
const [header, ...dataRows] = parseCsv(csvText)

if (EXPECTED_COLUMNS.some((col, i) => header[i] !== col)) {
  console.error(`Unexpected CSV header.\n  expected: ${EXPECTED_COLUMNS.join(',')}\n  got:      ${header.join(',')}`)
  process.exit(1)
}

const flags = []
function flag(lineNum, message) {
  flags.push(`Row ${lineNum}: ${message}`)
}

const rows = dataRows.map((cols, i) => {
  const lineNum = i + 2 // +1 for the header row, +1 for 1-indexing
  if (cols.length !== EXPECTED_COLUMNS.length) {
    console.error(`Row ${lineNum}: expected ${EXPECTED_COLUMNS.length} columns, got ${cols.length}`)
    process.exit(1)
  }
  const [category, age_band, text_he, text_en, option1, option2, option3, option1_en, option2_en, option3_en, correct_index_raw] =
    cols

  if (!EXPECTED_CATEGORIES.includes(category)) {
    console.error(`Row ${lineNum}: invalid category "${category}"`)
    process.exit(1)
  }
  if (!EXPECTED_AGE_BANDS.includes(age_band)) {
    console.error(`Row ${lineNum}: invalid age_band "${age_band}"`)
    process.exit(1)
  }
  if (!text_he || !text_en || !option1 || !option2 || !option3 || !option1_en || !option2_en || !option3_en) {
    console.error(`Row ${lineNum}: missing a required field`)
    process.exit(1)
  }
  const correct_index = Number(correct_index_raw)
  if (!Number.isInteger(correct_index) || correct_index < 0 || correct_index > 2) {
    console.error(`Row ${lineNum}: correct_index must be 0, 1, or 2 — got "${correct_index_raw}"`)
    process.exit(1)
  }

  // --- QA flags (non-fatal — the row still imports as-is) ---------------
  // A row whose *_en option looks like it was never actually translated
  // (still contains Hebrew characters) would show the child a Hebrew answer
  // choice on an English-locale question — a real content bug, not a false
  // positive: english_vocabulary's text_en legitimately quotes the Hebrew
  // word being translated (that's the question itself), so only the OPTION
  // columns are checked here, never text_en.
  if (HEBREW_RE.test(option1_en) || HEBREW_RE.test(option2_en) || HEBREW_RE.test(option3_en)) {
    flag(
      lineNum,
      `*_en option(s) contain untranslated Hebrew — option1_en="${option1_en}" option2_en="${option2_en}" option3_en="${option3_en}"`
    )
  }

  return {
    id: uuidFrom(`${category}|${age_band}|${text_en}`),
    category,
    age_band,
    text_he,
    text_en,
    option1_he: option1,
    option2_he: option2,
    option3_he: option3,
    option1_en,
    option2_en,
    option3_en,
    correct_index,
  }
})

// Guard against two CSV rows accidentally colliding on the same id (same
// category+age_band+text_en) — upsert would silently keep only the last one.
const seenAt = new Map()
for (const [i, r] of rows.entries()) {
  if (seenAt.has(r.id)) {
    console.error(
      `Duplicate question (same category+age_band+text_en) at CSV rows ${seenAt.get(r.id) + 2} and ${i + 2}: "${r.text_en}"`
    )
    process.exit(1)
  }
  seenAt.set(r.id, i)
}

// Systematic QA flag: correct_index distribution. A bank where every single
// row's correct answer sits at the same index is a real integrity problem —
// a child (or anyone) could earn every star by always tapping the first
// option, without reading a single question, which directly undermines the
// "reward traces to an actual correct answer" principle this whole platform
// is built on. Flagged, not fixed here — shuffling option order/correct_index
// is a content decision, not something to silently rewrite mid-import.
const indexCounts = rows.reduce((acc, r) => {
  acc[r.correct_index] = (acc[r.correct_index] ?? 0) + 1
  return acc
}, {})
if (Object.keys(indexCounts).length === 1) {
  flags.unshift(
    `GLOBAL: every one of ${rows.length} rows has correct_index=${Object.keys(indexCounts)[0]} — the correct answer is ALWAYS in the same position. A child could earn every star by always tapping the same option without reading any question.`
  )
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { error } = await supabase.from('questions').upsert(rows, { onConflict: 'id' })
if (error) {
  console.error('Import failed:', error.message)
  console.error(
    'If this mentions a missing column (option1_he / age_band / correct_index / etc.), migration 013 has not been applied to this database yet — apply it first, then re-run this script.'
  )
  process.exit(1)
}

const { count, error: countErr } = await supabase
  .from('questions')
  .select('id', { count: 'exact', head: true })
if (countErr) {
  console.error('Import succeeded, but the verification count query failed:', countErr.message)
  process.exit(1)
}

console.log(`Imported ${rows.length} multiple-choice question(s) from ${csvPath}.`)
console.log(`questions table now has ${count} row(s) total (legacy free-text + multiple-choice combined).`)

if (flags.length > 0) {
  console.log(`\n⚠ ${flags.length} QA flag(s) — imported as-is, review needed:`)
  for (const f of flags) console.log(`  - ${f}`)
} else {
  console.log('\nNo QA flags raised.')
}
