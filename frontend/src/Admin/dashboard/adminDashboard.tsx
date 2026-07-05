import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AdminLayout } from '../AdminLayout'
import { AdminChatTab } from '../ChatSystem'
import { getAllJobsWithAdminJobs, getActiveJobs } from '../../shared/jobs/JobsPage'
import { injectAdminMobileStyles } from '../adminMobileStyles'
import { purchaseOrdersService } from '../../shared/services/purchaseOrdersService'
import type { PurchaseOrder } from '../../shared/types/purchaseOrder.types'

// --- Palette ------------------------------------------------------------------
const G   = '#8F8A7C'
const GL  = '#C9BFA6'
const G2  = '#8A8474'
const G3  = '#7A756A'
const G4  = '#D8D8D8'
const G5  = '#443F36'
const B   = '#050504'
const D1  = '#070706'
const D2  = '#0A0A08'
const D3  = '#100F0B'
const GM  = '#14140E'
const BB  = 'rgba(170,160,135,0.16)'
const BB2 = 'rgba(170,160,135,0.06)'

const W   = '#F0F0F0'
const W85 = 'rgba(204,204,204,0.95)'
const W55 = 'rgba(214,214,214,0.90)'
const W28 = 'rgba(187,187,187,0.80)'
const WM  = 'rgba(222,222,222,0.88)'

const C_ACTIVE   = '#7A756A'
const C_PENDING  = '#C9BFA6'
const C_REJECTED = '#CBCBCB'
const C_NEW      = '#D8D8D8'
const C_INACTIVE = '#CBCBCB'

const FD   = "'Playfair Display', Georgia, serif"
const MONO = "'DM Mono', 'Courier New', monospace"
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// --- Helpers ------------------------------------------------------------------
function hex2rgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0,2),16), g = parseInt(h.substring(2,4),16), b = parseInt(h.substring(4,6),16)
  return `rgba(${r},${g},${b},${alpha})`
}
function statusColor(s: string): string {
  if (s==='approved'||s==='active')       return C_ACTIVE
  if (s==='rejected')                      return C_REJECTED
  if (s==='inactive')                      return C_INACTIVE
  if (s==='pending'||s==='pending_review') return C_PENDING
  if (s==='new')                           return C_NEW
  return W28
}
function statusBg(s: string): string {
  if (s==='approved'||s==='active')        return hex2rgba('#7A756A',0.12)
  if (s==='rejected'||s==='inactive')      return hex2rgba('#463F35',0.35)
  if (s==='pending'||s==='pending_review') return hex2rgba('#C9BFA6',0.12)
  if (s==='new')                           return hex2rgba('#D8D8D8',0.10)
  return 'transparent'
}
function statusBorder(s: string): string {
  if (s==='approved'||s==='active')        return hex2rgba('#7A756A',0.45)
  if (s==='rejected'||s==='inactive')      return hex2rgba('#666052',0.60)
  if (s==='pending'||s==='pending_review') return hex2rgba('#C9BFA6',0.45)
  if (s==='new')                           return hex2rgba('#D8D8D8',0.42)
  return BB
}
function normalizeStatus(s: string) { return s==='pending_review'?'pending':s||'pending' }
function isPending(s: string) { return s==='pending'||s==='pending_review' }
function bizToClient(u: any, source: 'api'|'local'): any {
  const status = u.status==='approved'?'active':u.status==='rejected'?'inactive':'new'
  return { id:u.id, name:u.companyName||u.fullName||u.name||'Unknown', contact:u.contactName||u.fullName||u.name||'N/A', email:u.email||'', phone:u.phone||'Not provided', industry:u.industry||'Other', city:u.bizAddress||u.city||'Not specified', website:u.website||'', regNumber:u.regNumber||u.address||'', vatNumber:u.vatNumber||'', registeredDate:u.createdAt?String(u.createdAt).slice(0,10):u.submittedAt?String(u.submittedAt).slice(0,10):new Date().toISOString().slice(0,10), activeSince:u.createdAt?String(u.createdAt).slice(0,7):u.submittedAt?String(u.submittedAt).slice(0,7):new Date().toISOString().slice(0,7), jobsRun:0, totalHours:0, status, budget:'R 0', description:`${u.industry||'Business'} client registered via platform.`, source }
}

// --- Mock data ----------------------------------------------------------------
const MOCK_LOGINS = [
  { id:'L001', name:'Ayanda Dlamini', email:'ayanda@email.com', role:'promoter', time:'2026-03-11T08:02:00', ip:'196.25.1.4'  },
  { id:'L002', name:'Thabo Nkosi',    email:'thabo@email.com',  role:'promoter', time:'2026-03-11T08:14:00', ip:'196.25.1.7'  },
  { id:'L003', name:'Acme Corp',      email:'acme@corp.co.za',  role:'business', time:'2026-03-11T09:01:00', ip:'41.13.22.9'  },
  { id:'L004', name:'Lerato Mokoena', email:'lerato@email.com', role:'promoter', time:'2026-03-10T17:30:00', ip:'196.25.1.12' },
  { id:'L005', name:'RedBull SA',     email:'rb@redbull.co.za', role:'business', time:'2026-03-10T14:22:00', ip:'41.13.55.3'  },
  { id:'L006', name:'Sipho Mhlongo',  email:'sipho@email.com',  role:'promoter', time:'2026-03-09T11:45:00', ip:'196.25.1.9'  },
]

const MOCK_REGISTRATIONS = [
  { id:'R001', name:'Zanele Motha',    email:'zanele@email.com',  role:'promoter', date:'2026-03-11', status:'pending',  city:'Johannesburg', phone:'+27 79 111 2222', source:'mock' },
  { id:'R002', name:'Musa Dube',       email:'musa@email.com',    role:'promoter', date:'2026-03-10', status:'pending',  city:'Cape Town',    phone:'+27 72 333 4444', source:'mock' },
  { id:'R003', name:'FreshBrands Ltd', email:'fresh@brands.co.za',role:'business', date:'2026-03-10', status:'pending',  city:'Durban',       phone:'+27 31 555 6666', source:'mock' },
  { id:'R004', name:'Nomsa Zulu',      email:'nomsa@email.com',   role:'promoter', date:'2026-03-09', status:'approved', city:'Pretoria',     phone:'+27 83 777 8888', source:'mock' },
  { id:'R005', name:'PromoNation',     email:'promo@nation.co.za',role:'business', date:'2026-03-08', status:'rejected', city:'Johannesburg', phone:'+27 11 999 0000', source:'mock' },
  { id:'R006', name:'Bongani Khumalo', email:'bong@email.com',    role:'promoter', date:'2026-03-08', status:'approved', city:'Durban',       phone:'+27 61 222 3333', source:'mock' },
]

const INITIAL_MOCK_CLIENTS = [
  { id:'C001', name:'RedBull South Africa',  contact:'James Mokoena',  email:'rb@redbull.co.za',     phone:'+27 11 555 0001', industry:'FMCG / Beverages',   city:'Johannesburg', registeredDate:'2024-01-12', activeSince:'2024-01', jobsRun:14, totalHours:312, status:'active',   budget:'R 48,000',  website:'redbull.com/za',    regNumber:'2005/098765/07', description:'Energy drink brand activation & sampling campaigns across Gauteng.', source:'mock' },
  { id:'C002', name:'Acme Corp',             contact:'Priya Nair',     email:'acme@corp.co.za',      phone:'+27 21 555 0002', industry:'Retail',              city:'Cape Town',    registeredDate:'2023-06-03', activeSince:'2023-06', jobsRun:9,  totalHours:204, status:'active',   budget:'R 32,000',  website:'acmecorp.co.za',    regNumber:'2010/112233/07', description:'Multi-category retail promotions and in-store activations.', source:'mock' },
  { id:'C003', name:'FreshBrands Ltd',       contact:'Jane Dlamini',   email:'fresh@brands.co.za',   phone:'+27 31 555 6666', industry:'FMCG / Food',         city:'Durban',       registeredDate:'2025-11-20', activeSince:'2025-11', jobsRun:3,  totalHours:48,  status:'new',      budget:'R 8,400',   website:'freshbrands.co.za', regNumber:'2022/123456/07', description:'New FMCG client specialising in health and wellness product launches.', source:'mock' },
  { id:'C004', name:'Castle Lager SA',       contact:'Sipho Mahlangu', email:'castle@sab.co.za',     phone:'+27 11 555 0004', industry:'FMCG / Beverages',   city:'Johannesburg', registeredDate:'2022-03-08', activeSince:'2022-03', jobsRun:28, totalHours:680, status:'active',   budget:'R 112,000', website:'castlelager.co.za', regNumber:'1998/003344/07', description:'Beer brand activations, stadium events, and trade promotions nationwide.', source:'mock' },
  { id:'C005', name:'PromoNation',           contact:'Bob Smith',      email:'promo@nation.co.za',   phone:'+27 11 999 0000', industry:'Events',              city:'Johannesburg', registeredDate:'2024-08-15', activeSince:'2024-08', jobsRun:2,  totalHours:16,  status:'inactive', budget:'R 2,800',   website:'promonation.co.za', regNumber:'2019/654321/07', description:'Event production company with limited recent activity.', source:'mock' },
  { id:'C006', name:'Standard Bank Promos',  contact:'Lerato Sithole', email:'promos@stdbank.co.za', phone:'+27 11 555 0006', industry:'Financial Services',  city:'Pretoria',     registeredDate:'2023-09-01', activeSince:'2023-09', jobsRun:7,  totalHours:168, status:'active',   budget:'R 29,400',  website:'standardbank.co.za',regNumber:'1969/017128/06', description:'Consumer banking product promotions and financial literacy activations.', source:'mock' },
  { id:'C007', name:"Nando's Marketing",     contact:'Thandi Khumalo', email:'mktg@nandos.co.za',    phone:'+27 11 555 0007', industry:'QSR',                 city:'Johannesburg', registeredDate:'2025-02-10', activeSince:'2025-02', jobsRun:5,  totalHours:88,  status:'active',   budget:'R 15,600',  website:'nandos.co.za',      regNumber:'1990/004499/07', description:'Brand activation and loyalty campaign promoters for restaurant launches.', source:'mock' },
  { id:'C008', name:'Vodacom Business',      contact:'Amahle Ndaba',   email:'biz@vodacom.co.za',    phone:'+27 11 555 0008', industry:'Telecoms',            city:'Midrand',      registeredDate:'2023-03-15', activeSince:'2023-03', jobsRun:11, totalHours:256, status:'active',   budget:'R 44,800',  website:'vodacom.co.za',     regNumber:'1993/003367/07', description:'Telco product launches, bundle promotions, and retail point-of-sale activations.', source:'mock' },
]

const INIT_MESSAGES = [
  { id:'M001', from:'RedBull SA',     fromRole:'business', to:'Admin', subject:'Complaint: Promoter no-show',     body:'Ayanda Dlamini did not show up for the Sandton shift on March 8th.', date:'2026-03-11', read:false, type:'complaint', regardingName:'Ayanda Dlamini' },
  { id:'M002', from:'Ayanda Dlamini', fromRole:'promoter', to:'Admin', subject:'Review: RedBull event was great', body:'The event at Sandton City was well organised.',                         date:'2026-03-10', read:true,  type:'review',    regardingName:'RedBull SA'      },
  { id:'M003', from:'FreshBrands',    fromRole:'business', to:'Admin', subject:'Review: Excellent promoter team', body:'The promoters provided for our launch event were outstanding.',         date:'2026-03-09', read:false, type:'review',    regardingName:'Lerato Mokoena'  },
  { id:'M004', from:'Thabo Nkosi',    fromRole:'promoter', to:'Admin', subject:'Complaint: Client was rude',      body:'During the Castle Lager event the client was dismissive.',              date:'2026-03-09', read:true,  type:'complaint', regardingName:'SABMiller'       },
]

const STATIC_ACTIVITY = [
  { time:'14m ago', msg:'Job #JB-204 filled â€” 8/8 slots taken',       type:'job',     ts: Date.now() - 14*60*1000 },
  { time:'22m ago', msg:'Sipho Mhlongo submitted ID document',         type:'doc',     ts: Date.now() - 22*60*1000 },
  { time:'31m ago', msg:'Payroll batch calculated â€” R12,400',          type:'payment', ts: Date.now() - 31*60*1000 },
  { time:'45m ago', msg:'Lerato Mokoena flagged late â€” Rosebank Mall', type:'flag',    ts: Date.now() - 45*60*1000 },
]
const TYPE_CLR: Record<string,string> = { checkin:GL, apply:G3, job:G4, doc:G2, payment:GL, flag:'#8A8474', approve:GL, reject:G2 }

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  return `${Math.floor(diff/86400)}d ago`
}

function buildLiveActivity(regs: any[]): { time:string; msg:string; type:string; ts:number }[] {
  const events: { time:string; msg:string; type:string; ts:number }[] = []

  // Build activity from real DB registrations (passed in from API)
  regs.forEach(r => {
    const raw = r._raw || r
    const ts = raw.createdAt ? new Date(raw.createdAt).getTime() : 0
    if (!ts) return
    const name = r.name || raw.fullName || 'Unknown'
    const role = r.role === 'business' ? 'Business' : 'Promoter'

    if (r.status === 'approved') {
      events.push({ ts, type: 'approve', msg: `${name} approved ? â€” ${role}`, time: timeAgo(ts) })
    } else if (r.status === 'rejected') {
      events.push({ ts, type: 'reject', msg: `${name} rejected â€” ${role}`, time: timeAgo(ts) })
    } else {
      events.push({ ts, type: 'apply', msg: `New registration: ${name} â€” ${role}`, time: timeAgo(ts) })
    }
  })

  // Merge with static fallback events and return most recent 8
  return [...events, ...STATIC_ACTIVITY]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 8)
    .map(e => ({ ...e, time: e.ts > 0 ? timeAgo(e.ts) : e.time }))
}

// --- Shared UI ----------------------------------------------------------------
function Badge({ label, color, bg, border }: { label:string; color:string; bg?:string; border?:string }) {
  return <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', fontFamily:FD, color, background:bg??statusBg(label), border:`1px solid ${border??statusBorder(label)}`, padding:'3px 10px', borderRadius:3 }}>{label}</span>
}

function Btn({ children, onClick, outline=false, small=false, color=G, disabled=false }: any) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding:small?'6px 14px':'10px 22px', background:disabled?'rgba(255,255,255,0.05)':outline?'transparent':`linear-gradient(135deg,${color},${hex2rgba(color,0.8)})`, border:`1px solid ${disabled?BB:color}`, color:disabled?W28:outline?color:B, fontFamily:FD, fontSize:small?10:11, fontWeight:700, letterSpacing:'0.08em', cursor:disabled?'not-allowed':'pointer', textTransform:'uppercase' as const, transition:'all 0.2s', borderRadius:3 }}
      onMouseEnter={e=>{if(!disabled){e.currentTarget.style.opacity='0.82';e.currentTarget.style.transform='translateY(-1px)'}}}
      onMouseLeave={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.transform='translateY(0)'}}
    >{children}</button>
  )
}

function FilterBtn({ label, active, color, onClick }: { label:string; active:boolean; color:string; onClick:()=>void }) {
  const safeColor = color.startsWith('#')?color:GL
  return <button onClick={onClick} style={{ padding:'6px 14px', border:`1px solid ${active?safeColor:'rgba(170,160,135,0.22)'}`, cursor:'pointer', fontFamily:FD, fontSize:10, fontWeight:active?700:400, textTransform:'capitalize' as const, borderRadius:3, background:active?hex2rgba(safeColor,0.18):'transparent', color:active?safeColor:W55, transition:'all 0.18s', whiteSpace:'nowrap' as const }}>{label}</button>
}

function StatCard({ label, value, sub, color, onClick }: { label:string; value:any; sub?:string; color:string; onClick?:()=>void }) {
  return (
    <div onClick={onClick} style={{ background:'rgba(9,9,7,0.6)', padding:'22px 20px', position:'relative', overflow:'hidden', borderRadius:2, cursor:onClick?'pointer':'default', transition:'background 0.2s' }}
      onMouseEnter={e=>{ if(onClick) e.currentTarget.style.background='rgba(21,20,16,0.8)' }}
      onMouseLeave={e=>{ if(onClick) e.currentTarget.style.background='rgba(9,9,7,0.6)' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${color},${hex2rgba(color,0.4)})` }} />
      <div style={{ fontSize:9, letterSpacing:'0.22em', textTransform:'uppercase', color:W55, marginBottom:8, fontFamily:FD }}>{label}</div>
      <div className="hg-stat-val" style={{ fontFamily:FD, fontSize:36, fontWeight:700, color:W, lineHeight:1 }}>{value}</div>
      {sub&&<div style={{ fontSize:11, color, marginTop:8, fontWeight:700, fontFamily:FD }}>{sub}</div>}
    </div>
  )
}

// --- Detail Modal (for registrations) ----------------------------------------
function DetailModal({ item, onClose, onApprove, onReject }: { item:any; onClose:()=>void; onApprove:()=>void; onReject:()=>void }) {
  const isPromoter = item.role==='promoter'
  const pending    = isPending(item.status)
  const accent     = isPromoter?G3:GL
  const d          = item._raw||{}
  const infoRows   = isPromoter
    ? [{label:'Email',value:d.email||item.email},{label:'Phone',value:d.phone||item.phone||'N/A'},{label:'City',value:d.city||item.city||'N/A'},{label:'Applied',value:item.date}]
    : [{label:'Email',value:d.email||item.email},{label:'Phone',value:d.phone||item.phone||'N/A'},{label:'Company',value:d.fullName||item.name},{label:'Industry',value:d.industry||'N/A'},{label:'Applied',value:item.date}]
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:24 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:D2, border:`1px solid ${BB}`, padding:'40px', width:'100%', maxWidth:480, position:'relative', maxHeight:'90vh', overflowY:'auto', borderRadius:4 }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${accent},${G5})` }} />
        <button onClick={onClose} style={{ position:'absolute', top:16, right:20, background:'none', border:'none', cursor:'pointer', color:W28, fontSize:18 }}>?</button>
        <div style={{ fontSize:9, letterSpacing:'0.3em', textTransform:'uppercase', color:GL, marginBottom:8, fontWeight:700, fontFamily:FD }}>{isPromoter?'Promoter':'Business'} Application</div>
        <div style={{ fontFamily:FD, fontSize:22, fontWeight:700, color:W, marginBottom:8 }}>{item.name}</div>
        <div style={{ marginBottom:20 }}><Badge label={item.status} color={statusColor(item.status)} bg={statusBg(item.status)} border={statusBorder(item.status)} /></div>
        {infoRows.map((r:any)=>(
          <div key={r.label} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:`1px solid ${BB}` }}>
            <span style={{ fontSize:12, color:W55, fontFamily:FD }}>{r.label}</span>
            <span style={{ fontSize:12, color:W85, fontWeight:700, fontFamily:FD }}>{r.value}</span>
          </div>
        ))}
        {pending&&<div style={{ display:'flex', gap:12, marginTop:24 }}><Btn onClick={onApprove} color={C_ACTIVE}>? Approve</Btn><Btn onClick={onReject} color={G2} outline>? Reject</Btn></div>}
      </div>
    </div>
  )
}

// --- Client Modal -------------------------------------------------------------
function ClientModal({ client, onClose }: { client:any; onClose:()=>void }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:24 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:D2, border:`1px solid ${BB}`, padding:'40px', width:'100%', maxWidth:520, position:'relative', maxHeight:'90vh', overflowY:'auto', borderRadius:4 }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${statusColor(client.status)},${G5})` }} />
        <button onClick={onClose} style={{ position:'absolute', top:16, right:20, background:'none', border:'none', cursor:'pointer', color:W28, fontSize:18 }}>?</button>
        <div style={{ fontSize:9, letterSpacing:'0.3em', textTransform:'uppercase', color:GL, marginBottom:8, fontWeight:700, fontFamily:FD }}>Client Profile</div>
        <div style={{ fontFamily:FD, fontSize:22, fontWeight:700, color:W, marginBottom:6 }}>{client.name}</div>
        <div style={{ marginBottom:16, display:'flex', gap:8, flexWrap:'wrap' }}>
          <Badge label={client.status} color={statusColor(client.status)} bg={statusBg(client.status)} border={statusBorder(client.status)} />
          <Badge label={client.industry} color={G3} bg={hex2rgba(G3,0.12)} border={hex2rgba(G3,0.38)} />
        </div>
        {client.description&&<div style={{ padding:'12px 14px', background:BB2, border:`1px solid ${BB}`, marginBottom:18, fontSize:13, color:W85, lineHeight:1.6, borderRadius:3, fontFamily:FD }}>{client.description}</div>}
        {[{label:'Contact',value:client.contact},{label:'Email',value:client.email},{label:'Phone',value:client.phone},{label:'City',value:client.city},{label:'Website',value:client.website||'â€”'},{label:'Reg. Number',value:client.regNumber||'â€”'},{label:'Registered',value:client.registeredDate},{label:'Campaigns',value:`${client.jobsRun} campaigns`},{label:'Total Hours',value:`${client.totalHours} hrs`},{label:'Spend',value:client.budget}].map(r=>(
          <div key={r.label} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:`1px solid ${BB}` }}>
            <span style={{ fontSize:12, color:W55, fontFamily:FD }}>{r.label}</span>
            <span style={{ fontSize:12, color:W85, fontWeight:700, fontFamily:FD }}>{r.value}</span>
          </div>
        ))}
        <div style={{ display:'flex', gap:12, marginTop:24 }}>
          <Btn onClick={onClose}>Message Client</Btn>
          <Btn onClick={onClose} outline>View Jobs</Btn>
        </div>
      </div>
    </div>
  )
}

// --- DASHBOARD TAB ------------------------------------------------------------
function DashboardTab({ regs, clients, msgs, time, onRoute, pendingChatRequests }: { regs:any[]; clients:any[]; msgs:any[]; time:Date; onRoute:(id:string)=>void; pendingChatRequests?:any[] }) {
  const h = time.getHours()
  const greeting = h<12?'Good morning':h<17?'Good afternoon':h<21?'Good evening':'Good night'
  const unread = msgs.filter(m=>!m.read).length
  const activeJobs = getActiveJobs(getAllJobsWithAdminJobs())
  const liveActivity = buildLiveActivity(regs)
  const pendingRequestCount = pendingChatRequests?.length || 0
  const stats = [
    { label:'Active Promoters',  value:regs.filter(r=>r.role==='promoter'&&r.status==='approved').length, color:G3, sub:'registered',            id:'registrations' },
    { label:'Active Jobs',       value:activeJobs.length,                                                 color:GL, sub:'live on jobs board',    id:'jobs'          },
    { label:'Pending Approvals', value:regs.filter(r=>isPending(r.status)).length,                        color:G3, sub:'need review',           id:'registrations' },
    { label:'Unread Messages',   value:unread,                                                             color:G2, sub:'complaints & enquiries',id:'messages'      },
    { label:'Active Clients',    value:clients.filter(c=>c.status==='active').length,                     color:G4, sub:'business clients',      id:'clients'       },
  ]
  const quickActions = [
    {label:'Registrations',icon:'?',id:'registrations',color:GL},{label:'Messages',icon:'?',id:'messages',color:G3},
    {label:'Live Map',icon:'?',id:'map',color:G2},{label:'Clients',icon:'?',id:'clients',color:GL},{label:'Supervisors',icon:'?',id:'supervisors',color:G3},
    {label:'Jobs',icon:'?',id:'jobs',color:G4},{label:'Complaints',icon:'?',id:'reviews',color:GL},
    {label:'Reports',icon:'?',id:'reports',color:G3},{label:'Settings',icon:'?',id:'settings',color:G2},
  ]
  return (
    <div className="hg-page" style={{ padding:'40px 48px' }}>
      <div className="hg-dash-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:32 }}>
        <div>
          <div style={{ fontSize:9, letterSpacing:'0.38em', textTransform:'uppercase', color:GL, marginBottom:8, fontWeight:700, fontFamily:FD }}>Admin Dashboard</div>
          <h1 style={{ fontFamily:FD, fontSize:30, fontWeight:700, color:W }}>{greeting}, Admin.</h1>
          <p style={{ fontSize:13, color:W55, marginTop:6, fontFamily:FD }}>Here's what's happening across the platform today.</p>
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontFamily:FD, fontSize:26, color:GL }}>{time.toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'})}</div>
          <div style={{ fontSize:11, color:W55, marginTop:4, fontFamily:FD }}>{time.toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long'})}</div>
        </div>
      </div>
      {pendingRequestCount > 0 && (
        <div onClick={()=>onRoute('messages')} role="button"
          style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap',
            background:'rgba(201,191,166,0.10)', border:`1px solid ${hex2rgba(GL,0.4)}`, borderRadius:6,
            padding:'14px 20px', marginBottom:24, cursor:'pointer' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:15 }}>💬</span>
            <span style={{ fontSize:9, letterSpacing:'0.22em', textTransform:'uppercase', color:GL, fontWeight:700, fontFamily:FD }}>New Message Requests</span>
            <span style={{ fontSize:12, color:W55, fontFamily:FD }}>
              {pendingRequestCount} supervisor{pendingRequestCount!==1?'s are':' is'} waiting for you to accept their first message
            </span>
          </div>
          <span style={{ padding:'6px 14px', borderRadius:4, border:`1px solid ${hex2rgba(GL,0.5)}`, background:hex2rgba(GL,0.14), color:GL, fontFamily:FD, fontWeight:700, fontSize:11 }}>
            Review →
          </span>
        </div>
      )}
      <div className="hg-stat-grid hg-stat-grid-5 hg-dash-stats" style={{ background:BB, marginBottom:28 }}>
        {stats.map((s,i)=><StatCard key={i} label={s.label} value={s.value} sub={s.sub} color={s.color} onClick={()=>onRoute(s.id)} />)}
      </div>
      <div className="hg-dash-two-col" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:1, background:BB }}>
        <div style={{ background:'rgba(9,9,7,0.6)', padding:24 }}>
          <div style={{ fontSize:9, letterSpacing:'0.3em', textTransform:'uppercase', color:GL, marginBottom:16, fontWeight:700, fontFamily:FD }}>Quick Actions</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:1, background:BB }}>
            {quickActions.map(a=>(
              <button key={a.id} onClick={()=>onRoute(a.id)} style={{ padding:'14px 12px', background:D3, border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:8, transition:'all 0.2s', fontFamily:FD }}
                onMouseEnter={e=>{e.currentTarget.style.background=GM;e.currentTarget.style.transform='translateY(-1px)'}}
                onMouseLeave={e=>{e.currentTarget.style.background=D3;e.currentTarget.style.transform='translateY(0)'}}>
                <span style={{ fontSize:14, color:a.color }}>{a.icon}</span>
                <span style={{ fontSize:12, color:W, fontWeight:700, fontFamily:FD }}>{a.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ background:'rgba(9,9,7,0.6)', padding:24 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ fontSize:9, letterSpacing:'0.3em', textTransform:'uppercase', color:GL, fontWeight:700, fontFamily:FD }}>Live Activity</div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}><div style={{ width:6, height:6, borderRadius:'50%', background:GL }} /><span style={{ fontSize:10, color:W55, fontFamily:FD }}>Live</span></div>
          </div>
          {liveActivity.map((a,i)=>(
            <div key={i} style={{ display:'flex', gap:10, padding:'9px 0', borderBottom:i<liveActivity.length-1?`1px solid ${BB}`:'none' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:TYPE_CLR[a.type]??GL, marginTop:4, flexShrink:0 }} />
              <div>
                <div style={{ fontSize:12, color:W, lineHeight:1.4, fontFamily:FD }}>{a.msg}</div>
                <div style={{ fontSize:10, color:W28, marginTop:2, fontFamily:FD }}>{a.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- REGISTRATIONS TAB --------------------------------------------------------
function RegistrationsTab({ regs, onDetail, onApprove, onReject }: { regs:any[]; onDetail:(r:any)=>void; onApprove:(id:string)=>void; onReject:(id:string)=>void }) {
  const [statusF,setStatusF]=useState('all')
  const [roleF,  setRoleF  ]=useState('all')
  const [dateF,  setDateF  ]=useState('all')
  const pendingCount=regs.filter(r=>isPending(r.status)).length
  const dates=['all',...Array.from(new Set(regs.map(r=>r.date).filter(Boolean)))]
  const filtered=regs.filter(r=>{const sm=statusF==='all'||r.status===statusF;const rm=roleF==='all'||r.role===roleF;const dm=dateF==='all'||r.date===dateF;return sm&&rm&&dm})
  return (
    <div className="hg-page" style={{ padding:'40px 48px' }}>
      <div className="hg-page-header" style={{ marginBottom:24 }}>
        <div>
          <div style={{ fontSize:9, letterSpacing:'0.38em', textTransform:'uppercase', color:GL, marginBottom:8, fontWeight:700, fontFamily:FD }}>People Â· Registrations</div>
          <h1 style={{ fontFamily:FD, fontSize:28, fontWeight:700, color:W }}>Registrations</h1>
          <p style={{ fontSize:13, color:W55, marginTop:4, fontFamily:FD }}>Review and approve promoter and business applications.</p>
        </div>
        <div style={{ fontSize:12, color:W55, fontFamily:FD }}><span style={{ color:GL, fontWeight:700 }}>{pendingCount}</span> pending</div>
      </div>
      <div className="hg-filter-row" style={{ marginBottom:18 }}>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>{(['all','pending','approved','rejected'] as const).map(f=><FilterBtn key={f} label={f} active={statusF===f} color={f==='all'?GL:statusColor(f)} onClick={()=>setStatusF(f)} />)}</div>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>{(['all','promoter','business'] as const).map(f=><FilterBtn key={f} label={f} active={roleF===f} color={G3} onClick={()=>setRoleF(f)} />)}</div>
        <select value={dateF} onChange={e=>setDateF(e.target.value)} style={{ background:D2, border:`1px solid ${BB}`, padding:'6px 12px', color:W, fontFamily:FD, fontSize:10, outline:'none', cursor:'pointer', borderRadius:3 }}>
          {dates.map(d=><option key={d} value={d}>{d==='all'?'All Dates':d}</option>)}
        </select>
      </div>
      <div className="hg-table-wrap" style={{ background:D2, border:`1px solid ${BB}`, borderRadius:4, overflow:'hidden' }}>
        <table className="hg-table-cards" style={{ width:'100%', borderCollapse:'collapse', minWidth:600 }}>
          <thead><tr style={{ borderBottom:`1px solid ${BB}`, background:D1 }}>
            {['Name','Role','City','Date','Status','Source','Actions'].map(h=><th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:9, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:W55, fontFamily:FD }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map((r,i)=>(
              <tr key={r.id} style={{ borderBottom:i<filtered.length-1?`1px solid ${BB}`:'none', transition:'background 0.18s' }}
                onMouseEnter={e=>(e.currentTarget.style.background=BB2)} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                <td data-label="Name" style={{ padding:'12px 16px' }}><div style={{ fontSize:13, fontWeight:700, color:W, fontFamily:FD }}>{r.name}</div><div style={{ fontSize:11, color:W55, fontFamily:FD }}>{r.email}</div></td>
                <td data-label="Role" style={{ padding:'12px 16px' }}><Badge label={r.role} color={r.role==='promoter'?G3:GL} bg={hex2rgba(r.role==='promoter'?G3:GL,0.12)} border={hex2rgba(r.role==='promoter'?G3:GL,0.38)} /></td>
                <td data-label="City" className="hg-col-hide-sm" style={{ padding:'12px 16px', fontSize:12, color:W55, fontFamily:FD }}>{r.city}</td>
                <td data-label="Date" className="hg-col-hide-md" style={{ padding:'12px 16px', fontSize:12, color:W55, fontFamily:FD }}>{r.date}</td>
                <td data-label="Status" style={{ padding:'12px 16px' }}><Badge label={r.status} color={statusColor(r.status)} bg={statusBg(r.status)} border={statusBorder(r.status)} /></td>
                <td data-label="Source" className="hg-col-hide-md" style={{ padding:'12px 16px' }}><span style={{ fontSize:10, fontWeight:700, color:r.source==='real'?GL:W55, fontFamily:FD }}>{r.source==='real'?'? Live':'? Demo'}</span></td>
                <td data-label="Actions" style={{ padding:'12px 16px' }}>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                    <button onClick={()=>onDetail(r)} style={{ fontSize:11, color:GL, background:'none', border:'none', cursor:'pointer', fontFamily:FD, fontWeight:700 }}>View ?</button>
                    {isPending(r.status)&&<><button onClick={()=>onApprove(r.id)} style={{ fontSize:10, color:B, background:G3, border:'none', cursor:'pointer', fontFamily:FD, fontWeight:700, padding:'5px 12px', borderRadius:3, letterSpacing:'0.06em' }}>Approve</button><button onClick={()=>onReject(r.id)} style={{ fontSize:10, color:C_REJECTED, background:hex2rgba(G5,0.35), border:`1px solid ${hex2rgba(G2,0.45)}`, cursor:'pointer', fontFamily:FD, fontWeight:700, padding:'5px 12px', borderRadius:3, letterSpacing:'0.06em' }}>Reject</button></>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length===0&&<div style={{ padding:40, textAlign:'center', color:W55, fontSize:13, fontFamily:FD }}>No registrations match your filters.</div>}
      </div>
    </div>
  )
}

// --- CLIENTS TAB --------------------------------------------------------------
function ClientsTab({ clients, setClients }: { clients:any[]; setClients:React.Dispatch<React.SetStateAction<any[]>> }) {
  const [statusF,setStatusF]=useState('all')
  const [search, setSearch ]=useState('')
  const [viewing,setViewing]=useState<any>(null)

  const avatarAccents=[GL,G3,G4,G2,C_NEW,G3,GL,G2]
  const filtered=clients.filter(c=>{
    const sm=statusF==='all'||c.status===statusF
    const qm=search===''||c.name.toLowerCase().includes(search.toLowerCase())||c.contact.toLowerCase().includes(search.toLowerCase())||c.email.toLowerCase().includes(search.toLowerCase())
    return sm&&qm
  })
  const totalJobs  =clients.reduce((a,c)=>a+c.jobsRun,0)
  const totalHours =clients.reduce((a,c)=>a+c.totalHours,0)
  const activeCount=clients.filter(c=>c.status==='active').length
  const newCount   =clients.filter(c=>c.status==='new').length

  return (
    <div className="hg-page" style={{ padding:'40px 48px' }}>
      <div className="hg-page-header" style={{ marginBottom:28 }}>
        <div>
          <div style={{ fontSize:9, letterSpacing:'0.38em', textTransform:'uppercase', color:GL, marginBottom:8, fontWeight:700, fontFamily:FD }}>People Â· Clients</div>
          <h1 style={{ fontFamily:FD, fontSize:28, fontWeight:700, color:W }}>Client Accounts</h1>
          <p style={{ fontSize:13, color:W55, marginTop:4, fontFamily:FD }}>Businesses registered on the platform who book promoters.</p>
        </div>
      </div>

      <div className="hg-stat-grid hg-stat-grid-4" style={{ background:BB, marginBottom:28 }}>
        {[{label:'Active Clients',value:activeCount,color:GL,sub:`of ${clients.length} total`},{label:'New This Quarter',value:newCount,color:C_NEW,sub:'recently joined'},{label:'Total Campaigns',value:totalJobs,color:G3,sub:'across all clients'},{label:'Total Hours',value:`${totalHours}h`,color:G2,sub:'promoter hours booked'}].map((s,i)=><StatCard key={i} label={s.label} value={s.value} sub={s.sub} color={s.color} />)}
      </div>

      <div className="hg-filter-row" style={{ marginBottom:20 }}>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          {(['all','active','new','inactive'] as const).map(f=><FilterBtn key={f} label={f} active={statusF===f} color={f==='all'?GL:statusColor(f)} onClick={()=>setStatusF(f)} />)}
        </div>
        <div style={{ position:'relative' }}>
          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:W28, fontSize:12, pointerEvents:'none' }}>?</span>
          <input placeholder="Search clientsâ€¦" value={search} onChange={e=>setSearch(e.target.value)}
            style={{ background:D2, border:`1px solid ${BB}`, padding:'7px 14px 7px 28px', color:W, fontFamily:FD, fontSize:11, outline:'none', borderRadius:3, width:200 }}
            onFocus={e=>e.currentTarget.style.borderColor=GL} onBlur={e=>e.currentTarget.style.borderColor=BB} />
        </div>
      </div>

      {/* Client cards grid â€” mobile friendly */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:12 }}>
        {filtered.map((c,i)=>{
          const accent=avatarAccents[i%avatarAccents.length]
          return (
            <div key={c.id} onClick={()=>setViewing(c)}
              style={{ background:D2, border:`1px solid ${BB}`, borderRadius:4, padding:'20px 20px 16px', cursor:'pointer', transition:'all 0.18s', position:'relative', overflow:'hidden' }}
              onMouseEnter={e=>{e.currentTarget.style.background=GM;e.currentTarget.style.borderColor=hex2rgba(accent,0.4)}}
              onMouseLeave={e=>{e.currentTarget.style.background=D2;e.currentTarget.style.borderColor=BB}}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${G5},${accent},${G5})` }} />
              <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:12 }}>
                <div style={{ width:40, height:40, borderRadius:8, flexShrink:0, background:`linear-gradient(145deg,${G5}CC,${hex2rgba(accent,0.28)})`, border:`1px solid ${hex2rgba(accent,0.32)}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:accent, fontFamily:FD }}>{c.name.charAt(0)}</div>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:W, fontFamily:FD, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{c.name}</div>
                  <div style={{ fontSize:10, color:accent, fontWeight:700, marginTop:2, fontFamily:FD }}>{c.industry}</div>
                  <div style={{ fontSize:11, color:W55, marginTop:1, fontFamily:FD }}>{c.city}</div>
                </div>
                <Badge label={c.status} color={statusColor(c.status)} bg={statusBg(c.status)} border={statusBorder(c.status)} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {[{label:'Campaigns',value:c.jobsRun},{label:'Hours',value:`${c.totalHours}h`},{label:'Budget',value:c.budget}].map(s=>(
                  <div key={s.label} style={{ background:BB2, border:`1px solid ${BB}`, padding:'8px 10px', borderRadius:3 }}>
                    <div style={{ fontSize:8, color:W28, letterSpacing:'0.12em', textTransform:'uppercase', fontFamily:FD, marginBottom:3 }}>{s.label}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:W, fontFamily:FD }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontSize:11, color:W55, fontFamily:FD }}>{c.contact} Â· {c.email}</div>
                <span style={{ fontSize:11, color:GL, fontFamily:FD }}>View ?</span>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length===0&&<div style={{ padding:'48px 0', textAlign:'center', color:W55, fontSize:13, fontFamily:FD }}>No clients match your filters.</div>}
      <div style={{ marginTop:12, fontSize:11, color:W28, fontFamily:FD }}>Showing <strong style={{ color:W55 }}>{filtered.length}</strong> of <strong style={{ color:W55 }}>{clients.length}</strong> clients</div>

      {viewing&&<ClientModal client={viewing} onClose={()=>setViewing(null)} />}
    </div>
  )
}

// --- LOGINS TAB ---------------------------------------------------------------
function LoginsTab() {
  const [logins,setLogins]=useState<any[]>(MOCK_LOGINS)
  const [roleF, setRoleF ]=useState('all')
  const [dateF, setDateF ]=useState('all')

  useEffect(()=>{
    try {
      const stored=localStorage.getItem('hg_login_activity'); if(!stored) return
      const localLogins:any[]=JSON.parse(stored); if(!localLogins.length) return
      setLogins(prev=>{
        const existingIds=new Set(prev.map(l=>l.id))
        const fresh=localLogins.filter(l=>!existingIds.has(l.id)).map(l=>({id:l.id,name:l.name,email:l.email,role:l.role?.toLowerCase()||'promoter',time:l.loginAt,ip:'â€”'}))
        return [...fresh,...prev]
      })
    } catch {}
    const onStorage=()=>{try{const stored=localStorage.getItem('hg_login_activity');if(!stored) return;const localLogins:any[]=JSON.parse(stored);setLogins(prev=>{const existingIds=new Set(prev.map(l=>l.id));const fresh=localLogins.filter(l=>!existingIds.has(l.id)).map(l=>({id:l.id,name:l.name,email:l.email,role:l.role?.toLowerCase()||'promoter',time:l.loginAt,ip:'â€”'}));return fresh.length?[...fresh,...prev]:prev})}catch{}}
    window.addEventListener('storage',onStorage)
    return ()=>window.removeEventListener('storage',onStorage)
  },[])

  const dates=['all',...Array.from(new Set(logins.map(l=>l.time?.slice(0,10)).filter(Boolean)))]
  const filtered=logins.filter(l=>{const rm=roleF==='all'||l.role===roleF;const dm=dateF==='all'||l.time?.startsWith(dateF);return rm&&dm})
  const todayStr=new Date().toISOString().slice(0,10)

  return (
    <div className="hg-page" style={{ padding:'40px 48px' }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:9, letterSpacing:'0.38em', textTransform:'uppercase', color:GL, marginBottom:8, fontWeight:700, fontFamily:FD }}>Comms Â· Activity</div>
        <h1 style={{ fontFamily:FD, fontSize:28, fontWeight:700, color:W }}>Login Activity</h1>
        <p style={{ fontSize:13, color:W55, marginTop:4, fontFamily:FD }}>All non-admin logins Â· <strong style={{ color:W85 }}>{logins.length}</strong> events recorded</p>
      </div>

      <div className="hg-stat-grid hg-stat-grid-3" style={{ background:BB, marginBottom:24 }}>
        {[{label:'Logins Today',value:logins.filter(l=>l.time?.startsWith(todayStr)).length,color:GL},{label:'Promoters',value:logins.filter(l=>l.role==='promoter').length,color:G3},{label:'Businesses',value:logins.filter(l=>l.role==='business').length,color:G2}].map((s,i)=><StatCard key={i} label={s.label} value={s.value} color={s.color} />)}
      </div>

      <div className="hg-filter-row" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>{(['all','promoter','business'] as const).map(f=><FilterBtn key={f} label={f} active={roleF===f} color={G3} onClick={()=>setRoleF(f)} />)}</div>
        <select value={dateF} onChange={e=>setDateF(e.target.value)} style={{ background:D2, border:`1px solid ${BB}`, padding:'6px 12px', color:W, fontFamily:FD, fontSize:10, outline:'none', cursor:'pointer', borderRadius:3 }}>
          {dates.map(d=><option key={d} value={d}>{d==='all'?'All Dates':d}</option>)}
        </select>
      </div>

      <div className="hg-table-wrap" style={{ background:D2, border:`1px solid ${BB}`, borderRadius:4, overflow:'hidden' }}>
        <table className="hg-table-cards" style={{ width:'100%', borderCollapse:'collapse', minWidth:500 }}>
          <thead><tr style={{ borderBottom:`1px solid ${BB}`, background:D1 }}>
            {['User','Role','Time','IP Address'].map(h=><th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:9, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:W55, fontFamily:FD }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map((l,i)=>(
              <tr key={l.id} style={{ borderBottom:i<filtered.length-1?`1px solid ${BB}`:'none', transition:'background 0.18s' }}
                onMouseEnter={e=>(e.currentTarget.style.background=BB2)} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                <td data-label="User" style={{ padding:'12px 16px' }}><div style={{ fontSize:13, fontWeight:700, color:W, fontFamily:FD }}>{l.name}</div><div style={{ fontSize:11, color:W55, fontFamily:FD }}>{l.email}</div></td>
                <td data-label="Role" style={{ padding:'12px 16px' }}><Badge label={l.role} color={l.role==='promoter'?G3:GL} bg={hex2rgba(l.role==='promoter'?G3:GL,0.12)} border={hex2rgba(l.role==='promoter'?G3:GL,0.38)} /></td>
                <td data-label="Time" style={{ padding:'12px 16px', fontSize:12, color:W55, fontFamily:FD, whiteSpace:'nowrap' }}>
                  {l.time?new Date(l.time).toLocaleString('en-ZA',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'â€”'}
                </td>
                <td data-label="IP" className="hg-col-hide-sm" style={{ padding:'12px 16px', fontSize:12, color:W55, fontFamily:MONO }}>{l.ip||'â€”'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length===0&&<div style={{ padding:40, textAlign:'center', color:W55, fontSize:13, fontFamily:FD }}>No login activity recorded yet.</div>}
      </div>
    </div>
  )
}

// --- REPORTS TAB -------------------------------------------------------------
// -- Real download helpers -----------------------------------------------------
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href    = url
  a.download= filename
  a.style.display='none'
  document.body.appendChild(a)
  a.click()
  // Small delay before cleanup so mobile browsers have time to register the tap
  setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url) }, 1000)
}

function downloadCSV(rows: string[][], filename: string) {
  const csv = rows.map(r=>r.map(c=>`"${String(c??'').replace(/"/g,'""')}"`).join(',')).join('\r\n')
  triggerDownload(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'}),filename)
}

function downloadPDF(htmlContent: string, filename: string) {
  // Build a printable HTML file and download it, then auto-print
  const fullHtml=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${filename}</title><style>body{font-family:Georgia,serif;padding:32px;color:#111;font-size:13px}h1{font-size:24px;margin-bottom:8px}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#ECECEC;padding:8px 12px;text-align:left;font-size:11px;letter-spacing:.1em;text-transform:uppercase}td{padding:8px 12px;border-bottom:1px solid #D9D9D9}@media print{body{padding:16px}}</style></head><body>${htmlContent}</body></html>`
  triggerDownload(new Blob([fullHtml],{type:'text/html;charset=utf-8;'}),filename+'.html')
}

const todayStr = () => new Date().toISOString().slice(0,10)

const PAYROLL_MOCK = [
  {id:'PAY-001',promoter:'Ayanda Dlamini', email:'ayanda@email.com', bank:'FNB',      job:'Red Bull â€” Sandton',     date:'2026-03-08',hours:8,rate:120,deductions:0,  status:'pending' },
  {id:'PAY-002',promoter:'Thabo Nkosi',    email:'thabo@email.com',  bank:'Capitec',  job:'Red Bull â€” Sandton',     date:'2026-03-08',hours:8,rate:120,deductions:50, status:'pending' },
  {id:'PAY-003',promoter:'Sipho Mhlongo',  email:'sipho@email.com',  bank:'ABSA',     job:'Nike â€” Mall of Africa',  date:'2026-03-07',hours:8,rate:135,deductions:0,  status:'approved'},
  {id:'PAY-004',promoter:'Zanele Motha',   email:'zanele@email.com', bank:'Standard', job:'Nike â€” Mall of Africa',  date:'2026-03-07',hours:8,rate:135,deductions:0,  status:'approved'},
  {id:'PAY-005',promoter:'Bongani Khumalo',email:'bongani@email.com',bank:'Nedbank',  job:'Savanna â€” Gateway',      date:'2026-03-06',hours:8,rate:115,deductions:100,status:'exported'},
  {id:'PAY-006',promoter:'Lerato Mokoena', email:'lerato@email.com', bank:'FNB',      job:'Nedbank Golf Day',       date:'2026-03-05',hours:8,rate:150,deductions:0,  status:'paid'   },
]
const gross=(r:any)=>r.hours*r.rate
const net  =(r:any)=>gross(r)-r.deductions

function downloadExcel(rows: string[][], filename: string) {
  const tsv = rows.map(r=>r.map(c=>`"${String(c??'').replace(/"/g,'""')}"`).join('\t')).join('\r\n')
  triggerDownload(new Blob(['\uFEFF'+tsv],{type:'application/vnd.ms-excel;charset=utf-8;'}),filename)
}

function buildTablePDF(title: string, headers: string[], rows: (string|number)[][]): string {
  const ths = headers.map(h=>`<th>${h}</th>`).join('')
  const trs = rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')
  return `<h1 style="font-family:Georgia;color:#6E6A5E;margin-bottom:6px">${title}</h1><p style="font-size:11px;color:#666;margin-bottom:16px">HoneyGroup Â· Generated ${new Date().toLocaleDateString('en-ZA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p><table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`
}

function ReportsTab({ regs }: { regs:any[] }) {
  const [pos, setPos] = useState<PurchaseOrder[]>([])
  const [posLoading, setPosLoading] = useState(true)

  useEffect(() => {
    purchaseOrdersService.getAll()
      .then(setPos)
      .catch(() => setPos([]))
      .finally(() => setPosLoading(false))
  }, [])

  const [hourlyRate,setHourlyRate]=useState('120')
  const [hours,     setHours     ]=useState('8')
  const [numPromos, setNumPromos ]=useState('6')
  const [notice,    setNotice    ]=useState('')
  const calcTotal=parseFloat(hourlyRate||'0')*parseFloat(hours||'0')*parseFloat(numPromos||'0')
  const flash=(msg:string)=>{setNotice(msg);setTimeout(()=>setNotice(''),4000)}
  const activeJobs=getActiveJobs(getAllJobsWithAdminJobs())

  // -- Data builders ----------------------------------------------------------
  const payrollHeaders=['ID','Promoter','Email','Bank','Job','Date','Hours','Rate','Gross','Deductions','Net','Status']
  const payrollRows=PAYROLL_MOCK.map(r=>[r.id,r.promoter,r.email,r.bank,r.job,r.date,r.hours,r.rate,gross(r),r.deductions,net(r),r.status])

  const attendanceHeaders=['ID','Promoter','Job','Date','Hours','Rate (R/hr)','Gross (R)']
  const attendanceRows=PAYROLL_MOCK.map(r=>[r.id,r.promoter,r.job,r.date,r.hours,r.rate,gross(r)])

  const eftApproved=PAYROLL_MOCK.filter(r=>r.status==='approved')
  const eftHeaders=['Promoter','Email','Bank','Net Payout (R)','Job','Date']
  const eftRows=eftApproved.map(r=>[r.promoter,r.email,r.bank,net(r),r.job,r.date])

  const getJobsData=()=>{
    const stored=localStorage.getItem('hg_admin_jobs'); const jobs=stored?JSON.parse(stored):[]
    const headers=['ID','Title','Client','Location','Date','Pay','Slots','Slots Left','Status']
    const rows=jobs.length>0?jobs.map((j:any)=>[j.id,j.title,j.company||j.client,j.location||`${j.venue},${j.city}`,j.jobDate||j.date,j.pay||`R${j.hourlyRate}/hr`,j.slots||j.totalSlots,j.slotsLeft??(j.totalSlots-j.filledSlots),j.status]):[['No jobs data â€” add jobs first']]
    return {headers,rows}
  }

  const getPromotersData=()=>{
    const stored=localStorage.getItem('hg_promoters_cache'); const users=stored?JSON.parse(stored):[]
    const headers=['ID','Name','Email','City','Reliability Score','Status','Joined']
    const rows=users.length>0?users.map((u:any)=>[u.id,u.fullName||u.name,u.email,u.city,u.reliabilityScore??'',u.status,u.createdAt?.slice(0,10)??'']):[['Connect to API to export live data']]
    return {headers,rows}
  }

  // -- Purchase Orders Register ----------------------------------------------
  const poHeaders = ['PO Number','Client','Amount (R)','Committed (R)','Remaining (R)','% Committed','Status','Period Start','Period End']
  const poRows = pos.map(p => [
    p.poNumber, p.client?.name || 'â€”', p.amount, p.committedAmount,
    p.amount - p.committedAmount, `${p.percentCommitted}%`, p.status,
    p.periodStart ? new Date(p.periodStart).toLocaleDateString('en-ZA') : 'â€”',
    p.periodEnd ? new Date(p.periodEnd).toLocaleDateString('en-ZA') : 'â€”',
  ])

  // -- Commitment Entries (CE) Ledger â€” flattened from all POs ----------------
  const ceHeaders = ['CE Number','PO Number','Client','Job','Amount (R)','Status','Notes']
  const ceRows = pos.flatMap(p =>
    (p.commitments || []).map(ce => [
      ce.ceNumber || ce.id.slice(0, 8), p.poNumber, p.client?.name || 'â€”',
      ce.job?.title || 'â€”', ce.amount, ce.status, ce.notes || '',
    ])
  )

  // -- Business Financial Summary â€” rollup per client across all their POs ----
  const bizSummaryMap = new Map<string, { name:string; poCount:number; total:number; committed:number; remaining:number }>()
  pos.forEach(p => {
    const key = p.client?.id || p.client?.name || 'unknown'
    const existing = bizSummaryMap.get(key) || { name: p.client?.name || 'Unknown', poCount: 0, total: 0, committed: 0, remaining: 0 }
    existing.poCount += 1
    existing.total += p.amount
    existing.committed += p.committedAmount
    existing.remaining += (p.amount - p.committedAmount)
    bizSummaryMap.set(key, existing)
  })
  const bizSummaryHeaders = ['Business','Purchase Orders','Total Value (R)','Committed (R)','Remaining (R)']
  const bizSummaryRows = Array.from(bizSummaryMap.values())
    .sort((a, b) => b.total - a.total)
    .map(b => [b.name, b.poCount, b.total, b.committed, b.remaining])

  const campaignSections=Object.entries(PAYROLL_MOCK.reduce((acc:any,r)=>{(acc[r.job]=acc[r.job]||[]).push(r);return acc},{})).map(([job,recs]:any)=>{
    const totalNet=recs.reduce((s:number,r:any)=>s+net(r),0)
    const rows=recs.map((r:any)=>`<tr><td>${r.promoter}</td><td>${r.date}</td><td>${r.hours}h</td><td>R${r.rate}/hr</td><td style="color:#6E6A5E;font-weight:700">R${net(r)}</td><td style="text-transform:capitalize">${r.status}</td></tr>`).join('')
    return `<h2 style="font-size:15px;color:#6E6A5E;border-left:3px solid #6E6A5E;padding-left:10px;margin:24px 0 12px">${job}</h2><table><thead><tr><th>Promoter</th><th>Date</th><th>Hours</th><th>Rate</th><th>Net Pay</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table><p style="text-align:right;font-size:12px;font-weight:700;margin-top:6px">Campaign total: R${totalNet}</p>`
  }).join('')

  const inp:React.CSSProperties={ width:'100%', background:BB2, border:`1px solid ${BB}`, padding:'11px 14px', fontFamily:FD, fontSize:14, color:W, outline:'none', borderRadius:3, boxSizing:'border-box' as any }
  const lbl:React.CSSProperties={ fontSize:9, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase' as any, color:W55, display:'block', marginBottom:8, fontFamily:FD }

  // Each card has: icon, title, desc, color, and an array of { label, action }
  const cards=[
    {
      icon:'??', title:'Full Payroll Register', desc:'All promoter payouts with bank details, hours, rates, and net pay.', color:G3,
      btns:[
        {label:'CSV',   fn:()=>{downloadCSV([payrollHeaders,...payrollRows] as string[][],`honeygroup-promotions-payroll-${todayStr()}.csv`);flash('? Payroll CSV downloaded')}},
        {label:'Excel', fn:()=>{downloadExcel([payrollHeaders,...payrollRows] as string[][],`honeygroup-promotions-payroll-${todayStr()}.xls`);flash('? Payroll Excel downloaded')}},
        {label:'PDF',   fn:()=>{downloadPDF(buildTablePDF('Full Payroll Register',payrollHeaders,payrollRows),`honeygroup-promotions-payroll-${todayStr()}`);flash('? Payroll PDF â€” print/save from your browser')}},
      ]
    },
    {
      icon:'??', title:'Campaign Client Report', desc:'Per-client attendance and payout summary grouped by job.', color:GL,
      btns:[
        {label:'CSV',   fn:()=>{downloadCSV([payrollHeaders,...payrollRows] as string[][],`honeygroup-promotions-campaign-${todayStr()}.csv`);flash('? Campaign CSV downloaded')}},
        {label:'Excel', fn:()=>{downloadExcel([payrollHeaders,...payrollRows] as string[][],`honeygroup-promotions-campaign-${todayStr()}.xls`);flash('? Campaign Excel downloaded')}},
        {label:'PDF',   fn:()=>{downloadPDF(`<h1 style="font-family:Georgia;color:#6E6A5E">Campaign Report â€” HoneyGroup</h1><p style="font-size:11px;color:#666">Generated ${new Date().toLocaleDateString('en-ZA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>${campaignSections}`,`honeygroup-promotions-campaign-${todayStr()}`);flash('? Campaign PDF â€” print/save from your browser')}},
      ]
    },
    {
      icon:'??', title:'Jobs Register', desc:'All active and archived jobs with slots, rates, and status.', color:G4,
      btns:[
        {label:'CSV',   fn:()=>{const d=getJobsData();downloadCSV([d.headers,...d.rows] as string[][],`honeygroup-promotions-jobs-${todayStr()}.csv`);flash('? Jobs CSV downloaded')}},
        {label:'Excel', fn:()=>{const d=getJobsData();downloadExcel([d.headers,...d.rows] as string[][],`honeygroup-promotions-jobs-${todayStr()}.xls`);flash('? Jobs Excel downloaded')}},
        {label:'PDF',   fn:()=>{const d=getJobsData();downloadPDF(buildTablePDF('Jobs Register',d.headers,d.rows),`honeygroup-promotions-jobs-${todayStr()}`);flash('? Jobs PDF â€” print/save from your browser')}},
      ]
    },
    {
      icon:'??', title:'Promoter Roster', desc:'Full promoter list with city, reliability scores, and onboarding status.', color:G3,
      btns:[
        {label:'CSV',   fn:()=>{const d=getPromotersData();downloadCSV([d.headers,...d.rows] as string[][],`honeygroup-promotions-promoters-${todayStr()}.csv`);flash('? Promoters CSV downloaded')}},
        {label:'Excel', fn:()=>{const d=getPromotersData();downloadExcel([d.headers,...d.rows] as string[][],`honeygroup-promotions-promoters-${todayStr()}.xls`);flash('? Promoters Excel downloaded')}},
        {label:'PDF',   fn:()=>{const d=getPromotersData();downloadPDF(buildTablePDF('Promoter Roster',d.headers,d.rows),`honeygroup-promotions-promoters-${todayStr()}`);flash('? Promoters PDF â€” print/save from your browser')}},
      ]
    },
    {
      icon:'??', title:'EFT Batch File', desc:'Bank-ready payment batch â€” approved payroll records only.', color:GL,
      btns:[
        {label:'CSV',   fn:()=>{if(!eftApproved.length){flash('No approved records');return}downloadCSV([eftHeaders,...eftRows] as string[][],`honeygroup-promotions-eft-${todayStr()}.csv`);flash(`? EFT CSV â€” ${eftApproved.length} records`)}},
        {label:'Excel', fn:()=>{if(!eftApproved.length){flash('No approved records');return}downloadExcel([eftHeaders,...eftRows] as string[][],`honeygroup-promotions-eft-${todayStr()}.xls`);flash(`? EFT Excel â€” ${eftApproved.length} records`)}},
        {label:'PDF',   fn:()=>{if(!eftApproved.length){flash('No approved records');return}downloadPDF(buildTablePDF('EFT Batch File',eftHeaders,eftRows),`honeygroup-promotions-eft-${todayStr()}`);flash('? EFT PDF â€” print/save from your browser')}},
      ]
    },
    {
      icon:'??', title:'Attendance Summary', desc:'Shift-level check-in/out records with hours worked per promoter.', color:G4,
      btns:[
        {label:'CSV',   fn:()=>{downloadCSV([attendanceHeaders,...attendanceRows] as string[][],`honeygroup-promotions-attendance-${todayStr()}.csv`);flash('? Attendance CSV downloaded')}},
        {label:'Excel', fn:()=>{downloadExcel([attendanceHeaders,...attendanceRows] as string[][],`honeygroup-promotions-attendance-${todayStr()}.xls`);flash('? Attendance Excel downloaded')}},
        {label:'PDF',   fn:()=>{downloadPDF(buildTablePDF('Attendance Summary',attendanceHeaders,attendanceRows),`honeygroup-promotions-attendance-${todayStr()}`);flash('? Attendance PDF â€” print/save from your browser')}},
      ]
    },
  ]

  const summary=[
    {label:'Registered Promoters',value:regs.filter(r=>r.role==='promoter').length},
    {label:'Active Promoters',    value:regs.filter(r=>r.role==='promoter'&&r.status==='approved').length},
    {label:'Active Jobs on Board',value:activeJobs.length},
    {label:'Pending Approvals',   value:regs.filter(r=>isPending(r.status)).length},
    {label:'Shifts This Month',   value:42},
    {label:'Est. Promoter Payout (Month)',value:'R 84,200'},
  ]

  return (
    <div style={{ padding:'40px 48px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:9, letterSpacing:'0.38em', textTransform:'uppercase', color:GL, marginBottom:8, fontWeight:700, fontFamily:FD }}>System - Reporting</div>
          <h1 style={{ fontFamily:FD, fontSize:28, fontWeight:700, color:W }}>Reports &amp; Exports</h1>
          <p style={{ fontSize:13, color:W55,marginTop:4, fontFamily:FD }}>Download platform data as CSV, Excel, or printable PDF directly to your device.</p>
        </div>
        <button onClick={() => window.location.href = '/admin/budget'}
          style={{ padding:'11px 20px', background:hex2rgba(GL,0.14), border:`1px solid ${GL}`, color:GL, fontFamily:FD, fontSize:11, fontWeight:700, letterSpacing:'0.08em', cursor:'pointer', borderRadius:3, whiteSpace:'nowrap' }}>
          Open Budget Tracking -&gt;
        </button>
      </div>

      {notice&&<div style={{ padding:'12px 16px', background:hex2rgba(GL,0.10), border:`1px solid ${hex2rgba(GL,0.45)}`, borderRadius:4, marginBottom:20, fontSize:13, color:GL, fontFamily:FD, fontWeight:700 }}>{notice}</div>}

      {/* Export cards â€” 3 columns, 3 buttons each */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:28 }}>
        {cards.map((card,i)=>(
          <div key={i}
            style={{ background:D2, border:`1px solid ${BB}`, borderRadius:4, padding:'20px 20px 18px', position:'relative', overflow:'hidden', transition:'border-color 0.18s' }}
            onMouseEnter={e=>(e.currentTarget.style.borderColor=hex2rgba(card.color,0.5))}
            onMouseLeave={e=>(e.currentTarget.style.borderColor=BB)}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${card.color},${hex2rgba(card.color,0.3)})` }} />
            <div style={{ fontSize:20, marginBottom:10 }}>{card.icon}</div>
            <div style={{ fontSize:13, fontWeight:700, color:W, fontFamily:FD, marginBottom:6 }}>{card.title}</div>
            <div style={{ fontSize:12, color:W55, fontFamily:FD, lineHeight:1.6, marginBottom:14 }}>{card.desc}</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {card.btns.map((btn,j)=>(
                <button key={j} onClick={btn.fn}
                  style={{ padding:'6px 12px', background:j===0?`linear-gradient(135deg,${card.color},${hex2rgba(card.color,0.8)})`:'transparent', border:`1px solid ${card.color}`, color:j===0?B:card.color, fontFamily:FD, fontSize:9, fontWeight:700, letterSpacing:'0.1em', cursor:'pointer', textTransform:'uppercase' as const, borderRadius:3, transition:'all 0.18s', whiteSpace:'nowrap' as const }}
                  onMouseEnter={e=>{e.currentTarget.style.opacity='0.82'}}
                  onMouseLeave={e=>{e.currentTarget.style.opacity='1'}}>
                  ? {btn.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Payout Calculator */}
      <div style={{ background:D2, border:`1px solid ${BB}`, borderRadius:4, padding:'24px', marginBottom:24 }}>
        <div style={{ fontSize:10, letterSpacing:'0.28em', textTransform:'uppercase', color:GL, marginBottom:20, fontWeight:700, fontFamily:FD }}>? Promoter Payout Calculator</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:16, marginBottom:16, alignItems:'flex-end' }}>
          {[{label:'Hourly Rate (R)',val:hourlyRate,set:setHourlyRate},{label:'Hours per Shift',val:hours,set:setHours},{label:'No. of Promoters',val:numPromos,set:setNumPromos}].map(f=>(
            <div key={f.label}>
              <label style={lbl}>{f.label}</label>
              <input type="number" value={f.val} onChange={e=>f.set(e.target.value)} style={inp}
                onFocus={e=>e.currentTarget.style.borderColor=GL} onBlur={e=>e.currentTarget.style.borderColor=BB} />
            </div>
          ))}
          <div style={{ background:`linear-gradient(135deg,${hex2rgba(G3,0.28)},${hex2rgba(G,0.18)})`, border:`1px solid ${hex2rgba(GL,0.5)}`, borderRadius:4, padding:'16px 18px' }}>
            <div style={{ fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:W55, fontFamily:FD, marginBottom:8 }}>Total Payout</div>
            <div style={{ fontFamily:FD, fontSize:26, fontWeight:700, color:GL }}>R {calcTotal.toLocaleString('en-ZA')}</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>{const h=['Description','Value'];const r=[['Hourly Rate',`R${hourlyRate}`],['Hours Per Shift',`${hours}h`],['No. of Promoters',numPromos],['Total Payout',`R${calcTotal.toLocaleString('en-ZA')}`],['Generated',new Date().toISOString()]];downloadCSV([h,...r] as string[][],`honeygroup-promotions-estimate-${todayStr()}.csv`);flash('? Estimate CSV downloaded')}}
            style={{ padding:'9px 16px', background:'transparent', border:`1px solid ${G3}`, color:G3, fontFamily:FD, fontSize:11, fontWeight:700, cursor:'pointer', borderRadius:3, letterSpacing:'0.08em', transition:'all 0.2s' }}
            onMouseEnter={e=>e.currentTarget.style.background=hex2rgba(G3,0.15)}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>? CSV</button>
          <button onClick={()=>{const h=['Description','Value'];const r=[['Hourly Rate',`R${hourlyRate}`],['Hours Per Shift',`${hours}h`],['No. of Promoters',numPromos],['Total Payout',`R${calcTotal.toLocaleString('en-ZA')}`]];downloadExcel([h,...r] as string[][],`honeygroup-promotions-estimate-${todayStr()}.xls`);flash('? Estimate Excel downloaded')}}
            style={{ padding:'9px 16px', background:'transparent', border:`1px solid ${GL}`, color:GL, fontFamily:FD, fontSize:11, fontWeight:700, cursor:'pointer', borderRadius:3, letterSpacing:'0.08em', transition:'all 0.2s' }}
            onMouseEnter={e=>e.currentTarget.style.background=hex2rgba(GL,0.15)}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>? Excel</button>
        </div>
      </div>

      {/* Summary table */}
      <div style={{ background:D2, border:`1px solid ${BB}`, borderRadius:4 }}>
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${BB}`, fontSize:9, letterSpacing:'0.25em', textTransform:'uppercase', color:GL, fontWeight:700, fontFamily:FD }}>Platform Summary</div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <tbody>
            {summary.map((row,i)=>(
              <tr key={i} style={{ borderBottom:i<summary.length-1?`1px solid ${BB}`:'none' }}
                onMouseEnter={e=>(e.currentTarget.style.background=BB2)} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                <td style={{ padding:'13px 20px', fontSize:13, color:W55, fontFamily:FD }}>{row.label}</td>
                <td style={{ padding:'13px 20px', fontSize:14, fontWeight:700, color:GL, textAlign:'right', fontFamily:FD }}>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// --- SETTINGS TAB// --- SETTINGS TAB -------------------------------------------------------------
// --- SUPERVISORS TAB -----------------------------------------------------
function SupervisorsTab() {
  const [supervisors, setSupervisors] = useState<any[]>([])
  const [businesses,  setBusinesses]  = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [showCreate,  setShowCreate]  = useState(false)
  const [creating,    setCreating]    = useState(false)
  const [createErr,   setCreateErr]   = useState('')
  const [createdInfo, setCreatedInfo] = useState<any>(null)
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', city: '', workField: '', businessId: '' })
  const [viewing, setViewing] = useState<any>(null)

  const token = () => localStorage.getItem('hg_token')
  const authHdr = () => { const t = token(); return t ? { Authorization: `Bearer ${t}` } : {} }

  const load = async () => {
    setLoading(true)
    try {
      const [supRes, bizRes] = await Promise.all([
        fetch(`${API_URL}/users?role=SUPERVISOR`, { headers: authHdr() as any }),
        fetch(`${API_URL}/users?role=BUSINESS`,   { headers: authHdr() as any }),
      ])
      if (supRes.ok) setSupervisors(await supRes.json())
      if (bizRes.ok) setBusinesses(await bizRes.json())
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = supervisors.filter(s =>
    !search || s.fullName?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase())
  )

  const businessName = (id: string) => businesses.find(b => b.id === id)?.fullName || 'Unassigned'

  const createSupervisor = async () => {
    setCreateErr(''); setCreatedInfo(null)
    if (!form.fullName || !form.email || !form.businessId) {
      setCreateErr('Full name, email, and assigned business are required.')
      return
    }
    setCreating(true)
    try {
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { ...authHdr(), 'Content-Type': 'application/json' } as any,
        body: JSON.stringify({ ...form, role: 'SUPERVISOR' }),
      })
      const data = await res.json()
      if (res.ok) {
        setCreatedInfo(data)
        setForm({ fullName: '', email: '', phone: '', city: '', workField: '', businessId: '' })
        await load()
      } else {
        setCreateErr(data.error || 'Failed to create supervisor')
      }
    } catch { setCreateErr('Network error') }
    setCreating(false)
  }

  return (
    <div className="hg-page" style={{ padding: '40px 48px' }}>
      <div className="hg-page-header" style={{ marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: '0.38em', textTransform: 'uppercase', color: GL, marginBottom: 8, fontWeight: 700, fontFamily: FD }}>People - Supervisors</div>
          <h1 style={{ fontFamily: FD, fontSize: 28, fontWeight: 700, color: W }}>Supervisors</h1>
          <p style={{ fontSize: 13, color: W55, marginTop: 4, fontFamily: FD }}>Staff accounts that manage jobs and businesses on your behalf.</p>
        </div>
        <button onClick={() => { setShowCreate(true); setCreateErr(''); setCreatedInfo(null) }}
          style={{ padding: '11px 22px', background: `linear-gradient(135deg,${GL},${G})`, border: 'none', color: B, fontFamily: FD, fontSize: 11, fontWeight: 700, cursor: 'pointer', borderRadius: 3, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
          + New Supervisor
        </button>
      </div>

      <div className="hg-stat-grid hg-stat-grid-3" style={{ background: BB, marginBottom: 24 }}>
        {[
          { label: 'Total Supervisors', value: supervisors.length, color: GL },
          { label: 'Active',            value: supervisors.filter(s => s.status === 'approved').length, color: G3 },
          { label: 'Businesses Covered', value: new Set(supervisors.map(s => s.businessId).filter(Boolean)).size, color: G4 },
        ].map((s, i) => <StatCard key={i} label={s.label} value={s.value} color={s.color} />)}
      </div>

      <div className="hg-filter-row" style={{ marginBottom: 18 }}>
        <input placeholder="Search supervisors..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ background: D2, border: `1px solid ${BB}`, padding: '7px 14px', color: W, fontFamily: FD, fontSize: 11, outline: 'none', borderRadius: 3, width: 220 }}
          onFocus={e => e.currentTarget.style.borderColor = GL} onBlur={e => e.currentTarget.style.borderColor = BB} />
      </div>

      <div className="hg-table-wrap" style={{ background: D2, border: `1px solid ${BB}`, borderRadius: 4, overflow: 'hidden' }}>
        <table className="hg-table-cards" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
          <thead><tr style={{ borderBottom: `1px solid ${BB}`, background: D1 }}>
            {['Name', 'Assigned Business', 'Field', 'City', 'Status', 'Actions'].map(h => (
              <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: W55, fontFamily: FD }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: W55 }}>Loading...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: W55 }}>No supervisors yet.</td></tr>}
            {filtered.map((s, i) => (
              <tr key={s.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${BB}` : 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = BB2)} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: W, fontFamily: FD }}>{s.fullName}</div>
                  <div style={{ fontSize: 11, color: W55, fontFamily: FD }}>{s.email}</div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: GL, fontFamily: FD }}>{businessName(s.businessId)}</td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: W55, fontFamily: FD }}>{s.workField || '-'}</td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: W55, fontFamily: FD }}>{s.city || '-'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <Badge label={s.status || 'approved'} color={statusColor(s.status || 'approved')} bg={statusBg(s.status || 'approved')} border={statusBorder(s.status || 'approved')} />
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <button onClick={() => setViewing(s)} style={{ fontSize: 11, color: GL, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {viewing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24 }}
          onClick={e => e.target === e.currentTarget && setViewing(null)}>
          <div style={{ background: D2, border: `1px solid ${BB}`, padding: 40, width: '100%', maxWidth: 460, borderRadius: 4, position: 'relative' }}>
            <button onClick={() => setViewing(null)} style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', cursor: 'pointer', color: W28, fontSize: 18 }}>x</button>
            <div style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: GL, marginBottom: 8, fontWeight: 700, fontFamily: FD }}>Supervisor</div>
            <div style={{ fontFamily: FD, fontSize: 22, fontWeight: 700, color: W, marginBottom: 20 }}>{viewing.fullName}</div>
            {[
              { label: 'Email', value: viewing.email },
              { label: 'Phone', value: viewing.phone || '-' },
              { label: 'City', value: viewing.city || '-' },
              { label: 'Field Supervised', value: viewing.workField || '-' },
              { label: 'Assigned Business', value: businessName(viewing.businessId) },
              { label: 'Status', value: viewing.status },
              { label: 'Joined', value: viewing.createdAt ? new Date(viewing.createdAt).toLocaleDateString('en-ZA') : '-' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${BB}` }}>
                <span style={{ fontSize: 12, color: W55, fontFamily: FD }}>{r.label}</span>
                <span style={{ fontSize: 12, color: W85, fontWeight: 700, fontFamily: FD }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: D2, border: `1px solid ${BB}`, borderRadius: 8, padding: 28, width: 440 }}>
            <h3 style={{ fontFamily: FD, fontSize: 18, color: W, marginBottom: 18 }}>New Supervisor</h3>
            {createErr && <p style={{ color: '#C4614A', fontSize: 12, marginBottom: 12 }}>{createErr}</p>}
            {createdInfo && (
              <div style={{ padding: '12px 14px', background: hex2rgba(G3, 0.12), border: `1px solid ${hex2rgba(G3, 0.4)}`, borderRadius: 4, marginBottom: 14 }}>
                <p style={{ fontSize: 12, color: GL, fontWeight: 700, marginBottom: 4 }}>Supervisor created.</p>
                {createdInfo.temporaryPassword && (
                  <p style={{ fontSize: 11.5, color: W55 }}>Temporary password: <strong style={{ color: W }}>{createdInfo.temporaryPassword}</strong> - share this with them securely.</p>
                )}
              </div>
            )}
            <div style={{ display: 'grid', gap: 12 }}>
              <input placeholder="Full Name" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                style={{ background: BB2, border: `1px solid ${BB}`, color: W, padding: '10px 12px', borderRadius: 4, fontFamily: FD, fontSize: 12 }} />
              <input placeholder="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                style={{ background: BB2, border: `1px solid ${BB}`, color: W, padding: '10px 12px', borderRadius: 4, fontFamily: FD, fontSize: 12 }} />
              <input placeholder="Phone (optional)" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                style={{ background: BB2, border: `1px solid ${BB}`, color: W, padding: '10px 12px', borderRadius: 4, fontFamily: FD, fontSize: 12 }} />
              <input placeholder="City (optional)" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                style={{ background: BB2, border: `1px solid ${BB}`, color: W, padding: '10px 12px', borderRadius: 4, fontFamily: FD, fontSize: 12 }} />
              <input placeholder="Field Supervised (e.g. Retail Activations)" value={form.workField} onChange={e => setForm(f => ({ ...f, workField: e.target.value }))}
                style={{ background: BB2, border: `1px solid ${BB}`, color: W, padding: '10px 12px', borderRadius: 4, fontFamily: FD, fontSize: 12 }} />
              <select value={form.businessId} onChange={e => setForm(f => ({ ...f, businessId: e.target.value }))}
                style={{ background: BB2, border: `1px solid ${BB}`, color: W, padding: '10px 12px', borderRadius: 4, fontFamily: FD, fontSize: 12 }}>
                <option value="">Select business to assign...</option>
                {businesses.map(b => <option key={b.id} value={b.id}>{b.fullName}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '11px 0', background: 'transparent', border: `1px solid ${BB}`, color: W55, borderRadius: 4, fontFamily: FD, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Close</button>
              <button onClick={createSupervisor} disabled={creating} style={{ flex: 1.4, padding: '11px 0', background: GL, border: 'none', color: B, borderRadius: 4, fontFamily: FD, fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: creating ? 0.6 : 1 }}>
                {creating ? 'Creating...' : 'Create Supervisor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
function SettingsTab() {
  const [saved,    setSaved   ]=useState(false)
  const [platName, setPlatName]=useState('HoneyGroup Promotions')
  const [email,    setEmail   ]=useState('admin@honeygroup.co.za')
  const [otp,      setOtp     ]=useState("Africa's Talking")
  const [payment,  setPayment ]=useState('Paystack')
  const [geoR,     setGeoR    ]=useState('5')
  const [jobR,     setJobR    ]=useState('20')
  const [notifs,   setNotifs  ]=useState(true)
  const [popia,    setPopia   ]=useState(true)
  const [maint,    setMaint   ]=useState(false)
  const save=()=>{setSaved(true);setTimeout(()=>setSaved(false),3000)}
  const inp:React.CSSProperties={ width:'100%', background:BB2, border:`1px solid ${BB}`, padding:'10px 14px', color:W, fontFamily:FD, fontSize:13, outline:'none', borderRadius:3 }
  const lbl:React.CSSProperties={ fontSize:9, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase' as any, color:W55, display:'block', marginBottom:7, fontFamily:FD }
  const Toggle=({val,set}:{val:boolean;set:(v:boolean)=>void})=>(
    <div onClick={()=>set(!val)} style={{ width:40, height:22, borderRadius:11, background:val?`linear-gradient(135deg,${GL},${G})`:'rgba(32,30,25,0.8)', cursor:'pointer', position:'relative', transition:'background 0.25s', flexShrink:0, border:`1px solid ${val?G:BB}` }}>
      <div style={{ position:'absolute', top:3, left:val?19:3, width:14, height:14, borderRadius:'50%', background:val?B:W55, transition:'left 0.25s' }} />
    </div>
  )
  return (
    <div className="hg-page" style={{ padding:'40px 48px' }}>
      <div className="hg-page-header" style={{ marginBottom:24 }}>
        <div>
          <div style={{ fontSize:9, letterSpacing:'0.38em', textTransform:'uppercase', color:GL, marginBottom:8, fontWeight:700, fontFamily:FD }}>System Â· Config</div>
          <h1 style={{ fontFamily:FD, fontSize:28, fontWeight:700, color:W }}>Platform Settings</h1>
        </div>
        <Btn onClick={save}>{saved?'? Saved':'Save Changes'}</Btn>
      </div>
      {saved&&<div style={{ padding:'12px 16px', background:hex2rgba(G3,0.1), border:`1px solid ${hex2rgba(G3,0.35)}`, marginBottom:20, fontSize:13, color:GL, fontWeight:700, borderRadius:3, fontFamily:FD }}>? Settings saved.</div>}
      <div className="hg-card-grid-2" style={{ gap:1 }}>
        {[{title:'General',fields:[{label:'Platform Name',value:platName,set:setPlatName,type:'text'},{label:'Support Email',value:email,set:setEmail,type:'email'}]},{title:'Geo & Radius',fields:[{label:'Check-in Radius (m)',value:geoR,set:setGeoR,type:'number'},{label:'Job Notification Radius (km)',value:jobR,set:setJobR,type:'number'}]}].map(section=>(
          <div key={section.title} style={{ background:'rgba(9,9,7,0.6)', padding:24 }}>
            <div style={{ fontSize:9, letterSpacing:'0.22em', textTransform:'uppercase', color:GL, marginBottom:18, fontWeight:700, fontFamily:FD }}>{section.title}</div>
            {section.fields.map((f,i)=>(
              <div key={f.label} style={{ marginBottom:i<section.fields.length-1?16:0 }}>
                <label style={lbl}>{f.label}</label>
                <input type={f.type} value={f.value} onChange={e=>f.set(e.target.value)} style={inp}
                  onFocus={e=>e.currentTarget.style.borderColor=GL} onBlur={e=>e.currentTarget.style.borderColor=BB} />
              </div>
            ))}
          </div>
        ))}
        <div style={{ background:'rgba(9,9,7,0.6)', padding:24 }}>
          <div style={{ fontSize:9, letterSpacing:'0.22em', textTransform:'uppercase', color:GL, marginBottom:18, fontWeight:700, fontFamily:FD }}>Integrations</div>
          <div style={{ marginBottom:16 }}><label style={lbl}>OTP Provider</label><select value={otp} onChange={e=>setOtp(e.target.value)} style={{ ...inp, background:D3, cursor:'pointer' }}>{["Africa's Talking",'Clickatell','Twilio'].map(o=><option key={o}>{o}</option>)}</select></div>
          <div><label style={lbl}>Payment Gateway</label><select value={payment} onChange={e=>setPayment(e.target.value)} style={{ ...inp, background:D3, cursor:'pointer' }}>{['Paystack Reference','PayFast Reference','Manual EFT'].map(o=><option key={o}>{o}</option>)}</select></div>
        </div>
        <div style={{ background:'rgba(9,9,7,0.6)', padding:24 }}>
          <div style={{ fontSize:9, letterSpacing:'0.22em', textTransform:'uppercase', color:GL, marginBottom:18, fontWeight:700, fontFamily:FD }}>Feature Flags</div>
          {[{label:'Push Notifications',desc:'Send job alerts to promoters',val:notifs,set:setNotifs},{label:'POPIA Compliance',desc:'Enforce data protection',val:popia,set:setPopia},{label:'Maintenance Mode',desc:'Block non-admin access',val:maint,set:setMaint}].map(row=>(
            <div key={row.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'13px 0', borderBottom:`1px solid ${BB}` }}>
              <div><div style={{ fontSize:13, fontWeight:700, color:W, fontFamily:FD }}>{row.label}</div><div style={{ fontSize:11, color:W55, marginTop:2, fontFamily:FD }}>{row.desc}</div></div>
              <Toggle val={row.val} set={row.set} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- MAIN EXPORT --------------------------------------------------------------
export default function AdminDashboard() {
  const navigate     = useNavigate()
  const [searchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'dashboard'

  const [time,       setTime   ] = useState(new Date())
  const [regs,       setRegs   ] = useState<any[]>([])
  const [clients,    setClients] = useState<any[]>(INITIAL_MOCK_CLIENTS)
  const [msgs,       setMsgs   ] = useState<any[]>(INIT_MESSAGES)
  const [detailItem, setDetail ] = useState<any>(null)
  const [pendingChatRequests, setPendingChatRequests] = useState<any[]>([])

  useEffect(() => { injectAdminMobileStyles() }, [])
  useEffect(() => { const t=setInterval(()=>setTime(new Date()),1000); return ()=>clearInterval(t) }, [])

  // ── Supervisor / promoter / business message requests — fetched immediately
  //    on login (not lazily when the Messages tab is opened), and polled so a
  //    request sent while the admin is already in the dashboard shows up fast.
  useEffect(() => {
    const token = localStorage.getItem('hg_token')
    if (!token) return
    const loadPendingChatRequests = () => {
      fetch(`${API_URL}/chat/requests`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : [])
        .then((data: any[]) => setPendingChatRequests(Array.isArray(data) ? data : []))
        .catch(() => {})
    }
    loadPendingChatRequests()
    const poll = setInterval(loadPendingChatRequests, 15000)
    return () => clearInterval(poll)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('hg_token')
    if (!token) { setRegs(MOCK_REGISTRATIONS); return }
    // Fetch all users from DB â€” this is the real source of truth
    fetch(`${API_URL}/admin/registrations`,{headers:{Authorization:`Bearer ${token}`}})
      .then(r=>r.ok?r.json():[])
      .then((data:any[])=>{
        const apiRegs=data.map((u:any)=>({
          id:u.id,
          name:u.fullName || u.contactName || 'Unknown',
          email:u.email,
          role:u.role?.toLowerCase()==='business'?'business':'promoter',
          date:u.createdAt?String(u.createdAt).slice(0,10):new Date().toISOString().slice(0,10),
          status:normalizeStatus(u.status||'pending_review'),
          city:u.city||'Not specified',
          phone:u.phone||'Not provided',
          source:'real',
          _raw:u
        }))
        // Only add mock fallbacks that don't clash with real DB emails
        const apiEmails=new Set(apiRegs.map((r:any)=>r.email?.toLowerCase()))
        const mockFallbacks=MOCK_REGISTRATIONS.filter((m:any)=>!apiEmails.has(m.email?.toLowerCase()))
        setRegs([...apiRegs,...mockFallbacks])
      })
      .catch(()=>setRegs(MOCK_REGISTRATIONS))
  },[])

  // Sync approved business users from API into the clients list
  useEffect(() => {
    const token = localStorage.getItem('hg_token')
    if (!token) return
    fetch(`${API_URL}/users?role=BUSINESS`,{headers:{Authorization:`Bearer ${token}`}})
      .then(r=>r.ok?r.json():[])
      .then((data:any[])=>{
        if(!data.length) return
        setClients(prev=>{
          const existingEmails=new Set(prev.map(c=>c.email?.toLowerCase()))
          const newOnes=data
            .filter((u:any)=>!existingEmails.has(u.email?.toLowerCase()))
            .map((u:any)=>bizToClient(u,'api'))
          // Also update status of existing clients from the API
          const updated=prev.map(c=>{
            const apiUser=data.find((u:any)=>u.email?.toLowerCase()===c.email?.toLowerCase())
            if(!apiUser) return c
            const newStatus=apiUser.status==='approved'?'active':apiUser.status==='rejected'?'inactive':c.status
            return {...c,status:newStatus}
          })
          return newOnes.length?[...newOnes,...updated]:updated
        })
      })
      .catch(()=>{})
  },[])

  const handleRoute=(id:string)=>{
    const external:Record<string,string>={users:'/admin/users',jobs:'/admin/jobs',map:'/admin/map',payments:'/admin/payments',onboarding:'/admin/onboarding',reviews:'/admin/reviews'}
    if(external[id]){navigate(external[id]);return}
    navigate('/admin?tab='+id)
  }
  const updateStatus=(id:string,status:'approved'|'rejected')=>{
    // Grab role before the optimistic update mutates state, so we know whether
    // this approval is a business (and therefore needs a starter PO).
    const reg = regs.find(r=>r.id===id)
    // Optimistic UI update
    setRegs(p=>p.map(r=>r.id!==id?r:{...r,status}))
    setClients(prev=>prev.map(c=>c.id!==id?c:{...c,status:status==='approved'?'active':'inactive'}))
    setDetail(null)
    // Call the real API â€” this updates the PostgreSQL database
    const token = localStorage.getItem('hg_token')
    if (token) {
      fetch(`${API_URL}/admin/users/${id}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: status }),
      }).catch(() => {})
    }

    // -- Auto-create a starter Purchase Order for newly-approved businesses
    // so they immediately have a budget reflected in Budget Tracking and on
    // their own dashboard, with no separate manual step for the admin.
    if (status === 'approved' && reg?.role === 'business') {
      const today = new Date()
      const periodStart = today.toISOString().slice(0,10)
      const periodEnd = new Date(today.getFullYear(), today.getMonth()+3, today.getDate()).toISOString().slice(0,10)
      purchaseOrdersService.create({
        clientId: id,
        amount: 10000,
        periodStart,
        periodEnd,
        description: 'Auto-created starter PO on business approval',
      }).catch(() => { /* admin can create one manually in Budget Tracking if this fails */ })
    }
  }

  return (
    <AdminLayout>
      {tab==='dashboard'     && <DashboardTab     regs={regs} clients={clients} msgs={msgs} time={time} onRoute={handleRoute} pendingChatRequests={pendingChatRequests} />}
      {tab==='registrations' && <RegistrationsTab regs={regs} onDetail={setDetail} onApprove={id=>updateStatus(id,'approved')} onReject={id=>updateStatus(id,'rejected')} />}
      {tab==='clients'       && <ClientsTab       clients={clients} setClients={setClients} />}
      {tab==='supervisors'   && <SupervisorsTab />}
      {tab==='logins'        && <LoginsTab />}
      {tab==='messages'      && <AdminChatTab />}
      {tab==='reports'       && <ReportsTab regs={regs} />}
      {tab==='settings'      && <SettingsTab />}
      {detailItem && (
        <DetailModal item={detailItem} onClose={()=>setDetail(null)}
          onApprove={()=>updateStatus(detailItem.id,'approved')}
          onReject={()=>updateStatus(detailItem.id,'rejected')} />
      )}
    </AdminLayout>
  )
}