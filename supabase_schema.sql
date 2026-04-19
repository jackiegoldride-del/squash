-- ================================================================
-- הרץ את כל הקוד הזה ב-Supabase → SQL Editor → New Query
-- ================================================================

-- טבלת הזמנות
CREATE TABLE IF NOT EXISTS bookings (
  id          BIGSERIAL PRIMARY KEY,
  ds          TEXT NOT NULL,        -- תאריך YYYY-MM-DD
  court       TEXT NOT NULL,        -- מגרש 1-4
  slot        TEXT NOT NULL,        -- שעה HH:MM
  name        TEXT NOT NULL,
  phone       TEXT,
  membership  TEXT,
  type        TEXT DEFAULT 'customer', -- 'customer' | 'fixed'
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ds, court, slot)
);

-- טבלת הגדרות (שעות פתיחה וכו')
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- טבלת רשימת המתנה
CREATE TABLE IF NOT EXISTS waitlist (
  id          BIGSERIAL PRIMARY KEY,
  ds          TEXT NOT NULL,
  court       TEXT NOT NULL,
  slot        TEXT NOT NULL,
  name        TEXT NOT NULL,
  phone       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- טבלת תחזוקה
CREATE TABLE IF NOT EXISTS maintenance (
  id          BIGSERIAL PRIMARY KEY,
  ds          TEXT NOT NULL,
  court       TEXT NOT NULL,
  slot        TEXT NOT NULL,
  UNIQUE(ds, court, slot)
);

-- ================================================================
-- Row Level Security — הכל פתוח (האפליקציה מנהלת הרשאות בקוד)
-- ================================================================
ALTER TABLE bookings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist    ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_bookings"    ON bookings    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_settings"    ON settings    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_waitlist"    ON waitlist    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_maintenance" ON maintenance FOR ALL USING (true) WITH CHECK (true);
