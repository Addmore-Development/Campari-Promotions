import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

/* ─── TOKENS ─────────────────────────────────────────────────── */
const B   = '#0C0A07'
const D1  = '#141008'
const D2  = '#1A1408'
const GL  = '#E8A820'
const G   = '#D4880A'
const G3  = '#C07818'
const G5  = '#6B3F10'
const AB  = '#AB8D3F'
const W   = '#FAF3E8'
const W85 = 'rgba(250,243,232,0.85)'
const W55 = 'rgba(250,243,232,0.55)'
const W28 = 'rgba(250,243,232,0.28)'
const W12 = 'rgba(250,243,232,0.12)'
const BB  = 'rgba(212,136,10,0.16)'
const FD  = "'Work Sans', 'worksans', sans-serif"
const FI  = "'Bodoni Moda', Georgia, serif"

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Work+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&family=Bodoni+Moda:ital,wght@0,700;0,800;0,900;1,700;1,800;1,900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { -webkit-font-smoothing: antialiased; background: ${B}; font-family: ${FD}; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: ${D1}; }
  ::-webkit-scrollbar-thumb { background: ${GL}; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
  @keyframes twinkle { 0%,100%{opacity:0.2;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }
  .about-fade { animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) both; }
`

export default function AboutPage() {
  const navigate = useNavigate()
  const [hoveredCap, setHoveredCap] = useState<number | null>(null)
  const [hoveredRole, setHoveredRole] = useState<number | null>(null)

  const roles = [
    {
      num: '01', role: 'Promoter', icon: '◉', color: G3,
      tagline: 'On the ground.',
      desc: 'View available jobs, geo check-in at the venue, track your earnings, upload compliance documents, and build your reliability score.',
      perks: ['Access live job board', 'Geo-verified shifts', 'Earnings dashboard', 'Document vault'],
    },
    {
      num: '02', role: 'Supervisor', icon: '◈', color: GL,
      tagline: 'Eyes everywhere.',
      desc: 'Monitor team attendance in real-time on the live map, flag issues immediately, view promoter profiles and reliability scores, and approve shift completions.',
      perks: ['Live operations map', 'Team monitoring', 'Issue flagging', 'Shift sign-off'],
    },
    {
      num: '03', role: 'Admin', icon: '◆', color: AB,
      tagline: 'In command.',
      desc: 'Create and approve jobs, manage all users, calculate payroll instantly, generate client reports, and maintain full POPIA compliance across the platform.',
      perks: ['Full user management', 'Job creation & approval', 'Payroll calculations', 'Client reporting'],
    },
  ]

  const caps = [
    { label: 'Promoter Onboarding',   icon: '◉', desc: 'Full KYC onboarding with ID verification, bank detail capture, and admin review workflow.' },
    { label: 'Geo Check-In / Out',    icon: '⬡', desc: 'GPS-verified attendance — promoters must be within 5m of the venue. Selfie confirmation required.' },
    { label: 'Live Operations Map',   icon: '◎', desc: 'Supervisors watch real-time team attendance across all active shifts on a live map.' },
    { label: 'Smart Job Allocation',  icon: '◈', desc: 'Match promoters to jobs by location, reliability score, language, and physical requirements.' },
    { label: 'Payroll Calculations',  icon: '◆', desc: 'Hours × Rate computed instantly. Per-promoter and per-campaign earnings exports.' },
    { label: 'Document Vault',        icon: '▣', desc: 'Secure storage for ID documents, bank proofs, CIPC certificates, and tax clearances.' },
    { label: 'Supervisor Monitoring', icon: '◉', desc: 'Dedicated supervisor dashboard with team overview, attendance flags, and real-time alerts.' },
    { label: 'Client Reports',        icon: '◎', desc: 'Auto-generated post-campaign reports with attendance, hours, and pay summaries for clients.' },
    { label: 'SMS Notifications',     icon: '⬡', desc: 'Automated shift reminders, check-in confirmations, and payment notifications via SMS.' },
    { label: 'Reliability Scoring',   icon: '◈', desc: 'Promoters earn scores based on attendance, punctuality, and conduct — visible to all clients.' },
    { label: 'Earnings Export',       icon: '◆', desc: 'One-click CSV/PDF export of all payroll data for accounting and record-keeping.' },
    { label: 'POPIA Compliance',      icon: '▣', desc: 'All data collection, storage, and processing complies with the Protection of Personal Information Act.' },
  ]

  const stats = [
    { n: '280+', l: 'Active Promoters' },
    { n: '98%',  l: 'Shift Attendance Rate' },
    { n: '12',   l: 'Cities Covered' },
    { n: '4.8★', l: 'Avg Promoter Rating' },
  ]

  return (
    <div style={{ background: B, color: W, fontFamily: FD, minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── NAV ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 200,
        background: '#000', height: 68,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 80px',
      }}>
        <div style={{ fontFamily: FD, fontSize: 20, fontWeight: 800, cursor: 'pointer' }}
          onClick={() => navigate('/')}>
          <span style={{ color: GL }}>HONEY</span><span style={{ color: W }}> GROUP</span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button onClick={() => navigate('/jobs')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FD, fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: W55, transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = GL}
            onMouseLeave={e => e.currentTarget.style.color = W55}>
            Jobs
          </button>
          <button onClick={() => navigate('/')}
            style={{ background: 'none', border: `1px solid rgba(255,255,255,0.2)`, cursor: 'pointer', fontFamily: FD, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: W, padding: '10px 22px', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = GL; e.currentTarget.style.color = GL }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = W }}>
            ← Home
          </button>
          <button onClick={() => navigate('/register')}
            style={{ background: GL, border: 'none', cursor: 'pointer', fontFamily: FD, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: B, padding: '10px 22px', transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = G}
            onMouseLeave={e => e.currentTarget.style.background = GL}>
            Register
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ background: D1, borderBottom: `1px solid ${BB}`, padding: '100px 80px 80px', position: 'relative', overflow: 'hidden' }}>
        {/* Ghost watermark */}
        <div style={{
          position: 'absolute', top: '-0.1em', left: '-0.04em',
          fontSize: 'clamp(200px, 26vw, 320px)', fontWeight: 900, fontFamily: FD,
          color: 'transparent', WebkitTextStroke: `1px rgba(232,168,32,0.05)`,
          lineHeight: 1, pointerEvents: 'none', userSelect: 'none', zIndex: 0,
        }}>HG</div>

        {/* Stars top-right */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: 260, height: 220, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
          {[
            { top: 18, right: 24, size: 24, op: 0.5, delay: '0s', dur: '2.6s' },
            { top: 12, right: 72, size: 14, op: 0.35, delay: '0.6s', dur: '3.2s' },
            { top: 46, right: 44, size: 10, op: 0.28, delay: '1.1s', dur: '2.9s' },
            { top: 64, right: 20, size: 18, op: 0.40, delay: '1.6s', dur: '2.4s' },
            { top: 30, right: 110, size: 8, op: 0.22, delay: '0.4s', dur: '3.7s' },
            { top: 80, right: 70, size: 7, op: 0.18, delay: '2.0s', dur: '3.0s' },
          ].map((s, i) => (
            <div key={i} style={{
              position: 'absolute', top: s.top, right: s.right,
              fontSize: s.size, color: W, opacity: s.op,
              animation: `twinkle ${s.dur} ${s.delay} ease-in-out infinite`, lineHeight: 1,
            }}>✦</div>
          ))}
        </div>

        <div style={{ maxWidth: 1360, margin: '0 auto', position: 'relative', zIndex: 1 }} className="about-fade">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
            <div style={{ width: 40, height: 1, background: GL }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.44em', textTransform: 'uppercase', color: GL, fontFamily: FD }}>Est. 2018 · South Africa</span>
          </div>
          <h1 style={{
            fontFamily: FI, fontSize: 'clamp(52px, 7vw, 96px)',
            fontWeight: 900, fontStyle: 'italic',
            lineHeight: 0.9, letterSpacing: '-0.03em',
            color: W, marginBottom: 32,
          }}>
            About<br />
            <span style={{ color: 'transparent', WebkitTextStroke: `2px ${GL}` }}>Honey Group.</span>
          </h1>
          <p style={{ fontSize: 16, color: W55, lineHeight: 1.85, maxWidth: 620, fontFamily: FD, marginBottom: 48 }}>
            South Africa's premier promoter management platform. We connect brands with verified, reliable promoters across 12 cities — powered by GPS technology, smart payroll, and real-time operations.
          </p>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, border: `1px solid ${BB}` }}>
            {stats.map((s, i) => (
              <div key={i} style={{
                padding: '28px 32px',
                borderRight: i < 3 ? `1px solid ${BB}` : 'none',
                background: i === 1 ? `rgba(232,168,32,0.04)` : 'transparent',
              }}>
                <div style={{ fontFamily: FD, fontSize: 40, fontWeight: 900, color: GL, lineHeight: 1, marginBottom: 6 }}>{s.n}</div>
                <div style={{ fontSize: 10, color: W28, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: FD }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLES ── */}
      <section style={{ padding: '80px 80px', background: B, borderBottom: `1px solid ${BB}` }}>
        <div style={{ maxWidth: 1360, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 52, paddingBottom: 28, borderBottom: `1px solid ${BB}` }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.44em', textTransform: 'uppercase', color: GL, fontFamily: FD }}>Who We Serve</span>
            <h2 style={{ fontFamily: FI, fontSize: 'clamp(28px,3.5vw,48px)', fontWeight: 900, fontStyle: 'italic' }}>
              Three roles. <span style={{ color: GL }}>One platform.</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2, perspective: '1000px' }}>
            {roles.map((r, i) => (
              <div key={i}
                style={{
                  background: `linear-gradient(160deg, #1E1608 0%, #120D03 100%)`,
                  border: `1px solid ${hoveredRole === i ? r.color : BB}`,
                  padding: '44px 40px',
                  position: 'relative', overflow: 'hidden',
                  transform: hoveredRole === i ? 'translateY(-8px)' : 'translateY(0)',
                  transition: 'all 0.4s cubic-bezier(0.22,1,0.36,1)',
                  boxShadow: hoveredRole === i ? `0 24px 56px rgba(0,0,0,0.5), 0 0 40px ${r.color}18` : 'none',
                  cursor: 'default',
                }}
                onMouseEnter={() => setHoveredRole(i)}
                onMouseLeave={() => setHoveredRole(null)}
              >
                {/* Top bar */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${r.color}, transparent)` }} />
                {/* Number watermark */}
                <div style={{
                  position: 'absolute', bottom: -16, right: -8,
                  fontSize: 120, fontWeight: 900, fontFamily: FD,
                  color: 'transparent', WebkitTextStroke: `1px rgba(232,168,32,0.05)`,
                  lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
                }}>{r.num}</div>

                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.38em', textTransform: 'uppercase', color: r.color, fontFamily: FD, marginBottom: 20 }}>Role {r.num}</div>
                <div style={{ fontSize: 40, color: r.color, lineHeight: 1, marginBottom: 14 }}>{r.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: W, fontFamily: FD, lineHeight: 1.1, marginBottom: 6 }}>{r.role}</div>
                <div style={{ fontSize: 14, fontStyle: 'italic', color: r.color, fontFamily: FI, marginBottom: 20, fontWeight: 700 }}>{r.tagline}</div>
                <p style={{ fontSize: 13, color: W55, lineHeight: 1.75, fontFamily: FD, marginBottom: 24 }}>{r.desc}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: `1px solid ${BB}`, paddingTop: 20 }}>
                  {r.perks.map((p, pi) => (
                    <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: W55, fontFamily: FD }}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 40, display: 'flex', gap: 12 }}>
            <button onClick={() => navigate('/register')}
              style={{ fontFamily: FD, fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', background: GL, color: B, border: 'none', padding: '15px 40px', cursor: 'pointer', transition: 'all 0.3s' }}
              onMouseEnter={e => { e.currentTarget.style.background = G; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = GL; e.currentTarget.style.transform = 'translateY(0)' }}>
              Join as Promoter →
            </button>
            <button onClick={() => navigate('/jobs')}
              style={{ fontFamily: FD, fontSize: 10, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', background: 'transparent', color: GL, border: `1px solid rgba(232,168,32,0.35)`, padding: '15px 32px', cursor: 'pointer', transition: 'all 0.3s' }}
              onMouseEnter={e => { e.currentTarget.style.background = `rgba(232,168,32,0.06)`; e.currentTarget.style.borderColor = GL }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = `rgba(232,168,32,0.35)` }}>
              Browse Jobs
            </button>
          </div>
        </div>
      </section>

      {/* ── CAPABILITIES ── */}
      <section style={{ padding: '80px 80px 100px', background: D1, borderBottom: `1px solid ${BB}`, position: 'relative', overflow: 'hidden' }}>
        {/* Diagonal texture */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: `repeating-linear-gradient(-55deg, transparent, transparent 120px, rgba(232,168,32,0.015) 120px, rgba(232,168,32,0.015) 121px)`,
        }} />
        <div style={{ maxWidth: 1360, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 52, paddingBottom: 28, borderBottom: `1px solid ${BB}` }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.44em', textTransform: 'uppercase', color: GL, fontFamily: FD }}>Full Suite</span>
            <h2 style={{ fontFamily: FI, fontSize: 'clamp(28px,3.5vw,48px)', fontWeight: 900, fontStyle: 'italic' }}>
              Platform <span style={{ color: GL }}>Capabilities</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2 }}>
            {caps.map((cap, i) => (
              <div key={i}
                style={{
                  padding: '28px 30px',
                  background: hoveredCap === i ? `rgba(171,141,63,0.07)` : 'transparent',
                  border: `1px solid ${hoveredCap === i ? 'rgba(232,168,32,0.25)' : BB}`,
                  transition: 'all 0.25s',
                  cursor: 'default',
                  transform: hoveredCap === i ? 'translateX(4px)' : 'translateX(0)',
                  position: 'relative',
                }}
                onMouseEnter={() => setHoveredCap(i)}
                onMouseLeave={() => setHoveredCap(null)}
              >
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: hoveredCap === i ? 3 : 0,
                  background: GL, transition: 'width 0.2s',
                }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 16, color: hoveredCap === i ? GL : W28, transition: 'color 0.2s' }}>{cap.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: hoveredCap === i ? W : W85, fontFamily: FD, letterSpacing: '0.02em', transition: 'color 0.2s' }}>{cap.label}</span>
                </div>
                <p style={{ fontSize: 12, color: W55, lineHeight: 1.7, fontFamily: FD }}>{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MISSION ── */}
      <section style={{ padding: '100px 80px', background: B, borderBottom: `1px solid ${BB}` }}>
        <div style={{ maxWidth: 1360, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div style={{ width: 40, height: 1, background: GL }} />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.44em', textTransform: 'uppercase', color: GL, fontFamily: FD }}>Our Mission</span>
            </div>
            <h2 style={{ fontFamily: FI, fontSize: 'clamp(32px,4vw,58px)', fontWeight: 900, fontStyle: 'italic', lineHeight: 0.95, marginBottom: 32 }}>
              Empowering<br />
              <span style={{ color: 'transparent', WebkitTextStroke: `2px ${GL}` }}>SA Promoters.</span>
            </h2>
            <p style={{ fontSize: 15, color: W55, lineHeight: 1.9, fontFamily: FD, marginBottom: 20 }}>
              We built Honey Group to fix a broken industry. Promoters were underpaid, under-protected, and invisible. Brands had no reliable way to verify who showed up, or whether anyone showed up at all.
            </p>
            <p style={{ fontSize: 15, color: W55, lineHeight: 1.9, fontFamily: FD }}>
              Today we run the only platform in South Africa that combines geo-verified attendance, smart payroll, and full POPIA-compliant document management — giving promoters the protection they deserve, and brands the accountability they need.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              { icon: '◎', title: 'Fully Verified', desc: 'Every promoter goes through ID verification and bank detail confirmation before being approved.' },
              { icon: '⬡', title: 'GPS-First', desc: 'Geo check-in technology means no ghost shifts. Every hour worked is real and accounted for.' },
              { icon: '◈', title: 'Instant Payroll', desc: 'Hours × Rate calculated automatically. Admin approves, promoters get paid. No spreadsheets.' },
              { icon: '◆', title: 'POPIA Compliant', desc: 'All personal data is handled in full compliance with the Protection of Personal Information Act.' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', gap: 20, padding: '24px 28px',
                background: D2, border: `1px solid ${BB}`,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: `linear-gradient(to bottom, transparent, ${GL}, transparent)` }} />
                <div style={{ fontSize: 22, color: GL, flexShrink: 0, marginTop: 2 }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: W, fontFamily: FD, marginBottom: 6 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: W55, lineHeight: 1.65, fontFamily: FD }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section style={{ padding: '80px 80px', background: D1 }}>
        <div style={{ maxWidth: 1360, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40 }}>
          <div>
            <h2 style={{ fontFamily: FI, fontSize: 'clamp(28px,3.5vw,52px)', fontWeight: 900, fontStyle: 'italic', lineHeight: 0.95, marginBottom: 16 }}>
              Ready to join<br /><span style={{ color: GL }}>the platform?</span>
            </h2>
            <p style={{ fontSize: 14, color: W55, fontFamily: FD, lineHeight: 1.7, maxWidth: 420 }}>
              Register as a promoter today and get access to verified shifts across South Africa.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
            <button onClick={() => navigate('/register')}
              style={{ fontFamily: FD, fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', background: GL, color: B, border: 'none', padding: '16px 44px', cursor: 'pointer', transition: 'all 0.3s' }}
              onMouseEnter={e => { e.currentTarget.style.background = G; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = GL; e.currentTarget.style.transform = 'translateY(0)' }}>
              Register Now — Free
            </button>
            <button onClick={() => navigate('/jobs')}
              style={{ fontFamily: FD, fontSize: 10, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', background: 'transparent', color: GL, border: `1px solid rgba(232,168,32,0.35)`, padding: '16px 32px', cursor: 'pointer', transition: 'all 0.3s' }}
              onMouseEnter={e => { e.currentTarget.style.background = `rgba(232,168,32,0.06)`; e.currentTarget.style.borderColor = GL }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = `rgba(232,168,32,0.35)` }}>
              Browse Jobs
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}