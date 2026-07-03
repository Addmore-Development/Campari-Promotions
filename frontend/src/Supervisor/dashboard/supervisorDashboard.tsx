import React, { useEffect, useState } from 'react'
import { jobsService } from '../../shared/services/jobsService'

const G    = '#8F8A7C'
const GL   = '#C9BFA6'
const B    = '#050504'
const BC   = '#080807'
const BB   = 'rgba(170,160,135,0.14)'
const W    = '#F8F8F8'
const WM   = 'rgba(248,248,248,0.65)'
const WD   = 'rgba(248,248,248,0.28)'
const FD   = "'Playfair Display', Georgia, serif"
const FB   = "'DM Sans', system-ui, sans-serif"
const GREEN = '#4ade80'
const AMBER = '#D8B26A'

function hex2rgba(hex: string, a: number) {
  const h = hex.replace('#', '')
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`
}

interface Props { onNavigate: (view: string, jobId?: string) => void }

export const SupervisorDashboard: React.FC<Props> = ({ onNavigate }) => {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    jobsService.getSupervisorJobs().then(async j => {
      setJobs(j)
      setLoading(false)
      // Pull pending (STANDBY) application counts per job so the dashboard
      // can surface "needs your attention" instead of sitting empty.
      const entries = await Promise.all(j.map(async (job: any) => {
        try {
          const apps = await jobsService.getApplicationsForJob(job.id)
          return [job.id, apps.filter((a: any) => a.status === 'STANDBY').length] as const
        } catch { return [job.id, 0] as const }
      }))
      setPendingCounts(Object.fromEntries(entries))
    })
  }, [])

  const totalActivations = jobs.length
  const reportsFiled      = jobs.filter(j => j.activationReport?.status === 'submitted').length
  const reportsDraft      = jobs.filter(j => j.activationReport?.status === 'draft').length
  const reportsMissing    = totalActivations - reportsFiled - reportsDraft
  const totalPromoters    = new Set(jobs.flatMap(j => (j.shifts || []).map((s: any) => s.promoterId))).size
  const totalPending      = Object.values(pendingCounts).reduce((a, b) => a + b, 0)
  const uniqueClients     = new Set(jobs.map(j => j.client || j.brand).filter(Boolean)).size
  const jobsNeedingAction = jobs.filter(j => (pendingCounts[j.id] || 0) > 0)

  const stat = (label: string, value: number | string, color: string) => (
    <div style={{ background:BC, border:`1px solid ${BB}`, borderRadius:6, padding:'18px 20px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${color},${hex2rgba(color,0.3)})` }} />
      <div style={{ fontFamily:FD, fontSize:26, fontWeight:700, color:W }}>{value}</div>
      <div style={{ fontSize:10, color:WD, marginTop:4, letterSpacing:'0.14em', textTransform:'uppercase', fontFamily:FB }}>{label}</div>
    </div>
  )

  if (loading) {
    return <div style={{ padding:'40px 24px', textAlign:'center', color:WD, fontFamily:FB }}>Loading your activations…</div>
  }

  return (
    <div style={{ padding:'32px 36px 80px' }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:9, letterSpacing:'0.3em', textTransform:'uppercase', color:GL, marginBottom:8, fontWeight:700, fontFamily:FD }}>
          Supervisor Overview
        </div>
        <h1 style={{ fontFamily:FD, fontSize:24, fontWeight:700, color:W }}>Your Activations</h1>
        <p style={{ fontSize:12.5, color:WD, fontFamily:FB, marginTop:4 }}>
          Every job you've been assigned to oversee — check attendance, file the report, and chat with your team.
        </p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:24 }}>
        {stat('Total Activations', totalActivations, GL)}
        {stat('Clients',           uniqueClients,     GL)}
        {stat('Reports Filed',     reportsFiled,      GREEN)}
        {stat('Drafts Pending',    reportsDraft,       AMBER)}
        {stat('Promoters On Team', totalPromoters,     G)}
      </div>

      {/* Quick Actions */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:28 }}>
        {[
          { label:'All Campaigns & Clients', icon:'◎', desc:'Browse every campaign across every client', action:() => onNavigate('activations') },
          { label:'File Activation Report',  icon:'▤', desc:'Log serves, conversions, and insights',       action:() => onNavigate('activation-report') },
          { label:'Reports & Exports',       icon:'▦', desc:'Download CSV / PDF campaign & roster data',   action:() => onNavigate('reports') },
          { label:'My Profile',              icon:'⬡', desc:'Update your contact details',                 action:() => onNavigate('profile') },
        ].map(a => (
          <button key={a.label} onClick={a.action}
            style={{ textAlign:'left', background:BC, border:`1px solid ${BB}`, borderRadius:6, padding:'16px 18px', cursor:'pointer', transition:'all 0.2s' }}
            onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.borderColor=hex2rgba(GL,0.4) }}
            onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.borderColor=BB }}>
            <span style={{ fontSize:16, color:GL }}>{a.icon}</span>
            <div style={{ fontFamily:FD, fontSize:12.5, fontWeight:700, color:W, marginTop:8 }}>{a.label}</div>
            <div style={{ fontSize:10.5, color:WD, fontFamily:FB, marginTop:3 }}>{a.desc}</div>
          </button>
        ))}
      </div>

      {/* Needs Your Attention — pending promoter applications across all campaigns */}
      {totalPending > 0 && (
        <div style={{ marginBottom:28, background:BC, border:`1px solid ${hex2rgba(AMBER,0.35)}`, borderRadius:6, overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:`1px solid ${BB}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:14 }}>⚠</span>
              <span style={{ fontSize:9, letterSpacing:'0.24em', textTransform:'uppercase', color:AMBER, fontWeight:700, fontFamily:FD }}>Needs Your Attention</span>
              <span style={{ fontSize:11, color:WM, fontFamily:FB }}>{totalPending} promoter application{totalPending!==1?'s':''} awaiting approval</span>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:1, background:BB }}>
            {jobsNeedingAction.map(j => (
              <div key={j.id} style={{ background:BC, padding:'12px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <div>
                  <span style={{ fontFamily:FD, fontSize:13, fontWeight:700, color:W }}>{j.title}</span>
                  <span style={{ fontSize:11, color:WD, fontFamily:FB, marginLeft:8 }}>{j.client || j.brand}</span>
                </div>
                <button onClick={() => onNavigate('activations')}
                  style={{ padding:'6px 14px', borderRadius:4, border:`1px solid ${hex2rgba(AMBER,0.5)}`, background:hex2rgba(AMBER,0.1), color:AMBER, fontFamily:FD, fontWeight:700, fontSize:11, cursor:'pointer' }}>
                  {pendingCounts[j.id]} Pending — Review
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalActivations === 0 ? (
        <div style={{ padding:'48px 24px', textAlign:'center', color:WD, fontFamily:FB, border:`1px dashed ${BB}`, borderRadius:6 }}>
          You haven't been assigned to any activations yet. Once admin assigns you as the supervisor on a job, it'll show up here.
        </div>
      ) : (
        <div style={{ display:'grid', gap:12 }}>
          {jobs.map(j => {
            const reportStatus = j.activationReport?.status
            const badge =
              reportStatus === 'submitted' ? { label: '✓ Report Submitted', color: GREEN } :
              reportStatus === 'draft'     ? { label: '◐ Draft Saved',      color: AMBER } :
                                              { label: '○ Report Not Started', color: WD }
            const shiftCount = (j.shifts || []).length
            const checkedIn  = (j.shifts || []).filter((s: any) => ['CHECKED_IN','COMPLETED','APPROVED'].includes(s.status)).length

            return (
              <div key={j.id} style={{ background:BC, border:`1px solid ${BB}`, borderRadius:6, padding:'18px 22px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                    <span style={{ fontFamily:FD, fontSize:16, fontWeight:700, color:W }}>{j.title}</span>
                    <span style={{ fontSize:10, fontWeight:700, color:badge.color, fontFamily:FB, padding:'2px 8px', borderRadius:20, background:hex2rgba(badge.color,0.12), border:`1px solid ${hex2rgba(badge.color,0.4)}` }}>
                      {badge.label}
                    </span>
                  </div>
                  <p style={{ fontSize:12, color:WM, fontFamily:FB }}>
                    {j.client || j.brand} · {j.venue} · {j.date ? new Date(j.date).toLocaleDateString() : ''}
                  </p>
                  <p style={{ fontSize:11.5, color:WD, fontFamily:FB, marginTop:2 }}>
                    {checkedIn}/{shiftCount} promoters checked in
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('activation-report', j.id)}
                  style={{ padding:'9px 18px', borderRadius:5, border:'none', background:GL, color:B, fontFamily:FD, fontWeight:700, fontSize:12, cursor:'pointer', flexShrink:0 }}
                >
                  {reportStatus === 'submitted' ? 'View / Update Report' : 'File Report'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default SupervisorDashboard