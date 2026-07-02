import { useEffect, useState } from 'react'
import { AdminLayout } from '../AdminLayout'
import { injectAdminMobileStyles } from '../adminMobileStyles'
import { purchaseOrdersService } from '../../shared/services/purchaseOrdersService'
import { apiFetch } from '../../shared/services/api'
import type { PurchaseOrder, CommitmentEntry, CEStatus } from '../../shared/types/purchaseOrder.types'

const G   = '#8F8A7C'
const GL  = '#C9BFA6'
const B   = '#050504'
const D2  = '#0A0A08'
const BB  = 'rgba(170,160,135,0.16)'
const BB2 = 'rgba(170,160,135,0.06)'
const W   = '#F0F0F0'
const W55 = 'rgba(214,214,214,0.90)'
const W28 = 'rgba(187,187,187,0.80)'
const GREEN = '#4ade80'
const AMBER = '#E8B85C'
const CORAL = '#C4614A'
const FD  = "'Playfair Display', Georgia, serif"

function hex2rgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

const fmtZAR = (n: number) => `R${n.toLocaleString('en-ZA')}`

interface ClientOpt { id: string; name: string }
interface JobOpt { id: string; title: string }

const CE_COLOR: Record<CEStatus, string> = { pending: AMBER, approved: GREEN, cancelled: '#8A8474' }

function StatusBadge({ status, colorMap }: { status: string; colorMap: Record<string, string> }) {
  const color = colorMap[status] || GL
  return (
    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: FD, color, background: hex2rgba(color, 0.12), border: `1px solid ${hex2rgba(color, 0.45)}`, padding: '3px 10px', borderRadius: 3 }}>
      {status}
    </span>
  )
}

function ProgressBar({ pct }: { pct: number }) {
  const color = pct >= 100 ? CORAL : pct >= 80 ? AMBER : GREEN
  return (
    <div style={{ height: 6, borderRadius: 3, background: BB2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, transition: 'width 0.3s' }} />
    </div>
  )
}

export default function BudgetTracking() {
  const [pos, setPos]           = useState<PurchaseOrder[]>([])
  const [clients, setClients]   = useState<ClientOpt[]>([])
  const [jobs, setJobs]         = useState<JobOpt[]>([])
  const [loading, setLoading]   = useState(true)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [ceFilter, setCeFilter] = useState<CEStatus | 'all'>('all')

  const [showNewPO, setShowNewPO] = useState(false)
  const [poForm, setPoForm] = useState({ clientId: '', poNumber: '', amount: '', periodStart: '', periodEnd: '', description: '' })
  const [poError, setPoError] = useState('')
  const [poSaving, setPoSaving] = useState(false)

  const [showNewCE, setShowNewCE] = useState(false)
  const [ceForm, setCeForm] = useState({ jobId: '', ceNumber: '', amount: '', notes: '' })
  const [ceError, setCeError] = useState('')
  const [ceSaving, setCeSaving] = useState(false)

  useEffect(() => { injectAdminMobileStyles() }, [])

  useEffect(() => {
    (async () => {
      try { setClients(await apiFetch<ClientOpt[]>('/admin/clients')) } catch { /* non-fatal */ }
      try { setJobs((await apiFetch<any[]>('/jobs')).map(j => ({ id: j.id, title: j.title }))) } catch { /* non-fatal */ }
    })()
  }, [])

  const loadPOs = async () => {
    setLoading(true)
    try {
      const data = await purchaseOrdersService.getAll()
      setPos(data)
      setSelectedPO(prev => (prev ? data.find(p => p.id === prev.id) || null : prev))
    } catch { setPos([]) }
    setLoading(false)
  }

  useEffect(() => { loadPOs() }, [])

  const createPO = async () => {
    setPoError('')
    if (!poForm.clientId || !poForm.poNumber || !poForm.amount || !poForm.periodStart || !poForm.periodEnd) {
      setPoError('Client, PO number, amount and period dates are required.')
      return
    }
    setPoSaving(true)
    try {
      await purchaseOrdersService.create({
        clientId: poForm.clientId,
        poNumber: poForm.poNumber,
        amount: parseInt(poForm.amount, 10),
        periodStart: poForm.periodStart,
        periodEnd: poForm.periodEnd,
        description: poForm.description || undefined,
      })
      setShowNewPO(false)
      setPoForm({ clientId: '', poNumber: '', amount: '', periodStart: '', periodEnd: '', description: '' })
      loadPOs()
    } catch (err: any) {
      setPoError(err?.message || 'Failed to create purchase order')
    }
    setPoSaving(false)
  }

  const releaseCE = async (allowOverride: boolean) => {
    if (!selectedPO) return
    setCeSaving(true)
    try {
      await purchaseOrdersService.createCommitment({
        purchaseOrderId: selectedPO.id,
        jobId: ceForm.jobId || undefined,
        ceNumber: ceForm.ceNumber || undefined,
        amount: parseInt(ceForm.amount, 10),
        notes: ceForm.notes || undefined,
        allowOverride,
      })
      setShowNewCE(false)
      setCeForm({ jobId: '', ceNumber: '', amount: '', notes: '' })
      loadPOs()
    } catch (err: any) {
      if (err?.message?.includes('exceed') && !allowOverride) {
        if (window.confirm(`${err.message}\n\nRelease it anyway?`)) {
          await releaseCE(true)
          setCeSaving(false)
          return
        }
      } else {
        setCeError(err?.message || 'Failed to release CE')
      }
    }
    setCeSaving(false)
  }

  const createCE = async () => {
    setCeError('')
    if (!ceForm.amount) { setCeError('Amount is required.'); return }
    await releaseCE(false)
  }

  const updateCEStatus = async (ce: CommitmentEntry, status: CEStatus) => {
    try {
      await purchaseOrdersService.updateCommitment(ce.id, { status })
      loadPOs()
    } catch { /* surfaced via reload */ }
  }

  const totalBudget    = pos.reduce((s, p) => s + p.amount, 0)
  const totalCommitted = pos.reduce((s, p) => s + p.committedAmount, 0)
  const totalRemaining = totalBudget - totalCommitted

  const filteredCEs = selectedPO?.commitments?.filter(c => ceFilter === 'all' || c.status === ceFilter) || []

  return (
    <AdminLayout>
      <div style={{ padding: '28px 32px 60px', background: B, minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: GL, marginBottom: 8, fontWeight: 700, fontFamily: FD }}>Finance</div>
            <h1 style={{ fontFamily: FD, fontSize: 26, fontWeight: 700, color: W, marginBottom: 4 }}>Purchase Orders &amp; Budget Tracking</h1>
            <p style={{ fontSize: 13, color: W28 }}>Track client POs and each Commitment Entry (CE) released against them, so budgets never run over.</p>
          </div>
          <button onClick={() => setShowNewPO(true)} style={{ padding: '11px 22px', background: hex2rgba(GL, 0.18), border: `1px solid ${GL}`, color: GL, borderRadius: 4, fontFamily: FD, fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            + New Purchase Order
          </button>
        </div>

        {/* ── Totals ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 26 }}>
          <div style={{ background: D2, border: `1px solid ${BB}`, borderRadius: 6, padding: '16px 18px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: W28, fontFamily: FD, marginBottom: 8 }}>Total PO Value</div>
            <div style={{ fontSize: 26, fontWeight: 700, fontFamily: FD, color: GL }}>{fmtZAR(totalBudget)}</div>
          </div>
          <div style={{ background: D2, border: `1px solid ${BB}`, borderRadius: 6, padding: '16px 18px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: W28, fontFamily: FD, marginBottom: 8 }}>Committed (Pending + Approved)</div>
            <div style={{ fontSize: 26, fontWeight: 700, fontFamily: FD, color: AMBER }}>{fmtZAR(totalCommitted)}</div>
          </div>
          <div style={{ background: D2, border: `1px solid ${BB}`, borderRadius: 6, padding: '16px 18px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: W28, fontFamily: FD, marginBottom: 8 }}>Remaining</div>
            <div style={{ fontSize: 26, fontWeight: 700, fontFamily: FD, color: totalRemaining < 0 ? CORAL : GREEN }}>{fmtZAR(totalRemaining)}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selectedPO ? '1fr 1.3fr' : '1fr', gap: 20 }}>
          {/* ── PO list ── */}
          <div style={{ background: D2, border: `1px solid ${BB}`, borderRadius: 6, overflow: 'hidden', height: 'fit-content' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: BB2 }}>
                  {['Client', 'PO #', 'Amount', 'Committed', 'Status'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: W28, fontFamily: FD, borderBottom: `1px solid ${BB}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: W28 }}>Loading…</td></tr>}
                {!loading && pos.length === 0 && <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: W28 }}>No purchase orders yet.</td></tr>}
                {pos.map(p => (
                  <tr key={p.id} onClick={() => setSelectedPO(p)} style={{ cursor: 'pointer', background: selectedPO?.id === p.id ? hex2rgba(GL, 0.08) : 'transparent' }}>
                    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${BB2}`, color: W, fontSize: 13, fontWeight: 600 }}>{p.client?.name || '—'}</td>
                    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${BB2}`, color: W55, fontSize: 12.5 }}>{p.poNumber}</td>
                    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${BB2}`, color: W55, fontSize: 12.5 }}>{fmtZAR(p.amount)}</td>
                    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${BB2}`, width: 160 }}>
                      <div style={{ marginBottom: 4, fontSize: 11.5, color: W55 }}>{fmtZAR(p.committedAmount)} ({p.percentCommitted}%)</div>
                      <ProgressBar pct={p.percentCommitted} />
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${BB2}` }}><StatusBadge status={p.status} colorMap={{ active: GREEN, closed: G, cancelled: CORAL }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── PO detail + CEs ── */}
          {selectedPO && (
            <div style={{ background: D2, border: `1px solid ${BB}`, borderRadius: 6, padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <h3 style={{ fontFamily: FD, fontSize: 18, color: W, marginBottom: 2 }}>{selectedPO.poNumber} — {selectedPO.client?.name}</h3>
                  <p style={{ fontSize: 12, color: W28 }}>
                    {new Date(selectedPO.periodStart).toLocaleDateString()} → {new Date(selectedPO.periodEnd).toLocaleDateString()}
                  </p>
                </div>
                <button onClick={() => setSelectedPO(null)} style={{ background: 'transparent', border: 'none', color: W28, cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, margin: '16px 0 20px' }}>
                <div style={{ background: BB2, borderRadius: 4, padding: '10px 12px' }}>
                  <div style={{ fontSize: 9, color: W28, textTransform: 'uppercase', marginBottom: 4 }}>PO Value</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: GL, fontFamily: FD }}>{fmtZAR(selectedPO.amount)}</div>
                </div>
                <div style={{ background: BB2, borderRadius: 4, padding: '10px 12px' }}>
                  <div style={{ fontSize: 9, color: W28, textTransform: 'uppercase', marginBottom: 4 }}>Approved</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: GREEN, fontFamily: FD }}>{fmtZAR(selectedPO.approvedAmount)}</div>
                </div>
                <div style={{ background: BB2, borderRadius: 4, padding: '10px 12px' }}>
                  <div style={{ fontSize: 9, color: W28, textTransform: 'uppercase', marginBottom: 4 }}>Pending</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: AMBER, fontFamily: FD }}>{fmtZAR(selectedPO.pendingAmount)}</div>
                </div>
                <div style={{ background: BB2, borderRadius: 4, padding: '10px 12px' }}>
                  <div style={{ fontSize: 9, color: W28, textTransform: 'uppercase', marginBottom: 4 }}>Remaining</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: selectedPO.remainingAmount < 0 ? CORAL : W, fontFamily: FD }}>{fmtZAR(selectedPO.remainingAmount)}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['all', 'pending', 'approved', 'cancelled'] as const).map(s => (
                    <button key={s} onClick={() => setCeFilter(s)} style={{ padding: '6px 12px', border: `1px solid ${ceFilter === s ? GL : 'rgba(170,160,135,0.22)'}`, cursor: 'pointer', fontFamily: FD, fontSize: 10, borderRadius: 3, background: ceFilter === s ? hex2rgba(GL, 0.18) : 'transparent', color: ceFilter === s ? GL : W55, textTransform: 'capitalize' }}>{s}</button>
                  ))}
                </div>
                <button onClick={() => setShowNewCE(true)} style={{ padding: '8px 16px', background: hex2rgba(GL, 0.18), border: `1px solid ${GL}`, color: GL, borderRadius: 4, fontFamily: FD, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                  + Release CE
                </button>
              </div>

              <div style={{ border: `1px solid ${BB}`, borderRadius: 6, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: BB2 }}>
                      {['CE #', 'Job', 'Amount', 'Status', ''].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: W28, fontFamily: FD, borderBottom: `1px solid ${BB}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCEs.length === 0 && <tr><td colSpan={5} style={{ padding: 16, textAlign: 'center', color: W28, fontSize: 12 }}>No commitment entries.</td></tr>}
                    {filteredCEs.map(ce => (
                      <tr key={ce.id}>
                        <td style={{ padding: '8px 12px', borderBottom: `1px solid ${BB2}`, color: W55, fontSize: 12 }}>{ce.ceNumber || ce.id.slice(0, 8)}</td>
                        <td style={{ padding: '8px 12px', borderBottom: `1px solid ${BB2}`, color: W55, fontSize: 12 }}>{ce.job?.title || '—'}</td>
                        <td style={{ padding: '8px 12px', borderBottom: `1px solid ${BB2}`, color: W, fontSize: 12.5, fontWeight: 600 }}>{fmtZAR(ce.amount)}</td>
                        <td style={{ padding: '8px 12px', borderBottom: `1px solid ${BB2}` }}><StatusBadge status={ce.status} colorMap={CE_COLOR} /></td>
                        <td style={{ padding: '8px 12px', borderBottom: `1px solid ${BB2}` }}>
                          {ce.status === 'pending' && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => updateCEStatus(ce, 'approved')} style={{ fontSize: 10, padding: '4px 8px', background: hex2rgba(GREEN, 0.15), border: `1px solid ${GREEN}`, color: GREEN, borderRadius: 3, cursor: 'pointer' }}>Approve</button>
                              <button onClick={() => updateCEStatus(ce, 'cancelled')} style={{ fontSize: 10, padding: '4px 8px', background: hex2rgba(CORAL, 0.15), border: `1px solid ${CORAL}`, color: CORAL, borderRadius: 3, cursor: 'pointer' }}>Cancel</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── New PO modal ── */}
      {showNewPO && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: D2, border: `1px solid ${BB}`, borderRadius: 8, padding: 28, width: 420 }}>
            <h3 style={{ fontFamily: FD, fontSize: 18, color: W, marginBottom: 18 }}>New Purchase Order</h3>
            {poError && <p style={{ color: CORAL, fontSize: 12, marginBottom: 12 }}>{poError}</p>}
            <div style={{ display: 'grid', gap: 12 }}>
              <select value={poForm.clientId} onChange={e => setPoForm(f => ({ ...f, clientId: e.target.value }))} style={{ background: BB2, border: `1px solid ${BB}`, color: W, padding: '10px 12px', borderRadius: 4, fontFamily: FD, fontSize: 12 }}>
                <option value="">Select client…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input placeholder="PO Number (client reference)" value={poForm.poNumber} onChange={e => setPoForm(f => ({ ...f, poNumber: e.target.value }))} style={{ background: BB2, border: `1px solid ${BB}`, color: W, padding: '10px 12px', borderRadius: 4, fontFamily: FD, fontSize: 12 }} />
              <input placeholder="Amount (R)" type="number" value={poForm.amount} onChange={e => setPoForm(f => ({ ...f, amount: e.target.value }))} style={{ background: BB2, border: `1px solid ${BB}`, color: W, padding: '10px 12px', borderRadius: 4, fontFamily: FD, fontSize: 12 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="date" value={poForm.periodStart} onChange={e => setPoForm(f => ({ ...f, periodStart: e.target.value }))} style={{ flex: 1, background: BB2, border: `1px solid ${BB}`, color: W, padding: '10px 12px', borderRadius: 4, fontFamily: FD, fontSize: 12 }} />
                <input type="date" value={poForm.periodEnd} onChange={e => setPoForm(f => ({ ...f, periodEnd: e.target.value }))} style={{ flex: 1, background: BB2, border: `1px solid ${BB}`, color: W, padding: '10px 12px', borderRadius: 4, fontFamily: FD, fontSize: 12 }} />
              </div>
              <textarea placeholder="Description (optional)" value={poForm.description} onChange={e => setPoForm(f => ({ ...f, description: e.target.value }))} style={{ background: BB2, border: `1px solid ${BB}`, color: W, padding: '10px 12px', borderRadius: 4, fontFamily: FD, fontSize: 12, minHeight: 60, resize: 'vertical' as const }} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowNewPO(false)} style={{ flex: 1, padding: '11px 0', background: 'transparent', border: `1px solid ${BB}`, color: W55, borderRadius: 4, fontFamily: FD, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
              <button onClick={createPO} disabled={poSaving} style={{ flex: 1.4, padding: '11px 0', background: GL, border: 'none', color: B, borderRadius: 4, fontFamily: FD, fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: poSaving ? 0.6 : 1 }}>{poSaving ? 'Saving…' : 'Create PO'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── New CE modal ── */}
      {showNewCE && selectedPO && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: D2, border: `1px solid ${BB}`, borderRadius: 8, padding: 28, width: 420 }}>
            <h3 style={{ fontFamily: FD, fontSize: 18, color: W, marginBottom: 4 }}>Release Commitment Entry</h3>
            <p style={{ fontSize: 12, color: W28, marginBottom: 18 }}>Against {selectedPO.poNumber} — {fmtZAR(selectedPO.remainingAmount)} remaining</p>
            {ceError && <p style={{ color: CORAL, fontSize: 12, marginBottom: 12 }}>{ceError}</p>}
            <div style={{ display: 'grid', gap: 12 }}>
              <select value={ceForm.jobId} onChange={e => setCeForm(f => ({ ...f, jobId: e.target.value }))} style={{ background: BB2, border: `1px solid ${BB}`, color: W, padding: '10px 12px', borderRadius: 4, fontFamily: FD, fontSize: 12 }}>
                <option value="">Link to job/activation (optional)</option>
                {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
              <input placeholder="CE Number (optional)" value={ceForm.ceNumber} onChange={e => setCeForm(f => ({ ...f, ceNumber: e.target.value }))} style={{ background: BB2, border: `1px solid ${BB}`, color: W, padding: '10px 12px', borderRadius: 4, fontFamily: FD, fontSize: 12 }} />
              <input placeholder="Amount (R)" type="number" value={ceForm.amount} onChange={e => setCeForm(f => ({ ...f, amount: e.target.value }))} style={{ background: BB2, border: `1px solid ${BB}`, color: W, padding: '10px 12px', borderRadius: 4, fontFamily: FD, fontSize: 12 }} />
              <textarea placeholder="Notes (optional)" value={ceForm.notes} onChange={e => setCeForm(f => ({ ...f, notes: e.target.value }))} style={{ background: BB2, border: `1px solid ${BB}`, color: W, padding: '10px 12px', borderRadius: 4, fontFamily: FD, fontSize: 12, minHeight: 60, resize: 'vertical' as const }} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowNewCE(false)} style={{ flex: 1, padding: '11px 0', background: 'transparent', border: `1px solid ${BB}`, color: W55, borderRadius: 4, fontFamily: FD, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
              <button onClick={createCE} disabled={ceSaving} style={{ flex: 1.4, padding: '11px 0', background: GL, border: 'none', color: B, borderRadius: 4, fontFamily: FD, fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: ceSaving ? 0.6 : 1 }}>{ceSaving ? 'Releasing…' : 'Release CE'}</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
