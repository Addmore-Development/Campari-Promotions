// Supervisor/reports/SupervisorBusinessInsights.tsx
// Real-time (polled) per-business snapshot for supervisors: budget in/out,
// the promoters they work with, and plain-language "what's working / what
// isn't" signals with concrete suggestions — so a supervisor can advise a
// business on how to improve their activations without needing admin access
// to raw financials.
import React, { useEffect, useRef, useState } from 'react'
import { jobsService } from '../../shared/services/jobsService'

const G    = '#8F8A7C'
const GL   = '#C9BFA6'
const G2   = '#8A8474'
const B    = '#050504'
const BC   = '#080807'
const D2   = '#0A0A08'
const BB   = 'rgba(170,160,135,0.16)'
const BB2  = 'rgba(170,160,135,0.06)'
const W    = '#F8F8F8'
const W55  = 'rgba(248,248,248,0.55)'
const W28  = 'rgba(248,248,248,0.28)'
const FD   = "'Playfair Display', Georgia, serif"
const FB   = "'DM Sans', system-ui, sans-serif"
const GREEN = '#4ade80'
const AMBER = '#E8B85C'
const CORAL = '#C4614A'

function hex2rgba(hex: string, a: number) {
  const h = hex.replace('#', '')
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`
}

const fmtZAR = (n: number) => `R${(n || 0).toLocaleString('en-ZA')}`

const POLL_MS = 20000 // refresh every 20s to approximate real-time without a socket

export const SupervisorBusinessInsights: React.FC = () => {
  const [insights, setInsights] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await jobsService.getSupervisorInsights()
      setInsights(data)
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    timerRef.current = setInterval(() => load(true), POLL_MS)
    const onFocus = () => load(true)
    window.addEventListener('focus', onFocus)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  if (loading) {
    return <div style={{ padding: '48px 24px', textAlign: 'center', color: W28, fontFamily: FB }}>Loading business insights…</div>
  }

  return (
    <div style={{ padding: '32px 36px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: '0.36em', textTransform: 'uppercase', color: GL, marginBottom: 8, fontWeight: 700, fontFamily: FD }}>Live Reporting</div>
          <h1 style={{ fontFamily: FD, fontSize: 26, fontWeight: 700, color: W }}>Business Insights</h1>
          <p style={{ fontSize: 12.5, color: W55, marginTop: 4, fontFamily: FB }}>
            Money in / out, promoters on the ground, and what's working for every business you supervise. Refreshes automatically.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastUpdated && (
            <span style={{ fontSize: 11, color: W28, fontFamily: FB }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: GREEN, marginRight: 6, verticalAlign: 'middle' }} />
              Updated {lastUpdated.toLocaleTimeString('en-ZA')}
            </span>
          )}
          <button onClick={() => load()} style={{ padding: '8px 14px', background: 'transparent', border: `1px solid ${BB}`, color: GL, borderRadius: 4, fontFamily: FD, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {insights.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: W28, fontFamily: FB, border: `1px dashed ${BB}`, borderRadius: 6 }}>
          You haven't been assigned to any campaigns yet, so there's nothing to report on.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {insights.map((b: any) => {
            const isOpen = expanded === (b.businessId || b.businessName)
            const pctUsed = b.budgetIn > 0 ? Math.round((b.budgetOut / b.budgetIn) * 100) : 0
            return (
              <div key={b.businessId || b.businessName} style={{ background: BC, border: `1px solid ${BB}`, borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', gap: 12, flexWrap: 'wrap' }}
                  onClick={() => setExpanded(isOpen ? null : (b.businessId || b.businessName))}>
                  <div>
                    <h3 style={{ fontFamily: FD, fontSize: 17, color: W, marginBottom: 4 }}>{b.businessName}</h3>
                    <p style={{ fontSize: 11.5, color: W28, fontFamily: FB }}>{b.jobsCount} campaign{b.jobsCount !== 1 ? 's' : ''} · {b.promotersCount} promoter{b.promotersCount !== 1 ? 's' : ''}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 9, color: W28, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Money In</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: GL, fontFamily: FD }}>{fmtZAR(b.budgetIn)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 9, color: W28, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Money Out</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: AMBER, fontFamily: FD }}>{fmtZAR(b.budgetOut)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 9, color: W28, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Remaining</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: b.budgetRemaining < 0 ? CORAL : GREEN, fontFamily: FD }}>{fmtZAR(b.budgetRemaining)}</div>
                    </div>
                    <span style={{ color: W28, fontSize: 14, alignSelf: 'center' }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>

                {b.budgetIn > 0 && (
                  <div style={{ height: 5, background: BB2 }}>
                    <div style={{ height: '100%', width: `${Math.min(pctUsed, 100)}%`, background: pctUsed >= 100 ? CORAL : pctUsed >= 80 ? AMBER : GREEN, transition: 'width 0.3s' }} />
                  </div>
                )}

                {isOpen && (
                  <div style={{ padding: '20px 22px 24px', borderTop: `1px solid ${BB}` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
                      <div style={{ background: BB2, borderRadius: 4, padding: '10px 12px' }}>
                        <div style={{ fontSize: 9, color: W28, textTransform: 'uppercase', marginBottom: 4 }}>Fill Rate</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: W, fontFamily: FD }}>{b.fillRate}%</div>
                      </div>
                      <div style={{ background: BB2, borderRadius: 4, padding: '10px 12px' }}>
                        <div style={{ fontSize: 9, color: W28, textTransform: 'uppercase', marginBottom: 4 }}>No-Show Rate</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: b.noShowRate > 10 ? CORAL : W, fontFamily: FD }}>{b.noShowRate}%</div>
                      </div>
                      <div style={{ background: BB2, borderRadius: 4, padding: '10px 12px' }}>
                        <div style={{ fontSize: 9, color: W28, textTransform: 'uppercase', marginBottom: 4 }}>Conversion Rate</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: W, fontFamily: FD }}>{b.conversionRate}%</div>
                      </div>
                      <div style={{ background: BB2, borderRadius: 4, padding: '10px 12px' }}>
                        <div style={{ fontSize: 9, color: W28, textTransform: 'uppercase', marginBottom: 4 }}>Reports Filed</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: W, fontFamily: FD }}>{b.reportsFiled}</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                      <div>
                        <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: GL, fontWeight: 700, marginBottom: 10, fontFamily: FD }}>
                          Promoters on this account ({b.promoters.length})
                        </div>
                        {b.promoters.length === 0 ? (
                          <p style={{ fontSize: 12, color: W28 }}>No promoters allocated yet.</p>
                        ) : (
                          <div style={{ display: 'grid', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                            {b.promoters.map((p: any) => (
                              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: BB2, borderRadius: 3 }}>
                                <span style={{ fontSize: 12.5, color: W }}>{p.fullName}</span>
                                {p.reliabilityScore != null && (
                                  <span style={{ fontSize: 10.5, color: p.reliabilityScore >= 80 ? GREEN : p.reliabilityScore >= 50 ? AMBER : CORAL, fontFamily: FD }}>
                                    {p.reliabilityScore}% reliable
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: GREEN, fontWeight: 700, marginBottom: 10, fontFamily: FD }}>
                          What's working
                        </div>
                        {b.working.length === 0 ? <p style={{ fontSize: 12, color: W28, marginBottom: 16 }}>Not enough data yet.</p> : (
                          <ul style={{ margin: '0 0 16px', paddingLeft: 18 }}>
                            {b.working.map((w: string, i: number) => (
                              <li key={i} style={{ fontSize: 12, color: W55, marginBottom: 6, lineHeight: 1.5 }}>{w}</li>
                            ))}
                          </ul>
                        )}

                        <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: CORAL, fontWeight: 700, marginBottom: 10, fontFamily: FD }}>
                          What's not working
                        </div>
                        {b.notWorking.length === 0 ? <p style={{ fontSize: 12, color: W28, marginBottom: 16 }}>No issues detected.</p> : (
                          <ul style={{ margin: '0 0 16px', paddingLeft: 18 }}>
                            {b.notWorking.map((w: string, i: number) => (
                              <li key={i} style={{ fontSize: 12, color: W55, marginBottom: 6, lineHeight: 1.5 }}>{w}</li>
                            ))}
                          </ul>
                        )}

                        {b.suggestions.length > 0 && (
                          <>
                            <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: AMBER, fontWeight: 700, marginBottom: 10, fontFamily: FD }}>
                              How to improve
                            </div>
                            <ul style={{ margin: 0, paddingLeft: 18 }}>
                              {b.suggestions.map((s: string, i: number) => (
                                <li key={i} style={{ fontSize: 12, color: W55, marginBottom: 6, lineHeight: 1.5 }}>{s}</li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default SupervisorBusinessInsights