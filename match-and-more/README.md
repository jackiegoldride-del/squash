# Match & More — דף המתנה (Coming Soon)

דף נחיתה ליצירת רשימת המתנה למותג **Match & More** מבית **Jackie Goldride**.
קובץ אחד בלבד (`index.html`) — בלי build, בלי תלויות.

## העלאה לאוויר (5 דקות)

1. היכנסי ל-https://vercel.com → **Add New Project**
2. ייבאי את הריפו `squash`, ותחת **Root Directory** בחרי `match-and-more`
   (Framework Preset: **Other** — זה סתם קובץ HTML)
3. **Deploy** — ויש לינק להפצה בסטורי ובוואטסאפ 🎉

לחלופין: גררי את הקובץ `index.html` ל-https://app.netlify.com/drop — עולה תוך שניות.

## חיבור דומיין

אחרי הרכישה (למשל `jackiegoldride.com`, ~50 ₪ לשנה):
Vercel → Project → **Settings → Domains** → הוסיפי את הדומיין ועקבי אחרי ההוראות.

## שמירת נרשמים ב-Supabase (מומלץ)

כל עוד לא חיברת Supabase, הטופס פותח מייל מוכן לשליחה אלייך — עובד, אבל ידני.
כדי שנרשמים יישמרו אוטומטית בטבלה:

1. בפרויקט ה-Supabase הקיים שלך: **SQL Editor → New Query**, הריצי:

```sql
create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table waitlist enable row level security;

-- הציבור יכול רק להירשם — לא לקרוא את הרשימה
create policy "public can insert" on waitlist
  for insert with check (true);
```

2. ב-`index.html`, בראש ה-`<script>`, מלאי:
   - `SUPABASE_URL` — ה-Project URL (Settings → API)
   - `SUPABASE_ANON_KEY` — מפתח ה-anon
   - `APP_URL` — הלינק ל-SQUASH MATCH (לכפתור בפוטר)

3. את הנרשמים רואים ב-**Table Editor → waitlist** (רק את, דרך הדשבורד — ה-RLS חוסם קריאה ציבורית).

## מה יש בדף

- מיתוג Match & More / Jackie Goldride בשפת האפליקציה (כהה, ציאן–סגול, RTL)
- מסר FOMO: 50 מקומות מייסדים, תוכן שלא יעלה לפיד, גישה מוקדמת
- טופס שם + אימייל עם מסך "את/ה בפנים" אחרי הרשמה
- פוטר עם לינק לאפליקציית SQUASH MATCH
