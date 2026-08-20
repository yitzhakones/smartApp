// Copy for /terms and /privacy — sourced verbatim from
// docs/terms-and-privacy-draft.md (the canonical draft). Wording is not
// altered here, only structured into renderable blocks (LegalDocument in
// legal-document.tsx turns `**bold**` spans into <strong> and `list` blocks
// into <ul>/<li>). This is still a DRAFT pending legal review — see the
// warning note at the top of the source doc (deliberately not rendered on
// the public pages themselves, per the request that added this file).
//
// [bracketed placeholders] (publish date, contact email, retention period)
// are left exactly as-is in the rendered text until they're filled in ahead
// of going fully live.

export type Locale = 'he' | 'en'

export type LegalBlock = { kind: 'p'; text: string } | { kind: 'list'; items: string[] }

export interface LegalSection {
  heading: string
  blocks: LegalBlock[]
}

export interface LegalDoc {
  title: string
  lastUpdatedLabel: string
  sections: LegalSection[]
}

function p(text: string): LegalBlock {
  return { kind: 'p', text }
}

function list(items: string[]): LegalBlock {
  return { kind: 'list', items }
}

export const TERMS_HE: LegalDoc = {
  title: 'תנאי שימוש - Tzuffix',
  lastUpdatedLabel: 'עדכון אחרון: [להשלים תאריך בעת פרסום]',
  sections: [
    {
      heading: '1. כללי',
      blocks: [
        p('1.1 Tzuffix ("האפליקציה", "השירות") היא פלטפורמת טריוויה יומית לילדים, המופעלת בבית באמצעות הורה/אפוטרופוס חוקי.'),
        p('1.2 השימוש בשירות מיועד **אך ורק** להורים/אפוטרופוסים חוקיים הפועלים בשם ילדיהם הקטינים. קטין אינו רשאי להירשם באופן עצמאי.'),
        p('1.3 בהרשמה, ההורה מצהיר ומאשר כי הוא ההורה/האפוטרופוס החוקי של הילד/ה שעבורו/ה נוצר הפרופיל.'),
      ],
    },
    {
      heading: '2. תיאור השירות',
      blocks: [
        p('2.1 השירות מאפשר להורה להגדיר קטגוריות לימוד, לצפות בהתקדמות הילד/ה, ולהעניק תגמול (כספי ו/או לא-כספי) על פי שיקול דעתו הבלעדי.'),
        p('2.2 שאלות נבחרות אוטומטית מדי יום מתוך מאגר שאלות, ומותאמות לרמת הקושי של הילד/ה על בסיס שאלון היכרות ראשוני והתקדמות שוטפת.'),
        p('2.3 תשובות הילד/ה נבדקות באופן אוטומטי באמצעות מערכת בינה מלאכותית (Claude API של חברת Anthropic). ראו פירוט בסעיף 3 למדיניות הפרטיות.'),
        p('2.4 **התגמול הכספי/החומרי הוא באחריות ההורה בלבד.** האפליקציה אינה מעבירה כסף בפועל, אינה מהווה שירות תשלומים, ואינה צד לכל הסכם כספי בין ההורה לילד/ה - היא רק עוקבת ומציגה נתונים.'),
        p('2.5 מנגנון התגמול הוא **דטרמיניסטי בלבד** - תשובה נכונה מזכה תמיד באותו תגמול קבוע מראש שההורה הגדיר. אין באפליקציה שום מנגנון מבוסס מזל, הגרלה, או אקראיות.'),
      ],
    },
    {
      heading: '3. אחריות ההורה',
      blocks: [
        p('3.1 ההורה אחראי בלעדית לתוכן שהוא מזין (שם הילד/ה, קטגוריות, סכומי תגמול וכו\').'),
        p('3.2 ההורה אחראי להתאמת השירות לגיל ולצרכי הילד/ה.'),
        p('3.3 ההורה רשאי בכל עת למחוק את פרופיל הילד/ה ואת כל המידע הקשור אליו.'),
      ],
    },
    {
      heading: '4. שימושים אסורים',
      blocks: [
        p('4.1 חל איסור להשתמש בשירות למטרה בלתי חוקית, להטריד, לפגוע, או לאסוף מידע על קטינים שאינם בניכם/ילדכם החוקי.'),
        p('4.2 חל איסור לנסות לעקוף את מנגנוני האבטחה של השירות.'),
      ],
    },
    {
      heading: '5. הגבלת אחריות',
      blocks: [
        p('5.1 השירות ניתן "כמות שהוא" (AS IS). איננו מתחייבים לזמינות רציפה או ללא תקלות.'),
        p('5.2 בדיקת התשובות מבוצעת באמצעות מערכת בינה מלאכותית ועלולה, לעיתים נדירות, לשגות. ניתנת אפשרות תיקון ידני להורה.'),
        p('5.3 החברה אינה אחראית לתגמולים/כספים שההורה מבטיח לילד/ה - אלו עניין פרטי בין ההורה לילד/ה.'),
      ],
    },
    {
      heading: '6. שינויים בתנאים',
      blocks: [p('אנו רשאים לעדכן תנאים אלו מעת לעת. שינויים מהותיים יובאו לידיעת המשתמשים.')],
    },
    {
      heading: '7. סיום שימוש',
      blocks: [p('ניתן לסגור את החשבון בכל עת. אנו רשאים להשעות חשבון המפר תנאים אלו.')],
    },
    {
      heading: '8. דין וסמכות שיפוט',
      blocks: [p('על תנאים אלו יחולו דיני מדינת ישראל, וסמכות השיפוט הבלעדית נתונה לבתי המשפט המוסמכים בישראל.')],
    },
    {
      heading: '9. יצירת קשר',
      blocks: [p('[Printhood.il@gmail.com / כתובת ליצירת קשר להשלמה]')],
    },
  ],
}

export const PRIVACY_HE: LegalDoc = {
  title: 'מדיניות פרטיות - Tzuffix',
  lastUpdatedLabel: 'עדכון אחרון: [להשלים תאריך בעת פרסום]',
  sections: [
    {
      heading: '1. כללי',
      blocks: [
        p(
          'מדיניות זו מסבירה אילו נתונים אנו אוספים, למה, וכיצד אנו מגנים עליהם - הן על נתוני ההורה והן על נתוני הילד/ה. אנו מיישמים עקרון **מזעור מידע** - אוספים רק את המינימום הדרוש לתפעול השירות.'
        ),
      ],
    },
    {
      heading: '2. מידע שאנו אוספים',
      blocks: [
        p('**על ההורה:**'),
        list(['כתובת אימייל, סיסמה (מוצפנת)', 'מספר וואטסאפ (אופציונלי, לשימוש עתידי בהתראות)', 'שפת ממשק מועדפת']),
        p('**על הילד/ה (מוזן ע"י ההורה בלבד, לא ע"י הילד/ה):**'),
        list([
          'שם פרטי/כינוי',
          'מגדר (לצורך התאמת ניסוח בעברית בלבד)',
          'קבוצת גיל כללית (לצורך השוואה אנונימית בלבד - לא לתוכן)',
          'שפת משחק',
          'תשובות לשאלות ורמת ביצועים לפי נושא',
        ]),
        p('**אנו לא אוספים:** תעודת זהות, כתובת מגורים מדויקת, תמונות, הקלטות קול/וידאו, או כל מידע מזהה נוסף שאינו נחוץ.'),
      ],
    },
    {
      heading: '3. כיצד אנו משתמשים במידע',
      blocks: [
        p(
          '3.1 בדיקת תשובות: תשובת הילד/ה **נשלחת לשירות הבינה המלאכותית Claude API (של חברת Anthropic)** לצורך בדיקה אוטומטית מול התשובה הנכונה. Anthropic מעבדת מידע זה כ"מעבד משנה" (sub-processor) בהתאם למדיניות הפרטיות שלה, ואינה משתמשת בו לאימון מודלים כלליים במסגרת שירות זה.'
        ),
        p('3.2 מעקב התקדמות: הצגת נתונים להורה בלבד (דשבורד).'),
        p(
          '3.3 השוואה אנונימית (אופציונלית, כבויה כברירת מחדל): אם ההורה בוחר להפעיל, מוצג להורה **אחוזון מצטבר ואנונימי בלבד** (למשל "באחוזון ה-75 מבין ילדים בגילו") - **לעולם לא** נתונים גולמיים או מזהים של ילדים ממשפחות אחרות, ולעולם לא מוצג לילד/ה עצמו/ה.'
        ),
      ],
    },
    {
      heading: '4. שיתוף מידע עם צדדים שלישיים',
      blocks: [
        p('4.1 אנו **לא מוכרים** מידע לצדדים שלישיים ולא משתמשים בו לפרסום ממוקד.'),
        p(
          '4.2 ספקי תשתית: Supabase (אחסון מסד נתונים), Vercel (אחסון/הרצת האפליקציה), Anthropic (בדיקת תשובות) - כולם פועלים כמעבדי משנה תחת התחייבויות חוזיות להגנת מידע.'
        ),
      ],
    },
    {
      heading: '5. זכויות ההורה (בשם הילד/ה)',
      blocks: [
        list([
          '**גישה** - צפייה בכל המידע שנשמר על הילד/ה.',
          '**תיקון** - עדכון פרטים בכל עת.',
          '**מחיקה** - מחיקת פרופיל הילד/ה וכל המידע הקשור אליו, לצמיתות.',
          '**ביטול הסכמה** - הפסקת השימוש בשירות בכל עת.',
        ]),
      ],
    },
    {
      heading: '6. אבטחת מידע',
      blocks: [
        p(
          'המידע מאובטח באמצעות הצפנה בתעבורה ובמנוחה, בקרת גישה מבוססת הרשאות (RLS - Row Level Security), ואימות דו-שכבתי לגישת ילדים (קישור ייחודי + קוד PIN אופציונלי).'
        ),
      ],
    },
    {
      heading: '7. שמירת מידע',
      blocks: [p('המידע נשמר כל עוד החשבון פעיל. עם מחיקת חשבון/פרופיל ילד/ה, המידע נמחק לצמיתות תוך [להשלים - למשל 30 יום].')],
    },
    {
      heading: '8. קטינים',
      blocks: [
        p(
          'שירות זה מיועד לשימוש **על ידי הורים** בלבד, בשם ילדיהם. איננו אוספים מידע ישירות מקטינים ואיננו מאמתים זהות קטינים - כל אינטראקציה עם הילד/ה מתבצעת דרך קישור ייחודי שההורה יוצר ושולט בו.'
        ),
      ],
    },
    {
      heading: '9. שינויים במדיניות',
      blocks: [p('נעדכן מדיניות זו מעת לעת ונודיע על שינויים מהותיים.')],
    },
    {
      heading: '10. יצירת קשר בנושאי פרטיות',
      blocks: [p('[Printhood.il@gmail.com / כתובת ליצירת קשר להשלמה]')],
    },
  ],
}

export const TERMS_EN: LegalDoc = {
  title: 'Terms of Service - Tzuffix',
  lastUpdatedLabel: 'Last updated: [fill in at publish time]',
  sections: [
    {
      heading: '1. General',
      blocks: [
        p(
          'Tzuffix ("the App", "the Service") is a daily trivia platform for children, operated at home by a parent/legal guardian. The Service is intended **exclusively** for parents/legal guardians acting on behalf of their minor children. A minor may not register independently. Upon registration, the parent represents that they are the legal parent/guardian of the child for whom the profile is created.'
        ),
      ],
    },
    {
      heading: '2. Description of Service',
      blocks: [
        p(
          'The Service lets a parent set learning categories, view their child\'s progress, and grant rewards (monetary and/or non-monetary) at their sole discretion. Questions are automatically selected daily and matched to the child\'s difficulty level based on an initial placement quiz and ongoing performance. Answers are automatically graded using an AI system (Anthropic\'s Claude API) - see Privacy Policy Section 3. **Monetary/material rewards are the parent\'s sole responsibility** - the App does not transfer real money, is not a payment service, and is not a party to any financial arrangement between parent and child; it only tracks and displays data. The reward mechanism is **strictly deterministic** - a correct answer always earns the same pre-set reward the parent configured. There is no chance-based, lottery, or random mechanism anywhere in the App.'
        ),
      ],
    },
    {
      heading: '3. Parental Responsibility',
      blocks: [
        p(
          "The parent is solely responsible for content they enter, for matching the Service to their child's age and needs, and may delete the child's profile and all related data at any time."
        ),
      ],
    },
    {
      heading: '4. Prohibited Uses',
      blocks: [
        p(
          "Using the Service for unlawful purposes, harassment, or collecting data on minors who are not your own legal child is prohibited, as is attempting to bypass the Service's security mechanisms."
        ),
      ],
    },
    {
      heading: '5. Limitation of Liability',
      blocks: [
        p(
          'The Service is provided "AS IS." We do not guarantee uninterrupted or error-free availability. Answer grading uses an AI system and may, rarely, err - a manual-correction option is provided to parents. We are not responsible for rewards/money a parent promises a child - that is a private matter between parent and child.'
        ),
      ],
    },
    {
      heading: '6. Changes to Terms',
      blocks: [p('We may update these Terms periodically; material changes will be communicated to users.')],
    },
    {
      heading: '7. Termination',
      blocks: [p('You may close your account at any time. We may suspend an account that violates these Terms.')],
    },
    {
      heading: '8. Governing Law',
      blocks: [
        p(
          'These Terms are governed by the laws of the State of Israel, with exclusive jurisdiction in the competent courts of Israel.'
        ),
      ],
    },
    {
      heading: '9. Contact',
      blocks: [p('[Printhood.il@gmail.com / contact address to complete]')],
    },
  ],
}

export const PRIVACY_EN: LegalDoc = {
  title: 'Privacy Policy - Tzuffix',
  lastUpdatedLabel: 'Last updated: [fill in at publish time]',
  sections: [
    {
      heading: '1. General',
      blocks: [
        p(
          'This policy explains what data we collect, why, and how we protect it - for both parent and child data. We apply a **data minimization** principle - collecting only the minimum needed to operate the Service.'
        ),
      ],
    },
    {
      heading: '2. Information We Collect',
      blocks: [
        p(
          '**About the parent:** email address, password (encrypted), WhatsApp number (optional, for future notifications), preferred interface language.'
        ),
        p(
          "**About the child (entered by the parent only, never by the child):** first name/nickname, gender (used solely for Hebrew grammatical phrasing), general age group (used solely for anonymous benchmarking, never for content), game language, answers and per-topic performance."
        ),
        p(
          '**We do not collect:** government ID, precise home address, photos, voice/video recordings, or any other identifying information not required for the Service.'
        ),
      ],
    },
    {
      heading: '3. How We Use Information',
      blocks: [
        p(
          "Answer grading: a child's answer **is sent to the Claude API AI service (by Anthropic)** for automated grading against the correct answer. Anthropic processes this data as a sub-processor per its own privacy policy and does not use it to train general models as part of this service. Progress tracking is shown to the parent only (dashboard). Anonymous benchmarking (optional, off by default): if enabled by the parent, only an **aggregated, anonymous percentile** is shown (e.g. \"in the 75th percentile among children their age\") - **never** raw or identifying data of children from other families, and never shown to the child directly."
        ),
      ],
    },
    {
      heading: '4. Sharing Information with Third Parties',
      blocks: [
        p(
          'We do **not sell** data to third parties and do not use it for targeted advertising. Infrastructure providers: Supabase (database hosting), Vercel (app hosting), Anthropic (answer grading) - all operate as sub-processors under contractual data-protection obligations.'
        ),
      ],
    },
    {
      heading: "5. Parental Rights (on the child's behalf)",
      blocks: [
        p(
          "Access to all data stored about the child; correction of details at any time; permanent deletion of the child's profile and all related data; withdrawal of consent / stopping use of the Service at any time."
        ),
      ],
    },
    {
      heading: '6. Data Security',
      blocks: [
        p(
          'Data is secured via encryption in transit and at rest, permission-based access control (Row Level Security), and two-layer authentication for child access (unique link + optional PIN).'
        ),
      ],
    },
    {
      heading: '7. Data Retention',
      blocks: [
        p(
          'Data is retained as long as the account is active. Upon deletion of an account/child profile, data is permanently deleted within [to complete - e.g. 30 days].'
        ),
      ],
    },
    {
      heading: '8. Children',
      blocks: [
        p(
          "This Service is intended for use **by parents only**, on behalf of their children. We do not collect data directly from minors and do not verify minors' identities - all child interaction happens through a unique link the parent creates and controls."
        ),
      ],
    },
    {
      heading: '9. Changes to This Policy',
      blocks: [p('We may update this policy periodically and will notify users of material changes.')],
    },
    {
      heading: '10. Privacy Contact',
      blocks: [p('[Printhood.il@gmail.com / contact address to complete]')],
    },
  ],
}
