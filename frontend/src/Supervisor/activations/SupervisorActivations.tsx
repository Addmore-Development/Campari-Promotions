// Supervisor/activations/SupervisorActivations.tsx
// Read-only, admin-style browser of EVERY campaign/job across every client —
// gives supervisors full visibility ("click on all campaigns and access them")
// even though they can only edit/file reports on the ones they're assigned to.
import React, { useEffect, useMemo, useState } from 'react'
import { jobsService } from '../../shared/services/jobsService'
import { injectAdminMobileStyles } from '../../Admin/adminMobileStyles'

const G    = '#8F8A7C'
const GL   = '#C9BFA6'
const G2   = '#8A8474'
const B    = '#050504'
const BC   = '#080807'
const D2   = '#0D0D0A'
const BB   = 'rgba(170,160,135,0.14)'
const W    = '#F8F8F8'
const WM   = 'rgba(248,248,248,0.65)'
const WD   = 'rgba(248,248,248,0.28)'
const FD   = "'Playfair Display', Georgia, serif"
const FB   = "'DM Sans', system-ui, sans-serif"
const TEAL  = '#4AABB8'
const CORAL = '#C4614A'
const GREEN = '#4ade80'

const BACKEND = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'

function authUserId(): string | null {
  try { return JSON.parse(atob((localStorage.getItem('hg_token') || '').split('.')[1] || '')).id || null } catch { return null }
}

function avatarUrl(p?: string | null): string | null {
  if (!p) return null
  return p.startsWith('http') ? p : BACKEND + p
}

const inp: React.CSSProperties = {
  background: 'rgba(248,248,248,0.05)', border: `1px solid ${BB}`, padding: '9px 14px',
  color: W, fontFamily: FB, fontSize: 13, outline: 'none', borderRadius: 2,
}

function statusColor(s: string) {
  return s === 'OPEN' ? GL : s === 'FILLED' ? G : s === 'IN_PROGRESS' ? TEAL : s === 'CANCELLED' ? CORAL : WD
}

function hexA(hex: string, a: number) {
  const h = hex.replace('#', '')
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`
}

interface Props { onNavigate: (view: string, jobId?: string) => void }

export const SupervisorActivations: React.FC<Props> = ({ onNavigate }) => {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusF, setStatusF] = useState('all')
  const [selected, setSelected] = useState<any>(null)
  const myId = useMemo(authUserId, [])

  // ── Team management: allocate promoters + approve/decline applications
  //    for campaigns this supervisor owns ─────────────────────────────────
  const [applications,   setApplications]   = useState<any[]>([])
  const [eligible,       setEligible]       = useState<any[]>([])
  const [teamLoading,    setTeamLoading]    = useState(false)
  const [promoSearch,    setPromoSearch]    = useState('')
  const [toAllocate,     setToAllocate]     = useState<Set<string>>(new Set())
  const [allocating,     setAllocating]     = useState(false)
  const [appBusyId,      setAppBusyId]      = useState<string | null>(null)
  const [teamMsg,        setTeamMsg]        = useState('')

  useEffect(() => {
    injectAdminMobileStyles()
    jobsService.getAllActivations().then(j => { setJobs(j); setLoading(false) })
  }, [])

  const isMine = (job: any) => job?.supervisorId && job.supervisorId === myId

  const loadTeamData = async (job: any) => {
    if (!isMine(job)) return
    setTeamLoading(true)
    try {
      const [apps, elig] = await Promise.all([
        jobsService.getApplicationsForJob(job.id),
        jobsService.getEligiblePromoters(job.id),
      ])
      setApplications(apps)
      setEligible(elig)
    } catch (e) { console.error('[SupervisorActivations] loadTeamData error:', e) }
    setTeamLoading(false)
  }

  const refreshSelected = async () => {
    const jobs2 = await jobsService.getAllActivations()
    setJobs(jobs2)
    const updated = jobs2.find((j: any) => j.id === selected?.id)
    if (updated) setSelected(updated)
    if (updated) await loadTeamData(updated)
  }

  const handleApplicationAction = async (appId: string, status: 'ALLOCATED' | 'DECLINED') => {
    setAppBusyId(appId)
    try {
      await jobsService.updateApplicationStatus(appId, status)
      setTeamMsg(status === 'ALLOCATED' ? 'Promoter approved and allocated' : 'Application declined')
      await refreshSelected()
      setTimeout(() => setTeamMsg(''), 2500)
    } catch (e: any) {
      setTeamMsg(e?.message || 'Action failed')
    }
    setAppBusyId(null)
  }

  const handleAllocatePromoters = async () => {
    if (!selected || toAllocate.size === 0) return
    setAllocating(true)
    try {
      await jobsService.bulkAllocate(selected.id, Array.from(toAllocate))
      setTeamMsg(`${toAllocate.size} promoter${toAllocate.size !== 1 ? 's' : ''} allocated`)
      setToAllocate(new Set())
      await refreshSelected()
      setTimeout(() => setTeamMsg(''), 2500)
    } catch (e: any) {
      setTeamMsg(e?.message || 'Allocation failed')
    }
    setAllocating(false)
  }

  const toggleAllocate = (id: string) => setToAllocate(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const filtered = jobs.filter(j =>
    (statusF === 'all' || j.status === statusF) &&
    (!search || j.title?.toLowerCase().includes(search.toLowerCase()) || j.client?.toLowerCase().includes(search.toLowerCase()))
  )

  const promotersOf = (job: any): any[] => {
    if (job?.shifts?.length) return job.shifts.map((s: any) => s.promoter).filter(Boolean)
    if (job?.applications?.length) return job.applications.map((a: any) => a.promoter).filter(Boolean)
    return []
  }

  return (
    <div className="hg-page" style={{ padding: '32px 36px 80px' }}>
      {/* Header */}
      <div className="hg-page-header">
        <div>
          <div style={{ fontSize: 9, letterSpacing: '0.38em', textTransform: 'uppercase', color: GL, marginBottom: 8, fontWeight: 700 }}>Operations</div>
          <h1 style={{ fontFamily: FD, fontSize: 26, fontWeight: 700, color: W }}>All Campaigns</h1>
          <p style={{ fontSize: 12.5, color: WM, marginTop: 4 }}>
            {jobs.length} total across every client · click any campaign to see who's on it
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="hg-stat-grid hg-stat-grid-5" style={{ background: BB, marginBottom: 24 }}>
        {[
          { label: 'Total',       value: jobs.length, color: GL },
          { label: 'Open',        value: jobs.filter(j => j.status === 'OPEN').length, color: GL },
          { label: 'Filled',      value: jobs.filter(j => j.status === 'FILLED').length, color: G },
          { label: 'In Progress', value: jobs.filter(j => j.status === 'IN_PROGRESS').length, color: TEAL },
          { label: 'Cancelled',   value: jobs.filter(j => j.status === 'CANCELLED').length, color: CORAL },
        ].map(s => (
          <div key={s.label} style={{ background: D2, padding: '16px 18px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${s.color},${s.color}44)` }} />
            <div className="hg-stat-val" style={{ fontFamily: FD, fontSize: 24, fontWeight: 700, color: W }}>{s.value}</div>
            <div style={{ fontSize: 9, color: WM, marginTop: 4, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="hg-filter-row" style={{ marginBottom: 18 }}>
        <input placeholder="Search campaigns or client…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inp, maxWidth: 240 }}
          onFocus={e => (e.currentTarget.style.borderColor = GL)} onBlur={e => (e.currentTarget.style.borderColor = BB)} />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {['all', 'OPEN', 'FILLED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(s => (
            <button key={s} onClick={() => setStatusF(s)}
              style={{ padding: '6px 10px', border: `1px solid ${statusF === s ? GL : BB}`, background: statusF === s ? 'rgba(201,191,166,0.12)' : 'transparent', color: statusF === s ? GL : WM, fontFamily: FB, fontSize: 9, cursor: 'pointer', borderRadius: 2, whiteSpace: 'nowrap' }}>
              {s === 'all' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="hg-table-wrap" style={{ background: D2, border: `1px solid ${BB}`, borderRadius: 2, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: WD }}>Loading campaigns…</div>
        ) : (
          <table className="hg-table-cards" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BB}` }}>
                {['Campaign / Client', 'Venue', 'Date', 'Promoters', 'Supervisor', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: WD }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((job, i) => {
                const proms = promotersOf(job)
                const isMine = job.supervisorId && job.supervisorId === myId
                return (
                  <tr key={job.id}
                    style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${BB}` : 'none', cursor: 'pointer' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    onClick={() => { setSelected(job); setApplications([]); setEligible([]); setToAllocate(new Set()); setTeamMsg(''); loadTeamData(job) }}>
                    <td data-label="Campaign" style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: W }}>{job.title}</div>
                      <div style={{ fontSize: 11, color: WM }}>{job.client}</div>
                    </td>
                    <td data-label="Venue" className="hg-col-hide-sm" style={{ padding: '12px 14px', fontSize: 12, color: W }}>{job.venue || '—'}</td>
                    <td data-label="Date" className="hg-col-hide-md" style={{ padding: '12px 14px', fontSize: 12, color: WM, whiteSpace: 'nowrap' }}>
                      {job.date ? new Date(job.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                    </td>
                    <td data-label="Promoters" style={{ padding: '12px 14px', fontSize: 12, color: W }}>{proms.length}/{job.totalSlots}</td>
                    <td data-label="Supervisor" className="hg-col-hide-sm" style={{ padding: '12px 14px', fontSize: 12, color: isMine ? GL : WM }}>
                      {job.supervisor?.fullName || '—'}{isMine && ' (you)'}
                    </td>
                    <td data-label="Status" style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: statusColor(job.status), background: `${statusColor(job.status)}18`, padding: '3px 9px', borderRadius: 2 }}>{job.status}</span>
                    </td>
                    <td data-label="Actions" style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => onNavigate('activation-report', job.id)}
                        style={{ fontSize: 11, color: GL, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                        File Report
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && <div style={{ padding: 48, textAlign: 'center', color: WD, fontSize: 13 }}>No campaigns match your filters.</div>}
      </div>

      {/* View modal */}
      {selected && (
        <div className="hg-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 16 }}
          onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="hg-modal-box" style={{ background: BC, border: `1px solid ${BB}`, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', position: 'relative', borderRadius: 3 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${G2},${GL},${G2})` }} />
            <button onClick={() => setSelected(null)} style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', cursor: 'pointer', color: WM, fontSize: 18 }}>✕</button>
            <div style={{ padding: '32px 28px 28px' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: GL, marginBottom: 8, fontWeight: 700 }}>Campaign</div>
              <h2 style={{ fontFamily: FD, fontSize: 22, fontWeight: 700, color: W, marginBottom: 4 }}>{selected.title}</h2>
              <p style={{ fontSize: 13, color: WM, marginBottom: 18 }}>{selected.client} · {selected.venue}</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
                {[
                  { label: 'Status', value: selected.status },
                  { label: 'Date', value: selected.date ? new Date(selected.date).toLocaleDateString('en-ZA') : '—' },
                  { label: 'Time', value: `${selected.startTime || '—'} – ${selected.endTime || '—'}` },
                  { label: 'Slots', value: `${promotersOf(selected).length}/${selected.totalSlots}` },
                  { label: 'Address', value: selected.address || '—' },
                  { label: 'Assigned Supervisor', value: selected.supervisor?.fullName || 'Unassigned' },
                ].map(f => (
                  <div key={f.label}>
                    <p style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: WD, marginBottom: 4 }}>{f.label}</p>
                    <p style={{ fontSize: 13, color: W }}>{f.value}</p>
                  </div>
                ))}
              </div>

              {selected.activationReport && (
                <div style={{ marginBottom: 20, padding: '10px 14px', borderRadius: 3, background: hexA(selected.activationReport.status === 'submitted' ? GREEN : GL, 0.1), border: `1px solid ${hexA(selected.activationReport.status === 'submitted' ? GREEN : GL, 0.35)}`, fontSize: 12, color: selected.activationReport.status === 'submitted' ? GREEN : GL, fontWeight: 700 }}>
                  {selected.activationReport.status === 'submitted' ? '✓ Activation report submitted' : '◐ Draft report saved'}
                </div>
              )}

              <div style={{ marginBottom: 10, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: GL, fontWeight: 700 }}>Promoters On This Campaign</div>
              {promotersOf(selected).length === 0 ? (
                <p style={{ fontSize: 12.5, color: WD, marginBottom: 22 }}>No promoters allocated yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
                  {promotersOf(selected).map((p: any) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${BB}`, borderRadius: 3 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: `linear-gradient(135deg,${G2},${GL})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: B }}>
                        {avatarUrl(p.headshotUrl || p.profilePhotoUrl)
                          ? <img src={avatarUrl(p.headshotUrl || p.profilePhotoUrl) as string} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : (p.fullName || '?').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 12.5, color: W, fontWeight: 600 }}>{p.fullName}</p>
                        <p style={{ fontSize: 11, color: WD }}>{p.phone || p.email || ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={() => onNavigate('activation-report', selected.id)}
                style={{ width: '100%', padding: '12px', borderRadius: 3, border: 'none', background: `linear-gradient(135deg,${GL},${G})`, color: B, fontFamily: FD, fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: isMine(selected) ? 24 : 0 }}>
                {selected.activationReport?.status === 'submitted' ? 'View / Update Report' : 'File Report'}
              </button>

              {/* ── Team management — only for campaigns this supervisor owns ── */}
              {isMine(selected) && (
                <div style={{ borderTop: `1px solid ${BB}`, paddingTop: 20 }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: GL, fontWeight: 700, marginBottom: 12 }}>Manage Your Team</div>

                  {teamMsg && (
                    <div style={{ marginBottom: 14, padding: '9px 12px', background: hexA(GREEN, 0.1), border: `1px solid ${hexA(GREEN, 0.35)}`, borderRadius: 3, fontSize: 11.5, color: GREEN, fontWeight: 600 }}>
                      ✓ {teamMsg}
                    </div>
                  )}

                  {teamLoading ? (
                    <div style={{ padding: '16px 0', color: WD, fontSize: 12, textAlign: 'center' }}>Loading applications…</div>
                  ) : (
                    <>
                      {/* Pending applications needing approval */}
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: W, marginBottom: 8 }}>
                          Pending Applications {applications.filter(a => a.status === 'STANDBY').length > 0 && `(${applications.filter(a => a.status === 'STANDBY').length})`}
                        </div>
                        {applications.filter(a => a.status === 'STANDBY').length === 0 ? (
                          <p style={{ fontSize: 11.5, color: WD }}>No pending applications right now.</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {applications.filter(a => a.status === 'STANDBY').map(a => (
                              <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${BB}`, borderRadius: 3, flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                  <div style={{ width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: `linear-gradient(135deg,${G2},${GL})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: B }}>
                                    {avatarUrl(a.promoter?.headshotUrl || a.promoter?.profilePhotoUrl)
                                      ? <img src={avatarUrl(a.promoter?.headshotUrl || a.promoter?.profilePhotoUrl) as string} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      : (a.promoter?.fullName || '?').charAt(0).toUpperCase()}
                                  </div>
                                  <span style={{ fontSize: 12, color: W }}>{a.promoter?.fullName || 'Promoter'}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button disabled={appBusyId === a.id} onClick={() => handleApplicationAction(a.id, 'ALLOCATED')}
                                    style={{ padding: '5px 12px', background: hexA(GREEN, 0.12), border: `1px solid ${hexA(GREEN, 0.4)}`, color: GREEN, fontSize: 10, fontWeight: 700, borderRadius: 3, cursor: appBusyId === a.id ? 'wait' : 'pointer' }}>
                                    ✓ Approve
                                  </button>
                                  <button disabled={appBusyId === a.id} onClick={() => handleApplicationAction(a.id, 'DECLINED')}
                                    style={{ padding: '5px 12px', background: hexA(CORAL, 0.12), border: `1px solid ${hexA(CORAL, 0.4)}`, color: CORAL, fontSize: 10, fontWeight: 700, borderRadius: 3, cursor: appBusyId === a.id ? 'wait' : 'pointer' }}>
                                    ✕ Decline
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Allocate additional promoters directly */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: W, marginBottom: 8 }}>Allocate Promoters</div>
                        <input placeholder="Search eligible promoters…" value={promoSearch} onChange={e => setPromoSearch(e.target.value)}
                          style={{ ...inp, width: '100%', marginBottom: 8, boxSizing: 'border-box' }}
                          onFocus={e => (e.currentTarget.style.borderColor = GL)} onBlur={e => (e.currentTarget.style.borderColor = BB)} />
                        <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                          {eligible.filter(p => !promoSearch || p.fullName?.toLowerCase().includes(promoSearch.toLowerCase())).slice(0, 30).map(p => {
                            const checked = toAllocate.has(p.id)
                            return (
                              <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: checked ? hexA(GL, 0.08) : 'rgba(255,255,255,0.02)', border: `1px solid ${checked ? hexA(GL, 0.4) : BB}`, borderRadius: 3, cursor: 'pointer' }}>
                                <input type="checkbox" checked={checked} onChange={() => toggleAllocate(p.id)} />
                                <span style={{ fontSize: 12, color: W, flex: 1 }}>{p.fullName}</span>
                                <span style={{ fontSize: 10, color: WD }}>{p.city || ''}</span>
                              </label>
                            )
                          })}
                          {eligible.length === 0 && <p style={{ fontSize: 11.5, color: WD }}>No eligible promoters found.</p>}
                        </div>
                        <button disabled={toAllocate.size === 0 || allocating} onClick={handleAllocatePromoters}
                          style={{ width: '100%', padding: '10px', borderRadius: 3, border: 'none', background: toAllocate.size === 0 ? BB : `linear-gradient(135deg,${GL},${G})`, color: toAllocate.size === 0 ? WD : B, fontFamily: FD, fontWeight: 700, fontSize: 12, cursor: toAllocate.size === 0 || allocating ? 'not-allowed' : 'pointer' }}>
                          {allocating ? 'Allocating…' : toAllocate.size > 0 ? `Allocate ${toAllocate.size} Promoter${toAllocate.size !== 1 ? 's' : ''}` : 'Select promoters to allocate'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SupervisorActivations