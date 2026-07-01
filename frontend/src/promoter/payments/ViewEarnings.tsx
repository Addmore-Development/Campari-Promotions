// Displays payment history and summary – fetches directly from API.
// Shows payment status notifications and 3 business days notice when paid.

import React, { useState, useEffect, useCallback } from 'react';

// Admin-style tokens
const G    = '#D4880A';
const GL   = '#E8A820';
const G2   = '#8B5A1A';
const B    = '#0C0A07';
const BC   = '#141008';
const BB   = 'rgba(212,136,10,0.12)';
const W    = '#FAF3E8';
const WM   = 'rgba(250,243,232,0.65)';
const WD   = 'rgba(250,243,232,0.28)';
const FD   = "'Playfair Display', Georgia, serif";
const FB   = "'DM Sans', system-ui, sans-serif";
const TEAL  = '#4AABB8';
const AMBER = '#E8A820';
const CORAL = '#C4614A';
const SKY   = '#5A9EC4';
const GREEN = '#4ade80';

function hex2rgba(hex: string, a: number) {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${a})`;
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
function authHdr(): HeadersInit {
  const t = localStorage.getItem('hg_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

interface PayRow {
  id:          string;
  jobTitle:    string;
  jobClient:   string;
  jobDate:     string;
  venue:       string;
  hourlyRate:  number;
  hoursWorked: number;
  grossAmount: number;
  deductions:  number;
  netAmount:   number;
  status:      string;
  paidAt?:     string;
  reference?:  string;
}

export const ViewEarnings: React.FC = () => {
  const [payments, setPayments] = useState<PayRow[]>([]);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/payments/my`, { headers: authHdr() });
      if (res.ok) {
        const data: any[] = await res.json();
        const mapped: PayRow[] = data.map(p => ({
          id:          p.id,
          jobTitle:    p.shift?.job?.title     || 'Unknown Job',
          jobClient:   p.shift?.job?.client    || '—',
          jobDate:     p.shift?.job?.date      || '',
          venue:       p.shift?.job?.venue     || '—',
          hourlyRate:  p.shift?.job?.hourlyRate || 0,
          hoursWorked: p.shift?.hoursWorked    || 0,
          grossAmount: p.grossAmount           || 0,
          deductions:  p.deductions            || 0,
          netAmount:   p.netAmount             || 0,
          status:      (p.status               || 'pending').toLowerCase(),
          paidAt:      p.paidAt,
          reference:   p.reference,
        }));
        setPayments(mapped);
      }
    } catch (e) {
      console.error('[ViewEarnings] load error:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // Re-load when business marks a payment as paid
    const onUpdate = () => load();
    window.addEventListener('payment-updated', onUpdate);
    return () => window.removeEventListener('payment-updated', onUpdate);
  }, [load]);

  // ── Derived stats ───────────────────────────────────────────────────────────
  const totalEarned     = payments.reduce((s, p) => s + p.netAmount, 0);
  const totalPending    = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.netAmount, 0);
  const totalPaid       = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.netAmount, 0);
  const shiftsCompleted = payments.length;

  // Payments marked paid in the last 7 days — trigger the notification
  const recentlyPaid = payments.filter(p =>
    p.status === 'paid' &&
    p.paidAt &&
    (Date.now() - new Date(p.paidAt).getTime()) < 7 * 24 * 3600 * 1000
  );

  // ── Status helpers ──────────────────────────────────────────────────────────
  const statusColor = (s: string) =>
    s === 'paid' ? GREEN : s === 'approved' ? TEAL : s === 'pending' ? AMBER : WD;

  const statusLabel = (s: string) =>
    s === 'paid' ? 'Paid ✓' : s === 'approved' ? 'Approved' : s === 'pending' ? 'Pending' : s;

  const statusBadge = (s: string) => (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const,
      color:       statusColor(s),
      background:  hex2rgba(statusColor(s), 0.12),
      border:      `1px solid ${hex2rgba(statusColor(s), 0.4)}`,
      padding:     '3px 10px', borderRadius: 2, fontFamily: FD,
    }}>
      {statusLabel(s)}
    </span>
  );

  const stats = [
    { label: 'Total Earned', value: `R${totalEarned.toLocaleString('en-ZA')}`,  sub: 'All time',          color: G     },
    { label: 'Pending',      value: `R${totalPending.toLocaleString('en-ZA')}`, sub: 'Awaiting payment',  color: AMBER },
    { label: 'Paid Out',     value: `R${totalPaid.toLocaleString('en-ZA')}`,    sub: 'Into your bank',    color: GREEN },
    { label: 'Shifts Done',  value: String(shiftsCompleted),                    sub: 'Completed',         color: SKY   },
  ];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: WD, padding: '60px 0', justifyContent: 'center' }}>
      <div style={{ width: 24, height: 24, border: `2px solid ${GL}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ fontSize: 15, color: WM }}>Loading earnings…</span>
    </div>
  );

  return (
    <div style={{ padding: '40px 48px' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: '0.38em', textTransform: 'uppercase', color: GL, marginBottom: 8, fontWeight: 700 }}>
            Payments
          </div>
          <h1 style={{ fontFamily: FD, fontSize: 30, fontWeight: 700, color: W }}>My Earnings</h1>
          <p style={{ fontSize: 13, color: WM, marginTop: 6 }}>Track your payments and pending amounts in real time.</p>
        </div>
        <button onClick={load}
          style={{ padding: '7px 16px', background: 'transparent', border: `1px solid ${BB}`, color: WM, fontFamily: FB, fontSize: 10, cursor: 'pointer', borderRadius: 2 }}
          onMouseEnter={e => e.currentTarget.style.borderColor = GL}
          onMouseLeave={e => e.currentTarget.style.borderColor = BB}>
          ↻ Refresh
        </button>
      </div>

      {/* ── Payment received banner ── */}
      {recentlyPaid.length > 0 && (
        <div style={{ padding: '18px 20px', background: hex2rgba(GREEN, 0.06), border: `1px solid ${hex2rgba(GREEN, 0.3)}`, borderRadius: 4, marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>💳</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: GREEN, fontFamily: FD, marginBottom: 4 }}>
              Payment on the way!
            </div>
            <div style={{ fontSize: 13, color: WM, fontFamily: FB, lineHeight: 1.6 }}>
              {recentlyPaid.length === 1
                ? `R${recentlyPaid[0].netAmount.toLocaleString('en-ZA')} from ${recentlyPaid[0].jobClient} has been marked as paid by your client.`
                : `${recentlyPaid.length} payments totalling R${recentlyPaid.reduce((s,r) => s + r.netAmount, 0).toLocaleString('en-ZA')} have been marked as paid.`
              }
            </div>
            <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: 'rgba(0,0,0,0.25)', border: `1px solid ${hex2rgba(GREEN, 0.2)}`, borderRadius: 3 }}>
              <span style={{ fontSize: 14 }}>⏳</span>
              <span style={{ fontSize: 12, color: WM, fontFamily: FB }}>
                Please allow up to <strong style={{ color: W }}>3 business days</strong> for funds to reflect in your bank account.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Pending notice ── */}
      {totalPending > 0 && recentlyPaid.length === 0 && (
        <div style={{ padding: '12px 18px', background: hex2rgba(AMBER, 0.06), border: `1px solid ${hex2rgba(AMBER, 0.25)}`, borderRadius: 4, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 16 }}>⏳</span>
          <p style={{ fontFamily: FB, fontSize: 13, color: WM, lineHeight: 1.5 }}>
            You have <strong style={{ color: AMBER }}>R{totalPending.toLocaleString('en-ZA')}</strong> in pending payments.
            Once your client marks them as paid, funds will reflect within 3 business days.
          </p>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: BB, marginBottom: 32 }}>
        {stats.map((stat, i) => (
          <div key={i} style={{ background: BC, padding: '24px 22px', position: 'relative', overflow: 'hidden', borderRadius: 2 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${stat.color},${stat.color}88)` }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: 60, height: 60, background: `${stat.color}06`, borderRadius: '0 0 0 60px' }} />
            <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: WM, marginBottom: 10 }}>{stat.label}</div>
            <div style={{ fontFamily: FD, fontSize: 38, fontWeight: 700, color: W, lineHeight: 1 }}>{stat.value}</div>
            {stat.sub && <div style={{ fontSize: 11, color: stat.color, marginTop: 8, fontWeight: 600 }}>{stat.sub}</div>}
          </div>
        ))}
      </div>

      {/* Bar chart */}
      {payments.length > 0 && (
        <div style={{ marginBottom: 32, padding: 28, background: BC, border: `1px solid ${BB}`, borderRadius: 2 }}>
          <h3 style={{ color: GL, fontSize: 12, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 20 }}>Payment Breakdown</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
            {payments.map(p => {
              const max = Math.max(...payments.map(x => x.netAmount), 1);
              const h   = Math.max((p.netAmount / max) * 80, 4);
              return (
                <div key={p.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: '100%', height: `${h}px`, background: p.status === 'paid' ? `linear-gradient(180deg,${G},${GL})` : hex2rgba(AMBER, 0.5), borderRadius: '4px 4px 0 0', transition: 'height 0.5s ease' }} />
                  <span style={{ color: WD, fontSize: 10 }}>R{p.netAmount}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
            {[{ c: G, l: 'Paid' }, { c: hex2rgba(AMBER, 0.5), l: 'Pending' }].map(({ c, l }) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: c }} />
                <span style={{ color: WD, fontSize: 11 }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payments table */}
      <div style={{ background: BC, border: `1px solid ${BB}`, overflow: 'hidden', borderRadius: 2 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BB}` }}>
              {['Job / Client', 'Reference', 'Gross', 'Deductions', 'Net Pay', 'Status', 'Date'].map(h => (
                <th key={h} style={{ padding: '13px 18px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: WD, fontFamily: FB, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.map((p, i) => (
              <tr key={p.id}
                style={{ borderBottom: i < payments.length - 1 ? `1px solid ${BB}` : 'none', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                {/* Job / Client */}
                <td style={{ padding: '14px 18px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: W, fontFamily: FD }}>{p.jobTitle}</div>
                  <div style={{ fontSize: 11, color: WM, fontFamily: FB, marginTop: 2 }}>{p.jobClient}</div>
                  {p.jobDate && (
                    <div style={{ fontSize: 10, color: WD, fontFamily: FB, marginTop: 1 }}>
                      {new Date(p.jobDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </td>

                {/* Reference */}
                <td style={{ padding: '14px 18px' }}>
                  <span style={{ color: WD, fontFamily: 'monospace', fontSize: 12 }}>
                    {p.reference || `HGP-${p.id.slice(-6).toUpperCase()}`}
                  </span>
                </td>

                {/* Gross */}
                <td style={{ padding: '14px 18px', fontSize: 12, color: WM }}>R{p.grossAmount.toLocaleString('en-ZA')}</td>

                {/* Deductions */}
                <td style={{ padding: '14px 18px', fontSize: 12, color: p.deductions > 0 ? CORAL : WD }}>
                  {p.deductions > 0 ? `-R${p.deductions}` : '—'}
                </td>

                {/* Net */}
                <td style={{ padding: '14px 18px', fontSize: 13, color: GL, fontWeight: 700 }}>
                  R{p.netAmount.toLocaleString('en-ZA')}
                </td>

                {/* Status */}
                <td style={{ padding: '14px 18px' }}>
                  <div>
                    {statusBadge(p.status)}
                    {/* ── 3 business days notice when paid ── */}
                    {p.status === 'paid' && p.paidAt && (
                      <div style={{ marginTop: 5 }}>
                        <div style={{ fontSize: 9, color: WD, fontFamily: FB }}>
                          {new Date(p.paidAt).toLocaleDateString('en-ZA')}
                          {p.reference && ` · ${p.reference}`}
                        </div>
                        <div style={{ fontSize: 9, color: hex2rgba(GREEN, 0.8), fontFamily: FB, marginTop: 2 }}>
                          Allow up to 3 business days
                        </div>
                      </div>
                    )}
                    {/* Pending — explain what it means */}
                    {p.status === 'pending' && (
                      <div style={{ fontSize: 9, color: WD, fontFamily: FB, marginTop: 4 }}>
                        Waiting for client to transfer
                      </div>
                    )}
                  </div>
                </td>

                {/* Date */}
                <td style={{ padding: '14px 18px', fontSize: 12, color: WM }}>
                  {p.paidAt
                    ? new Date(p.paidAt).toLocaleDateString('en-ZA')
                    : <span style={{ color: WD }}>Pending</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {payments.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: WD, fontSize: 13 }}>
            No payments yet. Complete a shift to start earning.
          </div>
        )}
      </div>

      {/* ── Disclaimer ── */}
      <div style={{ marginTop: 14, padding: '12px 16px', border: `1px solid ${BB}`, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>ℹ️</span>
        <p style={{ fontFamily: FB, fontSize: 11, color: WD, lineHeight: 1.6 }}>
          Payments are transferred directly by your client after shift completion.
          Once marked as paid, please allow up to <strong style={{ color: WM }}>3 business days</strong> for funds to reflect in your bank account.
          For queries, contact Honey Group support via the chat widget.
        </p>
      </div>
    </div>
  );
};