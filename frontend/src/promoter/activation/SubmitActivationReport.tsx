import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { jobsService } from '../../shared/services/jobsService'
import { activationReportsService, resolveShotUrl } from '../../shared/services/activationReportsService'
import { REQUIRED_SHOTS, type ShotKey, type ActivationReport } from '../../shared/types/activationReport.types'
import { showToast } from '../../shared/utils/toast'

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
const CORAL = '#C4614A'
const GREEN = '#4ade80'

function hex2rgba(hex: string, a: number) {
  const h = hex.replace('#', '')
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`
}

interface ShotSlotProps {
  shotKey: ShotKey
  label: string
  hint: string
  previewUrl?: string
  onCapture: (key: ShotKey, file: File) => void
}

const ShotSlot: React.FC<ShotSlotProps> = ({ shotKey, label, hint, previewUrl, onCapture }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div style={{ background: BC, border: `1px solid ${BB}`, borderRadius: 6, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <span style={{ fontFamily: FD, fontSize: 14, fontWeight: 700, color: W }}>{label}</span>
        {previewUrl && <span style={{ fontSize: 11, color: GREEN, fontFamily: FB, fontWeight: 700 }}>✓ Captured</span>}
      </div>
      <p style={{ fontSize: 11.5, color: WD, fontFamily: FB, marginBottom: 12, lineHeight: 1.4 }}>{hint}</p>

      <div
        onClick={() => inputRef.current?.click()}
        style={{
          height: previewUrl ? 160 : 100,
          borderRadius: 5,
          border: `1.5px dashed ${previewUrl ? hex2rgba(GREEN, 0.4) : hex2rgba(GL, 0.35)}`,
          background: previewUrl ? `url(${previewUrl}) center/cover no-repeat` : hex2rgba(GL, 0.05),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', position: 'relative', overflow: 'hidden',
        }}
      >
        {!previewUrl && (
          <span style={{ fontFamily: FB, fontSize: 12.5, color: GL, fontWeight: 600 }}>📷 Tap to take photo</span>
        )}
        {previewUrl && (
          <div style={{ position: 'absolute', bottom: 6, right: 6, background: hex2rgba(B, 0.7), borderRadius: 4, padding: '4px 10px', fontSize: 10.5, color: W, fontFamily: FB, fontWeight: 700 }}>
            Retake
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) onCapture(shotKey, file)
          e.target.value = ''
        }}
      />
    </div>
  )
}

export const SubmitActivationReport: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const jobId = searchParams.get('jobId') || ''

  const [job, setJob] = useState<any>(null)
  const [existing, setExisting] = useState<ActivationReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<'draft' | 'submitted' | null>(null)
  const [error, setError] = useState('')

  const [unitsServed, setUnitsServed] = useState('')
  const [conversions, setConversions] = useState('')
  const [insights, setInsights] = useState('')
  const [feedback, setFeedback] = useState('')
  const [shotFiles, setShotFiles] = useState<Partial<Record<ShotKey, File>>>({})
  const [shotPreviews, setShotPreviews] = useState<Partial<Record<ShotKey, string>>>({})

  useEffect(() => {
    if (!jobId) { setLoading(false); return }
    ;(async () => {
      try {
        const j = await jobsService.getJobById(jobId)
        setJob(j)
      } catch { /* job fetch is best-effort for header display */ }
      try {
        const r = await activationReportsService.getForJob(jobId)
        setExisting(r)
        setUnitsServed(String(r.unitsServed ?? ''))
        setConversions(String(r.conversions ?? ''))
        setInsights(r.insights || '')
        setFeedback(r.feedback || '')
        setShotPreviews({
          shotSetup:    resolveShotUrl(r.shotSetupUrl)    || undefined,
          shotMidEvent: resolveShotUrl(r.shotMidEventUrl) || undefined,
          shotClose:    resolveShotUrl(r.shotCloseUrl)    || undefined,
        })
      } catch { /* no report yet — that's fine, start fresh */ }
      setLoading(false)
    })()
  }, [jobId])

  const handleCapture = (key: ShotKey, file: File) => {
    setShotFiles(prev => ({ ...prev, [key]: file }))
    setShotPreviews(prev => ({ ...prev, [key]: URL.createObjectURL(file) }))
  }

  const allShotsPresent = REQUIRED_SHOTS.every(s => !!shotPreviews[s.key])

  const handleSave = async (status: 'draft' | 'submitted') => {
    if (!jobId) return
    if (status === 'submitted' && !allShotsPresent) {
      setError('All three shots (setup, mid-event, close-out) are required before you can submit.')
      return
    }
    setError('')
    setSaving(status)
    try {
      const result: any = await activationReportsService.save(jobId, {
        unitsServed, conversions, insights, feedback, status, shots: shotFiles,
      })
      if (result?.error) {
        setError(result.error)
      } else {
        showToast(status === 'submitted' ? '✓ Activation report submitted' : '✓ Draft saved', 'success')
        if (status === 'submitted') navigate('/promoter/?tab=jobs')
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save the report. Please try again.')
    } finally {
      setSaving(null)
    }
  }

  if (!jobId) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <p style={{ color: WD, fontFamily: FB }}>No activation selected. Go to Jobs and open a completed activation to file a report.</p>
      </div>
    )
  }

  if (loading) {
    return <div style={{ padding: '40px 24px', textAlign: 'center', color: WD, fontFamily: FB }}>Loading…</div>
  }

  const inp: React.CSSProperties = { width: '100%', background: BC, border: `1px solid ${BB}`, padding: '11px 14px', fontFamily: FB, fontSize: 14, color: W, outline: 'none', borderRadius: 5, boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: WD, display: 'block', marginBottom: 8, fontFamily: FD }

  return (
    <div style={{ padding: '32px 24px 100px', maxWidth: 640, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: GL, marginBottom: 8, fontWeight: 700, fontFamily: FD }}>
          Activation Report
        </div>
        <h1 style={{ fontFamily: FD, fontSize: 22, fontWeight: 700, color: W, marginBottom: 4 }}>
          {job?.title || 'Activation'}
        </h1>
        <p style={{ fontSize: 12.5, color: WD, fontFamily: FB }}>
          {job?.client || job?.brand ? `${job.client || job.brand} · ` : ''}{job?.venue || ''}
        </p>
        {existing?.status === 'submitted' && (
          <div style={{ marginTop: 10, display: 'inline-block', padding: '4px 12px', borderRadius: 20, background: hex2rgba(GREEN, 0.12), border: `1px solid ${hex2rgba(GREEN, 0.4)}`, fontSize: 11, fontFamily: FB, fontWeight: 700, color: GREEN }}>
            ✓ Already submitted — you can still update it
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: hex2rgba(CORAL, 0.1), border: `1px solid ${hex2rgba(CORAL, 0.4)}`, borderRadius: 5, marginBottom: 20, fontSize: 13, color: CORAL, fontFamily: FB, fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* ── Metrics ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
        <div>
          <label style={lbl}>Units Served / Sampled</label>
          <input style={inp} type="number" min={0} inputMode="numeric" value={unitsServed} onChange={e => setUnitsServed(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label style={lbl}>Conversions / Sales</label>
          <input style={inp} type="number" min={0} inputMode="numeric" value={conversions} onChange={e => setConversions(e.target.value)} placeholder="0" />
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={lbl}>Insights</label>
        <textarea style={{ ...inp, minHeight: 90, resize: 'vertical' }} value={insights} onChange={e => setInsights(e.target.value)} placeholder="What worked well? Crowd size, stock levels, standout moments…" />
      </div>

      <div style={{ marginBottom: 28 }}>
        <label style={lbl}>Feedback</label>
        <textarea style={{ ...inp, minHeight: 90, resize: 'vertical' }} value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Consumer reactions, venue issues, anything the client should know…" />
      </div>

      {/* ── Required shot list ── */}
      <div style={{ marginBottom: 12 }}>
        <label style={lbl}>Photos — required</label>
      </div>
      <div style={{ display: 'grid', gap: 14, marginBottom: 32 }}>
        {REQUIRED_SHOTS.map(s => (
          <ShotSlot key={s.key} shotKey={s.key} label={s.label} hint={s.hint} previewUrl={shotPreviews[s.key]} onCapture={handleCapture} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => handleSave('draft')}
          disabled={!!saving}
          style={{ flex: 1, padding: '13px 0', borderRadius: 5, border: `1px solid ${BB}`, background: 'transparent', color: WM, fontFamily: FD, fontWeight: 700, fontSize: 13, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}
        >
          {saving === 'draft' ? 'Saving…' : 'Save Draft'}
        </button>
        <button
          onClick={() => handleSave('submitted')}
          disabled={!!saving}
          style={{ flex: 1.4, padding: '13px 0', borderRadius: 5, border: 'none', background: GL, color: B, fontFamily: FD, fontWeight: 700, fontSize: 13, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}
        >
          {saving === 'submitted' ? 'Submitting…' : 'Submit Report'}
        </button>
      </div>
    </div>
  )
}

export default SubmitActivationReport
