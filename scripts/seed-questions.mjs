// =============================================================================
// scripts/seed-questions.mjs — seed the shared question bank with sample content.
//
// A small bilingual (he/en) set covering all four categories × three difficulty
// tiers, enough to drive the placement quiz and daily sets in development. This
// is placeholder content for building against — the real, curriculum-calibrated
// bank is a separate content-authoring task.
//
// Idempotent: each question gets a deterministic UUID derived from a stable key,
// and rows are upserted on `id`, so re-running updates in place rather than
// duplicating.
//
// Run with Node's env-file loader (Node 20.6+):
//   node --env-file=.env.local scripts/seed-questions.mjs
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
// =============================================================================

import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error(
    'Missing env: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY\n' +
      '(run: node --env-file=.env.local scripts/seed-questions.mjs)'
  )
  process.exit(1)
}

// Deterministic UUID from a stable key → stable ids across runs (upsert target).
function uuidFrom(key) {
  const h = createHash('md5').update(key).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}

// [category, tier, text_he, text_en, answer_key_he, answer_key_en]
const QUESTIONS = [
  // --- math ---
  ['math', 'easy', 'כמה זה 7 + 5?', 'How much is 7 + 5?', '12', '12'],
  ['math', 'easy', 'כמה זה 9 - 4?', 'How much is 9 - 4?', '5', '5'],
  ['math', 'medium', 'כמה זה 12 × 4?', 'How much is 12 × 4?', '48', '48'],
  ['math', 'medium', 'כמה זה 144 ÷ 12?', 'What is 144 ÷ 12?', '12', '12'],
  ['math', 'hard', 'כמה זה 15% מתוך 200?', 'What is 15% of 200?', '30', '30'],
  [
    'math',
    'hard',
    'במשולש יש זוויות של 90 ו-45 מעלות. מה גודל הזווית השלישית?',
    'A triangle has angles of 90 and 45 degrees. What is the third angle?',
    '45 מעלות',
    '45 degrees',
  ],

  // --- science ---
  [
    'science',
    'easy',
    'על איזה כוכב לכת אנחנו חיים?',
    'What planet do we live on?',
    'כדור הארץ',
    'Earth',
  ],
  [
    'science',
    'easy',
    'איזה גז בני האדם צריכים כדי לנשום?',
    'What gas do humans need to breathe?',
    'חמצן',
    'Oxygen',
  ],
  [
    'science',
    'medium',
    'מהו הכוכב הקרוב ביותר לכדור הארץ?',
    'What is the closest star to Earth?',
    'השמש',
    'The Sun',
  ],
  [
    'science',
    'medium',
    'איך קוראים בדרך כלל לחומר H2O?',
    'What is H2O commonly known as?',
    'מים',
    'Water',
  ],
  [
    'science',
    'hard',
    'מהו "בית הכוח" של התא?',
    'What is the powerhouse of the cell?',
    'מיטוכונדריה',
    'Mitochondria',
  ],
  [
    'science',
    'hard',
    'איזה כוח מושך עצמים אל כדור הארץ?',
    'What force pulls objects toward the Earth?',
    'כוח הכבידה',
    'Gravity',
  ],

  // --- israeli_history ---
  [
    'israeli_history',
    'easy',
    'באיזו שנה הוקמה מדינת ישראל?',
    'In what year was the State of Israel established?',
    '1948',
    '1948',
  ],
  [
    'israeli_history',
    'easy',
    'מהי בירת ישראל?',
    'What is the capital of Israel?',
    'ירושלים',
    'Jerusalem',
  ],
  [
    'israeli_history',
    'medium',
    'מי היה ראש הממשלה הראשון של ישראל?',
    'Who was the first Prime Minister of Israel?',
    'דוד בן-גוריון',
    'David Ben-Gurion',
  ],
  [
    'israeli_history',
    'medium',
    'מהי השפה הרשמית של מדינת ישראל?',
    'What is the official language of Israel?',
    'עברית',
    'Hebrew',
  ],
  [
    'israeli_history',
    'hard',
    'באיזו שנה התרחשה מלחמת ששת הימים?',
    'In what year did the Six-Day War take place?',
    '1967',
    '1967',
  ],
  [
    'israeli_history',
    'hard',
    'מי הייתה ראש הממשלה הראשונה (אישה) של ישראל?',
    "Who was Israel's first female Prime Minister?",
    'גולדה מאיר',
    'Golda Meir',
  ],

  // --- general_knowledge ---
  [
    'general_knowledge',
    'easy',
    'כמה ימים יש בשבוע?',
    'How many days are in a week?',
    '7',
    '7',
  ],
  [
    'general_knowledge',
    'easy',
    'איזה צבע מתקבל מערבוב כחול וצהוב?',
    'What color do you get by mixing blue and yellow?',
    'ירוק',
    'Green',
  ],
  [
    'general_knowledge',
    'medium',
    'כמה יבשות יש בכדור הארץ?',
    'How many continents are there on Earth?',
    '7',
    '7',
  ],
  [
    'general_knowledge',
    'medium',
    'מהו האוקיינוס הגדול ביותר בעולם?',
    'What is the largest ocean on Earth?',
    'האוקיינוס השקט',
    'The Pacific Ocean',
  ],
  [
    'general_knowledge',
    'hard',
    'מי כתב את המחזה "רומיאו ויוליה"?',
    'Who wrote the play "Romeo and Juliet"?',
    'ויליאם שייקספיר',
    'William Shakespeare',
  ],
  [
    'general_knowledge',
    'hard',
    'מהו ההר הגבוה ביותר בעולם?',
    'What is the tallest mountain in the world?',
    'הר אוורסט',
    'Mount Everest',
  ],
]

const rows = QUESTIONS.map(
  ([category, difficulty_tier, text_he, text_en, answer_key_he, answer_key_en]) => ({
    id: uuidFrom(`${category}|${difficulty_tier}|${text_en}`),
    category,
    difficulty_tier,
    text_he,
    text_en,
    answer_key_he,
    answer_key_en,
  })
)

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { error } = await supabase
  .from('questions')
  .upsert(rows, { onConflict: 'id' })

if (error) {
  console.error('Seed failed:', error.message)
  process.exit(1)
}

console.log(`Seeded ${rows.length} questions across 4 categories × 3 tiers.`)
