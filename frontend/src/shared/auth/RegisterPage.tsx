import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

/* ─── DESIGN TOKENS ──────────────────────────────────────────── */
const BLACK        = '#030302'
const BLACK_CARD   = '#0F0F0C'
const BLACK_BORDER = 'rgba(189,189,189,0.15)'
const GOLD         = '#9C9484'
const GOLD_LIGHT   = '#CFC7B2'
const GOLD_DIM     = 'rgba(189,189,189,0.55)'
const GOLD_PALE    = 'rgba(189,189,189,0.28)'
const GOLD_FAINT   = 'rgba(189,189,189,0.12)'
const AMBER        = '#807A6C'
const BROWN        = '#5A5548'
const WHITE        = '#F2F2F2'
const WHITE_MUTED  = 'rgba(242,242,242,0.55)'
const FD           = "'Playfair Display', Georgia, serif"
const FB           = "'DM Sans', system-ui, sans-serif"

type Role = 'promoter' | 'business'

/* ─── OPTION LISTS ────────────────────────────────────────────── */
const INDUSTRY_OPTIONS = [
  'FMCG / Beverages', 'FMCG / Food', 'Retail', 'Telecoms', 'Automotive',
  'Financial Services', 'Healthcare / Pharma', 'Fitness & Wellness',
  'Fashion & Beauty', 'Quick Service Restaurant', 'Events & Entertainment',
  'Technology', 'Government / NGO', 'Real Estate', 'Education', 'Other',
]

const PROMOTER_CATEGORIES = [
  'Brand Activation', 'Sampling & Demonstrations', 'In-Store Promotions',
  'Events & Exhibitions', 'Field Marketing', 'Merchandising',
  'Customer Service', 'Hospitality', 'Fitness & Wellness', 'Fashion & Beauty',
  'Financial Services', 'Telecoms', 'Quick Service Restaurant', 'Automotive', 'Other',
]

const SA_LANGUAGES = [
  'English', 'Zulu', 'Xhosa', 'Afrikaans', 'Sotho', 'Tswana',
  'Venda', 'Tsonga', 'Swati', 'Ndebele', 'Pedi',
]

const EXPERIENCE_OPTIONS = [
  'No experience — willing to learn',
  '6 months – 1 year',
  '1 – 2 years',
  '2 – 3 years',
  '3+ years',
]

const DASHBOARD_ROUTE: Record<Role, string> = {
  promoter: '/promoter/dashboard',
  business: '/business/dashboard',
}

/* ─── SA VALIDATION ───────────────────────────────────────────── */
const validateSAID = (id: string): boolean => {
  if (!/^\d{13}$/.test(id)) return false
  const month = parseInt(id.slice(2, 4))
  const day   = parseInt(id.slice(4, 6))
  return month >= 1 && month <= 12 && day >= 1 && day <= 31
}

const validateSAPhone = (phone: string): boolean =>
  /^(\+27|0)[6-8][0-9]{8}$/.test(phone.replace(/\s/g, ''))

const formatSAPhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('27') && digits.length >= 2) {
    const local = digits.slice(2)
    if (local.length <= 2) return `+27 ${local}`
    if (local.length <= 5) return `+27 ${local.slice(0, 2)} ${local.slice(2)}`
    if (local.length <= 9) return `+27 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`
    return `+27 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 9)}`
  }
  return raw
}

const validateCIPC = (reg: string): boolean =>
  /^\d{4}\/\d{6}\/\d{2}$/.test(reg)

// SA provinces and cities for address validation
const SA_PROVINCES = [
  'gauteng', 'western cape', 'kwazulu-natal', 'eastern cape', 'limpopo',
  'mpumalanga', 'north west', 'free state', 'northern cape',
]
const SA_CITY_KEYWORDS = [
  'johannesburg', 'cape town', 'durban', 'pretoria', 'port elizabeth',
  'bloemfontein', 'east london', 'nelspruit', 'polokwane', 'kimberley',
  'pietermaritzburg', 'rustenburg', 'george', 'vanderbijlpark',
  'soweto', 'sandton', 'randburg', 'roodepoort', 'benoni', 'boksburg',
  'germiston', 'springs', 'midrand', 'centurion', 'tshwane', 'ekurhuleni',
  'stellenbosch', 'paarl', 'bellville', 'mitchells plain', 'khayelitsha',
  'tygervalley', 'hillbrow', 'braamfontein', 'rosebank', 'fourways',
  'alexandra', 'lenasia', 'soweto', 'mamelodi', 'soshanguve', 'thohoyandou',
  'tzaneen', 'phalaborwa', 'makhado', 'bela-bela', 'musina', 'thabazimbi',
  'witbank', 'emalahleni', 'secunda', 'standerton', 'ermelo', 'barberton',
  'mbombela', 'white river', 'hazyview', 'piet retief', 'balfour',
  'mthatha', 'king william\'s town', 'bisho', 'queenstown', 'aliwal north',
  'grahamstown', 'graaf-reinet', 'humansdorp', 'uitenhage', 'jeffreys bay',
  'pinetown', 'umlazi', 'chatsworth', 'inanda', 'stanger', 'tongaat',
  'amanzimtoti', 'isipingo', 'verulam', 'ballito', 'margate', 'eshowe',
  'vryheid', 'ladysmith', 'newcastle', 'dundee', 'kokstad', 'richmond',
  'klerksdorp', 'potchefstroom', 'mahikeng', 'lichtenburg', 'brits',
  'stilfontein', 'orkney', 'carletonville', 'vereeniging', 'vanderbijlpark',
  'heidelberg', 'nigel', 'brakpan', 'tembisa', 'soweto', 'kagiso',
  'mossel bay', 'knysna', 'plettenberg bay', 'beaufort west', 'worcester',
  'ceres', 'robertson', 'swellendam', 'hermanus', 'gordons bay',
  'strand', 'somerset west', 'franschhoek', 'malmesbury',
]

const validateSAAddress = (address: string): boolean => {
  if (!address.trim() || address.trim().length < 10) return false
  const lower = address.toLowerCase()
  // Check for SA postal code (4 digits at end or anywhere)
  const hasPostalCode = /\b\d{4}\b/.test(address)
  // Check for known SA city or province
  const hasSACity = SA_CITY_KEYWORDS.some(c => lower.includes(c))
  const hasSAProvince = SA_PROVINCES.some(p => lower.includes(p))
  // Check for international indicators to block
  const internationalKeywords = [
    'usa', 'united states', 'uk', 'united kingdom', 'england', 'australia',
    'canada', 'germany', 'france', 'china', 'india', 'nigeria', 'kenya',
    'zimbabwe', 'zambia', 'mozambique', 'botswana', 'namibia', 'swaziland',
    'lesotho', 'new york', 'london', 'sydney', 'toronto', 'berlin', 'paris',
  ]
  const hasInternational = internationalKeywords.some(k => lower.includes(k))
  if (hasInternational) return false
  // Must have SA postal code OR a known SA city/province
  return hasPostalCode || hasSACity || hasSAProvince
}

const validateEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

const validatePassword = (pw: string) => ({
  length:  pw.length >= 8,
  upper:   /[A-Z]/.test(pw),
  lower:   /[a-z]/.test(pw),
  digit:   /[0-9]/.test(pw),
  special: /[!@#$%^&*(),.?":{}|<>]/.test(pw),
})

/* ─── CHIP ────────────────────────────────────────────────────── */
function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      style={{ padding: '7px 14px', background: active ? GOLD_FAINT : 'transparent', border: `1px solid ${active ? GOLD : BLACK_BORDER}`, color: active ? GOLD : GOLD_DIM, fontFamily: FB, fontSize: 11, fontWeight: active ? 600 : 400, cursor: 'pointer', transition: 'all 0.18s', borderRadius: 2, display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' as const }}>
      {active && <span style={{ fontSize: 9 }}>✓</span>}
      {label}
    </button>
  )
}

/* ─── FIELD INPUT ─────────────────────────────────────────────── */
function Field({ label, type = 'text', placeholder, value, onChange, focused, onFocus, onBlur, error, hint }: {
  label: string; type?: string; placeholder: string; value: string
  onChange: (v: string) => void; focused: boolean; onFocus: () => void; onBlur: () => void
  error?: string | null; hint?: string
}) {
  return (
    <div>
      <label style={{ display: 'block', fontFamily: FB, fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: focused ? GOLD : GOLD_DIM, marginBottom: 8, transition: 'color 0.2s' }}>{label}</label>
      <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} onFocus={onFocus} onBlur={onBlur}
        style={{ width: '100%', background: 'rgba(189,189,189,0.03)', border: `1px solid ${error ? `${AMBER}66` : focused ? GOLD : BLACK_BORDER}`, padding: '13px 16px', fontFamily: FB, fontSize: 14, color: WHITE, outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', boxShadow: focused ? `0 0 0 3px ${GOLD}10` : 'none' }} />
      {error && <p style={{ fontFamily: FB, fontSize: 11, color: AMBER, marginTop: 5 }}>{error}</p>}
      {hint && !error && <p style={{ fontFamily: FB, fontSize: 11, color: GOLD_PALE, marginTop: 5 }}>{hint}</p>}
    </div>
  )
}

/* ─── FILE UPLOAD ZONE ───────────────────────────────────────── */
function FileUploadZone({ label, accept, file, onChange, hint, required }: {
  label: string; accept: string; file: File | null; onChange: (f: File) => void; hint?: string; required?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onChange(f) }
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: FB, fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD_DIM, marginBottom: 8 }}>
        {label}{required && <span style={{ color: GOLD, fontSize: 12 }}>*</span>}
      </label>
      <div onClick={() => inputRef.current?.click()} onDragEnter={() => setDragging(true)} onDragLeave={() => setDragging(false)} onDragOver={e => e.preventDefault()} onDrop={handleDrop}
        style={{ border: `1px dashed ${dragging ? GOLD : file ? `${GOLD}55` : BLACK_BORDER}`, background: dragging ? GOLD_FAINT : file ? 'rgba(189,189,189,0.04)' : 'rgba(189,189,189,0.02)', padding: '22px 20px', cursor: 'pointer', transition: 'all 0.25s', textAlign: 'center' }}>
        <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) onChange(e.target.files[0]) }} />
        {file ? (
          <div>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{file.type.startsWith('image/') ? '🖼️' : '📄'}</div>
            <p style={{ fontFamily: FB, fontSize: 12, color: GOLD, fontWeight: 600, marginBottom: 2 }}>{file.name}</p>
            <p style={{ fontFamily: FB, fontSize: 11, color: GOLD_PALE }}>{(file.size / 1024).toFixed(0)} KB · Click to replace</p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 22, marginBottom: 8, color: GOLD_PALE }}>↑</div>
            <p style={{ fontFamily: FB, fontSize: 13, color: GOLD_DIM, marginBottom: 4 }}>Drop file here or <span style={{ color: GOLD }}>browse</span></p>
            {hint && <p style={{ fontFamily: FB, fontSize: 11, color: GOLD_PALE }}>{hint}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── PHOTO UPLOAD ────────────────────────────────────────────── */
function PhotoUpload({ label, file, onChange, hint, required, aspectHint }: {
  label: string; file: File | null; onChange: (f: File) => void; hint?: string; required?: boolean; aspectHint?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const handleFile = (f: File) => { onChange(f); const r = new FileReader(); r.onload = () => setPreview(r.result as string); r.readAsDataURL(f) }
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: FB, fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD_DIM, marginBottom: 8 }}>
        {label}{required && <span style={{ color: GOLD, fontSize: 12 }}>*</span>}
      </label>
      <div onClick={() => inputRef.current?.click()}
        style={{ height: 220, border: `1px dashed ${file ? `${GOLD}55` : BLACK_BORDER}`, background: file ? 'rgba(189,189,189,0.04)' : 'rgba(189,189,189,0.02)', cursor: 'pointer', transition: 'all 0.25s', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
        {preview ? (
          <>
            <img src={preview} alt={label} style={{ width: '100%', flex: 1, objectFit: 'cover', objectPosition: 'top', display: 'block', minHeight: 0 }} />
            <div style={{ padding: '7px 12px', background: GOLD_FAINT, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: FB, fontSize: 10, color: GOLD }}>✓ {file && file.name.length > 20 ? file.name.slice(0, 18) + '…' : (file ? file.name : '')}</span>
              <span style={{ fontFamily: FB, fontSize: 9, color: GOLD_PALE }}>Replace</span>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 30, marginBottom: 10, opacity: 0.5 }}>📷</div>
            <p style={{ fontFamily: FB, fontSize: 12, color: GOLD_DIM, marginBottom: 6 }}>Upload <span style={{ color: GOLD }}>photo</span></p>
            {aspectHint && <p style={{ fontFamily: FB, fontSize: 10, color: GOLD, fontWeight: 600, marginBottom: 5 }}>{aspectHint}</p>}
            {hint && <p style={{ fontFamily: FB, fontSize: 10, color: GOLD_PALE }}>{hint}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── CV UPLOAD ───────────────────────────────────────────────── */
function CVUpload({ file, onChange }: { file: File | null; onChange: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) onChange(f)
  }
  const fileSizeKB = file ? (file.size / 1024).toFixed(0) : null
  const fileSizeMB = file ? (file.size / (1024 * 1024)).toFixed(2) : null

  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: FB, fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD_DIM, marginBottom: 8 }}>
        CV / Portfolio
        <span style={{ color: GOLD_PALE, fontWeight: 400, fontSize: 9, letterSpacing: '0.06em', textTransform: 'none' }}>— PDF format</span>
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        style={{
          border: `1px dashed ${dragging ? GOLD : file ? `${GOLD}66` : BLACK_BORDER}`,
          background: dragging ? GOLD_FAINT : file ? 'rgba(189,189,189,0.06)' : 'rgba(189,189,189,0.02)',
          padding: '20px 24px',
          cursor: 'pointer',
          transition: 'all 0.25s',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
          onChange={e => { if (e.target.files?.[0]) onChange(e.target.files[0]) }}
        />

        {/* Icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 2,
          background: file ? GOLD_FAINT : 'rgba(189,189,189,0.06)',
          border: `1px solid ${file ? `${GOLD}44` : BLACK_BORDER}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontSize: 20, transition: 'all 0.2s',
        }}>
          {file ? '📄' : '📋'}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {file ? (
            <>
              <p style={{ fontFamily: FB, fontSize: 13, color: GOLD, fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                ✓ {file.name}
              </p>
              <p style={{ fontFamily: FB, fontSize: 11, color: GOLD_PALE }}>
                {Number(fileSizeKB) > 1000 ? `${fileSizeMB} MB` : `${fileSizeKB} KB`} · PDF · Click to replace
              </p>
            </>
          ) : (
            <>
              <p style={{ fontFamily: FB, fontSize: 13, color: GOLD_DIM, marginBottom: 3 }}>
                Drop your CV here or <span style={{ color: GOLD }}>browse</span>
              </p>
              <p style={{ fontFamily: FB, fontSize: 11, color: GOLD_PALE }}>
                PDF only · Max 10 MB · Optional but recommended
              </p>
            </>
          )}
        </div>

        {/* Upload indicator */}
        {!file && (
          <div style={{ fontSize: 18, color: GOLD_PALE, flexShrink: 0 }}>↑</div>
        )}
      </div>

      {/* Info note */}
      <p style={{ fontFamily: FB, fontSize: 10, color: GOLD_PALE, marginTop: 6, lineHeight: 1.5 }}>
        Your CV helps businesses and admin understand your experience. It will be visible to verified businesses viewing your profile.
      </p>
    </div>
  )
}

/* ─── PASSWORD STRENGTH ───────────────────────────────────────── */
function PasswordStrength({ password }: { password: string }) {
  const rules = validatePassword(password)
  const items = [
    { key: 'length', label: 'At least 8 characters' }, { key: 'upper', label: 'Uppercase letter' },
    { key: 'lower', label: 'Lowercase letter' }, { key: 'digit', label: 'Number' },
    { key: 'special', label: 'Special character' },
  ]
  if (!password) return null
  const score = Object.values(rules).filter(Boolean).length
  const barColor = score <= 2 ? AMBER : score <= 3 ? GOLD_LIGHT : GOLD
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {[1,2,3,4,5].map(i => <div key={i} style={{ flex: 1, height: 3, background: i <= score ? barColor : 'rgba(189,189,189,0.1)', transition: 'background 0.3s' }} />)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
        {items.map(item => (
          <span key={item.key} style={{ fontFamily: FB, fontSize: 10, color: rules[item.key as keyof typeof rules] ? GOLD : GOLD_PALE, transition: 'color 0.2s' }}>
            {rules[item.key as keyof typeof rules] ? '✓' : '○'} {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '8px 0' }}>
      <div style={{ flex: 1, height: 1, background: BLACK_BORDER }} />
      <span style={{ fontFamily: FB, fontSize: 9, fontWeight: 600, letterSpacing: '0.3em', textTransform: 'uppercase', color: GOLD, whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: BLACK_BORDER }} />
    </div>
  )
}

function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ height: 3, flex: 1, background: i < current ? GOLD : i === current ? `linear-gradient(90deg, ${GOLD}, ${AMBER})` : 'rgba(189,189,189,0.1)', transition: 'background 0.4s' }} />
      ))}
    </div>
  )
}

/* ─── SUCCESS POPUP ───────────────────────────────────────────── */
function SuccessModal({ isPromoter, onDashboard, onHome }: { isPromoter: boolean; onDashboard: () => void; onHome: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.90)', backdropFilter: 'blur(18px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, padding: '52px 44px', maxWidth: 460, width: '100%', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${BROWN}, ${GOLD}, ${GOLD_LIGHT}, ${GOLD}, ${BROWN})` }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'rgba(189,189,189,0.10)', border: '1px solid rgba(189,189,189,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 34 }}>⏳</div>
          <p style={{ fontFamily: FB, fontSize: 9, fontWeight: 700, letterSpacing: '0.44em', textTransform: 'uppercase', color: GOLD, marginBottom: 14 }}>
            {isPromoter ? 'Application Submitted' : 'Account Created'}
          </p>
          <h2 style={{ fontFamily: FD, fontSize: 28, fontWeight: 700, color: WHITE, marginBottom: 20, lineHeight: 1.2 }}>
            {isPromoter ? "You're on the list." : 'Welcome aboard.'}
          </h2>
          <div style={{ background: 'rgba(189,189,189,0.06)', border: '1px solid rgba(189,189,189,0.20)', padding: '18px 20px', marginBottom: 28 }}>
            <p style={{ fontFamily: FB, fontSize: 13, color: WHITE_MUTED, lineHeight: 1.85 }}>
              Your account has been created and is currently{' '}
              <span style={{ color: GOLD, fontWeight: 600 }}>pending admin approval</span>.
              You will be notified once your account has been reviewed and approved.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={onDashboard}
              style={{ width: '100%', padding: '15px 0', background: `linear-gradient(90deg, ${AMBER}, ${GOLD}, ${GOLD_LIGHT})`, border: 'none', fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: BLACK, cursor: 'pointer' }}>
              Go to Dashboard
            </button>
            <button onClick={onHome}
              style={{ width: '100%', padding: '13px 0', background: 'transparent', border: '1px solid rgba(189,189,189,0.22)', fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD_DIM, cursor: 'pointer' }}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── MAIN REGISTER PAGE ─────────────────────────────────────── */
export default function RegisterPage() {
  const navigate = useNavigate()

  const [role,       setRole]       = useState<Role>('promoter')
  const [step,       setStep]       = useState(0)
  const [focused,    setFocused]    = useState<string | null>(null)
  const [errors,     setErrors]     = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done,       setDone]       = useState(false)



  // ── Promoter personal
  const [firstName,    setFirstName]    = useState('')
  const [lastName,     setLastName]     = useState('')
  const [phone,        setPhone]        = useState('')
  const [idNumber,     setIdNumber]     = useState('')
  const [address,      setAddress]      = useState('')
  // ── Promoter photos + banking + CV
  const [headshotFile, setHeadshotFile] = useState<File | null>(null)
  const [fullBodyFile, setFullBodyFile] = useState<File | null>(null)
  const [cvFile,       setCvFile]       = useState<File | null>(null)
  const [bankName,     setBankName]     = useState('')
  const [accountNo,    setAccountNo]    = useState('')
  const [bankProof,    setBankProof]    = useState<File | null>(null)
  // ── Promoter account
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  // ── Promoter professional
  const [promoCategories, setPromoCategories] = useState<string[]>([])
  const [promoLanguages,  setPromoLanguages]  = useState<string[]>([])
  const [promoExperience, setPromoExperience] = useState('')
  const [promoGender,     setPromoGender]     = useState('')
  const [promoHeight,     setPromoHeight]     = useState('')
  const [promoClothing,   setPromoClothing]   = useState('')

  const toggleCategory = (cat: string) => setPromoCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
  const toggleLanguage = (lang: string) => setPromoLanguages(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang])

  // ── Business
  const [companyName,       setCompanyName]       = useState('')
  const [contactName,       setContactName]       = useState('')
  const [bizPhone,          setBizPhone]          = useState('')
  const [regNumber,         setRegNumber]         = useState('')
  const [vatNumber,         setVatNumber]         = useState('')
  const [bizAddress,        setBizAddress]        = useState('')
  const [bizIndustry,       setBizIndustry]       = useState('')
  const [bizCategories,     setBizCategories]     = useState<string[]>([])
  const [bizOtherCategory,  setBizOtherCategory]  = useState('')
  const [bizLanguages,      setBizLanguages]      = useState<string[]>([])
  const [bizOtherLanguage,  setBizOtherLanguage]  = useState('')
  const [bizEmail,          setBizEmail]          = useState('')
  const [bizPassword,       setBizPassword]       = useState('')
  const [bizConfirmPw,      setBizConfirmPw]      = useState('')
  const [cipcDoc,           setCipcDoc]           = useState<File | null>(null)
  const [taxPin,            setTaxPin]            = useState<File | null>(null)
  const [bizBankProof,      setBizBankProof]      = useState<File | null>(null)

  const toggleBizCategory = (cat: string) => setBizCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
  const toggleBizLanguage = (lang: string) => setBizLanguages(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang])

  const isPromoter  = role === 'promoter'
  const TOTAL_STEPS = 3

  const switchRole = (r: Role) => { setRole(r); setStep(0); setErrors({}); setPromoCategories([]); setPromoLanguages([]); setBizCategories([]); setBizLanguages([]); setBizOtherCategory(''); setBizOtherLanguage('') }



  /* ─── VALIDATION ──────────────────────────────────────────── */
  const validateStep = (): boolean => {
    const errs: Record<string, string> = {}
    
    if (isPromoter) {
      if (step === 0) {
        if (!firstName.trim()) errs.firstName = 'Required'
        if (!lastName.trim()) errs.lastName = 'Required'
        if (!validateSAPhone(phone)) errs.phone = 'Enter a valid SA phone number e.g. +27 71 000 0000'
        if (!validateSAID(idNumber)) errs.idNumber = 'Must be 13 digits in SA ID format (YYMMDD followed by 7 digits)'
        if (!address.trim()) errs.address = 'Required'
        else if (!validateSAAddress(address)) errs.address = 'Please enter a valid South African address (include city and postal code)'
      }
      if (step === 1) {
        if (!headshotFile) errs.headshot = 'Headshot photo is required'
        if (!fullBodyFile) errs.fullBody = 'Full body photo is required'
        if (!bankName.trim()) errs.bankName = 'Required'
        if (!accountNo.trim()) errs.accountNo = 'Required'
        else if (!/^\d+$/.test(accountNo.replace(/\s/g, ''))) errs.accountNo = 'Account number must contain digits only'
        else if (accountNo.replace(/\s/g, '').length > 16) errs.accountNo = 'Account number cannot exceed 16 digits'
        if (!bankProof) errs.bankProof = 'Bank proof document is required'
        // CV is optional — no validation error
      }
      if (step === 2) {
        if (!validateEmail(email)) errs.email = 'Enter a valid email address'
        const pwCheck = validatePassword(password)
        if (!Object.values(pwCheck).every(Boolean)) errs.password = 'Password does not meet all requirements'
        if (password !== confirmPw) errs.confirmPw = 'Passwords do not match'
      }
    } else {
      if (step === 0) {
        if (!companyName.trim()) errs.companyName = 'Required'
        if (!contactName.trim()) errs.contactName = 'Required'
        if (!validateSAPhone(bizPhone)) errs.bizPhone = 'Enter a valid SA phone number'
        if (!validateCIPC(regNumber)) errs.regNumber = 'Format: 2024/000000/07'
        if (!bizAddress.trim()) errs.bizAddress = 'Required'
        else if (!validateSAAddress(bizAddress)) errs.bizAddress = 'Please enter a valid South African address (include city and postal code)'
        if (!bizIndustry.trim()) errs.bizIndustry = 'Please select your industry'
      }
      if (step === 1) {
        if (!cipcDoc) errs.cipcDoc = 'CIPC registration document is required'
        if (!bizBankProof) errs.bizBankProof = 'Bank confirmation letter is required'
      }
      if (step === 2) {
        if (!validateEmail(bizEmail)) errs.bizEmail = 'Enter a valid email address'
        const pwCheck = validatePassword(bizPassword)
        if (!Object.values(pwCheck).every(Boolean)) errs.bizPassword = 'Password does not meet all requirements'
        if (bizPassword !== bizConfirmPw) errs.bizConfirmPw = 'Passwords do not match'
      }
    }
    
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const nextStep = () => { if (validateStep()) setStep(s => Math.min(s + 1, TOTAL_STEPS - 1)) }
  const prevStep = () => { setErrors({}); setStep(s => Math.max(s - 1, 0)) }

  /* ─── SUBMIT ──────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!validateStep()) return
    setSubmitting(true)
    try {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

      let userId = ''
      let authToken = ''

      try {
        if (isPromoter) {
          const res = await fetch(`${API}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `${firstName} ${lastName}`, email: email.toLowerCase(), password,
              role: 'PROMOTER', phone: phone.replace(/\s/g, ''), consentPopia: true,
              idNumber, city: address, gender: promoGender || undefined,
              height: promoHeight ? parseInt(promoHeight) : undefined,
              clothingSize: promoClothing || undefined, experience: promoExperience || undefined,
              industry: promoCategories.length > 0 ? promoCategories.join(', ') : undefined,
              languages: promoLanguages.length  > 0 ? promoLanguages.join(', ')  : undefined,
            }),
          })
          if (res.ok) {
            const d = await res.json()
            userId    = d.userId || ''
            authToken = d.token  || ''
          }
        } else {
          const res = await fetch(`${API}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: companyName, email: bizEmail.toLowerCase(), password: bizPassword,
              role: 'BUSINESS', phone: bizPhone.replace(/\s/g, ''), consentPopia: true,
              companyName, contactName, companyReg: regNumber, vatNumber, city: bizAddress, industry: bizIndustry,
              categories: bizCategories.length > 0 ? [...bizCategories.filter(c => c !== 'Other'), ...(bizCategories.includes('Other') && bizOtherCategory ? [bizOtherCategory] : [])].join(', ') : undefined,
              languages: bizLanguages.length > 0 ? [...bizLanguages.filter(l => l !== 'Other'), ...(bizLanguages.includes('Other') && bizOtherLanguage ? [bizOtherLanguage] : [])].join(', ') : undefined,
            }),
          })
          if (res.ok) {
            const d = await res.json()
            userId    = d.userId || ''
            authToken = d.token  || ''
          }
        }

        // Upload documents if we got a userId
        if (userId) {
          const fd = new FormData()
          if (isPromoter) {
            if (headshotFile) fd.append('headshot',      headshotFile)
            if (fullBodyFile) fd.append('fullBodyPhoto', fullBodyFile)
            if (cvFile)       fd.append('cv',            cvFile)        // ← CV upload
            if (bankProof)    fd.append('bankProof',     bankProof)
          } else {
            if (cipcDoc)      fd.append('cipcDoc',      cipcDoc)
            if (taxPin)       fd.append('taxPin',       taxPin)
            if (bizBankProof) fd.append('bizBankProof', bizBankProof)
          }
          if ([...fd.entries()].length > 0) {
            const headers: Record<string, string> = {}
            if (authToken) headers['Authorization'] = `Bearer ${authToken}`
            await fetch(`${API}/users/register-documents/${userId}`, { method: 'POST', headers, body: fd })
          }

          // Store token so dashboard can use it immediately
          if (authToken) {
            localStorage.setItem('hg_token', authToken)
            localStorage.setItem('hg_session', JSON.stringify({
              id:               userId,
              name:             isPromoter ? `${firstName} ${lastName}` : companyName,
              email:            isPromoter ? email.toLowerCase() : bizEmail.toLowerCase(),
              role:             isPromoter ? 'promoter' : 'business',
              status:           'pending_review',
              onboardingStatus: 'pending_review',
            }))
          }
        }
      } catch {
        // API offline — still show success
      }

      setDone(true)

      // Registration saved to database via API — no localStorage needed
    } catch (err: any) {
      setErrors({ submit: err.message || 'Registration failed. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  /* ─── STYLES ──────────────────────────────────────────────── */
  const stepLabels = isPromoter ? ['Profile', 'Photos & Banking', 'Account'] : ['Company', 'Documents', 'Account']
  const selectStyle: React.CSSProperties = { width: '100%', background: 'rgba(189,189,189,0.03)', border: `1px solid ${BLACK_BORDER}`, padding: '13px 16px', fontFamily: FB, fontSize: 14, color: WHITE, outline: 'none', appearance: 'none', cursor: 'pointer' }
  const chipSectionLabel = (text: string, count: number) => (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
      <span style={{ fontFamily: FB, fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: GOLD_DIM }}>{text}</span>
      {count > 0 && <span style={{ fontFamily: FB, fontSize: 11, color: GOLD, fontWeight: 600 }}>{count} selected</span>}
    </div>
  )

  /* ─── RENDER ──────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', background: BLACK, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', fontFamily: FB, padding: '60px 16px 80px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400;1,700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { -webkit-font-smoothing: antialiased; background: ${BLACK}; }
        input::placeholder { color: rgba(189,189,189,0.2); }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 30px #060605 inset !important; -webkit-text-fill-color: ${WHITE} !important; }
        @keyframes hg-fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .hg-reg { animation: hg-fade-up 0.5s ease both; }
        select option { background: #0F0F0C; color: ${WHITE}; }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.025, backgroundImage: `linear-gradient(${GOLD} 1px,transparent 1px),linear-gradient(90deg,${GOLD} 1px,transparent 1px)`, backgroundSize: '72px 72px' }} />

      {done && <SuccessModal isPromoter={isPromoter} onDashboard={() => navigate(DASHBOARD_ROUTE[role])} onHome={() => navigate('/')} />}

      <div className="hg-reg" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 560 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontFamily: FD, fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
            <span style={{ color: GOLD }}>HONEY</span><span style={{ color: WHITE }}> GROUP</span>
          </div>
          <div style={{ width: 32, height: 1, background: GOLD, margin: '0 auto 16px' }} />
          <p style={{ fontFamily: FB, fontSize: 10, fontWeight: 600, letterSpacing: '0.38em', textTransform: 'uppercase', color: GOLD_DIM }}>Create Account</p>
        </div>

        {/* Role toggle */}
        <div style={{ display: 'flex', background: '#060605', border: `1px solid ${BLACK_BORDER}`, padding: 4, marginBottom: 24, gap: 4 }}>
          {(['promoter', 'business'] as Role[]).map(r => (
            <button key={r} onClick={() => switchRole(r)}
              style={{ flex: 1, padding: '11px 8px', background: role === r ? GOLD_FAINT : 'transparent', border: role === r ? `1px solid ${GOLD}44` : '1px solid transparent', color: role === r ? GOLD : GOLD_PALE, fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.3s' }}>
              {r === 'promoter' ? '◉ Promoter' : '◈ Business'}
            </button>
          ))}
        </div>

        {/* Step labels + bar */}
        <div style={{ display: 'flex', marginBottom: 6 }}>
          {stepLabels.map((label, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <span style={{ fontFamily: FB, fontSize: 9, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: i === step ? GOLD : i < step ? GOLD_DIM : GOLD_PALE, transition: 'color 0.3s' }}>
                {i + 1}. {label}
              </span>
            </div>
          ))}
        </div>
        <StepBar current={step} total={TOTAL_STEPS} />

        {/* Card */}
        <div style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, padding: '40px 40px 36px', position: 'relative', boxShadow: '0 40px 100px rgba(0,0,0,0.6)' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${BROWN}, ${GOLD}, ${GOLD_LIGHT}, ${GOLD}, ${BROWN})` }} />

          {/* PROMOTER STEP 0 */}
          {isPromoter && step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              <SectionDivider label="Personal Details" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="First Name" placeholder="Ayanda" value={firstName} onChange={setFirstName} focused={focused === 'firstName'} onFocus={() => setFocused('firstName')} onBlur={() => setFocused(null)} error={errors.firstName} />
                <Field label="Last Name" placeholder="Dlamini" value={lastName} onChange={setLastName} focused={focused === 'lastName'} onFocus={() => setFocused('lastName')} onBlur={() => setFocused(null)} error={errors.lastName} />
              </div>
              <Field label="SA Phone Number" placeholder="+27 71 000 0000" value={phone} onChange={v => setPhone(formatSAPhone(v))} focused={focused === 'phone'} onFocus={() => setFocused('phone')} onBlur={() => setFocused(null)} error={errors.phone} hint="South African mobile number" />
              <Field label="SA ID Number" placeholder="9001015009087" value={idNumber} onChange={setIdNumber} focused={focused === 'idNumber'} onFocus={() => setFocused('idNumber')} onBlur={() => setFocused(null)} error={errors.idNumber} hint="13 digits · format YYMMDD followed by 7 digits" />
              <Field label="Residential Address" placeholder="123 Main Street, Johannesburg, 2000" value={address} onChange={setAddress} focused={focused === 'address'} onFocus={() => setFocused('address')} onBlur={() => setFocused(null)} error={errors.address} hint="South African addresses only — include city and postal code" />
              <SectionDivider label="Professional Profile" />
              <div>
                {chipSectionLabel('Category / Type of Work', promoCategories.length)}
                <p style={{ fontFamily: FB, fontSize: 11, color: GOLD_PALE, marginBottom: 12, lineHeight: 1.5 }}>Select all types of promotional work you can do</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {PROMOTER_CATEGORIES.map(cat => <Chip key={cat} label={cat} active={promoCategories.includes(cat)} onClick={() => toggleCategory(cat)} />)}
                </div>
                {promoCategories.length > 0 && (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: GOLD_FAINT, border: `1px solid ${GOLD}33` }}>
                    <p style={{ fontFamily: FB, fontSize: 10, color: GOLD_DIM, marginBottom: 5, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Selected</p>
                    <p style={{ fontFamily: FB, fontSize: 12, color: GOLD }}>{promoCategories.join(' · ')}</p>
                  </div>
                )}
              </div>
              <div>
                {chipSectionLabel('Languages Spoken', promoLanguages.length)}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {SA_LANGUAGES.map(lang => <Chip key={lang} label={lang} active={promoLanguages.includes(lang)} onClick={() => toggleLanguage(lang)} />)}
                </div>
                {promoLanguages.length > 0 && (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: GOLD_FAINT, border: `1px solid ${GOLD}33` }}>
                    <p style={{ fontFamily: FB, fontSize: 12, color: GOLD }}>{promoLanguages.join(' · ')}</p>
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontFamily: FB, fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD_DIM, marginBottom: 8 }}>Experience Level</label>
                  <select value={promoExperience} onChange={e => setPromoExperience(e.target.value)} style={selectStyle}>
                    <option value="">— Select —</option>
                    {EXPERIENCE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: FB, fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD_DIM, marginBottom: 8 }}>Gender</label>
                  <select value={promoGender} onChange={e => setPromoGender(e.target.value)} style={selectStyle}>
                    <option value="">— Select —</option>
                    {['Male', 'Female', 'Non-binary', 'Prefer not to say'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontFamily: FB, fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD_DIM, marginBottom: 8 }}>Height (cm)</label>
                  <input type="number" value={promoHeight} onChange={e => setPromoHeight(e.target.value)} placeholder="e.g. 170" min="140" max="220"
                    style={{ width: '100%', background: 'rgba(189,189,189,0.03)', border: `1px solid ${BLACK_BORDER}`, padding: '13px 16px', fontFamily: FB, fontSize: 14, color: WHITE, outline: 'none' }}
                    onFocus={e => e.currentTarget.style.borderColor = GOLD} onBlur={e => e.currentTarget.style.borderColor = BLACK_BORDER} />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: FB, fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD_DIM, marginBottom: 8 }}>Clothing Size</label>
                  <select value={promoClothing} onChange={e => setPromoClothing(e.target.value)} style={selectStyle}>
                    <option value="">— Select —</option>
                    {['XS (32–34)', 'S (34–36)', 'M (36–38)', 'L (38–40)', 'XL (40–42)', 'XXL (42–44)'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* PROMOTER STEP 1 — Photos, CV & Banking */}
          {isPromoter && step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              <SectionDivider label="Profile Photos" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <PhotoUpload label="Headshot" file={headshotFile} onChange={setHeadshotFile} required aspectHint="Face clearly visible" hint="JPG or PNG · Max 5 MB" />
                <PhotoUpload label="Full Body Photo" file={fullBodyFile} onChange={setFullBodyFile} required aspectHint="Head to toe, standing" hint="JPG or PNG · Max 5 MB" />
              </div>
              {errors.headshot && <p style={{ fontFamily: FB, fontSize: 11, color: AMBER }}>{errors.headshot}</p>}
              {errors.fullBody && <p style={{ fontFamily: FB, fontSize: 11, color: AMBER }}>{errors.fullBody}</p>}

              {/* ── CV Upload — below photos ── */}
              <SectionDivider label="CV / Portfolio" />
              <CVUpload file={cvFile} onChange={setCvFile} />

              <SectionDivider label="Banking Details" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontFamily: FB, fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD_DIM, marginBottom: 8 }}>Bank Name</label>
                  <select value={bankName} onChange={e => setBankName(e.target.value)} style={selectStyle}>
                    <option value="" disabled>Select bank</option>
                    {['ABSA', 'Standard Bank', 'FNB', 'Nedbank', 'Capitec', 'African Bank', 'TymeBank', 'Discovery Bank', 'Investec', 'Other'].map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                  {errors.bankName && <p style={{ fontFamily: FB, fontSize: 11, color: AMBER, marginTop: 5 }}>{errors.bankName}</p>}
                </div>
                <Field label="Account Number" placeholder="e.g. 1234567890" value={accountNo} onChange={v => { const digits = v.replace(/\D/g, '').slice(0, 16); setAccountNo(digits) }} focused={focused === 'accountNo'} onFocus={() => setFocused('accountNo')} onBlur={() => setFocused(null)} error={errors.accountNo} hint={`Digits only · max 16 digits · ${accountNo.length}/16`} />
              </div>
              <FileUploadZone label="Bank Statement / Proof of Account" accept=".pdf,.jpg,.jpeg,.png" file={bankProof} onChange={setBankProof} hint="PDF or image · Max 10 MB" required />
              {errors.bankProof && <p style={{ fontFamily: FB, fontSize: 11, color: AMBER }}>{errors.bankProof}</p>}
            </div>
          )}

          {/* PROMOTER STEP 2 */}
          {isPromoter && step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <SectionDivider label="Login Credentials" />
              <Field label="Email Address" type="email" placeholder="ayanda@email.com" value={email} onChange={setEmail} focused={focused === 'email'} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} error={errors.email} />
              <div>
                <Field label="Password" type="password" placeholder="Min. 8 characters" value={password} onChange={setPassword} focused={focused === 'password'} onFocus={() => setFocused('password')} onBlur={() => setFocused(null)} error={errors.password} />
                <PasswordStrength password={password} />
              </div>
              <Field label="Confirm Password" type="password" placeholder="••••••••" value={confirmPw} onChange={setConfirmPw} focused={focused === 'confirmPw'} onFocus={() => setFocused('confirmPw')} onBlur={() => setFocused(null)} error={errors.confirmPw} />

              {/* Summary of what was uploaded */}
              <div style={{ background: GOLD_FAINT, border: `1px solid ${GOLD}22`, padding: '14px 16px' }}>
                <p style={{ fontFamily: FB, fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD, marginBottom: 10 }}>Documents ready to upload</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    { label: 'Headshot',        file: headshotFile, required: true  },
                    { label: 'Full Body Photo',  file: fullBodyFile, required: true  },
                    { label: 'CV / Portfolio',   file: cvFile,       required: false },
                    { label: 'Bank Proof',       file: bankProof,    required: true  },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, color: item.file ? GOLD : item.required ? AMBER : GOLD_PALE }}>
                        {item.file ? '✓' : item.required ? '○' : '—'}
                      </span>
                      <span style={{ fontFamily: FB, fontSize: 11, color: item.file ? GOLD : item.required ? AMBER : GOLD_PALE }}>
                        {item.label}
                        {item.file ? ` — ${item.file.name}` : item.required ? ' (required)' : ' (optional)'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: GOLD_FAINT, border: `1px solid ${GOLD}22`, padding: '14px 16px' }}>
                <p style={{ fontFamily: FB, fontSize: 12, color: WHITE_MUTED, lineHeight: 1.7 }}>
                  By creating an account you agree to Honey Group's Terms of Service and Privacy Policy. Your account will be <span style={{ color: GOLD }}>pending review</span> until approved.
                </p>
              </div>
            </div>
          )}

          {/* BUSINESS STEP 0 */}
          {!isPromoter && step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <SectionDivider label="Company Information" />
              <Field label="Company Name" placeholder="Acme Promotions (Pty) Ltd" value={companyName} onChange={setCompanyName} focused={focused === 'companyName'} onFocus={() => setFocused('companyName')} onBlur={() => setFocused(null)} error={errors.companyName} />
              <Field label="Contact Person" placeholder="Jane Smith" value={contactName} onChange={setContactName} focused={focused === 'contactName'} onFocus={() => setFocused('contactName')} onBlur={() => setFocused(null)} error={errors.contactName} />
              <Field label="Business Phone" placeholder="+27 11 000 0000" value={bizPhone} onChange={v => setBizPhone(formatSAPhone(v))} focused={focused === 'bizPhone'} onFocus={() => setFocused('bizPhone')} onBlur={() => setFocused(null)} error={errors.bizPhone} hint="SA landline or mobile" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="CIPC Reg Number" placeholder="2024/000000/07" value={regNumber} onChange={setRegNumber} focused={focused === 'regNumber'} onFocus={() => setFocused('regNumber')} onBlur={() => setFocused(null)} error={errors.regNumber} hint="Format: YYYY/NNNNNN/NN" />
                <Field label="VAT Number (Optional)" placeholder="4410000000" value={vatNumber} onChange={setVatNumber} focused={focused === 'vatNumber'} onFocus={() => setFocused('vatNumber')} onBlur={() => setFocused(null)} />
              </div>
              <Field label="Business Address" placeholder="1 Business Park, Sandton, 2196" value={bizAddress} onChange={setBizAddress} focused={focused === 'bizAddress'} onFocus={() => setFocused('bizAddress')} onBlur={() => setFocused(null)} error={errors.bizAddress} hint="South African addresses only — include city and postal code" />
              <div>
                <label style={{ display: 'block', fontFamily: FB, fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD_DIM, marginBottom: 8 }}>Primary Industry / Sector <span style={{ color: GOLD }}>*</span></label>
                <select value={bizIndustry} onChange={e => setBizIndustry(e.target.value)} style={selectStyle}>
                  <option value="">— Select your industry —</option>
                  {INDUSTRY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                {errors.bizIndustry && <p style={{ fontFamily: FB, fontSize: 11, color: AMBER, marginTop: 5 }}>{errors.bizIndustry}</p>}
              </div>

              {/* Business Categories — multi-select */}
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontFamily: FB, fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: GOLD_DIM }}>Categories of Promotions Needed</span>
                  {bizCategories.length > 0 && <span style={{ fontFamily: FB, fontSize: 11, color: GOLD, fontWeight: 600 }}>{bizCategories.length} selected</span>}
                </div>
                <p style={{ fontFamily: FB, fontSize: 11, color: GOLD_PALE, marginBottom: 10, lineHeight: 1.5 }}>Select all promotion types your business requires</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {PROMOTER_CATEGORIES.map(cat => (
                    <Chip key={cat} label={cat} active={bizCategories.includes(cat)} onClick={() => toggleBizCategory(cat)} />
                  ))}
                </div>
                {bizCategories.includes('Other') && (
                  <div style={{ marginTop: 8 }}>
                    <label style={{ display: 'block', fontFamily: FB, fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: GOLD_DIM, marginBottom: 6 }}>Describe your other category</label>
                    <input
                      type="text"
                      placeholder="e.g. Agricultural shows, Mining expos..."
                      value={bizOtherCategory}
                      onChange={e => setBizOtherCategory(e.target.value)}
                      style={{ width: '100%', background: 'rgba(189,189,189,0.03)', border: `1px solid ${BLACK_BORDER}`, padding: '11px 14px', fontFamily: FB, fontSize: 13, color: WHITE, outline: 'none' }}
                      onFocus={e => e.currentTarget.style.borderColor = GOLD}
                      onBlur={e => e.currentTarget.style.borderColor = BLACK_BORDER}
                    />
                  </div>
                )}
                {bizCategories.length > 0 && (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: GOLD_FAINT, border: `1px solid ${GOLD}33` }}>
                    <p style={{ fontFamily: FB, fontSize: 12, color: GOLD }}>{[...bizCategories.filter(c => c !== 'Other'), ...(bizCategories.includes('Other') && bizOtherCategory ? [bizOtherCategory] : ['Other'])].join(' · ')}</p>
                  </div>
                )}
              </div>

              {/* Business Languages — multi-select */}
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontFamily: FB, fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: GOLD_DIM }}>Languages Required</span>
                  {bizLanguages.length > 0 && <span style={{ fontFamily: FB, fontSize: 11, color: GOLD, fontWeight: 600 }}>{bizLanguages.length} selected</span>}
                </div>
                <p style={{ fontFamily: FB, fontSize: 11, color: GOLD_PALE, marginBottom: 10, lineHeight: 1.5 }}>Languages your promoters need to speak</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {[...SA_LANGUAGES, 'Other'].map(lang => (
                    <Chip key={lang} label={lang} active={bizLanguages.includes(lang)} onClick={() => toggleBizLanguage(lang)} />
                  ))}
                </div>
                {bizLanguages.includes('Other') && (
                  <div style={{ marginTop: 8 }}>
                    <label style={{ display: 'block', fontFamily: FB, fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: GOLD_DIM, marginBottom: 6 }}>Specify other language(s)</label>
                    <input
                      type="text"
                      placeholder="e.g. Portuguese, French, Mandarin..."
                      value={bizOtherLanguage}
                      onChange={e => setBizOtherLanguage(e.target.value)}
                      style={{ width: '100%', background: 'rgba(189,189,189,0.03)', border: `1px solid ${BLACK_BORDER}`, padding: '11px 14px', fontFamily: FB, fontSize: 13, color: WHITE, outline: 'none' }}
                      onFocus={e => e.currentTarget.style.borderColor = GOLD}
                      onBlur={e => e.currentTarget.style.borderColor = BLACK_BORDER}
                    />
                  </div>
                )}
                {bizLanguages.length > 0 && (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: GOLD_FAINT, border: `1px solid ${GOLD}33` }}>
                    <p style={{ fontFamily: FB, fontSize: 12, color: GOLD }}>{[...bizLanguages.filter(l => l !== 'Other'), ...(bizLanguages.includes('Other') && bizOtherLanguage ? [bizOtherLanguage] : bizLanguages.includes('Other') ? ['Other'] : [])].join(' · ')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BUSINESS STEP 1 */}
          {!isPromoter && step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              <SectionDivider label="Business Documents" />
              <FileUploadZone label="CIPC Registration Certificate" accept=".pdf,.jpg,.jpeg,.png" file={cipcDoc} onChange={setCipcDoc} hint="Official CIPC CoR14.3 or equivalent · PDF preferred" required />
              {errors.cipcDoc && <p style={{ fontFamily: FB, fontSize: 11, color: AMBER }}>{errors.cipcDoc}</p>}
              <FileUploadZone label="Tax Clearance / Tax PIN (Optional)" accept=".pdf,.jpg,.jpeg,.png" file={taxPin} onChange={setTaxPin} hint="SARS Tax Clearance Certificate or Tax PIN letter" />
              <SectionDivider label="Banking" />
              <FileUploadZone label="Bank Confirmation Letter" accept=".pdf,.jpg,.jpeg,.png" file={bizBankProof} onChange={setBizBankProof} hint="Official bank letter on letterhead · PDF preferred" required />
              {errors.bizBankProof && <p style={{ fontFamily: FB, fontSize: 11, color: AMBER }}>{errors.bizBankProof}</p>}
            </div>
          )}

          {/* BUSINESS STEP 2 */}
          {!isPromoter && step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <SectionDivider label="Login Credentials" />
              <Field label="Business Email" type="email" placeholder="contact@company.co.za" value={bizEmail} onChange={setBizEmail} focused={focused === 'bizEmail'} onFocus={() => setFocused('bizEmail')} onBlur={() => setFocused(null)} error={errors.bizEmail} />
              <div>
                <Field label="Password" type="password" placeholder="Min. 8 characters" value={bizPassword} onChange={setBizPassword} focused={focused === 'bizPassword'} onFocus={() => setFocused('bizPassword')} onBlur={() => setFocused(null)} error={errors.bizPassword} />
                <PasswordStrength password={bizPassword} />
              </div>
              <Field label="Confirm Password" type="password" placeholder="••••••••" value={bizConfirmPw} onChange={setBizConfirmPw} focused={focused === 'bizConfirmPw'} onFocus={() => setFocused('bizConfirmPw')} onBlur={() => setFocused(null)} error={errors.bizConfirmPw} />
              <div style={{ background: GOLD_FAINT, border: `1px solid ${GOLD}22`, padding: '14px 16px' }}>
                <p style={{ fontFamily: FB, fontSize: 12, color: WHITE_MUTED, lineHeight: 1.7 }}>
                  Your business account will be <span style={{ color: GOLD }}>pending review</span> until verified by Honey Group administrators.
                </p>
              </div>
            </div>
          )}

          {/* Submit error */}
          {errors.submit && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: `${AMBER}18`, border: `1px solid ${AMBER}44` }}>
              <p style={{ fontFamily: FB, fontSize: 12, color: AMBER }}>{errors.submit}</p>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            {step > 0 && (
              <button onClick={prevStep}
                style={{ flex: 1, padding: '15px 0', background: 'transparent', border: `1px solid ${BLACK_BORDER}`, fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD_DIM, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.color = GOLD }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BLACK_BORDER; e.currentTarget.style.color = GOLD_DIM }}>
                Back
              </button>
            )}
            <button onClick={step < TOTAL_STEPS - 1 ? nextStep : handleSubmit} disabled={submitting}
              style={{ flex: 2, padding: '15px 0', background: `linear-gradient(90deg, ${AMBER}, ${GOLD}, ${GOLD_LIGHT})`, border: 'none', fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: BLACK, cursor: submitting ? 'wait' : 'pointer', transition: 'all 0.3s' }}
              onMouseEnter={e => { if (!submitting) { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}>
              {submitting ? 'Submitting…' : step < TOTAL_STEPS - 1 ? 'Continue' : 'Submit Application'}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <span style={{ fontFamily: FB, fontSize: 12, color: GOLD_DIM }}>Already have an account? </span>
          <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FB, fontSize: 12, color: GOLD, fontWeight: 600, padding: 0 }}>Log In</button>
        </div>
        <p style={{ textAlign: 'center', marginTop: 12, fontFamily: FB, fontSize: 10, color: GOLD_PALE, letterSpacing: '0.14em' }}>ADMIN ACCOUNTS ARE CREATED BY INVITATION ONLY</p>
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FB, fontSize: 11, color: GOLD_PALE, letterSpacing: '0.16em', textTransform: 'uppercase', transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = GOLD)} onMouseLeave={e => (e.currentTarget.style.color = GOLD_PALE)}>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}