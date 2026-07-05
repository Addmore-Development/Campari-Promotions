import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../AdminLayout';
import { injectAdminMobileStyles } from '../adminMobileStyles';
import { purchaseOrdersService } from '../../shared/services/purchaseOrdersService';

const G    = '#8F8A7C';
const GL   = '#C9BFA6';
const G2   = '#8A8474';
const G3   = '#443F36';
const B    = '#050504';
const BC   = '#080807';
const D2   = '#0D0D0A';
const D3   = '#14140E';
const BB   = 'rgba(170,160,135,0.14)';
const W    = '#F8F8F8';
const WM   = 'rgba(248,248,248,0.65)';
const WD   = 'rgba(248,248,248,0.28)';
const FD   = "'Playfair Display', Georgia, serif";
const FB   = "'DM Sans', system-ui, sans-serif";
const TEAL  = '#4AABB8';
const CORAL = '#C4614A';
const GREEN = '#4ade80';
const AMBER = '#C9BFA6';

const BACKEND = import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5000';
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function selfieUrl(p?: string | null): string | null {
  if (!p) return null;
  return p.startsWith('http') ? p : BACKEND + p;
}
function authHdr() {
  const t = localStorage.getItem('hg_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

interface Job {
  id: string; title: string; client: string; clientId?: string; brand: string;
  venue: string; streetNumber?: string; streetName?: string; suburb?: string;
  city?: string; postalCode?: string; address?: string; lat?: number; lng?: number;
  date: string; endDate?: string; startTime: string; endTime: string;
  hourlyRate: number; totalSlots: number; filledSlots: number;
  status: string; filters?: any; termsAndConditions?: string;
  applications?: any[]; createdAt?: string;
  purchaseOrderId?: string;
  supervisorId?: string; supervisor?: { id: string; fullName: string; email?: string };
}
interface Client { id?: string; name: string; email?: string; }
interface SupervisorOpt { id: string; name: string; email?: string; }
interface PurchaseOrderOpt { id: string; poNumber: string; clientId?: string; amount: number; committedAmount: number; remainingAmount: number; client?: { id: string; name: string } }

const EMPTY_FORM = {
  title: '', client: '', clientId: '', brand: '', venue: '',
  streetNumber: '', streetName: '', suburb: '', city: '', postalCode: '',
  coordsInput: '',          // raw "lat, lng" paste field
  locationMode: 'address' as 'address' | 'coords',   // which mode is active
  date: '', endDate: '', startTime: '09:00', endTime: '17:00',
  hourlyRate: '', totalSlots: '4', filledSlots: '0',
  status: 'OPEN', filters: {} as any, termsAndConditions: '',
  purchaseOrderId: '', supervisorId: '',
};

const STATUS_OPTS = ['OPEN', 'FILLED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const CATEGORY_OPTS = ['Brand Activation','Promotions','Events','Retail','Corporate','Exhibitions','Other'];

// Estimate the job's total cost so it can be deducted from a linked PO as a
// Commitment Entry: rate × slots × shift hours.
function estimateJobCost(hourlyRate: number, totalSlots: number, startTime: string, endTime: string): number {
  const toMinutes = (t: string) => {
    const [h, m] = (t || '0:0').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  let mins = toMinutes(endTime) - toMinutes(startTime);
  if (mins <= 0) mins += 24 * 60; // shift crosses midnight
  const hours = mins / 60;
  return Math.round(hourlyRate * totalSlots * hours);
}

const inp: React.CSSProperties = {
  width: '100%', background: 'rgba(248,248,248,0.05)',
  border: `1px solid ${BB}`, padding: '10px 14px',
  color: W, fontFamily: FB, fontSize: 13, outline: 'none', borderRadius: 2, boxSizing: 'border-box' as any,
};
const lbl: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, letterSpacing: '0.15em',
  textTransform: 'uppercase' as any, color: WM, display: 'block', marginBottom: 7,
};
const sel: React.CSSProperties = { ...inp, background: D3, cursor: 'pointer' };

// ── JobViewModal ──────────────────────────────────────────────────────────────
function JobViewModal({ job, onClose, onEdit, onDelete, displayAddress, statusColor }: {
  job: Job; onClose: () => void; onEdit: () => void; onDelete: () => void;
  displayAddress: (j: Job) => string; statusColor: (s: string) => string;
}) {
  const [shifts, setShifts] = React.useState<any[]>([]);
  const [loadingShifts, setLoadingShifts] = React.useState(true);
  const [selectedShift, setSelectedShift] = React.useState<any>(null);
  const [tab, setTab] = React.useState<'info'|'promoters'>('info');
  const [allPromoters, setAllPromoters] = React.useState<any[]>([]);
  const [loadingPromos, setLoadingPromos] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [savingAlloc, setSavingAlloc] = React.useState(false);
  const [allocMsg, setAllocMsg] = React.useState('');
  const [promoSearch, setPromoSearch] = React.useState('');

  React.useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/shifts/all`, { headers: authHdr() as any });
        if (res.ok) {
          const all: any[] = await res.json();
          const jobShifts = all.filter(s => s.jobId === job.id);
          setShifts(jobShifts);
          setSelected(new Set(jobShifts.map((s: any) => s.promoterId)));
        }
      } catch {}
      setLoadingShifts(false);
    };
    load();
  }, [job.id]);

  React.useEffect(() => {
    if (tab !== 'promoters' || allPromoters.length > 0) return;
    setLoadingPromos(true);
    fetch(`${API}/users?role=PROMOTER`, { headers: authHdr() as any })
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => setAllPromoters(data))
      .catch(() => {})
      .finally(() => setLoadingPromos(false));
  }, [tab, allPromoters.length]);

  const allocatedIds = new Set(shifts.map(s => s.promoterId));
  const togglePromoter = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const saveAllocations = async () => {
    setSavingAlloc(true); setAllocMsg('');
    try {
      const toAdd    = [...selected].filter(id => !allocatedIds.has(id));
      const toRemove = shifts.filter(s => !selected.has(s.promoterId));
      await Promise.all(toAdd.map(promoterId =>
        fetch(`${API}/shifts`, { method:'POST', headers:{...authHdr(),'Content-Type':'application/json'} as any, body:JSON.stringify({jobId:job.id,promoterId,status:'SCHEDULED'}) })
      ));
      await Promise.all(toRemove.map(s => fetch(`${API}/shifts/${s.id}`,{method:'DELETE',headers:authHdr() as any})));
      const res = await fetch(`${API}/shifts/all`, { headers: authHdr() as any });
      if (res.ok) { const all: any[] = await res.json(); const updated = all.filter(s=>s.jobId===job.id); setShifts(updated); setSelected(new Set(updated.map(s=>s.promoterId))); }
      setAllocMsg(`✓ Saved — ${toAdd.length} added, ${toRemove.length} removed`);
      setTimeout(() => setAllocMsg(''), 3000);
    } catch { setAllocMsg('Error saving — please retry'); }
    setSavingAlloc(false);
  };

  const sc = statusColor(job.status);
  const shiftStatusColor = (s: string) => s==='CHECKED_IN'?GREEN:s==='COMPLETED'||s==='APPROVED'?TEAL:s==='NO_SHOW'?CORAL:WM;
  const confirmed = shifts.length;
  const newCount  = [...selected].filter(id => !allocatedIds.has(id)).length;
  const filteredP = allPromoters.filter(p => !promoSearch || p.fullName?.toLowerCase().includes(promoSearch.toLowerCase()) || p.city?.toLowerCase().includes(promoSearch.toLowerCase()));

  return (
    <div className="hg-modal-overlay" style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',backdropFilter:'blur(10px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300,padding:16 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="hg-modal-box" style={{ background:BC,border:`1px solid ${BB}`,width:'100%',maxWidth:820,maxHeight:'92vh',overflowY:'auto',position:'relative',borderRadius:4 }}>
        <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${G3},${GL},${G3})` }} />
        <button onClick={onClose} style={{ position:'absolute',top:16,right:20,background:'none',border:'none',cursor:'pointer',color:WM,fontSize:20,zIndex:10 }}>✕</button>

        <div style={{ padding:'24px 20px 0' }}>
          <div style={{ fontSize:9,letterSpacing:'0.3em',textTransform:'uppercase',color:GL,marginBottom:6,fontWeight:700 }}>Job Details</div>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10,gap:12,flexWrap:'wrap' }}>
            <div style={{ flex:1,minWidth:0 }}>
              <h2 style={{ fontFamily:FD,fontSize:20,fontWeight:700,color:W,marginBottom:6 }}>{job.title}</h2>
              <div style={{ display:'flex',gap:10,flexWrap:'wrap',fontSize:12,color:WM }}>
                <span>🏢 {job.client}</span>
                {job.venue&&<span>📍 {job.venue}</span>}
                <span style={{ color:GL,fontWeight:700 }}>R{job.hourlyRate}/hr · {job.totalSlots} slots</span>
              </div>
            </div>
            <span style={{ fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:sc,background:`${sc}18`,border:`1px solid ${sc}44`,padding:'3px 10px',borderRadius:2,flexShrink:0 }}>{job.status}</span>
          </div>
          <div style={{ height:3,background:'rgba(255,255,255,0.06)',borderRadius:2,marginBottom:4,overflow:'hidden' }}>
            <div style={{ height:'100%',width:`${job.totalSlots>0?(confirmed/job.totalSlots)*100:0}%`,background:`linear-gradient(90deg,${GL},${G})`,borderRadius:2 }} />
          </div>
          <div style={{ fontSize:10,color:WD,marginBottom:14 }}>{confirmed} confirmed · {job.totalSlots} total</div>
          <div style={{ display:'flex',borderBottom:`1px solid ${BB}`,overflowX:'auto' }}>
            {(['info','promoters'] as const).map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{ padding:'10px 18px',background:'none',border:'none',borderBottom:tab===t?`2px solid ${GL}`:'2px solid transparent',color:tab===t?GL:WD,fontFamily:FD,fontSize:11,fontWeight:tab===t?700:400,cursor:'pointer',whiteSpace:'nowrap' }}>
                {t==='info'?'📋 Job Info':`👥 Promoters (${selected.size})`}
              </button>
            ))}
          </div>
        </div>

        {tab==='info'&&(
          <div style={{ padding:'18px 20px 24px' }}>
            <div className="hg-job-detail-grid" style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,background:BB,marginBottom:18 }}>
              {[
                {label:'Client',value:job.client},{label:'Brand',value:job.brand},
                {label:'Venue',value:job.venue},{label:'Address',value:displayAddress(job)},
                {label:'Date',value:job.date?new Date(job.date).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'}):'—'},
                {label:'Time',value:`${job.startTime} – ${job.endTime}`},
                {label:'Rate',value:`R${job.hourlyRate}/hr`},{label:'Slots',value:`${job.filledSlots}/${job.totalSlots}`},
                {label:'Status',value:job.status},
              ].filter(r=>r.value).map(r=>(
                <div key={r.label} style={{ background:D2,padding:'10px 12px' }}>
                  <div style={{ fontSize:8,color:WD,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:2 }}>{r.label}</div>
                  <div style={{ fontSize:12,color:W,fontWeight:600 }}>{r.value||'—'}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase',color:GL,fontWeight:700,marginBottom:10 }}>Promoters ({shifts.length})</div>
            {loadingShifts?(
              <div style={{ padding:16,textAlign:'center',color:WD,fontSize:12 }}>Loading…</div>
            ):shifts.length===0?(
              <div style={{ padding:'12px 14px',background:D2,border:`1px solid ${BB}`,borderRadius:3,fontSize:12,color:WD,marginBottom:14 }}>No promoters allocated yet.</div>
            ):shifts.map(shift=>{
              const sc2=shiftStatusColor(shift.status);
              const inSelfie=selfieUrl(shift.selfieInUrl||shift.checkInSelfieUrl);
              const outSelfie=selfieUrl(shift.selfieOutUrl||shift.checkOutSelfieUrl);
              const isExp=selectedShift?.id===shift.id;
              return (
                <div key={shift.id} style={{ marginBottom:8,border:`1px solid ${isExp?GL:BB}`,borderRadius:3,overflow:'hidden' }}>
                  <div onClick={()=>setSelectedShift(isExp?null:shift)}
                    style={{ padding:'10px 12px',background:isExp?'rgba(201,191,166,0.06)':D2,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                      <div style={{ width:32,height:32,borderRadius:'50%',overflow:'hidden',border:`2px solid ${sc2}`,flexShrink:0 }}>
                        <div style={{ width:'100%',height:'100%',background:'rgba(201,191,166,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:GL,fontFamily:FD }}>{(shift.promoter?.fullName||'?').charAt(0)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize:12,fontWeight:700,color:W,fontFamily:FD }}>{shift.promoter?.fullName||'Unknown'}</div>
                        {shift.totalHours!=null&&<div style={{ fontSize:10,color:GL,fontWeight:700 }}>{shift.totalHours.toFixed(2)}h</div>}
                      </div>
                    </div>
                    <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                      <span style={{ fontSize:9,fontWeight:700,textTransform:'uppercase',color:sc2,background:`${sc2}18`,border:`1px solid ${sc2}44`,padding:'3px 7px',borderRadius:2 }}>{shift.status}</span>
                      <span style={{ color:isExp?GL:WD }}>{isExp?'▲':'▼'}</span>
                    </div>
                  </div>
                  {isExp&&(
                    <div style={{ padding:'12px 14px',background:'rgba(9,9,7,0.6)',borderTop:`1px solid ${BB}` }}>
                      <div className="hg-shift-stats" style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:10 }}>
                        {[
                          {label:'Check-in',value:shift.checkInTime?new Date(shift.checkInTime).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'}):'—'},
                          {label:'Check-out',value:shift.checkOutTime?new Date(shift.checkOutTime).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'}):'—'},
                          {label:'Hours',value:shift.totalHours!=null?shift.totalHours.toFixed(2)+'h':'—'},
                          {label:'Earnings',value:shift.totalHours&&job.hourlyRate?`R${(shift.totalHours*job.hourlyRate).toFixed(2)}`:'—',accent:GL},
                        ].map(r=>(
                          <div key={r.label} style={{ background:'rgba(170,160,135,0.05)',border:`1px solid ${BB}`,padding:'8px 10px',borderRadius:3 }}>
                            <div style={{ fontSize:8,color:WD,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:2 }}>{r.label}</div>
                            <div style={{ fontSize:12,fontWeight:700,color:(r as any).accent||W,fontFamily:FD }}>{r.value}</div>
                          </div>
                        ))}
                      </div>
                      {(inSelfie||outSelfie)&&(
                        <div className="hg-selfie-grid" style={{ display:'grid',gridTemplateColumns:inSelfie&&outSelfie?'1fr 1fr':'1fr',gap:10 }}>
                          {inSelfie&&<div><div style={{ fontSize:9,color:GREEN,fontWeight:700,textTransform:'uppercase',marginBottom:4 }}>Check-in</div><img src={inSelfie} alt="" style={{ width:'100%',height:120,objectFit:'cover',borderRadius:4,border:'1px solid rgba(74,222,128,0.3)' }} onError={e=>(e.target as HTMLImageElement).style.display='none'} /></div>}
                          {outSelfie&&<div><div style={{ fontSize:9,color:CORAL,fontWeight:700,textTransform:'uppercase',marginBottom:4 }}>Check-out</div><img src={outSelfie} alt="" style={{ width:'100%',height:120,objectFit:'cover',borderRadius:4,border:'1px solid rgba(196,97,74,0.4)' }} onError={e=>(e.target as HTMLImageElement).style.display='none'} /></div>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ display:'flex',gap:10,marginTop:18,flexWrap:'wrap' }}>
              <button onClick={onEdit} style={{ flex:2,minWidth:100,padding:'11px',background:`linear-gradient(135deg,${GL},${G})`,border:'none',color:B,fontFamily:FD,fontSize:12,fontWeight:700,cursor:'pointer',borderRadius:2 }}>Edit Job</button>
              <button onClick={onDelete} style={{ flex:1,minWidth:80,padding:'11px',background:`${CORAL}18`,border:`1px solid ${CORAL}`,color:CORAL,fontFamily:FB,fontSize:12,fontWeight:700,cursor:'pointer',borderRadius:2 }}>Delete</button>
            </div>
          </div>
        )}

        {tab==='promoters'&&(
          <div style={{ padding:'18px 20px 24px' }}>
            <p style={{ fontSize:13,color:WM,marginBottom:12,fontFamily:FB }}>Select promoters to allocate to this job.</p>
            {allocMsg&&<div style={{ padding:'10px 12px',background:allocMsg.startsWith('✓')?'rgba(74,222,128,0.1)':'rgba(196,97,74,0.1)',borderRadius:3,fontSize:12,color:allocMsg.startsWith('✓')?GREEN:CORAL,marginBottom:12 }}>{allocMsg}</div>}
            <input placeholder="Search by name or city…" value={promoSearch} onChange={e=>setPromoSearch(e.target.value)} style={{ ...inp,marginBottom:12 }}
              onFocus={e=>e.currentTarget.style.borderColor=GL} onBlur={e=>e.currentTarget.style.borderColor=BB} />
            {loadingPromos?(
              <div style={{ padding:40,textAlign:'center',color:WD,fontSize:13 }}>Loading promoters…</div>
            ):(
              <div className="hg-promoter-grid" style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:8,marginBottom:18 }}>
                {filteredP.map(p=>{
                  const isSel=selected.has(p.id); const isAlloc=allocatedIds.has(p.id);
                  return (
                    <div key={p.id} onClick={()=>togglePromoter(p.id)}
                      style={{ padding:'10px',background:isSel?'rgba(201,191,166,0.08)':D2,border:`2px solid ${isSel?GL:BB}`,borderRadius:3,cursor:'pointer',position:'relative' }}>
                      <div style={{ position:'absolute',top:6,right:6,width:16,height:16,borderRadius:'50%',background:isSel?GL:'transparent',border:`2px solid ${isSel?GL:BB}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:B,fontWeight:800 }}>{isSel&&'✓'}</div>
                      <div style={{ fontSize:12,fontWeight:700,color:W,fontFamily:FD,marginBottom:2,paddingRight:20 }}>{p.fullName}</div>
                      <div style={{ fontSize:10,color:WD }}>{p.city||'—'}</div>
                      {isAlloc&&isSel&&<div style={{ fontSize:9,color:TEAL,fontWeight:700,marginTop:4 }}>✓ Allocated</div>}
                      {!isAlloc&&isSel&&<div style={{ fontSize:9,color:GREEN,fontWeight:700,marginTop:4 }}>+ Adding</div>}
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ display:'flex',justifyContent:'flex-end',gap:10,paddingTop:12,borderTop:`1px solid ${BB}`,flexWrap:'wrap' }}>
              <button onClick={onClose} style={{ padding:'10px 14px',background:'transparent',border:`1px solid ${BB}`,color:WM,fontFamily:FB,fontSize:12,cursor:'pointer',borderRadius:2 }}>Close</button>
              <button onClick={saveAllocations} disabled={savingAlloc}
                style={{ padding:'10px 20px',background:savingAlloc?BB:`linear-gradient(135deg,${GL},${G})`,border:'none',color:savingAlloc?WD:B,fontFamily:FD,fontSize:12,fontWeight:700,cursor:savingAlloc?'not-allowed':'pointer',borderRadius:2 }}>
                {savingAlloc?'Saving…':'Save Allocations'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const JobsPageContent: React.FC = () => {
  const [jobs,     setJobs]     = useState<Job[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState<'create'|'edit'|'view'|null>(null);
  const [editing,  setEditing]  = useState<Job|null>(null);
  const [form,     setForm]     = useState({...EMPTY_FORM});
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [search,   setSearch]   = useState('');
  const [statusF,  setStatusF]  = useState('all');
  const [clients,  setClients]  = useState<Client[]>([]);
  const [supervisors, setSupervisors] = useState<SupervisorOpt[]>([]);
  const [deleting, setDeleting] = useState<string|null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderOpt[]>([]);
  const [poNotice, setPoNotice] = useState('');

  useEffect(() => { injectAdminMobileStyles(); }, []);

  // ── Broadcast jobs to localStorage so promoter/business dashboards react ────
  const broadcastJobs = (jobList: Job[]) => {
    try {
      // Shape matches what jobsData.ts / promoter dashboard expect
      const mapped = jobList.map((j: any) => ({
        id: j.id, title: j.title, company: j.client, client: j.client, clientId: j.clientId,
        brand: j.brand, venue: j.venue, location: [j.venue, j.city].filter(Boolean).join(', '),
        address: j.address, city: j.city, lat: j.lat, lng: j.lng,
        date: j.date, jobDate: j.date, endDate: j.endDate,
        startTime: j.startTime, endTime: j.endTime,
        pay: `R${j.hourlyRate}`, payPer: '/hr', hourlyRate: j.hourlyRate,
        slots: j.totalSlots, totalSlots: j.totalSlots,
        slotsLeft: j.totalSlots - (j.filledSlots || 0), filledSlots: j.filledSlots || 0,
        status: (j.status || 'OPEN').toLowerCase(), type: j.filters?.category || 'Brand Activation',
        tags: [j.filters?.gender, j.filters?.category].filter(Boolean),
        filters: j.filters, termsAndConditions: j.termsAndConditions,
        approvedAt: j.updatedAt || j.createdAt || new Date().toISOString(),
        accentLine: '#C9BFA6', gradient: 'transparent', companyInitial: (j.client||'?').charAt(0),
      }));
      localStorage.setItem('hg_admin_jobs', JSON.stringify(mapped));
      // Fire both keys so all listeners are notified
      window.dispatchEvent(new StorageEvent('storage', { key: 'hg_admin_jobs' }));
      window.dispatchEvent(new StorageEvent('storage', { key: 'hg_job_updates' }));
    } catch { /* silent */ }
  };

  const loadJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/jobs`,{headers:authHdr() as any});
      if(res.ok) {
        const data = await res.json();
        setJobs(data);
        broadcastJobs(data);
      }
    }
    catch {}
    setLoading(false);
  };

  const loadClients = async () => {
    try {
      const res = await fetch(`${API}/users?role=BUSINESS`,{headers:authHdr() as any});
      if(res.ok){ const data=await res.json(); setClients(data.map((u:any)=>({id:u.id,name:u.fullName,email:u.email}))); }
    } catch {}
  };

  const loadSupervisors = async () => {
    try {
      const res = await fetch(`${API}/users?role=SUPERVISOR`,{headers:authHdr() as any});
      if(res.ok){ const data=await res.json(); setSupervisors(data.map((u:any)=>({id:u.id,name:u.fullName,email:u.email}))); }
    } catch {}
  };

  // Approved businesses' purchase orders — used to link a job to a PO so its
  // cost can be deducted from that client's budget automatically.
  const loadPurchaseOrders = async () => {
    try {
      const data = await purchaseOrdersService.getAll();
      setPurchaseOrders((data as any[]).map((p: any) => ({
        id: p.id, poNumber: p.poNumber, clientId: p.clientId || p.client?.id,
        amount: p.amount, committedAmount: p.committedAmount, remainingAmount: p.remainingAmount,
        client: p.client,
      })));
    } catch { /* non-fatal — PO linking is optional */ }
  };

  useEffect(()=>{ loadJobs(); loadClients(); loadPurchaseOrders(); loadSupervisors(); },[]);

  // ── Poll so a promoter applying to a job shows up here (and in the
  //    business/supervisor dashboards) without needing a manual refresh ──────
  useEffect(() => {
    const poll = setInterval(loadJobs, 20000);
    const onFocus = () => loadJobs();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(poll); window.removeEventListener('focus', onFocus); };
  }, []);

  const F = (key: string, val: any) => setForm(f=>({...f,[key]:val}));

  const buildAddress = (f: typeof form) => {
    const parts = [f.streetNumber&&f.streetName?`${f.streetNumber} ${f.streetName}`:f.streetName||'',f.suburb,f.city,f.postalCode].filter(Boolean);
    return parts.join(', ');
  };

  const geocodeAddress = async (address: string): Promise<{lat:number;lng:number}|null> => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address+', South Africa')}&format=json&limit=1`);
      if(!r.ok) return null;
      const d = await r.json();
      if(d[0]) return { lat:parseFloat(d[0].lat), lng:parseFloat(d[0].lon) };
    } catch {}
    return null;
  };

  const openCreate = () => { setForm({...EMPTY_FORM}); setEditing(null); setError(''); setPoNotice(''); setModal('create'); };
  const openEdit = (job: Job) => {
    const hasCoords = job.lat && job.lng && !(job.lat === -26.2041 && job.lng === 28.0473);
    setForm({
      title:job.title,client:job.client,clientId:job.clientId||'',brand:job.brand||'',venue:job.venue||'',
      streetNumber:job.streetNumber||'',streetName:job.streetName||'',suburb:job.suburb||'',
      city:job.city||'',postalCode:job.postalCode||'',
      coordsInput: hasCoords ? `${job.lat}, ${job.lng}` : '',
      locationMode: hasCoords ? 'coords' : 'address',
      date:job.date?job.date.slice(0,10):'',endDate:job.endDate?job.endDate.slice(0,10):'',
      startTime:job.startTime||'09:00',endTime:job.endTime||'17:00',
      hourlyRate:String(job.hourlyRate||''),totalSlots:String(job.totalSlots||4),
      filledSlots:String(job.filledSlots||0),status:job.status||'OPEN',
      filters:job.filters||{},termsAndConditions:job.termsAndConditions||'',
      purchaseOrderId: job.purchaseOrderId || '',
      supervisorId: job.supervisorId || job.supervisor?.id || '',
    });
    setEditing(job); setError(''); setPoNotice(''); setModal('edit');
  };

  // Purchase orders belonging to the currently-selected client
  const clientPOs = purchaseOrders.filter(po => {
    const selectedClient = clients.find(c => c.name === form.client);
    const idMatch = !!selectedClient?.id && po.clientId === selectedClient.id;
    const nameMatch = !!po.client?.name && po.client.name === form.client;
    return idMatch || nameMatch;
  });

  const save = async () => {
    if(!form.title||!form.client||!form.date){ setError('Title, client and date are required.'); return; }
    if(!form.hourlyRate||Number(form.hourlyRate)<=0){ setError('Hourly rate must be > 0.'); return; }

    // ── PO is now mandatory: a job can only be posted for a business that
    // has an active Purchase Order with enough remaining budget to cover it.
    if (modal === 'create') {
      if (!form.purchaseOrderId) {
        setError("This business has no Purchase Order selected. They need a topped-up PO (Budget Tracking) before you can post a job for them.");
        return;
      }
      const po = purchaseOrders.find(p => p.id === form.purchaseOrderId);
      const est = estimateJobCost(Number(form.hourlyRate)||0, Number(form.totalSlots)||1, form.startTime, form.endTime);
      if (!po || est > po.remainingAmount) {
        setError(`Insufficient budget on ${po?.poNumber || 'the selected PO'} — this job costs R${est.toLocaleString('en-ZA')} but only R${(po?.remainingAmount||0).toLocaleString('en-ZA')} remains. Top up the PO in Budget Tracking first.`);
        return;
      }
    }

    setSaving(true); setError(''); setPoNotice('');
    const selectedClient = clients.find(c=>c.name===form.client);
    const fullAddress = buildAddress(form);

    // ── Resolve coordinates ──────────────────────────────────────────────────
    let lat = -26.2041, lng = 28.0473;
    let resolvedFromCoords = false;

    if (form.locationMode === 'coords' && form.coordsInput.trim()) {
      // Parse "lat, lng" or "lat,lng" directly — most accurate
      const parts = form.coordsInput.replace(/\s/g, '').split(',');
      if (parts.length === 2) {
        const parsedLat = parseFloat(parts[0]);
        const parsedLng = parseFloat(parts[1]);
        if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
          lat = parsedLat; lng = parsedLng; resolvedFromCoords = true;
        } else {
          setError('Invalid coordinates. Use format: -26.176894, 28.328616'); setSaving(false); return;
        }
      } else {
        setError('Invalid coordinates. Use format: -26.176894, 28.328616'); setSaving(false); return;
      }
    }

    if (!resolvedFromCoords && fullAddress) {
      const geo = await geocodeAddress(fullAddress);
      if (geo) { lat = geo.lat; lng = geo.lng; }
    }

    const body: any = {
      title:form.title,client:selectedClient?.name||form.client,brand:form.brand||form.client,
      venue:form.venue,streetNumber:form.streetNumber,streetName:form.streetName,
      suburb:form.suburb,city:form.city,postalCode:form.postalCode,address:fullAddress,lat,lng,
      date:form.date,endDate:form.endDate||undefined,startTime:form.startTime,endTime:form.endTime,
      hourlyRate:Number(form.hourlyRate)||0,totalSlots:Number(form.totalSlots)||1,
      filledSlots:Number(form.filledSlots)||0,status:form.status,filters:form.filters||{},
      termsAndConditions:form.termsAndConditions,
    };
    if(selectedClient?.id) body.clientId=selectedClient.id;
    if(form.purchaseOrderId) body.purchaseOrderId=form.purchaseOrderId;
    body.supervisorId = form.supervisorId || null;

    try {
      const method=modal==='edit'&&editing?'PUT':'POST';
      const url=modal==='edit'&&editing?`${API}/jobs/${editing.id}`:`${API}/jobs`;
      const res=await fetch(url,{method,headers:{...authHdr(),'Content-Type':'application/json'} as any,body:JSON.stringify(body)});
      if(res.ok){
        const savedJob = await res.json().catch(() => null);

        // ── Deduct this job's estimated cost from the linked PO ──────────────
        // Only do this once, when the job is first created and a PO was
        // selected — editing an existing job's PO link does not double-charge.
        if (modal === 'create' && form.purchaseOrderId) {
          const est = estimateJobCost(Number(form.hourlyRate)||0, Number(form.totalSlots)||1, form.startTime, form.endTime);
          try {
            await purchaseOrdersService.createCommitment({
              purchaseOrderId: form.purchaseOrderId,
              jobId: savedJob?.id,
              amount: est,
              notes: `Auto-created for job: ${form.title}`,
              allowOverride: false,
            });
            setPoNotice(`✓ R${est.toLocaleString('en-ZA')} committed against the linked PO for this job.`);
          } catch (ceErr: any) {
            // Budget was already validated before the job was created, so this
            // should only fire on a race with another concurrent job post.
            setError(ceErr?.message || 'Job was created, but the budget commitment failed — check Budget Tracking.');
          }
          loadPurchaseOrders();
        }

        await loadJobs();
        setModal(null);
      }
      else{ const d=await res.json(); setError(d.error||'Failed to save job.'); }
    } catch { setError('Network error.'); }
    setSaving(false);
  };

  const deleteJob = async (id: string) => {
    try { await fetch(`${API}/jobs/${id}`,{method:'DELETE',headers:authHdr() as any}); await loadJobs(); setDeleting(null); if(modal) setModal(null); }
    catch { setError('Failed to delete job.'); }
  };

  const filtered = jobs.filter(j=>(statusF==='all'||j.status===statusF)&&(!search||j.title.toLowerCase().includes(search.toLowerCase())||j.client.toLowerCase().includes(search.toLowerCase())));
  const statusColor = (s: string) => s==='OPEN'?GL:s==='FILLED'?G:s==='IN_PROGRESS'?TEAL:s==='CANCELLED'?CORAL:WD;
  const displayAddress = (job: Job) => {
    const parts=[job.streetNumber&&job.streetName?`${job.streetNumber} ${job.streetName}`:job.streetName||'',job.suburb,job.city,job.postalCode].filter(Boolean);
    return parts.length>0?parts.join(', '):(job.address||job.venue||'—');
  };
  const estimatedCost = estimateJobCost(Number(form.hourlyRate)||0, Number(form.totalSlots)||1, form.startTime, form.endTime);
  const selectedPO = purchaseOrders.find(po => po.id === form.purchaseOrderId);

  return (
    <div className="hg-page" style={{ padding:'40px 48px' }}>

      {/* Header */}
      <div className="hg-page-header">
        <div>
          <div style={{ fontSize:9,letterSpacing:'0.38em',textTransform:'uppercase',color:GL,marginBottom:8,fontWeight:700 }}>Operations</div>
          <h1 style={{ fontFamily:FD,fontSize:28,fontWeight:700,color:W }}>Manage Jobs</h1>
          <p style={{ fontSize:13,color:WM,marginTop:4 }}>{jobs.length} total · {jobs.filter(j=>j.status==='OPEN').length} open</p>
        </div>
        <button onClick={openCreate} style={{ padding:'11px 22px',background:`linear-gradient(135deg,${GL},${G})`,border:'none',color:B,fontFamily:FD,fontSize:11,fontWeight:700,cursor:'pointer',borderRadius:3,letterSpacing:'0.08em',whiteSpace:'nowrap' }}>
          + New Job
        </button>
      </div>

      {/* Stats */}
      <div className="hg-stat-grid hg-stat-grid-5" style={{ background:BB,marginBottom:28 }}>
        {[
          {label:'Total',      value:jobs.length,color:GL},
          {label:'Open',       value:jobs.filter(j=>j.status==='OPEN').length,color:GL},
          {label:'Filled',     value:jobs.filter(j=>j.status==='FILLED').length,color:G},
          {label:'In Progress',value:jobs.filter(j=>j.status==='IN_PROGRESS').length,color:TEAL},
          {label:'Cancelled',  value:jobs.filter(j=>j.status==='CANCELLED').length,color:CORAL},
        ].map(s=>(
          <div key={s.label} style={{ background:D2,padding:'16px 18px',position:'relative' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${s.color},${s.color}44)` }} />
            <div className="hg-stat-val" style={{ fontFamily:FD,fontSize:26,fontWeight:700,color:W }}>{s.value}</div>
            <div style={{ fontSize:9,color:WM,marginTop:4,letterSpacing:'0.16em',textTransform:'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="hg-filter-row" style={{ marginBottom:20 }}>
        <input placeholder="Search jobs or client…" value={search} onChange={e=>setSearch(e.target.value)}
          style={{ ...inp,maxWidth:240 }}
          onFocus={e=>e.currentTarget.style.borderColor=GL} onBlur={e=>e.currentTarget.style.borderColor=BB} />
        <div style={{ display:'flex',gap:4,flexWrap:'wrap' }}>
          {['all','OPEN','FILLED','IN_PROGRESS','COMPLETED','CANCELLED'].map(s=>(
            <button key={s} onClick={()=>setStatusF(s)}
              style={{ padding:'6px 10px',border:`1px solid ${statusF===s?GL:BB}`,background:statusF===s?'rgba(201,191,166,0.12)':'transparent',color:statusF===s?GL:WM,fontFamily:FB,fontSize:9,cursor:'pointer',borderRadius:2,whiteSpace:'nowrap' }}>
              {s==='all'?'All':s.replace('_',' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="hg-table-wrap" style={{ background:D2,border:`1px solid ${BB}`,borderRadius:2,overflow:'hidden' }}>
        {loading?(
          <div style={{ padding:60,textAlign:'center',color:WD }}>Loading jobs…</div>
        ):(
          <table className="hg-table-cards" style={{ width:'100%',borderCollapse:'collapse',minWidth:640 }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${BB}` }}>
                {['Title / Client','Venue','Date','Rate','Slots','Status','Actions'].map(h=>(
                  <th key={h} style={{ padding:'11px 14px',textAlign:'left',fontSize:9,fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase',color:WD }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((job,i)=>(
                <tr key={job.id}
                  style={{ borderBottom:i<filtered.length-1?`1px solid ${BB}`:'none',cursor:'pointer' }}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.02)'}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}
                  onClick={()=>{ setEditing(job); setModal('view'); }}>
                  <td data-label="Title" style={{ padding:'12px 14px' }}>
                    <div style={{ fontSize:13,fontWeight:700,color:W }}>{job.title}</div>
                    <div style={{ fontSize:11,color:WM }}>{job.client}</div>
                  </td>
                  <td data-label="Venue" className="hg-col-hide-sm" style={{ padding:'12px 14px',fontSize:12,color:W }}>{job.venue||'—'}</td>
                  <td data-label="Date" className="hg-col-hide-md" style={{ padding:'12px 14px',fontSize:12,color:WM,whiteSpace:'nowrap' }}>
                    {job.date?new Date(job.date).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'2-digit'}):'—'}
                  </td>
                  <td data-label="Rate" style={{ padding:'12px 14px',fontSize:13,color:GL,fontWeight:700 }}>R{job.hourlyRate}/hr</td>
                  <td data-label="Slots" style={{ padding:'12px 14px',fontSize:12,color:W }}>{job.filledSlots}/{job.totalSlots}</td>
                  <td data-label="Status" style={{ padding:'12px 14px' }}>
                    <span style={{ fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:statusColor(job.status),background:`${statusColor(job.status)}18`,padding:'3px 9px',borderRadius:2 }}>{job.status}</span>
                  </td>
                  <td data-label="Actions" style={{ padding:'12px 14px' }} onClick={e=>e.stopPropagation()}>
                    <div style={{ display:'flex',gap:8 }}>
                      <button onClick={()=>openEdit(job)} style={{ fontSize:11,color:GL,background:'none',border:'none',cursor:'pointer' }}>Edit</button>
                      <button onClick={()=>setDeleting(job.id)} style={{ fontSize:11,color:CORAL,background:'none',border:'none',cursor:'pointer' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading&&filtered.length===0&&<div style={{ padding:48,textAlign:'center',color:WD,fontSize:13 }}>No jobs match your filters.</div>}
      </div>

      {/* Delete confirm */}
      {deleting&&(
        <div className="hg-modal-overlay" style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:400,padding:16 }}>
          <div className="hg-modal-box" style={{ background:BC,border:`1px solid ${CORAL}`,padding:'28px 24px',maxWidth:360,width:'100%',borderRadius:3 }}>
            <h3 style={{ fontFamily:FD,fontSize:20,color:W,marginBottom:10 }}>Delete Job?</h3>
            <p style={{ fontSize:13,color:WM,marginBottom:22 }}>This will permanently remove the job and all applications. Any budget already deducted for it will need to be cancelled manually from Budget Tracking.</p>
            <div style={{ display:'flex',gap:10 }}>
              <button onClick={()=>setDeleting(null)} style={{ flex:1,padding:'11px',background:'transparent',border:`1px solid ${BB}`,color:WM,fontFamily:FB,fontSize:12,cursor:'pointer',borderRadius:2 }}>Cancel</button>
              <button onClick={()=>deleteJob(deleting)} style={{ flex:1,padding:'11px',background:CORAL,border:'none',color:W,fontFamily:FB,fontSize:12,fontWeight:700,cursor:'pointer',borderRadius:2 }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* View modal */}
      {modal==='view'&&editing&&(
        <JobViewModal job={editing} onClose={()=>setModal(null)} onEdit={()=>openEdit(editing)} onDelete={()=>{ setModal(null); setDeleting(editing.id); }} displayAddress={displayAddress} statusColor={statusColor} />
      )}

      {/* Create / Edit modal */}
      {(modal==='create'||modal==='edit')&&(
        <div className="hg-modal-overlay" style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300,padding:16 }}
          onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="hg-modal-box" style={{ background:BC,border:`1px solid ${BB}`,width:'100%',maxWidth:640,maxHeight:'94vh',overflowY:'auto',position:'relative',borderRadius:3 }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${G3},${GL},${G3})` }} />
            <button onClick={()=>setModal(null)} style={{ position:'absolute',top:16,right:20,background:'none',border:'none',cursor:'pointer',color:WM,fontSize:18 }}>✕</button>
            <div className="hg-modal-inner" style={{ padding:'32px 24px 28px' }}>
              <div style={{ fontSize:9,letterSpacing:'0.3em',textTransform:'uppercase',color:GL,marginBottom:8,fontWeight:700 }}>{modal==='create'?'New Job':'Edit Job'}</div>
              <h2 style={{ fontFamily:FD,fontSize:20,fontWeight:700,color:W,marginBottom:22 }}>{modal==='create'?'Create a New Job':`Editing: ${editing?.title}`}</h2>
              {error&&<div style={{ padding:'10px 12px',background:`${CORAL}12`,border:`1px solid ${CORAL}44`,marginBottom:16,fontSize:12,color:CORAL,borderRadius:2 }}>{error}</div>}
              {poNotice&&<div style={{ padding:'10px 12px',background:`${GREEN}12`,border:`1px solid ${GREEN}44`,marginBottom:16,fontSize:12,color:GREEN,borderRadius:2 }}>{poNotice}</div>}

              <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
                <div>
                  <label style={lbl}>Job Title *</label>
                  <input style={inp} value={form.title} onChange={e=>F('title',e.target.value)} placeholder="e.g. Brand Ambassador – Pick n Pay"
                    onFocus={e=>e.currentTarget.style.borderColor=GL} onBlur={e=>e.currentTarget.style.borderColor=BB} />
                </div>

                <div>
                  <label style={lbl}>Client *</label>
                  <select style={sel} value={form.client} onChange={e=>{ const name=e.target.value; const found=clients.find(c=>c.name===name); setForm(f=>({...f,client:name,clientId:found?.id||'',purchaseOrderId:''})); }}>
                    <option value="">— Select client —</option>
                    <optgroup label="Registered Clients">{clients.map(c=><option key={c.id} value={c.name}>{c.name} ✓</option>)}</optgroup>
                    <optgroup label="Manual">{['Shoprite','Checkers','Pick n Pay','Woolworths','Vodacom','MTN','SAB','Other'].map(n=><option key={n} value={n}>{n}</option>)}</optgroup>
                  </select>
                </div>

                {/* ── Purchase Order link — deducts this job's cost from the client's PO budget ── */}
                <div style={{ background:'rgba(170,160,135,0.04)',border:`1px solid ${BB}`,borderRadius:3,padding:'14px 12px' }}>
                  <div style={{ fontSize:9,letterSpacing:'0.22em',textTransform:'uppercase',color:GL,fontWeight:700,marginBottom:10 }}>💳 Purchase Order (Budget Tracking) <span style={{ color:GL }}>*</span></div>
                  <select style={sel} value={form.purchaseOrderId} onChange={e=>F('purchaseOrderId',e.target.value)}>
                    <option value="">— Select a PO with available budget —</option>
                    {clientPOs.map(po=>(
                      <option key={po.id} value={po.id} disabled={po.remainingAmount<=0}>{po.poNumber} — R{po.remainingAmount.toLocaleString('en-ZA')} remaining{po.remainingAmount<=0?' (depleted)':''}{po.client?.name?` (${po.client.name})`:''}</option>
                    ))}
                  </select>
                  {clientPOs.length===0 && (
                    <p style={{ fontSize:11,color:CORAL,marginTop:8 }}>⚠ No purchase orders found for this client. You must create one in Budget Tracking before you can post a job for them.</p>
                  )}
                  {modal==='create' && form.purchaseOrderId && (
                    <div style={{ marginTop:10,padding:'8px 10px',background:'rgba(201,191,166,0.06)',borderRadius:2 }}>
                      <p style={{ fontSize:11,color:WM,lineHeight:1.6 }}>
                        Estimated cost: <strong style={{ color:GL }}>R{estimatedCost.toLocaleString('en-ZA')}</strong> (rate × slots × shift hours) will be deducted from <strong style={{ color:GL }}>{selectedPO?.poNumber}</strong> when this job is created.
                      </p>
                    </div>
                  )}
                </div>

                {/* ── Supervisor assignment — who oversees this job on the ground ── */}
                <div style={{ background:'rgba(170,160,135,0.04)',border:`1px solid ${BB}`,borderRadius:3,padding:'14px 12px' }}>
                  <div style={{ fontSize:9,letterSpacing:'0.22em',textTransform:'uppercase',color:GL,fontWeight:700,marginBottom:10 }}>☺ Assign Supervisor</div>
                  <select style={sel} value={form.supervisorId} onChange={e=>F('supervisorId',e.target.value)}>
                    <option value="">— No supervisor assigned —</option>
                    {supervisors.map(s=><option key={s.id} value={s.id}>{s.name}{s.email?` (${s.email})`:''}</option>)}
                  </select>
                  {supervisors.length===0 && (
                    <p style={{ fontSize:11,color:WD,marginTop:8 }}>No supervisor accounts found yet.</p>
                  )}
                </div>

                <div className="hg-form-grid-2" style={{ gap:12 }}>
                  <div>
                    <label style={lbl}>Brand</label>
                    <input style={inp} value={form.brand} onChange={e=>F('brand',e.target.value)} placeholder="e.g. Coca-Cola"
                      onFocus={e=>e.currentTarget.style.borderColor=GL} onBlur={e=>e.currentTarget.style.borderColor=BB} />
                  </div>
                  <div>
                    <label style={lbl}>Category</label>
                    <select style={sel} value={form.filters?.category||''} onChange={e=>F('filters',{...form.filters,category:e.target.value})}>
                      <option value="">— Select —</option>
                      {CATEGORY_OPTS.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={lbl}>Venue Name</label>
                  <input style={inp} value={form.venue} onChange={e=>F('venue',e.target.value)} placeholder="e.g. Sandton City Mall"
                    onFocus={e=>e.currentTarget.style.borderColor=GL} onBlur={e=>e.currentTarget.style.borderColor=BB} />
                </div>

                {/* ── Location block — Address OR GPS Coordinates ── */}
                <div style={{ background:'rgba(170,160,135,0.04)',border:`1px solid ${BB}`,borderRadius:3,padding:'14px 12px' }}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
                    <div style={{ fontSize:9,letterSpacing:'0.22em',textTransform:'uppercase',color:GL,fontWeight:700 }}>📍 Venue Location</div>
                    {/* Mode toggle */}
                    <div style={{ display:'flex',gap:0,border:`1px solid ${BB}`,borderRadius:3,overflow:'hidden' }}>
                      {(['address','coords'] as const).map(mode=>(
                        <button key={mode} type="button" onClick={()=>F('locationMode',mode)}
                          style={{ padding:'5px 14px',background:form.locationMode===mode?`rgba(201,191,166,0.18)`:'transparent',border:'none',color:form.locationMode===mode?GL:WM,fontFamily:FB,fontSize:10,fontWeight:form.locationMode===mode?700:400,cursor:'pointer',letterSpacing:'0.06em',transition:'all 0.18s' }}>
                          {mode==='address'?'🏠 Address':'📡 GPS Coords'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── ADDRESS MODE ── */}
                  {form.locationMode==='address'&&(
                    <>
                      <div className="hg-form-grid-2 hg-addr-grid-top" style={{ gap:10,marginBottom:10 }}>
                        <div>
                          <label style={lbl}>Street Number</label>
                          <input style={inp} value={form.streetNumber} onChange={e=>F('streetNumber',e.target.value)} placeholder="12"
                            onFocus={e=>e.currentTarget.style.borderColor=GL} onBlur={e=>e.currentTarget.style.borderColor=BB} />
                        </div>
                        <div>
                          <label style={lbl}>Street Name</label>
                          <input style={inp} value={form.streetName} onChange={e=>F('streetName',e.target.value)} placeholder="Rivonia Road"
                            onFocus={e=>e.currentTarget.style.borderColor=GL} onBlur={e=>e.currentTarget.style.borderColor=BB} />
                        </div>
                      </div>
                      <div className="hg-form-grid-3 hg-addr-grid-bot" style={{ gap:10 }}>
                        <div>
                          <label style={lbl}>Suburb</label>
                          <input style={inp} value={form.suburb} onChange={e=>F('suburb',e.target.value)} placeholder="Sandton"
                            onFocus={e=>e.currentTarget.style.borderColor=GL} onBlur={e=>e.currentTarget.style.borderColor=BB} />
                        </div>
                        <div>
                          <label style={lbl}>City</label>
                          <input style={inp} value={form.city} onChange={e=>F('city',e.target.value)} placeholder="Johannesburg"
                            onFocus={e=>e.currentTarget.style.borderColor=GL} onBlur={e=>e.currentTarget.style.borderColor=BB} />
                        </div>
                        <div>
                          <label style={lbl}>Postal Code</label>
                          <input style={inp} value={form.postalCode} onChange={e=>F('postalCode',e.target.value.replace(/\D/g,'').slice(0,4))} placeholder="2196" maxLength={4}
                            onFocus={e=>e.currentTarget.style.borderColor=GL} onBlur={e=>e.currentTarget.style.borderColor=BB} />
                        </div>
                      </div>
                      {buildAddress(form)&&<div style={{ marginTop:8,fontSize:11,color:WM,background:'rgba(170,160,135,0.06)',padding:'6px 10px',borderRadius:2 }}>📌 <strong style={{ color:GL }}>{buildAddress(form)}</strong></div>}
                      <div style={{ marginTop:10,padding:'8px 10px',background:'rgba(201,191,166,0.04)',border:`1px solid ${BB}`,borderRadius:2 }}>
                        <p style={{ fontSize:11,color:WM,lineHeight:1.6 }}>
                          💡 <strong style={{ color:GL }}>Tip:</strong> If the check-in location is inaccurate, switch to <strong style={{ color:GL }}>GPS Coords</strong> mode and paste the exact coordinates from Google Maps for a precise pin.
                        </p>
                      </div>
                    </>
                  )}

                  {/* ── GPS COORDS MODE ── */}
                  {form.locationMode==='coords'&&(
                    <>
                      <div>
                        <label style={lbl}>GPS Coordinates <span style={{ color:GL }}>*</span></label>
                        <input style={{ ...inp, fontFamily:"'DM Mono', monospace", letterSpacing:'0.04em' }}
                          value={form.coordsInput}
                          onChange={e=>F('coordsInput',e.target.value)}
                          placeholder="-26.176894, 28.328616"
                          onFocus={e=>e.currentTarget.style.borderColor=GL}
                          onBlur={e=>e.currentTarget.style.borderColor=BB} />
                        <p style={{ fontSize:11,color:WM,marginTop:5,lineHeight:1.6 }}>
                          Paste the lat, lng from Google Maps. Example: <span style={{ color:GL,fontFamily:'monospace' }}>-26.176894, 28.328616</span>
                        </p>
                      </div>

                      {/* Live coordinate preview + validation */}
                      {(()=>{
                        const parts = form.coordsInput.replace(/\s/g,'').split(',');
                        const parsedLat = parseFloat(parts[0]);
                        const parsedLng = parseFloat(parts[1]);
                        const valid = parts.length===2 && !isNaN(parsedLat) && !isNaN(parsedLng);
                        const inSA = valid && parsedLat>=-35 && parsedLat<=-22 && parsedLng>=16 && parsedLng<=33;
                        if (!form.coordsInput.trim()) return null;
                        return (
                          <div style={{ marginTop:8,padding:'10px 12px',background:valid?'rgba(74,222,128,0.06)':'rgba(196,97,74,0.08)',border:`1px solid ${valid?'rgba(74,222,128,0.3)':'rgba(196,97,74,0.4)'}`,borderRadius:3 }}>
                            {valid ? (
                              <>
                                <div style={{ fontSize:11,color:GREEN,fontWeight:700,marginBottom:4 }}>✓ Valid coordinates{inSA?' — within South Africa':' — ⚠ outside SA'}</div>
                                <div style={{ fontSize:11,color:WM }}>Lat: <strong style={{ color:W }}>{parsedLat}</strong> · Lng: <strong style={{ color:W }}>{parsedLng}</strong></div>
                                <a href={`https://www.google.com/maps?q=${parsedLat},${parsedLng}`} target="_blank" rel="noreferrer"
                                  style={{ display:'inline-block',marginTop:6,fontSize:11,color:GL,textDecoration:'none',borderBottom:`1px solid ${GL}44` }}>
                                  🗺 Verify on Google Maps →
                                </a>
                              </>
                            ) : (
                              <div style={{ fontSize:11,color:CORAL }}>✗ Invalid format — use: <span style={{ fontFamily:'monospace' }}>-26.176894, 28.328616</span></div>
                            )}
                          </div>
                        );
                      })()}

                      {/* How-to guide */}
                      <div style={{ marginTop:10,padding:'10px 12px',background:'rgba(170,160,135,0.04)',border:`1px solid ${BB}`,borderRadius:3 }}>
                        <div style={{ fontSize:9,color:GL,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:6 }}>How to get exact coordinates</div>
                        <ol style={{ margin:0,paddingLeft:16 }}>
                          {[
                            'Open Google Maps on your phone or browser',
                            'Navigate to the exact venue entrance / location',
                            'Long-press on the spot until a red pin drops',
                            'Tap the coordinates shown at the bottom (e.g. -26.1768, 28.3260)',
                            'Copy and paste them into the field above',
                          ].map((step,i)=>(
                            <li key={i} style={{ fontSize:11,color:WM,lineHeight:1.7 }}>{step}</li>
                          ))}
                        </ol>
                        <a href="https://maps.google.com" target="_blank" rel="noreferrer"
                          style={{ display:'inline-block',marginTop:8,padding:'6px 12px',background:`rgba(201,191,166,0.12)`,border:`1px solid ${BB}`,color:GL,fontSize:10,fontWeight:700,textDecoration:'none',borderRadius:2,letterSpacing:'0.06em' }}>
                          🗺 Open Google Maps →
                        </a>
                      </div>

                      {/* Still allow suburb/city for display purposes */}
                      <div className="hg-form-grid-2" style={{ gap:10,marginTop:12 }}>
                        <div>
                          <label style={lbl}>Suburb <span style={{ color:WM,fontWeight:400,textTransform:'none',letterSpacing:0 }}>(for display)</span></label>
                          <input style={inp} value={form.suburb} onChange={e=>F('suburb',e.target.value)} placeholder="Sandton"
                            onFocus={e=>e.currentTarget.style.borderColor=GL} onBlur={e=>e.currentTarget.style.borderColor=BB} />
                        </div>
                        <div>
                          <label style={lbl}>City <span style={{ color:WM,fontWeight:400,textTransform:'none',letterSpacing:0 }}>(for display)</span></label>
                          <input style={inp} value={form.city} onChange={e=>F('city',e.target.value)} placeholder="Johannesburg"
                            onFocus={e=>e.currentTarget.style.borderColor=GL} onBlur={e=>e.currentTarget.style.borderColor=BB} />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="hg-form-grid-2" style={{ gap:12 }}>
                  <div><label style={lbl}>Start Date *</label><input type="date" style={inp} value={form.date} onChange={e=>F('date',e.target.value)} onFocus={e=>e.currentTarget.style.borderColor=GL} onBlur={e=>e.currentTarget.style.borderColor=BB} /></div>
                  <div><label style={lbl}>End Date</label><input type="date" style={inp} value={form.endDate} onChange={e=>F('endDate',e.target.value)} onFocus={e=>e.currentTarget.style.borderColor=GL} onBlur={e=>e.currentTarget.style.borderColor=BB} /></div>
                  <div><label style={lbl}>Start Time</label><input type="time" style={inp} value={form.startTime} onChange={e=>F('startTime',e.target.value)} onFocus={e=>e.currentTarget.style.borderColor=GL} onBlur={e=>e.currentTarget.style.borderColor=BB} /></div>
                  <div><label style={lbl}>End Time</label><input type="time" style={inp} value={form.endTime} onChange={e=>F('endTime',e.target.value)} onFocus={e=>e.currentTarget.style.borderColor=GL} onBlur={e=>e.currentTarget.style.borderColor=BB} /></div>
                </div>

                <div className="hg-form-grid-2" style={{ gap:12 }}>
                  <div><label style={lbl}>Hourly Rate (R)</label><input type="number" style={inp} value={form.hourlyRate} onChange={e=>F('hourlyRate',e.target.value)} placeholder="125" onFocus={e=>e.currentTarget.style.borderColor=GL} onBlur={e=>e.currentTarget.style.borderColor=BB} /></div>
                  <div><label style={lbl}>Total Slots</label><input type="number" style={inp} value={form.totalSlots} onChange={e=>F('totalSlots',e.target.value)} placeholder="4" onFocus={e=>e.currentTarget.style.borderColor=GL} onBlur={e=>e.currentTarget.style.borderColor=BB} /></div>
                </div>

                <div><label style={lbl}>Status</label><select style={sel} value={form.status} onChange={e=>F('status',e.target.value)}>{STATUS_OPTS.map(s=><option key={s} value={s}>{s}</option>)}</select></div>

                <div className="hg-form-grid-2" style={{ gap:12 }}>
                  <div><label style={lbl}>Gender</label><select style={sel} value={form.filters?.gender||''} onChange={e=>F('filters',{...form.filters,gender:e.target.value})}>{['Any Gender','Female','Male','Non-binary'].map(g=><option key={g} value={g}>{g}</option>)}</select></div>
                  <div><label style={lbl}>Min Height</label><input type="number" style={inp} value={form.filters?.minHeight||''} onChange={e=>F('filters',{...form.filters,minHeight:e.target.value})} placeholder="160" onFocus={e=>e.currentTarget.style.borderColor=GL} onBlur={e=>e.currentTarget.style.borderColor=BB} /></div>
                </div>

                <div>
                  <label style={lbl}>Languages <span style={{ color:WM,fontWeight:400,textTransform:'none',letterSpacing:0 }}>(select one or more)</span></label>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {['Any','English','Zulu','Xhosa','Sotho','Afrikaans','Tswana','Venda','Tsonga','Ndebele','Swati'].map(l=>{
                      const selectedLangs: string[] = Array.isArray(form.filters?.languages)
                        ? form.filters.languages
                        : (form.filters?.languages ? [form.filters.languages] : []);
                      const active = selectedLangs.includes(l);
                      const toggle = () => {
                        let next: string[];
                        if (l === 'Any') {
                          next = active ? [] : ['Any'];
                        } else if (active) {
                          next = selectedLangs.filter(x => x !== l);
                        } else {
                          next = [...selectedLangs.filter(x => x !== 'Any'), l];
                        }
                        F('filters', { ...form.filters, languages: next });
                      };
                      return (
                        <button key={l} type="button" onClick={toggle}
                          style={{
                            padding:'7px 14px', borderRadius:20, fontSize:11, fontFamily:FB, fontWeight:600,
                            cursor:'pointer', letterSpacing:'0.04em',
                            background: active ? `rgba(201,191,166,0.18)` : D3,
                            border: `1px solid ${active ? GL : BB}`,
                            color: active ? GL : WM,
                          }}>
                          {l}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div><label style={lbl}>Terms & Conditions</label><textarea style={{ ...inp,minHeight:72,resize:'vertical' } as any} value={form.termsAndConditions} onChange={e=>F('termsAndConditions',e.target.value)} placeholder="Optional terms…" onFocus={e=>e.currentTarget.style.borderColor=GL} onBlur={e=>e.currentTarget.style.borderColor=BB} /></div>

                <button onClick={save} disabled={saving}
                  style={{ padding:'13px',background:saving?BB:`linear-gradient(135deg,${GL},${G})`,border:'none',color:saving?WM:B,fontFamily:FD,fontSize:12,fontWeight:700,cursor:saving?'not-allowed':'pointer',borderRadius:2 }}>
                  {saving?'Saving…':modal==='create'?'Create Job':'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CRUDJobsLogic: React.FC = () => (
  <AdminLayout><JobsPageContent /></AdminLayout>
);
export { CRUDJobsLogic };
export default CRUDJobsLogic;