import type { Category } from '@/types/database'

// Hebrew display labels for the fixed category bank (docs → children.enabled_categories).
// app/p/[token]/story-mode.tsx keeps its own local copy today (pre-dating this
// file); this is the shared source anything added going forward should use.
export const CATEGORY_LABEL_HE: Record<Category, string> = {
  math: 'מתמטיקה',
  science: 'מדעים',
  israeli_history: 'היסטוריה של ישראל',
  general_knowledge: 'ידע כללי',
}

// Fixed display order, matching the doc's own listing ("math / science /
// israeli_history / general_knowledge") — used anywhere the full category bank
// is iterated (e.g. EditChildScreen's category picker).
export const CATEGORY_ORDER: Category[] = ['math', 'science', 'israeli_history', 'general_knowledge']
