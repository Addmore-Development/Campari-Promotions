// promoter/jobs/ViewAcceptJobs.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';
import { showToast } from '../../shared/utils/toast';
import { jobsService } from '../../shared/services/jobsService'; // <-- import the service

const G   = '#8F8A7C';
const GL  = '#C9BFA6';
const G2  = '#8A8474';
const B   = '#050504';
const BC  = '#080807';
const BB  = 'rgba(170,160,135,0.12)';
const W   = '#F8F8F8';
const WM  = 'rgba(248,248,248,0.65)';
const WD  = 'rgba(248,248,248,0.28)';
const FD  = "'Playfair Display', Georgia, serif";
const FB  = "'DM Sans', system-ui, sans-serif";
const TEAL   = '#4AABB8';
const AMBER  = '#C9BFA6';
const CORAL  = '#C4614A';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function authHdr() {
  const t = localStorage.getItem('hg_token');
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : {};
}

// ── City keywords for SA ──────────────────────────────────────────────────────
const SA_CITIES = [
  'johannesburg', 'cape town', 'durban', 'pretoria', 'port elizabeth',
  'bloemfontein', 'east london', 'nelspruit', 'polokwane', 'kimberley',
  'pietermaritzburg', 'rustenburg', 'george', 'vanderbijlpark',
  'soweto', 'sandton', 'randburg', 'roodepoort', 'benoni', 'boksburg',
  'germiston', 'springs', 'midrand', 'centurion', 'tshwane', 'ekurhuleni',
  'stellenbosch', 'paarl', 'bellville', 'mitchells plain',
  'khayelitsha', 'tygervalley', 'hillbrow', 'braamfontein', 'rosebank',
  'fourways', 'alexandra', 'lenasia',
];

function extractCityTokens(cityValue: string): string[] {
  if (!cityValue) return [];
  const lower = cityValue.toLowerCase();
  const knownMatch = SA_CITIES.find(c => lower.includes(c));
  if (knownMatch) return [knownMatch];
  return cityValue
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 2 && !/^\d+$/.test(s));
}

function jobMatchesPromoterCity(job: any, promoterCityRaw: string): boolean {
  if (!promoterCityRaw) return false;
  const tokens = extractCityTokens(promoterCityRaw);
  if (tokens.length === 0) return false;
  const jobText = [job.address || '', job.venue || '', job.city || ''].join(' ').toLowerCase();
  return tokens.some(token => jobText.includes(token));
}

export const ViewAcceptJobs: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs]                 = useState<any[]>([]);
  const [profile, setProfile]           = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [applying, setApplying]         = useState<string | null>(null);
  const [appliedJob,   setAppliedJob]   = useState<any>(null);   // triggers success modal
  const [selectedJob, setSelectedJob]   = useState<any>(null);
  const [filter, setFilter]             = useState<'myCity' | 'all' | 'matched'>('all');
  const [search, setSearch]             = useState('');
  const [sortField, setSortField]       = useState<'date' | 'pay'>('date');

  const loadData = async () => {
    if (!user) return;
    try {
      // All three calls hit the real PostgreSQL-backed API
      const [jobsRes, meRes, appsRes] = await Promise.all([
        fetch(`${API}/jobs`,            { headers: authHdr() as any }),
        fetch(`${API}/auth/me`,         { headers: authHdr() as any }),
        fetch(`${API}/applications/my`, { headers: authHdr() as any }),
      ]);

      if (jobsRes.ok) setJobs(await jobsRes.json());
      if (meRes.ok)   setProfile(await meRes.json());
      if (appsRes.ok) setApplications(await appsRes.json());
    } catch (e) {
      console.error('[ViewAcceptJobs] loadData error:', e);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user]);

  const promoterCityRaw = profile?.city || '';

  // Profile match
  const isProfileMatch = (job: any): boolean => {
    if (!profile) return false;
    const f = job.filters || {};
    if (f.gender && f.gender !== 'any' && f.gender !== 'Any Gender') {
      if (f.gender.toLowerCase() !== (profile.gender || '').toLowerCase()) return false;
    }
    if (f.minHeight && (profile.height || 0) < parseInt(f.minHeight)) return false;
    return true;
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      if (!['OPEN', 'open', 'FILLED', 'filled', 'IN_PROGRESS', 'in_progress'].includes(j.status)) return false;
      if (filter === 'myCity'  && !jobMatchesPromoterCity(j, promoterCityRaw)) return false;
      if (filter === 'matched' && !isProfileMatch(j)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (![j.title, j.client, j.brand, j.venue, j.address].filter(Boolean).some((v: string) => v.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [jobs, filter, search, profile, promoterCityRaw]);

  const sortedJobs = useMemo(() => {
    return [...filteredJobs].sort((a, b) =>
      sortField === 'pay'
        ? b.hourlyRate - a.hourlyRate
        : new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [filteredJobs, sortField]);

  const handleApply = async (job: any) => {
    if (!user) return;
    if (profile?.status !== 'approved') {
      showToast('Your account must be approved before applying for jobs.', 'error');
      return;
    }
    if (promoterCityRaw && !jobMatchesPromoterCity(job, promoterCityRaw)) {
      showToast('Note: This job is outside your registered city.', 'info');
    }
    setApplying(job.id);
    try {
      const res = await fetch(`${API}/applications`, {
        method: 'POST',
        headers: authHdr() as any,
        body: JSON.stringify({ jobId: job.id }),
      });
      const data = await res.json();
      if (res.ok) {
        // Re-fetch from API so the applications list is always in sync with the DB
        const appsRes = await fetch(`${API}/applications/my`, { headers: authHdr() as any });
        if (appsRes.ok) setApplications(await appsRes.json());
        setSelectedJob(null);
        setAppliedJob(job);
      } else if (res.status === 409) {
        showToast('You have already applied for this job.', 'info');
      } else {
        showToast(data.error || 'Failed to apply. Please try again.', 'error');
      }
    } catch {
      showToast('Network error. Please check your connection and try again.', 'error');
    }
    setApplying(null);
  };

  const getAppForJob = (jobId: string) => applications.find(a => a.jobId === jobId);

  const cityDisplayName = (() => {
    if (!promoterCityRaw) return '';
    const tokens = extractCityTokens(promoterCityRaw);
    if (tokens.length === 0) return promoterCityRaw;
    return tokens[0].replace(/\b\w/g, (c: string) => c.toUpperCase());
  })();

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: WD, padding: '60px 0', justifyContent: 'center' }}>
      <div style={{ width: 24, height: 24, border: `2px solid ${GL}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ fontSize: 15, color: WM }}>Loading jobs...</span>
    </div>
  );

  return (
    <div style={{ padding: '40px 48px' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: '0.38em', textTransform: 'uppercase', color: GL, marginBottom: 8, fontWeight: 700 }}>Job Feed</div>
          <h1 style={{ fontFamily: FD, fontSize: 30, fontWeight: 700, color: W }}>Available Jobs</h1>
          <p style={{ fontSize: 13, color: WM, marginTop: 6 }}>
            {cityDisplayName
              ? `Showing jobs in ${cityDisplayName} — ${jobs.filter(j => jobMatchesPromoterCity(j, promoterCityRaw) && ['OPEN','open'].includes(j.status)).length} open positions`
              : 'Set your city in your profile to see local jobs'}
          </p>
        </div>
      </div>

      {!promoterCityRaw && (
        <div style={{ padding: '14px 18px', background: 'rgba(170,160,135,0.06)', border: '1px solid rgba(170,160,135,0.3)', borderRadius: 2, marginBottom: 24, fontSize: 13, color: GL }}>
          ⚠️ You haven't set your city yet. <a href="/promoter/?tab=profile" style={{ color: GL, fontWeight: 700 }}>Update your profile →</a>
        </div>
      )}

      {profile && profile.status !== 'approved' && (
        <div style={{ padding: '14px 18px', background: 'rgba(170,160,135,0.06)', border: '1px solid rgba(170,160,135,0.3)', borderRadius: 2, marginBottom: 24, fontSize: 13, color: GL }}>
          ⏳ Your account is pending approval. You can browse jobs but cannot apply until approved.
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { key: 'myCity',  label: `📍 In ${cityDisplayName || 'My City'}` },
            { key: 'all',     label: 'All Jobs' },
            { key: 'matched', label: '⚡ Profile Match' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key as any)}
              style={{ padding: '7px 16px', borderRadius: 30, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: filter === f.key ? GL : 'rgba(248,248,248,0.05)', color: filter === f.key ? B : WM, transition: 'all 0.2s' }}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="text" placeholder="Search jobs…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: BC, border: `1px solid ${BB}`, padding: '8px 14px', color: W, fontFamily: FB, fontSize: 12, outline: 'none', borderRadius: 20, width: 200 }}
            onFocus={e => e.currentTarget.style.borderColor = GL}
            onBlur={e => e.currentTarget.style.borderColor = BB} />
          <div style={{ display: 'flex', gap: 4 }}>
            {[{ key: 'date', label: 'Date' }, { key: 'pay', label: 'Pay' }].map(s => (
              <button key={s.key} onClick={() => setSortField(s.key as any)}
                style={{ padding: '7px 14px', borderRadius: 30, border: `1px solid ${sortField === s.key ? GL : BB}`, background: sortField === s.key ? 'rgba(201,191,166,0.12)' : 'transparent', color: sortField === s.key ? GL : WM, fontSize: 12, cursor: 'pointer' }}>
                {s.label} {sortField === s.key ? '↓' : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Job table */}
      <div style={{ background: BC, border: `1px solid ${BB}`, overflow: 'hidden', borderRadius: 2 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BB}` }}>
              {['Job Title', 'Client', 'Location', 'Date', 'Rate', 'Slots', 'My Status', 'Action'].map(h => (
                <th key={h} style={{ padding: '13px 18px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: WD, fontFamily: FB, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedJobs.map((job, i) => {
              const match  = isProfileMatch(job);
              const inCity = jobMatchesPromoterCity(job, promoterCityRaw);
              const app    = getAppForJob(job.id);

              return (
                <tr key={job.id}
                  style={{ borderBottom: i < sortedJobs.length - 1 ? `1px solid ${BB}` : 'none', transition: 'background 0.15s', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => setSelectedJob(job)}>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: W }}>{job.title}</div>
                    {match  && <div style={{ fontSize: 10, color: GL,   fontWeight: 600, marginTop: 2 }}>⚡ Profile Match</div>}
                    {inCity && <div style={{ fontSize: 10, color: TEAL, fontWeight: 600, marginTop: 2 }}>📍 In Your Area</div>}
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: 12, color: WM }}>{job.client}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ fontSize: 12, color: W }}>{job.venue}</div>
                    <div style={{ fontSize: 11, color: WD }}>{job.address?.split(',').slice(0, 2).join(',')}</div>
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: 12, color: WM, whiteSpace: 'nowrap' }}>
                    {new Date(job.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}<br />
                    <span style={{ fontSize: 10, color: WD }}>{job.startTime}–{job.endTime}</span>
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: 13, color: G, fontWeight: 700 }}>R{job.hourlyRate}/hr</td>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ fontSize: 12, color: W }}>{job.filledSlots}/{job.totalSlots}</div>
                    <div style={{ marginTop: 4, height: 3, background: BB, borderRadius: 2, width: 48 }}>
                      <div style={{ height: '100%', borderRadius: 2, background: GL, width: `${Math.min((job.filledSlots / job.totalSlots) * 100, 100)}%` }} />
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    {app ? (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 2,
                        color:      app.status === 'ALLOCATED' ? TEAL  : AMBER,
                        background: app.status === 'ALLOCATED' ? 'rgba(74,171,184,0.1)' : 'rgba(201,191,166,0.1)',
                        border:    `1px solid ${app.status === 'ALLOCATED' ? 'rgba(74,171,184,0.4)' : 'rgba(201,191,166,0.4)'}` }}>
                        {app.status === 'ALLOCATED' ? '✓ Confirmed' : '⏳ Interested'}
                      </span>
                    ) : (
                      <span style={{ fontSize: 10, color: WD }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 18px' }} onClick={e => e.stopPropagation()}>
                    {app ? (
                      app.status === 'ALLOCATED' && new Date(job.date).getTime() < Date.now() ? (
                        <button
                          onClick={() => navigate(`/promoter/?tab=activation-report&jobId=${job.id}`)}
                          style={{ fontSize: 11, color: GL, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FB, fontWeight: 700, padding: 0 }}
                          onMouseEnter={e => e.currentTarget.style.color = W}
                          onMouseLeave={e => e.currentTarget.style.color = GL}>
                          📋 File Activation Report →
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: WD }}>Applied</span>
                      )
                    ) : !inCity ? (
                      <span style={{ fontSize: 10, color: CORAL }} title="Job is in a different city">🚫 Other city</span>
                    ) : profile?.status !== 'approved' ? (
                      <span style={{ fontSize: 10, color: WD }}>Pending approval</span>
                    ) : (
                      <button onClick={e => { e.stopPropagation(); handleApply(job); }} disabled={applying === job.id}
                        style={{ fontSize: 11, color: G, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FB, fontWeight: 700, padding: 0 }}
                        onMouseEnter={e => e.currentTarget.style.color = GL}
                        onMouseLeave={e => e.currentTarget.style.color = G}>
                        {applying === job.id ? 'Applying…' : 'Express Interest →'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sortedJobs.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: WD, fontSize: 13 }}>
            {filter === 'myCity' && promoterCityRaw
              ? `No open jobs in ${cityDisplayName} right now. Try "All Jobs" to browse everywhere.`
              : 'No jobs found. Try adjusting your filters.'}
          </div>
        )}
      </div>

      {/* Job detail modal */}
      {selectedJob && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24 }}
          onClick={() => setSelectedJob(null)}>
          <div style={{ background: BC, border: `1px solid ${BB}`, padding: '44px', width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', position: 'relative', borderRadius: 4 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${GL}, ${G2})` }} />
            <button onClick={() => setSelectedJob(null)} style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', cursor: 'pointer', color: WD, fontSize: 18 }}>✕</button>
            <h2 style={{ color: W, fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{selectedJob.title}</h2>
            <p style={{ color: GL, fontSize: 14, marginBottom: 24 }}>{selectedJob.client} · {selectedJob.brand}</p>

            {!jobMatchesPromoterCity(selectedJob, promoterCityRaw) && (
              <div style={{ padding: '12px 16px', background: 'rgba(196,97,74,0.1)', border: '1px solid rgba(196,97,74,0.4)', borderRadius: 2, marginBottom: 20, fontSize: 13, color: CORAL }}>
                ⚠️ This job is not in your area. You cannot apply for jobs outside your city.
              </div>
            )}

            {[
              { label: 'Venue',   value: selectedJob.venue },
              { label: 'Address', value: selectedJob.address },
              { label: 'Date',    value: new Date(selectedJob.date).toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
              { label: 'Time',    value: `${selectedJob.startTime} – ${selectedJob.endTime}` },
              { label: 'Rate',    value: `R${selectedJob.hourlyRate}/hr` },
              { label: 'Slots',   value: `${selectedJob.filledSlots}/${selectedJob.totalSlots} filled` },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: `1px solid ${BB}` }}>
                <span style={{ color: WM, fontSize: 13, minWidth: 90 }}>{row.label}</span>
                <span style={{ color: W, fontSize: 13, fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}

            <div style={{ marginTop: 28, display: 'flex', gap: 12 }}>
              <button onClick={() => setSelectedJob(null)}
                style={{ flex: 1, padding: 12, background: 'transparent', border: `1px solid ${BB}`, color: WM, fontFamily: FB, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Close
              </button>
              {!getAppForJob(selectedJob.id) && jobMatchesPromoterCity(selectedJob, promoterCityRaw) && profile?.status === 'approved' && (
                <button onClick={() => handleApply(selectedJob)} disabled={applying === selectedJob.id}
                  style={{ flex: 2, padding: 12, background: G, border: 'none', color: B, fontFamily: FB, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = GL}
                  onMouseLeave={e => e.currentTarget.style.background = G}>
                  {applying === selectedJob.id ? 'Applying…' : `Express Interest — R${selectedJob.hourlyRate}/hr`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ── Application Success Modal ── */}
      {appliedJob && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300, padding:24 }}
          onClick={() => setAppliedJob(null)}>
          <div style={{ background:BC, border:`1px solid ${BB}`, padding:'48px 44px', width:'100%', maxWidth:480, textAlign:'center', position:'relative', borderRadius:4 }}
            onClick={e => e.stopPropagation()}>
            {/* Gold top bar */}
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${G2},${GL},${G})` }} />

            {/* Icon */}
            <div style={{ width:72, height:72, borderRadius:'50%', background:`rgba(201,191,166,0.1)`, border:`1px solid rgba(201,191,166,0.35)`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', fontSize:30 }}>
              ✓
            </div>

            <div style={{ fontSize:9, letterSpacing:'0.44em', textTransform:'uppercase', color:GL, marginBottom:12, fontWeight:700, fontFamily:FD }}>
              Application Submitted
            </div>
            <h2 style={{ fontFamily:FD, fontSize:26, fontWeight:700, color:W, marginBottom:16, lineHeight:1.2 }}>
              You're on the list!
            </h2>

            <div style={{ background:'rgba(201,191,166,0.06)', border:`1px solid rgba(201,191,166,0.18)`, padding:'16px 20px', marginBottom:24, borderRadius:3, textAlign:'left' }}>
              <div style={{ fontSize:14, fontWeight:700, color:W, fontFamily:FD, marginBottom:4 }}>{appliedJob.title}</div>
              <div style={{ fontSize:12, color:WM, fontFamily:FB }}>{appliedJob.client} · {appliedJob.venue}</div>
              <div style={{ fontSize:11, color:WD, marginTop:6, fontFamily:FB }}>
                {new Date(appliedJob.date).toLocaleDateString('en-ZA', { weekday:'long', day:'numeric', month:'long' })}
                {' · '}{appliedJob.startTime}–{appliedJob.endTime}
                {' · '}R{appliedJob.hourlyRate}/hr
              </div>
            </div>

            <div style={{ background:'rgba(170,160,135,0.04)', border:`1px solid ${BB}`, padding:'14px 18px', marginBottom:28, borderRadius:3 }}>
              <p style={{ fontFamily:FB, fontSize:12, color:WM, lineHeight:1.8, margin:0 }}>
                Your interest has been registered. The <span style={{ color:GL, fontWeight:600 }}>business client</span> and <span style={{ color:GL, fontWeight:600 }}>HoneyGroup Promotions admin</span> have been notified. You'll receive a confirmation once you're allocated to this shift.
              </p>
            </div>

            <button onClick={() => setAppliedJob(null)}
              style={{ width:'100%', padding:'14px 0', background:`linear-gradient(90deg,${G2},${GL},${G})`, border:'none', fontFamily:FB, fontSize:11, fontWeight:700, letterSpacing:'0.22em', textTransform:'uppercase', color:'#030302', cursor:'pointer', borderRadius:2 }}>
              Back to Jobs
            </button>
          </div>
        </div>
      )}
    </div>
  );
};