import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { FloatingChat } from '../Admin/ChatSystem'

// ─── Strict Gold & Black Palette ──────────────────────────────────────────────
const BLK   = '#050402'
const BLK1  = '#0A0804'
const BLK2  = '#100C05'
const BLK3  = '#181206'
const BLK4  = '#201808'
const GOLD  = '#D4880A'
const GL    = '#E8A820'
const GL2   = '#F0C050'
const GD    = '#C07818'
const GD2   = '#8B5A1A'
const GD3   = '#6B3F10'
const BB    = 'rgba(212,136,10,0.16)'
const BB2   = 'rgba(212,136,10,0.08)'
const W     = '#FAF3E8'
const W7    = 'rgba(250,243,232,0.70)'
const W4    = 'rgba(250,243,232,0.40)'
const W2    = 'rgba(250,243,232,0.20)'
const FD    = "'Playfair Display', Georgia, serif"
const FB    = "'DM Sans', system-ui, sans-serif"

const NAV_ITEMS = [
  { path: '/business/dashboard', icon: '◈', label: 'Overview'  },
  { path: '/business/jobs',      icon: '◎', label: 'Jobs'      },
  { path: '/business/tracking',  icon: '⊙', label: 'Tracking'  },
  { path: '/business/payroll',   icon: '◆', label: 'Payroll'   },
]

function Section({ label, children }: { label: string; children: { label: string; value?: string | null }[] }) {
  const rows = children.filter(r => r.value)
  if (rows.length === 0) return null
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#E8A820', fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, marginBottom: 14 }}>{label}</div>
      {rows.map(r => (
        <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '11px 0', borderBottom: '1px solid rgba(212,136,10,0.16)' }}>
          <span style={{ fontSize: 12, color: 'rgba(250,243,232,0.40)', fontFamily: "'DM Sans', system-ui, sans-serif", flexShrink: 0, marginRight: 16 }}>{r.label}</span>
          <span style={{ fontSize: 12, color: '#FAF3E8', fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif", textAlign: 'right' }}>{r.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function BusinessLayout() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [session,      setSession]     = useState<Record<string,string> | null>(null)
  const [collapsed,    setCollapsed]   = useState(false)
  const [profileOpen,  setProfileOpen] = useState(false)
  const [profile,      setProfile]     = useState<any>(null)
  const [editMode,     setEditMode]    = useState(false)
  const [editForm,     setEditForm]    = useState<any>({})
  const [saving,       setSaving]      = useState(false)
  const [saveMsg,      setSaveMsg]     = useState('')
  const [docCipc,      setDocCipc]     = useState<File | null>(null)
  const [docTax,       setDocTax]      = useState<File | null>(null)
  const [docBank,      setDocBank]     = useState<File | null>(null)
  const [docUploading, setDocUploading]= useState(false)

  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  function authHdr() {
    const t = localStorage.getItem('hg_token')
    return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
  }

  useEffect(() => {
    const s = localStorage.getItem('hg_session')
    if (!s) { navigate('/login'); return }
    const parsed = JSON.parse(s)
    if (parsed.role !== 'business') { navigate('/login'); return }
    setSession(parsed)
    const token = localStorage.getItem('hg_token')
    if (token) {
      fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) { setProfile(data); setEditForm(data) } })
        .catch(() => {})
    }
  }, [navigate])

  const handleUploadDocuments = async () => {
    if (!docCipc && !docTax && !docBank) return
    setDocUploading(true)
    try {
      const token = localStorage.getItem('hg_token')
      const formData = new FormData()
      if (docCipc) formData.append('cipcDoc',      docCipc)
      if (docTax)  formData.append('taxPin',       docTax)
      if (docBank) formData.append('bizBankProof', docBank)
      const res = await fetch(`${API}/users/me/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        const urls = data.urls || {}
        setProfile((prev: any) => ({
          ...prev,
          ...(urls.cipcDocUrl      && { cipcDocUrl:      urls.cipcDocUrl }),
          ...(urls.taxPinUrl       && { taxPinUrl:       urls.taxPinUrl }),
          ...(urls.bizBankProofUrl && { bizBankProofUrl: urls.bizBankProofUrl }),
        }))
        setDocCipc(null); setDocTax(null); setDocBank(null)
        setSaveMsg('Documents uploaded successfully')
        fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : null)
          .then(fresh => { if (fresh) setProfile(fresh) })
          .catch(() => {})
        setTimeout(() => setSaveMsg(''), 4000)
      } else {
        const err = await res.json().catch(() => ({}))
        setSaveMsg(`Upload failed: ${err.error || res.status}`)
      }
    } catch (e) {
      setSaveMsg('Network error during upload')
    }
    setDocUploading(false)
  }

  const openProfile = () => { setProfileOpen(true); setEditMode(false); setSaveMsg('') }

  const handleSaveProfile = async () => {
    setSaving(true); setSaveMsg('')
    try {
      const token = localStorage.getItem('hg_token')
      const res = await fetch(`${API}/users/me/profile`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName:    editForm.fullName,
          phone:       editForm.phone,
          city:        editForm.city,
          address:     editForm.address,
          contactName: editForm.contactName,
          vatNumber:   editForm.vatNumber,
          industry:    editForm.industry,
          website:     editForm.website,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        setProfile({ ...profile, ...editForm, ...(updated.user || {}) })
        setSaveMsg('Profile updated successfully')
        setEditMode(false)
        setTimeout(() => setSaveMsg(''), 3000)
      } else {
        setSaveMsg('Failed to save — please try again')
      }
    } catch { setSaveMsg('Network error') }
    setSaving(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('hg_session')
    localStorage.removeItem('hg_token')
    navigate('/')
  }

  if (!session) return null

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: BLK, fontFamily: FB }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { -webkit-font-smoothing: antialiased; background: ${BLK}; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${BLK1}; }
        ::-webkit-scrollbar-thumb { background: linear-gradient(${GL}, ${GD}); border-radius: 2px; }
        @keyframes biz-fade { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .biz-page { animation: biz-fade 0.4s ease both; }
        select option { background: ${BLK2}; color: ${W}; }
        input::placeholder { color: rgba(212,136,10,0.25); }
      `}</style>

      {/* SIDEBAR */}
      <aside style={{ width: collapsed?58:216, flexShrink:0, background:`linear-gradient(180deg,${BLK1} 0%,${BLK} 100%)`, borderRight:`1px solid ${BB}`, display:'flex', flexDirection:'column', transition:'width 0.3s ease', position:'sticky', top:0, height:'100vh', overflow:'hidden', boxShadow:`4px 0 24px rgba(0,0,0,0.6)` }}>
        {/* Logo */}
        <div style={{ padding:collapsed?'24px 0':'24px 20px', borderBottom:`1px solid ${BB}`, display:'flex', alignItems:'center', justifyContent:collapsed?'center':'space-between' }}>
          {!collapsed && (
            <div style={{ fontFamily:FD, fontSize:16, fontWeight:700 }}>
              <span style={{ color:GL }}>HONEY</span>
              <span style={{ color:W }}> GROUP</span>
            </div>
          )}
          <button onClick={() => setCollapsed(c => !c)} style={{ background:'none', border:'none', cursor:'pointer', color:W4, fontSize:12, padding:4, transition:'color 0.2s' }}
            onMouseEnter={e=>(e.currentTarget.style.color=GL)} onMouseLeave={e=>(e.currentTarget.style.color=W4)}>
            {collapsed?'▶':'◀'}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'12px 0' }}>
          {NAV_ITEMS.map(item => {
            const active = location.pathname===item.path || location.pathname.startsWith(item.path+'/')
            return (
              <button key={item.path} onClick={() => navigate(item.path)} title={collapsed?item.label:undefined}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:collapsed?'12px 0':'11px 20px', justifyContent:collapsed?'center':'flex-start', background:active?BB2:'transparent', borderLeft:active?`3px solid ${GL}`:'3px solid transparent', border:'none', cursor:'pointer', transition:'all 0.2s', color:active?GL:W4 }}
                onMouseEnter={e=>{ if(!active){e.currentTarget.style.background=BB;e.currentTarget.style.color=W7} }}
                onMouseLeave={e=>{ if(!active){e.currentTarget.style.background='transparent';e.currentTarget.style.color=W4} }}>
                <span style={{ fontSize:14, flexShrink:0 }}>{item.icon}</span>
                {!collapsed && <span style={{ fontFamily:FD, fontSize:12, fontWeight:active?700:400, letterSpacing:'0.04em' }}>{item.label}</span>}
              </button>
            )
          })}
          <button onClick={() => navigate('/')} title={collapsed?'View Site':undefined}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:collapsed?'12px 0':'11px 20px', justifyContent:collapsed?'center':'flex-start', background:'transparent', borderLeft:'3px solid transparent', border:'none', cursor:'pointer', transition:'all 0.2s', color:W4, marginTop:8, borderTop:`1px solid ${BB}` }}
            onMouseEnter={e=>{e.currentTarget.style.background=BB;e.currentTarget.style.color=GL}}
            onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color=W4}}>
            <span style={{ fontSize:14, flexShrink:0 }}>⊹</span>
            {!collapsed && <span style={{ fontFamily:FD, fontSize:12, fontWeight:400 }}>View Site</span>}
          </button>
        </nav>

        {/* User + logout */}
        <div style={{ borderTop:`1px solid ${BB}`, padding:collapsed?'14px 0':'14px 18px' }}>
          {!collapsed && (
            <div style={{ marginBottom:10 }}>
              <button onClick={openProfile} style={{ background:'none', border:'none', cursor:'pointer', padding:0, textAlign:'left', width:'100%', transition:'opacity 0.2s' }}
                onMouseEnter={e=>e.currentTarget.style.opacity='0.75'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                <p style={{ fontFamily:FD, fontSize:11, fontWeight:700, color:W, marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {profile?.fullName || session.companyName || session.name || session.email}
                </p>
                <p style={{ fontFamily:FB, fontSize:10, color:GL }}>Business Account · View Profile →</p>
              </button>
            </div>
          )}
          <button onClick={handleLogout} title={collapsed?'Log Out':undefined}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:8, justifyContent:collapsed?'center':'flex-start', background:'none', border:'none', cursor:'pointer', fontFamily:FB, fontSize:11, color:W4, padding:collapsed?'6px 0':'6px 2px', transition:'color 0.2s' }}
            onMouseEnter={e=>(e.currentTarget.style.color=GL)} onMouseLeave={e=>(e.currentTarget.style.color=W4)}>
            <span style={{ fontSize:13 }}>⏻</span>
            {!collapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* PROFILE MODAL — unchanged from original */}
      {profileOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.90)', backdropFilter:'blur(14px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:24 }}
          onClick={e=>e.target===e.currentTarget&&setProfileOpen(false)}>
          <div style={{ background:'#0A0804', border:'1px solid rgba(212,136,10,0.16)', width:'100%', maxWidth:580, maxHeight:'92vh', overflowY:'auto', position:'relative', borderRadius:4 }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${GD3},${GL},${GD3})` }} />
            <button onClick={()=>setProfileOpen(false)} style={{ position:'absolute', top:14, right:18, background:'none', border:'none', cursor:'pointer', color:W4, fontSize:18 }}>✕</button>
            <div style={{ padding:'32px 32px 32px' }}>
              <div style={{ fontSize:9, letterSpacing:'0.32em', textTransform:'uppercase', color:GL, fontWeight:700, fontFamily:FD, marginBottom:6 }}>Business Account</div>
              <h2 style={{ fontFamily:FD, fontSize:22, fontWeight:700, color:W, marginBottom:4 }}>{profile?.fullName || session?.companyName || session?.name}</h2>
              <p style={{ fontSize:12, color:W4, fontFamily:FB, marginBottom:16 }}>{profile?.email || session?.email}</p>
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 14px', background:profile?.status==='approved'?'rgba(192,120,24,0.12)':'rgba(232,168,32,0.1)', border:`1px solid ${profile?.status==='approved'?'rgba(192,120,24,0.45)':'rgba(232,168,32,0.35)'}`, borderRadius:3, marginBottom:24 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:profile?.status==='approved'?GD:GL }} />
                <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:profile?.status==='approved'?GD:GL, fontFamily:FD }}>
                  {profile?.status==='approved'?'Approved':profile?.status==='pending_review'?'Pending Review':profile?.status||'Pending Review'}
                </span>
              </div>
              {saveMsg && (
                <div style={{ padding:'10px 14px', background:saveMsg.startsWith('✓')||!saveMsg.includes('fail')?'rgba(192,120,24,0.12)':'rgba(139,90,26,0.2)', border:`1px solid ${saveMsg.startsWith('✓')||!saveMsg.includes('fail')?'rgba(192,120,24,0.4)':'rgba(139,90,26,0.5)'}`, borderRadius:3, fontSize:12, color:saveMsg.includes('fail')||saveMsg.includes('error')?'#E8C090':GL, fontFamily:FD, marginBottom:20 }}>
                  {saveMsg}
                </div>
              )}
              {!editMode ? (
                <>
                  <Section label="Company Details">
                    {[
                      { label:'Company Name',    value:profile?.fullName },
                      { label:'Contact Person',  value:profile?.contactName },
                      { label:'Email',            value:profile?.email },
                      { label:'Phone',            value:profile?.phone },
                      { label:'City',             value:profile?.city },
                      { label:'Address / Reg No', value:profile?.address },
                      { label:'VAT Number',       value:profile?.vatNumber },
                      { label:'Industry',         value:profile?.industry },
                      { label:'Website',          value:profile?.website },
                    ]}
                  </Section>
                  <Section label="Account Information">
                    {[
                      { label:'Account Status',    value:profile?.status||'pending_review' },
                      { label:'Onboarding Status', value:profile?.onboardingStatus||'—' },
                      { label:'POPIA Consent',     value:profile?.consentPopia?'Yes — Consented':'No' },
                      { label:'Member Since',      value:profile?.createdAt?new Date(profile.createdAt).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'}):'—' },
                    ]}
                  </Section>
                  <div style={{ marginBottom:24 }}>
                    <div style={{ fontSize:9, letterSpacing:'0.24em', textTransform:'uppercase', color:GL, fontFamily:FD, fontWeight:700, marginBottom:14 }}>Documents</div>
                    {[
                      { label:'CIPC Registration',   url:profile?.cipcDocUrl },
                      { label:'Tax PIN / Clearance', url:profile?.taxPinUrl },
                      { label:'Bank Proof',          url:profile?.bizBankProofUrl },
                    ].map(doc=>(
                      <div key={doc.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 0', borderBottom:'1px solid rgba(212,136,10,0.16)' }}>
                        <span style={{ fontSize:12, color:W4, fontFamily:FB }}>{doc.label}</span>
                        {doc.url?(
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" download style={{ fontSize:11, color:GL, fontFamily:FD, fontWeight:700, textDecoration:'none', display:'flex', alignItems:'center', gap:5, padding:'4px 10px', background:'rgba(232,168,32,0.08)', border:'1px solid rgba(232,168,32,0.25)', borderRadius:2 }}>
                            Download
                          </a>
                        ):(
                          <span style={{ fontSize:11, color:W2, fontFamily:FB }}>Not uploaded</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={()=>{setEditForm({...profile});setEditMode(true)}}
                    style={{ width:'100%', padding:'13px', background:`linear-gradient(135deg,${GL},${GD})`, border:'none', color:BLK, fontFamily:FD, fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', cursor:'pointer', borderRadius:3 }}>
                    Edit Profile
                  </button>
                </>
              ) : (
                <>
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:9, letterSpacing:'0.24em', textTransform:'uppercase', color:GL, fontFamily:FD, fontWeight:700, marginBottom:16 }}>Edit Profile</div>
                    {[
                      {label:'Company Name',   key:'fullName',    placeholder:'Company name'},
                      {label:'Contact Person', key:'contactName', placeholder:'Full name of contact person'},
                      {label:'Phone',          key:'phone',       placeholder:'+27 11 000 0000'},
                      {label:'City',           key:'city',        placeholder:'Johannesburg'},
                      {label:'Address',        key:'address',     placeholder:'1 Business Park, Sandton'},
                      {label:'VAT Number',     key:'vatNumber',   placeholder:'4410000000 (optional)'},
                      {label:'Industry',       key:'industry',    placeholder:'FMCG / Beverages'},
                      {label:'Website',        key:'website',     placeholder:'company.co.za (optional)'},
                    ].map(f=>(
                      <div key={f.key} style={{ marginBottom:14 }}>
                        <label style={{ display:'block', fontSize:9, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', color:W4, marginBottom:7, fontFamily:FD }}>{f.label}</label>
                        <input type="text" value={editForm[f.key]||''} onChange={e=>setEditForm((p:any)=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder}
                          style={{ width:'100%', background:'rgba(212,136,10,0.04)', border:'1px solid rgba(212,136,10,0.16)', padding:'12px 14px', color:W, fontFamily:FB, fontSize:13, outline:'none', borderRadius:3 }}
                          onFocus={e=>e.currentTarget.style.borderColor=GL} onBlur={e=>e.currentTarget.style.borderColor='rgba(212,136,10,0.16)'} />
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom:24 }}>
                    <div style={{ fontSize:9, letterSpacing:'0.24em', textTransform:'uppercase', color:GL, fontFamily:FD, fontWeight:700, marginBottom:14 }}>Upload / Replace Documents</div>
                    {[
                      {label:'CIPC Registration Certificate',  key:'cipc', current:profile?.cipcDocUrl,      file:docCipc, setFile:setDocCipc},
                      {label:'Tax PIN / Clearance Certificate', key:'tax',  current:profile?.taxPinUrl,       file:docTax,  setFile:setDocTax},
                      {label:'Bank Confirmation Letter',        key:'bank', current:profile?.bizBankProofUrl, file:docBank, setFile:setDocBank},
                    ].map(d=>(
                      <div key={d.key} style={{ marginBottom:12 }}>
                        <label style={{ display:'block', fontSize:9, fontWeight:700, letterSpacing:'0.16em', textTransform:'uppercase', color:W4, marginBottom:7, fontFamily:FD }}>{d.label}</label>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <label style={{ flex:1, display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'rgba(212,136,10,0.04)', border:`1px dashed ${d.file?'rgba(232,168,32,0.6)':'rgba(212,136,10,0.25)'}`, borderRadius:3, cursor:'pointer' }}>
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display:'none' }} onChange={e=>{if(e.target.files?.[0])d.setFile(e.target.files[0])}} />
                            <span style={{ fontSize:16 }}>{d.file?'📄':'↑'}</span>
                            <span style={{ fontSize:12, color:d.file?GL:W4, fontFamily:FB }}>{d.file?d.file.name:d.current?'Replace document':'Upload document'}</span>
                          </label>
                          {d.current&&!d.file&&(
                            <a href={d.current} target="_blank" rel="noopener noreferrer" style={{ fontSize:10, color:GL, fontFamily:FD, fontWeight:700, textDecoration:'none', padding:'10px 12px', background:'rgba(232,168,32,0.08)', border:'1px solid rgba(232,168,32,0.25)', borderRadius:3, whiteSpace:'nowrap' }}>View</a>
                          )}
                        </div>
                      </div>
                    ))}
                    {(docCipc||docTax||docBank)&&(
                      <button onClick={handleUploadDocuments} disabled={docUploading}
                        style={{ width:'100%', marginTop:8, padding:'11px', background:docUploading?'rgba(255,255,255,0.05)':`linear-gradient(135deg,${GD},${GL})`, border:'none', color:docUploading?W4:BLK, fontFamily:FD, fontSize:10, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', cursor:docUploading?'wait':'pointer', borderRadius:3 }}>
                        {docUploading?'Uploading…':`Upload ${[docCipc,docTax,docBank].filter(Boolean).length} Document(s)`}
                      </button>
                    )}
                  </div>
                  <div style={{ display:'flex', gap:10 }}>
                    <button onClick={()=>setEditMode(false)} style={{ flex:1, padding:'12px', background:'transparent', border:'1px solid rgba(212,136,10,0.16)', color:W4, fontFamily:FD, fontSize:11, cursor:'pointer', borderRadius:3 }}>Cancel</button>
                    <button onClick={handleSaveProfile} disabled={saving}
                      style={{ flex:2, padding:'12px', background:saving?'rgba(255,255,255,0.05)':`linear-gradient(135deg,${GL},${GD})`, border:'none', color:saving?W4:BLK, fontFamily:FD, fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', cursor:saving?'wait':'pointer', borderRadius:3 }}>
                      {saving?'Saving…':'Save Profile Changes'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MAIN */}
      <main style={{ flex:1, overflow:'auto', minWidth:0, background:BLK }}>
        {/* Top bar */}
        <div style={{ position:'sticky', top:0, zIndex:100, background:`rgba(5,4,2,0.96)`, backdropFilter:'blur(20px)', borderBottom:`1px solid ${BB}`, padding:'0 36px', height:58, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:2, height:18, background:`linear-gradient(${GL},${GD})` }} />
            <p style={{ fontFamily:FD, fontSize:11, fontWeight:700, letterSpacing:'0.28em', textTransform:'uppercase', color:GL }}>
              {NAV_ITEMS.find(n=>location.pathname.startsWith(n.path))?.label||'Business Portal'}
            </p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <button onClick={()=>navigate('/')} style={{ background:'none', border:`1px solid ${BB}`, cursor:'pointer', fontFamily:FB, fontSize:10, fontWeight:600, letterSpacing:'0.16em', textTransform:'uppercase', color:W4, padding:'6px 14px', transition:'all 0.2s' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=GL;e.currentTarget.style.color=GL}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=BB;e.currentTarget.style.color=W4}}>
              View Site
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:GL, boxShadow:`0 0 6px ${GL}` }} />
              <span style={{ fontFamily:FB, fontSize:10, color:W4 }}>Active</span>
            </div>
          </div>
        </div>

        <div style={{ padding:'32px 36px' }}>
          <Outlet />
        </div>
      </main>

      {/* ✅ Floating chat bubble — connects to admin via API */}
      <FloatingChat />
    </div>
  )
}