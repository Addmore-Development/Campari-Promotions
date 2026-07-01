// frontend/src/promoter/PendingApprovalPage.tsx

import { useState, useEffect } from 'react'
import { useNavigate }         from 'react-router-dom'
import { useAuth }             from '../shared/hooks/useAuth'

/* ─── Design Tokens ──────────────────────────────────────────────────────────── */
const B   = '#0C0A07'
const BC  = '#141008'
const BC2 = '#1A1408'
const G   = '#D4880A'
const GL  = '#E8A820'
const G2  = '#8B5A1A'
const G5  = '#6B3F10'
const BB  = 'rgba(212,136,10,0.16)'
const BB2 = 'rgba(212,136,10,0.08)'
const W   = '#FAF3E8'
const WM  = 'rgba(250,243,232,0.65)'
const WD  = 'rgba(250,243,232,0.28)'
const FD  = "'Playfair Display', Georgia, serif"
const FB  = "'DM Sans', system-ui, sans-serif"

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

type Status = 'pending_review' | 'documents_submitted' | 'rejected' | 'approved' | 'blacklisted'

const STATUS_CONFIG: Record<Status, { icon: string; title: string; color: string; bg: string; border: string }> = {
  pending_review: {
    icon: '⏳',
    title: 'Application Under Review',
    color: GL,
    bg: 'rgba(232,168,32,0.08)',
    border: 'rgba(232,168,32,0.30)',
  },
  documents_submitted: {
    icon: '📋',
    title: 'Documents Received',
    color: GL,
    bg: 'rgba(232,168,32,0.08)',
    border: 'rgba(232,168,32,0.30)',
  },
  rejected: {
    icon: '✕',
    title: 'Application Rejected',
    color: '#C87060',
    bg: 'rgba(200,112,96,0.08)',
    border: 'rgba(200,112,96,0.30)',
  },
  approved: {
    icon: '✓',
    title: 'Application Approved',
    color: GL,
    bg: 'rgba(232,168,32,0.08)',
    border: 'rgba(232,168,32,0.30)',
  },
  blacklisted: {
    icon: '⊘',
    title: 'Account Suspended',
    color: '#C87060',
    bg: 'rgba(200,112,96,0.08)',
    border: 'rgba(200,112,96,0.30)',
  },
}

export default function PendingApprovalPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [status,        setStatus]        = useState<Status>('pending_review')
  const [rejectionNote, setRejectionNote] = useState<string>('')
  const [checking,      setChecking]      = useState(false)
  const [lastChecked,   setLastChecked]   = useState<Date>(new Date())

  /* ── Read onboardingStatus from session ──────────────────────────────────── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem('hg_session')
      if (raw) {
        const sess = JSON.parse(raw)
        const s = (sess.onboardingStatus || sess.status || 'pending_review') as Status
        setStatus(s)
        if (sess.rejectionReason) setRejectionNote(sess.rejectionReason)
        // If somehow approved, redirect straight to portal
        if (s === 'approved') {
          navigate('/promoter/', { replace: true })
        }
      }
    } catch { /* ignore */ }
  }, [navigate])

  /* ── Poll the API for status changes every 30s ───────────────────────────── */
  useEffect(() => {
    const poll = async () => {
      try {
        const token = localStorage.getItem('hg_token')
        if (!token) return
        const res = await fetch(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const data = await res.json()
        const newStatus = (data.onboardingStatus || data.status || 'pending_review') as Status
        setLastChecked(new Date())

        // Update session
        const raw = localStorage.getItem('hg_session')
        if (raw) {
          const sess = JSON.parse(raw)
          sess.onboardingStatus = newStatus
          sess.status           = newStatus
          if (data.rejectionReason) {
            sess.rejectionReason = data.rejectionReason
            setRejectionNote(data.rejectionReason)
          }
          localStorage.setItem('hg_session', JSON.stringify(sess))
        }

        if (newStatus === 'approved') {
          navigate('/promoter/', { replace: true })
          return
        }
        setStatus(newStatus)
      } catch { /* silent */ }
    }

    // Poll immediately then every 30 seconds
    poll()
    const interval = setInterval(poll, 30_000)
    return () => clearInterval(interval)
  }, [navigate])

  const handleManualCheck = async () => {
    setChecking(true)
    try {
      const token = localStorage.getItem('hg_token')
      if (!token) return
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      const newStatus = (data.onboardingStatus || data.status || 'pending_review') as Status
      setLastChecked(new Date())
      setStatus(newStatus)
      if (newStatus === 'approved') navigate('/promoter/', { replace: true })
    } catch { /* ignore */ } finally {
      setChecking(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending_review
  const isRejected = status === 'rejected' || status === 'blacklisted'

  const steps = [
    { label: 'Application Submitted',  done: true  },
    { label: 'Documents Received',     done: status !== 'pending_review' },
    { label: 'Admin Review',           done: status === 'approved' || isRejected },
    { label: 'Account Activated',      done: status === 'approved' },
  ]

  return (
    <div style={{
      minHeight: '100vh', background: B, fontFamily: FB, color: W,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '40px 20px',
      position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${B}; }
        @keyframes pulse-ring { 0%,100%{box-shadow:0 0 0 0 rgba(232,168,32,0.4)} 50%{box-shadow:0 0 0 20px rgba(232,168,32,0)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .hg-pending { animation: fadeUp 0.5s ease both; }
      `}</style>

      {/* Background radial glow */}
      <div style={{
        position: 'fixed', top: '-20%', left: '50%', transform: 'translateX(-50%)',
        width: 900, height: 600, borderRadius: '50%', pointerEvents: 'none',
        background: `radial-gradient(ellipse, ${isRejected ? 'rgba(200,112,96,0.06)' : 'rgba(212,136,10,0.07)'} 0%, transparent 70%)`,
      }} />

      {/* Grid texture */}
      <div style={{
        position: 'fixed', inset: 0, opacity: 0.025, pointerEvents: 'none',
        backgroundImage: `linear-gradient(${G} 1px,transparent 1px),linear-gradient(90deg,${G} 1px,transparent 1px)`,
        backgroundSize: '72px 72px',
      }} />

      <div className="hg-pending" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 560 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontFamily: FD, fontSize: 20, fontWeight: 700 }}>
            <span style={{ color: GL }}>HONEY</span>
            <span style={{ color: W }}> GROUP</span>
          </div>
          <div style={{ width: 28, height: 1, background: G, margin: '10px auto 0' }} />
        </div>

        {/* Status icon */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 90, height: 90, borderRadius: '50%', margin: '0 auto',
            background: cfg.bg, border: `1px solid ${cfg.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36,
            animation: !isRejected ? 'pulse-ring 3s ease-in-out infinite' : 'none',
          }}>
            {cfg.icon}
          </div>
        </div>

        {/* Main card */}
        <div style={{
          background: BC, border: `1px solid ${BB}`,
          padding: '44px 44px 40px', position: 'relative', overflow: 'hidden',
          marginBottom: 16,
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: isRejected
              ? 'linear-gradient(90deg, #6B3010, #C87060, #6B3010)'
              : `linear-gradient(90deg, ${G5}, ${GL}, ${G5})`,
          }} />

          <div style={{ fontSize: 9, letterSpacing: '0.38em', textTransform: 'uppercase', color: cfg.color, marginBottom: 12, fontWeight: 700 }}>
            {isRejected ? 'Application Status' : 'Account Status'}
          </div>

          <h1 style={{ fontFamily: FD, fontSize: 28, fontWeight: 700, color: W, marginBottom: 20, lineHeight: 1.2 }}>
            {cfg.title}
          </h1>

          {!isRejected ? (
            <>
              <p style={{ fontSize: 14, color: WM, lineHeight: 1.75, marginBottom: 24 }}>
                Your application is being reviewed by the Honey Group admin team. This typically takes
                <span style={{ color: GL, fontWeight: 600 }}> 1–2 business days</span>. We'll activate your account as soon as your documents have been verified.
              </p>

              {/* Progress steps */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: G, marginBottom: 14, fontWeight: 700 }}>
                  Application Progress
                </div>
                {steps.map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: i < steps.length - 1 ? 10 : 0 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      background: step.done ? `rgba(232,168,32,0.15)` : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${step.done ? GL : BB}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, color: step.done ? GL : WD, fontWeight: 700,
                    }}>
                      {step.done ? '✓' : String(i + 1)}
                    </div>
                    <div style={{
                      flex: 1, height: 1,
                      background: i < steps.length - 1
                        ? (steps[i + 1].done ? `rgba(232,168,32,0.35)` : BB)
                        : 'transparent',
                      display: i < steps.length - 1 ? 'block' : 'none',
                      position: 'absolute', left: 0,
                    }} />
                    <span style={{ fontSize: 13, color: step.done ? W : WD, fontWeight: step.done ? 500 : 400 }}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* What you can do while waiting */}
              <div style={{ background: BB2, border: `1px solid ${BB}`, padding: '18px 20px', marginBottom: 24 }}>
                <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: G, marginBottom: 12, fontWeight: 700 }}>
                  While You Wait
                </div>
                {[
                  'Browse available jobs to see what opportunities are coming up',
                  'Ensure your documents are clear and up to date',
                  'Make sure your bank account number is correct',
                ].map((tip, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: i < 2 ? 8 : 0 }}>
                    <span style={{ color: G, fontSize: 10, marginTop: 2 }}>◎</span>
                    <span style={{ fontSize: 12, color: WM, lineHeight: 1.6 }}>{tip}</span>
                  </div>
                ))}
              </div>

              {/* Last checked */}
              <div style={{ fontSize: 11, color: WD, textAlign: 'center', marginBottom: 20 }}>
                Last checked: {lastChecked.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
              </div>

              {/* Check status button */}
              <button
                onClick={handleManualCheck}
                disabled={checking}
                style={{
                  width: '100%', padding: '14px',
                  background: `linear-gradient(90deg, ${G5}, ${G}, ${GL})`,
                  border: 'none', color: B, fontFamily: FB, fontSize: 11,
                  fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase',
                  cursor: checking ? 'wait' : 'pointer', marginBottom: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
                onMouseEnter={e => { if (!checking) e.currentTarget.style.opacity = '0.88' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
              >
                {checking ? (
                  <>
                    <span style={{ width: 14, height: 14, border: `2px solid ${B}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                    Checking…
                  </>
                ) : '⟳ Check Approval Status'}
              </button>

              <button
                onClick={() => navigate('/jobs')}
                style={{
                  width: '100%', padding: '12px',
                  background: 'transparent', border: `1px solid ${BB}`,
                  color: WM, fontFamily: FB, fontSize: 11, cursor: 'pointer',
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,136,10,0.4)'; e.currentTarget.style.color = W }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BB; e.currentTarget.style.color = WM }}
              >
                Browse Available Jobs
              </button>
            </>
          ) : (
            <>
              <div style={{ background: 'rgba(200,112,96,0.08)', border: '1px solid rgba(200,112,96,0.25)', padding: '16px 20px', marginBottom: 20 }}>
                <p style={{ fontSize: 14, color: WM, lineHeight: 1.75 }}>
                  {status === 'blacklisted'
                    ? 'Your account has been suspended. Please contact the Honey Group admin team for further information.'
                    : 'Unfortunately your application was not approved at this time. You may re-apply with updated documentation.'}
                </p>
                {rejectionNote && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(200,112,96,0.2)' }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C87060', marginBottom: 6, fontWeight: 700 }}>Admin Note</div>
                    <p style={{ fontSize: 13, color: WM, fontStyle: 'italic' }}>{rejectionNote}</p>
                  </div>
                )}
              </div>

              {status !== 'blacklisted' && (
                <button
                  onClick={() => navigate('/register')}
                  style={{
                    width: '100%', padding: '14px',
                    background: `linear-gradient(90deg, ${G5}, ${G}, ${GL})`,
                    border: 'none', color: B, fontFamily: FB, fontSize: 11,
                    fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase',
                    cursor: 'pointer', marginBottom: 12,
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  Re-Apply →
                </button>
              )}

              <a
                href="mailto:admin@honeygroup.co.za"
                style={{
                  display: 'block', width: '100%', padding: '12px',
                  background: 'transparent', border: `1px solid ${BB}`,
                  color: WM, fontFamily: FB, fontSize: 11, textAlign: 'center',
                  textDecoration: 'none', letterSpacing: '0.12em', textTransform: 'uppercase',
                }}
              >
                Contact Admin
              </a>
            </>
          )}
        </div>

        {/* User info + logout */}
        {user && (
          <div style={{ background: BC, border: `1px solid ${BB}`, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, color: W, fontWeight: 600 }}>{user.name}</div>
              <div style={{ fontSize: 11, color: WD }}>{user.email}</div>
            </div>
            <button
              onClick={handleLogout}
              style={{ background: 'none', border: `1px solid ${BB}`, color: WM, fontFamily: FB, fontSize: 11, cursor: 'pointer', padding: '7px 16px', letterSpacing: '0.1em' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,136,10,0.35)'; e.currentTarget.style.color = GL }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = BB; e.currentTarget.style.color = WM }}
            >
              Log Out
            </button>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FB, fontSize: 11, color: WD, letterSpacing: '0.12em', textTransform: 'uppercase' }}
            onMouseEnter={e => e.currentTarget.style.color = GL}
            onMouseLeave={e => e.currentTarget.style.color = WD}
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}