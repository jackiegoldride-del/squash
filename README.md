# 🎾 קאנטרי נווה שרת — אפליקציית סקווש
## מדריך פריסה מלא — Supabase + Vercel

---

## שלב 1 — הכנת מסד הנתונים (Supabase)

### 1.1 צור חשבון Supabase
1. כנס ל: https://supabase.com
2. לחץ **Start your project** → התחבר עם GitHub
3. לחץ **New Project**
   - Name: `neve-sharet-squash`
   - Password: בחר סיסמה חזקה (שמור אותה!)
   - Region: **Israel (eu-west-1)** או **West EU**
4. המתן ~2 דקות עד שהפרויקט מוכן

### 1.2 צור את הטבלאות
1. בתפריט שמאל → לחץ **SQL Editor**
2. לחץ **New Query**
3. פתח את הקובץ `supabase_schema.sql` מהתיקייה
4. העתק את כל התוכן והדבק בחלון
5. לחץ **Run** (Ctrl+Enter)
6. אמור לראות: "Success. No rows returned"

### 1.3 קבל את מפתחות ה-API
1. בתפריט שמאל → **Settings** → **API**
2. העתק את:
   - **Project URL** (נראה כך: `https://abcdefgh.supabase.co`)
   - **anon public** key (מחרוזת ארוכה שמתחילה ב-`eyJ...`)
3. שמור אותם — תצטרכי אותם בשלב 3

---

## שלב 2 — העלאה ל-GitHub

### 2.1 צור חשבון GitHub (אם אין)
1. כנסי ל: https://github.com
2. לחצי **Sign up** → מייל + סיסמה + שם משתמש

### 2.2 צור Repository חדש
1. לחצי על **+** (פינה ימנית עליונה) → **New repository**
2. Name: `squash-booking`
3. Public ✓ (חינם)
4. לחצי **Create repository**

### 2.3 העלי את הקבצים
שיטה קלה — דרך האתר:
1. בדף הריפוזיטורי, לחצי **uploading an existing file**
2. גרור את כל התיקייה `squash-app` לחלון
3. לחצי **Commit changes**

**או** דרך Terminal (אם מותקן Git):
```bash
cd squash-app
git init
git add .
git commit -m "first commit"
git remote add origin https://github.com/YOUR_USERNAME/squash-booking.git
git push -u origin main
```

---

## שלב 3 — פריסה ב-Vercel

### 3.1 צור חשבון Vercel
1. כנסי ל: https://vercel.com
2. לחצי **Sign Up** → **Continue with GitHub**
3. אשרי את ההרשאות

### 3.2 ייבא את הפרויקט
1. לחצי **Add New Project**
2. מצאי את `squash-booking` ולחצי **Import**
3. Framework Preset: **Vite** (יזוהה אוטומטית)
4. לחצי **Environment Variables** — הוסיפי:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://abcdefgh.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` (המפתח הארוך) |

5. לחצי **Deploy**
6. המתיני ~1 דקה

### 3.3 קבלי את הלינק!
Vercel תיתן לך כתובת כמו:
```
https://squash-booking-neve-sharet.vercel.app
```
**זהו! שלחי את הלינק הזה ללקוחות** 🎉

---

## שלב 4 — כתובת מותאמת (אופציונלי)

אם רוצה כתובת כמו `squash.neve-sharet.co.il`:
1. קני דומיין ב-GoDaddy או Namecheap (~₪40/שנה)
2. ב-Vercel → Settings → Domains → הוסיפי את הדומיין
3. עדכני את ה-DNS לפי ההוראות של Vercel

---

## עדכון האפליקציה בעתיד

כל שינוי בקוד:
1. עדכני את הקבצים ב-GitHub (גרור ושחרר שוב)
2. Vercel מעדכנת אוטומטית תוך דקה! ✨

---

## תמיכה

**אם משהו לא עובד:**
- בדקי שה-SQL רץ ללא שגיאות
- ודאי שה-URL ו-ANON_KEY מדויקים (ללא רווחים)
- ב-Vercel: לחצי Deployments → בדקי שאין שגיאות Build

---

## פרטי הכניסה לאפליקציה
- **סיסמת מנהל:** `squash2024`
- ניתן לשנות בקובץ `src/App.jsx` בשורה: `const ADMIN_PWD = "squash2024"`
