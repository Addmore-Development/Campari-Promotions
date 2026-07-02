import { useEffect, useState } from 'react'
import { AdminLayout } from '../AdminLayout'
import { injectAdminMobileStyles } from '../adminMobileStyles'
import { activationReportsService, resolveShotUrl, type ClientActivationSummary } from '../../shared/services/activationReportsService'
import type { ActivationReport } from '../../shared/types/activationReport.types'
import { apiFetch } from '../../shared/services/api'

const G   = '#8F8A7C'
const GL  = '#C9BFA6'
const G3  = '#7A756A'
const B   = '#050504'
const D2  = '#0A0A08'
const BB  = 'rgba(170,160,135,0.16)'
const BB2 = 'rgba(170,160,135,0.06)'
const W   = '#F0F0F0'
const W55 = 'rgba(214,214,214,0.90)'
const W28 = 'rgba(187,187,187,0.80)'
const GREEN = '#4ade80'
const CORAL = '#C4614A'
const FD  = "'Playfair Display', Georgia, serif"

function hex2rgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

interface ClientOpt { id: string; name: string }

function StatusBadge({ status }: { status: 'draft' | 'submitted' }) {
  const color = status === 'submitted' ? GREEN : GL
  return (
    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: FD, color, background: hex2rgba(color, 0.12), border: `1px solid ${hex2rgba(color, 0.45)}`, padding: '3px 10px', borderRadius: 3 }}>
      {status}
    </span>
  )
}

function FilterBtn({ label, active, color, onClick }: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding: '7px 16px', border: `1px solid ${active ? color : 'rgba(170,160,135,0.22)'}`, cursor: 'pointer', fontFamily: FD, fontSize: 10, fontWeight: active ? 700 : 400, textTransform: 'capitalize' as const, borderRadius: 3, background: active ? hex2rgba(color, 0.18) : 'transparent', color: active ? color : W55, transition: 'all 0.18s' }}>{label}</button>
  )
}

function StatCard({ label, value, color = GL }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ background: D2, border: `1px solid ${BB}`, borderRadius: 6, padding: '16px 18px' }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: W28, fontFamily: FD, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, fontFamily: FD, color }}>{value}</div>
    </div>
  )
}

export default function ActivationReports() {
  const [reports, setReports]   = useState<ActivationReport[]>([])
  const [loading, setLoading]   = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'submitted'>('all')
  const [clients, setClients]   = useState<ClientOpt[]>([])
  const [clientFilter, setClientFilter] = useState('')
  const [selected, setSelected] = useState<ActivationReport | null>(null)

  // Client report builder
  const [summaryClientId, setSummaryClientId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [summary, setSummary]   = useState<ClientActivationSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError]     = useState('')

  useEffect(() => { injectAdminMobileStyles() }, [])

  useEffect(() => {
    (async () => {
      try { setClients(await apiFetch<ClientOpt[]>('/admin/clients')) } catch { /* non-fatal */ }
    })()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const data = await activationReportsService.getAll({
        status: statusFilter === 'all' ? undefined : statusFilter,
        clientId: clientFilter || undefined,
      })
      setReports(data)
    } catch { setReports([]) }
    setLoading(false)
  }

  useEffect(() => { load() }, [statusFilter, clientFilter])

  const buildSummary = async () => {
    if (!summaryClientId) { setSummaryError('Select a client first'); return }
    setSummaryError('')
    setSummaryLoading(true)
    try {
      const s = await activationReportsService.getClientReport(summaryClientId, dateFrom || undefined, dateTo || undefined)
      setSummary(s)
    } catch (err: any) {
      setSummaryError(err?.message || 'Failed to build client report')
      setSummary(null)
    }
    setSummaryLoading(false)
  }

  const printSummary = () => window.print()

  const totalServed      = reports.reduce((s, r) => s + (r.unitsServed || 0), 0)
  const totalConversions = reports.reduce((s, r) => s + (r.conversions || 0), 0)
  const submittedCount   = reports.filter(r => r.status === 'submitted').length

  return (
    <AdminLayout>
      <div style={{ padding: '28px 32px 60px', background: B, minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: GL, marginBottom: 8, fontWeight: 700, fontFamily: FD }}>Reporting</div>
          <h1 style={{ fontFamily: FD, fontSize: 26, fontWeight: 700, color: W, marginBottom: 4 }}>Activation Reports</h1>
          <p style={{ fontSize: 13, color: W28 }}>Per-activation serves, conversions, insights, feedback and photos — filed by supervisors on-site.</p>
        </div>

        {/* ── Summary stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 26 }}>
          <StatCard label="Activations Reported" value={reports.length} />
          <StatCard label="Submitted"            value={submittedCount} color={GREEN} />
          <StatCard label="Total Served"         value={totalServed.toLocaleString()} />
          <StatCard label="Total Conversions"    value={totalConversions.toLocaleString()} />
        </div>

        {/* ── Filters ── */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
          {(['all', 'submitted', 'draft'] as const).map(s => (
            <FilterBtn key={s} label={s} active={statusFilter === s} color={s === 'submitted' ? GREEN : GL} onClick={() => setStatusFilter(s)} />
          ))}
          <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} style={{ marginLeft: 'auto', background: D2, border: `1px solid ${BB}`, color: W55, padding: '8px 12px', borderRadius: 4, fontFamily: FD, fontSize: 12 }}>
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* ── Table + detail split ── */}
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1.1fr 0.9fr' : '1fr', gap: 20 }}>
          <div style={{ background: D2, border: `1px solid ${BB}`, borderRadius: 6, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: BB2 }}>
                  {['Activation', 'Client', 'Served', 'Conv.', 'Status', 'Reporter'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: W28, fontFamily: FD, borderBottom: `1px solid ${BB}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: W28 }}>Loading…</td></tr>}
                {!loading && reports.length === 0 && <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: W28 }}>No activation reports yet.</td></tr>}
                {reports.map(r => (
                  <tr key={r.id} onClick={() => setSelected(r)} style={{ cursor: 'pointer', background: selected?.id === r.id ? hex2rgba(GL, 0.08) : 'transparent' }}>
                    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${BB2}`, color: W, fontSize: 13, fontWeight: 600 }}>{r.job?.title || '—'}</td>
                    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${BB2}`, color: W55, fontSize: 12.5 }}>{r.job?.client || '—'}</td>
                    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${BB2}`, color: W55, fontSize: 12.5 }}>{r.unitsServed}</td>
                    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${BB2}`, color: W55, fontSize: 12.5 }}>{r.conversions}</td>
                    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${BB2}` }}><StatusBadge status={r.status} /></td>
                    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${BB2}`, color: W28, fontSize: 12 }}>{r.reporter?.fullName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Detail panel ── */}
          {selected && (
            <div style={{ background: D2, border: `1px solid ${BB}`, borderRadius: 6, padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <h3 style={{ fontFamily: FD, fontSize: 18, color: W, marginBottom: 2 }}>{selected.job?.title}</h3>
                  <p style={{ fontSize: 12, color: W28 }}>{selected.job?.client} · {selected.job?.venue}</p>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'transparent', border: 'none', color: W28, cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                <div style={{ background: BB2, borderRadius: 4, padding: '10px 12px' }}>
                  <div style={{ fontSize: 9, color: W28, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Units Served</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: GL, fontFamily: FD }}>{selected.unitsServed}</div>
                </div>
                <div style={{ background: BB2, borderRadius: 4, padding: '10px 12px' }}>
                  <div style={{ fontSize: 9, color: W28, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Conversions</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: GL, fontFamily: FD }}>{selected.conversions}</div>
                </div>
              </div>

              {selected.insights && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 9, color: W28, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontFamily: FD }}>Insights</div>
                  <p style={{ fontSize: 13, color: W55, lineHeight: 1.5 }}>{selected.insights}</p>
                </div>
              )}
              {selected.feedback && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 9, color: W28, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontFamily: FD }}>Feedback</div>
                  <p style={{ fontSize: 13, color: W55, lineHeight: 1.5 }}>{selected.feedback}</p>
                </div>
              )}

              <div style={{ fontSize: 9, color: W28, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontFamily: FD }}>Photos</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[selected.shotSetupUrl, selected.shotMidEventUrl, selected.shotCloseUrl].map((url, i) => (
                  <div key={i} style={{ height: 90, borderRadius: 4, border: `1px solid ${BB}`, background: url ? `url(${resolveShotUrl(url)}) center/cover no-repeat` : BB2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {!url && <span style={{ fontSize: 10, color: W28 }}>No shot</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Client report generator ── */}
        <div style={{ marginTop: 40, background: D2, border: `1px solid ${BB}`, borderRadius: 6, padding: 24 }}>
          <h2 style={{ fontFamily: FD, fontSize: 18, color: W, marginBottom: 4 }}>Pull a Client Report</h2>
          <p style={{ fontSize: 12.5, color: W28, marginBottom: 18 }}>Auto-generates activation count, serves/conversions totals, and a breakdown per activation for a chosen client and period.</p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <select value={summaryClientId} onChange={e => setSummaryClientId(e.target.value)} style={{ background: BB2, border: `1px solid ${BB}`, color: W, padding: '9px 12px', borderRadius: 4, fontFamily: FD, fontSize: 12, minWidth: 200 }}>
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ background: BB2, border: `1px solid ${BB}`, color: W, padding: '9px 12px', borderRadius: 4, fontFamily: FD, fontSize: 12 }} />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ background: BB2, border: `1px solid ${BB}`, color: W, padding: '9px 12px', borderRadius: 4, fontFamily: FD, fontSize: 12 }} />
            <button onClick={buildSummary} disabled={summaryLoading} style={{ padding: '9px 20px', background: hex2rgba(GL, 0.18), border: `1px solid ${GL}`, color: GL, borderRadius: 4, fontFamily: FD, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              {summaryLoading ? 'Building…' : 'Generate Report'}
            </button>
            {summary && (
              <button onClick={printSummary} style={{ padding: '9px 20px', background: 'transparent', border: `1px solid ${BB}`, color: W55, borderRadius: 4, fontFamily: FD, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                Print / PDF
              </button>
            )}
          </div>

          {summaryError && <p style={{ color: CORAL, fontSize: 12.5, marginBottom: 12 }}>{summaryError}</p>}

          {summary && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
                <StatCard label="Activations" value={summary.totalActivations} />
                <StatCard label="Reports Submitted" value={summary.reportsSubmitted} color={GREEN} />
                <StatCard label="Total Served" value={summary.totalServed.toLocaleString()} />
                <StatCard label="Total Conversions" value={summary.totalConversions.toLocaleString()} />
              </div>
              <div style={{ border: `1px solid ${BB}`, borderRadius: 6, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: BB2 }}>
                      {['Activation', 'Venue', 'Date', 'Served', 'Conv.', 'Status'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: W28, fontFamily: FD, borderBottom: `1px solid ${BB}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {summary.activations.map(a => (
                      <tr key={a.jobId}>
                        <td style={{ padding: '10px 14px', borderBottom: `1px solid ${BB2}`, color: W, fontSize: 13 }}>{a.title}</td>
                        <td style={{ padding: '10px 14px', borderBottom: `1px solid ${BB2}`, color: W55, fontSize: 12.5 }}>{a.venue}</td>
                        <td style={{ padding: '10px 14px', borderBottom: `1px solid ${BB2}`, color: W55, fontSize: 12.5 }}>{new Date(a.date).toLocaleDateString()}</td>
                        <td style={{ padding: '10px 14px', borderBottom: `1px solid ${BB2}`, color: W55, fontSize: 12.5 }}>{a.report?.unitsServed ?? '—'}</td>
                        <td style={{ padding: '10px 14px', borderBottom: `1px solid ${BB2}`, color: W55, fontSize: 12.5 }}>{a.report?.conversions ?? '—'}</td>
                        <td style={{ padding: '10px 14px', borderBottom: `1px solid ${BB2}` }}>{a.report ? <StatusBadge status={a.report.status} /> : <span style={{ fontSize: 11, color: W28 }}>No report</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
