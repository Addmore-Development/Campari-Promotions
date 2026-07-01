// frontend/src/shared/auth/LoginPage.tsx

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/* ─── DESIGN TOKENS — all gold/amber/brown palette ──────────── */
const BLACK        = '#080808'
const BLACK_CARD   = '#161616'
const BLACK_BORDER = 'rgba(255,255,255,0.07)'
const GOLD         = '#C4973A'
const GOLD_LIGHT   = '#DDB55A'
const GOLD_DIM     = 'rgba(196,151,58,0.55)'
const GOLD_PALE    = 'rgba(196,151,58,0.28)'
const AMBER        = '#B8820A'
const BROWN        = '#7A5C1E'
const WHITE        = '#F4EFE6'
const WHITE_MUTED  = 'rgba(244,239,230,0.55)'
const WHITE_DIM    = 'rgba(244,239,230,0.22)'
const FD           = "'Playfair Display', Georgia, serif"
const FB           = "'DM Sans', system-ui, sans-serif"

/* ─── ROLE CONFIG — all gold shades ─────────────────────────── */
type Role = 'promoter' | 'business' | 'admin'

const ROLE_CONFIG: Record<Role, { label: string; icon: string; accentColor: string; borderColor: string; description: string }> = {
  promoter: {
    label:       'Promoter',
    icon:        '◉',
    accentColor: GOLD,
    borderColor: `rgba(196,151,58,0.55)`,
    description: 'Access your shifts, geo check-in, and earnings dashboard.',
  },
  business: {
    label:       'Business',
    icon:        '◈',
    accentColor: GOLD_LIGHT,
    borderColor: `rgba(221,181,90,0.55)`,
    description: 'Manage your promoter teams, monitor attendance, and view reports.',
  },
  admin: {
    label:       'Admin',
    icon:        '◆',
    accentColor: AMBER,
    borderColor: `rgba(184,130,10,0.55)`,
    description: 'Full platform access — users, jobs, payroll, and operations.',
  },
}

const DASHBOARD_ROUTE: Record<Role, string> = {
  promoter: '/promoter/',
  business: '/business/dashboard',
  admin:    '/admin',
}

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400;1,700&family=DM+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { -webkit-font-smoothing: antialiased; background: ${BLACK}; }
  @keyframes hg-fade-up {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .hg-form-wrap { animation: hg-fade-up 0.55s ease both; }
  input::placeholder { color: rgba(196,151,58,0.2); }
  input:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 30px #0e0e0e inset !important;
    -webkit-text-fill-color: ${WHITE} !important;
  }
`

function FloatingInput({
  label, type = 'text', placeholder, value, onChange, focused, onFocus, onBlur, accentColor,
}: {
  label: string; type?: string; placeholder: string; value: string
  onChange: (v: string) => void; focused: boolean
  onFocus: () => void; onBlur: () => void; accentColor: string
}) {
  return (
    <div>
      <label style={{
        display: 'block', fontFamily: FB, fontSize: 10, fontWeight: 600,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        color: focused ? accentColor : GOLD_DIM,
        marginBottom: 8, transition: 'color 0.2s',
      }}>
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        style={{
          width: '100%',
          background: 'rgba(196,151,58,0.03)',
          border: `1px solid ${focused ? accentColor : 'rgba(196,151,58,0.15)'}`,
          padding: '14px 16px',
          fontFamily: FB, fontSize: 14, color: WHITE,
          outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
          boxShadow: focused ? `0 0 0 3px ${accentColor}18` : 'none',
        }}
      />
    </div>
  )
}

export default function LoginPage() {
  const navigate                   = useNavigate()
  const { login }                  = useAuth()
  const [role, setRole]            = useState<Role>('promoter')
  const [email, setEmail]          = useState('')
  const [password, setPassword]    = useState('')
  const [error, setError]          = useState<string | null>(null)
  const [loading, setLoading]      = useState(false)
  const [success, setSuccess]      = useState(false)
  const [focusedField, setFocused] = useState<string | null>(null)

  // ── Change-password panel (admin only) ──────────────────────────────────────
  const [showChangePw, setShowChangePw] = useState(false)
  const [cpCurrent,    setCpCurrent]    = useState('')
  const [cpNew,        setCpNew]        = useState('')
  const [cpConfirm,    setCpConfirm]    = useState('')
  const [cpError,      setCpError]      = useState<string | null>(null)
  const [cpSuccess,    setCpSuccess]    = useState(false)
  const [cpLoading,    setCpLoading]    = useState(false)
  const [cpFocused,    setCpFocused]    = useState<string | null>(null)

  const handleChangePassword = async () => {
    setCpError(null)
    if (!cpCurrent || !cpNew || !cpConfirm) { setCpError('All fields are required.'); return }
    if (cpNew.length < 8)                   { setCpError('New password must be at least 8 characters.'); return }
    if (cpNew !== cpConfirm)                { setCpError('New passwords do not match.'); return }
    setCpLoading(true)
    try {
      const token = localStorage.getItem('hg_token')
      if (!token) throw new Error('Not logged in — please log in first.')
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: cpCurrent, newPassword: cpNew }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(err.error || 'Password change failed.')
      }
      setCpSuccess(true)
      setCpCurrent(''); setCpNew(''); setCpConfirm('')
      setTimeout(() => { setCpSuccess(false); setShowChangePw(false) }, 2200)
    } catch (err: any) {
      setCpError(err.message || 'Password change failed.')
    } finally {
      setCpLoading(false)
    }
  }

  const cfg = ROLE_CONFIG[role]

  const handleLogin = async () => {
    setError(null)
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setLoading(true)
    try {
      await login(email, password)
      // Read the role that came back from the API — stored in hg_session by authService
      const raw = localStorage.getItem('hg_session')
      const actualRole: string = raw ? (JSON.parse(raw).role || role) : role
      const redirect = DASHBOARD_ROUTE[actualRole as Role] ?? DASHBOARD_ROUTE[role]
      setSuccess(true)
      setTimeout(() => navigate(redirect), 900)
    } catch (err: any) {
      setError(err.message || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div
      onKeyDown={handleKeyDown}
      style={{
        minHeight: '100vh', background: BLACK,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: FB, padding: '40px 16px', position: 'relative', overflow: 'hidden',
      }}
    >
      <style>{GLOBAL_CSS}</style>

      {/* Grid background — amber tint */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.03,
        backgroundImage: `linear-gradient(${GOLD} 1px,transparent 1px),linear-gradient(90deg,${GOLD} 1px,transparent 1px)`,
        backgroundSize: '72px 72px',
      }} />

      {/* Radial glow — shifts with role accent */}
      <div style={{
        position: 'fixed', top: '-10%', left: '50%', transform: 'translateX(-50%)',
        width: 700, height: 400, borderRadius: '50%', zIndex: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse, ${cfg.accentColor}14 0%, transparent 70%)`,
        transition: 'background 0.6s ease',
      }} />

      {/* Decorative rings */}
      <div style={{
        position: 'fixed', right: -240, top: '50%', transform: 'translateY(-50%)',
        width: 600, height: 600, borderRadius: '50%',
        border: `1px solid rgba(196,151,58,0.07)`, pointerEvents: 'none', zIndex: 0,
      }}>
        <div style={{ position: 'absolute', inset: 80, borderRadius: '50%', border: `1px solid rgba(196,151,58,0.04)` }} />
      </div>

      <div className="hg-form-wrap" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 460 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontFamily: FD, fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
            <span style={{ color: GOLD }}>HONEY</span>
            <span style={{ color: WHITE }}> GROUP</span>
          </div>
          <div style={{ width: 32, height: 1, background: GOLD, margin: '0 auto 18px' }} />
          <p style={{ fontFamily: FB, fontSize: 10, fontWeight: 600, letterSpacing: '0.38em', textTransform: 'uppercase', color: GOLD_DIM }}>
            Platform Login
          </p>
        </div>

        {/* Role tabs */}
        <div style={{
          display: 'flex', background: '#0d0d0d',
          border: `1px solid rgba(196,151,58,0.12)`, padding: 4, marginBottom: 28, gap: 4,
        }}>
          {(Object.keys(ROLE_CONFIG) as Role[]).map(r => {
            const c = ROLE_CONFIG[r]
            const active = role === r
            return (
              <button key={r} onClick={() => { setRole(r); setError(null) }}
                style={{
                  flex: 1, padding: '11px 8px',
                  background: active ? `${c.accentColor}14` : 'transparent',
                  border: active ? `1px solid ${c.accentColor}55` : '1px solid transparent',
                  color: active ? c.accentColor : GOLD_PALE,
                  fontFamily: FB, fontSize: 11, fontWeight: 600,
                  letterSpacing: '0.14em', textTransform: 'uppercase',
                  cursor: 'pointer', transition: 'all 0.3s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = GOLD_DIM }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.color = GOLD_PALE }}
              >
                <span style={{ fontSize: 13 }}>{c.icon}</span>
                {c.label}
              </button>
            )
          })}
        </div>

        {/* Card */}
        <div style={{
          background: BLACK_CARD, border: `1px solid rgba(196,151,58,0.12)`,
          padding: '44px 40px', position: 'relative',
          boxShadow: `0 40px 100px rgba(0,0,0,0.6), 0 0 60px ${cfg.accentColor}08`,
          transition: 'box-shadow 0.5s',
        }}>
          {/* Top accent bar — gold gradient */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, ${BROWN}, ${cfg.accentColor}, ${GOLD_LIGHT}, ${cfg.accentColor}, ${BROWN})`,
            transition: 'background 0.4s',
          }} />

          {/* Role description — amber tinted */}
          <div style={{
            background: `${cfg.accentColor}0c`,
            border: `1px solid ${cfg.accentColor}28`,
            padding: '10px 14px', marginBottom: 32, transition: 'all 0.4s',
          }}>
            <p style={{ fontFamily: FB, fontSize: 12, color: cfg.accentColor, margin: 0, lineHeight: 1.5, transition: 'color 0.4s' }}>
              {cfg.description}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <FloatingInput
              label="Email Address" type="email" placeholder="you@honeygroup.co.za"
              value={email} onChange={setEmail}
              focused={focusedField === 'email'}
              onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
              accentColor={cfg.accentColor}
            />
            <FloatingInput
              label="Password" type="password" placeholder="••••••••"
              value={password} onChange={setPassword}
              focused={focusedField === 'password'}
              onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
              accentColor={cfg.accentColor}
            />
          </div>

          {error && (
            <div style={{
              marginTop: 18, padding: '10px 14px',
              background: 'rgba(184,130,10,0.10)', border: `1px solid ${AMBER}44`,
              fontFamily: FB, fontSize: 12, color: AMBER,
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              marginTop: 18, padding: '10px 14px',
              background: `${cfg.accentColor}12`, border: `1px solid ${cfg.accentColor}40`,
              fontFamily: FB, fontSize: 12, color: cfg.accentColor,
            }}>
              ✓ Login successful — redirecting to your dashboard…
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || success}
            style={{
              marginTop: 28, width: '100%', padding: '16px 0',
              background: success ? `${cfg.accentColor}18` : `linear-gradient(90deg, ${AMBER}, ${cfg.accentColor}, ${GOLD_LIGHT})`,
              border: success ? `1px solid ${cfg.accentColor}50` : 'none',
              fontFamily: FB, fontSize: 11, fontWeight: 600,
              letterSpacing: '0.22em', textTransform: 'uppercase',
              color: success ? cfg.accentColor : BLACK,
              cursor: loading ? 'wait' : 'pointer',
              transition: 'all 0.3s',
            }}
            onMouseEnter={e => { if (!loading && !success) { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            {success ? `✓ Logged in` : loading ? 'Authenticating…' : `Log In as ${cfg.label}`}
          </button>

          {/* Footer links */}
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            {role !== 'admin' && (
              <p style={{ fontFamily: FB, fontSize: 12, color: GOLD_DIM, marginBottom: 0 }}>
                Don't have an account?{' '}
                <button
                  onClick={() => navigate('/register')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FB, fontSize: 12, color: GOLD, fontWeight: 600, padding: 0 }}
                >
                  Register
                </button>
              </p>
            )}
            {role === 'admin' && (
              <p style={{ fontFamily: FB, fontSize: 11, color: GOLD_PALE, letterSpacing: '0.1em' }}>
                Admin accounts are created by invitation only{'  '}
                <button
                  onClick={() => { setShowChangePw(v => !v); setCpError(null); setCpSuccess(false) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FB, fontSize: 11, color: AMBER, padding: 0, textDecoration: 'underline' }}
                >
                  {showChangePw ? 'Cancel' : 'Change Password'}
                </button>
              </p>
            )}
          </div>
        </div>

        {/* ── Change-password panel (admin only) ── */}
        {role === 'admin' && showChangePw && (
          <div style={{
            background: BLACK_CARD, border: `1px solid rgba(184,130,10,0.22)`,
            padding: '32px 40px', marginTop: 12, position: 'relative',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: `linear-gradient(90deg, ${BROWN}, ${AMBER}, ${GOLD_LIGHT})` }} />
            <p style={{ fontFamily: FB, fontSize: 9, fontWeight: 600, letterSpacing: '0.28em',
              textTransform: 'uppercase', color: AMBER, marginBottom: 20 }}>
              Change Admin Password
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(['cpCurrent','cpNew','cpConfirm'] as const).map((field, i) => {
                const labels   = ['Current Password', 'New Password', 'Confirm New Password']
                const values   = [cpCurrent, cpNew, cpConfirm]
                const setters  = [setCpCurrent, setCpNew, setCpConfirm]
                return (
                  <div key={field}>
                    <label style={{ display: 'block', fontFamily: FB, fontSize: 10, fontWeight: 600,
                      letterSpacing: '0.18em', textTransform: 'uppercase',
                      color: cpFocused === field ? AMBER : GOLD_DIM, marginBottom: 8, transition: 'color 0.2s' }}>
                      {labels[i]}
                    </label>
                    <input
                      type="password" placeholder="••••••••" value={values[i]}
                      onChange={e => setters[i](e.target.value)}
                      onFocus={() => setCpFocused(field)} onBlur={() => setCpFocused(null)}
                      style={{ width: '100%', background: 'rgba(184,130,10,0.03)',
                        border: `1px solid ${cpFocused === field ? AMBER : 'rgba(184,130,10,0.15)'}`,
                        padding: '12px 16px', fontFamily: FB, fontSize: 14, color: WHITE,
                        outline: 'none', transition: 'border-color 0.2s',
                        boxShadow: cpFocused === field ? `0 0 0 3px ${AMBER}18` : 'none' }}
                    />
                  </div>
                )
              })}
            </div>

            {cpError && (
              <div style={{ marginTop: 14, padding: '9px 14px',
                background: 'rgba(184,130,10,0.08)', border: `1px solid ${AMBER}40`,
                fontFamily: FB, fontSize: 12, color: AMBER }}>
                {cpError}
              </div>
            )}
            {cpSuccess && (
              <div style={{ marginTop: 14, padding: '9px 14px',
                background: 'rgba(192,120,24,0.10)', border: `1px solid ${GOLD}50`,
                fontFamily: FB, fontSize: 12, color: GOLD }}>
                ✓ Password changed successfully
              </div>
            )}

            <button
              onClick={handleChangePassword} disabled={cpLoading || cpSuccess}
              style={{ marginTop: 20, width: '100%', padding: '13px 0',
                background: `linear-gradient(90deg, ${BROWN}, ${AMBER}, ${GOLD_LIGHT})`,
                border: 'none', fontFamily: FB, fontSize: 11, fontWeight: 600,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                color: BLACK, cursor: cpLoading ? 'wait' : 'pointer', transition: 'all 0.3s' }}
              onMouseEnter={e => { if (!cpLoading) e.currentTarget.style.opacity = '0.88' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              {cpSuccess ? '✓ Updated' : cpLoading ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        )}

        {/* Back to home */}
        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FB, fontSize: 11, color: GOLD_PALE, letterSpacing: '0.16em', textTransform: 'uppercase', transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
            onMouseLeave={e => (e.currentTarget.style.color = GOLD_PALE)}
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}