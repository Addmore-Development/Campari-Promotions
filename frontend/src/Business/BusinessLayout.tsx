// Business/BusinessLayout.tsx
// Business-portal shell — sidebar (HONEY GROUP wordmark, nav, account footer)
// + top bar (breadcrumb, credit pill, View Site, Active status).
// Wrap your /business/* routes with this so every business page gets the
// sidebar automatically. See usage notes at the bottom of this file.

import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { purchaseOrdersService } from '../shared/services/purchaseOrdersService'
import { useAuth } from '../shared/hooks/useAuth'
import { FloatingChat } from '../Admin/ChatSystem'

// ─── Palette (matches the business pages) ────────────────────────────────────
const BLK  = '#020201'
const BLK1 = '#030302'
const BLK2 = '#070706'
const BLK3 = '#0A0A08'
const GL   = '#C9BFA6'
const GD   = '#7A756A'
const GD3  = '#443F36'
const BB   = 'rgba(170,160,135,0.16)'
const W    = '#F8F8F8'
const W7   = 'rgba(248,248,248,0.70)'
const W4   = 'rgba(248,248,248,0.40)'
const FD   = "'Playfair Display', Georgia, serif"
const FB   = "'DM Sans', system-ui, sans-serif"

function hex2rgba(hex: string, a: number) {
  const h = hex.replace('#', '')
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`
}

// ─── Nav config ───────────────────────────────────────────────────────────────
interface NavItem { id: string; label: string; icon: string; path: string }

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview',      icon: '◆', path: '/business' },
  { id: 'jobs',      label: 'Jobs',          icon: '◎', path: '/business/jobs' },
  { id: 'tracking',  label: 'Tracking',      icon: '⊙', path: '/business/tracking' },
  { id: 'payroll',   label: 'Payroll',       icon: '◆', path: '/business/payroll' },
  { id: 'reports',   label: 'Reports',       icon: '?', path: '/business/reports' },
]

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function BusinessSidebar({ activeId, onNavigate, businessName, onLogout, onViewSite, onOpenMessages }: {
  activeId:       string
  onNavigate:     (path: string) => void
  businessName:   string
  onLogout:       () => void
  onViewSite:     () => void
  onOpenMessages: () => void
}) {
  return (
    <aside style={{
      width: 220, flexShrink: 0, background: BLK3, borderRight: `1px solid ${BB}`,
      display: 'flex', flexDirection: 'column', height: '100%',
    }}>
      {/* Wordmark */}
      <div style={{ padding: '22px 20px 18px', borderBottom: `1px solid ${BB}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: FD, fontSize: 15, fontWeight: 700, color: W, letterSpacing: '0.02em' }}>
          HONEY <span style={{ color: GL }}>GROUP</span>
        </div>
        <span style={{ color: W4, fontSize: 12 }}>◄</span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '18px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {NAV_ITEMS.map(item => {
          const isActive = item.id === activeId
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 12px', border: 'none', borderRadius: 3, textAlign: 'left',
                cursor: 'pointer', position: 'relative',
                background: isActive ? hex2rgba(GL, 0.1) : 'transparent',
                color: isActive ? GL : W7,
                fontFamily: FB, fontSize: 13, fontWeight: isActive ? 700 : 500,
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = hex2rgba(GL, 0.05) }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {isActive && (
                <span style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 2, background: GL, borderRadius: '0 2px 2px 0' }} />
              )}
              <span style={{ fontSize: 13, width: 16, textAlign: 'center', color: isActive ? GL : GD }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          )
        })}

        <div style={{ height: 1, background: BB, margin: '10px 4px' }} />

        <button
          onClick={onOpenMessages}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '10px 12px', border: 'none', borderRadius: 3, textAlign: 'left',
            cursor: 'pointer', background: 'transparent', color: W7,
            fontFamily: FB, fontSize: 13, fontWeight: 500,
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = hex2rgba(GL, 0.05)}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          <span style={{ fontSize: 13, width: 16, textAlign: 'center', color: GD }}>✉</span>
          <span>Messages</span>
        </button>

        <button
          onClick={onViewSite}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '10px 12px', border: 'none', borderRadius: 3, textAlign: 'left',
            cursor: 'pointer', background: 'transparent', color: W4,
            fontFamily: FB, fontSize: 13, fontWeight: 500,
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = GL}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = W4}
        >
          <span style={{ fontSize: 13, width: 16, textAlign: 'center' }}>✦</span>
          <span>View Site</span>
        </button>
      </nav>

      {/* Account footer */}
      <div style={{ padding: '16px 20px', borderTop: `1px solid ${BB}` }}>
        <div style={{ fontFamily: FD, fontSize: 13, fontWeight: 700, color: W, marginBottom: 2 }}>{businessName}</div>
        <div style={{ fontSize: 10, color: W4, fontFamily: FB, marginBottom: 12 }}>
          Business Account · <span style={{ color: GL, cursor: 'pointer' }}>View Profile →</span>
        </div>
        <button
          onClick={onLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
            cursor: 'pointer', color: W4, fontFamily: FB, fontSize: 12, padding: 0,
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = GL}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = W4}
        >
          <span>⏻</span> Log Out
        </button>
      </div>
    </aside>
  )
}

// ─── Top bar ──────────────────────────────────────────────────────────────────
function BusinessTopBar({ breadcrumb, credit, accountStatus }: {
  breadcrumb:    string
  credit:        number | null
  accountStatus: string
}) {
  const isApproved = accountStatus === 'approved' || accountStatus === 'active'

  return (
    <header style={{
      height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', background: BLK1, borderBottom: `1px solid ${BB}`,
    }}>
      <div style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: GL, fontWeight: 700, fontFamily: FD }}>
        {breadcrumb}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Credit pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
          background: hex2rgba(GL, 0.06), border: `1px solid ${BB}`, borderRadius: 20,
        }}>
          <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: W4, fontFamily: FD, fontWeight: 700 }}>Credit</span>
          <span style={{ fontFamily: FD, fontSize: 12, fontWeight: 700, color: GL }}>
            {credit === null ? '—' : `R${credit.toLocaleString('en-ZA')}`}
          </span>
        </div>

        {/* View site */}
        <button style={{
          padding: '6px 14px', background: 'transparent', border: `1px solid ${BB}`, color: W7,
          fontFamily: FD, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
          cursor: 'pointer', borderRadius: 3,
        }}>
          View Site
        </button>

        {/* Status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
          background: isApproved ? 'rgba(127,121,105,0.12)' : 'rgba(201,191,166,0.08)',
          border: `1px solid ${isApproved ? 'rgba(127,121,105,0.4)' : BB}`, borderRadius: 3,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: isApproved ? GD : GL }} />
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: FD, color: isApproved ? GD : GL }}>
            {isApproved ? 'Active' : 'Pending'}
          </span>
        </div>
      </div>
    </header>
  )
}

// ─── Main layout ──────────────────────────────────────────────────────────────
export default function BusinessLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const [businessName, setBusinessName] = useState('My Business')
  const [accountStatus, setAccountStatus] = useState('pending_review')
  const [credit, setCredit] = useState<number | null>(null)

  const loadCredit = useCallback(async () => {
    try {
      const summary = await purchaseOrdersService.getMyBudget()
      setCredit(summary.totalRemaining ?? 0)
    } catch { /* offline */ }
  }, [])

  useEffect(() => {
    loadCredit()
    const onUpdate = () => loadCredit()
    window.addEventListener('hg_credit_updated', onUpdate)
    const poll = setInterval(loadCredit, 30_000)
    return () => { window.removeEventListener('hg_credit_updated', onUpdate); clearInterval(poll) }
  }, [loadCredit])

  useEffect(() => {
    const s = localStorage.getItem('hg_session')
    if (s) {
      try {
        const parsed = JSON.parse(s)
        setBusinessName(parsed.companyName || parsed.name || parsed.email || 'My Business')
        if (parsed.status) setAccountStatus(parsed.status)
      } catch {}
    }
  }, [])

  // Active nav = the longest matching path prefix (so /business/jobs/123 still highlights "Jobs")
  const activeItem = [...NAV_ITEMS]
    .sort((a, b) => b.path.length - a.path.length)
    .find(item => location.pathname === item.path || location.pathname.startsWith(item.path + '/'))
    || NAV_ITEMS[0]

  const handleLogout = () => { logout(); navigate('/login') }
  const handleViewSite = () => window.open('/', '_blank')
  // FloatingChat manages its own open/closed state internally — the sidebar
  // "Messages" button just asks it to open via a custom DOM event.
  const handleOpenMessages = () => window.dispatchEvent(new Event('hg_open_chat'))

  return (
    <div style={{
      minHeight: '100vh', height: '100vh', background: BLK,
      display: 'flex', color: W, fontFamily: FB, overflow: 'hidden',
    }}>
      <BusinessSidebar
        activeId={activeItem.id}
        onNavigate={navigate}
        businessName={businessName}
        onLogout={handleLogout}
        onViewSite={handleViewSite}
        onOpenMessages={handleOpenMessages}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <BusinessTopBar
          breadcrumb={activeItem.label}
          credit={credit}
          accountStatus={accountStatus}
        />
        <main style={{
          flex: 1, overflowY: 'auto', padding: '32px 36px',
          background: [
            'radial-gradient(ellipse at 15% 0%, rgba(201,191,166,0.04) 0%, transparent 55%)',
            'radial-gradient(ellipse at 85% 100%, rgba(201,191,166,0.03) 0%, transparent 50%)',
          ].join(','),
        }}>
          <Outlet />
        </main>
      </div>

      {}
      <FloatingChat />
    </div>
  )
}