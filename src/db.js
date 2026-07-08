import { supabase } from './supabase.js'

// Data layer: Supabase when configured, localStorage fallback otherwise.
// All functions are async and return plain objects/arrays.

export const isCloud = () => !!supabase

const LS_KEY = 'squash_match_db_v1'

function lsRead() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* corrupted store -> reset */ }
  return { players: [], matches: [], match_requests: [], messages: [] }
}

function lsWrite(db) {
  localStorage.setItem(LS_KEY, JSON.stringify(db))
}

export function newId() {
  return crypto.randomUUID ? crypto.randomUUID() :
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })
}

async function fetchTable(table) {
  if (supabase) {
    const { data, error } = await supabase.from(table).select('*')
    if (error) { console.error(`fetch ${table}:`, error); return [] }
    return data
  }
  return lsRead()[table]
}

async function insertRow(table, row) {
  if (supabase) {
    const { error } = await supabase.from(table).insert(row)
    if (error) { console.error(`insert ${table}:`, error); throw error }
    return row
  }
  const db = lsRead()
  db[table].push(row)
  lsWrite(db)
  return row
}

async function updateRow(table, id, patch) {
  if (supabase) {
    const { error } = await supabase.from(table).update(patch).eq('id', id)
    if (error) { console.error(`update ${table}:`, error); throw error }
    return
  }
  const db = lsRead()
  const i = db[table].findIndex(r => r.id === id)
  if (i >= 0) { db[table][i] = { ...db[table][i], ...patch }; lsWrite(db) }
}

async function deleteRow(table, id) {
  if (supabase) {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) { console.error(`delete ${table}:`, error); throw error }
    return
  }
  const db = lsRead()
  db[table] = db[table].filter(r => r.id !== id)
  lsWrite(db)
}

// ─── Players ─────────────────────────────────────────────────────────────
export const getPlayers = () => fetchTable('players')
export const createPlayer = p => insertRow('players', p)
export const updatePlayer = (id, patch) => updateRow('players', id, patch)

export async function deletePlayer(id) {
  if (supabase) return deleteRow('players', id) // FK cascade cleans the rest
  const db = lsRead()
  db.players = db.players.filter(p => p.id !== id)
  db.matches = db.matches.filter(m => m.player_a !== id && m.player_b !== id)
  db.match_requests = db.match_requests.filter(r => r.from_player !== id && r.to_player !== id)
  db.messages = db.messages.filter(m => m.to_player !== id)
  lsWrite(db)
}

// ─── Matches ─────────────────────────────────────────────────────────────
export const getMatches = () => fetchTable('matches')
export const createMatch = m => insertRow('matches', m)
export const updateMatch = (id, patch) => updateRow('matches', id, patch)
export const deleteMatch = id => deleteRow('matches', id)

// ─── Match requests ──────────────────────────────────────────────────────
export const getRequests = () => fetchTable('match_requests')
export const createRequest = r => insertRow('match_requests', r)
export const updateRequest = (id, patch) => updateRow('match_requests', id, patch)

// ─── Messages ────────────────────────────────────────────────────────────
export const getMessages = () => fetchTable('messages')
export const createMessage = m => insertRow('messages', m)
export const deleteMessage = id => deleteRow('messages', id)

export async function loadAll() {
  const [players, matches, requests, messages] = await Promise.all([
    getPlayers(), getMatches(), getRequests(), getMessages(),
  ])
  return { players, matches, requests, messages }
}
