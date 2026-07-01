import { useState } from 'react'
import { AdminLayout } from '../AdminLayout'
import { injectAdminMobileStyles } from '../adminMobileStyles'
import { useEffect } from 'react'

const G   = '#D4880A'
const GL  = '#E8A820'
const G2  = '#8B5A1A'
const G3  = '#C07818'
const G4  = '#F0C050'
const G5  = '#6B3F10'
const B   = '#0C0A07'
const D1  = '#0E0C06'
const D2  = '#151209'
const D3  = '#1C1709'
const BB  = 'rgba(212,136,10,0.16)'
const BB2 = 'rgba(212,136,10,0.06)'
const W   = '#CEC5B2'
const W85 = 'rgba(210,198,180,0.95)'
const W55 = 'rgba(220,208,188,0.90)'
const W28 = 'rgba(200,185,162,0.80)'
const FD  = "'Playfair Display', Georgia, serif"

function hex2rgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

type DocStatus = 'pending' | 'approved' | 'rejected'

interface Applicant {
  id: string; name: string; email: string; phone: string
  role: string; joined: string; status: DocStatus
  docs: { id: DocStatus; bankDetails: DocStatus; contract: DocStatus; selfie: DocStatus }
  notes: string
}

const MOCK: Applicant[] = [
  { id:'A001', name:'Ayanda Dlamini',  email:'ayanda@email.com',  phone:'+27 71 234 5678', role:'Promoter',   joined:'2026-03-08', status:'pending',  docs:{ id:'pending',  bankDetails:'pending',  contract:'approved', selfie:'approved' }, notes:'' },
  { id:'A002', name:'Thabo Nkosi',     email:'thabo@email.com',   phone:'+27 82 345 6789', role:'Promoter',   joined:'2026-03-07', status:'pending',  docs:{ id:'approved', bankDetails:'pending',  contract:'pending',  selfie:'approved' }, notes:'' },
  { id:'A003', name:'Lerato Mokoena',  email:'lerato@email.com',  phone:'+27 63 456 7890', role:'Supervisor', joined:'2026-03-06', status:'approved', docs:{ id:'approved', bankDetails:'approved', contract:'approved', selfie:'approved' }, notes:'' },
  { id:'A004', name:'Sipho Mhlongo',   email:'sipho@email.com',   phone:'+27 74 567 8901', role:'Promoter',   joined:'2026-03-05', status:'rejected', docs:{ id:'rejected', bankDetails:'approved', contract:'approved', selfie:'approved' }, notes:'ID document unclear' },
  { id:'A005', name:'Nomsa Zulu',      email:'nomsa@email.com',   phone:'+27 83 678 9012', role:'Promoter',   joined:'2026-03-04', status:'pending',  docs:{ id:'approved', bankDetails:'approved', contract:'pending',  selfie:'pending'  }, notes:'' },
]

const STATUS_CLR: Record<DocStatus, string>    = { pending: GL,             approved: G3,             rejected: '#C8B898' }
const STATUS_BG:  Record<DocStatus, string>    = { pending: hex2rgba(GL,0.12), approved: hex2rgba(G3,0.12), rejected: hex2rgba('#8B5A1A',0.25) }
const STATUS_BORDER: Record<DocStatus, string> = { pending: hex2rgba(GL,0.45), approved: hex2rgba(G3,0.45), rejected: hex2rgba('#8B5A1A',0.55) }

function StatusBadge({ status }: { status: DocStatus }) {
  return (
    <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', fontFamily:FD, color:STATUS_CLR[status], background:STATUS_BG[status], border:`1px solid ${STATUS_BORDER[status]}`, padding:'3px 10px', borderRadius:3 }}>
      {status}
    </span>
  )
}

function FilterBtn({ label, active, color, onClick }: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding:'7px 16px', border:`1px solid ${active?color:'rgba(212,136,10,0.22)'}`, cursor:'pointer', fontFamily:FD, fontSize:10, fontWeight:active?700:400, textTransform:'capitalize' as const, borderRadius:3, background:active?hex2rgba(color,0.18):'transparent', color:active?color:W55, transition:'all 0.18s' }}>{label}</button>
  )
}

function Btn({ children, onClick, outline=false, color=G }: any) {
  return (
    <button onClick={onClick} style={{ flex:1, padding:'12px', background:outline?'transparent':hex2rgba(color,0.18), border:`1px solid ${color}`, color, fontFamily:FD, fontSize:12, fontWeight:700, cursor:'pointer', letterSpacing:'0.08em', transition:'all 0.2s', borderRadius:3 }}
      onMouseEnter={e=>e.currentTarget.style.background=hex2rgba(color,0.28)}
      onMouseLeave={e=>e.currentTarget.style.background=outline?'transparent':hex2rgba(color,0.18)}
    >{children}</button>
  )
}

export default function ReviewApproveDocs() {
  const [applicants, setApplicants] = useState<Applicant[]>(MOCK)
  const [selected,   setSelected  ] = useState<Applicant | null>(null)
  const [filter,     setFilter    ] = useState<DocStatus | 'all'>('all')
  const [note,       setNote      ] = useState('')

  useEffect(() => { injectAdminMobileStyles() }, [])

  const filtered = applicants.filter(a => filter === 'all' || a.status === filter)

  const updateStatus = (id: string, status: DocStatus) => {
    setApplicants(prev => prev.map(a => a.id === id ? { ...a, status, notes: note || a.notes } : a))
    setSelected(prev => prev ? { ...prev, status, notes: note || prev.notes } : null)
    setNote('')
  }

  const updateDoc = (applicantId: string, doc: keyof Applicant['docs'], status: DocStatus) => {
    setApplicants(prev => prev.map(a => a.id === applicantId ? { ...a, docs: { ...a.docs, [doc]: status } } : a))
    setSelected(prev => prev ? { ...prev, docs: { ...prev.docs, [doc]: status } } : null)
  }

  const docLabels: Record<keyof Applicant['docs'], string> = {
    id: 'ID Document', bankDetails: 'Bank Details', contract: 'Signed Contract', selfie: 'Profile Selfie',
  }

  const counts = {
    all: applicants.length,
    pending: applicants.filter(a => a.status === 'pending').length,
    approved: applicants.filter(a => a.status === 'approved').length,
    rejected: applicants.filter(a => a.status === 'rejected').length,
  }

  return (
    <AdminLayout>
      <div className="hg-page" style={{ padding:'40px 48px' }}>

        {/* ── HEADER ── */}
        <div style={{ marginBottom:32 }}>
          <div style={{ fontSize:9, letterSpacing:'0.38em', textTransform:'uppercase', color:GL, marginBottom:8, fontWeight:700, fontFamily:FD }}>People · Onboarding</div>
          <h1 style={{ fontFamily:FD, fontSize:30, fontWeight:700, color:W }}>Review & Approve Documents</h1>
          <p style={{ fontSize:13, color:W55, marginTop:6, fontFamily:FD }}>Verify applicant documents before granting platform access.</p>
        </div>

        {/* ── FILTER ── */}
        <div className="hg-filter-row" style={{ marginBottom:28 }}>
          {(['all','pending','approved','rejected'] as const).map(f => (
            <FilterBtn key={f}
              label={`${f==='all'?'All':f.charAt(0).toUpperCase()+f.slice(1)} (${counts[f]})`}
              active={filter===f} color={f==='all'?GL:STATUS_CLR[f]} onClick={()=>setFilter(f)} />
          ))}
        </div>

        {/* ── SPLIT LAYOUT ── */}
        <div className="hg-onboard-split" style={{ display:'grid', gridTemplateColumns:selected?'1fr 420px':'1fr', gap:20 }}>

          {/* Table */}
          <div className="hg-table-wrap" style={{ background:D2, border:`1px solid ${BB}`, borderRadius:4, overflow:'hidden' }}>
            <table className="hg-table-cards" style={{ width:'100%', borderCollapse:'collapse', minWidth:600 }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${BB}`, background:D1 }}>
                  <th style={{ padding:'14px 20px', textAlign:'left', fontSize:9, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:W55, fontFamily:FD }}>Applicant</th>
                  <th className="hg-col-hide-md" style={{ padding:'14px 20px', textAlign:'left', fontSize:9, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:W55, fontFamily:FD }}>Role</th>
                  <th className="hg-col-hide-md" style={{ padding:'14px 20px', textAlign:'left', fontSize:9, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:W55, fontFamily:FD }}>Applied</th>
                  <th style={{ padding:'14px 20px', textAlign:'left', fontSize:9, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:W55, fontFamily:FD }}>Documents</th>
                  <th style={{ padding:'14px 20px', textAlign:'left', fontSize:9, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:W55, fontFamily:FD }}>Status</th>
                  <th style={{ padding:'14px 20px', textAlign:'left', fontSize:9, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:W55, fontFamily:FD }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => (
                  <tr key={a.id}
                    style={{ borderBottom:i<filtered.length-1?`1px solid ${BB}`:'none', background:selected?.id===a.id?hex2rgba(GL,0.05):'transparent', transition:'background 0.18s', cursor:'pointer' }}
                    onClick={() => setSelected(selected?.id===a.id ? null : a)}>
                    <td data-label="Name" style={{ padding:'16px 20px' }}>
                      <div style={{ fontSize:14, fontWeight:700, color:W, fontFamily:FD }}>{a.name}</div>
                      <div style={{ fontSize:11, color:W55, marginTop:2, fontFamily:FD }}>{a.email}</div>
                    </td>
                    <td data-label="Role" className="hg-col-hide-md" style={{ padding:'16px 20px', fontSize:12, color:W55, fontFamily:FD }}>{a.role}</td>
                    <td data-label="Applied" className="hg-col-hide-md" style={{ padding:'16px 20px', fontSize:12, color:W55, fontFamily:FD }}>
                      {new Date(a.joined).toLocaleDateString('en-ZA',{day:'numeric',month:'short'})}
                    </td>
                    <td data-label="Docs" style={{ padding:'16px 20px' }}>
                      <div style={{ display:'flex', gap:5 }}>
                        {Object.values(a.docs).map((d, j) => (
                          <div key={j} style={{ width:8, height:8, borderRadius:'50%', background:STATUS_CLR[d] }} />
                        ))}
                      </div>
                      <div style={{ fontSize:10, color:W55, marginTop:5, fontFamily:FD }}>
                        {Object.values(a.docs).filter(d => d==='approved').length}/4 verified
                      </div>
                    </td>
                    <td data-label="Status" style={{ padding:'16px 20px' }}><StatusBadge status={a.status} /></td>
                    <td data-label="" style={{ padding:'16px 20px' }}>
                      <button style={{ fontSize:11, color:GL, background:'none', border:'none', cursor:'pointer', fontFamily:FD, fontWeight:700 }}>Review →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div style={{ padding:40, textAlign:'center', color:W55, fontSize:13, fontFamily:FD }}>No applicants match this filter.</div>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="hg-split-panel" style={{ background:D2, border:`1px solid ${BB}`, padding:28, height:'fit-content', borderRadius:4, position:'sticky', top:88 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
                <div>
                  <div style={{ fontFamily:FD, fontSize:20, fontWeight:700, color:W }}>{selected.name}</div>
                  <div style={{ fontSize:12, color:W55, marginTop:4, fontFamily:FD }}>{selected.email} · {selected.phone}</div>
                  <div style={{ marginTop:8 }}><StatusBadge status={selected.status} /></div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', color:W28, fontSize:18 }}>✕</button>
              </div>

              <div style={{ fontSize:9, letterSpacing:'0.22em', textTransform:'uppercase', color:GL, marginBottom:14, fontWeight:700, fontFamily:FD }}>Document Checklist</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
                {(Object.keys(selected.docs) as Array<keyof typeof selected.docs>).map(doc => (
                  <div key={doc} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', background:BB2, border:`1px solid ${BB}`, borderRadius:3 }}>
                    <div>
                      <div style={{ fontSize:12, color:W, fontWeight:600, fontFamily:FD, marginBottom:4 }}>{docLabels[doc]}</div>
                      <StatusBadge status={selected.docs[doc]} />
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      {(['approved','rejected'] as DocStatus[]).map(s => (
                        <button key={s} onClick={() => updateDoc(selected.id, doc, s)} style={{
                          padding:'5px 10px', fontSize:10, fontWeight:700, cursor:'pointer', borderRadius:2,
                          background: selected.docs[doc]===s ? STATUS_CLR[s] : 'transparent',
                          border: `1px solid ${STATUS_CLR[s]}`,
                          color: selected.docs[doc]===s ? B : STATUS_CLR[s],
                          fontFamily:FD, transition:'all 0.18s',
                        }}>{s==='approved'?'✓':'✗'}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:W55, display:'block', marginBottom:8, fontFamily:FD }}>Notes (optional)</label>
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note..." rows={3}
                  style={{ width:'100%', background:BB2, border:`1px solid ${BB}`, padding:'10px 14px', color:W, fontFamily:FD, fontSize:13, resize:'none', outline:'none', borderRadius:3, boxSizing:'border-box' }}
                  onFocus={e => e.currentTarget.style.borderColor=GL} onBlur={e => e.currentTarget.style.borderColor=BB} />
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <Btn onClick={() => updateStatus(selected.id, 'approved')} color={G3}>✓ Approve</Btn>
                <Btn onClick={() => updateStatus(selected.id, 'rejected')} color='#C8B898'>✗ Reject</Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}