// ─────────────────────────────────────────────────────────────────────────────
// ChatSystem.tsx — API-backed real-time chat, role-aware
//
// Exports:
//   AdminChatTab  — full-page chat for admin dashboard Messages tab
//   FloatingChat  — floating bubble for promoter & business dashboards
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from 'react'

// ─── Palette ──────────────────────────────────────────────────────────────────
const G   = '#8F8A7C'
const GL  = '#C9BFA6'
const G2  = '#8A8474'
const G3  = '#7A756A'
const G5  = '#443F36'
const B   = '#050504'
const D1  = '#070706'
const D2  = '#0A0A08'
const D3  = '#100F0B'
const BB  = 'rgba(170,160,135,0.16)'
const BB2 = 'rgba(170,160,135,0.06)'
const W   = '#F8F8F8'
const W55 = 'rgba(248,248,248,0.55)'
const W28 = 'rgba(248,248,248,0.65)'
const FD  = "'Playfair Display', Georgia, serif"
const FB  = "'DM Sans', system-ui, sans-serif"

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Always read token fresh so it's never stale
function authHdr(): Record<string, string> {
  const t = localStorage.getItem('hg_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

function formatTime(iso: string): string {
  const d    = new Date(iso)
  const now  = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diff < 1)    return 'Just now'
  if (diff < 60)   return `${diff}m ago`
  if (diff < 1440) return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

function roleColor(role: string) {
  const r = role?.toLowerCase()
  if (r === 'promoter') return G3
  if (r === 'admin')    return GL
  return GL
}

interface Thread {
  threadId:    string
  otherId:     string
  otherName:   string
  otherRole:   string
  lastMessage: string
  lastTime:    string
  unread:      number
}

interface Message {
  id:        string
  senderId:  string
  text:      string
  read:      boolean
  createdAt: string
  sender:    { id: string; fullName: string; role: string }
}

interface ChatUser {
  id:       string
  fullName: string
  role:     string
  status?:  string
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, role, size = 32 }: { name: string; role: string; size?: number }) {
  const color = roleColor(role)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `${color}22`, border: `1px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color, fontFamily: FD,
    }}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function Bubble({ msg, isMine }: { msg: Message; isMine: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: '72%', padding: '10px 14px',
        borderRadius: isMine ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
        background: isMine ? `linear-gradient(135deg,${G5},${G2})` : D2,
        border:     isMine ? 'none' : `1px solid ${BB}`,
      }}>
        {!isMine && (
          <div style={{ fontSize: 9, fontWeight: 700, color: G3, marginBottom: 4, letterSpacing: '0.1em', fontFamily: FD }}>
            {msg.sender?.fullName || 'Unknown'}
          </div>
        )}
        <div style={{ fontSize: 13, color: W, lineHeight: 1.6, fontFamily: FB }}>{msg.text}</div>
        <div style={{ fontSize: 9, color: isMine ? 'rgba(248,248,248,0.4)' : W28, marginTop: 4, textAlign: 'right', fontFamily: FD }}>
          {formatTime(msg.createdAt)}
        </div>
      </div>
    </div>
  )
}

// ─── ADMIN CHAT TAB ───────────────────────────────────────────────────────────
export function AdminChatTab() {
  const [myId,         setMyId        ] = useState('')
  const [threads,      setThreads     ] = useState<Thread[]>([])
  const [activeThread, setActiveThread] = useState<Thread | null>(null)
  const [messages,     setMessages    ] = useState<Message[]>([])
  const [draft,        setDraft       ] = useState('')
  const [search,       setSearch      ] = useState('')
  const [filterRole,   setFilterRole  ] = useState<'all'|'promoter'|'business'>('all')
  const [chatUsers,    setChatUsers   ] = useState<ChatUser[]>([])
  const [showNew,      setShowNew     ] = useState(false)
  const [newSearch,    setNewSearch   ] = useState('')
  const [newFilter,    setNewFilter   ] = useState<'all'|'promoter'|'business'>('all')
  const [sending,      setSending     ] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load own ID once
  useEffect(() => {
    fetch(`${API}/auth/me`, { headers: authHdr() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.id) setMyId(d.id) })
      .catch(() => {})
  }, [])

  const loadThreads = useCallback(async () => {
    try {
      const res = await fetch(`${API}/chat/threads`, { headers: authHdr() })
      if (res.ok) setThreads(await res.json())
    } catch {}
  }, [])

  const loadMessages = useCallback(async (otherId: string) => {
    try {
      const res = await fetch(`${API}/chat/messages/${otherId}`, { headers: authHdr() })
      if (res.ok) {
        setMessages(await res.json())
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
      }
    } catch {}
  }, [])

  // Load all chatable users for the new-chat modal
  const loadChatUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const res = await fetch(`${API}/chat/users`, { headers: authHdr() })
      if (res.ok) setChatUsers(await res.json())
    } catch {}
    setLoadingUsers(false)
  }, [])

  // ── Instagram-DM-style message requests from supervisors ──────────────────
  const loadPendingRequests = useCallback(async () => {
    try {
      const res = await fetch(`${API}/chat/requests`, { headers: authHdr() })
      if (res.ok) setPendingRequests(await res.json())
    } catch {}
  }, [])

  const respondToRequest = async (supervisorId: string, accept: boolean) => {
    try {
      const res = await fetch(`${API}/chat/requests/${supervisorId}/respond`, {
        method: 'POST',
        headers: { ...authHdr(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept }),
      })
      if (res.ok) {
        setPendingRequests(prev => prev.filter(r => r.supervisorId !== supervisorId))
        loadThreads()
      }
    } catch {}
  }

  // Poll for new threads + messages every 4 s
  useEffect(() => {
    loadThreads()
    loadPendingRequests()
    const ref = setInterval(() => {
      loadThreads()
      loadPendingRequests()
      if (activeThread) loadMessages(activeThread.otherId)
    }, 4000)
    pollRef.current = ref
    return () => clearInterval(ref)
  }, [loadThreads, loadMessages, loadPendingRequests, activeThread])

  const selectThread = async (t: Thread) => {
    setActiveThread(t)
    setDraft('')
    await loadMessages(t.otherId)
    setThreads(prev => prev.map(x => x.threadId === t.threadId ? { ...x, unread: 0 } : x))
  }

  const send = async () => {
    if (!draft.trim() || !activeThread || sending) return
    setSending(true)
    try {
      const res = await fetch(`${API}/chat/send`, {
        method:  'POST',
        headers: { ...authHdr(), 'Content-Type': 'application/json' },
        body:    JSON.stringify({ receiverId: activeThread.otherId, text: draft.trim() }),
      })
      if (res.ok) {
        setDraft('')
        await loadMessages(activeThread.otherId)
        loadThreads()
      } else {
        const e = await res.json().catch(() => ({}))
        console.error('[Chat] send failed:', e)
      }
    } catch (err) {
      console.error('[Chat] send error:', err)
    }
    setSending(false)
  }

  const openNewChat = () => {
    setShowNew(true)
    setNewSearch('')
    setNewFilter('all')
    loadChatUsers()
  }

  const startChat = (user: ChatUser) => {
    const t: Thread = {
      threadId:    user.id,
      otherId:     user.id,
      otherName:   user.fullName,
      otherRole:   (user.role || '').toLowerCase(),
      lastMessage: '',
      lastTime:    new Date().toISOString(),
      unread:      0,
    }
    setShowNew(false)
    setActiveThread(t)
    loadMessages(user.id)
  }

  const totalUnread = threads.reduce((s, t) => s + t.unread, 0)

  const filteredThreads = threads
    .filter(t => filterRole === 'all' || t.otherRole === filterRole)
    .filter(t => !search || t.otherName.toLowerCase().includes(search.toLowerCase()))

  const filteredUsers = chatUsers.filter(u => {
    const roleMatch   = newFilter === 'all' || (u.role || '').toLowerCase() === newFilter
    const searchMatch = !newSearch || u.fullName.toLowerCase().includes(newSearch.toLowerCase())
    return roleMatch && searchMatch
  })

  const inp: React.CSSProperties = {
    background: BB2, border: `1px solid ${BB}`, padding: '10px 14px',
    color: W, fontFamily: FB, fontSize: 13, outline: 'none', borderRadius: 3, width: '100%',
    boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ padding: '40px 48px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.38em', textTransform: 'uppercase', color: GL, marginBottom: 8, fontWeight: 700, fontFamily: FD }}>
          Comms · Chat
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontFamily: FD, fontSize: 28, fontWeight: 700, color: W }}>
              Messages
              {totalUnread > 0 && (
                <span style={{ marginLeft: 12, fontSize: 13, fontWeight: 700, color: B, background: GL, padding: '2px 10px', borderRadius: 20 }}>
                  {totalUnread}
                </span>
              )}
            </h1>
            <p style={{ fontSize: 13, color: W55, marginTop: 4, fontFamily: FD }}>
              Real-time chat with promoters and business clients.
            </p>
          </div>
          <button onClick={openNewChat}
            style={{ padding: '10px 22px', background: `linear-gradient(135deg,${GL},${G})`, border: 'none', color: B, fontFamily: FD, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 3 }}>
            + New Chat
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', border: `1px solid ${BB}`, borderRadius: 4, overflow: 'hidden', height: 'calc(100vh - 260px)', minHeight: 500 }}>

        {/* ── Thread list ── */}
        <div style={{ background: D2, borderRight: `1px solid ${BB}`, display: 'flex', flexDirection: 'column' }}>
          {pendingRequests.length > 0 && (
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BB}`, flexShrink: 0, background: 'rgba(201,191,166,0.06)' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: GL, fontWeight: 700, marginBottom: 8, fontFamily: FD }}>
                Message Requests ({pendingRequests.length})
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {pendingRequests.map((r: any) => (
                  <div key={r.id} style={{ background: BB2, border: `1px solid ${BB}`, borderRadius: 4, padding: '8px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Avatar name={r.supervisor?.fullName || 'Supervisor'} role="supervisor" />
                      <div style={{ fontSize: 12, fontWeight: 700, color: W, fontFamily: FD }}>{r.supervisor?.fullName}</div>
                    </div>
                    <p style={{ fontSize: 10.5, color: W28, marginBottom: 8, fontFamily: FD }}>wants to send you a message</p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => respondToRequest(r.supervisorId, true)}
                        style={{ flex: 1, padding: '5px 0', background: `linear-gradient(135deg,${GL},${G})`, border: 'none', color: B, fontFamily: FD, fontSize: 10, fontWeight: 700, cursor: 'pointer', borderRadius: 3 }}>
                        Accept
                      </button>
                      <button onClick={() => respondToRequest(r.supervisorId, false)}
                        style={{ flex: 1, padding: '5px 0', background: 'transparent', border: `1px solid ${BB}`, color: W55, fontFamily: FD, fontSize: 10, fontWeight: 700, cursor: 'pointer', borderRadius: 3 }}>
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${BB}`, flexShrink: 0 }}>
            <input placeholder="Search conversations…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...inp, marginBottom: 10, fontSize: 12 }}
              onFocus={e => e.currentTarget.style.borderColor = GL}
              onBlur={e => e.currentTarget.style.borderColor = BB} />
            <div style={{ display: 'flex', gap: 4 }}>
              {(['all','promoter','business'] as const).map(r => (
                <button key={r} onClick={() => setFilterRole(r)}
                  style={{ flex: 1, padding: '5px', border: `1px solid ${filterRole===r?GL:BB}`, background: filterRole===r?'rgba(201,191,166,0.14)':'transparent', color: filterRole===r?GL:W55, fontFamily: FD, fontSize: 9, fontWeight: filterRole===r?700:400, letterSpacing: '0.1em', textTransform: 'capitalize', cursor: 'pointer', borderRadius: 3 }}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredThreads.length === 0 && (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: W28, fontSize: 12, fontFamily: FD }}>
                No conversations yet. Click + New Chat to start.
              </div>
            )}
            {filteredThreads.map(t => (
              <div key={t.threadId} onClick={() => selectThread(t)}
                style={{ padding: '14px 16px', cursor: 'pointer', background: activeThread?.threadId===t.threadId?BB2:'transparent', borderBottom: `1px solid ${BB}`, borderLeft: `3px solid ${activeThread?.threadId===t.threadId?GL:'transparent'}`, transition: 'all 0.18s' }}
                onMouseEnter={e => { if (activeThread?.threadId !== t.threadId) e.currentTarget.style.background = BB2 }}
                onMouseLeave={e => { if (activeThread?.threadId !== t.threadId) e.currentTarget.style.background = 'transparent' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar name={t.otherName} role={t.otherRole} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: W, fontFamily: FD, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {t.otherName}
                        {t.unread > 0 && <span style={{ width: 7, height: 7, borderRadius: '50%', background: GL, display: 'inline-block' }} />}
                      </div>
                      <div style={{ fontSize: 9, color: roleColor(t.otherRole), letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: FD }}>{t.otherRole}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 9, color: W28, fontFamily: FD, flexShrink: 0 }}>{formatTime(t.lastTime)}</span>
                </div>
                <div style={{ fontSize: 11, color: t.unread>0?W55:W28, fontFamily: FD, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: 40 }}>
                  {t.lastMessage || 'Start a conversation…'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Conversation panel ── */}
        <div style={{ background: D1, display: 'flex', flexDirection: 'column' }}>
          {!activeThread ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 32, color: W28 }}>◆</div>
              <div style={{ fontFamily: FD, fontSize: 18, color: W55 }}>Select a conversation</div>
              <div style={{ fontSize: 12, color: W28, fontFamily: FD }}>or start a new chat</div>
            </div>
          ) : (
            <>
              {/* Conversation header */}
              <div style={{ padding: '16px 24px', borderBottom: `1px solid ${BB}`, display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0, background: D2 }}>
                <Avatar name={activeThread.otherName} role={activeThread.otherRole} size={40} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: W, fontFamily: FD }}>{activeThread.otherName}</div>
                  <div style={{ fontSize: 10, color: roleColor(activeThread.otherRole), letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: FD }}>
                    {activeThread.otherRole}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: W28, fontSize: 12, fontFamily: FD, marginTop: 40 }}>
                    No messages yet. Say hello!
                  </div>
                )}
                {messages.map(m => (
                  <Bubble key={m.id} msg={m} isMine={m.senderId === myId} />
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '14px 24px', borderTop: `1px solid ${BB}`, display: 'flex', gap: 10, flexShrink: 0, background: D2 }}>
                <input
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder={`Message ${activeThread.otherName}…`}
                  style={{ ...inp, flex: 1, width: 'auto' }}
                  onFocus={e => e.currentTarget.style.borderColor = GL}
                  onBlur={e => e.currentTarget.style.borderColor = BB}
                />
                <button
                  onClick={send}
                  disabled={!draft.trim() || sending}
                  style={{ padding: '10px 22px', background: draft.trim()&&!sending?`linear-gradient(135deg,${GL},${G})`:BB, border: 'none', color: draft.trim()&&!sending?B:W28, fontFamily: FD, fontSize: 11, fontWeight: 700, cursor: draft.trim()&&!sending?'pointer':'default', borderRadius: 3, letterSpacing: '0.08em', flexShrink: 0 }}>
                  {sending ? '…' : 'Send ↑'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── New chat modal ── */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24 }}
          onClick={e => e.target === e.currentTarget && setShowNew(false)}>
          <div style={{ background: D2, border: `1px solid ${BB}`, padding: '36px 40px', width: '100%', maxWidth: 460, position: 'relative', borderRadius: 4, maxHeight: '82vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${G5},${GL},${G})` }} />
            <button onClick={() => setShowNew(false)} style={{ position: 'absolute', top: 14, right: 18, background: 'none', border: 'none', cursor: 'pointer', color: W28, fontSize: 18 }}>✕</button>

            <div style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: GL, marginBottom: 6, fontFamily: FD, fontWeight: 700 }}>New Conversation</div>
            <h3 style={{ fontFamily: FD, fontSize: 20, fontWeight: 700, color: W, marginBottom: 16 }}>Start a Chat</h3>

            {/* Role filter */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              {(['all','promoter','business'] as const).map(r => (
                <button key={r} onClick={() => setNewFilter(r)}
                  style={{ flex: 1, padding: '6px', border: `1px solid ${newFilter===r?GL:BB}`, background: newFilter===r?'rgba(201,191,166,0.14)':'transparent', color: newFilter===r?GL:W55, fontFamily: FD, fontSize: 9, fontWeight: newFilter===r?700:400, letterSpacing: '0.1em', textTransform: 'capitalize', cursor: 'pointer', borderRadius: 3 }}>
                  {r === 'all' ? 'All Users' : r === 'promoter' ? 'Promoters' : 'Businesses'}
                </button>
              ))}
            </div>

            <input placeholder="Search by name…" value={newSearch} onChange={e => setNewSearch(e.target.value)}
              style={{ ...inp, marginBottom: 12 }}
              onFocus={e => e.currentTarget.style.borderColor = GL}
              onBlur={e => e.currentTarget.style.borderColor = BB} />

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {loadingUsers && (
                <div style={{ padding: 24, textAlign: 'center', color: W28, fontSize: 12, fontFamily: FD }}>Loading users…</div>
              )}
              {!loadingUsers && filteredUsers.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: W28, fontSize: 12, fontFamily: FD }}>
                  {chatUsers.length === 0 ? 'No registered users found.' : 'No users match your search.'}
                </div>
              )}
              {!loadingUsers && filteredUsers.map(u => (
                <div key={u.id} onClick={() => startChat(u)}
                  style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderBottom: `1px solid ${BB}`, transition: 'background 0.15s', borderRadius: 3 }}
                  onMouseEnter={e => e.currentTarget.style.background = BB2}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <Avatar name={u.fullName} role={u.role} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: W, fontFamily: FD }}>{u.fullName}</div>
                    <div style={{ fontSize: 9, color: roleColor(u.role), letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: FD }}>{u.role}</div>
                  </div>
                  {u.status === 'approved' && <span style={{ fontSize: 9, color: GL, fontFamily: FD }}>✓</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── FLOATING CHAT WIDGET ─────────────────────────────────────────────────────
export function FloatingChat() {
  const [myId,         setMyId        ] = useState<string | null>(null)
  const [open,         setOpen        ] = useState(false)
  const [messages,     setMessages    ] = useState<Message[]>([])
  const [draft,        setDraft       ] = useState('')
  const [unread,       setUnread      ] = useState(0)
  const [sending,      setSending     ] = useState(false)
  const [activeUser,   setActiveUser  ] = useState<ChatUser | null>(null)
  const [chatUsers,    setChatUsers   ] = useState<ChatUser[]>([])
  const [showPicker,   setShowPicker  ] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [initDone,     setInitDone    ] = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Initialise: get own ID, default to admin ─────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const [meRes, adminRes] = await Promise.all([
          fetch(`${API}/auth/me`,    { headers: authHdr() }),
          fetch(`${API}/chat/admin`, { headers: authHdr() }),
        ])
        if (meRes.ok) {
          const me = await meRes.json()
          setMyId(me.id)
        }
        if (adminRes.ok) {
          const admin = await adminRes.json()
          setActiveUser({
            id:       admin.id,
            fullName: admin.fullName || 'Admin Support',
            role:     'admin',
          })
        }
      } catch {}
      setInitDone(true)
    }
    init()
  }, [])

  // ── Load chatable users (called lazily when picker opens) ────────────────
  const loadChatUsers = useCallback(async () => {
    if (loadingUsers) return
    setLoadingUsers(true)
    try {
      const res = await fetch(`${API}/chat/users`, { headers: authHdr() })
      if (res.ok) setChatUsers(await res.json())
    } catch {}
    setLoadingUsers(false)
  }, [loadingUsers])

  // ── Load messages with active contact ───────────────────────────────────
  const loadMessages = useCallback(async () => {
    if (!activeUser) return
    try {
      const res = await fetch(`${API}/chat/messages/${activeUser.id}`, { headers: authHdr() })
      if (res.ok) {
        const msgs: Message[] = await res.json()
        setMessages(msgs)
        if (!open) {
          const newUnread = msgs.filter(m => m.senderId === activeUser.id && !m.read).length
          setUnread(newUnread)
        }
      }
    } catch {}
  }, [activeUser, open])

  // ── Poll every 4 s once we have an active user ───────────────────────────
  useEffect(() => {
    if (!initDone || !activeUser) return
    loadMessages()
    pollRef.current = setInterval(loadMessages, 4000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [initDone, activeUser, loadMessages])

  // ── Mark as read + scroll when chat opens ───────────────────────────────
  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }, [open, messages.length])

  const send = async () => {
    if (!draft.trim() || !activeUser || sending) return
    setSending(true)
    try {
      const res = await fetch(`${API}/chat/send`, {
        method:  'POST',
        headers: { ...authHdr(), 'Content-Type': 'application/json' },
        body:    JSON.stringify({ receiverId: activeUser.id, text: draft.trim() }),
      })
      if (res.ok) {
        setDraft('')
        await loadMessages()
      } else {
        const e = await res.json().catch(() => ({}))
        console.error('[FloatingChat] send failed:', e)
      }
    } catch (err) {
      console.error('[FloatingChat] send error:', err)
    }
    setSending(false)
  }

  const openPicker = () => {
    setShowPicker(true)
    setPickerSearch('')
    loadChatUsers()
  }

  const switchUser = (u: ChatUser) => {
    setActiveUser(u)
    setMessages([])
    setShowPicker(false)
    setPickerSearch('')
  }

  const pickerFiltered = chatUsers.filter(u =>
    !pickerSearch || u.fullName.toLowerCase().includes(pickerSearch.toLowerCase())
  )

  return (
    <>
      <style>{`
        @keyframes hg-chat-pop  { from{opacity:0;transform:scale(0.85) translateY(20px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes hg-badge-pop { 0%,100%{transform:scale(1)} 50%{transform:scale(1.25)} }
      `}</style>

      {/* ── Chat window ── */}
      {open && (
        <div style={{ position: 'fixed', bottom: 92, right: 28, width: 360, height: 520, background: D2, border: `1px solid ${BB}`, borderRadius: 12, boxShadow: `0 24px 60px rgba(0,0,0,0.7),0 0 40px rgba(201,191,166,0.08)`, display: 'flex', flexDirection: 'column', zIndex: 9998, animation: 'hg-chat-pop 0.3s cubic-bezier(0.22,1,0.36,1)', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '12px 16px', background: `linear-gradient(135deg,${G5},#17170F)`, borderBottom: `1px solid ${BB}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: GL, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: W, fontFamily: FD }}>
                  {activeUser?.fullName || 'Support'}
                </div>
                <div style={{ fontSize: 9, color: GL, fontFamily: FD, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {activeUser?.role || 'admin'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={openPicker}
                style={{ fontSize: 10, color: W55, background: BB2, border: `1px solid ${BB}`, padding: '4px 10px', borderRadius: 3, cursor: 'pointer', fontFamily: FD, whiteSpace: 'nowrap' }}
                onMouseEnter={e => e.currentTarget.style.color = GL}
                onMouseLeave={e => e.currentTarget.style.color = W55}>
                Switch ↕
              </button>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: W55, fontSize: 18, lineHeight: 1 }}>✕</button>
            </div>
          </div>

          {/* Contact picker overlay */}
          {showPicker && (
            <div style={{ position: 'absolute', inset: 0, background: D2, zIndex: 10, display: 'flex', flexDirection: 'column', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${BB}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: W, fontFamily: FD }}>Select Contact</span>
                <button onClick={() => setShowPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: W55, fontSize: 18 }}>✕</button>
              </div>
              <div style={{ padding: '10px 14px', borderBottom: `1px solid ${BB}`, flexShrink: 0 }}>
                <input placeholder="Search…" value={pickerSearch} onChange={e => setPickerSearch(e.target.value)}
                  style={{ width: '100%', background: BB2, border: `1px solid ${BB}`, padding: '8px 12px', color: W, fontFamily: FB, fontSize: 12, outline: 'none', borderRadius: 20, boxSizing: 'border-box' as const }}
                  onFocus={e => e.currentTarget.style.borderColor = GL}
                  onBlur={e => e.currentTarget.style.borderColor = BB} />
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {loadingUsers && (
                  <div style={{ padding: 20, textAlign: 'center', color: W28, fontSize: 12, fontFamily: FD }}>Loading…</div>
                )}
                {!loadingUsers && pickerFiltered.length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: W28, fontSize: 12, fontFamily: FD }}>No contacts found.</div>
                )}
                {!loadingUsers && pickerFiltered.map(u => (
                  <div key={u.id} onClick={() => switchUser(u)}
                    style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderBottom: `1px solid ${BB}`, background: activeUser?.id===u.id?BB2:'transparent', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = BB2}
                    onMouseLeave={e => e.currentTarget.style.background = activeUser?.id===u.id?BB2:'transparent'}>
                    <Avatar name={u.fullName} role={u.role} size={34} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: W, fontFamily: FD }}>{u.fullName}</div>
                      <div style={{ fontSize: 9, color: roleColor(u.role), letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: FD }}>{u.role}</div>
                    </div>
                    {activeUser?.id === u.id && <span style={{ fontSize: 10, color: GL }}>✓</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && !showPicker && (
              <div style={{ textAlign: 'center', color: W28, fontSize: 12, fontFamily: FD, marginTop: 60 }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>◆</div>
                Start a conversation with {activeUser?.fullName || 'Support'}.
              </div>
            )}
            {messages.map(m => (
              <Bubble key={m.id} msg={m} isMine={m.senderId === myId} />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 14px', borderTop: `1px solid ${BB}`, display: 'flex', gap: 8, flexShrink: 0, background: D3 }}>
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder={`Message ${activeUser?.fullName || 'Support'}…`}
              style={{ flex: 1, background: BB2, border: `1px solid ${BB}`, padding: '9px 12px', color: W, fontFamily: FB, fontSize: 13, outline: 'none', borderRadius: 20, boxSizing: 'border-box' as const }}
              onFocus={e => e.currentTarget.style.borderColor = GL}
              onBlur={e => e.currentTarget.style.borderColor = BB}
            />
            <button
              onClick={send}
              disabled={!draft.trim() || sending}
              style={{ width: 38, height: 38, borderRadius: '50%', background: draft.trim()&&!sending?`linear-gradient(135deg,${GL},${G})`:BB, border: 'none', cursor: draft.trim()&&!sending?'pointer':'default', color: draft.trim()&&!sending?B:W28, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
              {sending ? '…' : '↑'}
            </button>
          </div>
        </div>
      )}

      {/* ── Floating button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ position: 'fixed', bottom: 28, right: 28, width: 54, height: 54, borderRadius: '50%', background: open?D2:`linear-gradient(135deg,${GL},${G})`, border: open?`1px solid ${BB}`:'none', cursor: 'pointer', zIndex: 9999, boxShadow: `0 8px 24px rgba(0,0,0,0.5),0 0 20px rgba(201,191,166,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: open?GL:B, transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)' }}>
        {open ? '✕' : '◆'}
        {!open && unread > 0 && (
          <div style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: GL, color: B, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'hg-badge-pop 1.5s ease-in-out infinite', border: `2px solid ${B}` }}>
            {unread > 9 ? '9+' : unread}
          </div>
        )}
      </button>
    </>
  )
}