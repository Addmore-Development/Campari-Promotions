import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { purchaseOrdersService } from '../shared/services/purchaseOrdersService'

// ─── Strict Brown/Gold/Yellow Palette ────────────────────────────────────────
const BLK  = '#020201'
const BLK1 = '#030302'
const BLK2 = '#070706'
const BLK3 = '#0A0A08'
const BLK4 = '#100F0B'
const GL   = '#C9BFA6'
const GD   = '#7A756A'
const GD2  = '#8A8474'
const GD3  = '#443F36'
const BB   = 'rgba(170,160,135,0.16)'
const BB2  = 'rgba(170,160,135,0.08)'
const W    = '#F8F8F8'
const W7   = 'rgba(248,248,248,0.70)'
const W4   = 'rgba(248,248,248,0.40)'
const W2   = 'rgba(248,248,248,0.20)'
const FD   = "'Playfair Display', Georgia, serif"
const FB   = "'DM Sans', system-ui, sans-serif"
const CORAL = '#C4614A'

function hex2rgba(hex: string, a: number) {
  const h = hex.replace('#', '')
  return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${a})`
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
function authHdr() {
  const t = localStorage.getItem('hg_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

// ─── Status-aware notification banner ────────────────────────────────────────
function StatusBanner({ status, prevStatus }: { status: string; prevStatus: string | null }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show banner when status actually changed
    if (prevStatus && prevStatus !== status) setVisible(true)
  }, [status, prevStatus])

  if (!visible) return null

  const isApproved = status === 'approved' || status === 'active'
  const isRejected = status === 'rejected' || status === 'inactive'

  return (
    <div style={{
      marginBottom: 24, padding: '14px 20px',
      background: isApproved ? 'rgba(127,121,105,0.12)' : isRejected ? 'rgba(112,106,90,0.18)' : 'rgba(201,191,166,0.08)',
      border: `1px solid ${isApproved ? 'rgba(127,121,105,0.45)' : isRejected ? 'rgba(112,106,90,0.5)' : BB}`,
      borderRadius: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16 }}>{isApproved ? '✓' : isRejected ? '✗' : 'ℹ'}</span>
        <div>
          <div style={{ fontFamily: FD, fontSize: 13, fontWeight: 700, color: isApproved ? GL : isRejected ? '#B3AA97' : W4 }}>
            {isApproved ? 'Your account has been approved!' : isRejected ? 'Your account was not approved.' : 'Account status updated.'}
          </div>
          <div style={{ fontFamily: FB, fontSize: 11, color: W4, marginTop: 2 }}>
            {isApproved
              ? 'You can now post jobs and access all platform features.'
              : isRejected
              ? 'Please contact your account manager for more information.'
              : `Status: ${status}`}
          </div>
        </div>
      </div>
      <button onClick={() => setVisible(false)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: W4, fontSize: 16, flexShrink: 0 }}>✕</button>
    </div>
  )
}

function StatCard({ label, value, sub, color, delay = 0 }: {
  label: string; value: string | number; sub?: string; color?: string; delay?: number
}) {
  const c = color || GL
  return (
    <div className="biz-page" style={{ animationDelay: `${delay}ms`, background: BLK2, border: `1px solid ${BB}`, padding: '24px 22px', position: 'relative', overflow: 'hidden', borderRadius: 3 }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${GD3}, ${c}, ${GD3})` }} />
      <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: W4, fontFamily: FD, marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: FD, fontSize: 36, fontWeight: 700, color: W, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: c, marginTop: 8, fontWeight: 700, fontFamily: FD }}>{sub}</div>}
    </div>
  )
}

interface PoSummary { total: number; committed: number; remaining: number; poCount: number }

export default function BusinessDashboard() {
  const navigate = useNavigate()
  const [session,     setSession]     = useState<any>(null)
  const [jobs,        setJobs]        = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [time,        setTime]        = useState(new Date())
  const [profile,     setProfile]     = useState<any>(null)
  const [prevStatus,  setPrevStatus]  = useState<string | null>(null)

  const [applications, setApplications] = useState<any[]>([])

  // ─── Purchase Order budget summary — replaces the old self-funded credit
  // balance. Only Admin can create/top-up a PO for this business; this page
  // just reflects the totals across all of this business's active POs.
  const [poSummary, setPoSummary] = useState<PoSummary>({ total: 0, committed: 0, remaining: 0, poCount: 0 })
  const [poLoading, setPoLoading] = useState(true)

  const loadPOSummary = useCallback(async () => {
    try {
      // Scoped server-side to the caller's own business — no manual summing
      // of other clients' purchase orders.
      const summary = await purchaseOrdersService.getMyBudget()
      setPoSummary({
        total:     summary.totalBudget,
        committed: summary.totalCommitted,
        remaining: summary.totalRemaining,
        poCount:   summary.purchaseOrders?.length || 0,
      })
    } catch { /* offline */ }
    setPoLoading(false)
  }, [])

  useEffect(() => { loadPOSummary() }, [loadPOSummary])

  // Refresh whenever a job (and its auto-created Commitment Entry) is posted
  // elsewhere in the portal — keeps the "hg_credit_updated" event name for
  // compatibility with existing dispatchers (BusinessJobs, BusinessLayout).
  useEffect(() => {
    const onUpdate = () => loadPOSummary()
    window.addEventListener('hg_credit_updated', onUpdate)
    return () => window.removeEventListener('hg_credit_updated', onUpdate)
  }, [loadPOSummary])

  // Also poll every 30s as a fallback — the admin who creates the business's
  // starter PO, tops it up, or posts a job against it is on a different
  // browser session, so no local event fires here. This mirrors the same
  // polling fallback used for profile-status updates below.
  useEffect(() => {
    const pollInterval = setInterval(() => loadPOSummary(), 30_000)
    return () => clearInterval(pollInterval)
  }, [loadPOSummary])

  // ─── Fetch fresh profile from API ──────────────────────────────────────────
  const refreshProfile = useCallback(async () => {
    const token = localStorage.getItem('hg_token')
    if (!token) return
    try {
      const res = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setProfile((prev: any) => {
          // Track status change for banner
          if (prev?.status && prev.status !== data.status) {
            setPrevStatus(prev.status)
          }
          return data
        })
      }
    } catch { /* offline */ }
  }, [])

  useEffect(() => {
    const s = localStorage.getItem('hg_session')
    if (s) {
      try { setSession(JSON.parse(s)) } catch {}
    }
    const t = setInterval(() => setTime(new Date()), 1000)
    refreshProfile()
    return () => clearInterval(t)
  }, [refreshProfile])

  // ─── React to admin broadcasts (hg_client_updates) ─────────────────────────
  useEffect(() => {
    const onStorage = (e?: StorageEvent) => {
      // Only react to our broadcast key (or cross-tab storage events)
      if (e && e.key !== 'hg_client_updates' && e.key !== null) return
      const sessionStr = localStorage.getItem('hg_session')
      if (!sessionStr) return
      try {
        const sess = JSON.parse(sessionStr)
        const userId = sess?.id || sess?.userId
        if (!userId) { refreshProfile(); return }
        const updates: any[] = JSON.parse(localStorage.getItem('hg_client_updates') || '[]')
        const myUpdate = updates.find(u => u.id === userId)
        if (myUpdate) {
          refreshProfile()
        }
      } catch { refreshProfile() }
    }

    window.addEventListener('storage', onStorage)
    // Also poll every 30s as fallback (admin and business are on different browser sessions)
    const pollInterval = setInterval(() => onStorage(), 30_000)
    return () => {
      window.removeEventListener('storage', onStorage)
      clearInterval(pollInterval)
    }
  }, [refreshProfile])

  // ─── Load jobs — API is the single source of truth. The old localStorage
  // merge (hg_admin_jobs) has been removed: it was matching any cached job
  // with no clientId onto every business, which leaked unrelated test/junk
  // jobs onto dashboards. Now that the backend filters strictly by clientId,
  // this client-side merge is unnecessary and unsafe. ─────────────────────
  const loadJobs = useCallback(async () => {
    try {
      const [jobsRes, appsRes] = await Promise.all([
        fetch(`${API}/jobs`, { headers: authHdr() as any }),
        fetch(`${API}/applications`, { headers: authHdr() as any }),
      ])
      const apiJobs = jobsRes.ok ? await jobsRes.json() : []
      setJobs(apiJobs)
      if (appsRes.ok) setApplications(await appsRes.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { loadJobs() }, [loadJobs])

  // ─── React to admin job broadcasts (hg_job_updates) ──────────────────────────
  useEffect(() => {
    const onJobStorage = (e?: StorageEvent) => {
      if (e && e.key !== 'hg_job_updates' && e.key !== null) return
      loadJobs()
    }
    window.addEventListener('storage', onJobStorage)
    return () => window.removeEventListener('storage', onJobStorage)
  }, [loadJobs])

  const displayName  = profile?.fullName || session?.companyName || session?.name || session?.email || 'My Business'
  const accountStatus = profile?.status || 'pending_review'
  const h            = time.getHours()
  const greeting     = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'

  const openJobs       = jobs.filter(j => j.status === 'OPEN').length
  const filledJobs     = jobs.filter(j => j.status === 'FILLED').length
  const totalAllocated = jobs.reduce((acc, j) => acc + (j.filledSlots || 0), 0)

  const recentJobs = [...jobs]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 6)

  const quickActions = [
    { label: 'View Jobs',     icon: '◎', path: '/business/jobs',     color: GL  },
    { label: 'Live Tracking', icon: '⊙', path: '/business/tracking', color: GD  },
    { label: 'Payroll',       icon: '◆', path: '/business/payroll',  color: GD2 },
  ]

  return (
    <div>
      {/* Header */}
      <div className="biz-page" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.36em', textTransform: 'uppercase', color: GL, marginBottom: 8, fontWeight: 700, fontFamily: FD }}>
              Business Portal
            </div>
            <h1 style={{ fontFamily: FD, fontSize: 'clamp(24px,3vw,38px)', fontWeight: 700, color: W, lineHeight: 1.1 }}>
              {greeting},<br />
              <span style={{ color: GL }}>{displayName}</span>
            </h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: FD, fontSize: 24, color: GL }}>
              {time.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ fontSize: 11, color: W4, marginTop: 4, fontFamily: FB }}>
              {time.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            {/* Live account status pill */}
            <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: accountStatus === 'approved' ? 'rgba(127,121,105,0.12)' : accountStatus === 'rejected' ? 'rgba(112,106,90,0.18)' : 'rgba(201,191,166,0.08)', border: `1px solid ${accountStatus === 'approved' ? 'rgba(127,121,105,0.4)' : accountStatus === 'rejected' ? 'rgba(112,106,90,0.45)' : BB}`, borderRadius: 3 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: accountStatus === 'approved' ? GD : accountStatus === 'rejected' ? GD2 : GL }} />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: FD, color: accountStatus === 'approved' ? GD : accountStatus === 'rejected' ? '#B3AA97' : GL }}>
                {accountStatus === 'approved' ? 'Approved' : accountStatus === 'rejected' ? 'Not Approved' : 'Pending Review'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Purchase Order Budget — set by your account manager, not self-funded ── */}
      {(() => {
        const { total, committed, remaining, poCount } = poSummary
        const isCritical = poCount > 0 && remaining <= 0
        const isLow      = poCount > 0 && !isCritical && remaining < 2000
        const stateColor = poCount === 0 ? W4 : isCritical ? CORAL : isLow ? '#D8B26A' : GL
        const stateLabel = poCount === 0 ? 'No budget yet' : isCritical ? 'Budget exhausted' : isLow ? 'Running low' : 'Healthy'
        return (
          <div style={{
            marginBottom: 28, background: BLK2, border: `1px solid ${hex2rgba(stateColor, 0.4)}`,
            borderRadius: 4, padding: '26px 30px', position: 'relative', overflow: 'hidden',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${GD3}, ${stateColor}, ${GD3})` }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: W4, fontFamily: FD, fontWeight: 700 }}>Purchase Order Budget</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 9px', borderRadius: 20, background: hex2rgba(stateColor, 0.12), border: `1px solid ${hex2rgba(stateColor, 0.4)}` }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: stateColor }} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: stateColor, fontFamily: FD, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{stateLabel}</span>
                </span>
              </div>
              <div style={{ fontFamily: FD, fontSize: 44, fontWeight: 700, color: W, lineHeight: 1 }}>
                {poLoading ? '—' : `R ${remaining.toLocaleString('en-ZA')}`}
              </div>
              <p style={{ fontSize: 12, color: W4, marginTop: 8, fontFamily: FB }}>
                {poCount === 0
                  ? 'Your account manager hasn\u2019t set up a purchase order yet. Contact them to get a budget allocated so you can post jobs.'
                  : `Remaining across ${poCount} purchase order${poCount > 1 ? 's' : ''} \u00b7 R${total.toLocaleString('en-ZA')} total \u00b7 R${committed.toLocaleString('en-ZA')} committed to jobs.`}
              </p>
            </div>
            <button onClick={() => navigate('/business/payroll')}
              style={{ padding: '13px 26px', background: `linear-gradient(135deg,${GL},${GD})`, border: 'none', color: BLK, fontFamily: FD, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer', borderRadius: 3, whiteSpace: 'nowrap', flexShrink: 0 }}>
              View Budget Breakdown →
            </button>
          </div>
        )
      })()}

      {/* Status change notification banner */}
      <StatusBanner status={accountStatus} prevStatus={prevStatus} />

      {/* Pending approval notice */}
      {accountStatus !== 'approved' && accountStatus !== 'active' && (
        <div style={{ marginBottom: 24, padding: '16px 20px', background: 'rgba(170,160,135,0.06)', border: `1px solid ${BB}`, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: GL, animation: 'pulse 2s ease-in-out infinite', flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: FD, fontSize: 13, fontWeight: 700, color: GL }}>Account pending admin approval</div>
            <div style={{ fontFamily: FB, fontSize: 11, color: W4, marginTop: 2 }}>
              Your account is under review. You'll be notified here as soon as it's approved.
            </div>
          </div>
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: BB, marginBottom: 28 }}>
        <StatCard label="Total Jobs"       value={jobs.length}    sub="All campaigns"       color={GL}  delay={0}   />
        <StatCard label="Open Jobs"        value={openJobs}       sub="Accepting promoters" color={GL}  delay={60}  />
        <StatCard label="Filled Jobs"      value={filledJobs}     sub="Fully staffed"       color={GD}  delay={120} />
        <StatCard label="Promoters Placed" value={totalAllocated} sub="Across all jobs"     color={GD2} delay={180} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: BB }}>
        {/* Quick Actions */}
        <div style={{ background: BLK2, padding: 24 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: GL, fontWeight: 700, fontFamily: FD, marginBottom: 18 }}>
            Quick Actions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {quickActions.map(a => (
              <button key={a.path} onClick={() => navigate(a.path)}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: BLK3, border: `1px solid ${BB}`, cursor: 'pointer', transition: 'all 0.2s', borderRadius: 2, width: '100%' }}
                onMouseEnter={e => {
                  ;(e.currentTarget as HTMLElement).style.background  = BLK4
                  ;(e.currentTarget as HTMLElement).style.borderColor = hex2rgba(a.color, 0.4)
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLElement).style.background  = BLK3
                  ;(e.currentTarget as HTMLElement).style.borderColor = BB
                }}>
                <span style={{ fontSize: 16, color: a.color }}>{a.icon}</span>
                <span style={{ fontFamily: FD, fontSize: 13, fontWeight: 700, color: W }}>{a.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: 14, color: a.color }}>→</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Jobs */}
        <div style={{ background: BLK2, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: GL, fontWeight: 700, fontFamily: FD }}>
              Recent Jobs
            </div>
            <button onClick={() => navigate('/business/jobs')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FD, fontSize: 11, color: W4, transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = GL)}
              onMouseLeave={e => (e.currentTarget.style.color = W4)}>
              View all →
            </button>
          </div>

          {loading ? (
            <div style={{ color: W4, fontFamily: FD, fontSize: 12 }}>Loading…</div>
          ) : recentJobs.length === 0 ? (
            <div style={{ color: W4, fontFamily: FD, fontSize: 13 }}>
              No jobs yet. Contact your account manager to get started.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentJobs.map(job => {
                const statusColor = job.status === 'OPEN' ? GL : job.status === 'FILLED' ? GD : W4
                return (
                  <div key={job.id} onClick={() => navigate('/business/jobs')}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: BLK3, border: `1px solid ${BB}`, cursor: 'pointer', transition: 'background 0.18s', borderRadius: 2 }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = BLK4}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = BLK3}>
                    <div>
                      <div style={{ fontFamily: FD, fontSize: 12, fontWeight: 700, color: W, marginBottom: 2 }}>{job.title}</div>
                      <div style={{ fontSize: 10, color: W4, fontFamily: FB }}>{job.filledSlots}/{job.totalSlots} · R{job.hourlyRate}/hr</div>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: statusColor, background: hex2rgba(statusColor, 0.1), border: `1px solid ${hex2rgba(statusColor, 0.35)}`, padding: '2px 8px', borderRadius: 2, fontFamily: FD, letterSpacing: '0.1em', flexShrink: 0 }}>
                      {job.status}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── New Applications from Promoters ── */}
        {applications.length > 0 && (() => {
          // Group applications by job, only show PENDING/STANDBY (new ones)
          const newApps = applications.filter(a =>
            a.status === 'PENDING' || a.status === 'pending' ||
            a.status === 'STANDBY' || a.status === 'standby'
          )
          if (newApps.length === 0) return null
          return (
            <div style={{ marginTop: 24, background: BLK2, border: `1px solid ${BB}`, borderRadius: 3 }}>
              <div style={{ padding: '18px 24px', borderBottom: `1px solid ${BB}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: 9, letterSpacing: '0.26em', textTransform: 'uppercase', color: GL, fontWeight: 700, fontFamily: FD }}>New Applications</span>
                  <span style={{ marginLeft: 10, fontSize: 11, color: W4, fontFamily: FB }}>{newApps.length} promoter{newApps.length !== 1 ? 's' : ''} expressed interest</span>
                </div>
                <button onClick={() => navigate('/business/jobs')}
                  style={{ background: 'none', border: 'none', color: GL, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: FB }}>
                  Manage in Jobs →
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 1, background: BB }}>
                {newApps.slice(0, 6).map(app => {
                  const job = jobs.find(j => j.id === app.jobId)
                  return (
                    <div key={app.id} style={{ background: BLK2, padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: `rgba(201,191,166,0.1)`, border: `1px solid ${BB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>👤</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontFamily: FD, fontSize: 13, fontWeight: 700, color: W, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {app.promoter?.fullName || app.promoter?.name || 'Promoter'}
                          </div>
                          <div style={{ fontSize: 10, color: GL, fontFamily: FB }}>⏳ Interested</div>
                        </div>
                      </div>
                      {job && (
                        <div style={{ fontSize: 11, color: W4, fontFamily: FB, padding: '8px 10px', background: 'rgba(201,191,166,0.04)', border: `1px solid ${BB}`, borderRadius: 2 }}>
                          <div style={{ color: W, fontWeight: 600, marginBottom: 2 }}>{job.title}</div>
                          <div>{job.venue} · {job.startTime}–{job.endTime}</div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}