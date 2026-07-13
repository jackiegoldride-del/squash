// Knockout (single elimination) brackets for 2..64 players.
// Bracket size is the next power of two (2/4/8/16/32/64); missing slots become
// byes that go to the top seeds, so 8/16/32/64 draws work exactly and any
// in-between count works with byes.

export const MAX_BRACKET = 64

export function bracketSize(playerCount) {
  let size = 2
  while (size < playerCount) size *= 2
  return size
}

// Standard seeding positions: for size 8 → [1,8,4,5,2,7,3,6],
// so seed 1 and seed 2 can only meet in the final.
export function seedOrder(size) {
  let order = [1]
  while (order.length < size) {
    const next = []
    const len = order.length * 2
    for (const s of order) next.push(s, len + 1 - s)
    order = next
  }
  return order
}

export function roundName(playersInRound, lang = 'he') {
  const names = {
    2: { he: 'גמר', en: 'Final' },
    4: { he: 'חצי גמר', en: 'Semifinals' },
    8: { he: 'רבע גמר', en: 'Quarterfinals' },
    16: { he: 'שמינית גמר', en: 'Round of 16' },
    32: { he: 'סיבוב 32', en: 'Round of 32' },
    64: { he: 'סיבוב 64', en: 'Round of 64' },
  }
  return names[playersInRound]?.[lang] ?? `${playersInRound} players`
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// players: array of names. If seeded=true the array order is the seeding
// (players[0] is the #1 seed); otherwise the draw is random.
export function createBracket(players, { seeded = true } = {}) {
  if (players.length < 2) throw new Error('נדרשים לפחות 2 שחקנים')
  if (players.length > MAX_BRACKET) throw new Error(`מקסימום ${MAX_BRACKET} שחקנים`)
  const unique = new Set(players)
  if (unique.size !== players.length) throw new Error('יש שמות כפולים ברשימת השחקנים')

  const ordered = seeded ? [...players] : shuffle(players)
  const size = bracketSize(ordered.length)
  const slots = seedOrder(size).map(seed => (seed <= ordered.length ? ordered[seed - 1] : null))

  const rounds = []
  let matchesInRound = size / 2
  let roundIndex = 0
  while (matchesInRound >= 1) {
    const matches = []
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        id: `R${roundIndex + 1}M${i + 1}`,
        p1: roundIndex === 0 ? slots[i * 2] : null,
        p2: roundIndex === 0 ? slots[i * 2 + 1] : null,
        winner: null,
        score: null,
        bye: false,
      })
    }
    rounds.push({ name: roundName(matchesInRound * 2), matches })
    matchesInRound /= 2
    roundIndex++
  }

  const bracket = { size, rounds, champion: null }
  // Auto-advance byes in round 1.
  for (const match of rounds[0].matches) {
    if (match.p1 && !match.p2) advanceWinner(bracket, match, match.p1, null, true)
    else if (!match.p1 && match.p2) advanceWinner(bracket, match, match.p2, null, true)
  }
  return bracket
}

function locate(bracket, matchId) {
  for (let r = 0; r < bracket.rounds.length; r++) {
    const m = bracket.rounds[r].matches.findIndex(x => x.id === matchId)
    if (m !== -1) return { r, m, match: bracket.rounds[r].matches[m] }
  }
  return null
}

function advanceWinner(bracket, match, winner, score, bye = false) {
  match.winner = winner
  match.score = score
  match.bye = bye
  const loc = locate(bracket, match.id)
  const nextRound = bracket.rounds[loc.r + 1]
  if (!nextRound) {
    bracket.champion = winner
    return
  }
  const next = nextRound.matches[Math.floor(loc.m / 2)]
  if (loc.m % 2 === 0) next.p1 = winner
  else next.p2 = winner
}

export function reportResult(bracket, matchId, winner, score = null) {
  const loc = locate(bracket, matchId)
  if (!loc) throw new Error(`משחק ${matchId} לא נמצא`)
  const { match } = loc
  if (match.winner) throw new Error(`במשחק ${matchId} כבר נקבעה תוצאה (${match.winner})`)
  if (!match.p1 || !match.p2) throw new Error(`משחק ${matchId} עדיין לא מאויש בשני שחקנים`)
  if (winner !== match.p1 && winner !== match.p2) {
    throw new Error(`"${winner}" לא משחק במשחק ${matchId} (${match.p1} נגד ${match.p2})`)
  }
  advanceWinner(bracket, match, winner, score)
  return match
}

export function renderBracket(name, bracket) {
  const lines = [`🏆 ${name} — מסלול נוק-אאוט (${bracket.size} מקומות)`]
  for (const round of bracket.rounds) {
    lines.push('', `── ${round.name} ──`)
    for (const m of round.matches) {
      const p1 = m.p1 ?? '—'
      const p2 = m.p2 ?? (m.bye && m.winner ? 'Bye' : '—')
      let status = ''
      if (m.winner) status = m.bye ? ` → ${m.winner} (עלה אוטומטית)` : ` → ניצח ${m.winner}${m.score ? ` (${m.score})` : ''}`
      lines.push(`  [${m.id}] ${p1} נגד ${p2}${status}`)
    }
  }
  if (bracket.champion) lines.push('', `🥇 אלוף/ה: ${bracket.champion}`)
  return lines.join('\n')
}
