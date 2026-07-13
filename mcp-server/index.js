#!/usr/bin/env node
// MCP server: knockout tournaments (8/16/32/64 with byes) and round-robin
// club leagues — any number of leagues per season, any realistic size.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { createBracket, reportResult, renderBracket, MAX_BRACKET } from './lib/knockout.js'
import { createLeague, recordResult, renderStandings, renderFixtures } from './lib/league.js'
import { load, save, newId, getCompetition } from './lib/store.js'

const server = new McpServer({ name: 'squash-tournament-scheduler', version: '1.0.0' })

const text = s => ({ content: [{ type: 'text', text: s }] })
const fail = e => ({ content: [{ type: 'text', text: `❌ ${e.message}` }], isError: true })

const playerList = z.array(z.string().min(1)).describe('שמות השחקנים')

server.registerTool(
  'create_knockout',
  {
    title: 'יצירת טורניר נוק-אאוט',
    description:
      'יוצר מסלול נוק-אאוט (הדחה ישירה) ל-2 עד 64 שחקנים. גודל המסלול נקבע אוטומטית (8/16/32/64); ' +
      'אם מספר השחקנים אינו חזקה של 2, המדורגים הגבוהים מקבלים Bye בסיבוב הראשון. ' +
      'כשseeded=true סדר הרשימה הוא הדירוג (הראשון = מדורג 1); אחרת ההגרלה אקראית.',
    inputSchema: {
      name: z.string().min(1).describe('שם הטורניר'),
      players: playerList.refine(p => p.length >= 2 && p.length <= MAX_BRACKET, {
        message: `נדרשים 2 עד ${MAX_BRACKET} שחקנים`,
      }),
      seeded: z.boolean().default(true).describe('true = סדר הרשימה הוא הדירוג, false = הגרלה אקראית'),
    },
  },
  async ({ name, players, seeded }) => {
    try {
      const db = load()
      const bracket = createBracket(players, { seeded })
      const id = newId('ko')
      db.competitions[id] = {
        id, type: 'knockout', name, players, bracket, createdAt: new Date().toISOString(),
      }
      save(db)
      return text(`נוצר טורניר "${name}" (מזהה: ${id})\n\n${renderBracket(name, bracket)}`)
    } catch (e) { return fail(e) }
  }
)

server.registerTool(
  'report_knockout_result',
  {
    title: 'דיווח תוצאה בנוק-אאוט',
    description: 'רושם מנצח במשחק נוק-אאוט ומקדם אותו לסיבוב הבא. score אופציונלי, למשל "3:1".',
    inputSchema: {
      tournament_id: z.string().describe('מזהה הטורניר (למשל ko-a1b2)'),
      match_id: z.string().describe('מזהה המשחק (למשל R1M3)'),
      winner: z.string().describe('שם המנצח בדיוק כפי שמופיע במסלול'),
      score: z.string().optional().describe('תוצאה במשחקונים, למשל "3:1"'),
    },
  },
  async ({ tournament_id, match_id, winner, score }) => {
    try {
      const db = load()
      const comp = getCompetition(db, tournament_id)
      if (comp.type !== 'knockout') throw new Error(`"${tournament_id}" היא ליגה, לא טורניר נוק-אאוט`)
      reportResult(comp.bracket, match_id, winner, score ?? null)
      save(db)
      return text(renderBracket(comp.name, comp.bracket))
    } catch (e) { return fail(e) }
  }
)

server.registerTool(
  'get_bracket',
  {
    title: 'הצגת מסלול נוק-אאוט',
    description: 'מציג את מצב המסלול המלא של טורניר נוק-אאוט, כולל תוצאות ומי עלה לכל שלב.',
    inputSchema: { tournament_id: z.string() },
  },
  async ({ tournament_id }) => {
    try {
      const db = load()
      const comp = getCompetition(db, tournament_id)
      if (comp.type !== 'knockout') throw new Error(`"${tournament_id}" היא ליגה, לא טורניר נוק-אאוט`)
      return text(renderBracket(comp.name, comp.bracket))
    } catch (e) { return fail(e) }
  }
)

const leagueSettings = {
  double_round: z.boolean().default(false).describe('true = כל זוג נפגש פעמיים (הלוך וחזור)'),
  points_win: z.number().int().default(3).describe('נקודות למנצח (ברירת מחדל 3)'),
  points_loss: z.number().int().default(1).describe('נקודות למפסיד ששיחק (ברירת מחדל 1)'),
}

function buildLeague(db, { name, players, season, double_round, points_win, points_loss }) {
  const { rounds, fixtures } = createLeague(players, { doubleRound: double_round })
  const id = newId('lg')
  db.competitions[id] = {
    id, type: 'league', name, season: season ?? null, players, rounds, fixtures,
    settings: { pointsWin: points_win, pointsLoss: points_loss, doubleRound: double_round },
    createdAt: new Date().toISOString(),
  }
  return db.competitions[id]
}

server.registerTool(
  'create_league',
  {
    title: 'יצירת ליגה (round robin)',
    description:
      'יוצר ליגה בשיטת round robin — כל שחקן נגד כולם. מתאים ל-3 עד 24 שחקנים (טיפוסי: 7-12). ' +
      'מספר אי-זוגי של שחקנים מקבל Bye בכל סיבוב. מחזיר לוח משחקים מלא מחולק לסיבובים.',
    inputSchema: {
      name: z.string().min(1).describe('שם הליגה, למשל "ליגה א"'),
      players: playerList,
      season: z.string().optional().describe('שם העונה, למשל "סתיו 2026"'),
      ...leagueSettings,
    },
  },
  async (args) => {
    try {
      const db = load()
      const league = buildLeague(db, args)
      save(db)
      return text(`נוצרה ליגה "${league.name}" (מזהה: ${league.id})\n\n${renderFixtures(league)}`)
    } catch (e) { return fail(e) }
  }
)

server.registerTool(
  'create_season',
  {
    title: 'יצירת עונה שלמה (כמה ליגות במכה אחת)',
    description:
      'יוצר עונה עם כמה ליגות לפי רמות — למשל 5 ליגות של 7-12 שחקנים, או 2 ליגות, או 7. ' +
      'כל ליגה מקבלת לוח משחקים round robin משלה. ההגדרות (הלוך-חזור, ניקוד) חלות על כל הליגות בעונה.',
    inputSchema: {
      season: z.string().min(1).describe('שם העונה, למשל "חורף 2026"'),
      leagues: z
        .array(z.object({ name: z.string().min(1), players: playerList }))
        .min(1)
        .max(10)
        .describe('רשימת ליגות: לכל אחת שם ורשימת שחקנים'),
      ...leagueSettings,
    },
  },
  async ({ season, leagues, double_round, points_win, points_loss }) => {
    try {
      const db = load()
      const created = []
      for (const lg of leagues) {
        // Validate all leagues before saving anything, so a bad league list
        // doesn't leave a half-created season.
        createLeague(lg.players, { doubleRound: double_round })
      }
      for (const lg of leagues) {
        created.push(buildLeague(db, { ...lg, season, double_round, points_win, points_loss }))
      }
      save(db)
      const lines = [`נוצרה עונת "${season}" עם ${created.length} ליגות:`, '']
      for (const lg of created) {
        lines.push(`  • ${lg.name} — ${lg.players.length} שחקנים, ${lg.rounds} סיבובים, ${lg.fixtures.length} משחקים (מזהה: ${lg.id})`)
      }
      lines.push('', 'להצגת לוח משחקים: get_fixtures עם המזהה של הליגה.')
      return text(lines.join('\n'))
    } catch (e) { return fail(e) }
  }
)

server.registerTool(
  'record_league_result',
  {
    title: 'רישום תוצאת משחק ליגה',
    description:
      'רושם תוצאת משחק בליגה לפי משחקונים (בסקווש: 3:0, 3:1 או 3:2). ' +
      'games1 שייך ל-player1 ו-games2 ל-player2, בלי קשר לסדר בלוח המשחקים.',
    inputSchema: {
      league_id: z.string().describe('מזהה הליגה (למשל lg-a1b2)'),
      player1: z.string(),
      player2: z.string(),
      games1: z.number().int().min(0).describe('משחקונים של player1'),
      games2: z.number().int().min(0).describe('משחקונים של player2'),
    },
  },
  async ({ league_id, player1, player2, games1, games2 }) => {
    try {
      const db = load()
      const league = getCompetition(db, league_id)
      if (league.type !== 'league') throw new Error(`"${league_id}" הוא טורניר נוק-אאוט, לא ליגה`)
      const fixture = recordResult(league, player1, player2, games1, games2)
      save(db)
      return text(
        `נרשם: ${player1} ${games1}:${games2} ${player2} (סיבוב ${fixture.round})\n\n${renderStandings(league)}`
      )
    } catch (e) { return fail(e) }
  }
)

server.registerTool(
  'get_standings',
  {
    title: 'טבלת ליגה',
    description: 'מציג את טבלת הליגה: נצחונות, הפסדים, יחס משחקונים ונקודות, ממוין לפי דירוג.',
    inputSchema: { league_id: z.string() },
  },
  async ({ league_id }) => {
    try {
      const db = load()
      const league = getCompetition(db, league_id)
      if (league.type !== 'league') throw new Error(`"${league_id}" הוא טורניר נוק-אאוט, לא ליגה`)
      return text(renderStandings(league))
    } catch (e) { return fail(e) }
  }
)

server.registerTool(
  'get_fixtures',
  {
    title: 'לוח משחקים של ליגה',
    description: 'מציג את לוח המשחקים של ליגה, עם אפשרות לסנן לפי סיבוב או שחקן.',
    inputSchema: {
      league_id: z.string(),
      round: z.number().int().min(1).optional().describe('הצגת סיבוב מסוים בלבד'),
      player: z.string().optional().describe('הצגת המשחקים של שחקן מסוים בלבד'),
    },
  },
  async ({ league_id, round, player }) => {
    try {
      const db = load()
      const league = getCompetition(db, league_id)
      if (league.type !== 'league') throw new Error(`"${league_id}" הוא טורניר נוק-אאוט, לא ליגה`)
      return text(renderFixtures(league, { round: round ?? null, player: player ?? null }))
    } catch (e) { return fail(e) }
  }
)

server.registerTool(
  'list_competitions',
  {
    title: 'רשימת כל התחרויות',
    description: 'מציג את כל הטורנירים והליגות השמורים, עם אפשרות לסנן לפי עונה.',
    inputSchema: { season: z.string().optional().describe('סינון לפי שם עונה') },
  },
  async ({ season }) => {
    try {
      const db = load()
      let comps = Object.values(db.competitions)
      if (season) comps = comps.filter(c => c.season === season)
      if (comps.length === 0) return text('אין תחרויות שמורות עדיין.')
      const lines = ['התחרויות השמורות:', '']
      for (const c of comps) {
        if (c.type === 'knockout') {
          const status = c.bracket.champion ? `הסתיים — אלוף/ה: ${c.bracket.champion}` : 'פעיל'
          lines.push(`  🏆 [${c.id}] ${c.name} — נוק-אאוט, ${c.players.length} שחקנים (${status})`)
        } else {
          const played = c.fixtures.filter(f => f.played).length
          lines.push(
            `  📊 [${c.id}] ${c.name}${c.season ? ` (${c.season})` : ''} — ליגה, ${c.players.length} שחקנים, ${played}/${c.fixtures.length} משחקים שוחקו`
          )
        }
      }
      return text(lines.join('\n'))
    } catch (e) { return fail(e) }
  }
)

server.registerTool(
  'delete_competition',
  {
    title: 'מחיקת תחרות',
    description: 'מוחק טורניר או ליגה לפי מזהה. פעולה בלתי הפיכה.',
    inputSchema: { id: z.string() },
  },
  async ({ id }) => {
    try {
      const db = load()
      const comp = getCompetition(db, id)
      delete db.competitions[id]
      save(db)
      return text(`נמחקה התחרות "${comp.name}" (${id}).`)
    } catch (e) { return fail(e) }
  }
)

const transport = new StdioServerTransport()
await server.connect(transport)
