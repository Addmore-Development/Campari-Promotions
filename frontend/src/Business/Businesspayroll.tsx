import { useState, useEffect, useCallback } from 'react'

const BLK1 = '#030302'
const BLK2 = '#070706'
const BLK3 = '#0A0A08'
const GL   = '#C9BFA6'
const GD   = '#7A756A'
const GD2  = '#8A8474'
const GD3  = '#443F36'
const BB   = 'rgba(170,160,135,0.16)'
const W    = '#F8F8F8'
const W7   = 'rgba(248,248,248,0.70)'
const W4   = 'rgba(248,248,248,0.40)'
const W2   = 'rgba(248,248,248,0.20)'
const GREEN = '#4ade80'
const CORAL = '#C4614A'
const FD   = "'Playfair Display', Georgia, serif"
const FB   = "'DM Sans', system-ui, sans-serif"

function hex2rgba(hex: string, a: number) {
  const h = hex.replace('#', '')
  return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${a})`
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
function authHdr() {
  const t = localStorage.getItem('hg_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}
function authHdrJson() {
  const t = localStorage.getItem('hg_token')
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}
const fmtZAR = (n: number) => `R ${(n || 0).toLocaleString('en-ZA')}`

// ── Generic CSV + printable-PDF export helpers ────────────────────────────────
function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const lines = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function downloadPDF(title: string, subtitle: string, headers: string[], rows: (string | number)[][], totalsLabel?: string, totalsValue?: string) {
  const rowsHtml = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    body{font-family:Georgia,serif;color:#12120D;background:#fff;padding:40px;max-width:900px;margin:0 auto;}
    h1{font-size:22px;border-bottom:2px solid #8F8A7C;padding-bottom:12px;margin-bottom:6px;color:#050504;}
    .meta{font-size:11px;color:#888;margin-bottom:26px;}
    table{width:100%;border-collapse:collapse;margin-top:8px;}
    th{background:#8F8A7C;color:#fff;padding:8px 10px;text-align:left;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;}
    td{padding:7px 10px;border-bottom:1px solid #DBDBDB;font-size:11.5px;}
    tr:nth-child(even) td{background:#F9F9F9;}
    tfoot td{font-weight:700;border-top:2px solid #8F8A7C;background:#F4F1EA;}
    @media print{body{padding:16px;}}
  </style></head><body>
  <h1>${title}</h1>
  <div class="meta">${subtitle} · Generated ${new Date().toLocaleString('en-ZA')}</div>
  <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
  <tbody>${rowsHtml}</tbody>
  ${totalsLabel ? `<tfoot><tr><td colspan="${headers.length - 1}">${totalsLabel}</td><td>${totalsValue}</td></tr></tfoot>` : ''}
  </table>
  </body></html>`
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const w = window.open(url, '_blank')
  if (w) { w.onload = () => { w.print(); URL.revokeObjectURL(url) } }
  else { URL.revokeObjectURL(url) }
}

interface LedgerEntry {
  id:          string
  type:        'topup' | 'spend' | 'refund'
  createdAt:   string
  amount:      number
  description: string
  jobId?:      string
}

interface PayRow {
  id:              string
  promoterId:      string
  promoterName:    string
  promoterEmail:   string
  promoterPhone:   string
  bankName:        string
  accountNumber:   string
  branchCode:      string
  jobTitle:        string
  jobDate:         string
  hourlyRate:      number
  hoursWorked:     number
  grossAmount:     number
  deductions:      number
  netAmount:       number
  status:          string
  paidAt?:         string
  reference?:      string
}

type SortKey = 'netAmount' | 'promoterName' | 'status' | 'jobDate'

// ── Mark as Paid confirmation modal ──────────────────────────────────────────
function MarkPaidModal({ row, onConfirm, onClose, saving }: {
  row:       PayRow
  onConfirm: (ref: string) => void
  onClose:   () => void
  saving:    boolean
}) {
  const [ref, setRef] = useState('')
  const hasBankDetails = row.bankName || row.accountNumber

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: BLK2, border: `1px solid ${BB}`, padding: '36px 40px', width: '100%', maxWidth: 480, position: 'relative', borderRadius: 4 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${GD3},${GL},${GD3})` }} />
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 18, background: 'none', border: 'none', cursor: 'pointer', color: W4, fontSize: 18 }}>✕</button>

        <div style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: GL, fontWeight: 700, fontFamily: FD, marginBottom: 6 }}>Confirm Payment</div>
        <h3 style={{ fontFamily: FD, fontSize: 22, fontWeight: 700, color: W, marginBottom: 20 }}>Mark as Paid</h3>

        {/* Promoter + amount summary */}
        <div style={{ padding: '16px 18px', background: hex2rgba(GL, 0.05), border: `1px solid ${BB}`, borderRadius: 3, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: W, fontFamily: FD }}>{row.promoterName}</div>
              <div style={{ fontSize: 11, color: W4, fontFamily: FB }}>{row.promoterEmail}</div>
              {row.promoterPhone && <div style={{ fontSize: 11, color: W4, fontFamily: FB }}>{row.promoterPhone}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: FD, fontSize: 26, fontWeight: 700, color: GL }}>R{row.netAmount.toLocaleString('en-ZA')}</div>
              <div style={{ fontSize: 10, color: W4, fontFamily: FB }}>{row.hoursWorked.toFixed(2)}h × R{row.hourlyRate}/hr</div>
            </div>
          </div>

          {/* Bank details */}
          <div style={{ borderTop: `1px solid ${BB}`, paddingTop: 12 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: GL, fontWeight: 700, fontFamily: FD, marginBottom: 8 }}>Banking Details</div>
            {hasBankDetails ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Bank',           value: row.bankName      },
                  { label: 'Account Number', value: row.accountNumber },
                  { label: 'Branch Code',    value: row.branchCode    },
                ].filter(r => r.value).map(r => (
                  <div key={r.label} style={{ background: BLK1, padding: '8px 10px', borderRadius: 3 }}>
                    <div style={{ fontSize: 8, color: W2, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2, fontFamily: FB }}>{r.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: W, fontFamily: FD }}>{r.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: CORAL, fontFamily: FB }}>⚠ Promoter has not provided banking details yet.</div>
            )}
          </div>
        </div>

        {/* Optional reference */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: W4, display: 'block', marginBottom: 7, fontFamily: FD }}>Payment Reference (optional)</label>
          <input value={ref} onChange={e => setRef(e.target.value)} placeholder="e.g. EFT ref, transaction ID…"
            style={{ width: '100%', background: hex2rgba(GL, 0.04), border: `1px solid ${BB}`, padding: '11px 14px', color: W, fontFamily: FB, fontSize: 13, outline: 'none', borderRadius: 3, boxSizing: 'border-box' }}
            onFocus={e => e.currentTarget.style.borderColor = GL}
            onBlur={e => e.currentTarget.style.borderColor = BB} />
        </div>

        {/* Notice */}
        <div style={{ padding: '10px 14px', background: hex2rgba(GL, 0.04), border: `1px solid ${BB}`, borderRadius: 3, fontSize: 11, color: W4, fontFamily: FB, lineHeight: 1.6, marginBottom: 20 }}>
          By confirming, you acknowledge that you have transferred R{row.netAmount.toLocaleString('en-ZA')} to {row.promoterName}. The promoter will be notified that payment is on the way.
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', background: 'transparent', border: `1px solid ${BB}`, color: W4, fontFamily: FD, fontSize: 11, cursor: 'pointer', borderRadius: 3 }}>Cancel</button>
          <button onClick={() => onConfirm(ref)} disabled={saving}
            style={{ flex: 2, padding: '12px', background: saving ? BB : `linear-gradient(135deg,${GL},${GD})`, border: 'none', color: saving ? W4 : BLK1, fontFamily: FD, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', cursor: saving ? 'not-allowed' : 'pointer', borderRadius: 3 }}>
            {saving ? 'Processing…' : `Confirm — Pay R${row.netAmount.toLocaleString('en-ZA')}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add Funds modal — top up the campaign funding balance ───────────────────
function AddFundsModal({ balance, onConfirm, onClose, saving, message }: {
  balance:   number
  onConfirm: (amount: number) => void
  onClose:   () => void
  saving:    boolean
  message:   string
}) {
  const [amount, setAmount] = useState('')
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: BLK2, border: `1px solid ${BB}`, padding: '36px 40px', width: '100%', maxWidth: 420, position: 'relative', borderRadius: 4 }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${GD3},${GL},${GD3})` }} />
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 18, background: 'none', border: 'none', cursor: 'pointer', color: W4, fontSize: 18 }}>✕</button>

        <div style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: GL, fontWeight: 700, fontFamily: FD, marginBottom: 6 }}>Campaign Funding</div>
        <h3 style={{ fontFamily: FD, fontSize: 20, fontWeight: 700, color: W, marginBottom: 4 }}>Current balance: {fmtZAR(balance)}</h3>
        <p style={{ fontSize: 12, color: W4, fontFamily: FB, marginBottom: 20 }}>Every job you post draws down this balance automatically. Top up below.</p>

        <label style={{ display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: W4, marginBottom: 7, fontFamily: FD }}>Amount (ZAR)</label>
        <input type="number" min={1} placeholder="e.g. 20000" value={amount} onChange={e => setAmount(e.target.value)}
          style={{ width: '100%', background: hex2rgba(GL, 0.04), border: `1px solid ${BB}`, padding: '12px 14px', color: W, fontFamily: FB, fontSize: 14, outline: 'none', borderRadius: 3, marginBottom: 14, boxSizing: 'border-box' }}
          onFocus={e => e.currentTarget.style.borderColor = GL} onBlur={e => e.currentTarget.style.borderColor = BB} />

        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {[5000, 20000, 50000, 100000].map(v => (
            <button key={v} onClick={() => setAmount(String(v))}
              style={{ flex: 1, padding: '8px 4px', background: hex2rgba(GL, 0.08), border: `1px solid ${BB}`, color: GL, fontFamily: FD, fontSize: 11, fontWeight: 700, cursor: 'pointer', borderRadius: 3 }}>
              R{v / 1000}k
            </button>
          ))}
        </div>

        {message && (
          <div style={{ padding: '10px 14px', background: hex2rgba(GL, 0.1), border: `1px solid ${hex2rgba(GL, 0.4)}`, borderRadius: 3, fontSize: 12, color: GL, fontFamily: FD, marginBottom: 16 }}>
            {message}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', background: 'transparent', border: `1px solid ${BB}`, color: W4, fontFamily: FD, fontSize: 11, cursor: 'pointer', borderRadius: 3 }}>Cancel</button>
          <button onClick={() => { const n = parseInt(amount, 10); if (n > 0) onConfirm(n) }} disabled={saving}
            style={{ flex: 2, padding: '12px', background: saving ? BB : `linear-gradient(135deg,${GL},${GD})`, border: 'none', color: saving ? W4 : BLK1, fontFamily: FD, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', cursor: saving ? 'not-allowed' : 'pointer', borderRadius: 3 }}>
            {saving ? 'Adding…' : 'Add Funds'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BusinessPayroll() {
  const [rows,        setRows       ] = useState<PayRow[]>([])
  const [loading,     setLoading    ] = useState(true)
  const [sortBy,      setSortBy     ] = useState<SortKey>('jobDate')
  const [filter,      setFilter     ] = useState('all')
  const [markingRow,  setMarkingRow ] = useState<PayRow | null>(null)
  const [saving,      setSaving     ] = useState(false)
  const [toast,       setToast      ] = useState('')

  // ── Campaign funding balance + ledger ("where the money goes") ────────────
  const [balance,       setBalance      ] = useState(0)
  const [ledger,        setLedger       ] = useState<LedgerEntry[]>([])
  const [ledgerLoading, setLedgerLoading] = useState(true)
  const [fundsModalOpen,setFundsModalOpen] = useState(false)
  const [topUpBusy,     setTopUpBusy    ] = useState(false)
  const [topUpMsg,      setTopUpMsg     ] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/payments/business`, { headers: authHdr() as any })
      if (res.ok) {
        const data: any[] = await res.json()
        const mapped: PayRow[] = data.map(p => ({
          id:            p.id,
          promoterId:    p.promoter?.id        || '',
          promoterName:  p.promoter?.fullName  || 'Unknown',
          promoterEmail: p.promoter?.email     || '',
          promoterPhone: p.promoter?.phone     || '',
          bankName:      p.promoter?.bankName      || '',
          accountNumber: p.promoter?.accountNumber || '',
          branchCode:    p.promoter?.branchCode    || '',
          jobTitle:      p.shift?.job?.title    || 'Unknown Job',
          jobDate:       p.shift?.job?.date     || '',
          hourlyRate:    p.shift?.job?.hourlyRate || 0,
          hoursWorked:   p.shift?.hoursWorked   || (p.grossAmount / (p.shift?.job?.hourlyRate || 1)),
          grossAmount:   p.grossAmount          || 0,
          deductions:    p.deductions           || 0,
          netAmount:     p.netAmount            || 0,
          status:        (p.status              || 'pending').toLowerCase(),
          paidAt:        p.paidAt,
          reference:     p.reference,
        }))
        setRows(mapped)
      }
    } catch (e) { console.error('[BusinessPayroll] load error:', e) }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const onUpdate = () => load()
    window.addEventListener('payment-updated', onUpdate)
    return () => window.removeEventListener('payment-updated', onUpdate)
  }, [load])

  const loadLedger = useCallback(async () => {
    setLedgerLoading(true)
    try {
      const res = await fetch(`${API}/users/me/credit/ledger`, { headers: authHdr() as any })
      if (res.ok) {
        const data = await res.json()
        setBalance(data.creditBalance ?? 0)
        setLedger(data.entries || [])
      }
    } catch (e) { console.error('[BusinessPayroll] ledger load error:', e) }
    setLedgerLoading(false)
  }, [])

  useEffect(() => {
    loadLedger()
    const onCreditUpdate = () => loadLedger()
    window.addEventListener('hg_credit_updated', onCreditUpdate)
    return () => window.removeEventListener('hg_credit_updated', onCreditUpdate)
  }, [loadLedger])

  const handleTopUp = async (amount: number) => {
    setTopUpBusy(true); setTopUpMsg('')
    try {
      const res = await fetch(`${API}/users/me/credit/topup`, {
        method: 'POST', headers: authHdrJson() as any, body: JSON.stringify({ amount }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setBalance(data.creditBalance ?? 0)
        setTopUpMsg(`Added ${fmtZAR(amount)} — new balance ${fmtZAR(data.creditBalance)}`)
        await loadLedger()
        window.dispatchEvent(new Event('hg_credit_updated'))
        setTimeout(() => { setFundsModalOpen(false); setTopUpMsg('') }, 1600)
      } else {
        setTopUpMsg(data.error || 'Failed to add funds')
      }
    } catch {
      setTopUpMsg('Network error — please try again')
    }
    setTopUpBusy(false)
  }

  const handleMarkPaid = async (ref: string) => {
    if (!markingRow) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/payments/${markingRow.id}/mark-paid`, {
        method:  'PUT',
        headers: { ...authHdr(), 'Content-Type': 'application/json' } as any,
        body:    JSON.stringify({ reference: ref || undefined }),
      })
      if (res.ok) {
        setMarkingRow(null)
        showToast(`Payment of R${markingRow.netAmount.toLocaleString('en-ZA')} to ${markingRow.promoterName} marked as paid.`)
        await load()
        window.dispatchEvent(new Event('payment-updated'))
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.error || 'Failed to mark as paid')
      }
    } catch { showToast('Network error — please try again') }
    setSaving(false)
  }

  const filtered = rows.filter(r => filter === 'all' || r.status === filter)
  const sorted   = [...filtered].sort((a, b) => {
    if (sortBy === 'netAmount')    return b.netAmount - a.netAmount
    if (sortBy === 'promoterName') return a.promoterName.localeCompare(b.promoterName)
    if (sortBy === 'jobDate')      return b.jobDate.localeCompare(a.jobDate)
    return a.status.localeCompare(b.status)
  })

  const grandTotal   = sorted.reduce((acc, r) => acc + r.netAmount, 0)
  const totalPending = rows.filter(r => r.status === 'pending').reduce((a, r) => a + r.netAmount, 0)

  const statusColor = (s: string) =>
    s === 'paid' ? GREEN : s === 'approved' ? GL : s === 'pending' ? GD : W4

  const statusLabel = (s: string) =>
    s === 'paid' ? 'Paid' : s === 'approved' ? 'Approved' : s === 'pending' ? 'Pending' : s

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', background: BLK2, border: `1px solid ${GL}`, borderRadius: 4, fontSize: 13, color: GL, fontFamily: FD, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', maxWidth: 360 }}>
          ✓ {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.36em', textTransform: 'uppercase', color: GL, marginBottom: 8, fontWeight: 700, fontFamily: FD }}>Finance · Payroll</div>
        <h1 style={{ fontFamily: FD, fontSize: 'clamp(22px,3vw,34px)', fontWeight: 700, color: W }}>Earnings Summary</h1>
        <p style={{ fontSize: 13, color: W4, marginTop: 6, fontFamily: FB }}>Promoter payout overview for your campaigns.</p>
      </div>

      {/* ── Campaign Funding Balance — clear, obvious, top up right here ── */}
      {(() => {
        const isCritical = balance <= 0
        const isLow      = !isCritical && balance < 2000
        const stateColor = isCritical ? CORAL : isLow ? '#D8B26A' : GL
        const stateLabel = isCritical ? 'No funds available' : isLow ? 'Running low' : 'Healthy'
        return (
          <div style={{
            marginBottom: 28, background: BLK2, border: `1px solid ${hex2rgba(stateColor, 0.4)}`,
            borderRadius: 4, padding: '24px 28px', position: 'relative', overflow: 'hidden',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${GD3},${stateColor},${GD3})` }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: W4, fontFamily: FD, fontWeight: 700 }}>Campaign Funding Balance</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 9px', borderRadius: 20, background: hex2rgba(stateColor, 0.12), border: `1px solid ${hex2rgba(stateColor, 0.4)}` }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: stateColor }} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: stateColor, fontFamily: FD, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{stateLabel}</span>
                </span>
              </div>
              <div style={{ fontFamily: FD, fontSize: 40, fontWeight: 700, color: W, lineHeight: 1 }}>{fmtZAR(balance)}</div>
              <p style={{ fontSize: 12, color: W4, marginTop: 8, fontFamily: FB }}>
                {isCritical
                  ? "You're out of funds — top up before your next campaign draws on this balance."
                  : isLow
                  ? 'Your balance is getting low. Top up to avoid interruptions when booking new campaigns.'
                  : 'Every job you post, and every promoter you pay out, draws from this balance.'}
              </p>
            </div>
            <button onClick={() => setFundsModalOpen(true)}
              style={{ padding: '13px 26px', background: `linear-gradient(135deg,${GL},${GD})`, border: 'none', color: BLK1, fontFamily: FD, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer', borderRadius: 3, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {isLow || isCritical ? '+ Top Up Now' : '+ Add Funds'}
            </button>
          </div>
        )
      })()}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: BB, marginBottom: 28 }}>
        {[
          { label: 'Total Payout',    value: `R ${grandTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,   color: GL  },
          { label: 'Pending Payment', value: `R ${totalPending.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, color: GD  },
          { label: 'Promoters',       value: new Set(rows.map(r => r.promoterEmail)).size,                               color: GD  },
          { label: 'Paid Records',    value: rows.filter(r => r.status === 'paid').length,                               color: GD2 },
        ].map((s, i) => (
          <div key={i} style={{ background: BLK2, padding: '22px 20px', position: 'relative', borderRadius: 2 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${GD3},${s.color},${GD3})` }} />
            <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: W4, fontFamily: FD, marginBottom: 10 }}>{s.label}</div>
            <div style={{ fontFamily: FD, fontSize: 28, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters + sort */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {['all','pending','approved','paid'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '6px 14px', background: filter===f?hex2rgba(f==='all'?GL:statusColor(f),0.14):'transparent', border: `1px solid ${filter===f?(f==='all'?GL:statusColor(f)):BB}`, color: filter===f?(f==='all'?GL:statusColor(f)):W4, fontFamily: FD, fontSize: 9, fontWeight: filter===f?700:400, cursor: 'pointer', borderRadius: 2, letterSpacing: '0.1em' }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && <span style={{ marginLeft: 5, opacity: 0.7 }}>({rows.filter(r => r.status===f).length})</span>}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
          <button onClick={load} style={{ padding: '5px 12px', background: 'transparent', border: `1px solid ${BB}`, color: W4, fontFamily: FB, fontSize: 9, cursor: 'pointer', borderRadius: 2 }}
            onMouseEnter={e=>e.currentTarget.style.borderColor=GL} onMouseLeave={e=>e.currentTarget.style.borderColor=BB}>
            Refresh
          </button>
          {(['jobDate','netAmount','promoterName','status'] as SortKey[]).map(s => (
            <button key={s} onClick={() => setSortBy(s)}
              style={{ padding: '6px 12px', background: sortBy===s?hex2rgba(GL,0.1):'transparent', border: `1px solid ${sortBy===s?hex2rgba(GL,0.4):BB}`, color: sortBy===s?GL:W4, fontFamily: FD, fontSize: 9, fontWeight: sortBy===s?700:400, cursor: 'pointer', borderRadius: 2, letterSpacing: '0.1em' }}>
              {s==='netAmount'?'By Amount':s==='promoterName'?'By Name':s==='jobDate'?'By Date':'By Status'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: BLK2, border: `1px solid ${BB}`, overflow: 'hidden', borderRadius: 3 }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: W4, fontFamily: FD }}>Loading payroll data…</div>
        ) : sorted.length === 0 ? (
          <div style={{ padding: '60px 48px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>💳</div>
            <p style={{ fontFamily: FD, fontSize: 18, color: W4, marginBottom: 6 }}>No payroll data yet</p>
            <p style={{ fontFamily: FB, fontSize: 12, color: W2 }}>Payout records appear automatically once promoters complete shifts on your jobs.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BB}`, background: BLK1 }}>
                {['Promoter','Bank Details','Job','Date','Rate','Hours','Gross','Net Payout','Status','Action'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: W2, fontFamily: FD, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r.id}
                  style={{ borderBottom: i < sorted.length-1 ? `1px solid ${BB}` : 'none', transition: 'background 0.18s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = BLK3)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                  {/* Promoter */}
                  <td style={{ padding: '14px 14px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: W, fontFamily: FD }}>{r.promoterName}</div>
                    <div style={{ fontSize: 10, color: W4, fontFamily: FB }}>{r.promoterEmail}</div>
                    {r.promoterPhone && <div style={{ fontSize: 10, color: W4, fontFamily: FB }}>{r.promoterPhone}</div>}
                  </td>

                  {/* Bank Details — visible to business */}
                  <td style={{ padding: '14px 14px' }}>
                    {r.bankName || r.accountNumber ? (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: W7, fontFamily: FD }}>{r.bankName || '—'}</div>
                        <div style={{ fontSize: 10, color: W4, fontFamily: FB, letterSpacing: '0.04em' }}>{r.accountNumber || '—'}</div>
                        {r.branchCode && <div style={{ fontSize: 9, color: W2, fontFamily: FB }}>Branch: {r.branchCode}</div>}
                      </div>
                    ) : (
                      <span style={{ fontSize: 10, color: CORAL, fontFamily: FB }}>Not provided</span>
                    )}
                  </td>

                  {/* Job */}
                  <td style={{ padding: '14px 14px', fontSize: 12, color: W7, fontFamily: FB, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.jobTitle}</td>

                  {/* Date */}
                  <td style={{ padding: '14px 14px', fontSize: 11, color: W4, fontFamily: FB, whiteSpace: 'nowrap' }}>
                    {r.jobDate ? new Date(r.jobDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>

                  {/* Rate */}
                  <td style={{ padding: '14px 14px', fontSize: 12, color: W4, fontFamily: FD, whiteSpace: 'nowrap' }}>
                    {r.hourlyRate > 0 ? `R${r.hourlyRate}/hr` : '—'}
                  </td>

                  {/* Hours */}
                  <td style={{ padding: '14px 14px', fontSize: 12, color: W, fontFamily: FD }}>
                    {r.hoursWorked > 0 ? r.hoursWorked.toFixed(2) + 'h' : '—'}
                  </td>

                  {/* Gross */}
                  <td style={{ padding: '14px 14px', fontSize: 12, color: W, fontFamily: FD }}>
                    R{r.grossAmount.toLocaleString('en-ZA')}
                  </td>

                  {/* Net */}
                  <td style={{ padding: '14px 14px' }}>
                    <span style={{ fontFamily: FD, fontSize: 15, fontWeight: 700, color: GL }}>R{r.netAmount.toLocaleString('en-ZA')}</span>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '14px 14px' }}>
                    <div>
                      <span style={{ fontSize: 9, fontWeight: 700, color: statusColor(r.status), background: hex2rgba(statusColor(r.status), 0.1), border: `1px solid ${hex2rgba(statusColor(r.status), 0.4)}`, padding: '3px 9px', borderRadius: 2, fontFamily: FD, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        {statusLabel(r.status)}
                      </span>
                      {r.status === 'paid' && r.paidAt && (
                        <div style={{ fontSize: 9, color: W2, marginTop: 3, fontFamily: FB }}>
                          {new Date(r.paidAt).toLocaleDateString('en-ZA')}
                          {r.reference && <span style={{ marginLeft: 4 }}>· {r.reference}</span>}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Action — Mark as Paid button */}
                  <td style={{ padding: '14px 14px' }}>
                    {r.status !== 'paid' ? (
                      <button onClick={() => setMarkingRow(r)}
                        style={{ padding: '6px 14px', background: hex2rgba(GL, 0.1), border: `1px solid ${hex2rgba(GL, 0.4)}`, color: GL, fontFamily: FD, fontSize: 10, fontWeight: 700, cursor: 'pointer', borderRadius: 3, whiteSpace: 'nowrap', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = hex2rgba(GL, 0.2) }}
                        onMouseLeave={e => { e.currentTarget.style.background = hex2rgba(GL, 0.1) }}>
                        Mark Paid
                      </button>
                    ) : (
                      <span style={{ fontSize: 10, color: GREEN, fontFamily: FD }}>✓ Done</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `2px solid ${BB}`, background: hex2rgba(GL, 0.04) }}>
                <td colSpan={7} style={{ padding: '14px 14px', fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: GL, fontFamily: FD }}>Grand Total</td>
                <td style={{ padding: '14px 14px' }}>
                  <span style={{ fontFamily: FD, fontSize: 18, fontWeight: 700, color: GL }}>
                    R {grandTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </span>
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Export */}
      {sorted.length > 0 && (
        <div style={{ marginTop: 14, padding: '12px 16px', border: `1px solid ${BB}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 2 }}>
          <p style={{ fontFamily: FB, fontSize: 11, color: W4 }}>
            Payments are automatically created when promoters check out. Use "Mark Paid" after transferring funds.
          </p>
          <button
            onClick={() => {
              const csv = [
                ['Promoter','Email','Phone','Bank','Account','Branch','Job','Date','Rate','Hours','Gross','Net','Status','Paid At','Reference'],
                ...sorted.map(r => [
                  r.promoterName, r.promoterEmail, r.promoterPhone,
                  r.bankName, r.accountNumber, r.branchCode,
                  r.jobTitle, r.jobDate ? new Date(r.jobDate).toLocaleDateString('en-ZA') : '',
                  r.hourlyRate, r.hoursWorked.toFixed(2),
                  r.grossAmount, r.netAmount,
                  r.status, r.paidAt || '', r.reference || '',
                ]),
              ].map(row => row.join(',')).join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url  = URL.createObjectURL(blob)
              const a    = document.createElement('a')
              a.href = url; a.download = 'campari-promotions-payroll.csv'; a.click()
              URL.revokeObjectURL(url)
            }}
            style={{ fontFamily: FD, fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', background: 'transparent', border: `1px solid ${hex2rgba(GL, 0.4)}`, color: GL, padding: '8px 18px', cursor: 'pointer', borderRadius: 2, flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.background = hex2rgba(GL, 0.1)}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            Export CSV
          </button>
          <button
            onClick={() => downloadPDF(
              'Payroll Report', 'Campari Promotions · Promoter Payout Overview',
              ['Promoter','Job','Date','Rate','Hours','Gross','Net','Status'],
              sorted.map(r => [
                r.promoterName, r.jobTitle,
                r.jobDate ? new Date(r.jobDate).toLocaleDateString('en-ZA') : '',
                r.hourlyRate ? `R${r.hourlyRate}/hr` : '—', r.hoursWorked.toFixed(2),
                `R${r.grossAmount.toLocaleString('en-ZA')}`, `R${r.netAmount.toLocaleString('en-ZA')}`,
                statusLabel(r.status),
              ]),
              'Grand Total', `R ${grandTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
            )}
            style={{ marginLeft: 8, fontFamily: FD, fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', background: 'transparent', border: `1px solid ${hex2rgba(GL, 0.4)}`, color: GL, padding: '8px 18px', cursor: 'pointer', borderRadius: 2, flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.background = hex2rgba(GL, 0.1)}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            Export PDF
          </button>
        </div>
      )}

      {/* ── Balance Activity — top-ups + campaign spend, so businesses can see
           exactly where their money goes ── */}
      <div style={{ marginTop: 36, background: BLK2, border: `1px solid ${BB}`, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${BB}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.26em', textTransform: 'uppercase', color: GL, fontWeight: 700, fontFamily: FD }}>Balance Activity</div>
            <p style={{ fontSize: 11.5, color: W4, fontFamily: FB, marginTop: 4 }}>Every top-up and every campaign spend against your funding balance.</p>
          </div>
          {ledger.length > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => downloadCSV('campari-promotions-balance-activity.csv',
                  ['Date','Type','Description','Amount'],
                  ledger.map(e => [
                    new Date(e.createdAt).toLocaleString('en-ZA'),
                    e.type === 'topup' ? 'Top-Up' : e.type === 'refund' ? 'Refund' : 'Campaign Spend',
                    e.description,
                    e.type === 'spend' ? -e.amount : e.amount,
                  ]))}
                style={{ fontFamily: FD, fontSize: 9, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', background: 'transparent', border: `1px solid ${hex2rgba(GL, 0.4)}`, color: GL, padding: '6px 14px', cursor: 'pointer', borderRadius: 2 }}>
                Export CSV
              </button>
              <button
                onClick={() => downloadPDF(
                  'Balance Activity Report', 'Campari Promotions · Campaign Funding Ledger',
                  ['Date', 'Type', 'Description', 'Amount'],
                  ledger.map(e => [
                    new Date(e.createdAt).toLocaleDateString('en-ZA'),
                    e.type === 'topup' ? 'Top-Up' : e.type === 'refund' ? 'Refund' : 'Campaign Spend',
                    e.description,
                    `${e.type === 'spend' ? '-' : '+'}${fmtZAR(e.amount)}`,
                  ]),
                  'Current Balance', fmtZAR(balance),
                )}
                style={{ fontFamily: FD, fontSize: 9, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', background: 'transparent', border: `1px solid ${hex2rgba(GL, 0.4)}`, color: GL, padding: '6px 14px', cursor: 'pointer', borderRadius: 2 }}>
                Export PDF
              </button>
            </div>
          )}
        </div>

        {ledgerLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: W4, fontFamily: FD }}>Loading balance activity…</div>
        ) : ledger.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontFamily: FD, fontSize: 14, color: W4 }}>No activity yet.</p>
            <p style={{ fontFamily: FB, fontSize: 11.5, color: W2, marginTop: 4 }}>Top-ups and campaign spend will appear here as they happen.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BB}`, background: BLK1 }}>
                {['Date', 'Type', 'Description', 'Amount'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: W2, fontFamily: FD }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ledger.slice(0, 100).map((e, i) => {
                const isSpend = e.type === 'spend'
                const color   = isSpend ? CORAL : GREEN
                const label   = e.type === 'topup' ? 'Top-Up' : e.type === 'refund' ? 'Refund' : 'Campaign Spend'
                return (
                  <tr key={e.id} style={{ borderBottom: i < ledger.length - 1 ? `1px solid ${BB}` : 'none' }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = BLK3)}
                    onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '12px 14px', fontSize: 11, color: W4, fontFamily: FB, whiteSpace: 'nowrap' }}>
                      {new Date(e.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color, background: hex2rgba(color, 0.1), border: `1px solid ${hex2rgba(color, 0.35)}`, padding: '3px 9px', borderRadius: 2, fontFamily: FD, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: W7, fontFamily: FB }}>{e.description}</td>
                    <td style={{ padding: '12px 14px', fontFamily: FD, fontSize: 13, fontWeight: 700, color }}>
                      {isSpend ? '-' : '+'}{fmtZAR(e.amount)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Funds modal */}
      {fundsModalOpen && (
        <AddFundsModal
          balance={balance}
          onConfirm={handleTopUp}
          onClose={() => { setFundsModalOpen(false); setTopUpMsg('') }}
          saving={topUpBusy}
          message={topUpMsg}
        />
      )}

      {/* Mark as Paid modal */}
      {markingRow && (
        <MarkPaidModal
          row={markingRow}
          onConfirm={handleMarkPaid}
          onClose={() => setMarkingRow(null)}
          saving={saving}
        />
      )}
    </div>
  )
}