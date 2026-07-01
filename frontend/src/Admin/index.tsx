import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const G = '#C4973A'
const GL = '#DDB55A'
const B = '#080808'
const BC = '#161616'
const BB = 'rgba(255,255,255,0.07)'
const W = '#F4EFE6'
const WM = 'rgba(244,239,230,0.55)'
const WD = 'rgba(244,239,230,0.22)'
const FD = "'Playfair Display', Georgia, serif"
const FB = "'DM Sans', system-ui, sans-serif"

const NAV_ITEMS = [
  { label: 'Dashboard',   icon: '◈', path: '/admin'           },
  { label: 'Users',       icon: '◉', path: '/admin/users'     },
  { label: 'Jobs',        icon: '◆', path: '/admin/jobs'      },
  { label: 'Live Map',    icon: '⬡', path: '/admin/map'       },
  { label: 'Payments',    icon: '◎', path: '/admin/payments'  },
  { label: 'Onboarding',  icon: '▣', path: '/admin/onboarding'},
]

const STATS = [
  { label: 'Active Promoters', value: '284',   delta: '+12 this week',  color: '#3A7BD5' },
  { label: 'Open Jobs',        value: '37',    delta: '8 closing today', color: G         },
  { label: 'Pending Docs',     value: '14',    delta: 'Needs review',    color: '#EF4444' },
  { label: 'Payroll Due',      value: 'R48.2k',delta: '23 promoters',    color: '#8B5CF6' },
]

const RECENT_ACTIVITY = [
  { time: '2m ago',  msg: 'Ayanda Dlamini checked in at Sandton City',     type: 'checkin'  },
  { time: '8m ago',  msg: 'New application: Thabo Nkosi — Promoter',       type: 'apply'    },
  { time: '14m ago', msg: 'Job #JB-204 filled — 8/8 slots taken',          type: 'job'      },
  { time: '22m ago', msg: 'Sipho Mhlongo submitted ID document',            type: 'doc'      },
  { time: '31m ago', msg: 'Payroll batch approved — R12,400 exported',      type: 'payment'  },
  { time: '45m ago', msg: 'Lerato Mokoena flagged late — Rosebank Mall',    type: 'flag'     },
]

const TYPE_COLOR: Record<string, string> = {
  checkin: '#22C55E', apply: G, job: '#3A7BD5', doc: '#8B5CF6', payment: '#22C55E', flag: '#EF4444',
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [active, setActive] = useState('/admin')
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const go = (path: string) => { setActive(path); navigate(path) }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: B, fontFamily: FB, color: W }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-thumb { background: ${G}; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      {/* SIDEBAR */}
      <aside style={{ width: 220, background: BC, borderRight: `1px solid ${BB}`, display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100 }}>
        <div style={{ padding: '28px 24px', borderBottom: `1px solid ${BB}` }}>
          <div style={{ fontFamily: FD, fontSize: 17, fontWeight: 700 }}>
            <span style={{ color: G }}>HONEY</span><span style={{ color: W }}> GROUP</span>
          </div>
          <div style={{ fontSize: 9, letterSpacing: '0.3em', color: WD, marginTop: 4, textTransform: 'uppercase' }}>Admin Console</div>
        </div>
        <nav style={{ flex: 1, padding: '16px 12px' }}>
          {NAV_ITEMS.map(n => (
            <button key={n.path} onClick={() => go(n.path)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
              background: active === n.path ? 'rgba(196,151,58,0.1)' : 'transparent',
              border: active === n.path ? `1px solid rgba(196,151,58,0.25)` : '1px solid transparent',
              borderRadius: 6, cursor: 'pointer', marginBottom: 4, transition: 'all 0.2s',
              color: active === n.path ? G : WM, fontFamily: FB, fontSize: 13, fontWeight: active === n.path ? 600 : 400,
            }}
              onMouseEnter={e => { if (active !== n.path) e.currentTarget.style.color = W }}
              onMouseLeave={e => { if (active !== n.path) e.currentTarget.style.color = WM }}
            >
              <span style={{ fontSize: 16 }}>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${BB}` }}>
          <div style={{ fontSize: 10, color: WD, letterSpacing: '0.1em' }}>Logged in as</div>
          <div style={{ fontSize: 13, color: W, fontWeight: 600, marginTop: 4 }}>Admin</div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ marginLeft: 220, flex: 1, padding: '40px 48px', overflowY: 'auto' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase', color: G, marginBottom: 8 }}>Admin Dashboard</div>
            <h1 style={{ fontFamily: FD, fontSize: 32, fontWeight: 700, color: W }}>Good morning, Admin.</h1>
            <p style={{ fontSize: 13, color: WM, marginTop: 6 }}>Here's what's happening across the platform today.</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: FD, fontSize: 22, color: W }}>{time.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</div>
            <div style={{ fontSize: 11, color: WM, marginTop: 4 }}>{time.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          </div>
        </div>

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 40 }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ background: BC, border: `1px solid ${BB}`, padding: '28px 24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: s.color }} />
              <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: WM, marginBottom: 12 }}>{s.label}</div>
              <div style={{ fontFamily: FD, fontSize: 36, fontWeight: 700, color: W, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: s.color, marginTop: 8 }}>{s.delta}</div>
            </div>
          ))}
        </div>

        {/* QUICK ACTIONS + ACTIVITY */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* QUICK ACTIONS */}
          <div style={{ background: BC, border: `1px solid ${BB}`, padding: '28px' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: G, marginBottom: 20 }}>Quick Actions</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Review Docs',    icon: '▣', path: '/admin/onboarding', color: '#8B5CF6' },
                { label: 'Manage Jobs',    icon: '◆', path: '/admin/jobs',       color: G         },
                { label: 'View Live Map',  icon: '⬡', path: '/admin/map',        color: '#22C55E' },
                { label: 'Approve Pay',    icon: '◎', path: '/admin/payments',   color: '#3A7BD5' },
              ].map(a => (
                <button key={a.path} onClick={() => go(a.path)} style={{
                  padding: '18px 16px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BB}`,
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10, transition: 'all 0.2s',
                  fontFamily: FB,
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.background = `rgba(255,255,255,0.06)` }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = BB; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                >
                  <span style={{ fontSize: 20, color: a.color }}>{a.icon}</span>
                  <span style={{ fontSize: 12, color: W, fontWeight: 600 }}>{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ACTIVITY FEED */}
          <div style={{ background: BC, border: `1px solid ${BB}`, padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: G }}>Live Activity</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 10, color: WM }}>Live</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {RECENT_ACTIVITY.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: i < RECENT_ACTIVITY.length - 1 ? `1px solid ${BB}` : 'none' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: TYPE_COLOR[a.type], marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: W, lineHeight: 1.5 }}>{a.msg}</div>
                    <div style={{ fontSize: 10, color: WD, marginTop: 3 }}>{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}