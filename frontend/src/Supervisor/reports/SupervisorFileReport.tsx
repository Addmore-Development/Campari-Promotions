// Supervisor/reports/SupervisorFileReport.tsx
// "File Report" tab — lets a supervisor pick one of THEIR assigned campaigns,
// see the promoters who worked it, and file the activation report against it
// (reuses the exact same form the promoter app uses, since the backend route
// already accepts either role).
import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { jobsService } from '../../shared/services/jobsService'
import { SubmitActivationReport } from '../../promoter/activation/SubmitActivationReport'

const G    = '#8F8A7C'
const GL   = '#C9BFA6'
const G2   = '#8A8474'
const B    = '#050504'
const BC   = '#080807'
const BB   = 'rgba(170,160,135,0.14)'
const W    = '#F8F8F8'
const WM   = 'rgba(248,248,248,0.65)'
const WD   = 'rgba(248,248,248,0.28)'
const FD   = "'Playfair Display', Georgia, serif"
const FB   = "'DM Sans', system-ui, sans-serif"
const GREEN = '#4ade80'
const AMBER = '#D8B26A'

const BACKEND = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'
function avatarUrl(p?: string | null): string | null {
  if (!p) return null
  return p.startsWith('http') ? p : BACKEND + p
}
function hexA(hex: string, a: number) {
  const h = hex.replace('#', '')
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`
}

// ── Lightweight inline SVG bar chart — no chart library dependency ─────────
function BarChart({ data, width = 640, height = 220, valueFormatter }: {
  data: { label: string; value: number; color: string }[]
  width?: number; height?: number
  valueFormatter?: (v: number) => string
}) {
  const max = Math.max(1, ...data.map(d => d.value))
  const padding = { top: 24, right: 16, bottom: 40, left: 16 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom
  const barGap = 18
  const barW = data.length > 0 ? Math.min(64, (chartW - barGap * (data.length - 1)) / data.length) : 0
  const fmt = valueFormatter || ((v: number) => String(v))

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* baseline */}
      <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke={BB} strokeWidth={1} />
      {data.map((d, i) => {
        const barH = max > 0 ? (d.value / max) * chartH : 0
        const x = padding.left + i * (barW + barGap)
        const y = height - padding.bottom - barH
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barW} height={Math.max(barH, 1)} rx={3} fill={d.color} opacity={0.9} />
            <text x={x + barW / 2} y={y - 8} textAnchor="middle" fontSize="12" fontWeight={700} fill={W} fontFamily={FD}>
              {fmt(d.value)}
            </text>
            <text x={x + barW / 2} y={height - padding.bottom + 18} textAnchor="middle" fontSize="9.5" fill={WM} fontFamily={FB}
              style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {d.label.length > 14 ? `${d.label.slice(0, 13)}…` : d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export const SupervisorFileReport: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const jobId = searchParams.get('jobId') || ''

  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    jobsService.getSupervisorJobs().then(j => { setJobs(j); setLoading(false) })
  }, [])

  // ── No campaign picked yet → show the picker list ──────────────────────────
  if (!jobId) {
    if (loading) {
      return <div style={{ padding: '40px 24px', textAlign: 'center', color: WD, fontFamily: FB }}>Loading your campaigns…</div>
    }

    if (jobs.length === 0) {
      return (
        <div style={{ padding: '48px 36px' }}>
          <div style={{ padding: '48px 24px', textAlign: 'center', color: WD, fontFamily: FB, border: `1px dashed ${BB}`, borderRadius: 6 }}>
            You haven't been assigned to any campaigns yet. Once admin assigns you as the supervisor on a job, you'll be able to file its report here.
          </div>
        </div>
      )
    }

    const reportsSubmitted = jobs.filter(j => j.activationReport?.status === 'submitted').length
    const reportsDraft     = jobs.filter(j => j.activationReport?.status === 'draft').length
    const reportsMissing   = jobs.length - reportsSubmitted - reportsDraft
    const topCampaigns = jobs
      .filter(j => j.activationReport && (j.activationReport.unitsServed || j.activationReport.conversions))
      .slice(0, 6)

    return (
      <div style={{ padding: '32px 36px 80px' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: GL, marginBottom: 8, fontWeight: 700, fontFamily: FD }}>File Report</div>
          <h1 style={{ fontFamily: FD, fontSize: 24, fontWeight: 700, color: W }}>Pick a Campaign</h1>
          <p style={{ fontSize: 12.5, color: WD, fontFamily: FB, marginTop: 4 }}>
            Select one of your assigned campaigns to file or update its activation report and see who worked it.
          </p>
        </div>

        {/* ── Statistics — bar graph overview of report progress ────────────── */}
        {jobs.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: topCampaigns.length > 0 ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 28 }}>
            <div style={{ background: BC, border: `1px solid ${BB}`, borderRadius: 6, padding: '18px 22px' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: GL, fontWeight: 700, marginBottom: 14, fontFamily: FD }}>
                Report Status Overview
              </div>
              <BarChart
                data={[
                  { label: 'Submitted',    value: reportsSubmitted, color: GREEN },
                  { label: 'Draft',        value: reportsDraft,     color: AMBER },
                  { label: 'Not Started',  value: reportsMissing,   color: WD },
                ]}
                width={320} height={200}
              />
            </div>
            {topCampaigns.length > 0 && (
              <div style={{ background: BC, border: `1px solid ${BB}`, borderRadius: 6, padding: '18px 22px' }}>
                <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: GL, fontWeight: 700, marginBottom: 14, fontFamily: FD }}>
                  Units Served by Campaign
                </div>
                <BarChart
                  data={topCampaigns.map(j => ({ label: j.title, value: j.activationReport?.unitsServed || 0, color: GL }))}
                  width={320} height={200}
                />
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gap: 12 }}>
          {jobs.map(j => {
            const reportStatus = j.activationReport?.status
            const badge =
              reportStatus === 'submitted' ? { label: '✓ Report Submitted', color: GREEN } :
              reportStatus === 'draft'     ? { label: '◐ Draft Saved', color: AMBER } :
                                              { label: '○ Report Not Started', color: WD }
            const proms = (j.shifts || []).map((s: any) => s.promoter).filter(Boolean)

            return (
              <div key={j.id} style={{ background: BC, border: `1px solid ${BB}`, borderRadius: 6, padding: '18px 22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: proms.length ? 14 : 0 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontFamily: FD, fontSize: 16, fontWeight: 700, color: W }}>{j.title}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: badge.color, fontFamily: FB, padding: '2px 8px', borderRadius: 20, background: hexA(badge.color, 0.12), border: `1px solid ${hexA(badge.color, 0.4)}` }}>
                        {badge.label}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: WM, fontFamily: FB }}>
                      {j.client || j.brand} · {j.venue} · {j.date ? new Date(j.date).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/supervisor/?tab=activation-report&jobId=${j.id}`)}
                    style={{ padding: '9px 18px', borderRadius: 5, border: 'none', background: GL, color: B, fontFamily: FD, fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
                    {reportStatus === 'submitted' ? 'View / Update Report' : 'File Report'}
                  </button>
                </div>

                {proms.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 12, borderTop: `1px solid ${BB}` }}>
                    {proms.map((p: any) => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 10px 5px 5px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${BB}`, borderRadius: 20 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: `linear-gradient(135deg,${G2},${GL})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: B }}>
                          {avatarUrl(p.headshotUrl || p.profilePhotoUrl)
                            ? <img src={avatarUrl(p.headshotUrl || p.profilePhotoUrl) as string} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : (p.fullName || '?').charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: 11.5, color: WM, fontFamily: FB }}>{p.fullName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── A campaign is picked → show its promoter roster + the report form ──────
  const activeJob = jobs.find(j => j.id === jobId)
  const proms = activeJob ? (activeJob.shifts || []).map((s: any) => s.promoter).filter(Boolean) : []

  return (
    <div>
      <div style={{ padding: '24px 24px 0', maxWidth: 640, margin: '0 auto' }}>
        <button onClick={() => navigate('/supervisor/?tab=activation-report')}
          style={{ background: 'none', border: 'none', color: GL, fontFamily: FB, fontSize: 12, cursor: 'pointer', marginBottom: 4 }}>
          ← All my campaigns
        </button>

        {proms.length > 0 && (
          <div style={{ marginTop: 12, padding: '14px 16px', background: BC, border: `1px solid ${BB}`, borderRadius: 6 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: GL, fontWeight: 700, marginBottom: 10, fontFamily: FD }}>
              Promoters On This Campaign
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {proms.map((p: any) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 10px 5px 5px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${BB}`, borderRadius: 20 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: `linear-gradient(135deg,${G2},${GL})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: B }}>
                    {avatarUrl(p.headshotUrl || p.profilePhotoUrl)
                      ? <img src={avatarUrl(p.headshotUrl || p.profilePhotoUrl) as string} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (p.fullName || '?').charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 11.5, color: WM, fontFamily: FB }}>{p.fullName}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <SubmitActivationReport redirectPath="/supervisor/?tab=activation-report" />
    </div>
  )
}

export default SupervisorFileReport