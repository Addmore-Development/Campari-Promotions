// Supervisor/profile/SupervisorProfile.tsx
// A supervisor-appropriate profile page — contact details, the business they
// work under, their supervised field, and account info. Unlike the promoter
// profile, this has no clothing/shoe-size fields since supervisors don't
// work shifts themselves.
import React, { useEffect, useState } from 'react'

const G    = '#8F8A7C'
const GL   = '#C9BFA6'
const GD   = '#7A756A'
const GD2  = '#8A8474'
const B    = '#050504'
const BC   = '#080807'
const D2   = '#0D0D0A'
const BB   = 'rgba(170,160,135,0.14)'
const W    = '#F8F8F8'
const WM   = 'rgba(248,248,248,0.65)'
const WD   = 'rgba(248,248,248,0.28)'
const FD   = "'Playfair Display', Georgia, serif"
const FB   = "'DM Sans', system-ui, sans-serif"
const TEAL  = '#4AABB8'
const CORAL = '#C4614A'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
function authHdr() {
  const t = localStorage.getItem('hg_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}
function authHdrJson() {
  const t = localStorage.getItem('hg_token')
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(248,248,248,0.05)',
  border: `1px solid ${BB}`, padding: '10px 14px',
  color: W, fontFamily: FB, fontSize: 13, outline: 'none', borderRadius: 2, boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, letterSpacing: '0.15em',
  textTransform: 'uppercase', color: WM, display: 'block', marginBottom: 7,
}

export const SupervisorProfile: React.FC = () => {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState('')
  const [form, setForm] = useState({ phone: '', city: '', province: '' })

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/me`, { headers: authHdr() as any })
      if (res.ok) {
        const p = await res.json()
        setProfile(p)
        setForm({ phone: p.phone || '', city: p.city || '', province: p.province || '' })
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    setSaving(true); setMsg('')
    try {
      const res = await fetch(`${API}/users/me/profile`, {
        method: 'PUT', headers: authHdrJson() as any, body: JSON.stringify(form),
      })
      if (res.ok) {
        setMsg('Profile saved successfully')
        await load()
        setTimeout(() => setMsg(''), 3000)
      } else {
        setMsg('Failed to save — please try again')
      }
    } catch { setMsg('Network error') }
    setSaving(false)
  }

  if (loading) {
    return <div style={{ padding: '48px 24px', textAlign: 'center', color: WD, fontFamily: FB }}>Loading your profile…</div>
  }

  const initials = (profile?.fullName || 'S').split(' ').map((s: string) => s[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div style={{ padding: '32px 36px 80px', maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: GL, marginBottom: 8, fontWeight: 700, fontFamily: FD }}>My Profile</div>
        <h1 style={{ fontFamily: FD, fontSize: 24, fontWeight: 700, color: W }}>Supervisor Profile</h1>
        <p style={{ fontSize: 12.5, color: WD, fontFamily: FB, marginTop: 4 }}>Your contact details and the business you supervise campaigns for.</p>
      </div>

      {msg && (
        <div style={{ marginBottom: 20, padding: '12px 16px', background: msg.includes('success') ? 'rgba(74,171,184,0.1)' : 'rgba(196,97,74,0.1)', border: `1px solid ${msg.includes('success') ? TEAL : CORAL}55`, borderRadius: 3, fontSize: 12.5, color: msg.includes('success') ? TEAL : CORAL, fontFamily: FB }}>
          {msg}
        </div>
      )}

      {/* Identity header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, padding: '20px 24px', background: BC, border: `1px solid ${BB}`, borderRadius: 6 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg,${GD2},${GL})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: B, flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: FD, fontSize: 18, fontWeight: 700, color: W }}>{profile?.fullName || 'Supervisor'}</div>
          <div style={{ fontSize: 12, color: WM, fontFamily: FB }}>{profile?.email}</div>
          <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', background: 'rgba(201,191,166,0.1)', border: `1px solid ${BB}`, borderRadius: 20 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: GL }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: GL, fontFamily: FD }}>Supervisor</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: BB }}>
        {/* Editable contact info */}
        <div style={{ background: D2, padding: 28 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: GL, marginBottom: 20, fontWeight: 700 }}>Contact Details</div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+27 …"
              onFocus={e => e.currentTarget.style.borderColor = GL} onBlur={e => e.currentTarget.style.borderColor = BB} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>City</label>
            <input style={inputStyle} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="e.g. Johannesburg"
              onFocus={e => e.currentTarget.style.borderColor = GL} onBlur={e => e.currentTarget.style.borderColor = BB} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Province</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))}>
              <option value="">Select</option>
              {['Gauteng','Western Cape','KwaZulu-Natal','Eastern Cape','Limpopo','Mpumalanga','North West','Free State','Northern Cape'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <button onClick={handleSave} disabled={saving}
            style={{ width: '100%', padding: '12px', background: saving ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg,${GL},${GD})`, border: 'none', color: saving ? WD : B, fontFamily: FD, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: saving ? 'wait' : 'pointer', borderRadius: 3 }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        {/* Assignment info (read-only) */}
        <div style={{ background: D2, padding: 28 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: GL, marginBottom: 20, fontWeight: 700 }}>Assignment</div>
          {[
            { label: 'Field Supervised', value: profile?.workField || 'General' },
            { label: 'Assigned Business', value: profile?.business?.fullName || 'Not yet assigned' },
            { label: 'Account Status', value: profile?.status || '—' },
            { label: 'Member Since', value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${BB}` }}>
              <span style={{ fontSize: 12, color: WM }}>{row.label}</span>
              <span style={{ fontSize: 12, color: W, fontWeight: 600, textAlign: 'right' }}>{row.value}</span>
            </div>
          ))}
          <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(170,160,135,0.06)', border: `1px solid ${BB}`, borderRadius: 2, fontSize: 12, color: WM, lineHeight: 1.6 }}>
            📎 To change your name, field, or assigned business, contact your admin.
          </div>
        </div>
      </div>
    </div>
  )
}

export default SupervisorProfile
