import { useState, useEffect, useMemo, useCallback } from 'react'
import { STRINGS } from './i18n.js'
import {
  GENDER_QUESTION, QUIZ, quizToRating, displayRating,
  computeConfirmation, playerStats, BADGES, waLink, confirmedMatches,
} from './logic.js'
import * as db from './db.js'

const ADMIN_USER = 'jackie'
// Normalize the env value: stray whitespace or wrapping quotes pasted into
// Vercel would otherwise make every login fail with "wrong username or password".
const ADMIN_PASSWORD = (import.meta.env.VITE_ADMIN_PASSWORD || '')
  .trim().replace(/^["']+|["']+$/g, '').trim() || 'squash2024'

const SESSION_KEY = 'squash_match_session'
const LANG_KEY = 'squash_match_lang'

// ─── Squash ball logo: black ball with the double yellow dots ────────────
function Logo({ size = 40 }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-label="SQUASH MATCH">
      <circle cx="50" cy="50" r="46" fill="#0d0d0f" stroke="#2e2e35" strokeWidth="3" />
      <ellipse cx="36" cy="34" rx="16" ry="10" fill="rgba(255,255,255,0.07)" />
      <circle cx="57" cy="43" r="6" fill="#ffe600" />
      <circle cx="69" cy="57" r="6" fill="#ffe600" />
    </svg>
  )
}

function fmtDate(iso, lang) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', {
    day: 'numeric', month: 'short',
  })
}

const normPhone = p => (p || '').replace(/\D/g, '')

// ─── Rating history SVG chart ─────────────────────────────────────────────
function RatingChart({ history }) {
  const W = 320
  const H = 150
  const PAD = { top: 12, right: 12, bottom: 22, left: 34 }
  const pts = (history || []).map(h => h.r)
  if (pts.length === 0) return null
  const lo = Math.min(...pts) - 0.15
  const hi = Math.max(...pts) + 0.15
  const span = Math.max(hi - lo, 0.3)
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const x = i => PAD.left + (pts.length === 1 ? innerW / 2 : (i / (pts.length - 1)) * innerW)
  const y = r => PAD.top + (1 - (r - lo) / span) * innerH
  const line = pts.map((r, i) => `${x(i).toFixed(1)},${y(r).toFixed(1)}`).join(' ')
  // gridlines on 0.5 steps inside the domain
  const grid = []
  for (let g = Math.ceil(lo * 2) / 2; g <= hi; g += 0.5) grid.push(g)
  return (
    <div className="chart-box">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ direction: 'ltr' }}>
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(34,211,238,0.25)" />
            <stop offset="100%" stopColor="rgba(168,85,247,0)" />
          </linearGradient>
        </defs>
        {grid.map(g => (
          <g key={g}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(g)} y2={y(g)}
              stroke="#263149" strokeWidth="1" strokeDasharray="3 4" />
            <text x={PAD.left - 6} y={y(g) + 3} fontSize="9" fill="#8b97b0" textAnchor="end">
              {g.toFixed(1)}
            </text>
          </g>
        ))}
        {pts.length > 1 && (
          <polygon
            points={`${PAD.left},${y(lo) + 0} ${line} ${x(pts.length - 1)},${PAD.top + innerH}`}
            fill="url(#areaGrad)" opacity="0.7"
          />
        )}
        <polyline points={line} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((r, i) => (
          <circle key={i} cx={x(i)} cy={y(r)} r="3.2" fill="#0b0f1a" stroke="#22d3ee" strokeWidth="2" />
        ))}
      </svg>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [lang, setLang] = useState(() => localStorage.getItem(LANG_KEY) || 'he')
  const t = STRINGS[lang]
  const [data, setData] = useState({ players: [], matches: [], requests: [], messages: [] })
  const [loading, setLoading] = useState(true)
  const [screen, setScreen] = useState('login') // login | quiz | register | main | admin
  const [me, setMe] = useState(null)
  const [quizResult, setQuizResult] = useState(null) // { gender, rating }
  const [loginPhone, setLoginPhone] = useState('')

  useEffect(() => {
    document.documentElement.dir = t.dir
    document.documentElement.lang = lang
    localStorage.setItem(LANG_KEY, lang)
  }, [lang, t.dir])

  const reload = useCallback(async () => {
    const d = await db.loadAll()
    setData(d)
    return d
  }, [])

  useEffect(() => {
    (async () => {
      const d = await reload()
      const savedPhone = localStorage.getItem(SESSION_KEY)
      if (savedPhone === '__admin__') {
        setScreen('admin')
      } else if (savedPhone) {
        const p = d.players.find(x => normPhone(x.phone) === savedPhone)
        if (p) { setMe(p); setScreen('main') }
      }
      setLoading(false)
    })()
  }, [reload])

  // keep `me` in sync after reloads
  useEffect(() => {
    if (me) {
      const fresh = data.players.find(p => p.id === me.id)
      if (fresh && fresh !== me) setMe(fresh)
      if (!fresh) { setMe(null); setScreen('login'); localStorage.removeItem(SESSION_KEY) }
    }
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  const login = phone => {
    const p = data.players.find(x => normPhone(x.phone) === normPhone(phone))
    if (!p) return false
    setMe(p)
    localStorage.setItem(SESSION_KEY, normPhone(phone))
    setScreen('main')
    return true
  }

  const logout = () => {
    setMe(null)
    localStorage.removeItem(SESSION_KEY)
    setScreen('login')
  }

  // Dual-confirmation: applies rating protection + ELO, updates both players.
  const confirmMatch = async match => {
    const a = data.players.find(p => p.id === match.player_a)
    const b = data.players.find(p => p.id === match.player_b)
    if (!a || !b) return
    const res = computeConfirmation(match, a, b, data.matches)
    const now = new Date().toISOString()
    await db.updateMatch(match.id, {
      status: 'confirmed', confirmed_at: now, rated: res.rated,
      rating_change_a: res.ratingA.change, rating_change_b: res.ratingB.change,
      rating_a_before: res.ratingA.before, rating_b_before: res.ratingB.before,
    })
    for (const [pl, r] of [[a, res.ratingA], [b, res.ratingB]]) {
      if (r.change !== 0) {
        await db.updatePlayer(pl.id, {
          rating: r.after,
          rating_history: [...(pl.rating_history || []), { t: now, r: r.after }],
        })
      }
    }
    await reload()
  }

  if (loading) {
    return <div className="app center" style={{ paddingTop: 120 }}><Logo size={72} /><p className="muted" style={{ marginTop: 12 }}>{t.loading}</p></div>
  }

  const shared = { t, lang, setLang, data, reload, me, setMe, confirmMatch }

  return (
    <div className="app">
      {screen === 'login' && (
        <LoginScreen {...shared}
          onLogin={login}
          onStartQuiz={phone => { setLoginPhone(phone); setScreen('quiz') }}
          onAdmin={() => setScreen('admin')}
        />
      )}
      {screen === 'quiz' && (
        <QuizScreen {...shared}
          onDone={result => { setQuizResult(result); setScreen('register') }}
          onBack={() => setScreen('login')}
        />
      )}
      {screen === 'register' && quizResult && (
        <RegisterScreen {...shared} quizResult={quizResult} initialPhone={loginPhone}
          onRegistered={p => {
            setMe(p)
            localStorage.setItem(SESSION_KEY, normPhone(p.phone))
            setScreen('main')
          }}
        />
      )}
      {screen === 'main' && me && <MainScreen {...shared} onLogout={logout} />}
      {screen === 'admin' && (
        <AdminScreen {...shared} onExit={() => {
          localStorage.removeItem(SESSION_KEY)
          setScreen('login')
        }} />
      )}
      <p className="muted small footer-note">{db.isCloud() ? t.cloudMode : t.localMode}</p>
    </div>
  )
}

// ═══ LOGIN ══════════════════════════════════════════════════════════════
function LoginScreen({ t, lang, setLang, onLogin, onStartQuiz, onAdmin }) {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  return (
    <div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-sm" onClick={() => setLang(lang === 'he' ? 'en' : 'he')}>{t.langButton}</button>
      </div>
      <div className="login-hero">
        <Logo size={92} />
        <h1 className="app-title" style={{ marginTop: 12 }}>{t.appName}</h1>
        <p className="muted" style={{ marginTop: 6 }}>{t.tagline}</p>
      </div>
      <div className="card">
        <div className="field">
          <label className="label">{t.phoneLabel}</label>
          <input className="input" type="tel" dir="ltr" value={phone}
            placeholder="050-1234567"
            onChange={e => { setPhone(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && !onLogin(phone) && setError(t.playerNotFound)}
          />
        </div>
        {error && <p className="small" style={{ color: 'var(--red)', marginBottom: 10 }}>{error}</p>}
        <button className="btn btn-primary btn-block"
          onClick={() => { if (!onLogin(phone)) setError(t.playerNotFound) }}>
          {t.loginBtn}
        </button>
        <div className="divider" />
        <p className="muted small center" style={{ marginBottom: 10 }}>{t.newPlayerPrompt}</p>
        <button className="btn btn-block" onClick={() => onStartQuiz(phone)}>{t.startQuiz}</button>
      </div>
      <div className="center">
        <button className="link-btn" onClick={onAdmin}>{t.adminLink}</button>
      </div>
    </div>
  )
}

// ═══ QUIZ ═══════════════════════════════════════════════════════════════
function QuizScreen({ t, lang, onDone, onBack }) {
  const TOTAL = QUIZ.length + 1 // gender + 10 skill questions
  const [step, setStep] = useState(0)
  const [gender, setGender] = useState(null)
  const [answers, setAnswers] = useState(Array(QUIZ.length).fill(null))
  const [finished, setFinished] = useState(false)

  const rating = finished ? quizToRating(answers) : null

  if (finished) {
    return (
      <div>
        <Header t={t} />
        <div className="card center" style={{ padding: '34px 16px' }}>
          <p className="muted">{t.quizResultTitle}</p>
          <div className="rating-big">{displayRating(rating)}</div>
          <p className="muted small" style={{ marginTop: 8 }}>{t.quizResultNote}</p>
          <button className="btn btn-primary btn-block" style={{ marginTop: 20 }}
            onClick={() => onDone({ gender, rating })}>
            {t.continueRegister}
          </button>
        </div>
      </div>
    )
  }

  const isGenderQ = step === 0
  const q = isGenderQ ? null : QUIZ[step - 1]

  const pick = idx => {
    if (isGenderQ) {
      setGender(GENDER_QUESTION.options[idx].value)
    } else {
      const next = [...answers]
      next[step - 1] = idx
      setAnswers(next)
    }
    // small delay so the selection is visible before advancing
    setTimeout(() => {
      if (step + 1 >= TOTAL) setFinished(true)
      else setStep(step + 1)
    }, 180)
  }

  const selected = isGenderQ
    ? GENDER_QUESTION.options.findIndex(o => o.value === gender)
    : answers[step - 1]

  return (
    <div>
      <Header t={t} />
      <div className="card">
        <p className="muted small" style={{ marginBottom: 8 }}>{t.questionOf(step + 1, TOTAL)}</p>
        <div className="progress-bar"><div className="fill" style={{ width: `${((step) / TOTAL) * 100}%` }} /></div>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 4 }}>
          {isGenderQ ? GENDER_QUESTION[lang].q : q[lang].q}
        </h2>
        {isGenderQ && <p className="muted small" style={{ marginBottom: 10 }}>{GENDER_QUESTION[lang].note}</p>}
        <div style={{ marginTop: 12 }}>
          {(isGenderQ ? GENDER_QUESTION.options.map(o => o[lang]) : q[lang].a).map((opt, i) => (
            <button key={i} className={`quiz-option ${selected === i ? 'selected' : ''}`} onClick={() => pick(i)}>
              {opt}
            </button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => step === 0 ? onBack() : setStep(step - 1)}>
            {t.back}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══ REGISTER ═══════════════════════════════════════════════════════════
function RegisterScreen({ t, data, reload, quizResult, initialPhone, onRegistered }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState(initialPhone || '')
  const [gender, setGender] = useState(quizResult.gender || 'male')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!name.trim()) return setError(t.nameRequired)
    if (normPhone(phone).length < 7) return setError(t.phoneRequired)
    if (data.players.some(p => normPhone(p.phone) === normPhone(phone))) return setError(t.phoneTaken)
    setBusy(true)
    const now = new Date().toISOString()
    const player = {
      id: db.newId(),
      name: name.trim(),
      phone: phone.trim(),
      gender,
      rating: quizResult.rating,
      initial_rating: quizResult.rating,
      rating_history: [{ t: now, r: quizResult.rating }],
      created_at: now,
    }
    try {
      await db.createPlayer(player)
      await reload()
      onRegistered(player)
    } catch (e) {
      // Only a unique-constraint violation means the phone is taken;
      // anything else (missing tables, bad keys, network) gets the real error.
      const isDuplicate = e?.code === '23505' || /duplicate|unique/i.test(e?.message || '')
      setError(isDuplicate ? t.phoneTaken : t.saveError(e?.message || ''))
      setBusy(false)
    }
  }

  return (
    <div>
      <Header t={t} />
      <div className="card">
        <div className="card-title">{t.registerTitle}</div>
        <div className="center" style={{ marginBottom: 14 }}>
          <span className="muted small">{t.yourRating}: </span>
          <span className="rating-chip">{displayRating(quizResult.rating)}</span>
        </div>
        <div className="field">
          <label className="label">{t.fullName}</label>
          <input className="input" value={name} onChange={e => { setName(e.target.value); setError('') }} />
        </div>
        <div className="field">
          <label className="label">{t.phoneLabel}</label>
          <input className="input" type="tel" dir="ltr" value={phone}
            onChange={e => { setPhone(e.target.value); setError('') }} />
        </div>
        <div className="field">
          <label className="label">{t.gender}</label>
          <div className="row">
            <button className={`btn grow ${gender === 'male' ? 'btn-primary' : ''}`}
              onClick={() => setGender('male')}>{t.male}</button>
            <button className={`btn grow ${gender === 'female' ? 'btn-primary' : ''}`}
              onClick={() => setGender('female')}>{t.female}</button>
          </div>
        </div>
        {error && <p className="small" style={{ color: 'var(--red)', marginBottom: 10 }}>{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy} onClick={submit}>
          {t.finishRegister}
        </button>
      </div>
    </div>
  )
}

// ═══ Shared header ════════════════════════════════════════════════════════
function Header({ t, right }) {
  return (
    <div className="header">
      <Logo size={38} />
      <div>
        <div className="app-title">{t.appName}</div>
      </div>
      <div className="spacer" />
      {right}
    </div>
  )
}

// ═══ MAIN (player area) ═══════════════════════════════════════════════════
function MainScreen(props) {
  const { t, lang, setLang, me, data, onLogout } = props
  const [tab, setTab] = useState('home')

  const pendingForMe = data.matches.filter(m => m.status === 'pending' && m.player_b === me.id).length
  const incomingReqs = data.requests.filter(r => r.status === 'pending' && r.to_player === me.id).length

  const tabs = [
    ['home', t.tabHome],
    ['find', t.tabFind],
    ['requests', t.tabRequests, incomingReqs > 0],
    ['report', t.tabReport, pendingForMe > 0],
    ['stats', t.tabStats],
    ['h2h', t.tabH2H],
    ['board', t.tabBoard],
    ['inbox', t.tabInbox],
  ]

  return (
    <div>
      <Header t={t} right={
        <div className="row">
          <button className="btn btn-sm" onClick={() => setLang(lang === 'he' ? 'en' : 'he')}>{t.langButton}</button>
          <button className="btn btn-sm btn-ghost" onClick={onLogout}>{t.logout}</button>
        </div>
      } />
      <div className="tabs">
        {tabs.map(([id, label, dot]) => (
          <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            {label}{dot && <span className="dot" />}
          </button>
        ))}
      </div>
      {tab === 'home' && <HomeTab {...props} goTab={setTab} />}
      {tab === 'find' && <FindTab {...props} />}
      {tab === 'requests' && <RequestsTab {...props} />}
      {tab === 'report' && <ReportTab {...props} />}
      {tab === 'stats' && <StatsTab {...props} />}
      {tab === 'h2h' && <H2HTab {...props} />}
      {tab === 'board' && <BoardTab {...props} />}
      {tab === 'inbox' && <InboxTab {...props} />}
    </div>
  )
}

// ─── Home ─────────────────────────────────────────────────────────────────
function HomeTab({ t, lang, me, data, goTab }) {
  const stats = playerStats(me, data.matches)
  const earned = BADGES.filter(b => b.test(stats))
  const pendingForMe = data.matches.filter(m => m.status === 'pending' && m.player_b === me.id)
  return (
    <div>
      <div className="card center" style={{ padding: '26px 16px' }}>
        <p className="muted">{t.hello(me.name)}</p>
        <div className="rating-big">{displayRating(me.rating)}</div>
        <p className="muted small">{t.record}: {stats.wins}-{stats.losses}</p>
        {stats.provisional && <div className="notice warn small" style={{ marginTop: 12 }}>{t.provisionalNote}</div>}
      </div>
      {pendingForMe.length > 0 && (
        <div className="notice" style={{ marginBottom: 12, cursor: 'pointer' }} onClick={() => goTab('report')}>
          ⏳ {t.awaitingMe} ({pendingForMe.length})
        </div>
      )}
      <div className="stat-grid" style={{ marginBottom: 12 }}>
        <div className="stat-tile"><div className="v">{stats.games}</div><div className="k">{t.gamesShort}</div></div>
        <div className="stat-tile"><div className="v">{stats.wins}</div><div className="k">{t.winsShort}</div></div>
        <div className="stat-tile"><div className="v">{stats.losses}</div><div className="k">{t.lossesShort}</div></div>
        <div className="stat-tile"><div className="v">{stats.streak}</div><div className="k">{t.streakShort}</div></div>
      </div>
      <div className="card">
        <div className="card-title">{t.badgesTitle}</div>
        <p className="muted small" style={{ marginBottom: 10 }}>{t.badgeProgress(earned.length, BADGES.length)}</p>
        <div className="badge-grid">
          {BADGES.map(b => {
            const got = b.test(stats)
            return (
              <div key={b.id} className={`badge-card ${got ? 'earned' : 'locked'}`}>
                <div className="ico">{b.icon}</div>
                <div className="nm">{b[lang].name}</div>
                <div className="ds">{b[lang].desc}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Find a partner ───────────────────────────────────────────────────────
function FindTab({ t, me, data, reload }) {
  const [genderFilter, setGenderFilter] = useState('any')
  const [busyId, setBusyId] = useState(null)

  const candidates = data.players.filter(p =>
    p.id !== me.id &&
    Math.abs(p.rating - me.rating) <= 0.5 + 1e-9 &&
    (genderFilter === 'any' || p.gender === genderFilter)
  ).sort((a, b) => Math.abs(a.rating - me.rating) - Math.abs(b.rating - me.rating))

  const requestBetween = pid => data.requests.find(r =>
    r.status !== 'declined' &&
    ((r.from_player === me.id && r.to_player === pid) || (r.from_player === pid && r.to_player === me.id))
  )

  const sendRequest = async pid => {
    setBusyId(pid)
    await db.createRequest({
      id: db.newId(), from_player: me.id, to_player: pid,
      status: 'pending', created_at: new Date().toISOString(),
    })
    await reload()
    setBusyId(null)
  }

  return (
    <div>
      <div className="card">
        <div className="card-title">{t.findTitle}</div>
        <p className="muted small" style={{ marginBottom: 10 }}>{t.findNote}</p>
        <div className="field">
          <label className="label">{t.genderFilter}</label>
          <div className="row">
            {[['any', t.anyGender], ['male', t.male], ['female', t.female]].map(([v, label]) => (
              <button key={v} className={`btn btn-sm grow ${genderFilter === v ? 'btn-primary' : ''}`}
                onClick={() => setGenderFilter(v)}>{label}</button>
            ))}
          </div>
        </div>
        {candidates.length === 0 && <p className="muted center" style={{ padding: 16 }}>{t.noPartners}</p>}
        {candidates.map(p => {
          const req = requestBetween(p.id)
          return (
            <div key={p.id} className="list-item">
              <div className="grow">
                <div className="pname">{p.name}</div>
                <span className="rating-chip" style={{ fontSize: '0.75rem' }}>{displayRating(p.rating)}</span>
              </div>
              {!req && (
                <button className="btn btn-sm btn-primary" disabled={busyId === p.id}
                  onClick={() => sendRequest(p.id)}>
                  {t.requestMatch}
                </button>
              )}
              {req && req.status === 'pending' && <span className="tag cyan">{t.requestSent}</span>}
              {req && req.status === 'accepted' && (
                <a className="btn btn-sm btn-green" href={waLink(p.phone)} target="_blank" rel="noreferrer">
                  💬 {t.whatsapp}
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Requests ─────────────────────────────────────────────────────────────
function RequestsTab({ t, lang, me, data, reload }) {
  const byId = id => data.players.find(p => p.id === id)
  const incoming = data.requests.filter(r => r.to_player === me.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const outgoing = data.requests.filter(r => r.from_player === me.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const respond = async (req, status) => {
    await db.updateRequest(req.id, { status })
    await reload()
  }

  const StatusTag = ({ s }) => (
    <span className={`tag ${s === 'accepted' ? 'green' : s === 'declined' ? 'red' : 'cyan'}`}>
      {s === 'accepted' ? t.statusAccepted : s === 'declined' ? t.statusDeclined : t.statusPending}
    </span>
  )

  const Section = ({ title, list, isIncoming }) => (
    <div className="card">
      <div className="card-title">{title}</div>
      {list.length === 0 && <p className="muted small">{t.noRequests}</p>}
      {list.map(r => {
        const other = byId(isIncoming ? r.from_player : r.to_player)
        if (!other) return null
        return (
          <div key={r.id} className="list-item">
            <div className="grow">
              <div className="pname">{other.name}</div>
              <span className="muted small">{displayRating(other.rating)} · {fmtDate(r.created_at, lang)}</span>
            </div>
            {isIncoming && r.status === 'pending' && (
              <div className="row">
                <button className="btn btn-sm btn-green" onClick={() => respond(r, 'accepted')}>{t.accept}</button>
                <button className="btn btn-sm btn-danger" onClick={() => respond(r, 'declined')}>{t.decline}</button>
              </div>
            )}
            {(!isIncoming || r.status !== 'pending') && <StatusTag s={r.status} />}
            {r.status === 'accepted' && (
              <a className="btn btn-sm btn-green" href={waLink(other.phone)} target="_blank" rel="noreferrer">
                💬 {t.coordinateWa}
              </a>
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <div>
      <Section title={t.incoming} list={incoming} isIncoming />
      <Section title={t.outgoing} list={outgoing} isIncoming={false} />
    </div>
  )
}

// ─── Report a result ──────────────────────────────────────────────────────
function ReportTab({ t, lang, me, data, reload, confirmMatch }) {
  const [oppId, setOppId] = useState('')
  const [won, setWon] = useState(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const byId = id => data.players.find(p => p.id === id)
  const others = data.players.filter(p => p.id !== me.id)
    .sort((a, b) => a.name.localeCompare(b.name))

  const toConfirm = data.matches.filter(m => m.status === 'pending' && m.player_b === me.id)
  const waiting = data.matches.filter(m => m.status === 'pending' && m.player_a === me.id)

  const submit = async () => {
    if (!oppId || won === null) return
    setBusy(true)
    await db.createMatch({
      id: db.newId(),
      player_a: me.id, player_b: oppId,
      winner: won ? me.id : oppId,
      reported_by: me.id,
      status: 'pending',
      created_at: new Date().toISOString(),
    })
    await reload()
    setOppId(''); setWon(null); setSent(true); setBusy(false)
    setTimeout(() => setSent(false), 4000)
  }

  const reject = async m => {
    await db.updateMatch(m.id, { status: 'rejected' })
    await reload()
  }

  return (
    <div>
      <div className="card">
        <div className="card-title">{t.reportTitle}</div>
        <p className="muted small" style={{ marginBottom: 10 }}>{t.reportNote}</p>
        <div className="field">
          <label className="label">{t.selectOpponent}</label>
          <select className="select" value={oppId} onChange={e => setOppId(e.target.value)}>
            <option value="">—</option>
            {others.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({displayRating(p.rating)})</option>
            ))}
          </select>
        </div>
        <div className="row" style={{ marginBottom: 12 }}>
          <button className={`btn grow ${won === true ? 'btn-primary' : ''}`} onClick={() => setWon(true)}>{t.iWon}</button>
          <button className={`btn grow ${won === false ? 'btn-primary' : ''}`} onClick={() => setWon(false)}>{t.iLost}</button>
        </div>
        {sent && <div className="notice small" style={{ marginBottom: 10 }}>{t.resultReported}</div>}
        <button className="btn btn-primary btn-block" disabled={!oppId || won === null || busy} onClick={submit}>
          {t.submitResult}
        </button>
      </div>

      <div className="card">
        <div className="card-title">{t.awaitingMe}</div>
        {toConfirm.length === 0 && <p className="muted small">{t.noPending}</p>}
        {toConfirm.map(m => {
          const reporter = byId(m.player_a)
          if (!reporter) return null
          const theyWon = m.winner === m.player_a
          return (
            <div key={m.id} className="list-item">
              <div className="grow">
                <div className="pname">{theyWon ? t.claimWin(reporter.name) : t.claimLoss(reporter.name)}</div>
                <span className="muted small">{fmtDate(m.created_at, lang)}</span>
              </div>
              <button className="btn btn-sm btn-green" onClick={() => confirmMatch(m)}>{t.confirmResult}</button>
              <button className="btn btn-sm btn-danger" onClick={() => reject(m)}>{t.rejectResult}</button>
            </div>
          )
        })}
      </div>

      {waiting.length > 0 && (
        <div className="card">
          <div className="card-title">{t.awaitingThem}</div>
          {waiting.map(m => {
            const opp = byId(m.player_b)
            if (!opp) return null
            return (
              <div key={m.id} className="list-item">
                <div className="grow">
                  <span className="pname">{m.winner === me.id ? t.winWord : t.lossWord}</span>{' '}
                  <span className="muted">{t.vs} {opp.name}</span>
                  <div className="muted small">{fmtDate(m.created_at, lang)}</div>
                </div>
                <span className="tag cyan">{t.statusPending}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Personal stats ───────────────────────────────────────────────────────
function StatsTab({ t, lang, me, data }) {
  const stats = playerStats(me, data.matches)
  return (
    <div>
      <div className="card">
        <div className="card-title">{t.statsTitle}</div>
        <div className="row" style={{ marginBottom: 12 }}>
          <div className="grow center">
            <div className="rating-big" style={{ fontSize: '2.2rem' }}>{displayRating(me.rating)}</div>
            <div className="muted small">{t.displayRatingLabel}</div>
          </div>
          <div className="grow center">
            <div style={{ fontSize: '2.2rem', fontWeight: 900 }}>{Number(me.rating).toFixed(2)}</div>
            <div className="muted small">{t.preciseRating}</div>
          </div>
        </div>
        {stats.provisional && <div className="notice warn small" style={{ marginBottom: 12 }}>{t.provisionalNote}</div>}
        <div className="stat-grid">
          <div className="stat-tile"><div className="v">{stats.games}</div><div className="k">{t.gamesShort}</div></div>
          <div className="stat-tile"><div className="v">{stats.wins}</div><div className="k">{t.winsShort}</div></div>
          <div className="stat-tile"><div className="v">{stats.losses}</div><div className="k">{t.lossesShort}</div></div>
          <div className="stat-tile"><div className="v">{stats.uniqueOpponents}</div><div className="k">{t.uniqueOppLabel}</div></div>
          <div className="stat-tile"><div className="v">{stats.streak}</div><div className="k">{t.streakShort}</div></div>
          <div className="stat-tile"><div className="v">{stats.bestStreak}</div><div className="k">{t.bestStreakLabel}</div></div>
        </div>
      </div>
      <div className="card">
        <div className="card-title">{t.ratingChartTitle}</div>
        {(me.rating_history || []).length > 0
          ? <RatingChart history={me.rating_history} />
          : <p className="muted small">{t.noGames}</p>}
      </div>
    </div>
  )
}

// ─── Head to head ─────────────────────────────────────────────────────────
function H2HTab({ t, lang, me, data }) {
  const [id1, setId1] = useState(me.id)
  const [id2, setId2] = useState('')
  const byId = id => data.players.find(p => p.id === id)
  const p1 = byId(id1)
  const p2 = byId(id2)

  const games = (p1 && p2 && p1.id !== p2.id)
    ? confirmedMatches(data.matches).filter(m =>
        (m.player_a === p1.id && m.player_b === p2.id) ||
        (m.player_a === p2.id && m.player_b === p1.id)
      ).reverse()
    : []
  const wins1 = games.filter(m => m.winner === p1?.id).length
  const wins2 = games.length - wins1

  const PlayerSelect = ({ value, onChange, label }) => (
    <div className="field grow">
      <label className="label">{label}</label>
      <select className="select" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">—</option>
        {data.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </div>
  )

  return (
    <div className="card">
      <div className="card-title">{t.h2hTitle}</div>
      <div className="row">
        <PlayerSelect value={id1} onChange={setId1} label={t.playerOne} />
        <PlayerSelect value={id2} onChange={setId2} label={t.playerTwo} />
      </div>
      {p1 && p2 && p1.id !== p2.id && (
        games.length === 0
          ? <p className="muted center" style={{ padding: 16 }}>{t.noH2H}</p>
          : (
            <div>
              <div className="row center" style={{ justifyContent: 'center', gap: 22, padding: '14px 0' }}>
                <div className="center">
                  <div className="pname">{p1.name}</div>
                  <div className="rating-big" style={{ fontSize: '2.4rem' }}>{wins1}</div>
                </div>
                <div className="muted" style={{ fontSize: '1.3rem' }}>:</div>
                <div className="center">
                  <div className="pname">{p2.name}</div>
                  <div className="rating-big" style={{ fontSize: '2.4rem' }}>{wins2}</div>
                </div>
              </div>
              <p className="muted small center" style={{ marginBottom: 10 }}>
                {t.totalGames}: {games.length}
              </p>
              <div className="divider" />
              <div className="card-title" style={{ fontSize: '0.9rem' }}>{t.recentGames}</div>
              {games.slice(0, 10).map(m => (
                <div key={m.id} className="list-item">
                  <div className="grow">
                    <span className="pname">🏆 {byId(m.winner)?.name}</span>
                    <div className="muted small">{fmtDate(m.confirmed_at, lang)}</div>
                  </div>
                  {m.rated === false && <span className="tag">{t.notRated}</span>}
                </div>
              ))}
            </div>
          )
      )}
    </div>
  )
}

// ─── Leaderboard ──────────────────────────────────────────────────────────
function BoardTab({ t, me, data }) {
  const rows = [...data.players]
    .map(p => ({ p, s: playerStats(p, data.matches) }))
    .sort((a, b) => b.p.rating - a.p.rating || b.s.wins - a.s.wins)
  return (
    <div className="card">
      <div className="card-title">{t.boardTitle}</div>
      <p className="muted small" style={{ marginBottom: 10 }}>{t.boardNote}</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t.rank}</th><th>{t.playerCol}</th><th>{t.ratingCol}</th>
              <th>{t.recordCol}</th><th>{t.gamesCol}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, s }, i) => (
              <tr key={p.id} className={p.id === me?.id ? 'me-row' : ''}>
                <td className="muted">{i + 1}</td>
                <td className="pname">{p.name}</td>
                <td><span className="rating-chip" style={{ fontSize: '0.78rem' }}>{displayRating(p.rating)}</span></td>
                <td>{s.wins}-{s.losses}</td>
                <td className="muted">{s.games}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Inbox ────────────────────────────────────────────────────────────────
function InboxTab({ t, lang, me, data }) {
  const myLevel = displayRating(me.rating)
  const mine = data.messages.filter(m =>
    m.audience === 'all' ||
    (m.audience === 'level' && Number(m.level).toFixed(1) === myLevel) ||
    (m.audience === 'private' && m.to_player === me.id)
  ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return (
    <div className="card">
      <div className="card-title">{t.inboxTitle}</div>
      {mine.length === 0 && <p className="muted small">{t.noMessages}</p>}
      {mine.map(m => (
        <div key={m.id} className="list-item">
          <div className="grow">
            <p style={{ whiteSpace: 'pre-wrap' }}>{m.body}</p>
            <div className="muted small" style={{ marginTop: 4 }}>{fmtDate(m.created_at, lang)}</div>
          </div>
          <span className={`tag ${m.audience === 'private' ? 'purple' : m.audience === 'level' ? 'cyan' : ''}`}>
            {m.audience === 'all' ? t.msgAllTag : m.audience === 'level' ? t.msgLevelTag(Number(m.level).toFixed(1)) : t.msgPrivateTag}
          </span>
        </div>
      ))}
    </div>
  )
}

// ═══ ADMIN ══════════════════════════════════════════════════════════════
function AdminScreen({ t, lang, setLang, data, reload, confirmMatch, onExit }) {
  const [authed, setAuthed] = useState(() => localStorage.getItem(SESSION_KEY) === '__admin__')
  const [user, setUser] = useState('')
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState('players')

  const login = () => {
    if (user.trim().toLowerCase() === ADMIN_USER && pwd.trim() === ADMIN_PASSWORD) {
      localStorage.setItem(SESSION_KEY, '__admin__')
      setAuthed(true)
    } else {
      setError(t.wrongCreds)
    }
  }

  if (!authed) {
    return (
      <div>
        <Header t={t} right={
          <button className="btn btn-sm" onClick={() => setLang(lang === 'he' ? 'en' : 'he')}>{t.langButton}</button>
        } />
        <div className="card" style={{ maxWidth: 420, margin: '40px auto' }}>
          <div className="card-title">{t.adminTitle}</div>
          <div className="field">
            <label className="label">{t.username}</label>
            <input className="input" dir="ltr" value={user} onChange={e => { setUser(e.target.value); setError('') }} />
          </div>
          <div className="field">
            <label className="label">{t.password}</label>
            <input className="input" dir="ltr" type="password" value={pwd}
              onChange={e => { setPwd(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && login()} />
          </div>
          {error && <p className="small" style={{ color: 'var(--red)', marginBottom: 10 }}>{error}</p>}
          <button className="btn btn-primary btn-block" onClick={login}>{t.loginBtn}</button>
          <div className="center" style={{ marginTop: 12 }}>
            <button className="link-btn" onClick={onExit}>{t.back}</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header t={t} right={
        <div className="row">
          <button className="btn btn-sm" onClick={() => setLang(lang === 'he' ? 'en' : 'he')}>{t.langButton}</button>
          <button className="btn btn-sm btn-ghost" onClick={onExit}>{t.exitAdmin}</button>
        </div>
      } />
      <div className="tabs">
        {[['players', t.adminPlayers], ['pending', t.adminPending], ['messages', t.adminMessages]].map(([id, label]) => (
          <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {tab === 'players' && <AdminPlayers t={t} data={data} reload={reload} />}
      {tab === 'pending' && <AdminPending t={t} lang={lang} data={data} reload={reload} confirmMatch={confirmMatch} />}
      {tab === 'messages' && <AdminMessages t={t} lang={lang} data={data} reload={reload} />}
    </div>
  )
}

function AdminPlayers({ t, data, reload }) {
  // group by display level, strongest level first
  const groups = {}
  for (const p of data.players) {
    const lvl = displayRating(p.rating)
    ;(groups[lvl] = groups[lvl] || []).push(p)
  }
  const levels = Object.keys(groups).sort((a, b) => Number(b) - Number(a))

  const remove = async p => {
    if (!window.confirm(t.deletePlayerConfirm(p.name))) return
    await db.deletePlayer(p.id)
    await reload()
  }

  return (
    <div>
      <div className="card">
        <div className="card-title">{t.playersByLevel}</div>
        <p className="muted small">{t.playersCount(data.players.length)}</p>
      </div>
      {levels.map(lvl => (
        <div className="card" key={lvl}>
          <div className="row" style={{ marginBottom: 6 }}>
            <span className="rating-chip">{t.levelWord} {lvl}</span>
            <span className="muted small">{t.playersCount(groups[lvl].length)}</span>
          </div>
          {groups[lvl].map(p => (
            <div key={p.id} className="list-item">
              <div className="grow">
                <div className="pname">{p.name}</div>
                <span className="muted small" dir="ltr">{p.phone} · {Number(p.rating).toFixed(2)}</span>
              </div>
              <a className="btn btn-sm btn-green" href={waLink(p.phone)} target="_blank" rel="noreferrer">💬 {t.whatsapp}</a>
              <button className="btn btn-sm btn-danger" onClick={() => remove(p)}>{t.delete}</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function AdminPending({ t, lang, data, reload, confirmMatch }) {
  const byId = id => data.players.find(p => p.id === id)
  const pending = data.matches.filter(m => m.status === 'pending')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const remove = async m => {
    await db.deleteMatch(m.id)
    await reload()
  }

  return (
    <div className="card">
      <div className="card-title">{t.adminPending}</div>
      {pending.length === 0 && <p className="muted small">{t.noPendingAdmin}</p>}
      {pending.map(m => {
        const a = byId(m.player_a)
        const b = byId(m.player_b)
        if (!a || !b) return null
        const winner = byId(m.winner)
        return (
          <div key={m.id} className="list-item">
            <div className="grow">
              <div className="pname">{a.name} {t.vs} {b.name}</div>
              <span className="muted small">
                🏆 {winner?.name} · {t.reportedAt}: {fmtDate(m.created_at, lang)}
              </span>
            </div>
            <button className="btn btn-sm btn-green" onClick={() => confirmMatch(m)}>{t.forceApprove}</button>
            <button className="btn btn-sm btn-danger" onClick={() => remove(m)}>{t.deleteResult}</button>
          </div>
        )
      })}
    </div>
  )
}

function AdminMessages({ t, lang, data, reload }) {
  const [audience, setAudience] = useState('all')
  const [level, setLevel] = useState('3.0')
  const [toPlayer, setToPlayer] = useState('')
  const [body, setBody] = useState('')
  const [sent, setSent] = useState(false)

  const LEVELS = []
  for (let r = 2.0; r <= 5.51; r += 0.5) LEVELS.push(r.toFixed(1))

  const send = async () => {
    if (!body.trim()) return
    if (audience === 'private' && !toPlayer) return
    await db.createMessage({
      id: db.newId(),
      audience,
      level: audience === 'level' ? Number(level) : null,
      to_player: audience === 'private' ? toPlayer : null,
      body: body.trim(),
      created_at: new Date().toISOString(),
    })
    await reload()
    setBody(''); setSent(true)
    setTimeout(() => setSent(false), 3000)
  }

  const remove = async id => {
    await db.deleteMessage(id)
    await reload()
  }

  const sentList = [...data.messages].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const byId = id => data.players.find(p => p.id === id)

  return (
    <div>
      <div className="card">
        <div className="card-title">{t.sendMessageTitle}</div>
        <div className="field">
          <label className="label">{t.audience}</label>
          <div className="row">
            {[['all', t.audAll], ['level', t.audLevel], ['private', t.audPrivate]].map(([v, label]) => (
              <button key={v} className={`btn btn-sm grow ${audience === v ? 'btn-primary' : ''}`}
                onClick={() => setAudience(v)}>{label}</button>
            ))}
          </div>
        </div>
        {audience === 'level' && (
          <div className="field">
            <label className="label">{t.levelWord}</label>
            <select className="select" value={level} onChange={e => setLevel(e.target.value)}>
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        )}
        {audience === 'private' && (
          <div className="field">
            <label className="label">{t.playerCol}</label>
            <select className="select" value={toPlayer} onChange={e => setToPlayer(e.target.value)}>
              <option value="">—</option>
              {data.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        <div className="field">
          <label className="label">{t.msgBody}</label>
          <textarea className="textarea" value={body} onChange={e => setBody(e.target.value)} />
        </div>
        {sent && <div className="notice small" style={{ marginBottom: 10 }}>{t.msgSent}</div>}
        <button className="btn btn-primary btn-block" onClick={send}>{t.send}</button>
      </div>
      <div className="card">
        <div className="card-title">{t.sentMessages}</div>
        {sentList.length === 0 && <p className="muted small">{t.noMessages}</p>}
        {sentList.map(m => (
          <div key={m.id} className="list-item">
            <div className="grow">
              <p style={{ whiteSpace: 'pre-wrap' }}>{m.body}</p>
              <div className="muted small" style={{ marginTop: 4 }}>
                {m.audience === 'all' ? t.msgAllTag
                  : m.audience === 'level' ? t.msgLevelTag(Number(m.level).toFixed(1))
                  : `${t.msgPrivateTag}: ${byId(m.to_player)?.name || '—'}`}
                {' · '}{fmtDate(m.created_at, lang)}
              </div>
            </div>
            <button className="btn btn-sm btn-danger" onClick={() => remove(m.id)}>{t.delete}</button>
          </div>
        ))}
      </div>
    </div>
  )
}
