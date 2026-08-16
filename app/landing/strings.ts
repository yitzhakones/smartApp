// Copy for the public landing page, ported verbatim from the approved mockup
// (landing-page-light-mockup.tsx) — every string exactly as written, both
// locales already fully authored there. Not modified, only typed.
//
// `example`, `exampleTag`, and `graded` were dropped: confirmed dead weight
// from an earlier mockup iteration (nothing in the layout ever rendered them).

import { SOFT } from './theme'

export type Locale = 'he' | 'en'

export interface LandingTopic {
  label: string
  value: string
  color: string
}

export interface LandingStep {
  num: string
  title: string
  desc: string
}

export interface LandingStrings {
  login: string
  headlineA: string
  headlineB: string
  subtitle: string
  cta1: string
  cta2: string
  rewardLabel: string
  rewardValue: string
  statNum: string
  statLabel: string
  dashTag: string
  dashTotal: string
  dashStars: string
  dashTrend: string
  dashProgress: string
  trendTitle: string
  ranges: string[]
  dashPeriod: string
  byTopic: string
  topics: LandingTopic[]
  howTitle: string
  steps: LandingStep[]
  trust: string
  finalCta: string
  streak: string
}

export const LANDING_STRINGS: Record<Locale, LandingStrings> = {
  he: {
    login: 'כניסה',
    headlineA: 'המקום שבו ידע',
    headlineB: 'מתורגם לדמי כיס',
    subtitle: 'טריוויה יומית לילדים, עם תגמול אמיתי שאתם שולטים בו - חינוך שמרגיש כמו משחק.',
    cta1: 'הרשמה בחינם',
    cta2: 'איך זה עובד',
    rewardLabel: 'ההורה קובע כמה שווה כל תשובה נכונה',
    rewardValue: 'לכל תשובה נכונה',
    statNum: '5',
    statLabel: 'שאלות ביום, 2 דקות',
    dashTag: 'כך זה נראה אצלכם',
    dashTotal: 'סה"כ נחסך',
    dashStars: 'כוכבים',
    dashTrend: '+3 כוכבים לעומת התקופה הקודמת · בונוס שיפור הוענק אוטומטית',
    dashProgress: '2/10 כוכבים לתגמול הבא',
    trendTitle: 'גרף שיפור',
    ranges: ['שבוע', 'חודש', 'שנה'],
    dashPeriod: 'כוכבים בתקופה הנוכחית',
    byTopic: 'שיפור לפי נושא · השבוע',
    topics: [
      { label: 'מתמטיקה', value: '▲ 25%', color: '#1FAE7A' },
      { label: 'מדעים', value: '▼ 10%', color: '#E24B4B' },
      { label: 'היסטוריה של ישראל', value: 'ללא שינוי', color: SOFT },
    ],
    howTitle: 'איך זה עובד',
    steps: [
      { num: '01', title: 'ההורה בוחר קטגוריות', desc: 'מתמטיקה, מדעים, היסטוריה של ישראל, ידע כללי - אתם קובעים על מה מתאמנים.' },
      { num: '02', title: '5 שאלות ביום + בונוס', desc: 'פורמט סטורי קליל, מותאם אישית לרמה, נבדק אוטומטית תוך שניות.' },
      { num: '03', title: 'תגמול אמיתי', desc: 'כסף, פינוקים, או מה שתבחרו - מוגדר על ידכם, לפי הצלחה ושיפור אמיתי.' },
      { num: '04', title: 'מעקב שקוף להורה', desc: 'גרפי שיפור, רמת קושי מותאמת אישית, ובקרה מלאה על כל תגמול שנשלח.' },
    ],
    trust: 'נבדק אוטומטית, נשלט לגמרי על ידכם.\nבלי פרסומות, בלי תגמולי מזל, בלי הפתעות.',
    finalCta: 'בואו נתחיל',
    streak: 'ימים ברצף',
  },
  en: {
    login: 'Log in',
    headlineA: 'Where knowledge',
    headlineB: 'turns into allowance',
    subtitle: "Daily trivia for kids, with a real reward you control - education that feels like play.",
    cta1: 'Sign up free',
    cta2: 'How it works',
    rewardLabel: 'Parents set how much each correct answer is worth',
    rewardValue: 'per correct answer',
    statNum: '5',
    statLabel: 'questions a day, 2 minutes',
    dashTag: 'A real look inside the dashboard',
    dashTotal: 'Total saved',
    dashStars: 'stars',
    dashTrend: '+3 stars vs last period · improvement bonus applied automatically',
    dashProgress: '2/10 stars to next reward',
    trendTitle: 'Improvement graph',
    ranges: ['Week', 'Month', 'Year'],
    dashPeriod: 'stars this period',
    byTopic: 'Improvement by topic · this week',
    topics: [
      { label: 'Math', value: '▲ 25%', color: '#1FAE7A' },
      { label: 'Science', value: '▼ 10%', color: '#E24B4B' },
      { label: 'Israeli History', value: 'No change', color: SOFT },
    ],
    howTitle: 'How it works',
    steps: [
      { num: '01', title: 'Parents choose categories', desc: 'Math, science, Israeli history, general knowledge - you decide what to practice.' },
      { num: '02', title: '5 questions a day + bonus', desc: 'A light, story-style format, matched to their level, auto-graded in seconds.' },
      { num: '03', title: 'A real reward', desc: 'Money, treats, or whatever you choose - set by you, based on real success and improvement.' },
      { num: '04', title: 'Full transparency for parents', desc: 'Improvement graphs, personalized difficulty, and full control over every reward sent.' },
    ],
    trust: 'Automatically graded, fully controlled by you.\nNo ads, no chance-based rewards, no surprises.',
    finalCta: "Let's get started",
    streak: 'day streak',
  },
}
