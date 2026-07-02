import { useState } from 'react'
import { AdminLayout } from '../AdminLayout'

const G   = '#8F8A7C'
const GL  = '#C9BFA6'
const G3  = '#7A756A'
const G4  = '#D8D8D8'
const B   = '#050504'
const D2  = '#0A0A08'
const BB  = 'rgba(170,160,135,0.16)'
const BB2 = 'rgba(170,160,135,0.06)'
const W   = '#F8F8F8'
const WM  = 'rgba(248,248,248,0.82)'
const WD  = 'rgba(248,248,248,0.58)'
const FD  = "'Playfair Display', Georgia, serif"

function hex2rgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a   = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

const today = () => new Date().toISOString().slice(0, 10)

function exportCSV(rows: string[][], filename: string) {
  const csv = rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n')
  triggerDownload(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }), filename)
}

// Excel export — creates a simple .xls (HTML table format, opens in Excel)
function exportExcel(headers: string[], rows: (string|number)[][], filename: string) {
  const ths = headers.map(h => `<th style="background:#0A0A08;color:#C9BFA6;padding:8px 12px;border:1px solid #292929;font-family:Georgia,serif;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">${h}</th>`).join('')
  const trs = rows.map(row =>
    `<tr>${row.map(cell => `<td style="padding:8px 12px;border:1px solid #17170F;color:#0A0A08;font-family:Arial,sans-serif;font-size:12px;">${cell ?? ''}</td>`).join('')}</tr>`
  ).join('')
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></body></html>`
  triggerDownload(new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' }), filename)
}

function exportPDF(htmlContent: string, filename: string) {
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${filename}</title></head><body>${htmlContent}</body></html>`
  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const win  = window.open(url, '_blank')
  if (win) { win.addEventListener('load', () => { setTimeout(() => { win.focus(); win.print() }, 600) }); setTimeout(() => URL.revokeObjectURL(url), 15_000) }
  else { triggerDownload(blob, filename + '.html'); URL.revokeObjectURL(url) }
}

interface CalcState { rate: number; hours: number; promoters: number }

interface PayRecord {
  id: string; promoter: string; email: string; bank: string; accountNo: string
  job: string; client: string; date: string; hours: number; rate: number
  deductions: number; status: string
}

const gross  = (r: PayRecord) => r.hours * r.rate
const net    = (r: PayRecord) => gross(r) - r.deductions
const fmtZAR = (n: number)   => `R${n.toLocaleString('en-ZA')}`

const MOCK_RECORDS: PayRecord[] = [
  { id:'PAY-001', promoter:'Ayanda Dlamini',  email:'ayanda@email.com',  bank:'FNB',      accountNo:'****4521', job:'Red Bull — Sandton',        client:'Red Bull SA',  date:'2026-03-08', hours:8, rate:120, deductions:0,   status:'pending'  },
  { id:'PAY-002', promoter:'Thabo Nkosi',     email:'thabo@email.com',   bank:'Capitec',  accountNo:'****7832', job:'Red Bull — Sandton',        client:'Red Bull SA',  date:'2026-03-08', hours:8, rate:120, deductions:50,  status:'pending'  },
  { id:'PAY-003', promoter:'Sipho Mhlongo',   email:'sipho@email.com',   bank:'ABSA',     accountNo:'****3301', job:'Nike — Mall of Africa',     client:'Nike SA',      date:'2026-03-07', hours:8, rate:135, deductions:0,   status:'approved' },
  { id:'PAY-004', promoter:'Zanele Motha',    email:'zanele@email.com',  bank:'Standard', accountNo:'****9914', job:'Nike — Mall of Africa',     client:'Nike SA',      date:'2026-03-07', hours:8, rate:135, deductions:0,   status:'approved' },
  { id:'PAY-005', promoter:'Bongani Khumalo', email:'bongani@email.com', bank:'Nedbank',  accountNo:'****5542', job:'Savanna — Gateway',         client:'Distell',      date:'2026-03-06', hours:8, rate:115, deductions:100, status:'exported' },
  { id:'PAY-006', promoter:'Lerato Mokoena',  email:'lerato@email.com',  bank:'FNB',      accountNo:'****2278', job:'Nedbank Golf Day',          client:'Nedbank',      date:'2026-03-05', hours:8, rate:150, deductions:0,   status:'paid'     },
  { id:'PAY-007', promoter:'Nomsa Zulu',      email:'nomsa@email.com',   bank:'Capitec',  accountNo:'****6612', job:'Heineken — Mall of Africa', client:'Heineken SA',  date:'2026-03-09', hours:8, rate:120, deductions:0,   status:'pending'  },
  { id:'PAY-008', promoter:'Kagiso Radebe',   email:'kagiso@email.com',  bank:'ABSA',     accountNo:'****8843', job:'MTN Soweto Festival',       client:'MTN SA',       date:'2026-03-10', hours:8, rate:110, deductions:0,   status:'approved' },
]

// ── Build functions ───────────────────────────────────────────────────────────
const payrollHeaders = ['ID','Promoter','Email','Bank','Account No','Job','Client','Date','Hours','Rate (R)','Gross (R)','Deductions (R)','Net Payout (R)','Status']
const payrollRows    = (records: PayRecord[]) => records.map(r => [r.id, r.promoter, r.email, r.bank, r.accountNo, r.job, r.client, r.date, r.hours, r.rate, gross(r), r.deductions, net(r), r.status])

const attendanceHeaders = ['Shift ID','Promoter','Job','Client','Date','Hours Worked','Rate','Gross']
const attendanceRows    = (records: PayRecord[]) => records.map(r => [r.id, r.promoter, r.job, r.client, r.date, r.hours, `R${r.rate}`, fmtZAR(gross(r))])

function buildCampaignPDFHtml(records: PayRecord[]): string {
  const byClient: Record<string, PayRecord[]> = {}
  records.forEach(r => { byClient[r.client] = byClient[r.client] || []; byClient[r.client].push(r) })
  const clientSections = Object.entries(byClient).map(([client, cr]) => {
    const totalHours = cr.reduce((s, r) => s + r.hours, 0)
    const totalCost  = cr.reduce((s, r) => s + net(r), 0)
    const promoters  = new Set(cr.map(r => r.promoter)).size
    const rows = cr.map(r => `<tr><td>${r.promoter}</td><td>${r.job}</td><td>${r.date}</td><td style="text-align:center">${r.hours}h</td><td>R${r.rate}/hr</td><td style="color:#C9BFA6;font-weight:700">${fmtZAR(net(r))}</td><td style="text-transform:capitalize">${r.status}</td></tr>`).join('')
    return `<div class="section"><div class="client-name">${client}</div><div class="summary"><div class="card"><div class="card-label">Promoters</div><div class="card-value">${promoters}</div></div><div class="card"><div class="card-label">Shifts</div><div class="card-value">${cr.length}</div></div><div class="card"><div class="card-label">Total Hours</div><div class="card-value">${totalHours}h</div></div><div class="card"><div class="card-label">Total Payout</div><div class="card-value" style="color:#C9BFA6">${fmtZAR(totalCost)}</div></div></div><table><thead><tr><th>Promoter</th><th>Job</th><th>Date</th><th>Hours</th><th>Rate</th><th>Net Payout</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>`
  }).join('')
  return `<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,serif;background:#050504;color:#F8F8F8;padding:48px;font-size:13px}.header{border-bottom:2px solid #8F8A7C;padding-bottom:24px;margin-bottom:36px}.logo{font-size:26px;font-weight:700;color:#C9BFA6}.logo span{color:#F8F8F8}.sub{font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:#7A756A;margin-top:6px}.date{font-size:11px;color:rgba(248,248,248,.45);margin-top:10px}.section{margin-bottom:44px;page-break-inside:avoid}.client-name{font-size:15px;font-weight:700;color:#C9BFA6;border-left:3px solid #C9BFA6;padding-left:12px;margin-bottom:14px}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}.card{background:rgba(170,160,135,.08);border:1px solid rgba(170,160,135,.2);padding:12px 14px;border-radius:3px}.card-label{font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:rgba(248,248,248,.5);margin-bottom:6px}.card-value{font-size:20px;font-weight:700;color:#F8F8F8}table{width:100%;border-collapse:collapse;font-size:12px}thead tr{background:rgba(170,160,135,.1)}th{padding:9px 12px;text-align:left;font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:rgba(248,248,248,.5);border-bottom:1px solid rgba(170,160,135,.2)}td{padding:9px 12px;border-bottom:1px solid rgba(170,160,135,.08);color:rgba(248,248,248,.85)}.footer{margin-top:40px;padding-top:14px;border-top:1px solid rgba(170,160,135,.18);font-size:10px;color:rgba(248,248,248,.25)}@media print{body{background:#fff;color:#111}.logo{color:#6E6A5E}.client-name{color:#6E6A5E;border-color:#6E6A5E}.card{background:#F1F1F1}.card-value{color:#111}td{color:#333}}</style><div class="header"><div class="logo">HONEY <span>GROUP</span></div><div class="sub">Campaign Attendance &amp; Payroll Report</div><div class="date">Generated: ${new Date().toLocaleDateString('en-ZA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div></div>${clientSections}<div class="footer">Honey Group · Campaign Report · Confidential · ${new Date().toISOString()}</div>`
}

function buildJobsData() {
  const stored = localStorage.getItem('hg_admin_jobs')
  const jobs   = stored ? JSON.parse(stored) : []
  const headers = ['ID','Title','Company','Location','Date','Pay','Slots','Slots Left','Type','Status']
  const rows    = jobs.map((j: any) => [j.id, j.title, j.company||j.client, j.location||`${j.venue}, ${j.city}`, j.jobDate||j.date, j.pay||`R${j.hourlyRate}/hr`, j.slots||j.totalSlots, j.slotsLeft??(j.totalSlots-j.filledSlots), j.type||j.category, j.status])
  return { headers, rows, empty: jobs.length === 0 }
}

function buildPromotersData() {
  const stored = localStorage.getItem('hg_promoters_cache')
  const users  = stored ? JSON.parse(stored) : []
  const headers = ['ID','Name','Email','City','Reliability Score','Status','Joined']
  const rows    = users.map((u: any) => [u.id, u.fullName||u.name, u.email, u.city, u.reliabilityScore??'', u.status, u.createdAt?.slice(0,10)??''])
  return { headers, rows, empty: users.length === 0 }
}

// ── Export card ───────────────────────────────────────────────────────────────
function ExportCard({ icon, title, description, color, onCSV, onPDF, onExcel }: {
  icon: string; title: string; description: string; color: string
  onCSV?: () => void; onPDF?: () => void; onExcel?: () => void
}) {
  const [hover, setHover] = useState(false)
  const btnStyle = (c: string): React.CSSProperties => ({
    padding: '7px 14px', background: 'transparent', border: `1px solid ${hex2rgba(c, 0.5)}`,
    color: c, fontFamily: FD, fontSize: 10, fontWeight: 700, cursor: 'pointer',
    borderRadius: 3, letterSpacing: '0.08em', transition: 'all 0.18s', whiteSpace: 'nowrap' as const,
  })
  return (
    <div
      style={{ background: hover ? hex2rgba(color, 0.07) : D2, border: `1px solid ${hover ? hex2rgba(color, 0.5) : BB}`, borderRadius: 4, padding: '22px 22px 18px', transition: 'all 0.18s', position: 'relative', overflow: 'hidden' }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: hover ? `linear-gradient(90deg,${color},${hex2rgba(color, 0.3)})` : 'transparent', transition: 'all 0.18s' }} />
      <div style={{ fontSize: 22, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: W, fontFamily: FD, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: WM, fontFamily: FD, lineHeight: 1.6, marginBottom: 16 }}>{description}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {onCSV   && <button style={btnStyle(G3)}  onClick={onCSV}   onMouseEnter={e => (e.currentTarget.style.background = hex2rgba(G3,0.15))}  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>↓ CSV</button>}
        {onExcel && <button style={btnStyle(GL)}  onClick={onExcel} onMouseEnter={e => (e.currentTarget.style.background = hex2rgba(GL,0.15))}  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>↓ Excel</button>}
        {onPDF   && <button style={btnStyle(G4)}  onClick={onPDF}   onMouseEnter={e => (e.currentTarget.style.background = hex2rgba(G4,0.15))}  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>↓ PDF</button>}
      </div>
    </div>
  )
}

export default function ReportsExports() {
  const [calc,   setCalc  ] = useState<CalcState>({ rate: 120, hours: 8, promoters: 6 })
  const [notice, setNotice] = useState<string | null>(null)

  const flash = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(null), 4000) }
  const totalPayout = calc.rate * calc.hours * calc.promoters

  const inp: React.CSSProperties = { background: BB2, border: `1px solid ${BB}`, padding: '12px 16px', fontFamily: FD, fontSize: 15, color: W, outline: 'none', borderRadius: 3, width: '100%' }
  const lbl: React.CSSProperties = { fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: WM, display: 'block', marginBottom: 8, fontFamily: FD }

  return (
    <AdminLayout>
      <div style={{ padding: '40px 48px' }}>

        {/* HEADER */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.38em', textTransform: 'uppercase', color: GL, marginBottom: 8, fontWeight: 700, fontFamily: FD }}>System · Reporting</div>
          <h1 style={{ fontFamily: FD, fontSize: 30, fontWeight: 700, color: W }}>Reports &amp; Exports</h1>
          <p style={{ fontSize: 13, color: WM, marginTop: 6, fontFamily: FD }}>Download platform data as CSV, Excel, or PDF directly to your device.</p>
        </div>

        {/* FLASH */}
        {notice && (
          <div style={{ padding: '13px 20px', background: hex2rgba(GL, 0.10), border: `1px solid ${hex2rgba(GL, 0.45)}`, borderRadius: 4, marginBottom: 24, fontSize: 13, color: GL, fontFamily: FD, fontWeight: 700 }}>
            ✓ {notice}
          </div>
        )}

        {/* EXPORT CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 32 }}>

          <ExportCard
            icon="📄" title="Full Payroll Register" color={G3}
            description="All promoter payout records with bank details, hours, rates, and net pay."
            onCSV={() => { exportCSV([payrollHeaders, ...payrollRows(MOCK_RECORDS)] as string[][], `honey-group-payroll-${today()}.csv`); flash('Payroll CSV downloaded') }}
            onExcel={() => { exportExcel(payrollHeaders, payrollRows(MOCK_RECORDS), `honey-group-payroll-${today()}.xls`); flash('Payroll Excel downloaded') }}
            onPDF={() => { exportPDF(buildCampaignPDFHtml(MOCK_RECORDS), `honey-group-payroll-${today()}`); flash('Payroll PDF export initiated') }}
          />

          <ExportCard
            icon="📋" title="Campaign Client Report" color={GL}
            description="Per-client attendance and payout summary grouped by client."
            onCSV={() => { exportCSV([payrollHeaders, ...payrollRows(MOCK_RECORDS)] as string[][], `honey-group-campaign-${today()}.csv`); flash('Campaign CSV downloaded') }}
            onExcel={() => { exportExcel(payrollHeaders, payrollRows(MOCK_RECORDS), `honey-group-campaign-${today()}.xls`); flash('Campaign Excel downloaded') }}
            onPDF={() => { exportPDF(buildCampaignPDFHtml(MOCK_RECORDS), `honey-group-campaign-${today()}`); flash('Campaign PDF export initiated — check your browser print dialog') }}
          />

          <ExportCard
            icon="💼" title="Jobs Register" color={G4}
            description="All active and archived jobs with slots, pay rates, locations, and status."
            onCSV={() => { const d = buildJobsData(); if (d.empty) { flash('No jobs data available'); return }; exportCSV([d.headers, ...d.rows] as string[][], `honey-group-jobs-${today()}.csv`); flash('Jobs CSV downloaded') }}
            onExcel={() => { const d = buildJobsData(); if (d.empty) { flash('No jobs data available'); return }; exportExcel(d.headers, d.rows, `honey-group-jobs-${today()}.xls`); flash('Jobs Excel downloaded') }}
            onPDF={() => { const d = buildJobsData(); if (d.empty) { flash('No jobs data available'); return }; const trs = d.rows.map((r: string[]) => `<tr>${r.map((c: string) => `<td>${c}</td>`).join('')}</tr>`).join(''); exportPDF(`<style>body{font-family:Georgia;background:#050504;color:#F8F8F8;padding:40px}table{width:100%;border-collapse:collapse}th{background:rgba(170,160,135,0.2);padding:8px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#C9BFA6}td{padding:8px;border-bottom:1px solid rgba(170,160,135,0.12);font-size:12px;color:rgba(248,248,248,0.85)}</style><h2 style="color:#C9BFA6;font-family:Georgia;margin-bottom:24px">Jobs Register</h2><table><thead><tr>${d.headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${trs}</tbody></table>`, `honey-group-jobs-${today()}`); flash('Jobs PDF export initiated') }}
          />

          <ExportCard
            icon="👥" title="Promoter Roster" color={G3}
            description="Full promoter list with city, reliability scores, and onboarding status."
            onCSV={() => { const d = buildPromotersData(); if (d.empty) { flash('No promoter data available'); return }; exportCSV([d.headers, ...d.rows] as string[][], `honey-group-promoters-${today()}.csv`); flash('Promoters CSV downloaded') }}
            onExcel={() => { const d = buildPromotersData(); if (d.empty) { flash('No promoter data available'); return }; exportExcel(d.headers, d.rows, `honey-group-promoters-${today()}.xls`); flash('Promoters Excel downloaded') }}
            onPDF={() => { const d = buildPromotersData(); if (d.empty) { flash('No promoter data available'); return }; const trs = d.rows.map((r: string[]) => `<tr>${r.map((c: string)=>`<td>${c}</td>`).join('')}</tr>`).join(''); exportPDF(`<style>body{font-family:Georgia;background:#050504;color:#F8F8F8;padding:40px}table{width:100%;border-collapse:collapse}th{background:rgba(170,160,135,0.2);padding:8px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#C9BFA6}td{padding:8px;border-bottom:1px solid rgba(170,160,135,0.12);font-size:12px;color:rgba(248,248,248,0.85)}</style><h2 style="color:#C9BFA6;font-family:Georgia;margin-bottom:24px">Promoter Roster</h2><table><thead><tr>${d.headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${trs}</tbody></table>`, `honey-group-promoters-${today()}`); flash('Promoters PDF export initiated') }}
          />

          <ExportCard
            icon="🏦" title="EFT Batch File" color={GL}
            description="Bank-ready payment batch — approved payroll records only."
            onCSV={() => {
              const approved = MOCK_RECORDS.filter(r => r.status === 'approved')
              if (!approved.length) { flash('No approved records to export'); return }
              const headers = ['Promoter','Email','Bank','Account No','Net Payout (R)','Job','Date']
              const rows    = approved.map(r => [r.promoter, r.email, r.bank, r.accountNo, net(r), r.job, r.date])
              exportCSV([headers, ...rows] as string[][], `honey-group-eft-batch-${today()}.csv`)
              flash(`EFT batch CSV downloaded — ${approved.length} records`)
            }}
            onExcel={() => {
              const approved = MOCK_RECORDS.filter(r => r.status === 'approved')
              if (!approved.length) { flash('No approved records to export'); return }
              const headers = ['Promoter','Email','Bank','Account No','Net Payout (R)','Job','Date']
              const rows    = approved.map(r => [r.promoter, r.email, r.bank, r.accountNo, net(r), r.job, r.date])
              exportExcel(headers, rows, `honey-group-eft-batch-${today()}.xls`)
              flash(`EFT batch Excel downloaded — ${approved.length} records`)
            }}
            onPDF={() => {
              const approved = MOCK_RECORDS.filter(r => r.status === 'approved')
              if (!approved.length) { flash('No approved records to export'); return }
              const trs = approved.map(r => `<tr><td>${r.promoter}</td><td>${r.email}</td><td>${r.bank}</td><td>${r.accountNo}</td><td style="color:#C9BFA6;font-weight:700">${fmtZAR(net(r))}</td><td>${r.job}</td><td>${r.date}</td></tr>`).join('')
              exportPDF(`<style>body{font-family:Georgia;background:#050504;color:#F8F8F8;padding:40px}table{width:100%;border-collapse:collapse}th{background:rgba(170,160,135,0.2);padding:8px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#C9BFA6}td{padding:8px;border-bottom:1px solid rgba(170,160,135,0.12);font-size:12px;color:rgba(248,248,248,0.85)}</style><h2 style="color:#C9BFA6;font-family:Georgia;margin-bottom:24px">EFT Batch — ${approved.length} Records</h2><table><thead><tr><th>Promoter</th><th>Email</th><th>Bank</th><th>Account No</th><th>Net Payout</th><th>Job</th><th>Date</th></tr></thead><tbody>${trs}</tbody></table>`, `honey-group-eft-batch-${today()}`)
              flash('EFT PDF export initiated')
            }}
          />

          <ExportCard
            icon="📊" title="Attendance Summary" color={G4}
            description="Shift-level attendance log: hours worked, job, client, and promoter per shift."
            onCSV={() => { exportCSV([attendanceHeaders, ...attendanceRows(MOCK_RECORDS)] as string[][], `honey-group-attendance-${today()}.csv`); flash('Attendance CSV downloaded') }}
            onExcel={() => { exportExcel(attendanceHeaders, attendanceRows(MOCK_RECORDS), `honey-group-attendance-${today()}.xls`); flash('Attendance Excel downloaded') }}
            onPDF={() => {
              const trs = attendanceRows(MOCK_RECORDS).map(r => `<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')
              exportPDF(`<style>body{font-family:Georgia;background:#050504;color:#F8F8F8;padding:40px}table{width:100%;border-collapse:collapse}th{background:rgba(170,160,135,0.2);padding:8px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#C9BFA6}td{padding:8px;border-bottom:1px solid rgba(170,160,135,0.12);font-size:12px;color:rgba(248,248,248,0.85)}</style><h2 style="color:#C9BFA6;font-family:Georgia;margin-bottom:24px">Attendance Summary</h2><table><thead><tr>${attendanceHeaders.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${trs}</tbody></table>`, `honey-group-attendance-${today()}`)
              flash('Attendance PDF export initiated')
            }}
          />

        </div>

        {/* PAYOUT CALCULATOR */}
        <div style={{ background: D2, border: `1px solid ${BB}`, borderRadius: 4, padding: '28px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <span style={{ fontSize: 14, color: GL }}>◈</span>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: GL, fontFamily: FD }}>Promoter Payout Calculator</div>
            <span style={{ fontSize: 10, color: WD, fontFamily: FD }}>Estimate only</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, alignItems: 'end' }}>
            <div>
              <label style={lbl}>Hourly Rate (R)</label>
              <input type="number" value={calc.rate} min={0} onChange={e => setCalc(p => ({ ...p, rate: +e.target.value }))} style={inp}
                onFocus={e => e.currentTarget.style.borderColor = GL} onBlur={e => e.currentTarget.style.borderColor = BB} />
            </div>
            <div>
              <label style={lbl}>Hours Per Shift</label>
              <input type="number" value={calc.hours} min={1} max={24} onChange={e => setCalc(p => ({ ...p, hours: +e.target.value }))} style={inp}
                onFocus={e => e.currentTarget.style.borderColor = GL} onBlur={e => e.currentTarget.style.borderColor = BB} />
            </div>
            <div>
              <label style={lbl}>No. of Promoters</label>
              <input type="number" value={calc.promoters} min={1} onChange={e => setCalc(p => ({ ...p, promoters: +e.target.value }))} style={inp}
                onFocus={e => e.currentTarget.style.borderColor = GL} onBlur={e => e.currentTarget.style.borderColor = BB} />
            </div>
            <div style={{ background: `linear-gradient(135deg,${hex2rgba(G3,0.28)},${hex2rgba(G,0.18)})`, border: `1px solid ${hex2rgba(GL,0.5)}`, borderRadius: 4, padding: '18px 22px' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: WM, fontFamily: FD, marginBottom: 8 }}>Total Payout</div>
              <div style={{ fontFamily: FD, fontSize: 28, fontWeight: 700, color: GL }}>R {totalPayout.toLocaleString('en-ZA')}</div>
            </div>
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
            <button onClick={() => {
              const headers = ['Description','Value']
              const rows: string[][] = [['Hourly Rate (R)',`R${calc.rate}`],['Hours Per Shift',`${calc.hours}h`],['No. of Promoters',`${calc.promoters}`],['Total Payout (R)',`R${totalPayout.toLocaleString('en-ZA')}`],['Generated',new Date().toISOString()]]
              exportCSV([headers,...rows], `honey-group-payout-estimate-${today()}.csv`); flash('Payout estimate CSV downloaded')
            }} style={{ padding:'9px 18px', background:'transparent', border:`1px solid ${G3}`, color:G3, fontFamily:FD, fontSize:11, fontWeight:700, cursor:'pointer', borderRadius:3, letterSpacing:'0.08em' }}
              onMouseEnter={e => e.currentTarget.style.background = hex2rgba(G3,0.15)}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              ↓ CSV
            </button>
            <button onClick={() => {
              const headers = ['Description','Value']
              const rows: (string|number)[][] = [['Hourly Rate (R)',`R${calc.rate}`],['Hours Per Shift',`${calc.hours}h`],['No. of Promoters',calc.promoters],['Total Payout (R)',`R${totalPayout.toLocaleString('en-ZA')}`]]
              exportExcel(headers, rows, `honey-group-payout-estimate-${today()}.xls`); flash('Payout estimate Excel downloaded')
            }} style={{ padding:'9px 18px', background:'transparent', border:`1px solid ${GL}`, color:GL, fontFamily:FD, fontSize:11, fontWeight:700, cursor:'pointer', borderRadius:3, letterSpacing:'0.08em' }}
              onMouseEnter={e => e.currentTarget.style.background = hex2rgba(GL,0.15)}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              ↓ Excel
            </button>
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}