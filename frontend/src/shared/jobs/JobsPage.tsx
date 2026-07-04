import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllJobsWithAdminJobs, getActiveJobs } from './jobsData';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const B   = '#030302'
const BC  = '#0F0F0C'
const BC2 = '#0A0A08'
const BB  = 'rgba(170,160,135,0.16)'
const GL  = '#C9BFA6'
const G   = '#9C9484'
const G2  = '#928A76'
const G3  = '#8F8A7C'
const G4  = '#8A8474'
const G5  = '#443F36'
const W   = '#F0F0F0'
const WM  = 'rgba(222,222,222,0.88)'
const WD  = 'rgba(189,189,189,0.55)'
const FD  = "'Playfair Display', Georgia, serif"
const FB  = "'DM Sans', system-ui, sans-serif"
const ACCENT_PALETTE = [GL,G3,G2,G,G4,GL,G3,G2,G,G4,GL,G3,G2,G,G4,GL,G3,G2,G,G4,GL,G3,G2,G]

export { getAllJobsWithAdminJobs, getActiveJobs }

// ── Inject page styles once ───────────────────────────────────────────────────
function injectStyles() {
  if (document.getElementById('hg-jobs-styles')) return
  const el = document.createElement('style')
  el.id = 'hg-jobs-styles'
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #030302; }
    ::-webkit-scrollbar { width: 3px; }
    ::-webkit-scrollbar-thumb { background: #9C9484; }
    select option { background: #0F0F0C; color: #F0F0F0; }
    textarea { box-sizing: border-box; }

    /* ── Desktop: standard card grid ── */
    .jobs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }

    /* ── Mobile: Shein-style 2-col compact grid ── */
    @media (max-width: 600px) {
      .jobs-grid {
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .jobs-header-area { padding: 24px 14px 20px !important; }
      .jobs-filter-row { flex-wrap: wrap !important; gap: 6px !important; }
      .jobs-filter-row select,
      .jobs-filter-row input { font-size: 11px !important; padding: 8px 10px !important; }
      .jobs-main-pad { padding: 16px 12px 60px !important; }
      .jobs-nav { padding: 12px 14px !important; }
      .jobs-nav-title { font-size: 14px !important; }
    }

    @media (max-width: 900px) {
      .jobs-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
      .jobs-header-area { padding: 28px 20px 24px !important; }
      .jobs-main-pad { padding: 24px 20px 60px !important; }
    }

    /* Compact card — mobile Shein style */
    .job-card-compact {
      display: none;
    }
    .job-card-full {
      display: block;
    }
    @media (max-width: 600px) {
      .job-card-compact { display: block; }
      .job-card-full    { display: none;  }
    }

    /* Card hover */
    .job-card-wrap:hover .job-card-inner {
      transform: translateY(-3px);
      box-shadow: 0 16px 40px rgba(0,0,0,0.5);
    }
  `
  document.head.appendChild(el)
}

function StatusBadge({ status }: { status:string }) {
  const map: Record<string,{color:string;bg:string}> = {
    'open':        {color:GL, bg:'rgba(201,191,166,0.12)'},
    'filling fast':{color:G3, bg:'rgba(170,160,135,0.12)'},
    'closed':      {color:G4, bg:'rgba(112,106,90,0.18)'},
  }
  const s=map[status]||map['open']
  return <span style={{ fontSize:8, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', color:s.color, background:s.bg, padding:'2px 8px', borderRadius:2 }}>{status}</span>
}

// ── Full card (desktop / tablet) ──────────────────────────────────────────────
function JobCardFull({ job, onView, onApply, appliedIds, session, canApply }: any) {
  const [hovered,setHovered]=useState(false)
  const filled=job.slots-job.slotsLeft; const pct=Math.round((filled/job.slots)*100)
  const almostFull=job.slotsLeft<=2; const isApplied=appliedIds.has(job.id); const accent=job.accentLine||G
  return (
    <div className="job-card-full job-card-wrap">
      <div className="job-card-inner" onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
        style={{ position:'relative', background:BC, border:`1px solid ${hovered?accent+'44':BB}`, overflow:'hidden', transition:'all 0.3s ease', transform:'translateY(0)', boxShadow:'none' }}>
        <div style={{ position:'absolute', inset:0, background:job.gradient||'transparent', opacity:hovered?1:0.6, transition:'opacity 0.3s' }} />
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${G5},${accent},${G5})` }} />
        {isApplied&&<div style={{ position:'absolute', top:10, right:10, zIndex:10, background:G, color:B, fontSize:8, fontWeight:800, letterSpacing:'0.2em', padding:'2px 8px', textTransform:'uppercase', borderRadius:2 }}>Applied ✓</div>}
        <div style={{ position:'relative', padding:'20px 20px 16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <div style={{ width:34, height:34, borderRadius:'50%', background:`rgba(189,189,189,0.16)`, border:`1px solid rgba(189,189,189,0.35)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:accent, flexShrink:0, fontFamily:FD }}>{job.companyInitial||job.company?.charAt(0)||'?'}</div>
              <div><div style={{ fontSize:11, color:accent, fontWeight:600 }}>{job.company}</div><div style={{ fontSize:8, color:WD, marginTop:1, letterSpacing:'0.15em', textTransform:'uppercase' }}>{job.type}</div></div>
            </div>
            <div style={{ textAlign:'right', flexShrink:0 }}><div style={{ fontFamily:FD, fontSize:18, fontWeight:700, color:G, lineHeight:1 }}>{job.pay}</div><div style={{ fontSize:10, color:WM, marginTop:2 }}>{job.payPer}</div></div>
          </div>
          <h3 style={{ fontFamily:FD, fontSize:15, fontWeight:700, color:W, lineHeight:1.3, marginBottom:10 }}>{job.title}</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:12 }}>
            {[{icon:'◎',text:job.location},{icon:'◈',text:job.date},{icon:'◉',text:`${job.duration} · ${job.slots} slots`}].map((m,i)=><div key={i} style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ fontSize:9, color:G, flexShrink:0 }}>{m.icon}</span><span style={{ fontSize:11, color:WM }}>{m.text}</span></div>)}
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:12 }}>
            {(job.tags||[]).slice(0,3).map((tag:string,i:number)=><span key={i} style={{ fontSize:8, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:WD, background:'rgba(236,236,236,0.05)', border:`1px solid ${BB}`, padding:'2px 7px', borderRadius:2 }}>{tag}</span>)}
          </div>
          <div style={{ marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}><span style={{ fontSize:9, color:WD, letterSpacing:'0.1em' }}>SLOTS FILLED</span><span style={{ fontSize:9, fontWeight:700, color:almostFull?G3:G }}>{job.slotsLeft} left</span></div>
            <div style={{ height:2, background:'rgba(236,236,236,0.08)', borderRadius:2, overflow:'hidden' }}><div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${G5},${accent})`, borderRadius:2 }} /></div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <StatusBadge status={job.status} />
            <div style={{ flex:1 }} />
            <button onClick={()=>onView(job.id)} style={{ padding:'7px 12px', border:`1px solid ${accent}44`, background:'transparent', color:WM, fontFamily:FB, fontSize:9, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer', transition:'all 0.2s' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=accent;e.currentTarget.style.color=accent}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=`${accent}44`;e.currentTarget.style.color=WM}}>Details</button>
            {canApply && <button onClick={()=>onApply(job)} style={{ padding:'7px 14px', border:'none', background:isApplied?G:accent, color:B, fontFamily:FB, fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', cursor:'pointer', borderRadius:2 }}>{isApplied?'Applied ✓':'Apply →'}</button>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Compact card (mobile Shein-style) ─────────────────────────────────────────
function JobCardCompact({ job, onView, onApply, appliedIds, canApply }: any) {
  const isApplied=appliedIds.has(job.id); const accent=job.accentLine||G
  const almostFull=job.slotsLeft<=2
  return (
    <div className="job-card-compact" onClick={()=>onView(job.id)}
      style={{ background:BC, border:`1px solid ${BB}`, borderRadius:4, overflow:'hidden', position:'relative', cursor:'pointer', transition:'all 0.2s' }}
      onMouseEnter={e=>(e.currentTarget.style.borderColor=accent+'66')}
      onMouseLeave={e=>(e.currentTarget.style.borderColor=BB)}>
      {/* Colour accent bar */}
      <div style={{ height:3, background:`linear-gradient(90deg,${G5},${accent},${G5})` }} />

      {/* Applied badge */}
      {isApplied&&<div style={{ position:'absolute', top:8, right:8, background:G, color:B, fontSize:7, fontWeight:800, padding:'2px 6px', borderRadius:2, letterSpacing:'0.12em', textTransform:'uppercase' }}>Applied</div>}

      <div style={{ padding:'12px 10px 10px' }}>
        {/* Company initial + name */}
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
          <div style={{ width:26, height:26, borderRadius:'50%', background:`rgba(189,189,189,0.16)`, border:`1px solid rgba(189,189,189,0.30)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:accent, flexShrink:0, fontFamily:FD }}>{job.companyInitial||job.company?.charAt(0)||'?'}</div>
          <div style={{ fontSize:10, color:accent, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{job.company}</div>
        </div>

        {/* Title */}
        <div style={{ fontFamily:FD, fontSize:12, fontWeight:700, color:W, lineHeight:1.3, marginBottom:8, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {job.title}
        </div>

        {/* Pay — prominent like a price tag */}
        <div style={{ marginBottom:8 }}>
          <span style={{ fontFamily:FD, fontSize:16, fontWeight:900, color:GL, lineHeight:1 }}>{job.pay}</span>
          <span style={{ fontSize:9, color:WM, marginLeft:4 }}>{job.payPer}</span>
        </div>

        {/* Location + date — compact */}
        <div style={{ fontSize:10, color:WD, marginBottom:6, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          📍 {job.location}
        </div>
        <div style={{ fontSize:10, color:WD, marginBottom:8 }}>
          📅 {job.date}
        </div>

        {/* Slots bar */}
        <div style={{ marginBottom:8 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
            <span style={{ fontSize:8, color:WD, letterSpacing:'0.08em', textTransform:'uppercase' }}>Slots</span>
            <span style={{ fontSize:8, fontWeight:700, color:almostFull?G3:G }}>{job.slotsLeft} left</span>
          </div>
          <div style={{ height:2, background:'rgba(236,236,236,0.08)', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${Math.round(((job.slots-job.slotsLeft)/job.slots)*100)}%`, background:`linear-gradient(90deg,${G5},${accent})`, borderRadius:2 }} />
          </div>
        </div>

        {/* Status + Apply button */}
        <div style={{ display:'flex', gap:5, alignItems:'center' }}>
          <StatusBadge status={job.status} />
          <div style={{ flex:1 }} />
          {canApply && <button
            onClick={e=>{e.stopPropagation();onApply(job)}}
            style={{ padding:'6px 10px', border:'none', background:isApplied?G:accent, color:B, fontFamily:FB, fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer', borderRadius:2, flexShrink:0 }}>
            {isApplied?'✓':'Apply'}
          </button>}
        </div>
      </div>
    </div>
  )
}

// ── Terms Modal ───────────────────────────────────────────────────────────────
function TermsModal({ job, onAccept, onClose }: { job:any; onAccept:()=>void; onClose:()=>void }) {
  const [agreed,setAgreed]=useState(false)
  const [scrolled,setScrolled]=useState(false)
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', backdropFilter:'blur(16px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:BC, border:`1px solid ${BB}`, width:'100%', maxWidth:640, maxHeight:'90vh', display:'flex', flexDirection:'column', position:'relative', overflow:'hidden', borderRadius:4 }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${G5},${G},${GL},${G},${G5})` }} />
        <div style={{ padding:'24px 24px 18px', borderBottom:`1px solid ${BB}`, flexShrink:0 }}>
          <div style={{ fontSize:9, letterSpacing:'0.35em', textTransform:'uppercase', color:G, marginBottom:6, fontFamily:FB }}>Terms & Conditions</div>
          <h2 style={{ fontFamily:FD, fontSize:20, fontWeight:700, color:W, lineHeight:1.3, marginBottom:8 }}>{job.title}</h2>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'4px 20px' }}>
            {[['Company',job.company],['Pay',`${job.pay} ${job.payPer}`],['Duration',job.duration]].map(([l,v])=>(
              <div key={l} style={{ fontSize:11, color:WM, fontFamily:FB }}><span style={{ color:WD }}>{l}: </span>{v}</div>
            ))}
          </div>
          <button onClick={onClose} style={{ position:'absolute', top:16, right:16, background:'none', border:'none', cursor:'pointer', color:WD, fontSize:18 }}>✕</button>
        </div>
        <div onScroll={e=>{const el=e.currentTarget;if(el.scrollTop+el.clientHeight>=el.scrollHeight-40)setScrolled(true)}}
          style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
          {!scrolled&&<div style={{ background:'rgba(201,191,166,0.06)', border:`1px solid rgba(201,191,166,0.22)`, padding:'10px 14px', marginBottom:16, fontSize:11, color:G, display:'flex', alignItems:'center', gap:8, fontFamily:FB }}>↓ Please scroll through all terms before accepting</div>}
          <div style={{ whiteSpace:'pre-line', fontSize:13, lineHeight:1.85, color:WM, fontFamily:FB }}>{job.terms||'Standard HoneyGroup Promotions Promoter Terms & Conditions apply.'}</div>
        </div>
        <div style={{ padding:'16px 24px 22px', borderTop:`1px solid ${BB}`, flexShrink:0 }}>
          <label style={{ display:'flex', alignItems:'flex-start', gap:12, cursor:'pointer', marginBottom:16 }}>
            <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} style={{ marginTop:2, accentColor:G, width:16, height:16, flexShrink:0 }} />
            <span style={{ fontSize:12, color:WM, lineHeight:1.6, fontFamily:FB }}>I have read and understand the Terms & Conditions. I accept this engagement as an independent contractor.</span>
          </label>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onAccept} disabled={!agreed} style={{ flex:1, padding:'13px', background:agreed?G:'rgba(236,236,236,0.05)', border:'none', color:agreed?B:WD, fontFamily:FB, fontSize:11, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', cursor:agreed?'pointer':'not-allowed', transition:'all 0.25s', borderRadius:2 }}>Accept & Apply</button>
            <button onClick={onClose} style={{ padding:'13px 18px', background:'transparent', border:`1px solid ${BB}`, color:WM, fontFamily:FB, fontSize:11, cursor:'pointer', borderRadius:2 }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const JOB_TYPES=['All Types','Brand Activation','Sampling','In-Store','Events & Hosting']
const CITIES   =['All Cities','Johannesburg','Cape Town','Durban','Pretoria']
const SORT_OPTS=['Newest Approved','Soonest Date','Highest Pay','Most Slots']

export default function JobsPage() {
  const navigate=useNavigate()
  const [typeFilter,setTypeFilter]=useState('All Types')
  const [cityFilter,setCityFilter]=useState('All Cities')
  const [sortBy,    setSortBy    ]=useState('Newest Approved')
  const [searchQ,   setSearchQ   ]=useState('')
  const [session,   setSession   ]=useState<{role:string;name:string}|null>(null)
  const [termsJob,  setTermsJob  ]=useState<any>(null)
  const [toast,     setToast     ]=useState('')
  const [appliedIds,setAppliedIds]=useState<Set<string>>(new Set())
  const [allJobs,   setAllJobs   ]=useState<any[]>([])

  useEffect(()=>{ injectStyles() },[])
  useEffect(()=>{ const s=localStorage.getItem('hg_session');if(s){try{setSession(JSON.parse(s))}catch{}} },[])

  // FIX: fetch from API so admin-created jobs appear immediately; past-date jobs removed by getActiveJobs()
  useEffect(()=>{
    const ACCENT=[GL,G3,G2,G,G4,GL,G3,G2,G,G4,GL,G3,G2,G,G4,GL,G3,G2,G,G4,GL,G3,G2,G]
    const mergeAndSet=(apiJobs:any[]=[])=>{
      const mapped=apiJobs.map((j:any,idx:number)=>({
        id:j.id, title:j.title, company:j.client||j.brand||'',
        companyInitial:(j.client||'?').charAt(0), companyColor:ACCENT[idx%ACCENT.length],
        location:[j.venue,j.city].filter(Boolean).join(', ')||j.address||'',
        type:j.filters?.category||'Brand Activation',
        pay:`R ${Number(j.hourlyRate).toLocaleString('en-ZA')}`, payPer:'/hr', hourlyRate:j.hourlyRate,
        date:j.date?new Date(j.date).toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short',year:'numeric'}):'',
        jobDate:j.date||new Date().toISOString(),
        approvedAt:j.createdAt||new Date().toISOString(),
        slots:j.totalSlots||1, totalSlots:j.totalSlots||1,
        slotsLeft:(j.totalSlots||1)-(j.filledSlots||0), filledSlots:j.filledSlots||0,
        duration:j.startTime&&j.endTime?`${j.startTime}–${j.endTime}`:'',
        tags:[j.filters?.gender,j.filters?.category].filter(Boolean),
        accentLine:ACCENT[idx%ACCENT.length],
        gradient:'linear-gradient(135deg,rgba(201,191,166,0.10) 0%,rgba(189,189,189,0.04) 100%)',
        status:(j.status||'OPEN').toLowerCase(),
        terms:j.termsAndConditions||'',
        filters:j.filters,
      }))
      const apiIds=new Set(mapped.map((j:any)=>j.id))
      const staticJobs=getAllJobsWithAdminJobs().filter((j:any)=>!apiIds.has(j.id))
      setAllJobs([...mapped,...staticJobs])
    }
    mergeAndSet([])
    const fetchJobs=async()=>{
      try{
        const token=localStorage.getItem('hg_token')
        const headers:Record<string,string>={}
        if(token) headers['Authorization']=`Bearer ${token}`
        let res=await fetch(`${API_URL}/jobs`,{headers})
        // Retry without token - GET /jobs is now a public endpoint
        if(!res.ok && token) res=await fetch(`${API_URL}/jobs`)
        if(res.ok){ const data=await res.json(); mergeAndSet(data) }
      }catch{}
    }
    fetchJobs()
    window.addEventListener('storage',fetchJobs)
    const interval=setInterval(fetchJobs,30000)
    return()=>{ window.removeEventListener('storage',fetchJobs); clearInterval(interval) }
  },[])

  // Load existing applications so already-applied jobs show "Applied" state on load
  useEffect(()=>{
    const token=localStorage.getItem('hg_token')
    if(!token) return
    fetch(`${API_URL}/applications/my`,{headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}})
      .then(r=>r.ok?r.json():[]).then((apps:any[])=>setAppliedIds(new Set(apps.map((a:any)=>a.jobId)))).catch(()=>{})
  },[])

  const showToast=(msg:string)=>{setToast(msg);setTimeout(()=>setToast(''),3500)}
  const canApply = !session || session.role === 'promoter'
  const handleApply=(job:any)=>{
    if(!session){navigate('/login');return}
    if(session.role && session.role !== 'promoter'){showToast('Only promoters can apply for jobs.');return}
    setTermsJob(job)
  }
  // FIX: POST to /api/applications so it reflects on business + promoter dashboards
  const handleTermsAccepted=async()=>{
    if(!termsJob) return
    const token=localStorage.getItem('hg_token')
    if(token){
      const isStaticJob=/^JB-\d+$/.test(termsJob.id)
      if(!isStaticJob){
        try{
          const res=await fetch(`${API_URL}/applications`,{
            method:'POST',
            headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
            body:JSON.stringify({jobId:termsJob.id}),
          })
          if(!res.ok && res.status!==409){
            const err=await res.json().catch(()=>({error:'Failed'}))
            showToast(err.error||'Application failed. Please try again.')
            setTermsJob(null); return
          }
        }catch{ showToast('Could not submit. Check your connection.'); setTermsJob(null); return }
      }
    }
    setAppliedIds(prev=>new Set([...prev,termsJob.id]))
    showToast(`✓ Applied for "${termsJob.title}"`)
    setTermsJob(null)
  }

  const activeJobs=getActiveJobs(allJobs)
  const filtered=activeJobs
    .filter((j:any)=>typeFilter==='All Types'||j.type===typeFilter)
    .filter((j:any)=>cityFilter==='All Cities'||j.location.toLowerCase().includes(cityFilter.toLowerCase()))
    .filter((j:any)=>!searchQ||[j.title,j.company,j.location].some((s:string)=>s.toLowerCase().includes(searchQ.toLowerCase())))
    .sort((a:any,b:any)=>{
      if(sortBy==='Soonest Date') return new Date(a.jobDate).getTime()-new Date(b.jobDate).getTime()
      if(sortBy==='Highest Pay')  return parseInt(b.pay.replace(/\D/g,''))-parseInt(a.pay.replace(/\D/g,''))
      if(sortBy==='Most Slots')   return b.slotsLeft-a.slotsLeft
      return new Date(b.approvedAt).getTime()-new Date(a.approvedAt).getTime()
    })

  const sel:React.CSSProperties={background:BC,border:`1px solid ${BB}`,color:WM,fontFamily:FB,fontSize:11,padding:'10px 12px',cursor:'pointer',outline:'none',borderRadius:2}

  return (
    <div style={{ minHeight:'100vh', background:B, fontFamily:FB, color:W }}>
      {toast&&<div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:G, color:B, padding:'12px 24px', fontFamily:FB, fontSize:12, fontWeight:700, letterSpacing:'0.1em', zIndex:2000, whiteSpace:'nowrap', borderRadius:3, boxShadow:'0 8px 24px rgba(0,0,0,0.5)' }}>{toast}</div>}

      {/* Nav */}
      <nav className="jobs-nav" style={{ position:'sticky', top:0, zIndex:100, background:'rgba(4,4,3,0.97)', backdropFilter:'blur(20px)', borderBottom:`1px solid ${BB}`, padding:'14px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <button onClick={()=>navigate('/')} style={{ background:'none', border:'none', cursor:'pointer', color:WM, fontFamily:FB, fontSize:13, display:'flex', alignItems:'center', gap:6 }}
          onMouseEnter={e=>e.currentTarget.style.color=W} onMouseLeave={e=>e.currentTarget.style.color=WM}>← Home</button>
        <div className="jobs-nav-title" style={{ fontFamily:FD, fontSize:16, fontWeight:700 }}><span style={{ color:G }}>HONEYGROUP</span><span style={{ color:W }}> PROMOTIONS</span></div>
        <div style={{ display:'flex', gap:8 }}>
          {session
            ? <button onClick={()=>navigate(session.role==='promoter'?'/promoter/dashboard':'/')} style={{ padding:'8px 16px', background:G, border:'none', color:B, fontFamily:FB, fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer', borderRadius:2 }}>Dashboard</button>
            : <><button onClick={()=>navigate('/login')} style={{ padding:'8px 14px', background:'transparent', border:`1px solid ${BB}`, color:WM, fontFamily:FB, fontSize:11, cursor:'pointer', borderRadius:2 }}>Log In</button><button onClick={()=>navigate('/register')} style={{ padding:'8px 14px', background:G, border:'none', color:B, fontFamily:FB, fontSize:11, fontWeight:700, cursor:'pointer', borderRadius:2 }}>Register</button></>
          }
        </div>
      </nav>

      {/* Header */}
      <div className="jobs-header-area" style={{ background:BC2, borderBottom:`1px solid ${BB}`, padding:'36px 24px 28px' }}>
        <div style={{ maxWidth:1360, margin:'0 auto' }}>
          <div style={{ fontSize:10, letterSpacing:'0.38em', textTransform:'uppercase', color:G, fontWeight:600, marginBottom:10, fontFamily:FB }}>Current Opportunities</div>
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:20, gap:12, flexWrap:'wrap' }}>
            <div>
              <h1 style={{ fontFamily:FD, fontSize:'clamp(26px,4vw,48px)', fontWeight:700, lineHeight:1 }}>All Jobs</h1>
              <p style={{ fontSize:12, color:WD, marginTop:6, fontFamily:FB }}>Sorted newest-approved first · T&C acceptance required to apply</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:FD, fontSize:32, fontWeight:700, color:G, lineHeight:1 }}>{filtered.length}</div>
              <div style={{ fontSize:11, color:WM, marginTop:4, fontFamily:FB }}>active positions</div>
            </div>
          </div>
          {/* Filters */}
          <div className="jobs-filter-row" style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
            <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search jobs, companies, locations..."
              style={{ ...sel, flex:'1 1 200px', minWidth:140, color:W }}
              onFocus={e=>e.currentTarget.style.borderColor=G} onBlur={e=>e.currentTarget.style.borderColor=BB} />
            <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{ ...sel, minWidth:140 }}>{JOB_TYPES.map(t=><option key={t}>{t}</option>)}</select>
            <select value={cityFilter} onChange={e=>setCityFilter(e.target.value)} style={{ ...sel, minWidth:120 }}>{CITIES.map(c=><option key={c}>{c}</option>)}</select>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ ...sel, minWidth:140 }}>{SORT_OPTS.map(s=><option key={s}>{s}</option>)}</select>
            {(typeFilter!=='All Types'||cityFilter!=='All Cities'||searchQ)&&
              <button onClick={()=>{setTypeFilter('All Types');setCityFilter('All Cities');setSearchQ('')}} style={{ padding:'10px 14px', background:'transparent', border:`1px solid rgba(170,160,135,0.35)`, color:G3, fontFamily:FB, fontSize:10, fontWeight:600, cursor:'pointer', letterSpacing:'0.1em', textTransform:'uppercase', borderRadius:2, whiteSpace:'nowrap' }}>✕ Clear</button>}
          </div>
        </div>
      </div>

      {/* Jobs grid */}
      <div className="jobs-main-pad" style={{ maxWidth:1360, margin:'0 auto', padding:'28px 24px 64px' }}>
        {filtered.length===0
          ? <div style={{ textAlign:'center', padding:'64px 0' }}>
              <div style={{ fontFamily:FD, fontSize:44, color:WD, marginBottom:14 }}>◎</div>
              <div style={{ fontFamily:FD, fontSize:24, color:W, marginBottom:10 }}>No Jobs Found</div>
              <p style={{ fontSize:14, color:WM, fontFamily:FB }}>Adjust your filters or check back soon.</p>
            </div>
          : <div className="jobs-grid">
              {filtered.map((job:any)=>(
                <div key={job.id}>
                  {/* Desktop/tablet full card */}
                  <JobCardFull job={job} appliedIds={appliedIds} session={session} canApply={canApply}
                    onView={(id: string)=>navigate(`/jobs/${id}`)} onApply={handleApply} />
                  {/* Mobile compact card */}
                  <JobCardCompact job={job} appliedIds={appliedIds} canApply={canApply}
                    onView={(id: string)=>navigate(`/jobs/${id}`)} onApply={handleApply} />
                </div>
              ))}
            </div>
        }

        <div style={{ marginTop:48, textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
          <div style={{ width:1, height:36, background:`linear-gradient(to bottom,${G},transparent)` }} />
          <p style={{ fontSize:13, color:WD, fontFamily:FB }}>Jobs are automatically removed after their event date.</p>
          {!session&&<button onClick={()=>navigate('/register')} style={{ marginTop:8, padding:'12px 32px', background:G, border:'none', color:B, fontFamily:FB, fontSize:11, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', cursor:'pointer', borderRadius:2 }}>Register to Apply</button>}
        </div>
      </div>

      {termsJob &&<TermsModal job={termsJob} onAccept={handleTermsAccepted} onClose={()=>setTermsJob(null)} />}
    </div>
  )
}