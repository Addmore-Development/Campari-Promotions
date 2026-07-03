// Supervisor/reports/SupervisorReportsTab.tsx
// Mirrors the Admin and Business "Reports & Exports" pattern, but scoped to
// the campaigns this supervisor has been assigned to oversee — real data,
// not mocks: campaign summary, promoter roster, and activation report exports
// as downloadable CSV or printable PDF.
import React, { useEffect, useState } from 'react'
import { jobsService } from '../../shared/services/jobsService'

const G    = '#8F8A7C'
const GL   = '#C9BFA6'
const G2   = '#8A8474'
const G3   = '#7A756A'
const G5   = '#443F36'
const B    = '#050504'
const BC   = '#080807'
const D2   = '#0A0A08'
const BB   = 'rgba(170,160,135,0.16)'
const BB2  = 'rgba(170,160,135,0.06)'
const W    = '#F8F8F8'
const W55  = 'rgba(248,248,248,0.55)'
const W28  = 'rgba(248,248,248,0.28)'
const FD   = "'Playfair Display', Georgia, serif"
const FB   = "'DM Sans', system-ui, sans-serif"
const GREEN = '#4ade80'

function hex2rgba(hex: string, a: number) {
  const h = hex.replace('#', '')
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`
}

function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const lines = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url)
}

function downloadPDF(title: string, subtitle: string, headers: string[], rows: (string | number)[][]) {
  const rowsHtml = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    body{font-family:Georgia,serif;color:#12120D;background:#fff;padding:40px;max-width:900px;margin:0 auto;}
    h1{font-size:22px;border-bottom:2px solid #8F8A7C;padding-bottom:12px;margin-bottom:6px;color:#050504;}
    .meta{font-size:11px;color:#888;margin-bottom:26px;}
    table{width:100%;border-collapse:collapse;margin-top:8px;}
    th{background:#8F8A7C;color:#fff;padding:8px 10px;text-align:left;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;}
    td{padding:7px 10px;border-bottom:1px solid #DBDBDB;font-size:11.5px;}
    tr:nth-child(even) td{background:#F9F9F9;}
    @media print{body{padding:16px;}}
  </style></head><body>
  <h1>${title}</h1>
  <div class="meta">${subtitle} · Generated ${new Date().toLocaleString('en-ZA')}</div>
  <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rowsHtml}</tbody></table>
  </body></html>`
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const w = window.open(url, '_blank')
  if (w) { w.onload = () => { w.print(); URL.revokeObjectURL(url) } }
  else { URL.revokeObjectURL(url) }
}

export const SupervisorReportsTab: React.FC = () => {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [exportMsg, setExportMsg] = useState('')

  useEffect(() => {
    jobsService.getSupervisorJobs().then(j => { setJobs(j); setLoading(false) })
  }, [])

  const doExport = (label: string, fn: () => void) => {
    fn()
    setExportMsg(`${label} downloaded`)
    setTimeout(() => setExportMsg(''), 2500)
  }

  const allPromoters = jobs.flatMap(j => (j.shifts || []).map((s: any) => ({ ...s.promoter, jobTitle: j.title, jobId: j.id })))
    .filter((p: any) => p?.id)
  const uniquePromoters = Array.from(new Map(allPromoters.map((p: any) => [p.id, p])).values())
  const reportsFiled = jobs.filter(j => j.activationReport?.status === 'submitted').length
  const reportsDraft = jobs.filter(j => j.activationReport?.status === 'draft').length

  const campaignRows = jobs.map(j => [
    j.title, j.client || j.brand || '', j.venue || '',
    j.date ? new Date(j.date).toLocaleDateString('en-ZA') : '',
    (j.shifts || []).length, j.totalSlots || 0, j.status,
    j.activationReport?.status === 'submitted' ? 'Filed' : j.activationReport?.status === 'draft' ? 'Draft' : 'Not Started',
  ])

  const rosterRows = uniquePromoters.map((p: any) => [
    p.fullName || '', p.email || '', p.phone || '', p.city || '',
    allPromoters.filter((x: any) => x.id === p.id).length,
  ])

  const reportRows = jobs.filter(j => j.activationReport).map(j => [
    j.title, j.client || j.brand || '',
    j.activationReport.unitsServed ?? 0, j.activationReport.conversions ?? 0,
    j.activationReport.status,
    j.activationReport.submittedAt ? new Date(j.activationReport.submittedAt).toLocaleDateString('en-ZA') : '—',
    j.activationReport.insights || '',
  ])

  const cards = [
    {
      icon: '◈', color: GL, title: 'Campaign Summary', desc: 'Every campaign you supervise — venue, date, staffing, and report status.',
      rows: campaignRows,
      headers: ['Campaign', 'Client', 'Venue', 'Date', 'Promoters', 'Slots', 'Status', 'Report'],
      csv: () => downloadCSV('supervisor-campaign-summary.csv', ['Campaign','Client','Venue','Date','Promoters','Slots','Status','Report'], campaignRows),
      pdf: () => downloadPDF('Campaign Summary', 'Supervisor Portal · Assigned Campaigns', ['Campaign','Client','Venue','Date','Promoters','Slots','Status','Report'], campaignRows),
    },
    {
      icon: '◉', color: G2, title: 'Promoter Roster', desc: 'Every promoter allocated across your campaigns, with contact details.',
      rows: rosterRows,
      headers: ['Name', 'Email', 'Phone', 'City', 'Campaigns'],
      csv: () => downloadCSV('supervisor-promoter-roster.csv', ['Name','Email','Phone','City','Campaigns'], rosterRows),
      pdf: () => downloadPDF('Promoter Roster', 'Supervisor Portal · Promoters On Your Campaigns', ['Name','Email','Phone','City','Campaigns'], rosterRows),
    },
    {
      icon: '📄', color: G3, title: 'Activation Reports', desc: 'Filed activation reports — units served, conversions, and insights.',
      rows: reportRows,
      headers: ['Campaign', 'Client', 'Units Served', 'Conversions', 'Status', 'Submitted', 'Insights'],
      csv: () => downloadCSV('supervisor-activation-reports.csv', ['Campaign','Client','Units Served','Conversions','Status','Submitted','Insights'], reportRows),
      pdf: () => downloadPDF('Activation Reports', 'Supervisor Portal · Filed Activation Reports', ['Campaign','Client','Units Served','Conversions','Status','Submitted','Insights'], reportRows),
    },
  ]

  const summary = [
    { label: 'Campaigns Supervised', value: jobs.length },
    { label: 'Reports Filed',        value: reportsFiled },
    { label: 'Drafts Pending',       value: reportsDraft },
    { label: 'Promoters On Team',    value: uniquePromoters.length },
  ]

  if (loading) {
    return <div style={{ padding: '48px 24px', textAlign: 'center', color: W28, fontFamily: FB }}>Loading your reports…</div>
  }

  return (
    <div style={{ padding: '32px 36px 80px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.36em', textTransform: 'uppercase', color: GL, marginBottom: 8, fontWeight: 700, fontFamily: FD }}>Reporting</div>
        <h1 style={{ fontFamily: FD, fontSize: 26, fontWeight: 700, color: W }}>Reports &amp; Exports</h1>
        <p style={{ fontSize: 12.5, color: W55, marginTop: 4, fontFamily: FB }}>Download your campaign, roster, and activation data as CSV or printable PDF.</p>
      </div>

      {exportMsg && (
        <div style={{ padding: '12px 18px', background: hex2rgba(GL, 0.08), border: `1px solid ${hex2rgba(GL, 0.35)}`, marginBottom: 20, fontSize: 13, color: GL, fontWeight: 700, borderRadius: 3, fontFamily: FD, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>✓</span> {exportMsg}
        </div>
      )}

      {jobs.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: W28, fontFamily: FB, border: `1px dashed ${BB}`, borderRadius: 6 }}>
          You haven't been assigned to any campaigns yet, so there's nothing to report on. Once admin assigns you, your data will show up here.
        </div>
      ) : (
        <>
          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: BB, marginBottom: 24 }}>
            {summary.map((s, i) => (
              <div key={i} style={{ background: D2, padding: '18px 20px', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${GL},${hex2rgba(GL, 0.3)})` }} />
                <div style={{ fontFamily: FD, fontSize: 24, fontWeight: 700, color: W }}>{s.value}</div>
                <div style={{ fontSize: 9, color: W55, marginTop: 4, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: FB }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Export cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {cards.map((c, i) => (
              <div key={i} style={{ background: BC, border: `1px solid ${BB}`, borderRadius: 4, padding: 24, position: 'relative', overflow: 'hidden' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = hex2rgba(c.color, 0.5))}
                onMouseLeave={e => (e.currentTarget.style.borderColor = BB)}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${c.color},${hex2rgba(c.color, 0.3)})` }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 18, color: c.color }}>{c.icon}</span>
                  <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: GL, fontWeight: 700, fontFamily: FD }}>{c.title}</div>
                </div>
                <p style={{ fontSize: 12, color: W55, marginBottom: 18, lineHeight: 1.6, fontFamily: FD }}>{c.desc}</p>
                <div style={{ fontSize: 10, color: W28, marginBottom: 14, fontFamily: FB }}>{c.rows.length} record{c.rows.length !== 1 ? 's' : ''}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {c.rows.length > 0 ? (
                    <>
                      <button onClick={() => doExport(`${c.title} CSV`, c.csv)} style={{
                        padding: '6px 14px', background: `linear-gradient(135deg,${c.color},${hex2rgba(c.color, 0.8)})`,
                        border: `1px solid ${c.color}`, color: B, fontFamily: FD, fontSize: 9, fontWeight: 700,
                        letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase', borderRadius: 3,
                      }}>↓ CSV</button>
                      <button onClick={() => doExport(`${c.title} PDF`, c.pdf)} style={{
                        padding: '6px 14px', background: 'transparent', border: `1px solid ${c.color}`, color: c.color,
                        fontFamily: FD, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer',
                        textTransform: 'uppercase', borderRadius: 3,
                      }}>↓ PDF</button>
                    </>
                  ) : (
                    <span style={{ fontSize: 11, color: W28, fontFamily: FB }}>Nothing to export yet</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default SupervisorReportsTab
