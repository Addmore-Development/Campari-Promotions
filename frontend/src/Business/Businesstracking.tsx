import { useState, useEffect, useCallback } from 'react'

const BLK2  = '#100C05'
const BLK3  = '#181206'
const GL    = '#E8A820'
const GD    = '#C07818'
const GD2   = '#8B5A1A'
const BB    = 'rgba(212,136,10,0.16)'
const BB2   = 'rgba(212,136,10,0.08)'
const W     = '#FAF3E8'
const W4    = 'rgba(250,243,232,0.40)'
const W2    = 'rgba(250,243,232,0.20)'
const FD    = "'Playfair Display', Georgia, serif"
const FB    = "'DM Sans', system-ui, sans-serif"
const GREEN = '#4ade80'
const AMBER = '#E8A820'
const CORAL = '#C4614A'

const GL_08   = 'rgba(232,168,32,0.08)'
const GL_015  = 'rgba(232,168,32,0.15)'
const GL_03   = 'rgba(232,168,32,0.3)'
const GL_012  = 'rgba(232,168,32,0.12)'
const GL_04   = 'rgba(232,168,32,0.4)'
const GL_006  = 'rgba(232,168,32,0.06)'
const GL_028  = 'rgba(232,168,32,0.28)'
const GL_03b  = '1px solid rgba(232,168,32,0.3)'
const GREEN_008 = 'rgba(74,222,128,0.08)'
const GREEN_025 = 'rgba(74,222,128,0.25)'
const BB_1px  = '1px solid rgba(212,136,10,0.16)'

const PIN_EMOJI = '\uD83D\uDCCD'
const MAP_EMOJI = '\uD83D\uDDFA'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const BACKEND = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'

function authHdr(): Record<string, string> {
  const t = localStorage.getItem('hg_token')
  return t ? { Authorization: 'Bearer ' + t } : {}
}
function hoverIn(el: HTMLElement, bg: string, border?: string) {
  el.style.background = bg
  if (border !== undefined) el.style.borderColor = border
}
function hoverOut(el: HTMLElement, bg: string, border?: string) {
  el.style.background = bg
  if (border !== undefined) el.style.borderColor = border
}

// ── Resolve selfie URL (handle relative paths from backend) ──────────────────
function selfieUrl(path?: string | null): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  return BACKEND + path
}

interface LivePromoter {
  userId:           string
  shiftId?:         string
  jobId?:           string
  lat:              number
  lng:              number
  timestamp:        number
  checkInLat?:      number | null
  checkInLng?:      number | null
  // Promoter
  promoterName?:    string
  promoterPhoto?:   string
  promoterEmail?:   string
  promoterPhone?:   string
  promoterCity?:    string
  promoterGender?:  string
  promoterHeight?:  number | null
  // Job
  jobTitle?:        string
  jobClient?:       string
  venue?:           string
  jobAddress?:      string
  jobCity?:         string
  jobLat?:          number | null
  jobLng?:          number | null
  jobDate?:         string
  startTime?:       string
  endTime?:         string
  hourlyRate?:      number
  // Shift
  checkInTime?:     string
  checkOutTime?:    string | null
  hoursWorked?:     number | null
  paymentStatus?:   string | null
  issueReport?:     string | null
  selfieInUrl?:     string | null
  selfieOutUrl?:    string | null
  // Calculated
  currentEarnings?: number
  hoursElapsed?:    number
}

// ── Live earnings timer ───────────────────────────────────────────────────────
function LiveTimer({ checkInTime }: { checkInTime: string }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const update = () => setElapsed((Date.now() - new Date(checkInTime).getTime()) / 1000)
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [checkInTime])
  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = Math.floor(elapsed % 60)
  return (
    <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: GREEN }}>
      {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
    </span>
  )
}

function StatBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: BLK2, padding: '20px 22px', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${color},${color}44)` }} />
      <div style={{ fontFamily: FD, fontSize: 28, fontWeight: 700, color: W, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: W4, marginTop: 6, letterSpacing: '0.16em', textTransform: 'uppercase' as const, fontFamily: FD }}>{label}</div>
    </div>
  )
}

// ── Leaflet map with double-init guard ────────────────────────────────────────
function LiveMap({ promoters, selectedPromo, onSelectPromo }: {
  promoters: LivePromoter[]
  selectedPromo: LivePromoter | null
  onSelectPromo: (p: LivePromoter) => void
}) {
  const [mapInstance, setMapInstance] = useState<any>(null)
  const [markers,     setMarkers]     = useState<any[]>([])

  const mapRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    if ((node as any)._leaflet_id) return  // already initialised
    import('leaflet').then(L => {
      if ((node as any)._leaflet_id) return
      const m = L.default.map(node).setView([-30.5595, 22.9375], 5)
      L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(m)
      setMapInstance(m)
    }).catch(console.error)
  }, [])

  useEffect(() => {
    if (!mapInstance) return
    import('leaflet').then(L => {
      markers.forEach(m => m?.remove())
      const newMarkers: any[] = []

      promoters.forEach(p => {
        if (p.lat == null || p.lng == null) return
        const isSel   = selectedPromo?.userId === p.userId
        const isStale = (Date.now() - p.timestamp) > 120000

        // ── Promoter dot marker ───────────────────────────────────────────
        const icon = L.default.divIcon({
          className: '',
          html: `
            <div style="
              width:${isSel?'22px':'16px'};height:${isSel?'22px':'16px'};
              background:${isStale?GD:GREEN};
              border:3px solid ${isSel?GL:'#fff'};
              border-radius:50%;
              box-shadow:0 2px 8px rgba(0,0,0,0.4);
              cursor:pointer;
              transition:all 0.2s;
            "></div>`,
          iconSize:   [isSel?22:16, isSel?22:16],
          iconAnchor: [isSel?11:8,  isSel?11:8],
        })

        const marker = L.default.marker([p.lat, p.lng], { icon })
          .addTo(mapInstance)
          .on('click', () => onSelectPromo(p))

        // Rich popup
        const selfieHtml = selfieUrl(p.selfieInUrl)
          ? `<img src="${selfieUrl(p.selfieInUrl)}" style="width:100%;height:80px;object-fit:cover;border-radius:4px;margin-bottom:6px;"/>`
          : ''
        // Calculate earnings fresh at popup-bind time so it's accurate when clicked
        const _hrs    = p.checkInTime ? (Date.now() - new Date(p.checkInTime).getTime()) / 3_600_000 : (p.hoursElapsed || 0)
        const _earned = p.hourlyRate && p.hourlyRate > 0
          ? _hrs * p.hourlyRate
          : (p.currentEarnings || 0)
        const earned  = `R${_earned.toFixed(2)}`
        marker.bindPopup(`
          <div style="font-family:${FD};padding:6px;min-width:180px;">
            ${selfieHtml}
            <strong style="color:${GL};font-size:13px;">${p.promoterName || 'Unknown'}</strong><br/>
            <span style="font-size:11px;color:#FAF3E8;">${p.jobTitle || 'On shift'}</span><br/>
            <span style="font-size:10px;color:${GD};">${PIN_EMOJI} ${p.venue || p.jobAddress || '—'}</span><br/>
            <span style="font-size:10px;color:${GREEN};font-weight:700;">Earned: ${earned}</span>
          </div>
        `, { maxWidth: 220 })

        newMarkers.push(marker)

        // ── Venue pin (job location) ─────────────────────────────────────
        if (p.jobLat != null && p.jobLng != null) {
          const venueIcon = L.default.divIcon({
            className: '',
            html: `<div style="width:12px;height:12px;background:${GL};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
            iconSize:   [12,12],
            iconAnchor: [6,6],
          })
          const venueMarker = L.default.marker([p.jobLat, p.jobLng], { icon: venueIcon })
            .addTo(mapInstance)
          venueMarker.bindTooltip(p.venue || 'Venue', { permanent: false, direction: 'top' })
          newMarkers.push(venueMarker)

          // Line from venue to promoter
          const line = L.default.polyline(
            [[p.jobLat, p.jobLng], [p.lat, p.lng]],
            { color: isSel ? GL : 'rgba(232,168,32,0.3)', weight: isSel ? 2 : 1, dashArray: '4 4' }
          ).addTo(mapInstance)
          newMarkers.push(line)
        }
      })

      setMarkers(newMarkers)

      // Fit map to markers
      const pts = promoters.filter(p => p.lat != null && p.lng != null)
      if (pts.length > 0) {
        const group = L.default.featureGroup(newMarkers.filter(Boolean))
        if (group.getLayers().length > 0) {
          try { mapInstance.fitBounds(group.getBounds().pad(0.15)) } catch {}
        }
      }
    }).catch(console.error)

    return () => { markers.forEach(m => m?.remove()) }
  }, [promoters, selectedPromo, mapInstance])

  useEffect(() => {
    return () => { if (mapInstance) { try { mapInstance.remove() } catch {} } }
  }, [mapInstance])

  return (
    <div style={{ marginBottom: 24, borderRadius: 4, overflow: 'hidden', border: `1px solid ${BB}` }}>
      <div ref={mapRef} style={{ height: '420px', width: '100%', background: '#1a1a1a' }} />
      <style>{`
        .leaflet-container { background: #1a1a1a !important; }
        .leaflet-tile { filter: brightness(0.75) contrast(1.15) !important; }
        .leaflet-control-attribution { background: rgba(0,0,0,0.7)!important; color:${W4}!important; font-size:9px!important; }
        .leaflet-control-attribution a { color:${GL}!important; }
        .leaflet-popup-content-wrapper { background:${BLK2}!important; color:${W}!important; border:1px solid ${BB}!important; border-radius:4px!important; }
        .leaflet-popup-tip { background:${BLK2}!important; }
        .leaflet-popup-close-button { color:${W4}!important; }
        .leaflet-tooltip { background:${BLK2}!important; border:1px solid ${BB}!important; color:${W}!important; font-size:10px!important; }
      `}</style>
    </div>
  )
}

// ── Full shift detail modal ───────────────────────────────────────────────────
function ShiftDetailModal({ p, onClose }: { p: LivePromoter; onClose: () => void }) {
  const isLate     = p.issueReport?.startsWith('LATE_CHECK_IN:')
  const lateMin    = isLate ? p.issueReport!.replace('LATE_CHECK_IN:', '') : null
  const checkInSelfie  = selfieUrl(p.selfieInUrl)
  const checkOutSelfie = selfieUrl(p.selfieOutUrl)

  // ── Live ticking earnings & elapsed time ──────────────────────────────────
  const [liveEarnings, setLiveEarnings] = useState(0)
  const [liveElapsed,  setLiveElapsed]  = useState(0)

  useEffect(() => {
    const calc = () => {
      const elapsedHrs = p.checkInTime
        ? (Date.now() - new Date(p.checkInTime).getTime()) / 3_600_000
        : (p.hoursElapsed || 0)
      setLiveElapsed(elapsedHrs)
      if (p.hourlyRate && p.hourlyRate > 0) {
        setLiveEarnings(elapsedHrs * p.hourlyRate)
      } else if (p.currentEarnings != null && p.currentEarnings > 0) {
        // Server gave us a calculated value — use it
        setLiveEarnings(p.currentEarnings)
      } else {
        setLiveEarnings(0)
      }
    }
    calc()
    const t = setInterval(calc, 1000)
    return () => clearInterval(t)
  }, [p.checkInTime, p.hourlyRate, p.hoursElapsed, p.currentEarnings])

  const displayRate = p.hourlyRate && p.hourlyRate > 0 ? p.hourlyRate : null

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{ background: BLK2, border: `1px solid ${BB}`, borderRadius: 6, width: '100%', maxWidth: 680, maxHeight: '92vh', overflowY: 'auto', position: 'relative', padding: '36px 36px 28px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Gold top bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${GD2},${GL},${GD})`, borderRadius: '6px 6px 0 0' }} />
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 18, background: 'none', border: 'none', cursor: 'pointer', color: W4, fontSize: 22 }}>×</button>

        {/* Header — promoter identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${GL}`, flexShrink: 0 }}>
            {p.promoterPhoto
              ? <img src={p.promoterPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', background: GL_012, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: GL, fontFamily: FD }}>{(p.promoterName||'?').charAt(0)}</div>
            }
          </div>
          <div>
            <div style={{ fontFamily: FD, fontSize: 22, fontWeight: 700, color: W }}>{p.promoterName || 'Unknown Promoter'}</div>
            <div style={{ fontSize: 12, color: W4, marginTop: 2, fontFamily: FB }}>
              {p.promoterEmail && <span>{p.promoterEmail}</span>}
              {p.promoterPhone && <span style={{ marginLeft: 12 }}>{p.promoterPhone}</span>}
            </div>
            {p.promoterGender && <div style={{ fontSize: 11, color: GL, marginTop: 2 }}>{p.promoterGender}{p.promoterHeight ? ` · ${p.promoterHeight}cm` : ''}{p.promoterCity ? ` · ${p.promoterCity}` : ''}</div>}
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: GREEN_008, border: `1px solid ${GREEN_025}`, padding: '5px 12px', borderRadius: 3 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: GREEN }} />
              <span style={{ fontSize: 11, color: GREEN, fontWeight: 700, fontFamily: FD }}>Live on shift</span>
            </div>
            {isLate && (
              <div style={{ marginTop: 6, fontSize: 10, color: AMBER, fontWeight: 700, fontFamily: FB }}>Late by {lateMin} min</div>
            )}
          </div>
        </div>

        {/* Live earnings banner */}
        <div style={{ padding: '16px 20px', background: GREEN_008, border: `1px solid ${GREEN_025}`, borderRadius: 4, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 9, color: GREEN, letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: FB, marginBottom: 4 }}>Live Earnings</div>
            <div style={{ fontFamily: FD, fontSize: 28, fontWeight: 700, color: GREEN }}>R{liveEarnings.toFixed(2)}</div>
            <div style={{ fontSize: 11, color: W4, marginTop: 2, fontFamily: FB }}>
              {displayRate ? `R${displayRate}/hr × ${liveElapsed.toFixed(2)} hrs` : `${liveElapsed.toFixed(2)} hrs on shift`}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: W4, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: FB, marginBottom: 4 }}>Time on shift</div>
            {p.checkInTime && <LiveTimer checkInTime={p.checkInTime} />}
          </div>
        </div>

        {/* Job details */}
        <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: GL, fontWeight: 700, fontFamily: FD, marginBottom: 12 }}>Job Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 }}>
          {[
            { label: 'Job',      value: p.jobTitle   || '—' },
            { label: 'Client',   value: p.jobClient  || '—' },
            { label: 'Venue',    value: p.venue      || '—' },
            { label: 'Address',  value: p.jobAddress || p.jobCity || '—' },
            { label: 'Date',     value: p.jobDate ? new Date(p.jobDate).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'}) : '—' },
            { label: 'Time',     value: p.startTime && p.endTime ? `${p.startTime} – ${p.endTime}` : '—' },
          ].map(r => (
            <div key={r.label} style={{ background: BB2, border: BB_1px, padding: '10px 12px', borderRadius: 3 }}>
              <div style={{ fontSize: 8, color: W4, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3, fontFamily: FB }}>{r.label}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: W, fontFamily: FD }}>{r.value}</div>
            </div>
          ))}
        </div>

        {/* Location */}
        <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: GL, fontWeight: 700, fontFamily: FD, marginBottom: 12 }}>Live Location</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 8 }}>
          {[
            { label: 'Latitude',    value: p.lat  != null ? p.lat.toFixed(5)  : '—' },
            { label: 'Longitude',   value: p.lng  != null ? p.lng.toFixed(5)  : '—' },
            { label: 'Check-in at', value: p.checkInLat != null ? p.checkInLat.toFixed(4) + ', ' + p.checkInLng?.toFixed(4) : '—' },
            { label: 'Last ping',   value: Math.round((Date.now() - p.timestamp) / 1000) + 's ago' },
          ].map(r => (
            <div key={r.label} style={{ background: BB2, border: BB_1px, padding: '10px 12px', borderRadius: 3 }}>
              <div style={{ fontSize: 8, color: W4, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3, fontFamily: FB }}>{r.label}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: W, fontFamily: FD }}>{r.value}</div>
            </div>
          ))}
        </div>

        {/* Google Maps link */}
        {p.lat != null && p.lng != null && (
          <div style={{ marginBottom: 20 }}>
            <a
              href={`https://www.google.com/maps?q=${p.lat},${p.lng}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px', background: GL_08, border: GL_03b, borderRadius: 3, color: GL, fontSize: 11, fontFamily: FD, fontWeight: 700, textDecoration: 'none' }}
            >
              {MAP_EMOJI} Open Live Location in Google Maps
            </a>
            {p.jobLat != null && p.jobLng != null && (
              <a
                href={`https://www.google.com/maps/dir/${p.lat},${p.lng}/${p.jobLat},${p.jobLng}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px', background: 'transparent', border: `1px solid ${BB}`, borderRadius: 3, color: W4, fontSize: 11, fontFamily: FD, fontWeight: 700, textDecoration: 'none', marginLeft: 8 }}
              >
                {PIN_EMOJI} Directions to Venue
              </a>
            )}
          </div>
        )}

        {/* Selfies */}
        {(checkInSelfie || checkOutSelfie) && (
          <>
            <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: GL, fontWeight: 700, fontFamily: FD, marginBottom: 12 }}>Selfies</div>
            <div style={{ display: 'grid', gridTemplateColumns: checkInSelfie && checkOutSelfie ? '1fr 1fr' : '1fr', gap: 14, marginBottom: 20 }}>
              {checkInSelfie && (
                <div>
                  <div style={{ fontSize: 9, color: GREEN, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: FB, marginBottom: 6 }}>Check-in selfie</div>
                  <img
                    src={checkInSelfie}
                    alt="Check-in selfie"
                    style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 6, border: `1px solid ${GREEN_025}` }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  {p.checkInTime && (
                    <div style={{ fontSize: 10, color: W4, marginTop: 4, fontFamily: FB }}>
                      {new Date(p.checkInTime).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                      {isLate && <span style={{ color: AMBER, marginLeft: 8, fontWeight: 700 }}>· {lateMin} min late</span>}
                    </div>
                  )}
                </div>
              )}
              {checkOutSelfie && (
                <div>
                  <div style={{ fontSize: 9, color: CORAL, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: FB, marginBottom: 6 }}>Check-out selfie</div>
                  <img
                    src={checkOutSelfie}
                    alt="Check-out selfie"
                    style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 6, border: `1px solid rgba(196,97,74,0.4)` }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  {p.checkOutTime && (
                    <div style={{ fontSize: 10, color: W4, marginTop: 4, fontFamily: FB }}>
                      {new Date(p.checkOutTime).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* No selfies yet */}
        {!checkInSelfie && !checkOutSelfie && (
          <div style={{ padding: '14px 16px', background: BB2, border: BB_1px, borderRadius: 3, fontSize: 12, color: W4, fontFamily: FB, marginBottom: 20 }}>
            No selfies uploaded yet for this shift.
          </div>
        )}

        <button onClick={onClose}
          style={{ width: '100%', padding: '12px', background: 'transparent', border: `1px solid ${BB}`, color: W4, fontFamily: FB, fontSize: 12, cursor: 'pointer', borderRadius: 4 }}>
          Close
        </button>
      </div>
    </div>
  )
}

// ── Promoter card ─────────────────────────────────────────────────────────────
function PromoterCard({ p, isSelected, onClick }: { p: LivePromoter; isSelected: boolean; onClick: () => void }) {
  const lastSeen   = Math.round((Date.now() - (p.timestamp || Date.now())) / 1000)
  const isStale    = lastSeen > 120
  const isLate     = p.issueReport?.startsWith('LATE_CHECK_IN:')
  const lateMin    = isLate ? p.issueReport!.replace('LATE_CHECK_IN:', '') : null

  // Live ticking earnings — updates every second
  const [liveEarnings, setLiveEarnings] = useState(
    p.hourlyRate && p.hourlyRate > 0 && p.checkInTime
      ? (Date.now() - new Date(p.checkInTime).getTime()) / 3_600_000 * p.hourlyRate
      : (p.currentEarnings || 0)
  )
  const [liveElapsed, setLiveElapsed] = useState(
    p.checkInTime ? (Date.now() - new Date(p.checkInTime).getTime()) / 3_600_000 : (p.hoursElapsed || 0)
  )

  useEffect(() => {
    const tick = () => {
      const hrs = p.checkInTime
        ? (Date.now() - new Date(p.checkInTime).getTime()) / 3_600_000
        : (p.hoursElapsed || 0)
      setLiveElapsed(hrs)
      if (p.hourlyRate && p.hourlyRate > 0) {
        setLiveEarnings(hrs * p.hourlyRate)
      } else if (p.currentEarnings != null && p.currentEarnings > 0) {
        setLiveEarnings(p.currentEarnings)
      }
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [p.checkInTime, p.hourlyRate, p.hoursElapsed, p.currentEarnings])
  const latStr     = p.lat != null ? p.lat.toFixed(4) : '—'
  const lngStr     = p.lng != null ? p.lng.toFixed(4) : '—'
  const inSelfie   = selfieUrl(p.selfieInUrl)

  return (
    <div
      onClick={onClick}
      style={{ padding: '16px 18px', background: isSelected ? GL_006 : BLK2, border: `1px solid ${isSelected ? GL_04 : BB}`, borderRadius: 4, cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
      onMouseEnter={e => { if (!isSelected) hoverIn(e.currentTarget, BLK3, GL_028) }}
      onMouseLeave={e => { if (!isSelected) hoverOut(e.currentTarget, BLK2, BB) }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: isStale ? GL_028 : GREEN }} />

      {/* Top row — avatar + name + timer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${isStale ? BB : GREEN}` }}>
            {/* Show check-in selfie as avatar if available, else profile photo */}
            {(inSelfie || p.promoterPhoto)
              ? <img src={inSelfie || p.promoterPhoto!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
              : <div style={{ width: '100%', height: '100%', background: GL_012, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: GL, fontFamily: FD }}>{(p.promoterName||'?').charAt(0)}</div>
            }
          </div>
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: isStale ? GD2 : GREEN, border: `2px solid ${BLK2}` }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: W, fontFamily: FD, marginBottom: 1 }}>{p.promoterName || 'Unknown'}</div>
          <div style={{ fontSize: 11, color: W4, fontFamily: FB, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{p.jobTitle || '—'}</div>
          {isLate && <div style={{ fontSize: 9, color: AMBER, fontWeight: 700, marginTop: 2 }}>Late {lateMin} min</div>}
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {(!isStale && p.checkInTime)
            ? <LiveTimer checkInTime={p.checkInTime} />
            : <span style={{ fontSize: 10, color: W4 }}>{lastSeen < 60 ? lastSeen + 's ago' : Math.floor(lastSeen/60) + 'm ago'}</span>
          }
        </div>
      </div>

      {/* Venue */}
      {p.venue && (
        <div style={{ fontSize: 11, color: W4, marginBottom: 10, fontFamily: FB }}>{PIN_EMOJI} {p.venue}</div>
      )}

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        {[
          { label: 'Earnings',  value: `R${liveEarnings.toFixed(2)}`, accent: GL   },
          { label: 'Hours',     value: liveElapsed > 0 ? liveElapsed.toFixed(2) + 'h' : '—' },
          { label: 'Location',  value: latStr + ', ' + lngStr },
        ].map(s => (
          <div key={s.label} style={{ background: BB2, padding: '7px 9px', borderRadius: 3 }}>
            <div style={{ fontSize: 7, color: W2, letterSpacing: '0.14em', textTransform: 'uppercase' as const, marginBottom: 2, fontFamily: FB }}>{s.label}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: s.accent || W, fontFamily: FD, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* View details hint */}
      <div style={{ marginTop: 10, fontSize: 10, color: GL, fontFamily: FB, textAlign: 'right' }}>
        {isSelected ? 'Click to collapse' : 'Click to view full details →'}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BusinessTracking() {
  const [livePromoters, setLivePromoters] = useState<LivePromoter[]>([])
  const [jobs,          setJobs]          = useState<any[]>([])
  const [selectedJob,   setSelectedJob]   = useState<string>('all')
  const [selectedPromo, setSelectedPromo] = useState<LivePromoter | null>(null)
  const [modalPromo,    setModalPromo]    = useState<LivePromoter | null>(null)
  const [lastRefresh,   setLastRefresh]   = useState(new Date())
  const [loading,       setLoading]       = useState(true)
  const [tickMs, setTickMs] = useState(Date.now())

  const loadData = useCallback(async () => {
    try {
      const [locRes, jobsRes] = await Promise.all([
        fetch(API + '/shifts/live-locations', { headers: authHdr() as any }),
        fetch(API + '/jobs',                  { headers: authHdr() as any }),
      ])
      if (locRes.ok)  setLivePromoters(await locRes.json())
      if (jobsRes.ok) {
        const jj: any[] = await jobsRes.json()
        setJobs(jj.filter((j: any) => ['OPEN','FILLED','IN_PROGRESS'].includes(j.status)))
      }
    } catch (e) { console.error('[BusinessTracking] load error:', e) }
    setLastRefresh(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
    const dataInterval = setInterval(loadData, 15000)
    // 1-second tick to keep earnings counter live
    const tickInterval = setInterval(() => setTickMs(Date.now()), 1000)
    return () => { clearInterval(dataInterval); clearInterval(tickInterval) }
  }, [loadData])

  const filtered       = livePromoters.filter(p => selectedJob === 'all' || p.jobId === selectedJob)
  // tickMs in the dep array ensures this recalculates every second
  const totalEarnings  = filtered.reduce((s, p) => {
    const hrs = p.checkInTime ? (tickMs - new Date(p.checkInTime).getTime()) / 3_600_000 : (p.hoursElapsed || 0)
    if (p.hourlyRate && p.hourlyRate > 0) return s + hrs * p.hourlyRate
    if (p.currentEarnings != null) return s + p.currentEarnings
    return s
  }, 0)
  const activeJobCount = new Set(livePromoters.map(p => p.jobId)).size

  return (
    <div>
      <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}'}</style>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossOrigin="" />

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.36em', textTransform: 'uppercase' as const, color: GL, marginBottom: 8, fontWeight: 700, fontFamily: FD }}>Operations · Live</div>
            <h1 style={{ fontFamily: FD, fontSize: 'clamp(22px,3vw,34px)', fontWeight: 700, color: W }}>Live Tracking</h1>
            <p style={{ fontSize: 13, color: W4, marginTop: 6, fontFamily: FB }}>Real-time promoter locations, earnings and selfies. Updates every 15 seconds.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            {livePromoters.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: GREEN_008, border: `1px solid ${GREEN_025}`, padding: '7px 14px', borderRadius: 3 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: GREEN, animation: 'pulse 1.5s ease-in-out infinite' }} />
                <span style={{ fontFamily: FD, fontSize: 11, fontWeight: 700, color: GREEN }}>{filtered.length} live on shift</span>
              </div>
            )}
            <div style={{ fontSize: 10, color: W4, fontFamily: FB }}>
              Updated {lastRefresh.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <button onClick={loadData}
              style={{ padding: '5px 12px', background: 'transparent', border: BB_1px, color: W4, fontFamily: FB, fontSize: 10, cursor: 'pointer', borderRadius: 2 }}
              onMouseEnter={e => hoverIn(e.currentTarget, 'transparent', GL)}
              onMouseLeave={e => hoverOut(e.currentTarget, 'transparent', BB)}>
              Refresh Now
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: BB, marginBottom: 24 }}>
        <StatBox label="Promoters On Shift" value={filtered.length}             color={GREEN} />
        <StatBox label="Live Cost So Far"   value={`R${totalEarnings.toFixed(2)}`} color={GL}    />
        <StatBox label="Active Jobs"        value={activeJobCount}              color={GD}    />
      </div>

      {/* Map */}
      <LiveMap
        promoters={filtered}
        selectedPromo={selectedPromo}
        onSelectPromo={p => { setSelectedPromo(prev => prev?.userId === p.userId ? null : p); setModalPromo(p) }}
      />

      {/* Job filter */}
      {jobs.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' as const }}>
          <button onClick={() => setSelectedJob('all')}
            style={{ padding: '6px 14px', border: `1px solid ${selectedJob==='all'?GL:BB}`, background: selectedJob==='all'?GL_012:'transparent', color: selectedJob==='all'?GL:W4, fontFamily: FD, fontSize: 10, cursor: 'pointer', borderRadius: 2 }}>
            All Jobs
          </button>
          {jobs.map(job => {
            const cnt    = livePromoters.filter(p => p.jobId === job.id).length
            const isAct  = selectedJob === job.id
            return (
              <button key={job.id} onClick={() => setSelectedJob(job.id)}
                style={{ padding: '6px 14px', border: `1px solid ${isAct?GL:BB}`, background: isAct?GL_012:'transparent', color: isAct?GL:W4, fontFamily: FD, fontSize: 10, cursor: 'pointer', borderRadius: 2 }}>
                {job.title}
                {cnt > 0 && <span style={{ marginLeft: 6, fontSize: 9, color: GREEN }}>{cnt}</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* Promoter cards */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: W4, fontFamily: FD }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', border: `1px dashed ${BB}`, borderRadius: 3 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>{PIN_EMOJI}</div>
          <p style={{ fontFamily: FD, fontSize: 20, color: W4, marginBottom: 8 }}>No promoters on shift right now</p>
          <p style={{ fontFamily: FB, fontSize: 13, color: W2 }}>When a promoter checks in, their live location will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
          {[...filtered].sort((a, b) => b.timestamp - a.timestamp).map(p => (
            <PromoterCard
              key={p.userId}
              p={p}
              isSelected={selectedPromo?.userId === p.userId}
              onClick={() => {
                setSelectedPromo(prev => prev?.userId === p.userId ? null : p)
                setModalPromo(p)
              }}
            />
          ))}
        </div>
      )}

      {/* Full detail modal */}
      {modalPromo && (
        <ShiftDetailModal p={modalPromo} onClose={() => { setModalPromo(null); setSelectedPromo(null) }} />
      )}
    </div>
  )
}