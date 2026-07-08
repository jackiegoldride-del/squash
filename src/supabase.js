import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// When the env vars are missing the app transparently falls back to
// localStorage (see db.js), so it can be demoed before Supabase is set up.
export const supabase = url && key ? createClient(url, key) : null
