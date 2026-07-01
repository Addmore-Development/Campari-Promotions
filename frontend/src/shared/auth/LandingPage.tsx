import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveJobs, getAllJobsWithAdminJobs } from '../jobs/jobsData';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ── Color tokens ──────────────────────────────────────────────────────────────
const GL  = '#E8A820'
const G   = '#D4880A'
const G3  = '#C07818'
const G5  = '#6B3F10'
const B   = '#0C0A07'
const D1  = '#141008'
const D2  = '#1A1408'
const W   = '#CEC5B2'
const WM  = 'rgba(200,188,168,0.88)'
const WD  = 'rgba(168,152,130,0.55)'
const BB  = 'rgba(212,136,10,0.16)'
const JB6 = 'rgba(12,10,7,0.60)'
const JBB = 'rgba(12,10,7,0.22)'

// ── Filter button colors for the GOLD section background (#AB8D3F) ────────────
// High-contrast dark text on gold — much more readable
const FILTER_ACTIVE_BG    = 'rgba(0,0,0,0.72)'
const FILTER_ACTIVE_TEXT  = '#F5E6C0'           // near-white warm cream
const FILTER_IDLE_BG      = 'rgba(0,0,0,0.28)'
const FILTER_IDLE_TEXT    = '#1A1000'           // very dark brown — strong contrast on gold

const FD = "'Work Sans', 'worksans', sans-serif"

// ── Global CSS ────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Work+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&family=Bodoni+Moda:ital,wght@0,700;0,800;0,900;1,700;1,800;1,900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { -webkit-font-smoothing: antialiased; background: ${B}; font-family: ${FD}; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: ${D1}; }
  ::-webkit-scrollbar-thumb { background: ${GL}; }

  .reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.8s cubic-bezier(0.22,1,0.36,1), transform 0.8s cubic-bezier(0.22,1,0.36,1); }
  .reveal.visible { opacity: 1; transform: translateY(0); }

  @keyframes pulse-ring { 0%,100%{box-shadow:0 0 0 0 rgba(232,168,32,0.5)} 50%{box-shadow:0 0 0 16px rgba(232,168,32,0)} }
  @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
  @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  @keyframes hero-fade { 0%{opacity:0;transform:translateY(30px)} 100%{opacity:1;transform:translateY(0)} }
  @keyframes feature-in { 0%{opacity:0;transform:translateY(40px) scale(0.97)} 100%{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes feature-out { 0%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-40px) scale(0.97)} }
  @keyframes twinkle { 0%,100%{opacity:0.2;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }
  @keyframes glitter-drift { 0%{transform:translateY(0) rotate(0deg);opacity:0.6} 100%{transform:translateY(-80px) rotate(180deg);opacity:0} }
  @keyframes card-rise { 0%{opacity:0;transform:translateY(60px)} 100%{opacity:1;transform:translateY(0)} }
  @keyframes img-scale { 0%{transform:scale(1.08)} 100%{transform:scale(1)} }

  .feat-card-0, .feat-card-1, .feat-card-2 {
    transition: transform 0.55s cubic-bezier(0.22,1,0.36,1), box-shadow 0.55s ease, z-index 0s;
  }

  .nav-link { color: rgba(192,178,158,0.80); background: none; border: none; cursor: pointer; font-family: ${FD}; font-size: 12px; font-weight: 400; letter-spacing: 0.12em; padding: 0; transition: color 0.25s; }
  .nav-link:hover { color: ${GL}; }

  .ticker-wrap { overflow: hidden; border-top: 1px solid ${BB}; border-bottom: 1px solid ${BB}; background: ${D1}; }
  .ticker-inner { display: flex; white-space: nowrap; animation: ticker 28s linear infinite; }
  .ticker-item { padding: 0 56px; font-size: 10px; font-weight: 500; letter-spacing: 0.3em; text-transform: uppercase; color: rgba(192,178,158,0.82); display: flex; align-items: center; gap: 24px; height: 42px; font-family: ${FD}; }
  .ticker-item span { color: ${GL}; font-size: 8px; }

  .job-card-hover:hover { transform: translateY(-6px) !important; }
  .job-card-hover:hover .card-inner { border-color: rgba(232,168,32,0.5) !important; box-shadow: 0 24px 48px rgba(0,0,0,0.7), 0 0 32px rgba(232,168,32,0.12) !important; }

  .triptych-img { overflow: hidden; position: relative; }
  .triptych-img img { width:100%; height:100%; object-fit:cover; transition: transform 0.8s cubic-bezier(0.22,1,0.36,1); filter: grayscale(100%); }
  .triptych-img.center img { filter: grayscale(0%) !important; }
  .triptych-img:hover img { transform: scale(1.04); }

  /* ── Filter buttons on gold background — HIGH contrast ── */
  .filter-btn {
    padding: 6px 14px;
    border-radius: 2px;
    font-family: ${FD};
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.18s;
    border: 1px solid rgba(0,0,0,0.35);
    white-space: nowrap;
  }
  .filter-btn.active {
    background: ${FILTER_ACTIVE_BG};
    color: ${FILTER_ACTIVE_TEXT};
    border-color: rgba(0,0,0,0.55);
  }
  .filter-btn.idle {
    background: ${FILTER_IDLE_BG};
    color: ${FILTER_IDLE_TEXT};
    border-color: rgba(0,0,0,0.22);
  }
  .filter-btn.idle:hover {
    background: rgba(0,0,0,0.45);
    color: #F5E6C0;
    border-color: rgba(0,0,0,0.5);
  }

  /* ── Responsive: Mobile-first breakpoints ── */

  /* Nav mobile */
  @media (max-width: 768px) {
    .nav-desktop-links { display: none !important; }
    .nav-root { padding: 0 16px !important; height: 58px !important; }
    .nav-logo { font-size: 16px !important; }
    .nav-cta-group { gap: 6px !important; }
    .nav-cta-group button { font-size: 10px !important; padding: 8px 12px !important; }
  }

  /* Hero mobile */
  @media (max-width: 768px) {
    .hero-root { height: 72vh !important; min-height: 420px !important; padding: 12px 16px !important; margin-top: 58px !important; flex-direction: column !important; }
    .hero-media-panel { top: 12px !important; left: 12px !important; right: 12px !important; bottom: 12px !important; }
    .hero-copy { padding: 0 0 0 16px !important; }
    .hero-copy h1 { font-size: clamp(36px,10vw,64px) !important; }
    .hero-copy h1 span { max-width: 100% !important; }
    .hero-cta-btn { max-width: 100% !important; font-size: 10px !important; padding: 10px 16px !important; }
  }

  /* Jobs section mobile */
  @media (max-width: 900px) {
    .jobs-section-root { padding: 36px 20px 44px !important; }
    .jobs-header-row { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
    .jobs-grid-4col { grid-template-columns: repeat(2, 1fr) !important; }
    .filter-row { flex-direction: column !important; gap: 8px !important; align-items: flex-start !important; }
    .filter-divider { display: none !important; }
    .filter-count { margin-left: 0 !important; }
  }
  @media (max-width: 540px) {
    .jobs-grid-4col { grid-template-columns: 1fr !important; }
    .jobs-section-root { padding: 28px 12px 36px !important; }
    .filter-btn { font-size: 8px !important; padding: 5px 10px !important; }
  }

  /* Features section mobile */
  @media (max-width: 900px) {
    .features-section-root { padding: 48px 20px 64px !important; }
    .features-grid-3col { grid-template-columns: 1fr !important; gap: 16px !important; }
    .feat-card-0, .feat-card-1, .feat-card-2 { transform: none !important; z-index: 1 !important; }
    .features-header-row { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
    .features-header-row h2 { text-align: left !important; }
  }
  @media (max-width: 540px) {
    .features-section-root { padding: 32px 12px 48px !important; }
  }

  /* Triptych mobile */
  @media (max-width: 768px) {
    .triptych-grid { grid-template-columns: 1fr !important; height: auto !important; }
    .triptych-side { display: none !important; }
    .triptych-center { height: 320px !important; }
  }

  /* Footer mobile */
  @media (max-width: 900px) {
    .footer-grid-3col { grid-template-columns: 1fr !important; gap: 40px !important; }
    .footer-root { padding: 48px 20px 40px !important; }
  }
  @media (max-width: 540px) {
    .footer-root { padding: 36px 12px 32px !important; }
  }

  /* Section padding mobile */
  @media (max-width: 768px) {
    .section-padded { padding-left: 20px !important; padding-right: 20px !important; }
  }
  @media (max-width: 540px) {
    .section-padded { padding-left: 12px !important; padding-right: 12px !important; }
  }
`

// ── Reveal hook ───────────────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add('visible'); obs.disconnect() }
    }, { threshold: 0.08 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  const setRef = (el: HTMLElement | null) => { ref.current = el }
  return setRef
}

// ── Glitter Field ─────────────────────────────────────────────────────────────
function GlitterField() {
  const particles = Array.from({ length: 32 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${10 + Math.random() * 80}%`,
    size: 1.5 + Math.random() * 3,
    delay: `${Math.random() * 6}s`,
    dur: `${3 + Math.random() * 5}s`,
    color: Math.random() > 0.6 ? W : Math.random() > 0.4 ? GL : G,
  }))
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: p.left, top: p.top,
          width: p.size, height: p.size, borderRadius: '50%',
          background: p.color, opacity: 0.5,
          animation: `glitter-drift ${p.dur} ${p.delay} ease-in infinite, twinkle ${p.dur} ${p.delay} ease-in-out infinite`,
        }} />
      ))}
      {Array.from({ length: 20 }, (_, i) => (
        <div key={`star-${i}`} style={{
          position: 'absolute',
          left: `${3 + Math.random() * 94}%`,
          top: `${5 + Math.random() * 90}%`,
          fontSize: `${7 + Math.random() * 9}px`,
          color: Math.random() > 0.5 ? GL : W,
          opacity: 0.3,
          animation: `twinkle ${2 + Math.random() * 3}s ${Math.random() * 5}s ease-in-out infinite`,
        }}>✦</div>
      ))}
    </div>
  )
}

// ── Single Job Card ───────────────────────────────────────────────────────────
function JobCard({ job, index, isLoggedIn, isPromoter, applyingJobId, onLock, onView, onApply }: {
  job: ReturnType<typeof getActiveJobs>[0]
  index: number
  isLoggedIn: boolean
  isPromoter: boolean
  applyingJobId: string | null
  onLock: () => void
  onView: (id: string) => void
  onApply: (job: any) => void
}) {
  const fillPct = Math.round(((job.slots - job.slotsLeft) / job.slots) * 100)
  const isFeatured = index === 0
  const accent = job.accentLine || GL

  return (
    <div
      className="job-card-hover"
      style={{
        transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1)',
        animation: `card-rise 0.6s ${Math.min(index * 0.06, 0.5)}s cubic-bezier(0.22,1,0.36,1) both`,
        minWidth: 0,
      }}
    >
      <div
        className="card-inner"
        style={{
          position: 'relative', overflow: 'hidden', height: '100%',
          background: isFeatured
            ? `linear-gradient(160deg, #2A1E06 0%, #1E1504 50%, #160F03 100%)`
            : `linear-gradient(160deg, ${D2} 0%, rgba(20,16,5,0.98) 100%)`,
          border: `1px solid ${isFeatured ? 'rgba(232,168,32,0.4)' : BB}`,
          transition: 'border-color 0.3s, box-shadow 0.3s',
          boxShadow: isFeatured
            ? `0 8px 32px rgba(0,0,0,0.5), 0 0 40px rgba(232,168,32,0.08)`
            : `0 4px 16px rgba(0,0,0,0.4)`,
          cursor: 'pointer',
          padding: '0 0 20px 0',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: isFeatured ? 3 : 2, background: isFeatured ? `linear-gradient(90deg, ${G5}, ${GL}, #F5C842, ${GL}, ${G5})` : `linear-gradient(90deg, ${G5}, ${accent}88, ${G5})` }} />

        {isFeatured && (
          <div style={{ position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)', width: 200, height: 120, background: 'radial-gradient(ellipse, rgba(232,168,32,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        )}

        <div style={{ padding: '20px 20px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: isFeatured ? GL : WD, fontFamily: FD, padding: isFeatured ? '3px 8px' : '0', background: isFeatured ? 'rgba(232,168,32,0.1)' : 'transparent', border: isFeatured ? `1px solid rgba(232,168,32,0.2)` : 'none' }}>
              {isFeatured ? '★ Featured' : job.type}
            </span>
            <span style={{ fontSize: 8, color: WD, fontFamily: FD }}>{job.slotsLeft} left</span>
          </div>

          <div style={{ fontSize: 10, color: isFeatured ? GL : G3, fontWeight: 700, letterSpacing: '0.04em', fontFamily: FD, marginBottom: 4 }}>{job.company}</div>

          <h3 style={{ fontFamily: FD, fontSize: isFeatured ? 16 : 13, fontWeight: 800, lineHeight: 1.2, color: W, marginBottom: 8, fontStyle: isFeatured ? 'italic' : 'normal', flex: 1 }}>{job.title}</h3>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 10 }}>
            <span style={{ fontFamily: FD, fontSize: isFeatured ? 26 : 20, fontWeight: 900, color: GL, lineHeight: 1 }}>{job.pay}</span>
            <span style={{ fontSize: 10, color: 'rgba(192,178,158,0.82)', fontFamily: FD }}>{job.payPer}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 8, color: GL }}>◎</span>
            <span style={{ fontSize: 10, color: WM, fontFamily: FD, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.location}</span>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ height: 2, background: 'rgba(206,197,178,0.08)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${fillPct}%`, background: `linear-gradient(90deg, ${G5}, ${accent})`, transition: 'width 0.7s ease' }} />
            </div>
          </div>

          {isLoggedIn && isPromoter ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => onApply(job)}
                disabled={applyingJobId === job.id}
                style={{ flex: 1, padding: '9px', border: `1px solid ${isFeatured ? 'rgba(232,168,32,0.6)' : 'rgba(232,168,32,0.35)'}`, background: applyingJobId === job.id ? 'rgba(232,168,32,0.06)' : isFeatured ? 'rgba(232,168,32,0.14)' : 'rgba(232,168,32,0.08)', color: GL, fontFamily: FD, fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', cursor: applyingJobId === job.id ? 'wait' : 'pointer', transition: 'all 0.2s', opacity: applyingJobId === job.id ? 0.6 : 1 }}
                onMouseEnter={e => { if(applyingJobId !== job.id){ e.currentTarget.style.background = 'rgba(232,168,32,0.22)'; e.currentTarget.style.borderColor = GL }}}
                onMouseLeave={e => { e.currentTarget.style.background = isFeatured ? 'rgba(232,168,32,0.14)' : 'rgba(232,168,32,0.08)'; e.currentTarget.style.borderColor = isFeatured ? 'rgba(232,168,32,0.6)' : 'rgba(232,168,32,0.35)' }}>
                {applyingJobId === job.id ? 'Applying…' : 'Apply →'}
              </button>
              <button onClick={() => onView(job.id)} style={{ padding: '9px 10px', border: `1px solid ${BB}`, background: 'transparent', color: WM, fontFamily: FD, fontSize: 9, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = GL; e.currentTarget.style.color = GL }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BB; e.currentTarget.style.color = WM }}>
                Details
              </button>
            </div>
          ) : isLoggedIn ? (
            <button onClick={() => onView(job.id)} style={{ width: '100%', padding: '9px', border: `1px solid ${isFeatured ? 'rgba(232,168,32,0.45)' : BB}`, background: isFeatured ? 'rgba(232,168,32,0.08)' : 'transparent', color: GL, fontFamily: FD, fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(232,168,32,0.14)'; e.currentTarget.style.borderColor = GL }}
              onMouseLeave={e => { e.currentTarget.style.background = isFeatured ? 'rgba(232,168,32,0.08)' : 'transparent'; e.currentTarget.style.borderColor = isFeatured ? 'rgba(232,168,32,0.45)' : BB }}>
              View Details →
            </button>
          ) : (
            <button onClick={onLock} style={{ width: '100%', padding: '9px', border: `1px solid ${BB}`, background: 'transparent', color: WM, fontFamily: FD, fontSize: 9, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span style={{ fontSize: 9 }}>⬡</span> Login to Apply
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Jobs Section ──────────────────────────────────────────────────────────────
function JobsSection({ jobs, isLoggedIn, isPromoter, applyingJobId, onLock, onView, onApply }: {
  jobs: ReturnType<typeof getActiveJobs>
  isLoggedIn: boolean
  isPromoter: boolean
  applyingJobId: string | null
  onLock: () => void
  onView: (id: string) => void
  onApply: (job: any) => void
}) {
  const [cityFilter, setCityFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')

  const cities = ['All', 'Johannesburg', 'Cape Town', 'Durban', 'Pretoria']
  const types  = ['All', 'Brand Activation', 'Sampling', 'In-Store', 'Events & Hosting']

  const filtered = jobs.filter(j => {
    const cm = cityFilter === 'All' || j.location.toLowerCase().includes(cityFilter.toLowerCase())
    const tm = typeFilter === 'All' || j.type === typeFilter
    return cm && tm
  })

  const visible = filtered.slice(0, 8)

  return (
    <div style={{ position: 'relative' }}>
      <GlitterField />

      {/* Filter row */}
      <div className="filter-row" style={{ position: 'relative', zIndex: 2, marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* City filters */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {cities.map(c => (
            <button
              key={c}
              onClick={() => setCityFilter(c)}
              className={`filter-btn ${cityFilter === c ? 'active' : 'idle'}`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="filter-divider" style={{ width: 1, height: 18, background: 'rgba(0,0,0,0.35)', flexShrink: 0 }} />

        {/* Type filters */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {types.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`filter-btn ${typeFilter === t ? 'active' : 'idle'}`}
            >
              {t === 'All' ? 'All Types' : t}
            </button>
          ))}
        </div>

        {/* Count */}
        <div className="filter-count" style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#1A1000', fontFamily: FD }}>
          {filtered.length} position{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Jobs grid */}
      <div className="jobs-grid-4col" style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {visible.map((job, i) => (
          <JobCard key={job.id} job={job} index={i} isLoggedIn={isLoggedIn} isPromoter={isPromoter} applyingJobId={applyingJobId} onLock={onLock} onView={onView} onApply={onApply} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: '40px 0', textAlign: 'center', color: '#1A1000', fontFamily: FD, fontSize: 13 }}>
          No jobs match your filters.
        </div>
      )}
    </div>
  )
}


// ── Extra color constants needed by the modal components ──────────────────────
const BC  = '#1A1408'   // card background (matches promoter dark)
const G2  = '#8B5A1A'   // deep gold
const G4  = '#8B5A1A'   // alias
const FB  = "'DM Sans', system-ui, sans-serif"  // body font

// ── Terms & Conditions Modal (shared with JobsPage) ─────────────────────────
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
          {!scrolled&&<div style={{ background:'rgba(232,168,32,0.06)', border:`1px solid rgba(232,168,32,0.22)`, padding:'10px 14px', marginBottom:16, fontSize:11, color:G, display:'flex', alignItems:'center', gap:8, fontFamily:FB }}>↓ Please scroll through all terms before accepting</div>}
          <div style={{ whiteSpace:'pre-line', fontSize:13, lineHeight:1.85, color:WM, fontFamily:FB }}>{job.terms||'Standard Campari Promoter Terms & Conditions apply.'}</div>
        </div>
        <div style={{ padding:'16px 24px 22px', borderTop:`1px solid ${BB}`, flexShrink:0 }}>
          <label style={{ display:'flex', alignItems:'flex-start', gap:12, cursor:'pointer', marginBottom:16 }}>
            <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} style={{ marginTop:2, accentColor:G, width:16, height:16, flexShrink:0 }} />
            <span style={{ fontSize:12, color:WM, lineHeight:1.6, fontFamily:FB }}>I have read and understand the Terms & Conditions. I accept this engagement as an independent contractor.</span>
          </label>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onAccept} disabled={!agreed} style={{ flex:1, padding:'13px', background:agreed?G:'rgba(206,197,178,0.05)', border:'none', color:agreed?B:WD, fontFamily:FB, fontSize:11, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', cursor:agreed?'pointer':'not-allowed', transition:'all 0.25s', borderRadius:2 }}>Accept & Continue</button>
            <button onClick={onClose} style={{ padding:'13px 18px', background:'transparent', border:`1px solid ${BB}`, color:WM, fontFamily:FB, fontSize:11, cursor:'pointer', borderRadius:2 }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Payment Modal ─────────────────────────────────────────────────────────────
function PaymentModal({ job, onClose, onSuccess }: { job:any; onClose:()=>void; onSuccess:()=>void }) {
  const [step,setStep]=useState<'select'|'processing'|'done'>('select')
  const [method,setMethod]=useState<'card'|'eft'|'wallet'>('card')
  const [cardNum,setCardNum]=useState(''); const [expiry,setExpiry]=useState(''); const [cvv,setCvv]=useState(''); const [name,setName]=useState('')
  const fmtCard=(v:string)=>v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim()
  const fmtExpiry=(v:string)=>{const d=v.replace(/\D/g,'').slice(0,4);return d.length>2?d.slice(0,2)+'/'+d.slice(2):d}
  const handlePay=()=>{setStep('processing');setTimeout(()=>{setStep('done');setTimeout(onSuccess,1800)},2200)}
  const inp:React.CSSProperties={width:'100%',padding:'11px 12px',background:B,border:`1px solid ${BB}`,color:W,fontFamily:FB,fontSize:13,outline:'none',marginBottom:10,boxSizing:'border-box',borderRadius:2}
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', backdropFilter:'blur(16px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1001, padding:16 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:BC, border:`1px solid ${BB}`, width:'100%', maxWidth:440, position:'relative', overflow:'hidden', borderRadius:4 }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${G5},${G},${GL},${G},${G5})` }} />
        {step==='processing'&&<div style={{ padding:'72px 40px', textAlign:'center' }}><div style={{ fontSize:44, color:G, marginBottom:16, display:'inline-block', animation:'spin 1.2s linear infinite' }}>◎</div><div style={{ fontFamily:FD, fontSize:20, color:W, marginBottom:6 }}>Processing</div><div style={{ fontSize:13, color:WM, fontFamily:FB }}>Securing your slot...</div><style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style></div>}
        {step==='done'&&<div style={{ padding:'72px 40px', textAlign:'center' }}><div style={{ fontSize:52, marginBottom:14, color:G }}>✓</div><div style={{ fontFamily:FD, fontSize:22, color:GL, marginBottom:8 }}>Application Submitted!</div><div style={{ fontSize:13, color:WM, lineHeight:1.6, fontFamily:FB }}>Your slot for <strong style={{ color:W }}>{job.title}</strong> has been reserved.</div></div>}
        {step==='select'&&(
          <>
            <div style={{ padding:'22px 24px 16px', borderBottom:`1px solid ${BB}` }}>
              <div style={{ fontSize:9, letterSpacing:'0.3em', textTransform:'uppercase', color:G, marginBottom:4, fontFamily:FB }}>Demo Payment Gateway</div>
              <h2 style={{ fontFamily:FD, fontSize:18, color:W, marginBottom:4 }}>Confirm Application</h2>
              <div style={{ fontSize:12, color:WM, fontFamily:FB }}>{job.title} — {job.company}</div>
              <div style={{ marginTop:10, padding:'10px 14px', background:'rgba(232,168,32,0.08)', border:`1px solid rgba(232,168,32,0.22)`, display:'flex', justifyContent:'space-between', alignItems:'center', borderRadius:2 }}>
                <span style={{ fontSize:11, color:WM, fontFamily:FB }}>Application Fee (Demo)</span>
                <span style={{ fontFamily:FD, fontSize:16, color:G, fontWeight:700 }}>R 25.00</span>
              </div>
              <button onClick={onClose} style={{ position:'absolute', top:14, right:16, background:'none', border:'none', cursor:'pointer', color:WD, fontSize:18 }}>✕</button>
            </div>
            <div style={{ padding:'16px 24px 22px' }}>
              <div style={{ display:'flex', gap:6, marginBottom:16 }}>
                {(['card','eft','wallet'] as const).map(m=><button key={m} onClick={()=>setMethod(m)} style={{ flex:1, padding:'9px 6px', background:method===m?'rgba(196,151,58,0.16)':'transparent', border:`1px solid ${method===m?G:BB}`, color:method===m?G:WM, fontFamily:FB, fontSize:10, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer', transition:'all 0.2s', borderRadius:2 }}>{m==='card'?'💳 Card':m==='eft'?'🏦 EFT':'👜 Wallet'}</button>)}
              </div>
              {method==='card'&&<><input placeholder="Cardholder Name" value={name} onChange={e=>setName(e.target.value)} style={inp} /><input placeholder="Card Number" value={cardNum} onChange={e=>setCardNum(fmtCard(e.target.value))} style={inp} maxLength={19} /><div style={{ display:'flex', gap:10 }}><input placeholder="MM/YY" value={expiry} onChange={e=>setExpiry(fmtExpiry(e.target.value))} style={{ ...inp, flex:1 }} maxLength={5} /><input placeholder="CVV" value={cvv} onChange={e=>setCvv(e.target.value.replace(/\D/g,'').slice(0,4))} style={{ ...inp, flex:1 }} maxLength={4} type="password" /></div></>}
              {method==='eft'&&<div style={{ padding:'14px', background:'rgba(206,197,178,0.03)', border:`1px solid ${BB}`, marginBottom:10, borderRadius:2 }}>{[['Bank','Campari Bank (Demo)'],['Account','1234 5678 9012'],['Branch','250655'],['Reference',`HG-${job.id}`]].map(([l,v])=><div key={l} style={{ display:'flex', justifyContent:'space-between', marginBottom:7 }}><span style={{ fontSize:11, color:WD, fontFamily:FB }}>{l}</span><span style={{ fontSize:11, color:W, fontWeight:600, fontFamily:FB }}>{v}</span></div>)}</div>}
              {method==='wallet'&&<div style={{ padding:'14px', background:'rgba(206,197,178,0.03)', border:`1px solid ${BB}`, marginBottom:10, borderRadius:2 }}><div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}><span style={{ fontSize:12, color:WM, fontFamily:FB }}>HG Wallet Balance (Demo)</span><span style={{ fontFamily:FD, fontSize:16, color:G, fontWeight:700 }}>R 250.00</span></div><div style={{ fontSize:11, color:WD, fontFamily:FB }}>R 25.00 will be deducted.</div></div>}
              <button onClick={handlePay} style={{ width:'100%', padding:'13px', background:`linear-gradient(90deg,${G5},${G},${GL})`, border:'none', color:B, fontFamily:FB, fontSize:11, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', cursor:'pointer', borderRadius:2 }}>{method==='eft'?'Confirm EFT (Demo)':'Pay R 25.00 (Demo)'}</button>
              <div style={{ textAlign:'center', marginTop:8, fontSize:10, color:WD, fontFamily:FB }}>🔒 Demo Mode · POPIA Compliant</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Login Prompt Modal ────────────────────────────────────────────────────────
function LoginPromptModal({ onClose, onLogin, onRegister }: { onClose: () => void; onLogin: () => void; onRegister: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: D2, border: `1px solid ${BB}`, padding: '52px 48px', maxWidth: 420, width: '100%', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${G5}, ${GL}, ${G5})` }} />
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: `rgba(212,136,10,0.12)`, border: `1px solid rgba(232,168,32,0.35)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 26, animation: 'float 3s ease-in-out infinite' }}>⬡</div>
        <div style={{ fontSize: 9, letterSpacing: '0.38em', textTransform: 'uppercase', color: GL, marginBottom: 12, fontFamily: FD }}>Members Only</div>
        <h2 style={{ fontFamily: FD, fontSize: 26, fontWeight: 700, color: W, marginBottom: 14, lineHeight: 1.2 }}>Unlock Job Details</h2>
        <p style={{ fontSize: 13, color: WM, lineHeight: 1.75, marginBottom: 36, fontFamily: FD }}>Create a free account or sign in to view full job details, requirements, and apply for promoter positions.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={onRegister} style={{ width: '100%', padding: '15px', background: GL, border: 'none', color: B, fontFamily: FD, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.25s' }}
            onMouseEnter={e => { e.currentTarget.style.background = G; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = GL; e.currentTarget.style.transform = 'translateY(0)' }}>
            Create Free Account
          </button>
          <button onClick={onLogin} style={{ width: '100%', padding: '15px', background: 'transparent', border: `1px solid ${BB}`, color: WM, fontFamily: FD, fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.25s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `rgba(232,168,32,0.45)`; e.currentTarget.style.color = GL }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = BB; e.currentTarget.style.color = WM }}>
            Already Have an Account
          </button>
        </div>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', cursor: 'pointer', color: WD, fontSize: 18 }}>✕</button>
      </div>
    </div>
  )
}

// ── Feature Cards ─────────────────────────────────────────────────────────────
function FeatureSlideshow() {
  const features = [
    { tag: 'Smart Dispatch', icon: '◎', title: 'Right person, right place.', body: 'AI-powered matching filters promoters by location, reliability score, and physical attributes — filling your brand activations with precision.', stat: '280+', statLabel: 'Active Promoters', bg: `linear-gradient(160deg, #1E1608 0%, #120D03 100%)`, border: 'rgba(232,168,32,0.30)', accent: GL, rotate: '-3deg', translateY: '12px', zIndex: 1 },
    { tag: 'Geo-Verified Shifts', icon: '⬡', title: 'Attendance you can trust.', body: 'Promoters check in only when within 5m of the venue. GPS verification plus mandatory selfie — no proxy clock-ins, ever.', stat: '98%', statLabel: 'Shift Attendance', bg: `linear-gradient(160deg, #3D2E0A 0%, #2A1E05 100%)`, border: '#AB8D3F', accent: '#AB8D3F', rotate: '0deg', translateY: '0px', zIndex: 3 },
    { tag: 'Smart Payroll', icon: '◈', title: 'Calculate pay in minutes.', body: 'Hours × Rate calculations done instantly. View earnings per promoter and per campaign. Admin approves — no direct payments on-platform.', stat: '12', statLabel: 'Cities Covered', bg: `linear-gradient(160deg, #1E1608 0%, #120D03 100%)`, border: 'rgba(232,168,32,0.30)', accent: GL, rotate: '3deg', translateY: '12px', zIndex: 1 },
  ]

  return (
    <div className="features-grid-3col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, alignItems: 'flex-start', perspective: '1200px' }}>
      {features.map((f, i) => (
        <div key={i} className={`feat-card-${i}`}
          style={{ transform: `rotate(${f.rotate}) translateY(${f.translateY})`, zIndex: f.zIndex, transition: 'transform 0.5s cubic-bezier(0.22,1,0.36,1), box-shadow 0.5s ease', transformStyle: 'preserve-3d', cursor: 'default', position: 'relative' }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = `rotate(0deg) translateY(-16px) rotateY(4deg)`; el.style.zIndex = '10'; el.style.boxShadow = `0 40px 80px rgba(0,0,0,0.7), 0 0 60px rgba(232,168,32,0.12)` }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = `rotate(${f.rotate}) translateY(${f.translateY})`; el.style.zIndex = String(f.zIndex); el.style.boxShadow = 'none' }}>
          <div style={{ background: f.bg, border: `1px solid ${f.border}`, position: 'relative', overflow: 'hidden', boxShadow: i === 1 ? `0 16px 48px rgba(0,0,0,0.6), 0 0 40px rgba(171,141,63,0.15)` : `0 8px 32px rgba(0,0,0,0.5)` }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: i === 1 ? 4 : 2, background: i === 1 ? `linear-gradient(90deg, #6B4F10, #AB8D3F, #D4B86A, #AB8D3F, #6B4F10)` : `linear-gradient(90deg, ${G5}, ${GL}, ${G5})` }} />
            <div style={{ padding: '48px 36px 44px', display: 'flex', flexDirection: 'column', gap: 0, minHeight: 420, justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
                  <div style={{ width: 20, height: 1, background: f.accent }} />
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.38em', textTransform: 'uppercase', color: f.accent, fontFamily: FD }}>{f.tag}</span>
                </div>
                <div style={{ fontSize: 48, color: f.accent, lineHeight: 1, marginBottom: 20 }}>{f.icon}</div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '8px 0 24px' }}>
                <h3 style={{ fontFamily: FD, fontSize: 22, fontWeight: 800, lineHeight: 1.2, color: W, marginBottom: 16, letterSpacing: '-0.01em' }}>{f.title}</h3>
                <p style={{ fontSize: 13, lineHeight: 1.8, color: WM, fontFamily: FD }}>{f.body}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, paddingTop: 24, borderTop: `1px solid ${i === 1 ? 'rgba(171,141,63,0.2)' : BB}` }}>
                <span style={{ fontSize: 32, fontWeight: 900, color: f.accent, fontFamily: FD, lineHeight: 1 }}>{f.stat}</span>
                <span style={{ fontSize: 11, color: WD, fontFamily: FD, letterSpacing: '0.06em' }}>{f.statLabel}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Image Triptych ────────────────────────────────────────────────────────────
function ImageTriptych() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', background: B, borderTop: `1px solid ${BB}` }}>
      <div className="triptych-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr 1fr', height: 520 }}>
        <div className="triptych-img triptych-side" style={{ position: 'relative' }}>
          <img src="/leftFooter.jpg" alt="Concert crowd" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) brightness(0.7)', transition: 'transform 0.8s cubic-bezier(0.22,1,0.36,1)' }} onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.04)' }} onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(12,10,7,0.3), transparent)' }} />
        </div>
        <div className="triptych-img center triptych-center" style={{ position: 'relative', zIndex: 2 }}>
          <img src="/centreFooter.jpg" alt="Promoter at event" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', filter: 'brightness(1.05) saturate(1.1)', transition: 'transform 0.8s cubic-bezier(0.22,1,0.36,1)' }} onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.04)' }} onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)' }} />
          <div style={{ position: 'absolute', inset: 0, border: `2px solid ${GL}`, pointerEvents: 'none', opacity: 0.4 }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${GL}, transparent)` }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${GL}, transparent)` }} />
        </div>
        <div className="triptych-img triptych-side" style={{ position: 'relative' }}>
          <img src="/rightFooter.jpg" alt="Street crowd" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', filter: 'grayscale(100%) brightness(0.7)', transition: 'transform 0.8s cubic-bezier(0.22,1,0.36,1)' }} onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.04)' }} onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to left, rgba(12,10,7,0.3), transparent)' }} />
        </div>
      </div>
    </section>
  )
}

// ── Main Landing Page ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate()
  const [showLoginPrompt, setLoginPrompt] = useState(false)
  const [session, setSession] = useState<{ role: string; name: string; email: string } | null>(null)
  const [heroSlide, setHeroSlide] = useState(0)
  const heroSlideRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [allJobs, setAllJobs] = useState<ReturnType<typeof getActiveJobs>>([])
  const [applyingJob,  setApplyingJob]  = useState<any>(null)
  const [applySuccess, setApplySuccess] = useState<string | null>(null)
  const [applyError,   setApplyError]   = useState<string | null>(null)
  // T&C + Payment modal flow (same as JobsPage)
  const [termsJob,     setTermsJob]     = useState<any>(null)
  const [paymentJob,   setPaymentJob]   = useState<any>(null)

  const secFeaturesRef = useRef<HTMLElement | null>(null)
  const secJobsRef     = useRef<HTMLElement | null>(null)

  const rFeatures = useReveal()
  const rJobs     = useReveal()

  const heroMedia = [
    { type: 'image', src: '/1_hero.jpg' },
    { type: 'image', src: '/2_hero.jpg' },
    { type: 'video', src: '/3_hero.mp4' },
    { type: 'image', src: '/4_hero.jpg' },
    { type: 'image', src: '/5_hero.jpg' },
  ]

  useEffect(() => {
    heroSlideRef.current = setInterval(() => {
      setHeroSlide(prev => (prev + 1) % heroMedia.length)
    }, 5000)
    return () => { if (heroSlideRef.current) clearInterval(heroSlideRef.current) }
  }, [])

  useEffect(() => {
    const s = localStorage.getItem('hg_session')
    if (s) { try { setSession(JSON.parse(s)) } catch {} }
  }, [])

  useEffect(() => {
    // Merge localStorage (admin broadcast) jobs with live API jobs so
    // newly created admin jobs appear immediately without a page refresh.
    const mergeAndSet = (apiJobs: any[] = []) => {
      const GL2  = '#E8A820'
      const ACCENT_PALETTE = [GL2,'#D4880A','#AB8D3F','#C4973A','#8B5A1A']
      const mapped = apiJobs.map((j: any, idx: number) => ({
        id: j.id,
        title: j.title,
        company: j.client || j.brand || '',
        companyInitial: (j.client || '?').charAt(0),
        companyColor: ACCENT_PALETTE[idx % ACCENT_PALETTE.length],
        location: [j.venue, j.city].filter(Boolean).join(', ') || j.address || '',
        type: j.filters?.category || 'Brand Activation',
        pay: `R ${Number(j.hourlyRate).toLocaleString('en-ZA')}`,
        payPer: '/hr',
        date: j.date ? new Date(j.date).toLocaleDateString('en-ZA', { weekday:'short', day:'numeric', month:'short', year:'numeric' }) : '',
        jobDate: j.date || new Date().toISOString(),
        approvedAt: j.createdAt || new Date().toISOString(),
        slots: j.totalSlots || 1,
        slotsLeft: (j.totalSlots || 1) - (j.filledSlots || 0),
        duration: j.startTime && j.endTime ? `${j.startTime}–${j.endTime}` : '',
        tags: [j.filters?.gender, j.filters?.category].filter(Boolean),
        accentLine: ACCENT_PALETTE[idx % ACCENT_PALETTE.length],
        gradient: 'linear-gradient(135deg, rgba(232,168,32,0.10) 0%, rgba(196,151,58,0.04) 100%)',
        status: (j.status || 'OPEN').toLowerCase(),
        filters: j.filters,
        termsAndConditions: j.termsAndConditions,
        hourlyRate: j.hourlyRate,
      }))

      // API jobs take precedence; fill remaining slots from localStorage
      const apiIds = new Set(mapped.map((j: any) => j.id))
      const localJobs = getActiveJobs(getAllJobsWithAdminJobs()).filter(j => !apiIds.has(j.id))
      const combined = [...mapped, ...localJobs] as ReturnType<typeof getActiveJobs>
      setAllJobs(getActiveJobs(combined))
    }

    // Immediately load from localStorage while API call is in-flight
    mergeAndSet([])

    const fetchFromApi = async () => {
      try {
        const token = localStorage.getItem('hg_token')
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`
        let res = await fetch(`${API_URL}/jobs`, { headers })
        // If auth fails, retry without token (public endpoint now supports no-auth)
        if (!res.ok && token) res = await fetch(`${API_URL}/jobs`)
        if (res.ok) {
          const data = await res.json()
          mergeAndSet(data)
          // Also broadcast to localStorage for other pages
          localStorage.setItem('hg_admin_jobs', JSON.stringify(data.map((j: any, idx: number) => ({
            id: j.id, title: j.title, company: j.client, client: j.client,
            location: [j.venue, j.city].filter(Boolean).join(', '),
            type: j.filters?.category || 'Brand Activation',
            pay: `R ${j.hourlyRate}`, payPer: '/hr', hourlyRate: j.hourlyRate,
            jobDate: j.date, approvedAt: j.createdAt,
            slots: j.totalSlots, slotsLeft: j.totalSlots - (j.filledSlots || 0),
            status: (j.status || 'open').toLowerCase(),
            tags: [j.filters?.gender, j.filters?.category].filter(Boolean),
            accentLine: '#E8A820', gradient: 'transparent',
            companyInitial: (j.client || '?').charAt(0),
            filters: j.filters,
          }))))
        }
      } catch { /* API offline — localStorage jobs still show */ }
    }

    fetchFromApi()
    // Re-fetch when localStorage changes (admin dashboard broadcast)
    const onStorage = () => { fetchFromApi() }
    window.addEventListener('storage', onStorage)
    const interval = setInterval(fetchFromApi, 30000)
    return () => { window.removeEventListener('storage', onStorage); clearInterval(interval) }
  }, [])

  // T&C accepted → open payment modal
  const handleTermsAccepted = () => { if (!termsJob) return; setPaymentJob(termsJob); setTermsJob(null) }

  // Payment done → POST application to API
  const handlePaymentSuccess = async () => {
    if (!paymentJob) return
    const token = localStorage.getItem('hg_token')
    if (token) {
      const isStaticJob = /^JB-\d+$/.test(paymentJob.id)
      if (!isStaticJob) {
        try {
          const res = await fetch(`${API_URL}/applications`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId: paymentJob.id }),
          })
          if (!res.ok && res.status !== 409) {
            const err = await res.json().catch(() => ({ error: 'Failed' }))
            setApplyError(err.error || 'Application failed.')
            setTimeout(() => setApplyError(null), 4000)
            setPaymentJob(null); return
          }
        } catch {
          setApplyError('Could not connect. Please try again.')
          setTimeout(() => setApplyError(null), 4000)
          setPaymentJob(null); return
        }
      }
    }
    setApplySuccess(`Applied for "${paymentJob.title}"! Check your dashboard.`)
    setTimeout(() => setApplySuccess(null), 6000)
    setPaymentJob(null)
  }

  const handleApply = (job: any) => {
    if (!session) { setLoginPrompt(true); return }
    if (session.role !== 'promoter') {
      setApplyError('Only promoter accounts can apply for jobs.')
      setTimeout(() => setApplyError(null), 4000)
      return
    }
    // Open T&C modal — same flow as the full Jobs page
    setTermsJob({
      ...job,
      company: job.company || job.client || '',
      pay: job.pay || (job.hourlyRate ? `R ${job.hourlyRate}` : ''),
      payPer: job.payPer || '/hr',
      duration: job.duration || '',
      terms: job.terms || job.termsAndConditions || '',
    })
  }

  const handleLogout = () => { localStorage.removeItem('hg_session'); setSession(null) }
  const handleDashboard = () => {
    if (!session) return
    const map: Record<string, string> = { admin: '/admin', business: '/business/dashboard', promoter: '/promoter/' }
    navigate(map[session.role] || '/')
  }

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => ref.current?.scrollIntoView({ behavior: 'smooth' })

  const tickerItems = ['Brand Activations', 'In-Store Demos', 'Event Staffing', 'Field Marketing', 'Geo-Verified Shifts', 'Live Payroll Calc', 'Supervisor Monitoring', 'Nationwide Coverage']

  return (
    <div style={{ fontFamily: FD, background: B, color: W, overflowX: 'hidden', width: '100%' }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── NAV ── */}
      <nav className="nav-root" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, padding: '0 48px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#000' }}>
        <div className="nav-logo" style={{ fontFamily: FD, fontSize: 20, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.01em', flexShrink: 0 }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span style={{ color: GL }}>CAMPARI</span><span style={{ color: W }}></span>
        </div>

        {/* Desktop nav links — hidden on mobile */}
        <ul className="nav-desktop-links" style={{ display: 'flex', gap: 52, listStyle: 'none', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          {[{ label: 'Jobs', ref: secJobsRef }, { label: 'Features', ref: secFeaturesRef }].map(({ label, ref }) => (
            <li key={label}>
              <button onClick={() => scrollTo(ref)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FD, fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: W, transition: 'color 0.2s', padding: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = GL}
                onMouseLeave={e => e.currentTarget.style.color = W}>
                {label}
              </button>
            </li>
          ))}
        </ul>

        <div className="nav-cta-group" style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          {session ? (
            <>
              <button onClick={handleDashboard} style={{ fontFamily: FD, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: GL, border: 'none', color: B, padding: '11px 24px', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = G} onMouseLeave={e => e.currentTarget.style.background = GL}>My Dashboard</button>
              <button onClick={handleLogout} style={{ fontFamily: FD, fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', border: '1px solid rgba(206,197,178,0.3)', color: WM, padding: '11px 20px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = GL; e.currentTarget.style.color = GL }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(206,197,178,0.3)'; e.currentTarget.style.color = WM }}>Log Out</button>
            </>
          ) : (
            <>
              <button onClick={() => navigate('/login')} style={{ fontFamily: FD, fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', border: '1px solid rgba(206,197,178,0.3)', color: WM, padding: '11px 22px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = GL; e.currentTarget.style.color = GL }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(206,197,178,0.3)'; e.currentTarget.style.color = WM }}>LOG IN</button>
              <button onClick={() => navigate('/register')} style={{ fontFamily: FD, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: GL, border: 'none', color: B, padding: '11px 24px', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = G} onMouseLeave={e => e.currentTarget.style.background = GL}>REGISTER</button>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero-root" style={{ height: '75vh', minHeight: 540, maxHeight: 820, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'stretch', background: '#000', marginTop: 68, padding: '28px 48px' }}>
        <div className="hero-media-panel" style={{ position: 'absolute', top: 28, left: '48%', right: 48, bottom: 28, borderRadius: 16, overflow: 'hidden', zIndex: 1 }}>
          {heroMedia.map((media, idx) => (
            <div key={idx} style={{ position: 'absolute', inset: 0, opacity: heroSlide === idx ? 1 : 0, transition: 'opacity 1s ease', zIndex: heroSlide === idx ? 1 : 0 }}>
              {media.type === 'video' ? (
                <video autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}><source src={media.src} type="video/mp4" /></video>
              ) : (
                <img src={media.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', animation: heroSlide === idx ? 'img-scale 8s ease-out forwards' : 'none' }} />
              )}
            </div>
          ))}
          <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: '#111' }} />
          <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'linear-gradient(to right, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.1) 100%)' }} />
          <div style={{ position: 'absolute', bottom: 20, left: 24, zIndex: 10, display: 'flex', gap: 6 }}>
            {heroMedia.map((_, idx) => (
              <button key={idx} onClick={() => { if (heroSlideRef.current) clearInterval(heroSlideRef.current); setHeroSlide(idx) }}
                style={{ width: idx === heroSlide ? 24 : 6, height: 3, border: 'none', cursor: 'pointer', borderRadius: 2, background: idx === heroSlide ? GL : 'rgba(255,255,255,0.35)', transition: 'all 0.4s ease', padding: 0 }} />
            ))}
          </div>
        </div>
        <div className="hero-copy" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '100%', zIndex: 5, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 0 0 48px', pointerEvents: 'none' }}>
          <h1 style={{ fontFamily: "'Bodoni Moda', 'Modern No. 20', 'Didot', Georgia, serif", fontSize: 'clamp(58px, 7.8vw, 112px)', fontWeight: 900, lineHeight: 0.95, letterSpacing: '-0.02em', textTransform: 'uppercase', marginBottom: 36, fontStyle: 'italic' }}>
            <span style={{ color: W, display: 'block' }}>WE PUT <span style={{ color: GL }}>PROMOTERS</span></span>
            <span style={{ color: W, display: 'inline-block', maxWidth: '46%' }}>CENTRE STAGE</span>
          </h1>
          {session ? (
            <button className="hero-cta-btn" onClick={handleDashboard} style={{ fontFamily: FD, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'transparent', border: '2px solid rgba(206,197,178,0.7)', color: WM, padding: '11px 20px', cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: 8, pointerEvents: 'all', width: 'fit-content', whiteSpace: 'nowrap', maxWidth: '38%' }}
              onMouseEnter={e => { e.currentTarget.style.background = GL; e.currentTarget.style.borderColor = GL; e.currentTarget.style.color = B }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(206,197,178,0.7)'; e.currentTarget.style.color = WM }}>
              ▶ MY DASHBOARD
            </button>
          ) : (
            <button className="hero-cta-btn" onClick={() => navigate('/register')} style={{ fontFamily: FD, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'transparent', border: '2px solid rgba(206,197,178,0.7)', color: WM, padding: '11px 20px', cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: 8, pointerEvents: 'all', width: 'fit-content', whiteSpace: 'nowrap', maxWidth: '38%' }}
              onMouseEnter={e => { e.currentTarget.style.background = GL; e.currentTarget.style.borderColor = GL; e.currentTarget.style.color = B }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(206,197,178,0.7)'; e.currentTarget.style.color = WM }}>
              ▶ JOIN AS PROMOTER
            </button>
          )}
        </div>
      </section>

      {/* ── TICKER ── */}
      <div className="ticker-wrap">
        <div className="ticker-inner">
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <div key={i} className="ticker-item"><span>◆</span>{item}</div>
          ))}
        </div>
      </div>

      {/* ── JOBS SECTION ── */}
      <section
        ref={(el) => {
          rJobs(el)
          secJobsRef.current = el
        }}
        className="reveal jobs-section-root"
        style={{ padding: '48px 80px 56px', background: '#AB8D3F', borderBottom: `1px solid rgba(120,75,0,0.4)`, position: 'relative', overflow: 'hidden' }}
      >
        {/* Ambient glow */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse at 15% 40%, rgba(255,210,90,0.22) 0%, transparent 55%), radial-gradient(ellipse at 85% 15%, rgba(90,45,0,0.18) 0%, transparent 50%)' }} />

        {/* Corner star decorations */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 340, height: 340, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
          {[{top:12,left:16,size:28,opacity:0.55,delay:'0s',dur:'2.6s'},{top:10,left:64,size:16,opacity:0.40,delay:'0.5s',dur:'3.2s'},{top:38,left:36,size:12,opacity:0.35,delay:'1.0s',dur:'2.9s'},{top:8,left:108,size:10,opacity:0.28,delay:'0.3s',dur:'3.7s'},{top:60,left:14,size:20,opacity:0.45,delay:'1.4s',dur:'2.4s'},{top:52,left:72,size:8,opacity:0.25,delay:'0.8s',dur:'4.0s'},{top:80,left:44,size:14,opacity:0.32,delay:'2.0s',dur:'3.0s'},{top:28,left:148,size:7,opacity:0.22,delay:'1.7s',dur:'3.5s'}].map((s,i) => (
            <div key={i} style={{ position:'absolute', top:s.top, left:s.left, fontSize:s.size, color:W, opacity:s.opacity, animation:`twinkle ${s.dur} ${s.delay} ease-in-out infinite`, lineHeight:1 }}>✦</div>
          ))}
        </div>
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 340, height: 340, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
          {[{bottom:12,right:16,size:28,opacity:0.55,delay:'0.2s',dur:'2.6s'},{bottom:10,right:64,size:16,opacity:0.40,delay:'0.7s',dur:'3.2s'},{bottom:38,right:36,size:12,opacity:0.35,delay:'1.2s',dur:'2.9s'},{bottom:60,right:14,size:20,opacity:0.45,delay:'1.6s',dur:'2.4s'},{bottom:80,right:44,size:14,opacity:0.32,delay:'2.1s',dur:'3.0s'}].map((s,i) => (
            <div key={i} style={{ position:'absolute', bottom:s.bottom, right:s.right, fontSize:s.size, color:W, opacity:s.opacity, animation:`twinkle ${s.dur} ${s.delay} ease-in-out infinite`, lineHeight:1 }}>✦</div>
          ))}
        </div>

        <div style={{ maxWidth: 1360, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* Section header */}
          <div className="jobs-header-row" style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
            <div>
              <h2 style={{ fontFamily: FD, fontSize: 'clamp(28px,4vw,52px)', fontWeight: 900, lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: 8 }}>
                <span style={{ color: B }}>Live </span>
                <span style={{ color: B, fontStyle: 'italic' }}>Jobs.</span>
              </h2>
              <p style={{ fontSize: 13, color: '#1A1000', fontWeight: 600, lineHeight: 1.6, fontFamily: FD }}>
                {allJobs.length} active positions across South Africa.
                {!session && <> <span style={{ color: B, fontWeight: 800, textDecoration: 'underline', cursor: 'pointer' }} onClick={() => navigate('/login')}>Login</span> or <span style={{ color: B, fontWeight: 800, textDecoration: 'underline', cursor: 'pointer' }} onClick={() => navigate('/register')}>register</span> to apply.</>}
              </p>
            </div>
            <div style={{ flexShrink: 0 }}>
              {!session ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', background: `rgba(0,0,0,0.18)`, border: `1px solid rgba(0,0,0,0.28)` }}>
                  <span style={{ fontSize: 12, color: B }}>⬡</span>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: B, fontFamily: FD }}>Members Only</div>
                    <div style={{ fontSize: 11, color: '#1A1000', marginTop: 1, fontFamily: FD }}>Login to apply</div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', background: `rgba(0,0,0,0.18)`, border: `1px solid rgba(0,0,0,0.28)` }}>
                  <span style={{ fontSize: 12, color: B }}>◉</span>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: B, fontFamily: FD }}>Logged In</div>
                    <div style={{ fontSize: 11, color: '#1A1000', marginTop: 1, fontFamily: FD }}>{session.name}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {applySuccess && (
            <div style={{ position:'fixed', bottom: 28, left:'50%', transform:'translateX(-50%)', zIndex:999, padding: '14px 28px', background: 'rgba(20,40,20,0.97)', border: '1px solid rgba(74,171,100,0.6)', color: '#6DEFA0', fontFamily: FD, fontSize: 13, borderRadius: 6, boxShadow:'0 8px 32px rgba(0,0,0,0.5)', whiteSpace:'nowrap', maxWidth:'90vw', textAlign:'center' }}>
              ✓ {applySuccess}
            </div>
          )}
          {applyError && (
            <div style={{ position:'fixed', bottom: 28, left:'50%', transform:'translateX(-50%)', zIndex:999, padding: '14px 28px', background: 'rgba(40,10,5,0.97)', border: '1px solid rgba(196,97,74,0.6)', color: '#F0896A', fontFamily: FD, fontSize: 13, borderRadius: 6, boxShadow:'0 8px 32px rgba(0,0,0,0.5)', whiteSpace:'nowrap', maxWidth:'90vw', textAlign:'center' }}>
              ⚠ {applyError}
            </div>
          )}
          <JobsSection jobs={allJobs} isLoggedIn={!!session} isPromoter={session?.role === 'promoter'} applyingJobId={applyingJob} onLock={() => setLoginPrompt(true)} onView={(id) => navigate(`/jobs/${id}`)} onApply={handleApply} />

          <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 1, height: 32, background: `linear-gradient(to bottom, ${B}, transparent)` }} />
            <button onClick={() => navigate('/jobs')}
              style={{ fontFamily: FD, fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', background: B, border: `1px solid ${B}`, color: GL, padding: '12px 40px', cursor: 'pointer', transition: 'all 0.3s' }}
              onMouseEnter={e => { e.currentTarget.style.background = G5; e.currentTarget.style.borderColor = G5 }}
              onMouseLeave={e => { e.currentTarget.style.background = B; e.currentTarget.style.borderColor = B }}>
              Open Full Jobs Board →
            </button>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section
        ref={(el) => {
          rFeatures(el)
          secFeaturesRef.current = el
        }}
        className="reveal features-section-root"
        style={{ padding: '80px 80px 100px', background: B, borderBottom: `1px solid ${BB}` }}>
        <div style={{ maxWidth: 1360, margin: '0 auto' }}>
          <div className="features-header-row" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 56, borderBottom: `1px solid ${BB}`, paddingBottom: 32 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.42em', textTransform: 'uppercase', color: GL, fontFamily: FD }}>Platform Capabilities</div>
            <h2 style={{ fontFamily: FD, fontSize: 'clamp(28px,3.5vw,48px)', fontWeight: 900, lineHeight: 1, textAlign: 'right' }}>Built for <span style={{ color: GL, fontStyle: 'italic' }}>precision.</span></h2>
          </div>
          <FeatureSlideshow />
          <div style={{ marginTop: 48, display: 'flex', justifyContent: 'center' }}>
            <button onClick={() => navigate('/about')}
              style={{ fontFamily: FD, fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', background: 'transparent', border: `1px solid rgba(232,168,32,0.4)`, color: GL, padding: '14px 44px', cursor: 'pointer', transition: 'all 0.3s' }}
              onMouseEnter={e => { e.currentTarget.style.background = `rgba(232,168,32,0.08)`; e.currentTarget.style.borderColor = GL }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = `rgba(232,168,32,0.4)` }}>
              About Us →
            </button>
          </div>
        </div>
      </section>

      {/* ── IMAGE TRIPTYCH ── */}
      <ImageTriptych />

      {/* ── GOLD LINE ── */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${G5}, ${GL}, #F5C842, ${GL}, ${G5})` }} />

      {/* ── FOOTER ── */}
      <footer style={{ background: B }}>
        <div className="footer-root" style={{ padding: '72px 80px 56px' }}>
          <div className="footer-grid-3col" style={{ maxWidth: 1360, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr 1fr', gap: 80, alignItems: 'start' }}>
            {/* Newsletter */}
            <div>
              <div style={{ fontFamily: FD, fontSize: 22, fontWeight: 800, marginBottom: 32, letterSpacing: '0.01em' }}><span style={{ color: GL }}>CAMPARI</span><span style={{ color: W }}></span></div>
              <h3 style={{ fontFamily: FD, fontSize: 20, fontWeight: 700, color: W, marginBottom: 12, lineHeight: 1.2 }}>Newsletter Sign-Up</h3>
              <p style={{ fontSize: 13, color: WM, lineHeight: 1.75, fontFamily: FD, marginBottom: 28, maxWidth: 300 }}>Subscribe to receive our latest opportunities and platform updates directly to your inbox.</p>
              <div style={{ marginBottom: 12 }}>
                <input type="text" placeholder="YOUR NAME" style={{ width: '100%', background: 'transparent', border: `1px solid ${BB}`, borderRadius: 0, padding: '14px 16px', fontFamily: FD, fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', color: WM, outline: 'none' }} onFocus={e => e.currentTarget.style.borderColor = `rgba(232,168,32,0.5)`} onBlur={e => e.currentTarget.style.borderColor = BB} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <input type="email" placeholder="YOUR EMAIL" style={{ width: '100%', background: 'transparent', border: `1px solid ${BB}`, borderRadius: 0, padding: '14px 16px', fontFamily: FD, fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', color: WM, outline: 'none' }} onFocus={e => e.currentTarget.style.borderColor = `rgba(232,168,32,0.5)`} onBlur={e => e.currentTarget.style.borderColor = BB} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', paddingBottom: 6, borderBottom: `1px solid ${BB}`, width: 'fit-content' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderBottomColor = GL }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderBottomColor = BB }}>
                <span style={{ fontFamily: FD, fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: W }}>SUBMIT</span>
                <span style={{ fontSize: 16, color: GL }}>↗</span>
              </div>
            </div>

            {/* Nav links */}
            <div style={{ paddingTop: 8 }}>
              {[{ label: 'Jobs Board', href: '/jobs' }, { label: 'Features', href: '/#features' }, { label: 'About', href: '/#about' }, { label: 'News & Updates', href: '#' }, { label: 'Contact', href: '#' }].map(link => (
                <div key={link.label} style={{ padding: '14px 0', borderBottom: `1px solid ${BB}`, cursor: 'pointer' }} onClick={() => link.href !== '#' && navigate(link.href)} onMouseEnter={e => { (e.currentTarget.firstChild as HTMLElement).style.color = GL }} onMouseLeave={e => { (e.currentTarget.firstChild as HTMLElement).style.color = WM }}>
                  <span style={{ fontFamily: FD, fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: WM, transition: 'color 0.2s' }}>{link.label}</span>
                </div>
              ))}
            </div>

            {/* Contact + social */}
            <div style={{ paddingTop: 8 }}>
              {[{ label: 'Partnership Opportunities', email: 'partnerships@campari.co.za' }, { label: 'Career Opportunities', email: 'careers@campari.co.za' }, { label: 'Press', email: 'press@campari.co.za' }].map(c => (
                <div key={c.label} style={{ marginBottom: 32 }}>
                  <h4 style={{ fontFamily: FD, fontSize: 16, fontWeight: 700, color: W, marginBottom: 6 }}>{c.label}</h4>
                  <a href={`mailto:${c.email}`} style={{ fontFamily: FD, fontSize: 13, color: GL, textDecoration: 'underline', textUnderlineOffset: 3 }}>{c.email}</a>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, marginBottom: 40 }}>
                {[{ label: 'LI', title: 'LinkedIn' }, { label: 'IG', title: 'Instagram' }, { label: 'FB', title: 'Facebook' }].map(s => (
                  <div key={s.label} title={s.title} style={{ width: 38, height: 38, border: `1px solid ${BB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.25s', fontSize: 10, fontWeight: 700, color: WD, fontFamily: FD, letterSpacing: '0.04em' }} onMouseEnter={e => { e.currentTarget.style.borderColor = `rgba(232,168,32,0.5)`; e.currentTarget.style.color = GL; e.currentTarget.style.background = `rgba(232,168,32,0.06)` }} onMouseLeave={e => { e.currentTarget.style.borderColor = BB; e.currentTarget.style.color = WD; e.currentTarget.style.background = 'transparent' }}>{s.label}</div>
                ))}
              </div>
              <div style={{ borderTop: `1px solid ${BB}`, paddingTop: 24 }}>
                <p style={{ fontSize: 11, color: WD, fontFamily: FD, marginBottom: 12 }}>©2026 Campari Promotions. All rights reserved.</p>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {['Privacy Policy', 'POPIA Compliant', 'Terms of Use'].map(t => (
                    <span key={t} style={{ fontSize: 10, color: WD, letterSpacing: '0.06em', fontFamily: FD, cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = GL} onMouseLeave={e => e.currentTarget.style.color = WD}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {showLoginPrompt && <LoginPromptModal onClose={() => setLoginPrompt(false)} onLogin={() => navigate('/login')} onRegister={() => navigate('/register')} />}
      {termsJob   && <TermsModal   job={termsJob}   onAccept={handleTermsAccepted} onClose={() => setTermsJob(null)} />}
      {paymentJob && <PaymentModal job={paymentJob} onSuccess={handlePaymentSuccess} onClose={() => setPaymentJob(null)} />}
    </div>
  )
}