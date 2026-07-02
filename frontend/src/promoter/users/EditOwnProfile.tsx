import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../shared/hooks/useAuth';
import { showToast } from '../../shared/utils/toast';

const G   = '#8F8A7C';
const GL  = '#C9BFA6';
const G2  = '#8A8474';
const B   = '#050504';
const BC  = '#080807';
const D2  = '#0D0D0A';
const D3  = '#14140E';
const BB  = 'rgba(170,160,135,0.12)';
const W   = '#F8F8F8';
const WM  = 'rgba(248,248,248,0.65)';
const WD  = 'rgba(248,248,248,0.28)';
const FD  = "'Playfair Display', Georgia, serif";
const FB  = "'DM Sans', system-ui, sans-serif";
const TEAL   = '#4AABB8';
const CORAL  = '#C4614A';

const BACKEND = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
function authHdr() {
  const t = localStorage.getItem('hg_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(248,248,248,0.05)',
  border: `1px solid ${BB}`, padding: '10px 14px',
  color: W, fontFamily: FB, fontSize: 13, outline: 'none', borderRadius: 2,
};
const labelStyle: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, letterSpacing: '0.15em',
  textTransform: 'uppercase', color: WM, display: 'block', marginBottom: 7,
};

export const EditOwnProfile: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const headshotRef = useRef<HTMLInputElement>(null);
  const fullBodyRef = useRef<HTMLInputElement>(null);
  const cvRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    city: '', province: '',
    height: '', clothingSize: '', shoeSize: '',
    instagram: '', tiktok: '',
    bankName: '', accountNumber: '', accountType: 'Cheque', branchCode: '',
  });

  // ── Categories, languages, experience (chip selectors) ───────────────────────
  const [categories,  setCategories]  = useState<string[]>([]);
  const [languages,   setLanguages]   = useState<string[]>([]);
  const [experience,  setExperience]  = useState('');

  const PROMOTER_CATEGORIES = [
    'Brand Activation', 'Sampling & Demonstrations', 'In-Store Promotions',
    'Events & Exhibitions', 'Field Marketing', 'Merchandising',
    'Customer Service', 'Hospitality', 'Fitness & Wellness', 'Fashion & Beauty',
    'Financial Services', 'Telecoms', 'Quick Service Restaurant', 'Automotive', 'Other',
  ];
  const SA_LANGUAGES = [
    'English', 'Zulu', 'Xhosa', 'Afrikaans', 'Sotho', 'Tswana',
    'Venda', 'Tsonga', 'Swati', 'Ndebele', 'Pedi',
  ];
  const EXPERIENCE_OPTIONS = [
    'No experience — willing to learn', '6 months – 1 year',
    '1 – 2 years', '2 – 3 years', '3+ years',
  ];

  const toggleCat  = (c: string) => setCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  const toggleLang = (l: string) => setLanguages(prev  => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);

  const loadProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/me`, { headers: authHdr() as any });
      if (res.ok) {
        const p = await res.json();
        setProfile(p);
        setForm({
          city: p.city ?? '',
          province: p.province ?? '',
          height: String(p.height || ''),
          clothingSize: p.clothingSize ?? '',
          shoeSize: p.shoeSize ?? '',
          instagram: '',
          tiktok: '',
          bankName: p.bankName ?? '',
          accountNumber: p.accountNumber ?? '',
          accountType: 'Cheque',
          branchCode: p.branchCode ?? '',
        });
        // Restore chip selections from stored comma-separated industry field
        if (p.industry) setCategories(p.industry.split(',').map((s: string) => s.trim()).filter(Boolean));
        if (p.address)  setLanguages(p.address.split(',').map((s: string) => s.trim()).filter(Boolean));
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadProfile(); }, [user?.id]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch(`${API}/users/me/profile`, {
        method: 'PUT',
        headers: { ...authHdr(), 'Content-Type': 'application/json' } as any,
        body: JSON.stringify({
          city: form.city, province: form.province,
          height: Number(form.height) || null,
          clothingSize: form.clothingSize, shoeSize: form.shoeSize,
          bankName: form.bankName, accountNumber: form.accountNumber,
          branchCode: form.branchCode,
          // Store categories as comma-separated in industry field
          industry: categories.join(', ') || undefined,
          // Store languages in address field (re-used for promoters)
          address: languages.join(', ') || undefined,
        }),
      });
      if (res.ok) {
        setSuccessMsg('Profile saved successfully');
        await loadProfile();
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setError('Failed to save. Please try again.');
      }
    } catch (e) { setError('Failed to save.'); }
    setSaving(false);
  };

  const handleDocUpload = async (field: string, file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append(field, file);
      const res = await fetch(`${API}/users/me/documents`, {
        method: 'POST',
        headers: authHdr() as any,
        body: formData,
      });
      if (res.ok) {
        setSuccessMsg(`${field} uploaded successfully`);
        await loadProfile();
        console.log('Document upload response:', await res.json());
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setError('Upload failed');
      }
    } catch { setError('Upload failed'); }
    setUploading(false);
  };

  const statusBadge = () => {
    if (!profile) return null;
    const map: Record<string, { color: string; bg: string; label: string }> = {
      pending_review: { color: GL, bg: 'rgba(201,191,166,0.1)', label: '⏳ Under Review' },
      approved:       { color: TEAL, bg: 'rgba(74,171,184,0.1)', label: '✅ Approved' },
      rejected:       { color: CORAL, bg: 'rgba(196,97,74,0.1)', label: '❌ Rejected' },
      incomplete:     { color: WM, bg: 'rgba(248,248,248,0.05)', label: '📝 Incomplete' },
      blacklisted:    { color: CORAL, bg: 'rgba(196,97,74,0.1)', label: '🚫 Suspended' },
    };
    const s = map[profile.onboardingStatus] ?? map['pending_review'];
    return (
      <span style={{ fontSize: 11, fontWeight: 700, color: s.color, background: s.bg, padding: '4px 12px', borderRadius: 20, border: `1px solid ${s.color}33` }}>
        {s.label}
      </span>
    );
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: WD, padding: '60px 0', justifyContent: 'center' }}>
      <div style={{ width: 24, height: 24, border: `2px solid ${GL}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ fontSize: 15, color: WM }}>Loading profile…</span>
    </div>
  );

  const displayName = profile?.fullName || user?.name || 'Promoter';

  // Helper to build absolute URL
  const getFullUrl = (url?: string) => {
    if (!url) return null;
    return url.startsWith('http') ? url : BACKEND + url;
  };

  return (
    <div style={{ padding: '40px 48px' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: '0.38em', textTransform: 'uppercase', color: GL, marginBottom: 8, fontWeight: 700 }}>Profile</div>
          <h1 style={{ fontFamily: FD, fontSize: 28, fontWeight: 700, color: W }}>My Profile</h1>
        </div>
        <button onClick={handleSave} disabled={saving} style={{ padding: '11px 24px', background: saving ? BB : `linear-gradient(135deg,${GL},${G})`, border: 'none', color: saving ? WM : B, fontFamily: FD, fontSize: 11, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', borderRadius: 3, letterSpacing: '0.08em' }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {error && <div style={{ padding: '12px 18px', background: 'rgba(196,97,74,0.12)', border: '1px solid rgba(196,97,74,0.44)', marginBottom: 20, fontSize: 13, color: CORAL, borderRadius: 2 }}>{error}</div>}
      {successMsg && <div style={{ padding: '12px 18px', background: 'rgba(74,171,184,0.1)', border: '1px solid rgba(74,171,184,0.4)', marginBottom: 20, fontSize: 13, color: TEAL, borderRadius: 2 }}>✓ {successMsg}</div>}

      {profile?.status === 'rejected' && profile?.rejectionReason && (
        <div style={{ padding: '12px 18px', background: 'rgba(196,97,74,0.12)', border: '1px solid rgba(196,97,74,0.44)', marginBottom: 20, fontSize: 13, color: CORAL, borderRadius: 2 }}>
          <strong>Reason for rejection:</strong> {profile.rejectionReason}. Please update your documents and contact support.
        </div>
      )}

      {/* Identity Card */}
      <div style={{ background: D2, border: `1px solid ${BB}`, borderRadius: 2, marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${GL}, ${G2})` }} />
        <div style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
            {/* Profile photo / headshot */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 90, height: 90, borderRadius: '50%', overflow: 'hidden', background: `linear-gradient(135deg, ${G}, ${GL})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 900, color: B, border: `2px solid ${GL}80` }}>
                {(() => {
                  const avatarUrl = profile?.headshotUrl || profile?.profilePhotoUrl;
                  const fullAvatarUrl = avatarUrl ? (avatarUrl.startsWith('http') ? avatarUrl : BACKEND + avatarUrl) : null;
                  return fullAvatarUrl ? (
                    <img src={fullAvatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                  ) : displayName.charAt(0).toUpperCase();
                })()}
              </div>
              <label style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: GL, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, color: B, border: `2px solid ${D2}` }}
                title="Upload headshot">
                📷
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleDocUpload('headshot', e.target.files[0])} />
              </label>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: W, fontWeight: 700, fontSize: 22, margin: '0 0 6px' }}>{displayName}</h3>
              <p style={{ color: WM, fontSize: 14, margin: '0 0 2px' }}>{user?.email}</p>
              {(profile?.city || form.city) && (
                <p style={{ color: WD, fontSize: 13, margin: 0 }}>📍 {profile?.city || form.city}{(profile?.province || form.province) ? `, ${profile?.province || form.province}` : ''}</p>
              )}
            </div>
            <div>{statusBadge()}</div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 20, marginBottom: 20 }}>
            {[
              { label: 'Reliability', value: profile?.reliabilityScore ? `⭐ ${profile.reliabilityScore}/5` : 'No rating yet' },
              { label: 'Member Since', value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' }) : '—' },
              { label: 'ID Number', value: profile?.idNumber ? `${String(profile.idNumber).slice(0, 6)}••••` : '—' },
              { label: 'Phone', value: profile?.phone || '—' },
            ].map(row => (
              <div key={row.label}>
                <p style={{ color: WD, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>{row.label}</p>
                <p style={{ color: W, fontSize: 13, fontWeight: 600, margin: 0 }}>{row.value}</p>
              </div>
            ))}
          </div>

          {/* Physical attributes */}
          {(profile?.height || profile?.clothingSize) && (
            <div style={{ paddingTop: 20, borderTop: `1px solid ${BB}`, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              {[
                { label: 'Height', value: profile.height ? `${profile.height}cm` : '—' },
                { label: 'Clothing', value: profile.clothingSize || '—' },
                { label: 'Shoe Size', value: profile.shoeSize || '—' },
                { label: 'Gender', value: profile.gender || '—' },
              ].map(a => (
                <div key={a.label}>
                  <p style={{ color: WD, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 3px' }}>{a.label}</p>
                  <p style={{ color: GL, fontSize: 15, fontWeight: 700, margin: 0 }}>{a.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── DOCUMENTS SECTION ── */}
      <div style={{ background: D2, border: `1px solid ${BB}`, borderRadius: 2, marginBottom: 24, padding: 28, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${GL}, ${G2})` }} />
        <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: GL, marginBottom: 20, fontWeight: 700 }}>My Documents & Photos</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {/* Headshot */}
          <DocumentCard
            label="Headshot Photo"
            url={profile?.headshotUrl}
            onUpload={file => handleDocUpload('headshot', file)}
            uploading={uploading}
            accept="image/*"
            icon="🤳"
          />
          {/* Full Body Photo */}
          <DocumentCard
            label="Full Body Photo"
            url={profile?.fullBodyPhotoUrl}
            onUpload={file => handleDocUpload('fullBodyPhoto', file)}
            uploading={uploading}
            accept="image/*"
            icon="🧍"
          />
          {/* CV / ID Proof */}
          <DocumentCard
            label="CV / ID Proof"
            url={profile?.cvUrl}
            onUpload={file => handleDocUpload('cv', file)}
            uploading={uploading}
            accept=".pdf,.jpg,.jpeg,.png"
            icon="📄"
          />
          {/* Profile Photo */}
          <DocumentCard
            label="Profile Photo"
            url={profile?.profilePhotoUrl}
            onUpload={file => handleDocUpload('profilePhoto', file)}
            uploading={uploading}
            accept="image/*"
            icon="📸"
          />
        </div>

        {uploading && (
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, color: GL, fontSize: 12 }}>
            <div style={{ width: 14, height: 14, border: `2px solid ${GL}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Uploading document…
          </div>
        )}
      </div>

      {/* ── CATEGORIES & SKILLS SECTION ── */}
      <div style={{ background: D2, border: `1px solid ${BB}`, borderRadius: 2, marginBottom: 24, padding: 28, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${GL}, ${G2})` }} />
        <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: GL, marginBottom: 20, fontWeight: 700 }}>Work Categories & Skills</div>

        {/* Categories */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: WM }}>Promotion Categories</span>
            {categories.length > 0 && <span style={{ fontSize: 11, color: GL, fontWeight: 700 }}>{categories.length} selected</span>}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PROMOTER_CATEGORIES.map(cat => {
              const active = categories.includes(cat);
              return (
                <button key={cat} onClick={() => toggleCat(cat)} style={{
                  padding: '7px 14px', background: active ? 'rgba(201,191,166,0.14)' : 'transparent',
                  border: `1px solid ${active ? GL : BB}`, color: active ? GL : WD,
                  fontFamily: FB, fontSize: 11, fontWeight: active ? 600 : 400, cursor: 'pointer',
                  transition: 'all 0.18s', borderRadius: 2, display: 'inline-flex', alignItems: 'center', gap: 5,
                }}>
                  {active && <span style={{ fontSize: 9 }}>✓</span>}
                  {cat}
                </button>
              );
            })}
          </div>
          {categories.length > 0 && (
            <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(201,191,166,0.06)', border: `1px solid rgba(201,191,166,0.2)`, borderRadius: 2 }}>
              <p style={{ fontFamily: FB, fontSize: 10, color: WD, marginBottom: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Selected</p>
              <p style={{ fontFamily: FB, fontSize: 12, color: GL }}>{categories.join(' · ')}</p>
            </div>
          )}
        </div>

        {/* Languages */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: WM }}>Languages Spoken</span>
            {languages.length > 0 && <span style={{ fontSize: 11, color: GL, fontWeight: 700 }}>{languages.length} selected</span>}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SA_LANGUAGES.map(lang => {
              const active = languages.includes(lang);
              return (
                <button key={lang} onClick={() => toggleLang(lang)} style={{
                  padding: '7px 14px', background: active ? 'rgba(201,191,166,0.14)' : 'transparent',
                  border: `1px solid ${active ? GL : BB}`, color: active ? GL : WD,
                  fontFamily: FB, fontSize: 11, fontWeight: active ? 600 : 400, cursor: 'pointer',
                  transition: 'all 0.18s', borderRadius: 2, display: 'inline-flex', alignItems: 'center', gap: 5,
                }}>
                  {active && <span style={{ fontSize: 9 }}>✓</span>}
                  {lang}
                </button>
              );
            })}
          </div>
        </div>

        {/* Experience */}
        <div>
          <label style={{ ...labelStyle, marginBottom: 10 }}>Experience Level</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EXPERIENCE_OPTIONS.map(opt => {
              const active = experience === opt;
              return (
                <button key={opt} onClick={() => setExperience(active ? '' : opt)} style={{
                  padding: '7px 14px', background: active ? 'rgba(201,191,166,0.14)' : 'transparent',
                  border: `1px solid ${active ? GL : BB}`, color: active ? GL : WD,
                  fontFamily: FB, fontSize: 11, fontWeight: active ? 600 : 400, cursor: 'pointer',
                  transition: 'all 0.18s', borderRadius: 2, display: 'inline-flex', alignItems: 'center', gap: 5,
                }}>
                  {active && <span style={{ fontSize: 9 }}>✓</span>}
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Editable sections grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: BB }}>
        {/* Location */}
        <div style={{ background: D2, padding: 28 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: GL, marginBottom: 20, fontWeight: 700 }}>Location</div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>City</label>
            <input style={inputStyle} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="e.g. Johannesburg"
              onFocus={e => e.currentTarget.style.borderColor = GL} onBlur={e => e.currentTarget.style.borderColor = BB} />
          </div>
          <div>
            <label style={labelStyle}>Province</label>
            <select style={{ ...inputStyle, background: D3, cursor: 'pointer' }} value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))}>
              <option value="">Select</option>
              {['Gauteng','Western Cape','KwaZulu-Natal','Eastern Cape','Limpopo','Mpumalanga','North West','Free State','Northern Cape'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Physical Attributes */}
        <div style={{ background: D2, padding: 28 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: GL, marginBottom: 20, fontWeight: 700 }}>Physical Attributes</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { label: 'Height (cm)', key: 'height', placeholder: '168' },
              { label: 'Clothing Size', key: 'clothingSize', placeholder: 'S/M/L' },
              { label: 'Shoe Size', key: 'shoeSize', placeholder: '7' },
            ].map(f => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <input style={inputStyle} value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder}
                  onFocus={e => e.currentTarget.style.borderColor = GL} onBlur={e => e.currentTarget.style.borderColor = BB} />
              </div>
            ))}
          </div>
        </div>

        {/* Banking Details */}
        <div style={{ background: D2, padding: 28 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: GL, marginBottom: 20, fontWeight: 700 }}>Banking Details</div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Bank</label>
            <select style={{ ...inputStyle, background: D3, cursor: 'pointer' }} value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}>
              <option value="">Select bank</option>
              {['Standard Bank','Absa','FNB','Nedbank','Capitec','African Bank','Investec','Discovery Bank'].map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Account Number</label>
            <input style={inputStyle} value={form.accountNumber} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} placeholder="1234567890"
              onFocus={e => e.currentTarget.style.borderColor = GL} onBlur={e => e.currentTarget.style.borderColor = BB} />
          </div>
          <div>
            <label style={labelStyle}>Branch Code</label>
            <input style={inputStyle} value={form.branchCode} onChange={e => setForm(f => ({ ...f, branchCode: e.target.value }))} placeholder="051001"
              onFocus={e => e.currentTarget.style.borderColor = GL} onBlur={e => e.currentTarget.style.borderColor = BB} />
          </div>
        </div>

        {/* Account Info (read-only) */}
        <div style={{ background: D2, padding: 28 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: GL, marginBottom: 20, fontWeight: 700 }}>Account Information</div>
          {[
            { label: 'Email', value: profile?.email || '—' },
            { label: 'Role', value: profile?.role || '—' },
            { label: 'Status', value: profile?.status || '—' },
            { label: 'POPIA Consent', value: profile?.consentPopia ? 'Yes — Consented' : 'No' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${BB}` }}>
              <span style={{ fontSize: 12, color: WM }}>{row.label}</span>
              <span style={{ fontSize: 12, color: W, fontWeight: 600 }}>{row.value}</span>
            </div>
          ))}
          <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(170,160,135,0.06)', border: `1px solid ${BB}`, borderRadius: 2, fontSize: 12, color: WM, lineHeight: 1.6 }}>
            📎 To update your ID number, contact support. Document changes require admin review.
          </div>
        </div>
      </div>
    </div>
  );
};

// ── DocumentCard helper ──
function DocumentCard({ label, url, onUpload, uploading, accept, icon }: {
  label: string; url?: string; onUpload: (f: File) => void;
  uploading: boolean; accept: string; icon: string;
}) {
  const GL = '#C9BFA6';
  const BB = 'rgba(170,160,135,0.12)';
  const W = '#F8F8F8';
  const WM = 'rgba(248,248,248,0.65)';
  const WD = 'rgba(248,248,248,0.28)';
  const TEAL = '#4AABB8';
  const BACKEND = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

  const fullUrl = url?.startsWith('http') ? url : (url ? BACKEND + url : null);
  const isImage = fullUrl && /\.(jpg|jpeg|png|webp)/i.test(fullUrl);

  return (
    <div style={{ background: 'rgba(170,160,135,0.04)', border: `1px solid ${BB}`, borderRadius: 2, overflow: 'hidden' }}>
      {/* Preview */}
      <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', position: 'relative' }}>
        {fullUrl ? (
          isImage ? (
            <img src={fullUrl} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
          ) : (
            <a href={fullUrl} target="_blank" rel="noopener noreferrer" style={{ color: GL, fontSize: 13, textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 32 }}>📄</span>
              <span style={{ fontSize: 10 }}>View File</span>
            </a>
          )
        ) : (
          <div style={{ textAlign: 'center', color: WD }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>{icon}</div>
            <div style={{ fontSize: 10 }}>Not uploaded</div>
          </div>
        )}
        {fullUrl && (
          <div style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', background: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>✓</div>
        )}
      </div>
      {/* Label + Upload */}
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: 11, color: WM, marginBottom: 8, fontWeight: 600 }}>{label}</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'rgba(201,191,166,0.08)', border: `1px solid rgba(201,191,166,0.25)`, borderRadius: 2, cursor: 'pointer', fontSize: 10, color: GL, fontWeight: 700 }}>
          <input type="file" accept={accept} style={{ display: 'none' }} disabled={uploading} onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])} />
          {fullUrl ? '↑ Replace' : '↑ Upload'}
        </label>
      </div>
    </div>
  );
}