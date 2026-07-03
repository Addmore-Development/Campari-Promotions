import { useState, useEffect } from 'react'
import { AdminLayout } from '../AdminLayout'
// adminMobileStyles not used

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
const BB  = 'rgba(170,160,135,0.16)'
const BB2 = 'rgba(170,160,135,0.06)'
const W   = '#F0F0F0'
const W85 = 'rgba(204,204,204,0.95)'
const W55 = 'rgba(214,214,214,0.90)'
const W35 = 'rgba(189,189,189,0.55)'
const W28 = 'rgba(187,187,187,0.80)'
const FD  = "'Playfair Display', Georgia, serif"
const MONO = "'DM Mono', 'Courier New', monospace"

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function hex2rgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// broadcastUserUpdate removed — status changes go directly through the API

type Role   = 'promoter' | 'client' | 'admin' | 'supervisor'
type Status = 'active' | 'inactive' | 'suspended' | 'pending'

interface User {
  id: string; name: string; email: string; phone: string
  role: Role; status: Status; city: string; joined: string
  jobs: number; payouts: number; source?: 'mock' | 'api' | 'local'
}

const MOCK_USERS: User[] = [
  { id:'U001', name:'Ayanda Dlamini',  email:'ayanda@email.com',  phone:'+27 71 234 5678', role:'promoter', status:'active',    city:'Johannesburg', joined:'2025-11-12', jobs:24, payouts:28800, source:'mock' },
  { id:'U002', name:'Thabo Nkosi',     email:'thabo@email.com',   phone:'+27 82 345 6789', role:'promoter', status:'active',    city:'Johannesburg', joined:'2025-10-04', jobs:18, payouts:21600, source:'mock' },
  { id:'U003', name:'Lerato Mokoena',  email:'lerato@email.com',  phone:'+27 63 456 7890', role:'client',   status:'active',    city:'Cape Town',    joined:'2025-09-20', jobs:42, payouts:0,     source:'mock' },
  { id:'U004', name:'Sipho Mhlongo',   email:'sipho@email.com',   phone:'+27 74 567 8901', role:'promoter', status:'suspended', city:'Durban',       joined:'2026-01-08', jobs:3,  payouts:2700,  source:'mock' },
  { id:'U005', name:'Nomsa Zulu',      email:'nomsa@email.com',   phone:'+27 83 678 9012', role:'promoter', status:'active',    city:'Pretoria',     joined:'2025-12-01', jobs:9,  payouts:10350, source:'mock' },
  { id:'U006', name:'Bongani Khumalo', email:'bongani@email.com', phone:'+27 61 789 0123', role:'promoter', status:'inactive',  city:'Durban',       joined:'2025-08-15', jobs:31, payouts:37200, source:'mock' },
  { id:'U007', name:'Zanele Motha',    email:'zanele@email.com',  phone:'+27 79 890 1234', role:'promoter', status:'active',    city:'Johannesburg', joined:'2026-02-10', jobs:6,  payouts:8100,  source:'mock' },
  { id:'U008', name:'Musa Dube',       email:'musa@email.com',    phone:'+27 72 901 2345', role:'client',   status:'active',    city:'Cape Town',    joined:'2025-07-22', jobs:55, payouts:0,     source:'mock' },
]

function mapApiUser(u: any, source: 'api' | 'local'): User {
  const roleRaw = (u.role || '').toUpperCase()
  const role: Role =
    roleRaw === 'BUSINESS'   ? 'client'     :
    roleRaw === 'ADMIN'      ? 'admin'      :
    roleRaw === 'SUPERVISOR' ? 'supervisor' : 'promoter'
  const statusRaw = (u.status || '').toLowerCase()
  const status: Status =
    statusRaw === 'approved'       ? 'active'    :
    statusRaw === 'rejected'       ? 'inactive'  :
    statusRaw === 'pending_review' ? 'pending'   :
    statusRaw === 'suspended'      ? 'suspended' :
    statusRaw === 'active'         ? 'active'    :
    statusRaw === 'inactive'       ? 'inactive'  : 'pending'
  return {
    id: u.id, name: u.fullName || u.companyName || u.name || 'Unknown',
    email: u.email || '', phone: u.phone || 'Not provided', role, status,
    city: u.city || 'Not specified',
    joined: u.createdAt ? String(u.createdAt).slice(0, 10) : new Date().toISOString().slice(0, 10),
    jobs: 0, payouts: 0, source,
  }
}

const ROLE_COLOR: Record<Role, string> = { promoter: GL, client: G3, admin: G4, supervisor: '#B08B5A' }
const STATUS_CLR: Record<Status, string>    = { active: G3, inactive: '#CBCBCB', suspended: G4, pending: GL }
const STATUS_BG:  Record<Status, string>    = { active: hex2rgba(G3,0.12), inactive: hex2rgba('#463F35',0.35), suspended: hex2rgba(G4,0.10), pending: hex2rgba(GL,0.10) }
const STATUS_BORDER: Record<Status, string> = { active: hex2rgba(G3,0.45), inactive: hex2rgba('#666052',0.60), suspended: hex2rgba(G4,0.42), pending: hex2rgba(GL,0.42) }

const EMPTY: Omit<User, 'id' | 'jobs' | 'payouts' | 'source'> = {
  name: '', email: '', phone: '', role: 'promoter', status: 'active', city: '', joined: '',
}

function Badge({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) {
  return (
    <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', fontFamily:FD, color, background:bg, border:`1px solid ${border}`, padding:'3px 10px', borderRadius:3 }}>
      {label}
    </span>
  )
}

function FilterBtn({ label, active, color, onClick }: { label: string; active: boolean; color: string; onClick: () => void }) {
  const safeColor = color.startsWith('#') ? color : GL
  return (
    <button onClick={onClick} style={{ padding:'7px 14px', border:`1px solid ${active ? safeColor : 'rgba(170,160,135,0.22)'}`, cursor:'pointer', fontFamily:FD, fontSize:10, fontWeight:active?700:400, textTransform:'capitalize' as const, borderRadius:3, background:active?hex2rgba(safeColor,0.18):'transparent', color:active?safeColor:W55, transition:'all 0.18s' }}>
      {label}
    </button>
  )
}

function Btn({ children, onClick, outline = false, color = GL }: any) {
  return (
    <button onClick={onClick} style={{ padding:'11px 24px', background:outline?'transparent':`linear-gradient(135deg,${color},${hex2rgba(color,0.8)})`, border:`1px solid ${color}`, color:outline?color:B, fontFamily:FD, fontSize:11, fontWeight:700, letterSpacing:'0.08em', cursor:'pointer', textTransform:'uppercase' as const, transition:'all 0.2s', borderRadius:3, boxShadow:outline?'none':`0 2px 12px ${hex2rgba(color,0.35)}` }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '0.82'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
    >{children}</button>
  )
}

const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

export default function FullCRUDUsers() {
  const [users,    setUsers   ] = useState<User[]>(MOCK_USERS)
  const [loading,  setLoading ] = useState(false)
  const [syncing,  setSyncing ] = useState(false)
  const [modal,    setModal   ] = useState<'create' | 'edit' | 'view' | null>(null)
  const [editing,  setEditing ] = useState<User | null>(null)
  const [form,     setForm    ] = useState<Omit<User, 'id' | 'jobs' | 'payouts' | 'source'>>(EMPTY)
  const [search,   setSearch  ] = useState('')
  const [roleF,    setRoleF   ] = useState<Role | 'all'>('all')
  const [statusF,  setStatusF ] = useState<Status | 'all'>('all')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [createPassword, setCreatePassword] = useState('')
  const [createdCreds,   setCreatedCreds]   = useState<{ email: string; password: string } | null>(null)

  // mobile styles removed — using inline styles throughout

  const mergeUsers = (incoming: User[]) => {
    setUsers(prev => {
      const incomingEmails = new Set(incoming.map(u => u.email.toLowerCase()))
      const mockOnly = prev.filter(u => u.source === 'mock' && !incomingEmails.has(u.email.toLowerCase()))
      return [...incoming, ...mockOnly]
    })
  }

  useEffect(() => {
    const token = localStorage.getItem('hg_token')
    if (!token) return
    setSyncing(true)
    // Fetch all users directly from PostgreSQL via the API
    fetch(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } })
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        const apiUsers = data
          .filter((u: any) => (u.role || '').toUpperCase() !== 'ADMIN')
          .map((u: any) => mapApiUser(u, 'api'))
        mergeUsers(apiUsers)
      })
      .catch(() => {})
      .finally(() => setSyncing(false))
  }, [])

  const openCreate = () => { setForm(EMPTY); setEditing(null); setCreatePassword(''); setModal('create') }
  const openEdit   = (u: User) => { setForm({ name:u.name, email:u.email, phone:u.phone, role:u.role, status:u.status, city:u.city, joined:u.joined }); setEditing(u); setModal('edit') }
  const openView   = (u: User) => { setEditing(u); setModal('view') }
  const closeModal = () => { setModal(null); setEditing(null) }

  const save = async () => {
    if (modal === 'create') {
      const newUser: User = { ...form, id:`U${Date.now()}`, jobs:0, payouts:0, source:'mock' }
      setUsers(prev => [newUser, ...prev])
      const token = localStorage.getItem('hg_token')
      if (token) {
        try {
          const res = await fetch(`${API_URL}/users`, {
            method:  'POST',
            headers: { Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
            body: JSON.stringify({
              fullName: form.name, email: form.email, phone: form.phone, city: form.city,
              role: form.role.toUpperCase(), password: createPassword || undefined,
            }),
          })
          if (res.ok) {
            const created = await res.json()
            if (created.temporaryPassword) {
              setCreatedCreds({ email: created.email, password: created.temporaryPassword })
            }
          }
        } catch { /* non-fatal — the optimistic row above still shows */ }
      }
    } else if (editing) {
      setUsers(prev => prev.map(u => u.id === editing.id ? { ...u, ...form } : u))
      const token = localStorage.getItem('hg_token')
      if (token && editing.source === 'api') fetch(`${API_URL}/users/${editing.id}`, { method:'PUT', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' }, body:JSON.stringify({ fullName:form.name, phone:form.phone, city:form.city, status:form.status }) }).catch(()=>{})

    }
    closeModal()
  }

  const deleteUser = async (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id))
    setDeleting(null)
    if (modal) closeModal()
    const token = localStorage.getItem('hg_token')
    const user  = users.find(u => u.id === id)
    if (token && user?.source === 'api') fetch(`${API_URL}/users/${id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` } }).catch(()=>{})
  }

  const updateUserStatus = async (id: string, status: Status) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status } : u))
    const token = localStorage.getItem('hg_token')
    const apiDecision = status === 'active' ? 'approved' : 'rejected'
    if (token) fetch(`${API_URL}/admin/users/${id}/approve`, { method:'PUT', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' }, body:JSON.stringify({ decision: apiDecision }) }).catch(()=>{})
  }

  const F = (key: keyof typeof form, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  const filtered = users.filter(u => {
    const roleMatch   = roleF   === 'all' || u.role   === roleF
    const statusMatch = statusF === 'all' || u.status === statusF
    const searchMatch = search  === '' || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || (u.city || '').toLowerCase().includes(search.toLowerCase())
    return roleMatch && statusMatch && searchMatch
  })

  const counts = {
    all: users.length, promoter: users.filter(u=>u.role==='promoter').length,
    client: users.filter(u=>u.role==='client').length, pending: users.filter(u=>u.status==='pending').length,
    active: users.filter(u=>u.status==='active').length, api: users.filter(u=>u.source==='api').length,
    local: users.filter(u=>u.source==='local').length, supervisor: users.filter(u=>u.role==='supervisor').length,
  }

  const inputStyle: React.CSSProperties = { width:'100%', background:BB2, border:`1px solid ${BB}`, padding:'12px 16px', fontFamily:FD, fontSize:13, color:W, outline:'none', borderRadius:3 }
  const labelStyle: React.CSSProperties = { fontSize:9, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', color:W55, display:'block', marginBottom:7, fontFamily:FD }

  return (
    <AdminLayout>
      <div style={{ padding:'32px 36px', minWidth:0, boxSizing:'border-box' as const }}>

        {/* ── HEADER ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:24 }}>
          <div>
            <div style={{ fontSize:9, letterSpacing:'0.38em', textTransform:'uppercase', color:GL, marginBottom:8, fontWeight:700, fontFamily:FD }}>People · Users</div>
            <h1 style={{ fontFamily:FD, fontSize:28, fontWeight:700, color:W }}>Manage Users</h1>
            <p style={{ fontSize:13, color:W55, marginTop:6, fontFamily:FD }}>
              <strong style={{ color:W85 }}>{users.length}</strong> users ·{' '}
              <span style={{ color:GL }}>{counts.promoter} promoters</span> ·{' '}
              <span style={{ color:G3 }}>{counts.client} clients</span> ·{' '}
              <span style={{ color:G4 }}>{counts.pending} pending</span>
              {syncing && <span style={{ color:W35, marginLeft:12, fontSize:11 }}>↻ syncing…</span>}
              {counts.api > 0 && <span style={{ color:W35, marginLeft:12, fontSize:11 }}>● {counts.api} live</span>}
            </p>
          </div>
          <Btn onClick={openCreate}>+ Add User</Btn>
        </div>

        {/* ── STATS ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:1, background:BB, marginBottom:24 }}>
          {[
            { label:'Total Users',    value:counts.all,      color:GL },
            { label:'Promoters',      value:counts.promoter, color:GL },
            { label:'Clients',        value:counts.client,   color:G3 },
            { label:'Pending Review', value:counts.pending,  color:G4 },
            { label:'Active',         value:counts.active,   color:G3 },
          ].map((s, i) => (
            <div key={i} style={{ background:'rgba(9,9,7,0.6)', padding:'16px 18px', position:'relative' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${s.color},${hex2rgba(s.color,0.3)})` }} />
              <div style={{ fontFamily:FD, fontSize:26, fontWeight:700, color:W, lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:9, color:W55, marginTop:5, letterSpacing:'0.18em', textTransform:'uppercase', fontFamily:FD }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── FILTERS ── */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:20 }}>
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:W35, fontSize:12, pointerEvents:'none' }}>⌕</span>
            <input placeholder="Search name, email or city…" value={search} onChange={e=>setSearch(e.target.value)}
              style={{ background:D2, border:`1px solid ${BB}`, padding:'8px 14px 8px 30px', color:W, fontFamily:FD, fontSize:12, outline:'none', width:220, borderRadius:3 }}
              onFocus={e=>e.currentTarget.style.borderColor=GL} onBlur={e=>e.currentTarget.style.borderColor=BB} />
          </div>
          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
            {(['all','promoter','client','supervisor','admin'] as const).map(r => (
              <FilterBtn key={r} label={r==='all'?`All (${counts.all})`:r} active={roleF===r} color={r==='all'?GL:ROLE_COLOR[r]} onClick={()=>setRoleF(r)} />
            ))}
          </div>
          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
            {(['all','active','pending','inactive','suspended'] as const).map(s => (
              <FilterBtn key={s} label={s==='all'?'All Status':s} active={statusF===s} color={s==='all'?GL:STATUS_CLR[s]} onClick={()=>setStatusF(s)} />
            ))}
          </div>
        </div>

        {/* ── TABLE ── */}
        <div style={{ background:D2, border:`1px solid ${BB}`, borderRadius:4, overflowX:'auto', width:'100%' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:860 }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${BB}`, background:D1 }}>
                {[
                  { label:'User',    w:190 },
                  { label:'Role',    w:85  },
                  { label:'City',    w:105 },
                  { label:'Joined',  w:85  },
                  { label:'Jobs',    w:55  },
                  { label:'Payout',  w:100 },
                  { label:'Status',  w:85  },
                  { label:'Source',  w:75  },
                  { label:'Actions', w:160 },
                ].map(h => (
                  <th key={h.label} style={{ padding:'11px 14px', textAlign:'left', fontSize:9, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', color:W55, fontFamily:FD, width:h.w, whiteSpace:'nowrap' as const }}>{h.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id}
                  style={{ borderBottom:i<filtered.length-1?`1px solid ${BB}`:'none', transition:'background 0.15s', cursor:'pointer' }}
                  onMouseEnter={e=>e.currentTarget.style.background=BB2}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                  onClick={() => openView(u)}>

                  <td data-label="User" style={{ padding:'11px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:36, height:36, borderRadius:'50%', flexShrink:0, background:`linear-gradient(145deg,${G5}CC,${hex2rgba(ROLE_COLOR[u.role],0.28)})`, border:`1px solid ${hex2rgba(ROLE_COLOR[u.role],0.35)}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:ROLE_COLOR[u.role], fontWeight:700, fontFamily:FD }}>
                        {initials(u.name)}
                      </div>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:W85, fontFamily:FD, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:140 }}>{u.name}</div>
                          {u.status === 'pending' && <div style={{ width:6, height:6, borderRadius:'50%', background:GL, flexShrink:0 }} />}
                        </div>
                        <div style={{ fontSize:11, color:W55, fontFamily:FD, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:140 }}>{u.email}</div>
                      </div>
                    </div>
                  </td>

                  <td data-label="Role" style={{ padding:'11px 14px' }}>
                    <Badge label={u.role} color={ROLE_COLOR[u.role]} bg={hex2rgba(ROLE_COLOR[u.role],0.12)} border={hex2rgba(ROLE_COLOR[u.role],0.4)} />
                  </td>

                  <td style={{ padding:'11px 14px', fontSize:12, color:W55, fontFamily:FD, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.city}</td>

                  <td style={{ padding:'11px 14px', fontSize:12, color:W55, fontFamily:FD, whiteSpace:'nowrap' }}>
                    {u.joined ? new Date(u.joined).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'2-digit'}) : '—'}
                  </td>

                  <td style={{ padding:'11px 14px', fontSize:13, color:W85, fontWeight:700, fontFamily:FD, textAlign:'center' }}>{u.jobs}</td>

                  <td style={{ padding:'11px 14px', fontSize:13, fontWeight:700, fontFamily:FD, color:u.role==='promoter'?GL:W55 }}>
                    {u.role === 'promoter' ? `R${u.payouts.toLocaleString('en-ZA')}` : '—'}
                  </td>

                  <td style={{ padding:'11px 14px' }}>
                    <Badge label={u.status} color={STATUS_CLR[u.status]} bg={STATUS_BG[u.status]} border={STATUS_BORDER[u.status]} />
                  </td>

                  <td style={{ padding:'11px 14px' }}>
                    <span style={{ fontSize:9, fontWeight:700, fontFamily:FD, color:u.source==='api'?GL:u.source==='local'?G4:W55 }}>
                      {u.source==='api'?'● Live':u.source==='local'?'◎ Local':'○ Demo'}
                    </span>
                  </td>

                  <td style={{ padding:'10px 14px', verticalAlign:'middle' }} onClick={e=>e.stopPropagation()}>
                    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      <div style={{ display:'flex', gap:4 }}>
                        <button onClick={()=>openEdit(u)}
                          style={{ padding:'4px 10px', fontSize:10, fontWeight:700, color:GL, background:hex2rgba(GL,0.10), border:`1px solid ${hex2rgba(GL,0.35)}`, borderRadius:3, cursor:'pointer', fontFamily:FD, whiteSpace:'nowrap' }}
                          onMouseEnter={e=>{e.currentTarget.style.background=hex2rgba(GL,0.20);e.currentTarget.style.borderColor=GL}}
                          onMouseLeave={e=>{e.currentTarget.style.background=hex2rgba(GL,0.10);e.currentTarget.style.borderColor=hex2rgba(GL,0.35)}}>
                          ✎ Edit
                        </button>
                        <button onClick={()=>setDeleting(u.id)}
                          style={{ padding:'4px 8px', fontSize:10, fontWeight:600, color:'rgba(195,195,195,0.85)', background:'rgba(112,106,90,0.12)', border:'1px solid rgba(112,106,90,0.40)', borderRadius:3, cursor:'pointer', fontFamily:FD }}
                          onMouseEnter={e=>{e.currentTarget.style.background='rgba(112,106,90,0.25)'}}
                          onMouseLeave={e=>{e.currentTarget.style.background='rgba(112,106,90,0.12)'}}>
                          🗑
                        </button>
                      </div>
                      {u.status === 'pending' && (
                        <div style={{ display:'flex', gap:4 }}>
                          <button onClick={()=>updateUserStatus(u.id,'active')}
                            style={{ padding:'4px 8px', fontSize:9, fontWeight:700, color:B, background:`linear-gradient(135deg,${G3},${hex2rgba(G3,0.8)})`, border:`1px solid ${G3}`, borderRadius:3, cursor:'pointer', fontFamily:FD, whiteSpace:'nowrap' }}>
                            Approve
                          </button>
                          <button onClick={()=>updateUserStatus(u.id,'inactive')}
                            style={{ padding:'4px 8px', fontSize:9, fontWeight:700, color:'#CBCBCB', background:hex2rgba(G2,0.20), border:`1px solid ${hex2rgba(G2,0.55)}`, borderRadius:3, cursor:'pointer', fontFamily:FD, whiteSpace:'nowrap' }}>
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding:48, textAlign:'center', color:W35, fontSize:13, fontFamily:FD }}>
              {users.length === 0 ? 'No users found.' : 'No users match your filters.'}
            </div>
          )}
        </div>

        <div style={{ marginTop:10, fontSize:11, color:W35, fontFamily:FD }}>
          Showing <strong style={{ color:W55 }}>{filtered.length}</strong> of <strong style={{ color:W55 }}>{users.length}</strong> users
        </div>

        {/* ── DELETE CONFIRM ── */}
        {deleting && (
          <div className="hg-modal-overlay" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300, padding:24 }}
            onClick={e=>e.target===e.currentTarget&&setDeleting(null)}>
            <div className="hg-modal-box" style={{ background:D2, border:`1px solid ${hex2rgba(G2,0.7)}`, padding:'36px 40px', maxWidth:380, width:'100%', position:'relative', borderRadius:4 }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:G2, borderRadius:'4px 4px 0 0' }} />
              <h3 style={{ fontFamily:FD, fontSize:22, color:W, marginBottom:12 }}>Delete User?</h3>
              <p style={{ fontSize:13, color:W55, marginBottom:28, lineHeight:1.7, fontFamily:FD }}>
                Permanently remove <strong style={{ color:W85 }}>{users.find(u=>u.id===deleting)?.name}</strong> from the platform.
              </p>
              <div style={{ display:'flex', gap:12 }}>
                <button onClick={()=>setDeleting(null)} style={{ flex:1, padding:'12px', background:'transparent', border:`1px solid ${BB}`, color:W55, fontFamily:FD, fontSize:12, cursor:'pointer', borderRadius:3 }}>Cancel</button>
                <button onClick={()=>deleteUser(deleting)} style={{ flex:1, padding:'12px', background:hex2rgba(G2,0.25), border:`1px solid ${G2}`, color:'#CBCBCB', fontFamily:FD, fontSize:12, fontWeight:700, cursor:'pointer', borderRadius:3 }}>Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* ── CREATE / EDIT MODAL ── */}
        {(modal==='create'||modal==='edit') && (
          <div className="hg-modal-overlay" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300, padding:24 }}
            onClick={e=>e.target===e.currentTarget&&closeModal()}>
            <div className="hg-modal-box" style={{ background:D2, border:`1px solid ${BB}`, width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto', position:'relative', borderRadius:4 }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${GL},${G5})`, borderRadius:'4px 4px 0 0' }} />
              <div className="hg-modal-inner" style={{ padding:'40px' }}>
                <button onClick={closeModal} style={{ position:'absolute', top:16, right:20, background:'none', border:'none', cursor:'pointer', color:W35, fontSize:18 }}>✕</button>
                <div style={{ fontSize:9, letterSpacing:'0.3em', textTransform:'uppercase', color:GL, marginBottom:8, fontWeight:700, fontFamily:FD }}>{modal==='create'?'New User':'Edit User'}</div>
                <h2 style={{ fontFamily:FD, fontSize:24, fontWeight:700, color:W, marginBottom:28 }}>{modal==='create'?'Add a New User':`Editing ${editing?.name}`}</h2>
                <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
                  {[
                    { label:'Full Name', key:'name',  placeholder:'Ayanda Dlamini'   },
                    { label:'Email',     key:'email', placeholder:'ayanda@email.com' },
                    { label:'Phone',     key:'phone', placeholder:'+27 71 000 0000'  },
                    { label:'City',      key:'city',  placeholder:'Johannesburg'     },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key}>
                      <label style={labelStyle}>{label}</label>
                      <input type="text" placeholder={placeholder} value={(form as any)[key]} onChange={e=>F(key as any, e.target.value)}
                        style={inputStyle}
                        onFocus={e=>e.currentTarget.style.borderColor=GL} onBlur={e=>e.currentTarget.style.borderColor=BB} />
                    </div>
                  ))}
                  {modal === 'create' && (
                    <div>
                      <label style={labelStyle}>Password (optional)</label>
                      <input type="text" placeholder="Leave blank to auto-generate" value={createPassword} onChange={e=>setCreatePassword(e.target.value)}
                        style={inputStyle}
                        onFocus={e=>e.currentTarget.style.borderColor=GL} onBlur={e=>e.currentTarget.style.borderColor=BB} />
                      <p style={{ fontSize:10.5, color:W35, fontFamily:FD, marginTop:6 }}>If left blank, a temporary password is generated and shown to you once — pass it on to the new user.</p>
                    </div>
                  )}
                  <div className="hg-form-grid-2" style={{ gap:16 }}>
                    <div>
                      <label style={labelStyle}>Role</label>
                      <select value={form.role} onChange={e=>F('role',e.target.value)} style={{ ...inputStyle, background:D3, cursor:'pointer' }}>
                        <option value="promoter">Promoter</option>
                        <option value="client">Client</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Status</label>
                      <select value={form.status} onChange={e=>F('status',e.target.value)} style={{ ...inputStyle, background:D3, cursor:'pointer' }}>
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>
                  </div>
                  <Btn onClick={save}>{modal==='create'?'Create User':'Save Changes'}</Btn>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── NEW-USER CREDENTIALS REVEAL ── */}
        {createdCreds && (
          <div className="hg-modal-overlay" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:320, padding:24 }}
            onClick={e=>e.target===e.currentTarget&&setCreatedCreds(null)}>
            <div style={{ background:D2, border:`1px solid ${BB}`, width:'100%', maxWidth:420, position:'relative', borderRadius:4, padding:32 }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${GL},${G5})`, borderRadius:'4px 4px 0 0' }} />
              <div style={{ fontSize:9, letterSpacing:'0.3em', textTransform:'uppercase', color:GL, marginBottom:8, fontWeight:700, fontFamily:FD }}>User Created</div>
              <h2 style={{ fontFamily:FD, fontSize:20, fontWeight:700, color:W, marginBottom:14 }}>Share these credentials</h2>
              <p style={{ fontSize:12.5, color:W35, fontFamily:FD, marginBottom:18, lineHeight:1.5 }}>
                This temporary password is shown once and isn't stored anywhere retrievable — copy it now and send it to the new user securely.
              </p>
              <div style={{ background:D3, border:`1px solid ${BB}`, borderRadius:3, padding:'14px 16px', marginBottom:20 }}>
                <div style={{ fontSize:10, color:W35, fontFamily:FD, marginBottom:4 }}>EMAIL</div>
                <div style={{ fontSize:14, color:W, fontFamily:MONO, marginBottom:12 }}>{createdCreds.email}</div>
                <div style={{ fontSize:10, color:W35, fontFamily:FD, marginBottom:4 }}>TEMPORARY PASSWORD</div>
                <div style={{ fontSize:14, color:GL, fontFamily:MONO }}>{createdCreds.password}</div>
              </div>
              <Btn onClick={()=>setCreatedCreds(null)}>Done</Btn>
            </div>
          </div>
        )}

        {/* ── VIEW MODAL ── */}
        {modal==='view' && editing && (
          <div className="hg-modal-overlay" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300, padding:24 }}
            onClick={e=>e.target===e.currentTarget&&closeModal()}>
            <div className="hg-modal-box" style={{ background:D2, border:`1px solid ${BB}`, width:'100%', maxWidth:460, position:'relative', borderRadius:4 }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${ROLE_COLOR[editing.role]},${G5})`, borderRadius:'4px 4px 0 0' }} />
              <div className="hg-modal-inner" style={{ padding:'40px' }}>
                <button onClick={closeModal} style={{ position:'absolute', top:16, right:20, background:'none', border:'none', cursor:'pointer', color:W35, fontSize:18 }}>✕</button>
                <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:28 }}>
                  <div style={{ width:52, height:52, borderRadius:'50%', flexShrink:0, background:`linear-gradient(145deg,${G5}CC,${hex2rgba(ROLE_COLOR[editing.role],0.32)})`, border:`1px solid ${hex2rgba(ROLE_COLOR[editing.role],0.4)}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:ROLE_COLOR[editing.role], fontWeight:700, fontFamily:FD }}>
                    {initials(editing.name)}
                  </div>
                  <div>
                    <div style={{ fontFamily:FD, fontSize:22, fontWeight:700, color:W }}>{editing.name}</div>
                    <div style={{ marginTop:6, display:'flex', gap:6, flexWrap:'wrap' }}>
                      <Badge label={editing.role}   color={ROLE_COLOR[editing.role]}   bg={hex2rgba(ROLE_COLOR[editing.role],0.12)}   border={hex2rgba(ROLE_COLOR[editing.role],0.38)} />
                      <Badge label={editing.status} color={STATUS_CLR[editing.status]} bg={STATUS_BG[editing.status]}                 border={STATUS_BORDER[editing.status]} />
                    </div>
                  </div>
                </div>
                {[
                  { label:'Email',  value:editing.email },
                  { label:'Phone',  value:editing.phone },
                  { label:'City',   value:editing.city  },
                  { label:'Joined', value:editing.joined?new Date(editing.joined).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'}):'—' },
                  { label:'Jobs',   value:String(editing.jobs) },
                  ...(editing.role==='promoter'?[{label:'Payout Total',value:`R${editing.payouts.toLocaleString('en-ZA')}`}]:[]),
                ].map(row => (
                  <div key={row.label} style={{ display:'flex', justifyContent:'space-between', padding:'11px 0', borderBottom:`1px solid ${BB}` }}>
                    <span style={{ fontSize:12, color:W55, fontFamily:FD }}>{row.label}</span>
                    <span style={{ fontSize:12, color:W85, fontWeight:700, fontFamily:FD }}>{row.value}</span>
                  </div>
                ))}
                {editing.status==='pending' && (
                  <div style={{ display:'flex', gap:10, marginTop:20 }}>
                    <button onClick={()=>{updateUserStatus(editing.id,'active');closeModal()}} style={{ flex:1, padding:'11px', background:hex2rgba(G3,0.18), border:`1px solid ${G3}`, color:G3, fontFamily:FD, fontSize:12, fontWeight:700, cursor:'pointer', borderRadius:3 }}>✓ Approve</button>
                    <button onClick={()=>{updateUserStatus(editing.id,'inactive');closeModal()}} style={{ flex:1, padding:'11px', background:hex2rgba(G2,0.18), border:`1px solid ${G2}`, color:'#B3AA97', fontFamily:FD, fontSize:12, fontWeight:700, cursor:'pointer', borderRadius:3 }}>✗ Reject</button>
                  </div>
                )}
                <div style={{ display:'flex', gap:10, marginTop:editing.status==='pending'?10:24 }}>
                  <button onClick={()=>{closeModal();openEdit(editing)}} style={{ flex:2, padding:'12px', background:`linear-gradient(135deg,${GL},${G3})`, border:'none', color:B, fontFamily:FD, fontSize:12, fontWeight:700, cursor:'pointer', borderRadius:3 }}>Edit User</button>
                  <button onClick={()=>{closeModal();setDeleting(editing.id)}} style={{ flex:1, padding:'12px', background:hex2rgba(G2,0.18), border:`1px solid ${hex2rgba(G2,0.5)}`, color:'#CBCBCB', fontFamily:FD, fontSize:12, fontWeight:700, cursor:'pointer', borderRadius:3 }}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}