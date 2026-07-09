# 🎾 SQUASH MATCH

אפליקציית התאמת שותפים לסקווש — React + Vite + Supabase.
A bilingual (Hebrew/English) squash partner-matching app with a USR-style rating system.

## Features

- **Rating quiz** — 11 questions (first = gender, not scored; 10 skill questions scored 1–5) mapping to a USR rating of 2.0–5.5
- **Partner matching** — players within ±0.5 rating, with gender filter and WhatsApp coordination
- **Dual-confirmed results** — win/loss reports only take effect after the opponent confirms
- **Rating protection** — max 1 rated game per week vs the same opponent; ratings only move after 3+ unique opponents
- **ELO-style updates** — ±0.1 to ±0.3 per game (bigger swings for upsets); precise internal rating, 0.5-step display
- **10 achievement badges**, head-to-head screen, personal stats with rating history chart, endless leaderboard (no medals)
- **Admin panel** — player database by level with phone numbers and wa.me links, broadcast/level/private messages, force-approve or delete pending results, delete players
- Dark theme with cyan–purple gradients, full RTL support

The app runs in **demo mode** (browser localStorage) until Supabase env vars are set, so you can try it immediately with `npm run dev`.

## Local development

```bash
npm install
cp .env.example .env   # fill in your values
npm run dev
```

---

## שלב 1 — Supabase

1. היכנסי ל-https://supabase.com ולחצי **New Project** (שם: `squash-match`, אזור: West EU)
2. בתפריט: **SQL Editor → New Query**
3. העתיקי את כל התוכן של `supabase/schema.sql` והדביקי → **Run**
   (אמור להופיע: "Success. No rows returned")
4. בתפריט: **Settings → API** והעתיקי:
   - **Project URL** (למשל `https://abcdefgh.supabase.co`)
   - **anon public** key (מחרוזת ארוכה שמתחילה ב-`eyJ...`)

## שלב 2 — Vercel

1. היכנסי ל-https://vercel.com → **Add New Project**
2. ייבאי את הריפוזיטורי `squash` מ-GitHub (Framework Preset: **Vite** — מזוהה אוטומטית)
3. תחת **Environment Variables** הוסיפי:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | ה-Project URL מ-Supabase |
| `VITE_SUPABASE_ANON_KEY` | מפתח ה-anon מ-Supabase |
| `VITE_ADMIN_PASSWORD` | סיסמת מנהל חזקה שתבחרי |

4. לחצי **Deploy** — תוך דקה יש לינק לשליחה לשחקנים 🎉

## Admin panel

- From the login screen tap **"כניסת מנהל" / "Admin login"**
- Username: `jackie` · Password: the value of `VITE_ADMIN_PASSWORD`
- If the env var is not set, the password defaults to **`squash2024`** —
  set `VITE_ADMIN_PASSWORD` in Vercel to change it for production

> ⚠️ Note: this is a client-side app — the admin password and the Supabase anon
> key are embedded in the built bundle, and the database uses open RLS policies.
> That is fine for a friendly club app, but don't store sensitive data here.

## Rating system

- Quiz total (10–50) maps linearly to USR **2.0–5.5**
- On a confirmed result: winner gains `0.1 + 0.2 × (1 − expected)` — between **+0.1** (beating a much weaker player) and **+0.3** (a big upset); the loser loses the same amount
- Internal rating is precise (2 decimals); the displayed rating moves in **0.5 steps**
- Protection: a result vs an opponent you already had a rated game with in the past 7 days is recorded but **unrated**; a player's rating is frozen until they've played **3+ unique opponents**
