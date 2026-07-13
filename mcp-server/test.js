// Self-test for the tournament/league logic. Run: node test.js
import assert from 'node:assert/strict'
import { createBracket, reportResult, seedOrder, bracketSize } from './lib/knockout.js'
import { createLeague, roundRobinRounds, recordResult, standings } from './lib/league.js'

const players = n => Array.from({ length: n }, (_, i) => `שחקן ${i + 1}`)

// ── Knockout ────────────────────────────────────────────────────────────
assert.deepEqual(seedOrder(8), [1, 8, 4, 5, 2, 7, 3, 6])
assert.equal(bracketSize(8), 8)
assert.equal(bracketSize(9), 16)
assert.equal(bracketSize(33), 64)

for (const n of [8, 16, 32, 64]) {
  const b = createBracket(players(n))
  assert.equal(b.size, n)
  assert.equal(b.rounds[0].matches.length, n / 2)
  assert.equal(b.rounds.at(-1).matches.length, 1)
  // Every player appears exactly once in round 1.
  const r1 = b.rounds[0].matches.flatMap(m => [m.p1, m.p2])
  assert.deepEqual([...r1].sort(), [...players(n)].sort())
  // Seeds 1 and 2 are in opposite halves.
  const half = b.rounds[0].matches.length / 2
  const idx1 = b.rounds[0].matches.findIndex(m => m.p1 === 'שחקן 1' || m.p2 === 'שחקן 1')
  const idx2 = b.rounds[0].matches.findIndex(m => m.p1 === 'שחקן 2' || m.p2 === 'שחקן 2')
  assert.ok((idx1 < half) !== (idx2 < half), `seeds 1 and 2 must be in opposite halves (n=${n})`)
}

// Byes: 12 players in a 16 bracket → top 4 seeds skip round 1.
{
  const b = createBracket(players(12))
  assert.equal(b.size, 16)
  const byes = b.rounds[0].matches.filter(m => m.bye)
  assert.equal(byes.length, 4)
  assert.deepEqual(byes.map(m => m.winner).sort(), ['שחקן 1', 'שחקן 2', 'שחקן 3', 'שחקן 4'].sort())
}

// Playing a full 8-player tournament: higher seed always wins → seed 1 champion.
{
  const b = createBracket(players(8))
  for (const round of b.rounds) {
    for (const m of round.matches) {
      const w = parseInt(m.p1.split(' ')[1]) < parseInt(m.p2.split(' ')[1]) ? m.p1 : m.p2
      reportResult(b, m.id, w, '3:0')
    }
  }
  assert.equal(b.champion, 'שחקן 1')
  // Final should have been seeds 1 vs 2.
  const final = b.rounds.at(-1).matches[0]
  assert.deepEqual([final.p1, final.p2].sort(), ['שחקן 1', 'שחקן 2'].sort())
}

// Invalid inputs.
assert.throws(() => createBracket(['רק אחד']))
assert.throws(() => createBracket(players(65)))
assert.throws(() => createBracket(['א', 'א']))
{
  const b = createBracket(players(4))
  assert.throws(() => reportResult(b, 'R1M1', 'לא קיים'))
  reportResult(b, 'R1M1', 'שחקן 1')
  assert.throws(() => reportResult(b, 'R1M1', 'שחקן 1')) // already reported
  assert.throws(() => reportResult(b, 'R2M1', 'שחקן 1')) // opponent not decided yet
}

// ── Round robin ─────────────────────────────────────────────────────────
for (const n of [7, 8, 9, 10, 11, 12]) {
  const rounds = roundRobinRounds(players(n))
  const expectedRounds = n % 2 === 0 ? n - 1 : n
  assert.equal(rounds.length, expectedRounds)
  // Every pair meets exactly once.
  const seen = new Set()
  for (const matches of rounds) {
    const inRound = new Set()
    for (const [a, b] of matches) {
      const key = [a, b].sort().join('|')
      assert.ok(!seen.has(key), `pair ${key} repeated (n=${n})`)
      seen.add(key)
      assert.ok(!inRound.has(a) && !inRound.has(b), `player plays twice in one round (n=${n})`)
      inRound.add(a); inRound.add(b)
    }
  }
  assert.equal(seen.size, (n * (n - 1)) / 2)
}

// Double round robin doubles the fixtures.
{
  const single = createLeague(players(9))
  const dbl = createLeague(players(9), { doubleRound: true })
  assert.equal(dbl.fixtures.length, single.fixtures.length * 2)
}

// Standings math.
{
  const { rounds, fixtures } = createLeague(players(4))
  const league = {
    name: 'בדיקה', season: null, players: players(4), rounds, fixtures,
    settings: { pointsWin: 3, pointsLoss: 1 },
  }
  recordResult(league, 'שחקן 1', 'שחקן 2', 3, 1)
  recordResult(league, 'שחקן 3', 'שחקן 1', 0, 3) // reversed order still works
  const table = standings(league)
  assert.equal(table[0].player, 'שחקן 1')
  assert.equal(table[0].points, 6)
  assert.equal(table[0].wins, 2)
  assert.equal(table[0].gamesFor, 6)
  assert.equal(table[0].gamesAgainst, 1)
  assert.throws(() => recordResult(league, 'שחקן 1', 'שחקן 2', 3, 0)) // already played
  assert.throws(() => recordResult(league, 'שחקן 1', 'שחקן 9', 3, 0)) // no such fixture
  assert.throws(() => recordResult(league, 'שחקן 2', 'שחקן 4', 2, 2)) // no draws
}

assert.throws(() => createLeague(players(2)))
assert.throws(() => createLeague(players(25)))

console.log('✅ כל הבדיקות עברו — נוק-אאוט 8/16/32/64, Bye, round robin 7-12, טבלה וניקוד.')
