// Simple JSON-file persistence. All competitions live in one file so the
// server survives restarts. Override the location with TOURNAMENT_DATA_DIR.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const defaultDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data')
const dataDir = process.env.TOURNAMENT_DATA_DIR || defaultDir
const dataFile = path.join(dataDir, 'competitions.json')

export function load() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'))
  } catch {
    return { competitions: {} }
  }
}

export function save(db) {
  fs.mkdirSync(dataDir, { recursive: true })
  const tmp = dataFile + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2))
  fs.renameSync(tmp, dataFile)
}

export function newId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 6)}`
}

export function getCompetition(db, id) {
  const comp = db.competitions[id]
  if (!comp) {
    const known = Object.keys(db.competitions).join(', ') || 'אין תחרויות שמורות'
    throw new Error(`תחרות "${id}" לא נמצאה. מזהים קיימים: ${known}`)
  }
  return comp
}
