// Round-robin leagues using the circle method. Handles any player count
// (odd counts get a bye each round), single or double round robin, and
// configurable league points. Standings are computed from recorded results.

export function roundRobinRounds(players) {
  const ps = [...players]
  if (ps.length % 2 === 1) ps.push(null) // bye slot
  const n = ps.length
  const rounds = []
  const arr = [...ps]
  for (let r = 0; r < n - 1; r++) {
    const matches = []
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i]
      const b = arr[n - 1 - i]
      if (a !== null && b !== null) {
        // Alternate who is listed first so "home/away" balance is fair.
        matches.push(r % 2 === 0 ? [a, b] : [b, a])
      }
    }
    rounds.push(matches)
    // Rotate all but the first player.
    arr.splice(1, 0, arr.pop())
  }
  return rounds
}

export function createLeague(players, { doubleRound = false } = {}) {
  if (players.length < 3) throw new Error('ליגה צריכה לפחות 3 שחקנים')
  if (players.length > 24) throw new Error('מקסימום 24 שחקנים בליגה אחת')
  const unique = new Set(players)
  if (unique.size !== players.length) throw new Error('יש שמות כפולים ברשימת השחקנים')

  let rounds = roundRobinRounds(players)
  if (doubleRound) {
    const secondLeg = rounds.map(matches => matches.map(([a, b]) => [b, a]))
    rounds = rounds.concat(secondLeg)
  }

  const fixtures = []
  rounds.forEach((matches, r) => {
    matches.forEach(([p1, p2], i) => {
      fixtures.push({
        id: `S${r + 1}M${i + 1}`,
        round: r + 1,
        p1,
        p2,
        played: false,
        games1: null,
        games2: null,
        winner: null,
      })
    })
  })
  return { rounds: rounds.length, fixtures }
}

export function recordResult(league, player1, player2, games1, games2) {
  if (games1 === games2) throw new Error('בסקווש אין תיקו — מספר המשחקונים חייב להיות שונה')
  const fixture = league.fixtures.find(
    f => (f.p1 === player1 && f.p2 === player2) || (f.p1 === player2 && f.p2 === player1)
  )
  if (!fixture) throw new Error(`לא נמצא משחק בין "${player1}" ל"${player2}" בליגה הזו`)
  if (fixture.played) {
    throw new Error(`התוצאה בין ${player1} ל${player2} כבר נרשמה (${fixture.games1}:${fixture.games2})`)
  }
  // Store games relative to the fixture's p1/p2 order.
  if (fixture.p1 === player1) {
    fixture.games1 = games1
    fixture.games2 = games2
  } else {
    fixture.games1 = games2
    fixture.games2 = games1
  }
  fixture.played = true
  fixture.winner = games1 > games2 ? player1 : player2
  return fixture
}

export function standings(league) {
  const { pointsWin, pointsLoss } = league.settings
  const table = new Map(
    league.players.map(p => [
      p,
      { player: p, played: 0, wins: 0, losses: 0, gamesFor: 0, gamesAgainst: 0, points: 0 },
    ])
  )
  for (const f of league.fixtures) {
    if (!f.played) continue
    const r1 = table.get(f.p1)
    const r2 = table.get(f.p2)
    r1.played++
    r2.played++
    r1.gamesFor += f.games1
    r1.gamesAgainst += f.games2
    r2.gamesFor += f.games2
    r2.gamesAgainst += f.games1
    if (f.winner === f.p1) {
      r1.wins++; r1.points += pointsWin
      r2.losses++; r2.points += pointsLoss
    } else {
      r2.wins++; r2.points += pointsWin
      r1.losses++; r1.points += pointsLoss
    }
  }
  const rows = [...table.values()]
  rows.sort((a, b) =>
    b.points - a.points ||
    (b.gamesFor - b.gamesAgainst) - (a.gamesFor - a.gamesAgainst) ||
    b.gamesFor - a.gamesFor ||
    a.player.localeCompare(b.player, 'he')
  )
  return rows
}

export function renderStandings(league) {
  const rows = standings(league)
  const lines = [
    `📊 טבלת ליגה — ${league.name}${league.season ? ` (${league.season})` : ''}`,
    '',
    '#  | שחקן | משחקים | נצחונות | הפסדים | משחקונים | נקודות',
    '---|------|--------|---------|--------|----------|-------',
  ]
  rows.forEach((r, i) => {
    lines.push(
      `${i + 1}  | ${r.player} | ${r.played} | ${r.wins} | ${r.losses} | ${r.gamesFor}:${r.gamesAgainst} | ${r.points}`
    )
  })
  const remaining = league.fixtures.filter(f => !f.played).length
  lines.push('', `נותרו ${remaining} משחקים מתוך ${league.fixtures.length}`)
  return lines.join('\n')
}

export function renderFixtures(league, { round = null, player = null } = {}) {
  let fixtures = league.fixtures
  if (round !== null) fixtures = fixtures.filter(f => f.round === round)
  if (player !== null) fixtures = fixtures.filter(f => f.p1 === player || f.p2 === player)
  const lines = [`📅 לוח משחקים — ${league.name} (${league.rounds} סיבובים, ${league.fixtures.length} משחקים)`]
  let currentRound = null
  for (const f of fixtures) {
    if (f.round !== currentRound) {
      currentRound = f.round
      lines.push('', `── סיבוב ${f.round} ──`)
    }
    const result = f.played ? ` ✅ ${f.games1}:${f.games2} (ניצח ${f.winner})` : ''
    lines.push(`  [${f.id}] ${f.p1} נגד ${f.p2}${result}`)
  }
  if (fixtures.length === 0) lines.push('', 'לא נמצאו משחקים מתאימים')
  return lines.join('\n')
}
