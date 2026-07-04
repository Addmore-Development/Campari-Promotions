// Supervisor/chat/SupervisorAdminChat.tsx
// Direct line to admin for application-related issues. First message works
// like an Instagram DM request: it sends, but nothing further goes through
// until an admin accepts it. Once accepted, it's a normal live chat.
import React, { useCallback, useEffect, useRef, useState } from 'react'

const G   = '#8F8A7C'
const GL  = '#C9BFA6'
const B   = '#050504'
const D1  = '#070706'
const D2  = '#0A0A08'
const BB  = 'rgba(170,160,135,0.16)'
const BB2 = 'rgba(170,160,135,0.06)'
const W   = '#F8F8F8'
const W55 = 'rgba(248,248,248,0.55)'
const W28 = 'rgba(248,248,248,0.65)'
const FD  = "'Playfair Display', Georgia, serif"
const FB  = "'DM Sans', system-ui, sans-serif"
const AMBER = '#E8B85C'
const CORAL = '#C4614A'
const GREEN = '#4ade80'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function authHdr(): Record<string, string> {
  const t = localStorage.getItem('hg_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
}

type ReqStatus = 'none' | 'pending' | 'accepted' | 'declined'

export const SupervisorAdminChat: React.FC = () => {
  const [myId, setMyId] = useState('')
  const [adminId, setAdminId] = useState('')
  const [adminName, setAdminName] = useState('Admin')
  const [messages, setMessages] = useState<any[]>([])
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState<ReqStatus>('none')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`${API}/auth/me`, { headers: authHdr() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.id) setMyId(d.id) })
      .catch(() => {})
    fetch(`${API}/chat/admin`, { headers: authHdr() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.id) { setAdminId(d.id); setAdminName(d.fullName || 'Admin') } })
      .catch(() => {})
  }, [])

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/chat/requests/mine`, { headers: authHdr() })
      if (res.ok) { const d = await res.json(); setStatus(d.status === 'none' ? 'none' : d.status) }
    } catch {}
  }, [])

  const loadMessages = useCallback(async () => {
    if (!adminId) return
    try {
      const res = await fetch(`${API}/chat/messages/${adminId}`, { headers: authHdr() })
      if (res.ok) {
        setMessages(await res.json())
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
      }
    } catch {}
  }, [adminId])

  useEffect(() => {
    if (!adminId) return
    loadStatus()
    loadMessages()
    const ref = setInterval(() => { loadStatus(); loadMessages() }, 4000)
    return () => clearInterval(ref)
  }, [adminId, loadStatus, loadMessages])

  const send = async () => {
    if (!draft.trim() || !adminId || sending) return
    setSending(true)
    setError('')
    try {
      const res = await fetch(`${API}/chat/send`, {
        method: 'POST',
        headers: { ...authHdr(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: adminId, text: draft.trim() }),
      })
      if (res.ok) {
        setDraft('')
        await loadMessages()
        await loadStatus()
      } else {
        const e = await res.json().catch(() => ({}))
        setError(e.error || 'Message not sent.')
        await loadStatus()
      }
    } catch {
      setError('Network error — message not sent.')
    }
    setSending(false)
  }

  const resendRequest = async () => {
    setError('')
    try {
      const res = await fetch(`${API}/chat/requests/resend`, {
        method: 'POST',
        headers: { ...authHdr(), 'Content-Type': 'application/json' },
      })
      if (res.ok) setStatus('pending')
    } catch {}
  }

  const inp: React.CSSProperties = {
    background: BB2, border: `1px solid ${BB}`, padding: '11px 14px',
    color: W, fontFamily: FB, fontSize: 13, outline: 'none', borderRadius: 3, width: '100%',
    boxSizing: 'border-box' as const,
  }

  const canType = status === 'none' || status === 'accepted'

  return (
    <div style={{ padding: '32px 36px 60px' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.36em', textTransform: 'uppercase', color: GL, marginBottom: 8, fontWeight: 700, fontFamily: FD }}>Support</div>
        <h1 style={{ fontFamily: FD, fontSize: 26, fontWeight: 700, color: W }}>Chat with Admin</h1>
        <p style={{ fontSize: 12.5, color: W55, marginTop: 4, fontFamily: FB }}>
          For any application-related issues. Your first message goes as a request — {adminName} needs to accept it before you can keep chatting.
        </p>
      </div>

      {status === 'pending' && (
        <div style={{ padding: '12px 18px', background: 'rgba(232,184,92,0.08)', border: `1px solid ${AMBER}55`, borderRadius: 4, marginBottom: 16, fontSize: 12.5, color: AMBER, fontFamily: FB }}>
          ⏳ Your message request is awaiting admin approval. You'll be able to send more once it's accepted.
        </div>
      )}
      {status === 'declined' && (
        <div style={{ padding: '12px 18px', background: 'rgba(196,97,74,0.08)', border: `1px solid ${CORAL}55`, borderRadius: 4, marginBottom: 16, fontSize: 12.5, color: CORAL, fontFamily: FB, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span>Your message request was declined.</span>
          <button onClick={resendRequest} style={{ padding: '6px 14px', background: 'transparent', border: `1px solid ${CORAL}`, color: CORAL, borderRadius: 3, fontFamily: FD, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            Send a new request
          </button>
        </div>
      )}
      {status === 'accepted' && (
        <div style={{ padding: '10px 18px', background: 'rgba(74,222,128,0.06)', border: `1px solid ${GREEN}44`, borderRadius: 4, marginBottom: 16, fontSize: 12, color: GREEN, fontFamily: FB }}>
          ✓ {adminName} accepted your request — you're now connected.
        </div>
      )}
      {error && (
        <div style={{ padding: '10px 18px', background: 'rgba(196,97,74,0.08)', border: `1px solid ${CORAL}55`, borderRadius: 4, marginBottom: 16, fontSize: 12, color: CORAL, fontFamily: FB }}>
          {error}
        </div>
      )}

      <div style={{ border: `1px solid ${BB}`, borderRadius: 4, background: D1, height: 480, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BB}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg,${GL},${G})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FD, fontWeight: 700, color: B, fontSize: 13 }}>
            {adminName.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: W, fontFamily: FD }}>{adminName}</div>
            <div style={{ fontSize: 9.5, color: W28, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: FD }}>Admin</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.length === 0 && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: W28, fontSize: 12.5, fontFamily: FD, textAlign: 'center' }}>
              {status === 'none' ? 'Send a message to start — it will go as a request.' : 'No messages yet.'}
            </div>
          )}
          {messages.map((m: any) => {
            const mine = m.senderId === myId
            return (
              <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '72%' }}>
                <div style={{
                  padding: '9px 14px', borderRadius: 12,
                  background: mine ? `linear-gradient(135deg,${GL},${G})` : BB2,
                  color: mine ? B : W, fontSize: 13, fontFamily: FB, lineHeight: 1.5,
                  borderBottomRightRadius: mine ? 3 : 12, borderBottomLeftRadius: mine ? 12 : 3,
                }}>
                  {m.text}
                </div>
                <div style={{ fontSize: 9.5, color: W28, marginTop: 3, textAlign: mine ? 'right' : 'left', fontFamily: FD }}>
                  {formatTime(m.createdAt)}
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding: '14px 16px', borderTop: `1px solid ${BB}`, display: 'flex', gap: 10 }}>
          <input
            style={inp}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={canType ? (status === 'none' ? 'Send a message request…' : 'Type a message…') : 'Waiting on admin response…'}
            disabled={!canType || sending}
          />
          <button onClick={send} disabled={!canType || sending || !draft.trim()}
            style={{ padding: '0 22px', background: canType ? `linear-gradient(135deg,${GL},${G})` : BB2, border: 'none', color: canType ? B : W28, fontFamily: FD, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: canType ? 'pointer' : 'not-allowed', borderRadius: 3, opacity: sending ? 0.6 : 1 }}>
            {status === 'none' ? 'Request' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SupervisorAdminChat