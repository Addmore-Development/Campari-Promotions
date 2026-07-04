// Admin/ReportsTab.tsx
// Drop-in replacement for the ReportsTab section inside AdminDashboard.
// Exports generate real downloadable files (CSV, Excel-compatible CSV, PDF via print).

import { useState } from 'react'

const G    = '#8F8A7C'
const GL   = '#C9BFA6'
const G2   = '#8A8474'
const G3   = '#7A756A'
const G4   = '#D8D8D8'
const G5   = '#443F36'
const B    = '#050504'
const D2   = '#0A0A08'
const BB   = 'rgba(170,160,135,0.16)'
const BB2  = 'rgba(170,160,135,0.06)'
const W    = '#F8F8F8'
const W55  = 'rgba(248,248,248,0.55)'
const W28  = 'rgba(248,248,248,0.28)'
const FD   = "'Playfair Display', Georgia, serif"

function hex2rgba(hex: string, alpha: number): string {
  const h=hex.replace('#','')
  const r=parseInt(h.substring(0,2),16), g=parseInt(h.substring(2,4),16), b=parseInt(h.substring(4,6),16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ─── Download helpers ─────────────────────────────────────────────────────────

function downloadCSV(filename: string, rows: string[][], headers: string[]) {
  const escape = (v: string) => `"${String(v).replace(/"/g,'""')}"`
  const lines = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url)
}

function downloadExcel(filename: string, rows: string[][], headers: string[]) {
  // Excel-compatible CSV with BOM
  const escape = (v: string) => `"${String(v).replace(/"/g,'""')}"`
  const lines = [headers.map(escape).join('\t'), ...rows.map(r => r.map(escape).join('\t'))]
  const bom = '\uFEFF'
  const blob = new Blob([bom + lines.join('\n')], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url)
}

function downloadPDF(title: string, content: string) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    body{font-family:'Georgia',serif;color:#12120D;background:#fff;padding:40px;max-width:800px;margin:0 auto;}
    h1{font-size:24px;border-bottom:2px solid #8F8A7C;padding-bottom:12px;margin-bottom:24px;color:#050504;}
    h2{font-size:16px;color:#8A8474;margin-top:24px;}
    table{width:100%;border-collapse:collapse;margin-top:12px;}
    th{background:#8F8A7C;color:#fff;padding:8px 12px;text-align:left;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;}
    td{padding:8px 12px;border-bottom:1px solid #DBDBDB;font-size:12px;}
    tr:nth-child(even) td{background:#F9F9F9;}
    .meta{font-size:11px;color:#888;margin-bottom:32px;}
    @media print{body{padding:20px;}}
  </style></head><body>
  <h1>${title}</h1>
  <div class="meta">Generated: ${new Date().toLocaleString('en-ZA')} · HoneyGroup Promotions Admin Console</div>
  ${content}
  </body></html>`
  const blob = new Blob([html], { type: 'text/html' })
  const url  = URL.createObjectURL(blob)
  const w    = window.open(url, '_blank')
  if (w) { w.onload = () => { w.print(); URL.revokeObjectURL(url) } }
  else { URL.revokeObjectURL(url) }
}

// ─── Mock data for exports ────────────────────────────────────────────────────

const MOCK_CAMPAIGN_DATA = [
  ['JB-201','Castle Lager Launch','SABMiller SA','Sandton City','2026-03-22','6','5','R 4,750'],
  ['JB-202','Red Bull Sampling','Red Bull SA','V&A Waterfront','2026-03-23','4','4','R 3,200'],
  ['JB-205','Heineken Roadshow','Heineken SA','Mall of Africa','2026-03-29','5','3','R 2,640'],
  ['JB-208','MTN Brand Ambassador','MTN SA','Maponya Mall','2026-04-05','10','7','R 6,300'],
  ['JB-210','Absolut Night Activation','Pernod Ricard SA','Rosebank','2026-03-28','6','6','R 6,600'],
]

const MOCK_PROMOTER_DATA = [
  ['P001','Ayanda Dlamini','ayanda@email.com','+27 71 234 5678','Johannesburg','24','4.8','R 28,800'],
  ['P002','Thabo Nkosi','thabo@email.com','+27 82 345 6789','Johannesburg','18','4.6','R 21,600'],
  ['P003','Lerato Mokoena','lerato@email.com','+27 63 456 7890','Cape Town','31','4.9','R 37,200'],
  ['P004','Nomsa Zulu','nomsa@email.com','+27 83 678 9012','Pretoria','9','4.5','R 10,350'],
  ['P005','Zanele Motha','zanele@email.com','+27 79 890 1234','Johannesburg','6','4.7','R 8,100'],
]

const MOCK_ATTENDANCE_DATA = [
  ['2026-03-22','08:02','16:08','JB-201','Castle Lager Launch','Sandton City','Ayanda Dlamini','✓ Verified'],
  ['2026-03-22','08:15','16:10','JB-201','Castle Lager Launch','Sandton City','Thabo Nkosi','✓ Verified'],
  ['2026-03-23','09:00','15:03','JB-202','Red Bull Sampling','V&A Waterfront','Lerato Mokoena','✓ Verified'],
  ['2026-03-28','18:55','02:05','JB-210','Absolut Night Activation','Rosebank','Ayanda Dlamini','✓ Verified'],
  ['2026-03-29','09:01','17:02','JB-205','Heineken Roadshow','Mall of Africa','Nomsa Zulu','✓ Verified'],
]

const MOCK_PAYOUT_DATA = [
  ['Ayanda Dlamini','ayanda@email.com','FNB','62345678901','R 950','8','R 7,600','2026-03-31'],
  ['Thabo Nkosi','thabo@email.com','Standard Bank','12345678901','R 880','8','R 7,040','2026-03-31'],
  ['Lerato Mokoena','lerato@email.com','Capitec','98765432101','R 750','6','R 4,500','2026-04-07'],
  ['Nomsa Zulu','nomsa@email.com','Nedbank','55512345678','R 880','8','R 7,040','2026-04-07'],
  ['Zanele Motha','zanele@email.com','ABSA','77712345678','R 700','6','R 4,200','2026-04-14'],
]

// ─── Export actions ───────────────────────────────────────────────────────────

function exportCampaignCSV() {
  downloadCSV('hg-campaign-report.csv', MOCK_CAMPAIGN_DATA,
    ['Job ID','Campaign Title','Client','Location','Event Date','Total Slots','Filled Slots','Total Payout'])
}

function exportCampaignPDF() {
  const rows = MOCK_CAMPAIGN_DATA.map(r => `<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')
  downloadPDF('Campaign Attendance Report',
    `<table><thead><tr><th>Job ID</th><th>Campaign</th><th>Client</th><th>Location</th><th>Date</th><th>Slots</th><th>Filled</th><th>Payout</th></tr></thead><tbody>${rows}</tbody></table>`)
}

function exportRosterCSV() {
  downloadCSV('hg-promoter-roster.csv', MOCK_PROMOTER_DATA,
    ['Promoter ID','Full Name','Email','Phone','City','Jobs Completed','Reliability Score','Total Earnings'])
}

function exportRosterExcel() {
  downloadExcel('hg-promoter-roster.xlsx', MOCK_PROMOTER_DATA,
    ['Promoter ID','Full Name','Email','Phone','City','Jobs Completed','Reliability Score','Total Earnings'])
}

function exportAttendanceCSV() {
  downloadCSV('hg-attendance-log.csv', MOCK_ATTENDANCE_DATA,
    ['Date','Check-in','Check-out','Job ID','Campaign','Location','Promoter','Status'])
}

function exportAttendancePDF() {
  const rows = MOCK_ATTENDANCE_DATA.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')
  downloadPDF('Geo-Verified Attendance Log',
    `<table><thead><tr><th>Date</th><th>In</th><th>Out</th><th>Job</th><th>Campaign</th><th>Location</th><th>Promoter</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`)
}

function exportPayoutCSV() {
  downloadCSV('hg-promoter-payouts.csv', MOCK_PAYOUT_DATA,
    ['Promoter Name','Email','Bank','Account No','Rate','Hours','Payout Amount','Payment Date'])
}

function exportPayoutExcel() {
  downloadExcel('hg-promoter-payouts.xlsx', MOCK_PAYOUT_DATA,
    ['Promoter Name','Email','Bank','Account No','Rate','Hours','Payout Amount','Payment Date'])
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props { regs: any[] }

const INITIAL_MOCK_CLIENTS_ACTIVE = 5 // matches AdminDashboard constant

export default function ReportsTab({ regs }: Props) {
  const [exportMsg,  setExportMsg ] = useState('')
  const [hourlyRate, setHourlyRate] = useState('120')
  const [hours,      setHours     ] = useState('8')
  const [numPromos,  setNumPromos ] = useState('6')

  function doExport(label: string, fn: ()=>void) {
    fn()
    setExportMsg(`${label} downloaded.`)
    setTimeout(()=>setExportMsg(''), 3500)
  }

  const calcTotal = parseFloat(hourlyRate||'0') * parseFloat(hours||'0') * parseFloat(numPromos||'0')

  const isPending = (s: string) => s === 'pending' || s === 'pending_review'

  // Dynamic summary pulling from real regs
  const summary = [
    { label:'Registered Promoters',         value: regs.filter(r=>r.role==='promoter').length },
    { label:'Active Promoters',             value: regs.filter(r=>r.role==='promoter'&&r.status==='approved').length },
    { label:'Active Clients',               value: INITIAL_MOCK_CLIENTS_ACTIVE },
    { label:'Pending Approvals',            value: regs.filter(r=>isPending(r.status)).length },
    { label:'Shifts This Month (Est.)',     value: 42 },
    { label:'Est. Promoter Payout (Month)',value: `R ${(parseFloat(hourlyRate)*parseFloat(hours)*parseFloat(numPromos)).toLocaleString('en-ZA',{minimumFractionDigits:0})}` },
  ]

  const inputStyle: React.CSSProperties = { width:'100%', background:BB2, border:`1px solid ${BB}`, padding:'10px 14px', color:W, fontFamily:FD, fontSize:13, outline:'none', borderRadius:3 }

  const cards = [
    {
      icon:'✦', color:G3, title:'Campaign Reports', desc:'Attendance and performance data per campaign, ready for client delivery.',
      btns:[
        { label:'CSV',   action:()=>doExport('Campaign CSV',   exportCampaignCSV)   },
        { label:'Excel', action:()=>doExport('Campaign Excel', ()=>downloadExcel('hg-campaign-report.xlsx', MOCK_CAMPAIGN_DATA, ['Campaign','Promoters','Hours','Payout','Status'])) },
        { label:'PDF',   action:()=>doExport('Campaign PDF',   exportCampaignPDF)   },
      ]
    },
    {
      icon:'▤', color:G2, title:'Promoter Roster', desc:'All active promoters with contact details, city, and reliability scores.',
      btns:[
        { label:'CSV',   action:()=>doExport('Roster CSV',   exportRosterCSV)   },
        { label:'Excel', action:()=>doExport('Roster Excel', exportRosterExcel) },
        { label:'PDF',   action:()=>doExport('Roster PDF',   ()=>downloadPDF('Promoter Roster', MOCK_PROMOTER_DATA.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join(''))) },
      ]
    },
    {
      icon:'⬡', color:GL, title:'Attendance Log', desc:'Geo-verified check-in/out records with timestamps for all shifts.',
      btns:[
        { label:'CSV',   action:()=>doExport('Attendance CSV',   exportAttendanceCSV)   },
        { label:'Excel', action:()=>doExport('Attendance Excel', ()=>downloadExcel('hg-attendance-log.xlsx', MOCK_ATTENDANCE_DATA, ['Promoter','Job','Date','Check-in','Check-out','Hours','Status'])) },
        { label:'PDF',   action:()=>doExport('Attendance PDF',   exportAttendancePDF)   },
      ]
    },
    {
      icon:'◉', color:G4, title:'Promoter Payout', desc:'Calculated payout amounts per promoter — for bank payment processing.',
      btns:[
        { label:'CSV',   action:()=>doExport('Payout CSV',   exportPayoutCSV)   },
        { label:'Excel', action:()=>doExport('Payout Excel', exportPayoutExcel) },
        { label:'PDF',   action:()=>doExport('Payout PDF',   ()=>downloadPDF('Promoter Payout', MOCK_PAYOUT_DATA.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join(''))) },
      ]
    },
    {
      icon:'📄', color:G3, title:'Full Payroll Register', desc:'All promoter payout records with bank details, hours, rates, and net pay.',
      btns:[
        { label:'CSV',   action:()=>doExport('Payroll CSV',   exportPayoutCSV)   },
        { label:'Excel', action:()=>doExport('Payroll Excel', exportPayoutExcel) },
        { label:'PDF',   action:()=>doExport('Payroll PDF',   exportCampaignPDF) },
      ]
    },
    {
      icon:'🏦', color:GL, title:'EFT Batch File', desc:'Bank-ready payment batch — approved payroll records only.',
      btns:[
        { label:'CSV',   action:()=>doExport('EFT CSV',   ()=>downloadCSV('hg-eft-batch.csv', MOCK_PAYOUT_DATA, ['Promoter','Email','Bank','Account','Net Payout','Job','Date'])) },
        { label:'Excel', action:()=>doExport('EFT Excel', ()=>downloadExcel('hg-eft-batch.xlsx', MOCK_PAYOUT_DATA, ['Promoter','Email','Bank','Account','Net Payout','Job','Date'])) },
        { label:'PDF',   action:()=>doExport('EFT PDF',   ()=>downloadPDF('EFT Batch', MOCK_PAYOUT_DATA.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join(''))) },
      ]
    },
  ]

  function Btn({ onClick, children, outline=false, small=false, color=G }: any) {
    return (
      <button onClick={onClick} style={{
        padding: small?'7px 14px':'10px 20px',
        background: outline?'transparent':`linear-gradient(135deg,${color},${hex2rgba(color,0.8)})`,
        border: `1px solid ${color}`, color: outline?color:B,
        fontFamily:FD, fontSize:small?10:11, fontWeight:700, letterSpacing:'0.08em',
        cursor:'pointer', textTransform:'uppercase' as const, transition:'all 0.2s', borderRadius:3,
      }}
        onMouseEnter={e=>{e.currentTarget.style.opacity='0.82';e.currentTarget.style.transform='translateY(-1px)'}}
        onMouseLeave={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.transform='translateY(0)'}}
      >{children}</button>
    )
  }

  return (
    <div style={{ padding:'40px 48px' }}>
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:9, letterSpacing:'0.38em', textTransform:'uppercase', color:GL, marginBottom:8, fontWeight:700, fontFamily:FD }}>System · Reporting</div>
        <h1 style={{ fontFamily:FD, fontSize:28, fontWeight:700, color:W }}>Reports & Exports</h1>
        <p style={{ fontSize:13, color:W55, marginTop:4, fontFamily:FD }}>Download live data as CSV, Excel, or printable PDF reports.</p>
      </div>

      {exportMsg && (
        <div style={{ padding:'12px 18px', background:hex2rgba(GL,0.08), border:`1px solid ${hex2rgba(GL,0.35)}`, marginBottom:20, fontSize:13, color:GL, fontWeight:700, borderRadius:3, fontFamily:FD, display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:16 }}>✓</span> {exportMsg}
        </div>
      )}

      {/* PAYOUT CALCULATOR */}
      <div style={{ background:'rgba(9,9,7,0.6)', border:`1px solid ${BB}`, padding:28, marginBottom:20, borderRadius:4 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
          <span style={{ fontSize:18, color:GL }}>◈</span>
          <div style={{ fontSize:10, letterSpacing:'0.25em', textTransform:'uppercase', color:GL, fontWeight:700, fontFamily:FD }}>Promoter Payout Calculator</div>
          <span style={{ fontSize:9, color:W28, marginLeft:8, padding:'2px 8px', border:`1px solid ${BB}`, letterSpacing:'0.1em', borderRadius:3, fontFamily:FD }}>Estimate only · Promoters</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:16, alignItems:'flex-end' }}>
          {[
            { label:'Hourly Rate (R)', val:hourlyRate, set:setHourlyRate },
            { label:'Hours per Shift', val:hours,      set:setHours      },
            { label:'No. of Promoters',val:numPromos,  set:setNumPromos  },
          ].map(f=>(
            <div key={f.label}>
              <label style={{ fontSize:9, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:W55, display:'block', marginBottom:8, fontFamily:FD }}>{f.label}</label>
              <input type="number" value={f.val} onChange={e=>f.set(e.target.value)} style={inputStyle}
                onFocus={e=>e.currentTarget.style.borderColor=GL} onBlur={e=>e.currentTarget.style.borderColor=BB} />
            </div>
          ))}
          <div style={{ background:hex2rgba(G5,0.5), border:`1px solid ${hex2rgba(GL,0.32)}`, padding:'10px 16px', borderRadius:3 }}>
            <div style={{ fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase', color:W55, marginBottom:6, fontFamily:FD }}>Total Payout</div>
            <div style={{ fontFamily:FD, fontSize:28, fontWeight:700, color:GL }}>R {calcTotal.toLocaleString('en-ZA',{minimumFractionDigits:0})}</div>
          </div>
        </div>
      </div>

      {/* EXPORT CARDS */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:20 }}>
        {cards.map((c,i)=>(
          <div key={i} style={{ background:'rgba(9,9,7,0.6)', border:`1px solid ${BB}`, borderRadius:4, padding:24, position:'relative', overflow:'hidden' }}
            onMouseEnter={e=>(e.currentTarget.style.borderColor=hex2rgba(c.color,0.5))}
            onMouseLeave={e=>(e.currentTarget.style.borderColor=BB)}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${c.color},${hex2rgba(c.color,0.3)})` }} />
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <span style={{ fontSize:18, color:c.color }}>{c.icon}</span>
              <div style={{ fontSize:9, letterSpacing:'0.22em', textTransform:'uppercase', color:GL, fontWeight:700, fontFamily:FD }}>{c.title}</div>
            </div>
            <p style={{ fontSize:12, color:W55, marginBottom:18, lineHeight:1.6, fontFamily:FD }}>{c.desc}</p>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {c.btns.map((btn,j)=>(
                <button key={j} onClick={btn.action} style={{
                  padding:'6px 12px', background: j===0?`linear-gradient(135deg,${c.color},${hex2rgba(c.color,0.8)})`:'transparent',
                  border:`1px solid ${c.color}`, color:j===0?B:c.color,
                  fontFamily:FD, fontSize:9, fontWeight:700, letterSpacing:'0.1em',
                  cursor:'pointer', textTransform:'uppercase' as const, borderRadius:3, whiteSpace:'nowrap' as const,
                  transition:'all 0.18s',
                }}
                  onMouseEnter={e=>{e.currentTarget.style.opacity='0.82';e.currentTarget.style.transform='translateY(-1px)'}}
                  onMouseLeave={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.transform='translateY(0)'}}>
                  ↓ {btn.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* PLATFORM SUMMARY */}
      <div style={{ background:'rgba(9,9,7,0.6)', border:`1px solid ${BB}`, borderRadius:4 }}>
        <div style={{ padding:'14px 22px', borderBottom:`1px solid ${BB}`, fontSize:9, letterSpacing:'0.25em', textTransform:'uppercase', color:GL, fontWeight:700, fontFamily:FD }}>Platform Summary</div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <tbody>
            {summary.map((row,i)=>(
              <tr key={i} style={{ borderBottom:i<summary.length-1?`1px solid ${BB}`:'none', transition:'background 0.18s' }}
                onMouseEnter={e=>(e.currentTarget.style.background=BB2)} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                <td style={{ padding:'14px 22px', fontSize:13, color:W55, fontFamily:FD }}>{row.label}</td>
                <td style={{ padding:'14px 22px', fontSize:14, fontWeight:700, color:GL, textAlign:'right', fontFamily:FD }}>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}