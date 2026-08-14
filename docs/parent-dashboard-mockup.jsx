// v3 - full parent panel: dashboard + settings menu + edit child + notifications + account + reward presets
import { useState } from "react";
import { Check, X, Flame, TrendingUp, Users, ChevronDown, ChevronRight, Send, Sparkles, Pencil, Settings, Bell, User, Globe, Trash2, Plus } from "lucide-react";

const INK = "#14172B";
const PAPER = "#FBF7EE";
const LIME = "#8FCB1F"; // ליים כהה יותר לקונטרסט על רקע בהיר
const FUCHSIA = "#D6127A";
const AMBER = "#C97A00";
const SOFT = "#6B7299";
const CARD = "#FFFFFF";

const CHILDREN = [
  { id: "noa", name: "נועה", stars: 142, money: 178, streak: 6, weeklyThis: 7, weeklyLast: 4, gender: "female", locale: "he", categories: ["math", "science"], shekelPerStar: 1, weeklyBonus: 10, accessMode: "no_code", pin: "" },
  { id: "yuval", name: "יובל", stars: 58, money: 58, streak: 2, weeklyThis: 3, weeklyLast: 5, gender: "male", locale: "he", categories: ["math", "history"], shekelPerStar: 1, weeklyBonus: 10, accessMode: "pin", pin: "4821" },
];

const TREND_DATA = {
  noa: {
    week: {
      labels: ["א", "ב", "ג", "ד", "ה", "ו", "ש"],
      values: [3, 5, 2, 6, 4, 5, 7],
      current: 7,
      previous: 4,
      categories: [
        { label: "מתמטיקה", change: 25 },
        { label: "מדעים", change: -10 },
        { label: "היסטוריה של ישראל", change: 0 },
      ],
    },
    month: {
      labels: ["שבוע 1", "שבוע 2", "שבוע 3", "שבוע 4"],
      values: [18, 22, 19, 26],
      current: 26,
      previous: 19,
      categories: [
        { label: "מתמטיקה", change: 42 },
        { label: "מדעים", change: 8 },
        { label: "היסטוריה של ישראל", change: -15 },
      ],
    },
    year: {
      labels: ["ינו", "פבר", "מרץ", "אפר", "מאי", "יונ", "יול"],
      values: [40, 52, 48, 61, 58, 70, 74],
      current: 74,
      previous: 58,
      categories: [
        { label: "מתמטיקה", change: 61 },
        { label: "מדעים", change: 33 },
        { label: "היסטוריה של ישראל", change: 12 },
      ],
    },
  },
  yuval: {
    week: {
      labels: ["א", "ב", "ג", "ד", "ה", "ו", "ש"],
      values: [1, 2, 3, 2, 4, 3, 3],
      current: 3,
      previous: 5,
      categories: [
        { label: "מתמטיקה", change: -18 },
        { label: "מדעים", change: 6 },
        { label: "היסטוריה של ישראל", change: 0 },
      ],
    },
    month: {
      labels: ["שבוע 1", "שבוע 2", "שבוע 3", "שבוע 4"],
      values: [10, 9, 14, 11],
      current: 11,
      previous: 14,
      categories: [
        { label: "מתמטיקה", change: -6 },
        { label: "מדעים", change: 18 },
        { label: "היסטוריה של ישראל", change: 2 },
      ],
    },
    year: {
      labels: ["ינו", "פבר", "מרץ", "אפר", "מאי", "יונ", "יול"],
      values: [12, 15, 20, 18, 24, 22, 26],
      current: 26,
      previous: 22,
      categories: [
        { label: "מתמטיקה", change: 4 },
        { label: "מדעים", change: 29 },
        { label: "היסטוריה של ישראל", change: 15 },
      ],
    },
  },
};

const ACTIVITY = [
  { id: 1, child: "noa", q: "פתרי: 3x + 7 = 22. מה x?", a: "x שווה 5", correct: true, when: "היום, 16:02" },
  { id: 2, child: "noa", q: "באיזו שנה הוכרזה מדינת ישראל?", a: "1967", correct: false, when: "אתמול, 17:40" },
  { id: 3, child: "noa", q: "כמה זה 7 בריבוע?", a: "49", correct: true, when: "אתמול, 17:38" },
];

const MONEY_PRESETS = [
  { label: "₪5", amount: 5 },
  { label: "₪10", amount: 10 },
  { label: "₪20", amount: 20 },
];
const PRIVILEGE_PRESETS = ["גלידה", "ערב סרט", "חצי שעה מסך נוספת", "חטיף אהוב"];

const INITIAL_PRESETS = [
  { id: 1, kind: "money", label: "₪5", amount: 5 },
  { id: 2, kind: "money", label: "₪10", amount: 10 },
  { id: 3, kind: "money", label: "₪20", amount: 20 },
  { id: 4, kind: "privilege", label: "גלידה" },
  { id: 5, kind: "privilege", label: "ערב סרט" },
  { id: 6, kind: "privilege", label: "חצי שעה מסך נוספת" },
  { id: 7, kind: "privilege", label: "חטיף אהוב" },
];

const NOTIFICATIONS = [
  { id: 1, child: "noa", type: "milestone", text: "נועה חצתה 140 כוכבים = ₪140!", when: "היום, 16:05", read: false },
  { id: 2, child: "noa", type: "weekly", text: "נועה השתפרה השבוע - בונוס ₪10 הוענק אוטומטית", when: "אתמול, 09:00", read: false },
  { id: 3, child: "yuval", type: "milestone", text: "יובל חצה 50 כוכבים = ₪50!", when: "לפני 3 ימים", read: true },
];

const CATEGORY_OPTIONS = [
  { key: "math", label: "מתמטיקה" },
  { key: "science", label: "מדעים" },
  { key: "history", label: "היסטוריה של ישראל" },
  { key: "general", label: "ידע כללי" },
];

function Card({ children, style }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: CARD, boxShadow: "0 1px 3px rgba(20,23,43,0.06)", ...style }}>
      {children}
    </div>
  );
}

function TrendCard({ childId }) {
  const [range, setRange] = useState("week");
  const data = TREND_DATA[childId][range];
  const max = Math.max(...data.values);
  const delta = data.current - data.previous;
  const pct = data.previous ? Math.round((delta / data.previous) * 100) : 0;
  const improved = delta > 0;

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={17} color={improved ? "#1FAE7A" : "#E24B4B"} />
          <p style={{ color: INK }} className="font-black text-base">גרף שיפור</p>
        </div>
        <div className="flex gap-1 rounded-full p-1" style={{ background: PAPER }}>
          {[
            ["week", "שבוע"],
            ["month", "חודש"],
            ["year", "שנה"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className="px-3 py-1 rounded-full text-xs font-black"
              style={{ background: range === key ? INK : "transparent", color: range === key ? "white" : SOFT }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span style={{ color: INK }} className="text-3xl font-black">{data.current}</span>
        <span style={{ color: SOFT, fontFamily: "Assistant" }} className="text-xs font-bold">כוכבים בתקופה הנוכחית</span>
        <span
          className="text-xs font-black px-2 py-0.5 rounded-full"
          style={{ background: improved ? "#1FAE7A22" : "#E24B4B22", color: improved ? "#1FAE7A" : "#E24B4B" }}
        >
          {improved ? "▲" : "▼"} {Math.abs(pct)}%
        </span>
      </div>

      <div className="flex items-end justify-between gap-1.5" style={{ height: 110 }}>
        {data.values.map((v, i) => {
          const isCurrent = i === data.values.length - 1;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <p style={{ color: isCurrent ? INK : "transparent", fontFamily: "Assistant" }} className="text-[10px] font-black">{v}</p>
              <div
                style={{
                  width: "100%",
                  height: `${Math.max((v / max) * 78, 6)}px`,
                  background: isCurrent ? "linear-gradient(180deg, #FF3DBB, #D6127A)" : "#e9e6da",
                  borderRadius: 6,
                }}
              />
              <p style={{ color: isCurrent ? INK : SOFT, fontFamily: "Assistant" }} className="text-[10px] font-bold">{data.labels[i]}</p>
            </div>
          );
        })}
      </div>

      <p style={{ color: SOFT, fontFamily: "Assistant" }} className="text-xs mt-3">
        {delta === 0 ? "ללא שינוי לעומת התקופה הקודמת" : `${improved ? "+" : ""}${delta} כוכבים לעומת התקופה הקודמת`}
        {improved ? " · בונוס שיפור הוענק אוטומטית" : ""}
      </p>

      <div style={{ borderTop: "1px solid #eeece2" }} className="mt-3 pt-3">
        <p style={{ color: INK, fontFamily: "Assistant" }} className="text-xs font-black mb-2">
          שיפור לפי נושא · {range === "week" ? "השבוע" : range === "month" ? "החודש" : "השנה"}
        </p>
        <div className="flex flex-col gap-2">
          {data.categories.map((c) => {
            const up = c.change > 0;
            const flat = c.change === 0;
            return (
              <div key={c.label} className="flex items-center justify-between">
                <span style={{ color: INK, fontFamily: "Assistant" }} className="text-xs font-bold">{c.label}</span>
                <span
                  className="text-xs font-black px-2 py-0.5 rounded-full"
                  style={{
                    background: flat ? "#e9e6da" : up ? "#1FAE7A22" : "#E24B4B22",
                    color: flat ? SOFT : up ? "#1FAE7A" : "#E24B4B",
                  }}
                >
                  {flat ? "ללא שינוי" : `${up ? "▲" : "▼"} ${Math.abs(c.change)}%`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function UpdateSheet({ child, onClose, onConfirm }) {
  const [amount, setAmount] = useState(child.money);

  return (
    <div className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-b-3xl p-5"
        style={{ background: CARD, maxWidth: 440, margin: "0 auto" }}
      >
        <div className="flex items-center justify-between mb-5">
          <p style={{ color: INK, fontFamily: "Rubik" }} className="font-black text-base">עדכון · {child.name}</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: PAPER }}>
            <X size={16} color={SOFT} />
          </button>
        </div>

        <div className="flex items-center justify-center gap-6 mb-2">
          <button
            onClick={() => setAmount((v) => Math.max(0, v - 1))}
            className="w-11 h-11 rounded-full font-black text-xl"
            style={{ background: PAPER, color: INK }}
          >
            -
          </button>
          <span style={{ color: "#5a8a10", fontFamily: "Rubik" }} className="text-4xl font-black">₪{amount}</span>
          <button
            onClick={() => setAmount((v) => Math.min(child.money, v + 1))}
            className="w-11 h-11 rounded-full font-black text-xl"
            style={{ background: PAPER, color: INK }}
          >
            +
          </button>
        </div>
        <p style={{ color: SOFT, fontFamily: "Assistant" }} className="text-xs text-center mb-5">מתוך {child.money} ₪ זמינים</p>

        <button
          onClick={() => onConfirm(amount)}
          className="w-full py-3 rounded-full font-black text-sm"
          style={{ background: INK, color: "white" }}
        >
          עדכון היתרה
        </button>
      </div>
    </div>
  );
}

function ScreenHeader({ title, onBack }) {
  return (
    <div className="px-4 pt-5 pb-3 flex items-center gap-2">
      <button onClick={onBack} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: CARD, border: "1px solid #e4e2d8" }}>
        <ChevronRight size={16} color={SOFT} />
      </button>
      <p style={{ color: INK, fontFamily: "Rubik" }} className="font-black text-base">{title}</p>
    </div>
  );
}

function SettingsMenu({ onBack, onNavigate }) {
  const items = [
    { key: "presets", icon: Sparkles, label: "ניהול תגמולים מהירים", desc: "הצ'יפים בפאנל שליחת בונוס" },
    { key: "edit-child", icon: User, label: "עריכת פרופיל ילד/ה", desc: "שם, קטגוריות, ₪, גישה" },
    { key: "notifications", icon: Bell, label: "התראות", desc: "רפים ובונוסים שהתקבלו" },
    { key: "account", icon: Globe, label: "הגדרות חשבון", desc: "שפה, וואטסאפ, העדפות" },
  ];
  return (
    <div dir="rtl" style={{ background: PAPER, minHeight: "100vh", maxWidth: 440, margin: "0 auto", fontFamily: "'Rubik', system-ui" }}>
      <ScreenHeader title="הגדרות" onBack={onBack} />
      <div className="px-4 flex flex-col gap-2 pb-24">
        {items.map((it) => (
          <button key={it.key} onClick={() => onNavigate(it.key)} className="w-full">
            <Card>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: PAPER }}>
                    <it.icon size={16} color={FUCHSIA} />
                  </div>
                  <div className="text-right">
                    <p style={{ color: INK, fontFamily: "Assistant" }} className="font-bold text-sm">{it.label}</p>
                    <p style={{ color: SOFT, fontFamily: "Assistant" }} className="text-xs">{it.desc}</p>
                  </div>
                </div>
                <ChevronDown size={16} color={SOFT} style={{ transform: "rotate(90deg)" }} />
              </div>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}

function EditChildScreen({ child, onBack, onSave }) {
  const [name, setName] = useState(child.name);
  const [gender, setGender] = useState(child.gender);
  const [locale, setLocale] = useState(child.locale);
  const [categories, setCategories] = useState(child.categories);
  const [perStar, setPerStar] = useState(child.shekelPerStar);
  const [weeklyBonus, setWeeklyBonus] = useState(child.weeklyBonus);
  const [accessMode, setAccessMode] = useState(child.accessMode);
  const [pin, setPin] = useState(child.pin);

  function toggleCategory(key) {
    setCategories((prev) => (prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]));
  }

  return (
    <div dir="rtl" style={{ background: PAPER, minHeight: "100vh", maxWidth: 440, margin: "0 auto", fontFamily: "'Rubik', system-ui" }}>
      <ScreenHeader title={`עריכת פרופיל · ${child.name}`} onBack={onBack} />
      <div className="px-4 flex flex-col gap-4 pb-28">
        <div>
          <p style={{ color: SOFT, fontFamily: "Assistant" }} className="text-xs font-bold mb-1.5">שם</p>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-2xl px-4 py-3 text-base font-bold" style={{ background: CARD, border: "1px solid #e4e2d8", color: INK }} />
        </div>

        <div>
          <p style={{ color: SOFT, fontFamily: "Assistant" }} className="text-xs font-bold mb-1.5">מגדר</p>
          <div className="flex gap-2">
            {[["female", "בת"], ["male", "בן"]].map(([key, label]) => (
              <button key={key} onClick={() => setGender(key)} className="flex-1 py-2.5 rounded-2xl font-black text-sm" style={{ background: gender === key ? INK : CARD, color: gender === key ? "white" : INK, border: gender === key ? "none" : "1px solid #e4e2d8" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p style={{ color: SOFT, fontFamily: "Assistant" }} className="text-xs font-bold mb-1.5">שפת משחק</p>
          <div className="flex gap-2">
            {[["he", "עברית"], ["en", "English"]].map(([key, label]) => (
              <button key={key} onClick={() => setLocale(key)} className="flex-1 py-2.5 rounded-2xl font-black text-sm" style={{ background: locale === key ? FUCHSIA : CARD, color: locale === key ? "white" : INK, border: locale === key ? "none" : "1px solid #e4e2d8" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p style={{ color: SOFT, fontFamily: "Assistant" }} className="text-xs font-bold mb-1.5">קטגוריות</p>
          <div className="flex flex-col gap-2">
            {CATEGORY_OPTIONS.map((c) => {
              const selected = categories.includes(c.key);
              return (
                <button key={c.key} onClick={() => toggleCategory(c.key)} className="flex items-center justify-between px-4 py-3 rounded-2xl" style={{ background: selected ? INK : CARD, border: selected ? "none" : "1px solid #e4e2d8" }}>
                  <span style={{ color: selected ? "white" : INK }} className="font-bold text-sm">{c.label}</span>
                  {selected && <Check size={16} color="#C6FF3D" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl p-4" style={{ background: CARD, border: "1px solid #e4e2d8" }}>
          <p style={{ color: INK, fontFamily: "Assistant" }} className="font-bold text-sm mb-3">₪ לכל תשובה נכונה</p>
          <div className="flex items-center justify-between">
            <button onClick={() => setPerStar((v) => Math.max(1, v - 1))} className="w-10 h-10 rounded-full font-black text-lg" style={{ background: PAPER, color: INK }}>-</button>
            <span style={{ color: "#5a8a10", fontFamily: "Rubik" }} className="text-2xl font-black">₪{perStar}</span>
            <button onClick={() => setPerStar((v) => v + 1)} className="w-10 h-10 rounded-full font-black text-lg" style={{ background: PAPER, color: INK }}>+</button>
          </div>
          <p style={{ color: SOFT, fontFamily: "Assistant" }} className="text-[11px] mt-2">בונוס יחושב אוטומטית פי 3 מהערך הזה</p>
        </div>

        <div className="rounded-2xl p-4" style={{ background: CARD, border: "1px solid #e4e2d8" }}>
          <p style={{ color: INK, fontFamily: "Assistant" }} className="font-bold text-sm mb-3">בונוס שיפור שבועי</p>
          <div className="flex items-center justify-between">
            <button onClick={() => setWeeklyBonus((v) => Math.max(0, v - 5))} className="w-10 h-10 rounded-full font-black text-lg" style={{ background: PAPER, color: INK }}>-</button>
            <span style={{ color: FUCHSIA, fontFamily: "Rubik" }} className="text-2xl font-black">₪{weeklyBonus}</span>
            <button onClick={() => setWeeklyBonus((v) => v + 5)} className="w-10 h-10 rounded-full font-black text-lg" style={{ background: PAPER, color: INK }}>+</button>
          </div>
        </div>

        <div>
          <p style={{ color: SOFT, fontFamily: "Assistant" }} className="text-xs font-bold mb-1.5">אופן כניסה</p>
          <div className="flex gap-2 mb-2">
            {[["pin", "קוד PIN"], ["no_code", "בלי קוד"]].map(([key, label]) => (
              <button key={key} onClick={() => setAccessMode(key)} className="flex-1 py-2.5 rounded-2xl font-black text-sm" style={{ background: accessMode === key ? INK : CARD, color: accessMode === key ? "white" : INK, border: accessMode === key ? "none" : "1px solid #e4e2d8" }}>
                {label}
              </button>
            ))}
          </div>
          {accessMode === "pin" && (
            <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="קוד בן 4 ספרות" className="w-full rounded-2xl px-4 py-3 text-center text-xl font-black tracking-widest" style={{ background: CARD, border: "1px solid #e4e2d8", color: INK }} />
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-4 py-4" style={{ maxWidth: 440, margin: "0 auto", background: PAPER, borderTop: "1px solid #e4e2d8" }}>
        <button
          onClick={() => onSave({ ...child, name, gender, locale, categories, shekelPerStar: perStar, weeklyBonus, accessMode, pin })}
          className="w-full py-3 rounded-full font-black text-sm"
          style={{ background: INK, color: "white" }}
        >
          שמירת שינויים
        </button>
      </div>
    </div>
  );
}

function NotificationsScreen({ onBack, notifications, onMarkAllRead }) {
  return (
    <div dir="rtl" style={{ background: PAPER, minHeight: "100vh", maxWidth: 440, margin: "0 auto", fontFamily: "'Rubik', system-ui" }}>
      <ScreenHeader title="התראות" onBack={onBack} />
      <div className="px-4 flex justify-end mb-2">
        <button onClick={onMarkAllRead} className="text-xs font-bold" style={{ color: FUCHSIA }}>סמן הכל כנקרא</button>
      </div>
      <div className="px-4 flex flex-col gap-2 pb-24">
        {notifications.map((n) => (
          <Card key={n.id} style={{ opacity: n.read ? 0.55 : 1 }}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: n.type === "milestone" ? "#8FCB1F22" : "#D6127A18" }}>
                {n.type === "milestone" ? <Flame size={16} color="#5a8a10" /> : <TrendingUp size={16} color={FUCHSIA} />}
              </div>
              <div className="flex-1">
                <p style={{ color: INK, fontFamily: "Assistant" }} className="text-sm font-bold">{n.text}</p>
                <p style={{ color: SOFT, fontFamily: "Assistant" }} className="text-[11px] mt-0.5">{n.when}</p>
              </div>
              {!n.read && <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: FUCHSIA }} />}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AccountSettingsScreen({ onBack }) {
  const [locale, setLocale] = useState("he");
  const [whatsapp, setWhatsapp] = useState("");
  const [emailOn, setEmailOn] = useState(true);

  return (
    <div dir="rtl" style={{ background: PAPER, minHeight: "100vh", maxWidth: 440, margin: "0 auto", fontFamily: "'Rubik', system-ui" }}>
      <ScreenHeader title="הגדרות חשבון" onBack={onBack} />
      <div className="px-4 flex flex-col gap-4 pb-24">
        <div>
          <p style={{ color: SOFT, fontFamily: "Assistant" }} className="text-xs font-bold mb-1.5">שפת הדשבורד</p>
          <div className="flex gap-2">
            {[["he", "עברית"], ["en", "English"]].map(([key, label]) => (
              <button key={key} onClick={() => setLocale(key)} className="flex-1 py-2.5 rounded-2xl font-black text-sm" style={{ background: locale === key ? INK : CARD, color: locale === key ? "white" : INK, border: locale === key ? "none" : "1px solid #e4e2d8" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p style={{ color: SOFT, fontFamily: "Assistant" }} className="text-xs font-bold mb-1.5">מספר וואטסאפ (לתשתית התראות עתידית)</p>
          <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="05X-XXXXXXX" className="w-full rounded-2xl px-4 py-3 text-sm" style={{ background: CARD, border: "1px solid #e4e2d8", color: INK }} />
        </div>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <span style={{ color: INK, fontFamily: "Assistant" }} className="text-sm font-bold">התראות בתוך האפליקציה</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "#8FCB1F22", color: "#5a8a10" }}>תמיד פעיל</span>
          </div>
          <div className="flex items-center justify-between mb-1" style={{ borderTop: "1px solid #f0eee4", paddingTop: 12 }}>
            <span style={{ color: INK, fontFamily: "Assistant" }} className="text-sm font-bold">התראות במייל</span>
            <button onClick={() => setEmailOn((v) => !v)} style={{ width: 40, height: 22, borderRadius: 99, background: emailOn ? "#1FAE7A" : "#e4e2d8", position: "relative" }}>
              <div style={{ width: 18, height: 18, borderRadius: 99, background: "white", position: "absolute", top: 2, [emailOn ? "right" : "left"]: 2, transition: "all .2s" }} />
            </button>
          </div>
          <div className="flex items-center justify-between opacity-40" style={{ borderTop: "1px solid #f0eee4", paddingTop: 12, marginTop: 12 }}>
            <span style={{ color: INK, fontFamily: "Assistant" }} className="text-sm font-bold">התראות בוואטסאפ</span>
            <span className="text-xs font-bold" style={{ color: SOFT }}>בקרוב</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function PresetsScreen({ presets, setPresets, onBack }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  function openNew() { setEditing(null); setFormOpen(true); }
  function openEdit(p) { setEditing(p); setFormOpen(true); }
  function handleDelete(id) { setPresets((prev) => prev.filter((p) => p.id !== id)); }
  function handleSave(preset) {
    if (preset.id) setPresets((prev) => prev.map((p) => (p.id === preset.id ? { ...p, ...preset } : p)));
    else setPresets((prev) => [...prev, { ...preset, id: Date.now() }]);
    setFormOpen(false);
  }

  const money = presets.filter((p) => p.kind === "money");
  const privileges = presets.filter((p) => p.kind === "privilege");

  return (
    <div dir="rtl" style={{ background: PAPER, minHeight: "100vh", maxWidth: 440, margin: "0 auto", fontFamily: "'Rubik', system-ui" }}>
      <ScreenHeader title="ניהול תגמולים מהירים" onBack={onBack} />
      <p style={{ color: SOFT, fontFamily: "Assistant" }} className="text-xs px-4 mb-4">הצ'יפים שמופיעים בפאנל "שליחת בונוס" - אפשר להוסיף, לערוך ולמחוק בכל עת</p>
      <div className="px-4 flex flex-col gap-3 pb-24">
        <Card>
          <p style={{ color: INK, fontFamily: "Assistant" }} className="font-bold text-sm mb-1">כספי</p>
          {money.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid #f0eee4" }}>
              <span className="text-xs font-black px-3 py-1 rounded-full" style={{ background: "#8FCB1F22", color: "#5a8a10" }}>{p.label}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(p)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: PAPER }}><Pencil size={13} color={SOFT} /></button>
                <button onClick={() => handleDelete(p.id)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: PAPER }}><Trash2 size={13} color="#E24B4B" /></button>
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <p style={{ color: INK, fontFamily: "Assistant" }} className="font-bold text-sm mb-1">פינוקים</p>
          {privileges.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid #f0eee4" }}>
              <span className="text-xs font-black px-3 py-1 rounded-full" style={{ background: FUCHSIA + "18", color: FUCHSIA }}>{p.label}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(p)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: PAPER }}><Pencil size={13} color={SOFT} /></button>
                <button onClick={() => handleDelete(p.id)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: PAPER }}><Trash2 size={13} color="#E24B4B" /></button>
              </div>
            </div>
          ))}
        </Card>
        <button onClick={openNew} className="flex items-center justify-center gap-1.5 py-3 rounded-full font-black text-sm" style={{ background: INK, color: "white" }}>
          <Plus size={16} /> צ'יפ חדש
        </button>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setFormOpen(false)}>
          <PresetForm initial={editing} onSave={handleSave} onCancel={() => setFormOpen(false)} />
        </div>
      )}
    </div>
  );
}

function PresetForm({ initial, onSave, onCancel }) {
  const [kind, setKind] = useState(initial?.kind || "money");
  const [label, setLabel] = useState(initial?.kind === "privilege" ? initial.label : "");
  const [amount, setAmount] = useState(initial?.amount || 10);

  function save() {
    if (kind === "money") onSave({ id: initial?.id, kind: "money", label: `₪${amount}`, amount });
    else { if (!label.trim()) return; onSave({ id: initial?.id, kind: "privilege", label: label.trim() }); }
  }

  return (
    <div onClick={(e) => e.stopPropagation()} className="w-full rounded-t-3xl p-5" style={{ background: CARD, maxWidth: 440, margin: "0 auto" }}>
      <div className="flex items-center justify-between mb-4">
        <p style={{ color: INK, fontFamily: "Rubik" }} className="font-black text-base">{initial ? "עריכת צ'יפ" : "צ'יפ חדש"}</p>
        <button onClick={onCancel} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: PAPER }}><X size={16} color={SOFT} /></button>
      </div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setKind("money")} className="flex-1 py-2.5 rounded-2xl font-black text-sm" style={{ background: kind === "money" ? INK : PAPER, color: kind === "money" ? "white" : INK }}>כספי</button>
        <button onClick={() => setKind("privilege")} className="flex-1 py-2.5 rounded-2xl font-black text-sm" style={{ background: kind === "privilege" ? FUCHSIA : PAPER, color: kind === "privilege" ? "white" : INK }}>פינוק</button>
      </div>
      {kind === "money" ? (
        <div className="flex items-center justify-center gap-6 mb-2">
          <button onClick={() => setAmount((v) => Math.max(1, v - 1))} className="w-11 h-11 rounded-full font-black text-xl" style={{ background: PAPER, color: INK }}>-</button>
          <span style={{ color: "#5a8a10", fontFamily: "Rubik" }} className="text-4xl font-black">₪{amount}</span>
          <button onClick={() => setAmount((v) => v + 1)} className="w-11 h-11 rounded-full font-black text-xl" style={{ background: PAPER, color: INK }}>+</button>
        </div>
      ) : (
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="לדוגמה: פיצה למשפחה" className="w-full rounded-xl px-3 py-2.5 text-sm mb-2" style={{ background: PAPER, border: "1px solid #e4e2d8" }} />
      )}
      <button onClick={save} className="w-full py-3 rounded-full font-black text-sm mt-3" style={{ background: INK, color: "white" }}>
        <span className="flex items-center justify-center gap-1.5"><Check size={15} /> שמירה</span>
      </button>
    </div>
  );
}

export default function ParentDashboard() {
  const [children, setChildren] = useState(CHILDREN);
  const [activeChild, setActiveChild] = useState("noa");
  const [bonusOpen, setBonusOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customValue, setCustomValue] = useState("");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const [benchmarkOn, setBenchmarkOn] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [screen, setScreen] = useState("dashboard"); // dashboard | settings | edit-child | notifications | account | presets
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [presets, setPresets] = useState(INITIAL_PRESETS);

  const child = children.find((c) => c.id === activeChild);
  const withinDecade = child.stars % 10 || 10;
  const childActivity = ACTIVITY.filter((a) => a.child === activeChild);

  function send() {
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setBonusOpen(false);
      setSelectedPreset(null);
      setCustomValue("");
      setNote("");
    }, 1400);
  }

  function confirmWithdrawal(amount) {
    setChildren((prev) => prev.map((c) => (c.id === activeChild ? { ...c, money: c.money - amount } : c)));
    setUpdateOpen(false);
    setToast(true);
    setTimeout(() => setToast(false), 1500);
  }

  function saveChildEdit(updated) {
    setChildren((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setScreen("settings");
  }

  if (screen === "settings") return <SettingsMenu onBack={() => setScreen("dashboard")} onNavigate={setScreen} />;
  if (screen === "edit-child") return <EditChildScreen child={child} onBack={() => setScreen("settings")} onSave={saveChildEdit} />;
  if (screen === "notifications")
    return (
      <NotificationsScreen
        onBack={() => setScreen("settings")}
        notifications={notifications}
        onMarkAllRead={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
      />
    );
  if (screen === "account") return <AccountSettingsScreen onBack={() => setScreen("settings")} />;
  if (screen === "presets") return <PresetsScreen presets={presets} setPresets={setPresets} onBack={() => setScreen("settings")} />;

  return (
    <div dir="rtl" style={{ background: PAPER, minHeight: "100vh", maxWidth: 440, margin: "0 auto", fontFamily: "'Rubik', system-ui" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;700;900&family=Assistant:wght@400;600;700&display=swap');`}</style>

      {/* מעבר טאבים בין ילדים + כניסה להגדרות */}
      <div className="px-4 pt-5 pb-2 flex gap-2 items-center">
        {children.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveChild(c.id)}
            className="flex-1 rounded-2xl py-2.5 text-center font-black text-sm"
            style={{
              background: activeChild === c.id ? INK : CARD,
              color: activeChild === c.id ? "white" : INK,
              border: activeChild === c.id ? "none" : "1px solid #e4e2d8",
            }}
          >
            {c.name}
          </button>
        ))}
        <button onClick={() => setScreen("settings")} className="relative w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: CARD, border: "1px solid #e4e2d8" }}>
          <Settings size={16} color={SOFT} />
          {notifications.some((n) => !n.read) && (
            <div className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full" style={{ background: FUCHSIA }} />
          )}
        </button>
      </div>

      <div className="px-4 pb-24 flex flex-col gap-3 pt-2">
        {/* סיכום עליון */}
        <Card style={{ background: INK }}>
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-2.5">
              <p style={{ color: "#C6FF3D" }} className="text-7xl font-black leading-none">₪{child.money}</p>
              <button
                onClick={() => setUpdateOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full font-black text-[11px]"
                style={{ background: "rgba(198,255,61,0.16)", color: "#C6FF3D" }}
              >
                <Pencil size={11} /> עדכון
              </button>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1">
                <span style={{ color: "#FF3DBB" }} className="text-sm font-bold">{child.stars}</span>
                <span style={{ color: "#9BA3C7" }} className="text-xs">כוכבים</span>
              </div>
              <div className="flex items-center gap-1">
                <Flame size={12} color="#FFB63D" fill="#FFB63D" />
                <span style={{ color: "#9BA3C7" }} className="text-xs">{child.streak} ימים</span>
              </div>
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
            <div style={{ height: "100%", width: `${withinDecade * 10}%`, background: "linear-gradient(90deg, #FF3DBB, #FFB63D)" }} />
          </div>
          <p style={{ color: "#9BA3C7", fontFamily: "Assistant" }} className="text-[11px] mt-1.5">{withinDecade}/10 כוכבים לתגמול הבא</p>
        </Card>

        {/* גרף שיפור - הרכיב המרכזי */}
        <TrendCard childId={activeChild} />

        {/* פאנל שליחת בונוס */}
        <Card>
          <button onClick={() => setBonusOpen((v) => !v)} className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} color={FUCHSIA} />
              <p style={{ color: INK }} className="font-black text-sm">שליחת בונוס / הודעה</p>
            </div>
            <ChevronDown size={18} color={SOFT} style={{ transform: bonusOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
          </button>

          {bonusOpen && (
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {MONEY_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setSelectedPreset(p.label)}
                    className="px-3 py-1.5 rounded-full text-sm font-bold"
                    style={{
                      background: selectedPreset === p.label ? INK : PAPER,
                      color: selectedPreset === p.label ? "white" : INK,
                      border: "1px solid #e4e2d8",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
                {PRIVILEGE_PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedPreset(p)}
                    className="px-3 py-1.5 rounded-full text-sm font-bold"
                    style={{
                      background: selectedPreset === p ? FUCHSIA : PAPER,
                      color: selectedPreset === p ? "white" : INK,
                      border: "1px solid #e4e2d8",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <input
                value={customValue}
                onChange={(e) => { setCustomValue(e.target.value); setSelectedPreset(null); }}
                placeholder="או הקלידי סכום/פינוק משלך..."
                className="rounded-xl px-3 py-2 text-sm"
                style={{ background: PAPER, border: "1px solid #e4e2d8", fontFamily: "Assistant" }}
              />
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="מסר אישי (לא חובה) - למשל 'כל הכבוד מלכה שלי'"
                className="rounded-xl px-3 py-2 text-sm"
                style={{ background: PAPER, border: "1px solid #e4e2d8", fontFamily: "Assistant" }}
              />

              <button
                onClick={send}
                disabled={!selectedPreset && !customValue.trim()}
                className="py-2.5 rounded-full font-black text-sm disabled:opacity-30 flex items-center justify-center gap-1.5"
                style={{ background: sent ? "#1FAE7A" : INK, color: "white" }}
              >
                {sent ? <><Check size={16} /> נשלח לילד/ה!</> : <><Send size={15} /> שליחה</>}
              </button>
            </div>
          )}
        </Card>

        {/* פעילות אחרונה + תיקון ידני */}
        <div>
          <p style={{ color: INK }} className="font-black text-sm mb-2">פעילות אחרונה</p>
          <div className="flex flex-col gap-2">
            {childActivity.map((a) => (
              <Card key={a.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className="flex items-center gap-1 text-xs font-black"
                    style={{ color: a.correct ? "#1FAE7A" : "#E24B4B" }}
                  >
                    {a.correct ? <Check size={13} /> : <X size={13} />}
                    {a.correct ? "נכון" : "לא נכון"}
                  </span>
                  <span style={{ color: SOFT }} className="text-[11px]">{a.when}</span>
                </div>
                <p style={{ color: INK, fontFamily: "Assistant" }} className="text-sm mb-1">{a.q}</p>
                <p style={{ color: SOFT, fontFamily: "Assistant" }} className="text-xs mb-2">תשובתה: "{a.a}"</p>
                <button
                  className="text-xs font-bold px-3 py-1 rounded-full"
                  style={{ background: PAPER, color: SOFT, border: "1px solid #e4e2d8" }}
                >
                  תקן ידנית (אם Claude טעה)
                </button>
              </Card>
            ))}
          </div>
        </div>

        {/* השוואה - opt-in */}
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={15} color={SOFT} />
              <p style={{ color: INK }} className="font-black text-sm">השוואה אנונימית לילדים אחרים</p>
            </div>
            <button
              onClick={() => setBenchmarkOn((v) => !v)}
              style={{ width: 40, height: 22, borderRadius: 99, background: benchmarkOn ? "#1FAE7A" : "#e4e2d8", position: "relative" }}
            >
              <div style={{ width: 18, height: 18, borderRadius: 99, background: "white", position: "absolute", top: 2, [benchmarkOn ? "right" : "left"]: 2, transition: "all .2s" }} />
            </button>
          </div>
          {benchmarkOn ? (
            <p style={{ color: SOFT, fontFamily: "Assistant" }} className="text-xs mt-2">
              {child.name} נמצא/ת באחוזון ה-78 מבין ילדים בגילה בקטגוריית מתמטיקה השבוע
            </p>
          ) : (
            <p style={{ color: "#B5B9C4", fontFamily: "Assistant" }} className="text-xs mt-2">כבוי - מבוסס על נתונים מצטברים ואנונימיים בלבד אם יופעל</p>
          )}
        </Card>
      </div>

      {updateOpen && <UpdateSheet child={child} onClose={() => setUpdateOpen(false)} onConfirm={confirmWithdrawal} />}

      {toast && (
        <div
          className="fixed left-1/2 top-4 z-50 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-1.5"
          style={{ background: "#1FAE7A", color: "white", transform: "translateX(-50%)" }}
        >
          <Check size={14} /> עודכן בהצלחה
        </div>
      )}
    </div>
  );
}
