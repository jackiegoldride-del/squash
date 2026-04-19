import { supabase } from './supabase.js'

// ─── BOOKINGS ──────────────────────────────────────────────────────────────────

export async function fetchBookings() {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
  if (error) { console.error('fetchBookings:', error); return {} }

  // Convert flat rows → nested object: { ds: { court: { slot: booking } } }
  const result = {}
  for (const row of data) {
    if (!result[row.ds]) result[row.ds] = {}
    if (!result[row.ds][row.court]) result[row.ds][row.court] = {}
    result[row.ds][row.court][row.slot] = {
      name: row.name,
      phone: row.phone,
      membership: row.membership,
      type: row.type,
      id: row.id,
    }
  }
  return result
}

export async function addBooking({ ds, court, slot, name, phone, membership, type }) {
  const { error } = await supabase
    .from('bookings')
    .upsert({ ds, court: String(court), slot, name, phone, membership, type },
             { onConflict: 'ds,court,slot' })
  if (error) console.error('addBooking:', error)
}

export async function deleteBooking({ ds, court, slot }) {
  const { error } = await supabase
    .from('bookings')
    .delete()
    .match({ ds, court: String(court), slot })
  if (error) console.error('deleteBooking:', error)
}

export async function updateBooking({ ds, court, slot, name, phone, membership, type }) {
  const { error } = await supabase
    .from('bookings')
    .update({ name, phone, membership, type })
    .match({ ds, court: String(court), slot })
  if (error) console.error('updateBooking:', error)
}

// ─── HOURS ────────────────────────────────────────────────────────────────────

export async function fetchHours() {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'hours')
    .single()
  if (error || !data) return null
  return JSON.parse(data.value)
}

export async function saveHoursDB(hours) {
  const { error } = await supabase
    .from('settings')
    .upsert({ key: 'hours', value: JSON.stringify(hours) }, { onConflict: 'key' })
  if (error) console.error('saveHours:', error)
}

// ─── WAITLIST ─────────────────────────────────────────────────────────────────

export async function fetchWaitlist() {
  const { data, error } = await supabase
    .from('waitlist')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) { console.error('fetchWaitlist:', error); return {} }

  const result = {}
  for (const row of data) {
    if (!result[row.ds]) result[row.ds] = {}
    if (!result[row.ds][row.court]) result[row.ds][row.court] = {}
    if (!result[row.ds][row.court][row.slot]) result[row.ds][row.court][row.slot] = []
    result[row.ds][row.court][row.slot].push({ name: row.name, phone: row.phone })
  }
  return result
}

export async function addWaitlist({ ds, court, slot, name, phone }) {
  const { error } = await supabase
    .from('waitlist')
    .insert({ ds, court: String(court), slot, name, phone })
  if (error) console.error('addWaitlist:', error)
}

// ─── MAINTENANCE ──────────────────────────────────────────────────────────────

export async function fetchMaintenance() {
  const { data, error } = await supabase
    .from('maintenance')
    .select('*')
  if (error) { console.error('fetchMaintenance:', error); return {} }

  const result = {}
  for (const row of data) {
    if (!result[row.ds]) result[row.ds] = {}
    if (!result[row.ds][row.court]) result[row.ds][row.court] = {}
    result[row.ds][row.court][row.slot] = true
  }
  return result
}

export async function toggleMaintenanceDB({ ds, court, slot, active }) {
  if (active) {
    const { error } = await supabase
      .from('maintenance')
      .upsert({ ds, court: String(court), slot }, { onConflict: 'ds,court,slot' })
    if (error) console.error('addMaintenance:', error)
  } else {
    const { error } = await supabase
      .from('maintenance')
      .delete()
      .match({ ds, court: String(court), slot })
    if (error) console.error('deleteMaintenance:', error)
  }
}
