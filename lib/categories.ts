import type { Category } from '@/types/database'

// Hebrew display labels for the fixed category bank (docs → children.enabled_categories).
// app/p/[token]/story-mode.tsx keeps its own local copy today (pre-dating this
// file); this is the shared source anything added going forward should use.
export const CATEGORY_LABEL_HE: Record<Category, string> = {
  math: 'מתמטיקה',
  science: 'מדעים',
  israeli_history: 'היסטוריה של ישראל',
  general_knowledge: 'ידע כללי',
  // Multiple-choice pivot (migration 013) — new category. Must stay in sync
  // with story-mode.tsx's own CATEGORY_LABEL copy (see the note above): this
  // read "אוצר מילים באנגלית" while the child app read "תרגום מילים", so the
  // same category was labelled two different ways depending on the screen.
  english_vocabulary: 'תרגום מילים',
}

// Fixed display order, matching the doc's own listing ("math / science /
// israeli_history / general_knowledge" + english_vocabulary, appended at the
// end so existing children's category chip order never reshuffles) — used
// anywhere the full category bank is iterated (e.g. EditChildScreen's picker).
export const CATEGORY_ORDER: Category[] = [
  'math',
  'science',
  'israeli_history',
  'general_knowledge',
  'english_vocabulary',
]
