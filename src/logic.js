// Game logic: quiz -> USR rating, ELO-style updates, rating protection, badges.

export const MIN_RATING = 2.0
export const MAX_RATING = 5.5

const round2 = x => Math.round(x * 100) / 100
const clampRating = x => Math.min(MAX_RATING, Math.max(MIN_RATING, round2(x)))

// Display rating moves in 0.5 steps; the internal rating stays precise.
export const displayRating = r => (Math.round(r * 2) / 2).toFixed(1)

// ─── Quiz ────────────────────────────────────────────────────────────────
// Question 1 is gender (not scored). The 10 skill questions are each
// scored 1-5 by option index, so totals span 10-50 and map onto 2.0-5.5.

export const GENDER_QUESTION = {
  he: { q: 'מה המגדר שלך?', note: 'לא משפיע על הדירוג — משמש רק להתאמת שותפים' },
  en: { q: 'What is your gender?', note: 'Does not affect your rating — used only for partner matching' },
  options: [
    { value: 'male', he: 'גבר', en: 'Male' },
    { value: 'female', he: 'אישה', en: 'Female' },
  ],
}

export const QUIZ = [
  {
    he: { q: 'כמה זמן אתה משחק סקווש?', a: ['פחות מחצי שנה', 'חצי שנה עד שנה', '1–3 שנים', '3–7 שנים', 'מעל 7 שנים'] },
    en: { q: 'How long have you been playing squash?', a: ['Less than 6 months', '6–12 months', '1–3 years', '3–7 years', 'Over 7 years'] },
  },
  {
    he: { q: 'באיזו תדירות אתה משחק?', a: ['לעיתים רחוקות', 'פעם בחודש', 'פעם בשבוע', '2–3 פעמים בשבוע', '4+ פעמים בשבוע'] },
    en: { q: 'How often do you play?', a: ['Rarely', 'Once a month', 'Once a week', '2–3 times a week', '4+ times a week'] },
  },
  {
    he: { q: 'עד כמה ההגשה שלך עקבית?', a: ['מתקשה להגיש חוקי', 'נכנסת רוב הזמן', 'עקבית וחוקית', 'עקבית עם כיוון מדויק', 'הגשה תוקפנית ומגוונת'] },
    en: { q: 'How consistent is your serve?', a: ['Struggle to serve legally', 'In most of the time', 'Consistent and legal', 'Consistent with accurate placement', 'Aggressive and varied serve'] },
  },
  {
    he: { q: 'איך הבקהנד שלך?', a: ['חלש מאוד', 'בסיסי, לא יציב', 'סביר ברוב המצבים', 'חזק ואמין', 'נשק התקפי לכל אורך הקיר'] },
    en: { q: 'How is your backhand?', a: ['Very weak', 'Basic, inconsistent', 'Decent in most situations', 'Strong and reliable', 'An attacking weapon down the wall'] },
  },
  {
    he: { q: 'תנועה בקורט וכושר גופני', a: ['מתעייף מהר, תנועה איטית', 'מגיע לכדורים קרובים', 'מכסה את רוב הקורט', 'תנועה מהירה וחזרה ל-T', 'כושר תחרותי, מכסה הכל'] },
    en: { q: 'Court movement and fitness', a: ['Tire quickly, slow movement', 'Reach nearby balls', 'Cover most of the court', 'Fast movement, recover to the T', 'Competition fitness, cover everything'] },
  },
  {
    he: { q: 'מגוון מכות (דרופ, לוב, בוסט)', a: ['רק מכות בסיסיות', 'מנסה לפעמים דרופ או לוב', 'משתמש בכמה סוגי מכות', 'שולט ברוב המכות', 'שולט בכל המכות כולל בוסטים מדויקים'] },
    en: { q: 'Shot variety (drops, lobs, boasts)', a: ['Basic shots only', 'Occasionally try a drop or lob', 'Use several shot types', 'Command most shots', 'Master all shots including precise boasts'] },
  },
  {
    he: { q: 'כמה זמן אתה מחזיק ראלי?', a: ['2–3 חבטות', '4–6 חבטות', '7–10 חבטות', '10–20 חבטות', 'ראליס ארוכים בקצב גבוה'] },
    en: { q: 'How long can you sustain a rally?', a: ['2–3 shots', '4–6 shots', '7–10 shots', '10–20 shots', 'Long rallies at high pace'] },
  },
  {
    he: { q: 'טקטיקה וקריאת משחק', a: ['משחק בלי תכנון', 'מנסה לכוון רחוק מהיריב', 'בונה נקודות בסיסיות', 'מזהה חולשות ומנצל אותן', 'שולט בקצב ובמרחב המשחק'] },
    en: { q: 'Tactics and game reading', a: ['Play without a plan', 'Try to hit away from opponent', 'Build basic points', 'Spot weaknesses and exploit them', 'Control the pace and space of the game'] },
  },
  {
    he: { q: 'ניסיון תחרותי', a: ['אף פעם לא התחריתי', 'משחקים חברתיים בלבד', 'ליגה פנימית / טורנירים מקומיים', 'טורנירים אזוריים', 'תחרויות ארציות ומעלה'] },
    en: { q: 'Competitive experience', a: ['Never competed', 'Social games only', 'Internal league / local tournaments', 'Regional tournaments', 'National level and above'] },
  },
  {
    he: { q: 'איך היית מדרג את עצמך מול שחקנים אחרים?', a: ['מתחיל מוחלט', 'מתחיל מתקדם', 'שחקן ממוצע', 'שחקן חזק במועדון', 'מהחזקים באזור'] },
    en: { q: 'How would you rate yourself against other players?', a: ['Complete beginner', 'Advanced beginner', 'Average player', 'Strong club player', 'Among the strongest in the area'] },
  },
]

// answers: array of 10 option indices (0-4)
export function quizToRating(answers) {
  const total = answers.reduce((s, i) => s + i + 1, 0) // 10-50
  return clampRating(MIN_RATING + ((total - 10) / 40) * (MAX_RATING - MIN_RATING))
}

// ─── ELO-style rating changes ────────────────────────────────────────────
// Winner gains 0.1-0.3 (more for an upset), loser loses the same amount.

function expectedScore(rA, rB) {
  return 1 / (1 + Math.pow(10, (rB - rA) / 1.0))
}

export function ratingDelta(winnerRating, loserRating) {
  const exp = expectedScore(winnerRating, loserRating)
  return round2(0.1 + 0.2 * (1 - exp))
}

// ─── Match helpers ───────────────────────────────────────────────────────

const involves = (m, pid) => m.player_a === pid || m.player_b === pid
const opponentOf = (m, pid) => (m.player_a === pid ? m.player_b : m.player_a)
const samePair = (m, a, b) =>
  (m.player_a === a && m.player_b === b) || (m.player_a === b && m.player_b === a)

export function confirmedMatches(matches, pid) {
  return matches
    .filter(m => m.status === 'confirmed' && (pid == null || involves(m, pid)))
    .sort((x, y) => new Date(x.confirmed_at) - new Date(y.confirmed_at))
}

export function uniqueOpponents(matches, pid) {
  return new Set(confirmedMatches(matches, pid).map(m => opponentOf(m, pid)))
}

// Rating protection + ELO applied at confirmation time.
// Returns everything needed to update the match row and both players.
export function computeConfirmation(match, playerA, playerB, allMatches) {
  const WEEK_MS = 7 * 24 * 3600 * 1000
  const now = Date.now()

  // Protection 1: max one rated game per week against the same opponent.
  const ratedThisWeek = allMatches.some(m =>
    m.id !== match.id && m.status === 'confirmed' && m.rated &&
    samePair(m, match.player_a, match.player_b) &&
    m.confirmed_at && now - new Date(m.confirmed_at).getTime() < WEEK_MS
  )
  const rated = !ratedThisWeek

  // Protection 2: a player's rating only moves once they have played
  // 3+ unique opponents (counting this game's opponent).
  const uniqWith = pid => {
    const s = uniqueOpponents(allMatches.filter(m => m.id !== match.id), pid)
    s.add(pid === match.player_a ? match.player_b : match.player_a)
    return s.size
  }
  const eligibleA = uniqWith(match.player_a) >= 3
  const eligibleB = uniqWith(match.player_b) >= 3

  let dA = 0
  let dB = 0
  if (rated) {
    const aWon = match.winner === match.player_a
    const delta = aWon
      ? ratingDelta(playerA.rating, playerB.rating)
      : ratingDelta(playerB.rating, playerA.rating)
    if (aWon) {
      dA = eligibleA ? delta : 0
      dB = eligibleB ? -delta : 0
    } else {
      dB = eligibleB ? delta : 0
      dA = eligibleA ? -delta : 0
    }
  }

  const newA = clampRating(playerA.rating + dA)
  const newB = clampRating(playerB.rating + dB)
  return {
    rated,
    ratingA: { before: playerA.rating, after: newA, change: round2(newA - playerA.rating) },
    ratingB: { before: playerB.rating, after: newB, change: round2(newB - playerB.rating) },
  }
}

// ─── Player stats (derived from confirmed matches) ───────────────────────

const UPSET_GAP = 0.3 // beat someone rated at least this much higher

export function playerStats(player, matches) {
  const mine = confirmedMatches(matches, player.id)
  let wins = 0
  let losses = 0
  let streak = 0
  let bestStreak = 0
  let hasUpset = false
  for (const m of mine) {
    const won = m.winner === player.id
    if (won) {
      wins++
      streak++
      bestStreak = Math.max(bestStreak, streak)
      const myBefore = m.player_a === player.id ? m.rating_a_before : m.rating_b_before
      const oppBefore = m.player_a === player.id ? m.rating_b_before : m.rating_a_before
      if (myBefore != null && oppBefore != null && oppBefore - myBefore >= UPSET_GAP) hasUpset = true
    } else {
      losses++
      streak = 0
    }
  }
  return {
    games: mine.length,
    wins,
    losses,
    streak,
    bestStreak,
    hasUpset,
    uniqueOpponents: uniqueOpponents(matches, player.id).size,
    ratingUp: player.rating > player.initial_rating + 1e-9,
    provisional: uniqueOpponents(matches, player.id).size < 3,
  }
}

// ─── Achievement badges ──────────────────────────────────────────────────

export const BADGES = [
  { id: 'first_win', icon: '🏆', he: { name: 'ניצחון ראשון', desc: 'ניצחת משחק ראשון' }, en: { name: 'First Win', desc: 'Won your first game' }, test: s => s.wins >= 1 },
  { id: 'wins5', icon: '🔥', he: { name: '5 נצחונות', desc: 'צברת 5 נצחונות' }, en: { name: '5 Wins', desc: 'Reached 5 wins' }, test: s => s.wins >= 5 },
  { id: 'wins10', icon: '👑', he: { name: '10 נצחונות', desc: 'צברת 10 נצחונות' }, en: { name: '10 Wins', desc: 'Reached 10 wins' }, test: s => s.wins >= 10 },
  { id: 'upset', icon: '🗡️', he: { name: 'צייד ענקים', desc: 'ניצחת שחקן מדורג גבוה ממך' }, en: { name: 'Upset Hunter', desc: 'Beat a higher-rated player' }, test: s => s.hasUpset },
  { id: 'opp3', icon: '🤝', he: { name: '3 יריבים', desc: 'שיחקת נגד 3 יריבים שונים' }, en: { name: '3 Opponents', desc: 'Played 3 unique opponents' }, test: s => s.uniqueOpponents >= 3 },
  { id: 'opp5', icon: '🌐', he: { name: '5 יריבים', desc: 'שיחקת נגד 5 יריבים שונים' }, en: { name: '5 Opponents', desc: 'Played 5 unique opponents' }, test: s => s.uniqueOpponents >= 5 },
  { id: 'streak3', icon: '⚡', he: { name: 'רצף לוהט', desc: '3 נצחונות ברצף' }, en: { name: 'Hot Streak', desc: '3 wins in a row' }, test: s => s.bestStreak >= 3 },
  { id: 'rating_up', icon: '📈', he: { name: 'בעלייה', desc: 'הדירוג שלך עלה מאז ההרשמה' }, en: { name: 'On the Rise', desc: 'Your rating rose above your starting point' }, test: s => s.ratingUp },
  { id: 'games5', icon: '🎾', he: { name: '5 משחקים', desc: 'השלמת 5 משחקים' }, en: { name: '5 Games', desc: 'Completed 5 games' }, test: s => s.games >= 5 },
  { id: 'games10', icon: '💪', he: { name: '10 משחקים', desc: 'השלמת 10 משחקים' }, en: { name: '10 Games', desc: 'Completed 10 games' }, test: s => s.games >= 10 },
]

// ─── Misc ────────────────────────────────────────────────────────────────

// Normalize an Israeli phone number for a wa.me link.
export function waLink(phone) {
  let digits = (phone || '').replace(/\D/g, '')
  if (digits.startsWith('0')) digits = '972' + digits.slice(1)
  return `https://wa.me/${digits}`
}
