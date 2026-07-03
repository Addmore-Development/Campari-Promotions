import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import { FloatingChat } from '../Admin/ChatSystem'

const BLK   = '#020201'
const BLK1  = '#030302'
const GL    = '#C9BFA6'
const GD    = '#7A756A'
const GD2   = '#8A8474'
const BB    = 'rgba(170,160,135,0.14)'
const W     = '#F8F8F8'
const WM    = 'rgba(248,248,248,0.65)'
const WD    = 'rgba(248,248,248,0.28)'
const FD    = "'Playfair Display', Georgia, serif"
const FB    = "'DM Sans', system-ui, sans-serif"

const NAV_ITEMS = [
  { path: 'dashboard',          icon: '◈', label: 'Dashboard'   },
  { path: 'activations',        icon: '◎', label: 'Activations' },
  { path: 'activation-report',  icon: '▤', label: 'File Report' },
  { path: 'profile',            icon: '⬡', label: 'My Profile'  },
]

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
function authHdr() {
  const t = localStorage.getItem('hg_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export const SupervisorLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'dashboard'
  const [collapsed, setCollapsed] = useState(false)
  const [profile,   setProfile]   = useState<any>(null)

  useEffect(() => {
    if (!document.getElementById('hg-supervisor-styles')) {
      const el = document.createElement('style')
      el.id = 'hg-supervisor-styles'
      el.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: linear-gradient(${GL}, ${GD}); border-radius: 2px; }
      `
      document.head.appendChild(el)
    }

    fetch(`${API}/auth/me`, { headers: authHdr() as any })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setProfile(data) })
      .catch(() => {})
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('hg_session')
    localStorage.removeItem('hg_token')
    navigate('/')
  }

  const displayName = profile?.fullName || 'Supervisor'
  const firstName    = displayName.split(' ')[0]

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:BLK, fontFamily:FB }}>
      {/* SIDEBAR */}
      <aside style={{ width:collapsed?58:220, flexShrink:0, background:`linear-gradient(180deg,${BLK1} 0%,${BLK} 100%)`, borderRight:`1px solid ${BB}`, display:'flex', flexDirection:'column', transition:'width 0.3s ease', position:'sticky', top:0, height:'100vh', overflow:'hidden', boxShadow:'4px 0 24px rgba(0,0,0,0.6)' }}>
        {/* Logo */}
        <div style={{ padding:collapsed?'24px 0':'24px 20px', borderBottom:`1px solid ${BB}`, display:'flex', alignItems:'center', justifyContent:collapsed?'center':'space-between' }}>
          {!collapsed && (
            <div style={{ fontFamily:FD, fontSize:16, fontWeight:700 }}>
              <span style={{ color:GL }}>HONEY</span>
              <span style={{ color:W }}> GROUP</span>
            </div>
          )}
          <button onClick={()=>setCollapsed(c=>!c)} style={{ background:'none', border:'none', cursor:'pointer', color:WD, fontSize:12, padding:4, transition:'color 0.2s' }}
            onMouseEnter={e=>(e.currentTarget.style.color=GL)} onMouseLeave={e=>(e.currentTarget.style.color=WD)}>
            {collapsed?'▶':'◀'}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'12px 0' }}>
          {NAV_ITEMS.map(item => {
            const active = activeTab===item.path
            return (
              <button key={item.path} onClick={()=>navigate(`/supervisor/?tab=${item.path}`)} title={collapsed?item.label:undefined}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:collapsed?'12px 0':'11px 20px', justifyContent:collapsed?'center':'flex-start', background:active?'rgba(201,191,166,0.08)':'transparent', borderLeft:active?`3px solid ${GL}`:'3px solid transparent', border:'none', cursor:'pointer', transition:'all 0.2s', color:active?GL:WM, position:'relative' }}
                onMouseEnter={e=>{ if(!active){e.currentTarget.style.background='rgba(170,160,135,0.06)';e.currentTarget.style.color=W} }}
                onMouseLeave={e=>{ if(!active){e.currentTarget.style.background='transparent';e.currentTarget.style.color=WM} }}>
                <span style={{ fontSize:14, flexShrink:0 }}>{item.icon}</span>
                {!collapsed&&<span style={{ fontFamily:FD, fontSize:12, fontWeight:active?700:400, letterSpacing:'0.04em' }}>{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* User + logout */}
        <div style={{ borderTop:`1px solid ${BB}`, padding:collapsed?'14px 0':'14px 18px' }}>
          {!collapsed&&profile&&(
            <div style={{ marginBottom:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <div style={{ width:34, height:34, borderRadius:'50%', overflow:'hidden', flexShrink:0, background:`linear-gradient(135deg,${GD2},${GL})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:BLK, border:`1px solid ${BB}` }}>
                  {firstName.charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth:0 }}>
                  <p style={{ fontFamily:FD, fontSize:11, fontWeight:700, color:W, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{displayName}</p>
                  <p style={{ fontFamily:FB, fontSize:10, color:GL, margin:0 }}>Supervisor</p>
                </div>
              </div>
            </div>
          )}
          <button onClick={handleLogout} title={collapsed?'Log Out':undefined}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:8, justifyContent:collapsed?'center':'flex-start', background:'none', border:'none', cursor:'pointer', fontFamily:FB, fontSize:11, color:WD, padding:collapsed?'6px 0':'6px 2px', transition:'color 0.2s' }}
            onMouseEnter={e=>(e.currentTarget.style.color=GL)} onMouseLeave={e=>(e.currentTarget.style.color=WD)}>
            <span style={{ fontSize:13 }}>⏻</span>
            {!collapsed&&<span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex:1, overflow:'auto', minWidth:0, background:BLK }}>
        {/* Top bar */}
        <div style={{ position:'sticky', top:0, zIndex:100, background:'rgba(2,2,2,0.96)', backdropFilter:'blur(20px)', borderBottom:`1px solid ${BB}`, padding:'0 36px', height:58, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:2, height:18, background:`linear-gradient(${GL},${GD})` }} />
            <p style={{ fontFamily:FD, fontSize:11, fontWeight:700, letterSpacing:'0.28em', textTransform:'uppercase', color:GL }}>
              {NAV_ITEMS.find(n=>n.path===activeTab)?.label||'Supervisor Portal'}
            </p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:GL }} />
            <span style={{ fontFamily:FB, fontSize:10, color:WD }}>Online</span>
          </div>
        </div>

        {children}
      </main>

      {/* Floating chat bubble — connects to admin, promoters, and clients on supervised jobs */}
      <FloatingChat />
    </div>
  )
}