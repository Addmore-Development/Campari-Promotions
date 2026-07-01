import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

// ─── Palette ──────────────────────────────────────────────────────────────────
const BLK  = '#050402'
const BLK1 = '#0A0804'
const BLK2 = '#100C05'
const BLK3 = '#181206'
const GL   = '#E8A820'
const GD   = '#C07818'
const GD2  = '#8B5A1A'
const GD3  = '#6B3F10'
const BB   = 'rgba(212,136,10,0.16)'
const BB2  = 'rgba(212,136,10,0.08)'
const W    = '#FAF3E8'
const W8   = 'rgba(250,243,232,0.85)'
const W7   = 'rgba(250,243,232,0.70)'
const W4   = 'rgba(250,243,232,0.40)'
const W2   = 'rgba(250,243,232,0.20)'
const FD   = "'Playfair Display', Georgia, serif"
const FB   = "'DM Sans', system-ui, sans-serif"
const TEAL  = '#4AABB8'
const CORAL = '#C4614A'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
function authHdr(): Record<string, string> {
  const t = localStorage.getItem('hg_token')
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}
function hex2rgba(hex: string, a: number) {
  const h = hex.replace('#', '')
  return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${a})`
}
function fmtDate(d: string) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return d }
}

interface ApiJob {
  id: string; title: string; client: string; venue: string; address: string
  date: string; startTime: string; endTime: string; hourlyRate: number
  totalSlots: number; filledSlots: number; status: string; filters?: any
  applications?: any[]
}

interface Promoter {
  id: string
  fullName: string
  email: string
  phone?: string
  city?: string
  province?: string
  gender?: string
  height?: number
  clothingSize?: string
  shoeSize?: string
  reliabilityScore?: number
  profilePhotoUrl?: string
  headshotUrl?: string
  fullBodyPhotoUrl?: string
  cvUrl?: string
  onboardingStatus?: string
  status?: string
  createdAt?: string
  appStatus?: string | null
  appId?: string
}

// ─── Full Promoter Profile Modal ──────────────────────────────────────────────
function PromoterProfileModal({ promoter, onClose, isSelected, onToggleSelect, canSelect }: {
  promoter: Promoter
  onClose: () => void
  isSelected: boolean
  onToggleSelect: () => void
  canSelect: boolean
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: BLK2, border: `1px solid ${BB}`, width: '100%', maxWidth: 580, maxHeight: '92vh', overflowY: 'auto', position: 'relative', borderRadius: 4 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${GD3}, ${GL}, ${GD3})` }} />
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 18, background: 'none', border: 'none', cursor: 'pointer', color: W4, fontSize: 20, lineHeight: 1 }}>✕</button>

        <div style={{ padding: '36px 36px 0' }}>
          <div style={{ fontSize: 9, letterSpacing: '0.36em', textTransform: 'uppercase', color: GL, fontWeight: 700, fontFamily: FD, marginBottom: 20 }}>Promoter Profile</div>

          <div style={{ display: 'flex', gap: 24, marginBottom: 28, alignItems: 'flex-start' }}>
            <div style={{ flexShrink: 0 }}>
              {promoter.headshotUrl || promoter.profilePhotoUrl ? (
                <img src={promoter.headshotUrl || promoter.profilePhotoUrl} alt={promoter.fullName}
                  style={{ width: 110, height: 110, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: `3px solid ${GL}` }} />
              ) : (
                <div style={{ width: 110, height: 110, borderRadius: '50%', background: hex2rgba(GL, 0.12), border: `3px solid ${BB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: GL, fontFamily: FD, fontWeight: 700 }}>
                  {promoter.fullName.charAt(0)}
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FD, fontSize: 24, fontWeight: 700, color: W, marginBottom: 6 }}>{promoter.fullName}</div>
              <div style={{ fontSize: 13, color: W4, fontFamily: FB, marginBottom: 10 }}>{promoter.email}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {promoter.city && (
                  <span style={{ fontSize: 11, color: W7, background: BB, padding: '4px 12px', borderRadius: 20, fontFamily: FB }}>📍 {promoter.city}</span>
                )}
                {(promoter.reliabilityScore ?? 0) > 0 && (
                  <span style={{ fontSize: 11, color: GL, background: hex2rgba(GL, 0.1), padding: '4px 12px', borderRadius: 20, fontFamily: FB }}>⭐ {(promoter.reliabilityScore ?? 0).toFixed(1)} / 5</span>
                )}
              </div>
            </div>
          </div>

          {promoter.fullBodyPhotoUrl && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: GL, fontFamily: FD, marginBottom: 10, fontWeight: 700 }}>Full Body Photo</div>
              <img src={promoter.fullBodyPhotoUrl} alt="Full body"
                style={{ width: '100%', maxHeight: 360, objectFit: 'cover', objectPosition: 'top', borderRadius: 4, border: `1px solid ${BB}` }} />
            </div>
          )}

          <div style={{ borderTop: `1px solid ${BB}`, paddingTop: 24, marginBottom: 24 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: GL, fontFamily: FD, marginBottom: 16, fontWeight: 700 }}>Personal Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              {[
                { label: 'Phone',         value: promoter.phone },
                { label: 'Gender',        value: promoter.gender },
                { label: 'Height',        value: promoter.height ? `${promoter.height} cm` : null },
                { label: 'Clothing Size', value: promoter.clothingSize },
                { label: 'Shoe Size',     value: promoter.shoeSize },
                { label: 'Province',      value: promoter.province },
                { label: 'Member Since',  value: promoter.createdAt ? new Date(promoter.createdAt).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' }) : null },
                { label: 'Account',       value: promoter.status === 'approved' ? '✅ Approved' : promoter.status },
              ].filter(r => r.value).map(r => (
                <div key={r.label} style={{ padding: '12px 0', borderBottom: `1px solid ${BB}`, paddingRight: 16 }}>
                  <div style={{ fontSize: 9, color: W4, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4, fontFamily: FB }}>{r.label}</div>
                  <div style={{ fontSize: 14, color: W, fontWeight: 600, fontFamily: FB }}>{r.value}</div>
                </div>
              ))}
            </div>
          </div>

          {promoter.cvUrl && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: GL, fontFamily: FD, marginBottom: 10, fontWeight: 700 }}>Documents</div>
              <a href={promoter.cvUrl} target="_blank" rel="noopener noreferrer" download
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: hex2rgba(GL, 0.08), border: `1px solid ${hex2rgba(GL, 0.3)}`, borderRadius: 3, color: GL, fontSize: 12, fontFamily: FD, fontWeight: 700, textDecoration: 'none' }}>
                📄 Download CV / Portfolio
              </a>
            </div>
          )}
        </div>

        <div style={{ padding: '0 36px 36px' }}>
          {isSelected ? (
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, padding: '14px', background: hex2rgba(GL, 0.08), border: `1px solid ${hex2rgba(GL, 0.4)}`, borderRadius: 3, fontSize: 13, color: GL, fontFamily: FD, textAlign: 'center', fontWeight: 700 }}>
                ✓ Added to selection
              </div>
              <button onClick={() => { onToggleSelect(); onClose(); }}
                style={{ padding: '14px 20px', background: hex2rgba(CORAL, 0.1), border: `1px solid ${hex2rgba(CORAL, 0.4)}`, color: CORAL, fontFamily: FD, fontSize: 11, fontWeight: 700, cursor: 'pointer', borderRadius: 3, letterSpacing: '0.08em' }}>
                Remove
              </button>
            </div>
          ) : canSelect ? (
            <button onClick={() => { onToggleSelect(); onClose(); }}
              style={{ width: '100%', padding: '14px', background: `linear-gradient(135deg, ${GL}, ${GD})`, border: 'none', color: BLK, fontFamily: FD, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 3 }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              + Add to Selection
            </button>
          ) : (
            <div style={{ padding: '14px', background: BB2, border: `1px solid ${BB}`, fontSize: 13, color: W4, fontFamily: FD, textAlign: 'center', borderRadius: 3 }}>
              Job slots are full
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Confirm Selection Modal ──────────────────────────────────────────────────
function ConfirmSelectionModal({ job, selected, promoters, onConfirm, onClose, confirming }: {
  job: ApiJob; selected: Set<string>; promoters: Promoter[]
  onConfirm: () => void; onClose: () => void; confirming: boolean
}) {
  const selectedPromoters = promoters.filter(p => selected.has(p.id))
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: BLK2, border: `1px solid ${BB}`, width: '100%', maxWidth: 480, position: 'relative', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${GD3}, ${GL}, ${GD3})` }} />
        <div style={{ padding: '36px 36px 0' }}>
          <div style={{ fontSize: 9, letterSpacing: '0.36em', textTransform: 'uppercase', color: GL, fontWeight: 700, fontFamily: FD, marginBottom: 8 }}>Confirm Team</div>
          <h2 style={{ fontFamily: FD, fontSize: 22, fontWeight: 700, color: W, marginBottom: 6 }}>Confirm Selection</h2>
          <p style={{ fontSize: 13, color: W4, fontFamily: FB, marginBottom: 24, lineHeight: 1.6 }}>
            You are about to confirm <strong style={{ color: GL }}>{selectedPromoters.length}</strong> promoter{selectedPromoters.length > 1 ? 's' : ''} for <strong style={{ color: GL }}>{job.title}</strong>. They will be notified and this job will appear on their dashboard.
          </p>
          <div style={{ marginBottom: 28 }}>
            {selectedPromoters.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < selectedPromoters.length - 1 ? `1px solid ${BB}` : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: `1px solid ${BB}` }}>
                  {p.headshotUrl || p.profilePhotoUrl ? (
                    <img src={p.headshotUrl || p.profilePhotoUrl} alt={p.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: hex2rgba(GL, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: GL, fontFamily: FD }}>{p.fullName.charAt(0)}</div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: W, fontFamily: FD }}>{p.fullName}</div>
                  <div style={{ fontSize: 11, color: W4, fontFamily: FB }}>{p.city || p.email}</div>
                </div>
                <div style={{ fontSize: 10, color: GL, fontWeight: 700, fontFamily: FD }}>✓</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: '0 36px 36px', display: 'flex', gap: 12 }}>
          <button onClick={onClose} disabled={confirming}
            style={{ flex: 1, padding: '13px', background: 'transparent', border: `1px solid ${BB}`, color: W4, fontFamily: FD, fontSize: 12, fontWeight: 700, cursor: 'pointer', borderRadius: 3 }}>
            Go Back
          </button>
          <button onClick={onConfirm} disabled={confirming}
            style={{ flex: 2, padding: '13px', background: confirming ? BB : `linear-gradient(135deg, ${GL}, ${GD})`, border: 'none', color: confirming ? W4 : BLK, fontFamily: FD, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: confirming ? 'not-allowed' : 'pointer', borderRadius: 3, transition: 'all 0.2s' }}>
            {confirming ? 'Confirming…' : `✓ Confirm ${selectedPromoters.length} Promoter${selectedPromoters.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Job Card ─────────────────────────────────────────────────────────────────
function JobCard({ job, onOpen }: { job: ApiJob; onOpen: () => void }) {
  const isFull      = job.filledSlots >= job.totalSlots
  const statusColor = job.status === 'OPEN' ? GL : job.status === 'FILLED' ? GD : W4
  const pct         = job.totalSlots > 0 ? Math.round((job.filledSlots / job.totalSlots) * 100) : 0
  const interestedCount = job.applications?.filter((a: any) => a.status === 'STANDBY').length || 0
  const selectedCount   = job.applications?.filter((a: any) => a.status === 'ALLOCATED').length || 0

  return (
    <div onClick={onOpen}
      style={{ background: BLK2, border: `1px solid ${BB}`, padding: '22px 24px', cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'all 0.2s', borderRadius: 3 }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = hex2rgba(GL, 0.4); (e.currentTarget as HTMLElement).style.background = BLK3 }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = BB; (e.currentTarget as HTMLElement).style.background = BLK2 }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${GD3}, ${statusColor}, ${GD3})` }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FD, fontSize: 16, fontWeight: 700, color: W, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title}</div>
          <div style={{ fontSize: 11, color: W4, fontFamily: FB }}>📍 {job.venue || job.address?.split(',')[0]}</div>
        </div>
        <span style={{ flexShrink: 0, marginLeft: 12, fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: statusColor, background: hex2rgba(statusColor, 0.1), border: `1px solid ${hex2rgba(statusColor, 0.4)}`, padding: '3px 10px', borderRadius: 2, fontFamily: FD }}>
          {job.status}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 12, marginTop: 10 }}>
        {[
          { label: 'Rate',  value: `R${job.hourlyRate}/hr`, color: GL },
          { label: 'Slots', value: `${job.filledSlots}/${job.totalSlots}`, color: W },
          { label: 'Date',  value: job.date ? new Date(job.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) : '—', color: W7 },
          { label: 'Time',  value: `${job.startTime}–${job.endTime}`, color: W7 },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontSize: 8, color: W2, fontFamily: FB, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: s.color, fontFamily: FD }}>{s.value}</div>
          </div>
        ))}
      </div>

      {(interestedCount > 0 || selectedCount > 0) && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 11, fontFamily: FB }}>
          {interestedCount > 0 && <span style={{ color: TEAL }}>👋 {interestedCount} interested</span>}
          {selectedCount   > 0 && <span style={{ color: GL   }}>✓ {selectedCount} selected</span>}
        </div>
      )}

      <div style={{ height: 3, background: BB, borderRadius: 2, marginBottom: 12 }}>
        <div style={{ height: '100%', borderRadius: 2, background: isFull ? GD : GL, width: `${pct}%`, transition: 'width 0.4s' }} />
      </div>

      <button style={{ width: '100%', padding: '10px', background: BB2, border: `1px solid ${BB}`, color: GL, fontFamily: FD, fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.background = hex2rgba(GL, 0.14); e.currentTarget.style.borderColor = hex2rgba(GL, 0.4) }}
        onMouseLeave={e => { e.currentTarget.style.background = BB2; e.currentTarget.style.borderColor = BB }}>
        View & Select Promoters →
      </button>
    </div>
  )
}

// ─── Job Detail Panel ─────────────────────────────────────────────────────────
function JobDetailPanel({ job, onClose, onRefresh }: { job: ApiJob; onClose: () => void; onRefresh: () => void }) {
  const [promoters,     setPromoters]     = useState<Promoter[]>([])
  const [loading,       setLoading]       = useState(true)
  const [pendingSelect, setPendingSelect] = useState<Set<string>>(new Set())
  const [confirmedIds,  setConfirmedIds]  = useState<Set<string>>(new Set())
  const [viewPromoter,  setViewPromoter]  = useState<Promoter | null>(null)
  const [tab,           setTab]           = useState<'info' | 'promoters'>('info')
  const [showConfirm,   setShowConfirm]   = useState(false)
  const [confirming,    setConfirming]    = useState(false)
  const [resultMsg,     setResultMsg]     = useState('')

  const loadPromoters = async () => {
    setLoading(true)
    try {
      const [appsRes, eligRes] = await Promise.all([
        fetch(`${API}/applications/job/${job.id}`, { headers: authHdr() as any }),
        fetch(`${API}/users/promoters/eligible?jobId=${job.id}`, { headers: authHdr() as any }),
      ])
      const apps: any[]     = appsRes.ok ? await appsRes.json() : []
      const eligible: any[] = eligRes.ok  ? await eligRes.json() : []
      const appMap     = new Map(apps.map((a: any) => [a.promoterId, a]))
      const appliedIds = new Set(apps.map((a: any) => a.promoterId))

      const allPromoters: Promoter[] = [
        ...apps.map((a: any) => ({
          id: a.promoter.id, fullName: a.promoter.fullName, email: a.promoter.email,
          phone: a.promoter.phone, city: a.promoter.city, province: a.promoter.province,
          gender: a.promoter.gender, height: a.promoter.height,
          clothingSize: a.promoter.clothingSize, shoeSize: a.promoter.shoeSize,
          reliabilityScore: a.promoter.reliabilityScore, profilePhotoUrl: a.promoter.profilePhotoUrl,
          headshotUrl: a.promoter.headshotUrl, fullBodyPhotoUrl: a.promoter.fullBodyPhotoUrl,
          cvUrl: a.promoter.cvUrl, onboardingStatus: a.promoter.onboardingStatus,
          status: a.promoter.status, createdAt: a.promoter.createdAt,
          appStatus: a.status, appId: a.id,
        })),
        ...eligible
          .filter((p: any) => !appliedIds.has(p.id))
          .map((p: any) => ({
            id: p.id, fullName: p.fullName, email: p.email, phone: p.phone,
            city: p.city, province: p.province, gender: p.gender, height: p.height,
            clothingSize: p.clothingSize, shoeSize: p.shoeSize,
            reliabilityScore: p.reliabilityScore, profilePhotoUrl: p.profilePhotoUrl,
            headshotUrl: p.headshotUrl, fullBodyPhotoUrl: p.fullBodyPhotoUrl,
            cvUrl: p.cvUrl, onboardingStatus: p.onboardingStatus,
            status: p.status, createdAt: p.createdAt, appStatus: null, appId: undefined,
          })),
      ]

      setPromoters(allPromoters)
      const dbConfirmed = new Set(apps.filter((a: any) => a.status === 'ALLOCATED').map((a: any) => a.promoterId))
      setConfirmedIds(dbConfirmed)
      setPendingSelect(new Set(dbConfirmed))
    } catch (e) { console.error('[BusinessJobs] loadPromoters error:', e) }
    setLoading(false)
  }

  useEffect(() => { loadPromoters() }, [job.id])

  const togglePending = (id: string) => {
    if (confirmedIds.has(id)) return
    setPendingSelect(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) }
      else { if (next.size >= job.totalSlots) return prev; next.add(id) }
      return next
    })
  }

  const newSelections = [...pendingSelect].filter(id => !confirmedIds.has(id))

  const handleConfirm = async () => {
    if (newSelections.length === 0) { setShowConfirm(false); return }
    setConfirming(true)
    try {
      const res = await fetch(`${API}/applications/bulk-allocate`, {
        method: 'POST', headers: authHdr() as any,
        body: JSON.stringify({ jobId: job.id, promoterIds: newSelections }),
      })
      if (res.ok) {
        setConfirmedIds(new Set(pendingSelect))
        setShowConfirm(false)
        setResultMsg(`✓ ${newSelections.length} promoter${newSelections.length > 1 ? 's' : ''} confirmed! They will see this job on their dashboard.`)
        setTimeout(() => setResultMsg(''), 5000)
        await loadPromoters(); onRefresh()
      } else {
        const err = await res.json()
        setResultMsg(`Failed: ${err.error || 'Please try again'}`)
      }
    } catch { setResultMsg('Network error — please try again') }
    setConfirming(false)
  }

  const handleRemove = async (promoter: Promoter) => {
    if (!promoter.appId) return
    try {
      await fetch(`${API}/applications/${promoter.appId}/status`, {
        method: 'PUT', headers: authHdr() as any,
        body: JSON.stringify({ status: 'STANDBY' }),
      })
      setConfirmedIds(prev => { const s = new Set(prev); s.delete(promoter.id); return s })
      setPendingSelect(prev => { const s = new Set(prev); s.delete(promoter.id); return s })
      setResultMsg(`✓ ${promoter.fullName} removed from this job.`)
      setTimeout(() => setResultMsg(''), 3000)
      await loadPromoters(); onRefresh()
    } catch { setResultMsg('Failed to remove — please try again') }
  }

  const filters = job.filters || {}

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.90)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: BLK1, border: `1px solid ${BB}`, width: '100%', maxWidth: 820, maxHeight: '92vh', display: 'flex', flexDirection: 'column', position: 'relative', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${GD3}, ${GL}, ${GD3})` }} />

        {/* Header */}
        <div style={{ padding: '26px 32px 18px', borderBottom: `1px solid ${BB}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: GL, fontFamily: FD, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 5 }}>Job Details</div>
              <div style={{ fontFamily: FD, fontSize: 22, fontWeight: 700, color: W, marginBottom: 6 }}>{job.title}</div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: W4, fontFamily: FB }}>
                {job.client && <span>🏢 {job.client}</span>}
                {(job.venue || job.address) && <span>📍 {job.venue || job.address?.split(',')[0]}</span>}
                {job.date && <span>📅 {fmtDate(job.date)}</span>}
                <span>🕐 {job.startTime} – {job.endTime}</span>
                <span style={{ color: GL, fontWeight: 700 }}>R{job.hourlyRate}/hr · {job.totalSlots} slots</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: W4, fontSize: 20, flexShrink: 0, marginLeft: 16 }}>✕</button>
          </div>

          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
            <div style={{ flex: 1, height: 4, background: BB, borderRadius: 2 }}>
              <div style={{ height: '100%', borderRadius: 2, background: `linear-gradient(90deg, ${GD3}, ${GL})`, width: `${Math.round(pendingSelect.size / Math.max(job.totalSlots, 1) * 100)}%`, transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: 11, color: GL, fontFamily: FD, fontWeight: 700, flexShrink: 0 }}>
              {confirmedIds.size} confirmed · {pendingSelect.size - confirmedIds.size} pending · {job.totalSlots} total
            </span>
          </div>

          {resultMsg && (
            <div style={{ padding: '10px 14px', background: resultMsg.startsWith('✓') ? hex2rgba(TEAL, 0.1) : hex2rgba(CORAL, 0.1), border: `1px solid ${resultMsg.startsWith('✓') ? hex2rgba(TEAL, 0.4) : hex2rgba(CORAL, 0.4)}`, borderRadius: 3, marginBottom: 14, fontSize: 12, color: resultMsg.startsWith('✓') ? TEAL : CORAL, fontFamily: FD }}>
              {resultMsg}
            </div>
          )}

          <div style={{ display: 'flex', gap: 0, border: `1px solid ${BB}`, borderRadius: 3, overflow: 'hidden' }}>
            {(['info', 'promoters'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ flex: 1, padding: '9px', background: tab === t ? hex2rgba(GL, 0.14) : 'transparent', border: 'none', color: tab === t ? GL : W4, fontFamily: FD, fontSize: 10, fontWeight: tab === t ? 700 : 400, cursor: 'pointer', letterSpacing: '0.12em', textTransform: 'uppercase', transition: 'all 0.18s' }}>
                {t === 'info' ? '📋  Job Info' : `👥  Select Promoters ${loading ? '' : `(${promoters.length} available)`}`}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'info' && (
            <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Client',   value: job.client  || '—' },
                  { label: 'Venue',    value: job.venue   || job.address?.split(',')[0] || '—' },
                  { label: 'Date',     value: fmtDate(job.date) },
                  { label: 'Start',    value: job.startTime },
                  { label: 'End',      value: job.endTime },
                  { label: 'Rate',     value: `R${job.hourlyRate}/hr` },
                  { label: 'Slots',    value: `${job.totalSlots} needed` },
                  { label: 'Filled',   value: `${job.filledSlots} confirmed` },
                  { label: 'Status',   value: job.status },
                ].map(r => (
                  <div key={r.label} style={{ background: BB2, border: `1px solid ${BB}`, padding: '11px 14px', borderRadius: 3 }}>
                    <div style={{ fontSize: 9, color: W4, fontFamily: FD, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 4 }}>{r.label}</div>
                    <div style={{ fontSize: 13, color: W, fontFamily: FD, fontWeight: 600 }}>{r.value}</div>
                  </div>
                ))}
              </div>
              {(filters.gender || filters.minHeight) && (
                <div>
                  <div style={{ fontSize: 9, letterSpacing: '0.26em', textTransform: 'uppercase', color: GL, fontFamily: FD, fontWeight: 700, marginBottom: 10 }}>Requirements</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {filters.gender && filters.gender !== 'Any Gender' && <span style={{ fontSize: 11, color: GL, background: hex2rgba(GL, 0.1), border: `1px solid ${hex2rgba(GL, 0.3)}`, padding: '5px 14px', borderRadius: 3, fontFamily: FD }}>{filters.gender}</span>}
                    {filters.minHeight && <span style={{ fontSize: 11, color: GL, background: hex2rgba(GL, 0.1), border: `1px solid ${hex2rgba(GL, 0.3)}`, padding: '5px 14px', borderRadius: 3, fontFamily: FD }}>Min {filters.minHeight}cm</span>}
                    {filters.languages && <span style={{ fontSize: 11, color: GL, background: hex2rgba(GL, 0.1), border: `1px solid ${hex2rgba(GL, 0.3)}`, padding: '5px 14px', borderRadius: 3, fontFamily: FD }}>{filters.languages}</span>}
                  </div>
                </div>
              )}
              <button onClick={() => setTab('promoters')}
                style={{ padding: '13px', background: `linear-gradient(135deg, ${GL}, ${GD})`, border: 'none', color: BLK, fontFamily: FD, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 3 }}>
                Select Promoters for This Job →
              </button>
            </div>
          )}

          {tab === 'promoters' && (
            <>
              <div style={{ padding: '10px 32px', borderBottom: `1px solid ${BB}`, display: 'flex', gap: 20, fontSize: 11, color: W4, fontFamily: FB, background: hex2rgba(GL, 0.02), flexWrap: 'wrap', alignItems: 'center' }}>
                <span><span style={{ color: TEAL }}>●</span> Interested (applied)</span>
                <span><span style={{ color: GL }}>●</span> Confirmed (allocated)</span>
                <span><span style={{ color: GD }}>●</span> Pending your confirm</span>
                <span style={{ marginLeft: 'auto', color: W2, fontSize: 10 }}>Click photo or name to view full profile</span>
              </div>

              {loading ? (
                <div style={{ padding: 60, textAlign: 'center', color: W4, fontFamily: FD }}>Loading promoters…</div>
              ) : promoters.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center', color: W4, fontFamily: FD }}>No approved promoters found yet.</div>
              ) : (
                promoters.map((p, i) => {
                  const isConfirmed  = confirmedIds.has(p.id)
                  const isPending    = pendingSelect.has(p.id) && !isConfirmed
                  const isInterested = p.appStatus === 'STANDBY'
                  const accentColor  = isConfirmed ? GL : isInterested ? TEAL : W4

                  return (
                    <div key={p.id}
                      style={{ padding: '16px 32px', borderBottom: i < promoters.length - 1 ? `1px solid ${BB}` : 'none', background: isConfirmed ? hex2rgba(GL, 0.05) : isPending ? hex2rgba(GD, 0.04) : isInterested ? hex2rgba(TEAL, 0.03) : 'transparent', display: 'flex', alignItems: 'center', gap: 16, transition: 'background 0.15s' }}
                      onMouseEnter={e => { if (!isConfirmed && !isPending) (e.currentTarget as HTMLElement).style.background = BB2 }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isConfirmed ? hex2rgba(GL, 0.05) : isPending ? hex2rgba(GD, 0.04) : isInterested ? hex2rgba(TEAL, 0.03) : 'transparent' }}>

                      <div style={{ width: 54, height: 54, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', border: `2px solid ${hex2rgba(accentColor, 0.6)}`, cursor: 'pointer', transition: 'transform 0.2s' }}
                        onClick={() => setViewPromoter(p)}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.06)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}>
                        {p.headshotUrl || p.profilePhotoUrl ? (
                          <img src={p.headshotUrl || p.profilePhotoUrl} alt={p.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: hex2rgba(GL, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: GL, fontFamily: FD }}>{p.fullName.charAt(0)}</div>
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setViewPromoter(p)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: W, fontFamily: FD }}>{p.fullName}</span>
                          {isInterested && !isConfirmed && <span style={{ fontSize: 9, color: TEAL,  background: hex2rgba(TEAL, 0.1),  padding: '2px 8px', borderRadius: 2, fontFamily: FD, fontWeight: 700 }}>INTERESTED</span>}
                          {isConfirmed  && <span style={{ fontSize: 9, color: GL,    background: hex2rgba(GL,   0.1),  padding: '2px 8px', borderRadius: 2, fontFamily: FD, fontWeight: 700 }}>✓ CONFIRMED</span>}
                          {isPending    && <span style={{ fontSize: 9, color: GD,    background: hex2rgba(GD,   0.12), padding: '2px 8px', borderRadius: 2, fontFamily: FD, fontWeight: 700 }}>SELECTED</span>}
                        </div>
                        <div style={{ fontSize: 12, color: W4, fontFamily: FB }}>
                          {p.city || '—'}
                          {(p.reliabilityScore ?? 0) > 0 && <span style={{ marginLeft: 10, color: GL }}>⭐ {(p.reliabilityScore ?? 0).toFixed(1)}</span>}
                          {p.height && <span style={{ marginLeft: 10, color: W2 }}>{p.height}cm</span>}
                          {p.gender && <span style={{ marginLeft: 10, color: W2 }}>{p.gender}</span>}
                        </div>
                        <div style={{ fontSize: 10, color: hex2rgba(GL, 0.45), marginTop: 2, fontFamily: FB }}>Click to view full profile →</div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button onClick={() => setViewPromoter(p)}
                          style={{ padding: '7px 14px', background: 'transparent', border: `1px solid ${BB}`, color: W4, fontFamily: FD, fontSize: 9, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.1em', borderRadius: 2, transition: 'all 0.18s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = GL; e.currentTarget.style.color = GL }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = BB; e.currentTarget.style.color = W4 }}>
                          View
                        </button>
                        {isConfirmed ? (
                          <button onClick={() => handleRemove(p)}
                            style={{ padding: '7px 14px', background: hex2rgba(CORAL, 0.1), border: `1px solid ${hex2rgba(CORAL, 0.4)}`, color: CORAL, fontFamily: FD, fontSize: 9, fontWeight: 700, cursor: 'pointer', borderRadius: 2 }}>
                            Remove
                          </button>
                        ) : (
                          <button onClick={() => togglePending(p.id)}
                            disabled={!pendingSelect.has(p.id) && pendingSelect.size >= job.totalSlots}
                            style={{ padding: '7px 14px', background: pendingSelect.has(p.id) ? `linear-gradient(135deg, ${GD}, ${GL})` : 'transparent', border: `1px solid ${pendingSelect.has(p.id) ? GL : hex2rgba(GL, 0.4)}`, color: pendingSelect.has(p.id) ? BLK : GL, fontFamily: FD, fontSize: 9, fontWeight: 700, cursor: (!pendingSelect.has(p.id) && pendingSelect.size >= job.totalSlots) ? 'not-allowed' : 'pointer', letterSpacing: '0.1em', borderRadius: 2, transition: 'all 0.2s', opacity: (!pendingSelect.has(p.id) && pendingSelect.size >= job.totalSlots) ? 0.4 : 1 }}>
                            {pendingSelect.has(p.id) ? '✓ Selected' : '+ Select'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 32px', borderTop: `1px solid ${BB}`, flexShrink: 0, background: BLK, display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 11, color: W4, fontFamily: FB }}>
              {confirmedIds.size} confirmed · {newSelections.length > 0 ? `${newSelections.length} pending confirm` : 'no new selections'} · {job.totalSlots} total slots
            </span>
          </div>
          <button onClick={onClose}
            style={{ padding: '10px 20px', background: 'transparent', border: `1px solid ${BB}`, color: W4, fontFamily: FD, fontSize: 10, fontWeight: 700, cursor: 'pointer', borderRadius: 3, letterSpacing: '0.1em' }}>
            Close
          </button>
          {tab === 'promoters' && newSelections.length > 0 && (
            <button onClick={() => setShowConfirm(true)}
              style={{ padding: '10px 24px', background: `linear-gradient(135deg, ${GL}, ${GD})`, border: 'none', color: BLK, fontFamily: FD, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 3, boxShadow: `0 2px 14px ${hex2rgba(GL, 0.35)}` }}>
              Confirm {newSelections.length} Promoter{newSelections.length > 1 ? 's' : ''} →
            </button>
          )}
        </div>
      </div>

      {viewPromoter && (
        <PromoterProfileModal promoter={viewPromoter} onClose={() => setViewPromoter(null)}
          isSelected={pendingSelect.has(viewPromoter.id)} onToggleSelect={() => togglePending(viewPromoter.id)}
          canSelect={pendingSelect.has(viewPromoter.id) || pendingSelect.size < job.totalSlots} />
      )}
      {showConfirm && (
        <ConfirmSelectionModal job={job} selected={new Set(newSelections)} promoters={promoters}
          onConfirm={handleConfirm} onClose={() => setShowConfirm(false)} confirming={confirming} />
      )}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function BusinessJobs() {
  const [jobs,     setJobs]     = useState<ApiJob[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState<'all' | 'OPEN' | 'FILLED' | 'COMPLETED' | 'CANCELLED'>('all')
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState<ApiJob | null>(null)

  const loadJobs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/jobs`, { headers: authHdr() as any })
      if (res.ok) setJobs(await res.json())
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [])

  useEffect(() => { loadJobs() }, [loadJobs])

  // ─── React to admin job broadcasts ─────────────────────────────────────────
  useEffect(() => {
    const onStorage = (e?: StorageEvent) => {
      if (e && e.key !== 'hg_job_updates' && e.key !== null) return
      loadJobs()
    }
    window.addEventListener('storage', onStorage)
    // Also poll every 30s — admin and business may be in different browser sessions
    const poll = setInterval(loadJobs, 30_000)
    return () => { window.removeEventListener('storage', onStorage); clearInterval(poll) }
  }, [loadJobs])

  const filtered = jobs.filter(j => {
    const sm = filter === 'all' || j.status === filter
    const qm = !search || j.title.toLowerCase().includes(search.toLowerCase()) || j.client?.toLowerCase().includes(search.toLowerCase())
    return sm && qm
  })

  const counts = {
    all:       jobs.length,
    OPEN:      jobs.filter(j => j.status === 'OPEN').length,
    FILLED:    jobs.filter(j => j.status === 'FILLED').length,
    COMPLETED: jobs.filter(j => j.status === 'COMPLETED').length,
    CANCELLED: jobs.filter(j => j.status === 'CANCELLED').length,
  }

  const statusColor = (s: string) => s === 'OPEN' ? GL : s === 'FILLED' ? GD : s === 'COMPLETED' ? GD2 : W4

  return (
    <div>
      <div className="biz-page" style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.36em', textTransform: 'uppercase', color: GL, marginBottom: 8, fontWeight: 700, fontFamily: FD }}>Operations · Jobs</div>
        <h1 style={{ fontFamily: FD, fontSize: 'clamp(22px,3vw,34px)', fontWeight: 700, color: W, lineHeight: 1.1 }}>Campaign Jobs</h1>
        <p style={{ fontSize: 13, color: W4, marginTop: 6, fontFamily: FB }}>
          Select promoters for your jobs. They'll be notified and it will appear on their dashboard.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: BB, marginBottom: 28 }}>
        {[
          { label: 'Total Jobs', value: counts.all,       color: GL  },
          { label: 'Open',       value: counts.OPEN,      color: GL  },
          { label: 'Filled',     value: counts.FILLED,    color: GD  },
          { label: 'Completed',  value: counts.COMPLETED, color: GD2 },
        ].map((s, i) => (
          <div key={i} className="biz-page" style={{ background: BLK2, padding: '18px 20px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${s.color}, ${hex2rgba(s.color, 0.3)})` }} />
            <div style={{ fontFamily: FD, fontSize: 30, fontWeight: 700, color: W, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 9, color: W4, marginTop: 6, letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: FD }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'OPEN', 'FILLED', 'COMPLETED', 'CANCELLED'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '6px 14px', background: filter === f ? hex2rgba(f === 'all' ? GL : statusColor(f), 0.14) : 'transparent', border: `1px solid ${filter === f ? (f === 'all' ? GL : statusColor(f)) : BB}`, color: filter === f ? (f === 'all' ? GL : statusColor(f)) : W4, fontFamily: FD, fontSize: 9, fontWeight: filter === f ? 700 : 400, cursor: 'pointer', letterSpacing: '0.1em', borderRadius: 2, transition: 'all 0.18s' }}>
              {f === 'all' ? `All (${counts.all})` : `${f.charAt(0) + f.slice(1).toLowerCase()} (${counts[f]})`}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <input placeholder="Search jobs…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: BLK2, border: `1px solid ${BB}`, padding: '7px 14px', color: W, fontFamily: FB, fontSize: 11, outline: 'none', borderRadius: 2, width: 200 }}
            onFocus={e => e.currentTarget.style.borderColor = GL}
            onBlur={e => e.currentTarget.style.borderColor = BB} />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: W4, fontFamily: FD }}>Loading jobs…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', border: `1px dashed ${BB}`, borderRadius: 3 }}>
          <p style={{ fontFamily: FD, fontSize: 20, color: W4, marginBottom: 8 }}>No jobs found</p>
          <p style={{ fontFamily: FB, fontSize: 13, color: W2 }}>
            {jobs.length === 0 ? 'No jobs posted for your business yet.' : 'No jobs match your filters.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {filtered.map(job => (
            <JobCard key={job.id} job={job} onOpen={() => setSelected(job)} />
          ))}
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 11, color: W2, fontFamily: FB }}>
        Showing <strong style={{ color: W4 }}>{filtered.length}</strong> of <strong style={{ color: W4 }}>{jobs.length}</strong> jobs
      </div>

      {selected && (
        <JobDetailPanel job={selected} onClose={() => { setSelected(null); loadJobs() }} onRefresh={loadJobs} />
      )}
    </div>
  )
}