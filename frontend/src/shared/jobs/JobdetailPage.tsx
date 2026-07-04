// shared/jobs/JobDetailPage.tsx — fully mobile responsive
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAllJobsWithAdminJobs } from './jobsData';

const G   = '#9C9484'
const GL  = '#C9BFA6'
const G2  = '#8A8474'
const G3  = '#8F8A7C'
const G5  = '#443F36'
const B   = '#030302'
const BC  = '#0F0F0F'
const BC2 = '#0A0A08'
const BB  = 'rgba(170,160,135,0.14)'
const W   = '#F0F0F0'
const WM  = 'rgba(222,222,222,0.88)'
const WD  = 'rgba(189,189,189,0.55)'
const FD  = "'Playfair Display', Georgia, serif"
const FB  = "'DM Sans', system-ui, sans-serif"

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ── Inject responsive styles once ────────────────────────────────────────────
function injectJobDetailStyles() {
  if (document.getElementById('hg-jd-styles')) return
  const el = document.createElement('style')
  el.id = 'hg-jd-styles'
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #030302; }
    ::-webkit-scrollbar { width: 3px; }
    ::-webkit-scrollbar-thumb { background: #9C9484; }

    .jd-layout {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 24px 80px;
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 36px;
      align-items: start;
    }
    .jd-sticky-card {
      position: sticky;
      top: 80px;
      align-self: start;
    }
    .jd-stat-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1px;
      margin-bottom: 24px;
    }
    .jd-nav {
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(170,160,135,0.14);
      background: #0F0F0F;
      position: sticky;
      top: 0;
      z-index: 50;
    }

    /* ── TABLET ── */
    @media (max-width: 900px) {
      .jd-layout {
        grid-template-columns: 1fr;
        padding: 24px 16px 60px;
        gap: 0;
      }
      .jd-sticky-card {
        position: static;
        margin-top: 28px;
        order: 2;
      }
      .jd-main-content { order: 1; }
      .jd-stat-grid { grid-template-columns: repeat(3, 1fr); }
      .jd-nav { padding: 14px 16px; }
    }

    /* ── PHONE ── */
    @media (max-width: 600px) {
      .jd-layout { padding: 16px 12px 48px; }
      .jd-stat-grid { grid-template-columns: 1fr 1fr; }
      .jd-stat-grid > *:last-child { grid-column: 1 / -1; }
      .jd-section-pad { padding: 16px 14px !important; }
      .jd-title { font-size: clamp(20px, 6vw, 32px) !important; }
      .jd-nav-back { font-size: 12px !important; }
      .jd-apply-btn { font-size: 14px !important; padding: 14px !important; }
      .jd-detail-row { flex-direction: column !important; gap: 2px !important; }
      .jd-detail-label { min-width: unset !important; font-size: 9px !important; }
      .jd-detail-val { font-size: 12px !important; }
    }
  `
  document.head.appendChild(el)
}

function NotPromoterPopup({ onClose, onNavigate }: { onClose:()=>void; onNavigate:(path:string)=>void }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', backdropFilter:'blur(16px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:BC2, border:`1px solid rgba(170,160,135,0.28)`, width:'100%', maxWidth:460, position:'relative', overflow:'hidden', borderRadius:4 }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${G5},${G},${GL},${G},${G5})` }} />
        <div style={{ padding:'28px 24px' }}>
          <button onClick={onClose} style={{ position:'absolute', top:14, right:16, background:'none', border:'none', cursor:'pointer', color:WD, fontSize:18 }}>✕</button>
          <div style={{ fontSize:9, letterSpacing:'0.32em', textTransform:'uppercase', color:G, fontWeight:700, fontFamily:FD, marginBottom:8 }}>Promoters Only</div>
          <h2 style={{ fontFamily:FD, fontSize:20, fontWeight:700, color:W, marginBottom:10, lineHeight:1.3 }}>You need a Promoter account to apply</h2>
          <p style={{ fontSize:13, color:WM, lineHeight:1.7, marginBottom:20, fontFamily:FB }}>Only registered promoters can apply for shifts. Business and admin accounts are not eligible.</p>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={()=>{onClose();onNavigate('/login')}} style={{ flex:1, padding:'12px', background:`linear-gradient(135deg,${G},${GL})`, border:'none', color:B, fontFamily:FB, fontSize:12, fontWeight:700, cursor:'pointer', borderRadius:3 }}>Log In as Promoter</button>
            <button onClick={()=>{onClose();onNavigate('/register')}} style={{ flex:1, padding:'12px', background:'transparent', border:`1px solid rgba(189,189,189,0.45)`, color:G, fontFamily:FB, fontSize:12, fontWeight:700, cursor:'pointer', borderRadius:3 }}>Register</button>
          </div>
        </div>
      </div>
    </div>
  )
}


// ── Shared modal components ─────────────────────────────────────────────────
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

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId:string }>()
  const navigate  = useNavigate()
  const [job,           setJob          ] = useState<any>(null)
  const [loading,       setLoading      ] = useState(true)
  const [notFound,      setNotFound     ] = useState(false)
  const [showRolePopup, setShowRolePopup] = useState(false)
  const [applyDone,     setApplyDone    ] = useState<string|null>(null)
  const [applyErr,      setApplyErr     ] = useState<string|null>(null)
  // T&C → Apply flow (no payment involved)
  const [termsJob,      setTermsJob     ] = useState<any>(null)

  useEffect(() => { injectJobDetailStyles() }, [])

  const session  = (() => { try { return JSON.parse(localStorage.getItem('hg_session')||'null') } catch { return null } })()
  const userRole = (session?.role||'').toLowerCase()

  useEffect(()=>{
    if(!jobId) return
    const local=getAllJobsWithAdminJobs().find(j=>j.id===jobId)
    if(local) { setJob(local); setLoading(false) }

    const token = localStorage.getItem('hg_token')
    const headers: Record<string,string> = { 'Content-Type':'application/json' }
    if(token) headers['Authorization'] = `Bearer ${token}`

    fetch(`${API_URL}/jobs/${jobId}`, { headers })
      .then(async r=>{if(r.ok){setJob(await r.json());setLoading(false)}else{if(!local){setNotFound(true);setLoading(false)}}})
      .catch(()=>{if(!local){setNotFound(true);setLoading(false)}})
  },[jobId])

  const handleTermsAccepted = async () => {
    if(!termsJob) return
    const token = localStorage.getItem('hg_token')
    if(token) {
      const isStaticJob = /^JB-\d+$/.test(termsJob.id)
      if(!isStaticJob) {
        try {
          const res = await fetch(`${API_URL}/applications`, {
            method: 'POST',
            headers: { Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
            body: JSON.stringify({ jobId: termsJob.id }),
          })
          if(!res.ok && res.status !== 409) {
            const err = await res.json().catch(()=>({error:'Failed'}))
            setApplyErr(err.error || 'Application failed. Please try again.')
            setTimeout(()=>setApplyErr(null), 4000)
            setTermsJob(null); return
          }
        } catch {
          setApplyErr('Could not connect. Please try again.')
          setTimeout(()=>setApplyErr(null), 4000)
          setTermsJob(null); return
        }
      }
    }
    setApplyDone('Application submitted! Check your dashboard for updates.')
    setTimeout(()=>setApplyDone(null), 6000)
    setTermsJob(null)
  }

  // Open T&C modal — works for both static (JB-xxx) and real DB jobs
  const handleApplyClick = () => {
    if(!session || userRole !== 'promoter') { setShowRolePopup(true); return }
    setTermsJob({
      ...job,
      company: job.company || job.client || '',
      pay: job.pay || (job.hourlyRate ? `R ${Number(job.hourlyRate).toLocaleString('en-ZA')}` : ''),
      payPer: job.payPer || '/hr',
      duration: job.duration || (job.startTime && job.endTime ? `${job.startTime}\u2013${job.endTime}` : ''),
      terms: job.terms || job.termsAndConditions || '',
    })
  }

  if(loading&&!job) return (
    <div style={{ minHeight:'100vh', background:B, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}><div style={{ fontSize:32, color:G, marginBottom:16 }}>◎</div><div style={{ fontSize:14, color:WM, fontFamily:FB }}>Loading job details…</div></div>
    </div>
  )
  if(notFound||!job) return (
    <div style={{ minHeight:'100vh', background:B, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontFamily:FD, fontSize:56, color:WD, marginBottom:16 }}>◎</div>
        <div style={{ fontFamily:FD, fontSize:24, color:W, marginBottom:10 }}>Job Not Found</div>
        <p style={{ fontSize:14, color:WM, marginBottom:24, fontFamily:FB }}>This job may have expired or been removed.</p>
        <button onClick={()=>navigate('/jobs')} style={{ padding:'12px 28px', background:G, border:'none', color:B, fontFamily:FB, fontSize:13, fontWeight:700, cursor:'pointer', borderRadius:3 }}>← Back to All Jobs</button>
      </div>
    </div>
  )

  const title     = job.title||''
  const company   = job.company||job.client||''
  const location  = job.location||(job.venue?`${job.venue}${job.city?', '+job.city:''}` : '')
  const pay       = job.pay||(job.hourlyRate?`R ${Number(job.hourlyRate).toLocaleString('en-ZA')}`:'')
  const payPer    = job.payPer||'per shift'
  const date      = job.date||job.jobDate||''
  const duration  = job.duration||(job.startTime&&job.endTime?`${job.startTime}–${job.endTime}`:'')
  const slots     = job.slots??job.totalSlots??0
  const slotsLeft = job.slotsLeft!==undefined?job.slotsLeft:((job.totalSlots??0)-(job.filledSlots??0))
  const tags      = job.tags||job.filters?.tags||[]
  const terms     = job.terms||job.termsAndConditions||job.filters?.termsAndConditions||''
  const status    = (job.status||'open').toLowerCase()
  const type      = job.type||job.category||''
  const isOpen    = ['open','filling fast'].includes(status)

  // ── Apply card (shared between mobile-top and desktop-sticky) ───────────────
  const ApplyCard = () => (
    <div style={{ background:BC2, border:`1px solid rgba(170,160,135,0.28)`, borderRadius:4, overflow:'hidden' }}>
      <div style={{ height:3, background:`linear-gradient(90deg,${G5},${G},${GL})` }} />
      <div style={{ padding:'22px 20px' }}>
        <div style={{ fontFamily:FD, fontSize:24, fontWeight:700, color:G, lineHeight:1 }}>{pay}</div>
        <div style={{ fontSize:12, color:WM, marginTop:4, marginBottom:14, fontFamily:FB }}>{payPer}</div>

        {/* Quick info row */}
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
          {[{icon:'📅',text:date},{icon:'⏱',text:duration},{icon:'📍',text:location},{icon:'👥',text:`${slotsLeft} of ${slots} slots remaining`}].filter(m=>m.text).map((m,i)=>(
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
              <span style={{ fontSize:12, flexShrink:0 }}>{m.icon}</span>
              <span style={{ fontSize:12, color:WM, lineHeight:1.4, fontFamily:FB }}>{m.text}</span>
            </div>
          ))}
        </div>

        {/* Slot bar */}
        {slots>0&&(
          <div style={{ marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
              <span style={{ fontSize:10, color:WD, letterSpacing:'0.1em', textTransform:'uppercase', fontFamily:FB }}>Slots Filled</span>
              <span style={{ fontSize:10, color:G, fontWeight:700, fontFamily:FB }}>{slots-slotsLeft}/{slots}</span>
            </div>
            <div style={{ height:4, background:'rgba(236,236,236,0.08)', borderRadius:3 }}>
              <div style={{ height:'100%', width:`${Math.min(((slots-slotsLeft)/slots)*100,100)}%`, background:`linear-gradient(90deg,${G2},${G})`, borderRadius:3 }} />
            </div>
          </div>
        )}

        {/* Status badge */}
        <div style={{ marginBottom:16 }}>
          <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase', color:isOpen?GL:WD, background:isOpen?'rgba(201,191,166,0.12)':'rgba(236,236,236,0.05)', border:`1px solid ${isOpen?'rgba(201,191,166,0.35)':'rgba(236,236,236,0.12)'}`, padding:'4px 12px', borderRadius:2, fontFamily:FB }}>
            {status}
          </span>
        </div>

        {/* Apply button */}
        {applyDone ? (
          <div style={{ width:'100%', padding:'13px', background:'rgba(74,171,100,0.12)', border:'1px solid rgba(74,171,100,0.4)', color:'#6DEFA0', fontFamily:FB, fontSize:12, fontWeight:700, borderRadius:3, marginBottom:10, textAlign:'center', lineHeight:1.5 }}>
            ✓ {applyDone}
          </div>
        ) : applyErr ? (
          <div style={{ width:'100%', padding:'13px', background:'rgba(196,97,74,0.12)', border:'1px solid rgba(196,97,74,0.4)', color:'#F0896A', fontFamily:FB, fontSize:12, fontWeight:700, borderRadius:3, marginBottom:10, textAlign:'center', lineHeight:1.5 }}>
            ⚠ {applyErr}
          </div>
        ) : (
          <button className="jd-apply-btn" onClick={handleApplyClick} disabled={!isOpen}
            style={{ width:'100%', padding:'13px', background:isOpen?`linear-gradient(135deg,${G},${GL})`:'rgba(236,236,236,0.05)', border:'none', color:isOpen?B:WM, fontFamily:FB, fontSize:13, fontWeight:700, cursor:isOpen?'pointer':'not-allowed', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10, borderRadius:3, transition:'all 0.2s', boxShadow:isOpen?`0 4px 20px rgba(189,189,189,0.35)`:'none' }}
            onMouseEnter={e=>{if(isOpen){e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow=`0 8px 28px rgba(189,189,189,0.5)`}}}
            onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow=isOpen?`0 4px 20px rgba(189,189,189,0.35)`:'none'}}>
            {isOpen ? 'Apply for This Job →' : 'Job Closed'}
          </button>
        )}

        <button onClick={()=>navigate('/jobs')} style={{ width:'100%', padding:'11px', background:'transparent', border:`1px solid ${BB}`, color:WM, fontFamily:FB, fontSize:12, cursor:'pointer', borderRadius:3, transition:'all 0.2s' }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=G;e.currentTarget.style.color=G}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=BB;e.currentTarget.style.color=WM}}>
          ← All Jobs
        </button>

        {session&&userRole!=='promoter'&&(
          <div style={{ marginTop:12, padding:'10px 12px', background:'rgba(112,106,90,0.15)', border:`1px solid rgba(112,106,90,0.4)`, borderRadius:3, fontSize:11, color:'#CBCBCB', lineHeight:1.6, fontFamily:FB }}>
            ⚠ Only promoter accounts can apply. Logged in as <strong>{userRole}</strong>.
          </div>
        )}
        {!session&&(
          <div style={{ marginTop:12, padding:'10px 12px', background:BB, border:`1px solid rgba(189,189,189,0.22)`, borderRadius:3, fontSize:11, color:WD, lineHeight:1.6, fontFamily:FB, textAlign:'center' }}>
            <button onClick={()=>navigate('/login')} style={{ background:'none', border:'none', color:G, cursor:'pointer', fontSize:11, fontFamily:FB, textDecoration:'underline' }}>Log in</button>
            {' '}or{' '}
            <button onClick={()=>navigate('/register')} style={{ background:'none', border:'none', color:G, cursor:'pointer', fontSize:11, fontFamily:FB, textDecoration:'underline' }}>register</button>
            {' '}to apply
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:B, color:W }}>

      {/* Nav */}
      <nav className="jd-nav">
        <button className="jd-nav-back" onClick={()=>navigate('/jobs')} style={{ background:'none', border:'none', color:WM, cursor:'pointer', fontFamily:FB, fontSize:13, display:'flex', alignItems:'center', gap:6 }}
          onMouseEnter={e=>e.currentTarget.style.color=W} onMouseLeave={e=>e.currentTarget.style.color=WM}>
          ← Jobs
        </button>
        <div style={{ fontFamily:FD, fontSize:15, fontWeight:700 }}><span style={{ color:G }}>HONEYGROUP</span><span style={{ color:W }}> PROMOTIONS</span></div>
        {session
          ? <span style={{ fontSize:11, color:WM, fontFamily:FB, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:100 }}>{session.name}</span>
          : <button onClick={()=>navigate('/login')} style={{ padding:'7px 14px', background:'transparent', border:`1px solid ${BB}`, color:WM, fontFamily:FB, fontSize:11, cursor:'pointer', borderRadius:3 }}>Log In</button>
        }
      </nav>

      <div className="jd-layout">

        {/* ── Main content — LEFT (dominant) ── */}
        <div className="jd-main-content">

          {/* Breadcrumb */}
          <div style={{ fontSize:11, color:WD, marginBottom:10, fontFamily:FB }}>
            {company}{company&&location?' · ':''}{location}
          </div>

          {/* Title row */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:20, flexWrap:'wrap' }}>
            <h1 className="jd-title" style={{ fontFamily:FD, fontSize:'clamp(28px,4vw,48px)', fontWeight:700, color:W, lineHeight:1.15, flex:1, minWidth:0 }}>{title}</h1>
            {type&&<span style={{ flexShrink:0, fontSize:9, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', color:GL, background:'rgba(201,191,166,0.10)', border:`1px solid rgba(201,191,166,0.28)`, padding:'5px 12px', borderRadius:2, marginTop:6 }}>{type}</span>}
          </div>

          {/* Stat grid */}
          <div className="jd-stat-grid" style={{ background:BB, marginBottom:20 }}>
            {[{label:'Rate',value:pay,sub:payPer},{label:'Date',value:date,sub:duration},{label:'Slots',value:`${slotsLeft} left`,sub:`of ${slots} total`}].map((r,i)=>(
              <div key={i} style={{ background:BC2, padding:'16px 18px' }}>
                <div style={{ fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:WD, marginBottom:5, fontFamily:FB }}>{r.label}</div>
                <div style={{ fontFamily:FD, fontSize:20, fontWeight:700, color:G }}>{r.value}</div>
                {r.sub&&<div style={{ fontSize:10, color:WM, marginTop:3, fontFamily:FB }}>{r.sub}</div>}
              </div>
            ))}
          </div>

          {!isOpen&&<div style={{ padding:'12px 14px', background:'rgba(112,106,90,0.18)', border:`1px solid rgba(112,106,90,0.5)`, borderRadius:3, marginBottom:18, fontSize:13, color:'#CBCBCB', fontFamily:FB }}>⚠ This job is currently {status}.</div>}

          {/* Requirements */}
          {tags.length>0&&(
            <div className="jd-section-pad" style={{ marginBottom:16, padding:'18px 20px', background:BC2, border:`1px solid ${BB}`, borderRadius:3 }}>
              <div style={{ fontSize:10, letterSpacing:'0.25em', textTransform:'uppercase', color:G, marginBottom:12, fontWeight:700, fontFamily:FB }}>Requirements</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {tags.map((tag:string,i:number)=><span key={i} style={{ fontSize:11, color:WM, background:'rgba(255,255,255,0.05)', border:`1px solid ${BB}`, padding:'5px 10px', borderRadius:2, fontFamily:FB }}>{tag}</span>)}
              </div>
            </div>
          )}

          {/* Terms */}
          {terms&&(
            <div className="jd-section-pad" style={{ marginBottom:16, padding:'18px 20px', background:BC2, border:`1px solid ${BB}`, borderRadius:3 }}>
              <div style={{ fontSize:10, letterSpacing:'0.25em', textTransform:'uppercase', color:G, marginBottom:12, fontWeight:700, fontFamily:FB }}>Terms & Conditions</div>
              <div style={{ fontSize:13, color:WM, lineHeight:1.9, whiteSpace:'pre-line', fontFamily:FB }}>{terms}</div>
            </div>
          )}

          {/* Job detail rows */}
          <div className="jd-section-pad" style={{ padding:'18px 20px', background:BC2, border:`1px solid ${BB}`, borderRadius:3 }}>
            <div style={{ fontSize:10, letterSpacing:'0.25em', textTransform:'uppercase', color:G, marginBottom:12, fontWeight:700, fontFamily:FB }}>Job Details</div>
            {[
              ['Company',    company],
              ['Location',   location],
              ['Date',       date],
              ['Duration',   duration],
              ['Pay',        `${pay} ${payPer}`],
              ['Slots',      `${slotsLeft} of ${slots} available`],
              ...(job.contactPerson?[['Contact',  job.contactPerson]]:[]),
              ...(job.contactPhone ?[['Phone',    job.contactPhone ]]:[]),
              ...(job.contactEmail ?[['Email',    job.contactEmail ]]:[]),
              ...(job.companyReg   ?[['Reg No.',  job.companyReg   ]]:[]),
            ].filter(([,v])=>v).map(([label,value],i,arr)=>(
              <div key={String(label)} className="jd-detail-row" style={{ display:'flex', gap:12, padding:'9px 0', borderBottom:i<arr.length-1?`1px solid ${BB}`:'none', alignItems:'flex-start' }}>
                <span className="jd-detail-label" style={{ fontSize:11, color:WD, minWidth:120, flexShrink:0, fontFamily:FB }}>{label}</span>
                <span className="jd-detail-val" style={{ fontSize:13, color:W, fontWeight:600, fontFamily:FB, wordBreak:'break-word' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Apply card — RIGHT (sticky) ── */}
        <div className="jd-sticky-card">
          <ApplyCard />
        </div>

      </div>

      {showRolePopup&&<NotPromoterPopup onClose={()=>setShowRolePopup(false)} onNavigate={path=>{setShowRolePopup(false);navigate(path)}} />}
      {termsJob && <TermsModal job={termsJob} onAccept={handleTermsAccepted} onClose={()=>setTermsJob(null)} />}
    </div>
  )
}