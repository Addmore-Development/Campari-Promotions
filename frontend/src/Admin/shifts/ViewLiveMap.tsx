import { useState, useEffect, useRef, useCallback } from 'react'
import { AdminLayout } from '../AdminLayout'

// ─── Palette ──────────────────────────────────────────────────────────────────
const GL   = '#E8A820'
const G    = '#D4880A'
const G2   = '#8B5A1A'
const G3   = '#C07818'
const G4   = '#F0C050'
const D1   = '#0E0C06'
const D2   = '#151209'
const BB   = 'rgba(212,136,10,0.16)'
const BB2  = 'rgba(212,136,10,0.06)'
const W    = '#FAF3E8'
const WM   = 'rgba(250,243,232,0.82)'
const WD   = 'rgba(250,243,232,0.58)'
const FD   = "'Playfair Display', Georgia, serif"

function hex2rgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

type CheckStatus = 'checked-in' | 'late' | 'absent' | 'completed'

const STATUS_COLOR: Record<CheckStatus, string> = {
  'checked-in': GL,   'late': G4,   'absent': '#E8D5A8',   'completed': G3,
}
const STATUS_BG: Record<CheckStatus, string> = {
  'checked-in': hex2rgba(GL,0.14), 'late': hex2rgba(G4,0.14), 'absent': hex2rgba('#8B6840',0.26), 'completed': hex2rgba(G3,0.14),
}
const STATUS_BORDER: Record<CheckStatus, string> = {
  'checked-in': hex2rgba(GL,0.50), 'late': hex2rgba(G4,0.46), 'absent': hex2rgba('#8B6840',0.58), 'completed': hex2rgba(G3,0.50),
}
const STATUS_LABEL: Record<CheckStatus, string> = {
  'checked-in': 'Checked In', 'late': 'Late', 'absent': 'Absent', 'completed': 'Completed',
}

interface LivePromoter {
  id: string; name: string; job: string; venue: string
  city: string; status: CheckStatus; time: string; lat: number; lng: number
}

const MOCK_LIVE_PROMOTERS: LivePromoter[] = [
  { id:'P001', name:'Ayanda Dlamini',  job:'Castle Lager Launch',       venue:'Sandton City',              city:'Johannesburg', status:'checked-in', time:'08:12', lat:-26.1073, lng:28.0560 },
  { id:'P002', name:'Thabo Nkosi',     job:'MTN Brand Ambassador',       venue:'Maponya Mall, Soweto',      city:'Johannesburg', status:'checked-in', time:'08:05', lat:-26.2678, lng:27.8546 },
  { id:'P003', name:'Zanele Motha',    job:'Absolut Vodka Night',         venue:'Rosebank Mall',             city:'Johannesburg', status:'late',       time:'—',     lat:-26.1452, lng:28.0408 },
  { id:'P004', name:'Bongani Khumalo', job:"Nando's In-Store Tasting",   venue:'Fourways Mall',             city:'Johannesburg', status:'checked-in', time:'09:00', lat:-26.0154, lng:28.0103 },
  { id:'P005', name:'Sipho Mhlongo',   job:'Listerine Sampling',          venue:'Noord Taxi Rank',           city:'Johannesburg', status:'absent',     time:'—',     lat:-26.2008, lng:28.0436 },
  { id:'P006', name:'Lerato Mokoena',  job:'Distell Premium Wines',       venue:'Sandton Convention Centre', city:'Johannesburg', status:'completed',  time:'07:45', lat:-26.1076, lng:28.0567 },
  { id:'P007', name:'Marco van Wyk',   job:'Red Bull Sampling',           venue:'V&A Waterfront',            city:'Cape Town',    status:'checked-in', time:'08:30', lat:-33.9030, lng:18.4185 },
  { id:'P008', name:'Mia Louw',        job:'Woolworths Food Tasting',     venue:'Cavendish Square',          city:'Cape Town',    status:'checked-in', time:'08:22', lat:-33.9878, lng:18.4695 },
  { id:'P009', name:'Lungelo Mgqibi',  job:'Coca-Cola Spaza Activation',  venue:'Khayelitsha',               city:'Cape Town',    status:'late',       time:'—',     lat:-34.0350, lng:18.6732 },
  { id:'P010', name:'Chanel Botha',    job:'Vodacom Product Demo',        venue:'Canal Walk',                city:'Cape Town',    status:'completed',  time:'07:55', lat:-33.8668, lng:18.5102 },
  { id:'P011', name:'Nomsa Zulu',      job:"Jack Daniel's Whisky Night",  venue:'uShaka Marine World',       city:'Durban',       status:'checked-in', time:'08:10', lat:-29.8625, lng:31.0452 },
  { id:'P012', name:'Priya Naidoo',    job:'Dove Beauty Sampling',        venue:'Gateway Theatre',           city:'Durban',       status:'checked-in', time:'08:35', lat:-29.7280, lng:31.0670 },
  { id:'P013', name:'Sibusiso Vilak',  job:'Pick n Pay Smart Shopper',    venue:'Pavilion Centre',           city:'Durban',       status:'absent',     time:'—',     lat:-29.8728, lng:30.9648 },
  { id:'P014', name:'Ruan Kotze',      job:'FreshBrands In-Store',        venue:'Musgrave Centre',           city:'Durban',       status:'late',       time:'—',     lat:-29.8618, lng:31.0026 },
  { id:'P015', name:'Pieter Joubert',  job:'Menlyn Fashion Night',        venue:'Menlyn Mall',               city:'Pretoria',     status:'checked-in', time:'09:05', lat:-25.7823, lng:28.2773 },
  { id:'P016', name:'Andile Nxumalo',  job:'Hyundai Test Drive',          venue:'Menlyn Park',               city:'Pretoria',     status:'completed',  time:'07:50', lat:-25.7820, lng:28.2755 },
  { id:'P017', name:'Tebogo Radebe',   job:'Shoprite Easter Promos',      venue:'Woodlands Boulevard',       city:'Pretoria',     status:'checked-in', time:'08:48', lat:-25.8099, lng:28.2826 },
  { id:'P018', name:'Kagiso Motsepe',  job:'Standard Bank Career Expo',   venue:'Hatfield Plaza',            city:'Pretoria',     status:'absent',     time:'—',     lat:-25.7503, lng:28.2328 },
]

declare global { interface Window { google: any; initHGMap: () => void } }
const GMAP_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || ''
const MAP_ID   = 'hg-live-map'

function loadGoogleMaps(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.marker) { resolve(); return }
    if (document.getElementById('hg-gmaps-script')) {
      const iv = setInterval(() => { if (window.google?.maps?.marker) { clearInterval(iv); resolve() } }, 100); return
    }
    window.initHGMap = () => resolve()
    const s = document.createElement('script'); s.id = 'hg-gmaps-script'
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GMAP_KEY}&loading=async&callback=initHGMap`
    s.async = true; s.defer = true; s.onerror = () => reject(new Error('Google Maps failed to load'))
    document.head.appendChild(s)
  })
}

const MAP_STYLES = [
  { elementType:'geometry',                    stylers:[{ color:'#080602' }] },
  { elementType:'labels.text.stroke',          stylers:[{ color:'#080602' }] },
  { elementType:'labels.text.fill',            stylers:[{ color:'#8B5A1A' }] },
  { featureType:'administrative',              elementType:'geometry',           stylers:[{ color:'#1A1205' }] },
  { featureType:'administrative.country',      elementType:'labels.text.fill',   stylers:[{ color:'#C07818' }] },
  { featureType:'administrative.province',     elementType:'labels.text.fill',   stylers:[{ color:'#8B5A1A' }] },
  { featureType:'administrative.locality',     elementType:'labels.text.fill',   stylers:[{ color:'#D4880A' }] },
  { featureType:'landscape',                   stylers:[{ color:'#0C0903' }] },
  { featureType:'landscape.natural',           stylers:[{ color:'#0A0702' }] },
  { featureType:'poi',                         stylers:[{ visibility:'off' }] },
  { featureType:'road',                        elementType:'geometry',           stylers:[{ color:'#1C1508' }] },
  { featureType:'road',                        elementType:'geometry.stroke',    stylers:[{ color:'#100C04' }] },
  { featureType:'road',                        elementType:'labels.text.fill',   stylers:[{ color:'#6B4A14' }] },
  { featureType:'road.local',                  elementType:'labels',             stylers:[{ visibility:'off' }] },
  { featureType:'road.highway',                elementType:'geometry',           stylers:[{ color:'#2A1E08' }] },
  { featureType:'road.highway',                elementType:'geometry.stroke',    stylers:[{ color:'#1A1304' }] },
  { featureType:'road.highway',                elementType:'labels.text.fill',   stylers:[{ color:'#E8A820' }] },
  { featureType:'road.highway',                elementType:'labels.text.stroke', stylers:[{ color:'#080602' }] },
  { featureType:'transit',                     stylers:[{ visibility:'off' }] },
  { featureType:'water',                       elementType:'geometry',           stylers:[{ color:'#040301' }] },
  { featureType:'water',                       elementType:'labels.text.fill',   stylers:[{ color:'#2A1A05' }] },
  { featureType:'administrative.country',      elementType:'geometry.stroke',    stylers:[{ color:'#3D2A0A' }] },
  { featureType:'administrative.province',     elementType:'geometry.stroke',    stylers:[{ color:'#2A1C06' }] },
]

function makePinElement(color: string): HTMLElement {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36"><path d="M14 0C6.27 0 0 6.27 0 14c0 9.63 14 22 14 22S28 23.63 28 14C28 6.27 21.73 0 14 0z" fill="${color}" stroke="#0C0A07" stroke-width="1.5"/><circle cx="14" cy="14" r="5" fill="#0C0A07" opacity="0.6"/></svg>`
  const div = document.createElement('div'); div.innerHTML = svg.trim(); div.style.cursor = 'pointer'; return div
}

function StatusBadge({ status }: { status: CheckStatus }) {
  return (
    <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', fontFamily:FD, color:STATUS_COLOR[status], background:STATUS_BG[status], border:`1px solid ${STATUS_BORDER[status]}`, padding:'3px 9px', borderRadius:3, whiteSpace:'nowrap', flexShrink:0 }}>
      {STATUS_LABEL[status]}
    </span>
  )
}

export default function ViewLiveMap() {
  const mapRef        = useRef<HTMLDivElement>(null)
  const mapInstance   = useRef<any>(null)
  const markersRef    = useRef<Map<string, any>>(new Map())
  const infoWindowRef = useRef<any>(null)

  const [promoters,    setPromoters   ] = useState<LivePromoter[]>(MOCK_LIVE_PROMOTERS)
  const [selected,     setSelected    ] = useState<LivePromoter | null>(null)
  const [filterStatus, setFilterStatus] = useState<CheckStatus | 'all'>('all')
  const [filterCity,   setFilterCity  ] = useState<string>('all')
  const [mapReady,     setMapReady    ] = useState(false)
  const [mapError,     setMapError    ] = useState('')
  const [lastUpdated,  setLastUpdated ] = useState<Date>(new Date())
  const [pulse,        setPulse       ] = useState(true)

  useEffect(() => { const t = setInterval(() => setPulse(p => !p), 1500); return () => clearInterval(t) }, [])

  const loadPromoters = useCallback(async () => {
    try {
      const token = localStorage.getItem('hg_token')
      if (!token) { setLastUpdated(new Date()); return }

      // Fetch both all shifts (for status/names) and live locations (liveLat/liveLng from DB)
      const [shiftsRes, locRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL||'http://localhost:5000/api'}/shifts/all`, { headers:{ Authorization:`Bearer ${token}` } }),
        fetch(`${import.meta.env.VITE_API_URL||'http://localhost:5000/api'}/shifts/live-locations`, { headers:{ Authorization:`Bearer ${token}` } }),
      ])
      if (!shiftsRes.ok) { setLastUpdated(new Date()); return }

      const shifts: any[] = await shiftsRes.json()
      // liveLocations comes from DB: shift.liveLat / shift.liveLng updated by promoter device
      const liveLocations: any[] = locRes.ok ? await locRes.json() : []

      // Build lookup by userId (promoterId) — the DB live location record
      const locByUser = new Map(liveLocations.map((l: any) => [l.userId, l]))

      const todayStart = new Date(); todayStart.setHours(0,0,0,0)
      const today = shifts.filter((s: any) => {
        const d = s.job?.date ? new Date(s.job.date) : null
        return d && d >= todayStart
      })
      if (!today.length) { setLastUpdated(new Date()); return }

      const result: LivePromoter[] = today.map((s: any) => {
        const raw = s.status?.toLowerCase() || ''
        let st: CheckStatus = 'absent'
        if (raw==='checked_in'||raw==='checked-in') st = 'checked-in'
        else if (raw==='approved'||raw==='pending_approval') st = 'completed'
        else if (raw==='scheduled') {
          const d = s.job?.date ? new Date(s.job.date) : null
          const [h, m] = (s.job?.startTime||'09:00').split(':').map(Number)
          if (d) { const start = new Date(d); start.setHours(h,m,0,0); st = Date.now()-start.getTime() > 15*60*1000 ? 'late' : 'absent' }
        }

        // Priority: 1) real-time liveLat/liveLng from DB (promoter device ping)
        //           2) checkInLat/checkInLng (recorded at check-in)
        //           3) job venue lat/lng (static fallback — shows job location, not promoter)
        const live = locByUser.get(s.promoterId)
        const lat  = live?.lat ?? s.checkInLat ?? s.job?.lat ?? -26.2041
        const lng  = live?.lng ?? s.checkInLng ?? s.job?.lng ?? 28.0473

        return {
          id:     s.promoterId,
          name:   s.promoter?.fullName || 'Unknown',
          job:    s.job?.title         || 'Unknown Job',
          venue:  s.job?.venue         || 'Unknown Venue',
          city:   s.job?.city          || s.job?.address?.split(',')[0] || '',
          status: st,
          time:   s.checkInTime ? new Date(s.checkInTime).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'}) : '—',
          lat,
          lng,
        }
      })
      setPromoters(result)
      setLastUpdated(new Date())
    } catch { setLastUpdated(new Date()) }
  }, [])

  // Poll every 15 seconds for live location updates from the database
  useEffect(() => {
    loadPromoters()
    const iv = setInterval(loadPromoters, 15_000)
    return () => clearInterval(iv)
  }, [loadPromoters])

  useEffect(() => {
    if (!mapRef.current) return
    loadGoogleMaps().then(() => {
      if (!mapRef.current || mapInstance.current) return
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: {lat:-28.7, lng:25.5},
        zoom: 6,
        styles: MAP_STYLES,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        backgroundColor: '#080602',
      })
      infoWindowRef.current = new window.google.maps.InfoWindow(); setMapReady(true)
    }).catch(() => setMapError('Google Maps unavailable — check VITE_GOOGLE_MAPS_KEY'))
  }, [])

  useEffect(() => {
    if (!mapReady || !mapInstance.current) return
    const vis = promoters.filter(p => (filterStatus==='all'||p.status===filterStatus)&&(filterCity==='all'||p.city===filterCity))
    const visIds = new Set(vis.map(p => p.id))
    markersRef.current.forEach((m,id) => { if (!visIds.has(id)) { m.setMap(null); markersRef.current.delete(id) } })
    vis.forEach(p => {
      const color = STATUS_COLOR[p.status]
      const svgIcon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36"><path d="M14 0C6.27 0 0 6.27 0 14c0 9.63 14 22 14 22S28 23.63 28 14C28 6.27 21.73 0 14 0z" fill="${color}" stroke="#080602" stroke-width="1.5"/><circle cx="14" cy="14" r="5" fill="#080602" opacity="0.7"/></svg>`)}`,
        scaledSize: new window.google.maps.Size(28, 36),
        anchor: new window.google.maps.Point(14, 36),
      }
      if (markersRef.current.has(p.id)) {
        const mk = markersRef.current.get(p.id)
        mk.setPosition({ lat: p.lat, lng: p.lng })
        mk.setIcon(svgIcon)
      } else {
        const mk = new window.google.maps.Marker({
          position: { lat: p.lat, lng: p.lng },
          map: mapInstance.current,
          title: p.name,
          icon: svgIcon,
        })
        mk.addListener('click', () => {
          setSelected(p)
          infoWindowRef.current?.setContent(`<div style="background:#0C0A06;color:#FAF3E8;padding:10px 14px;font-family:'DM Sans',sans-serif;min-width:170px;border-radius:4px;border:1px solid rgba(212,136,10,0.3);"><div style="font-weight:700;font-size:13px;margin-bottom:4px;">${p.name}</div><div style="font-size:11px;color:#D4880A;margin-bottom:2px;">${p.venue}</div><div style="font-size:10px;color:rgba(250,243,232,0.72);">${p.job}</div><div style="font-size:10px;margin-top:6px;color:${color};font-weight:600;">${STATUS_LABEL[p.status]}${p.time!=='—'?' · In at '+p.time:''}</div></div>`)
          infoWindowRef.current?.open({ map: mapInstance.current, anchor: mk })
        })
        markersRef.current.set(p.id, mk)
      }
    })
  }, [promoters, filterStatus, filterCity, mapReady])

  const filtered = promoters.filter(p => (filterStatus==='all'||p.status===filterStatus)&&(filterCity==='all'||p.city===filterCity))
  const counts = { all:promoters.length, 'checked-in':promoters.filter(p=>p.status==='checked-in').length, 'late':promoters.filter(p=>p.status==='late').length, 'absent':promoters.filter(p=>p.status==='absent').length, 'completed':promoters.filter(p=>p.status==='completed').length }
  const cities = ['all', ...Array.from(new Set(promoters.map(p => p.city))).sort()]

  const [showAll, setShowAll] = useState(false)
  const PREVIEW = 6

  const panTo = (p: LivePromoter) => {
    setSelected(prev => prev?.id===p.id ? null : p)
    if (mapReady && mapInstance.current) {
      mapInstance.current.panTo({lat:p.lat,lng:p.lng})
      mapInstance.current.setZoom(14)
      const mk = markersRef.current.get(p.id)
      if (mk) window.google.maps.event.trigger(mk, 'click')
    }
  }

  return (
    <AdminLayout>
      <div style={{ padding:'40px 48px', background:D1, minHeight:'100%' }}>

        {/* ── HEADER ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:36 }}>
          <div>
            <div style={{ fontSize:9, letterSpacing:'0.38em', textTransform:'uppercase', color:GL, marginBottom:10, fontWeight:700, fontFamily:FD }}>Operations · Live</div>
            <h1 style={{ fontFamily:FD, fontSize:30, fontWeight:700, color:W, marginBottom:8 }}>Live Operations Map</h1>
            <p style={{ fontSize:13, color:WM, fontFamily:FD }}>{promoters.length} promoters on shift today.</p>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:GL, opacity:pulse?1:0.2, transition:'opacity 0.5s' }} />
              <span style={{ fontSize:11, color:WM, fontFamily:FD }}>Live · {lastUpdated.toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'})}</span>
            </div>
            <button onClick={loadPromoters} style={{ fontSize:10, color:GL, background:'none', border:`1px solid ${BB}`, padding:'6px 14px', cursor:'pointer', fontFamily:FD, borderRadius:3 }}>↻ Refresh</button>
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:1, background:BB, marginBottom:32 }}>
          {([
            { key:'all',        label:'Total',      color:GL },
            { key:'checked-in', label:'Checked In', color:GL },
            { key:'late',       label:'Late',       color:G4 },
            { key:'absent',     label:'Absent',     color:'#E8D5A8' },
            { key:'completed',  label:'Done',       color:G3 },
          ] as const).map(s => {
            const cnt = s.key === 'all' ? counts.all : counts[s.key as CheckStatus]
            const active = filterStatus === s.key
            return (
              <div key={s.key}
                onClick={() => setFilterStatus(active && s.key !== 'all' ? 'all' : s.key as any)}
                style={{ background:active?hex2rgba(s.color,0.10):D2, padding:'16px 20px', position:'relative', overflow:'hidden', cursor:'pointer', transition:'all 0.2s', border:`1px solid ${active?s.color:BB}` }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${s.color},${hex2rgba(s.color,0.3)})` }} />
                <div style={{ fontFamily:FD, fontSize:28, fontWeight:700, color:active?s.color:W, lineHeight:1 }}>{cnt}</div>
                <div style={{ fontSize:9, color:active?s.color:WD, marginTop:6, letterSpacing:'0.18em', textTransform:'uppercase', fontFamily:FD }}>{s.label}</div>
              </div>
            )
          })}
        </div>

        {/* ── MAP — full width ── */}
        <div style={{ background:D2, border:`1px solid ${BB}`, position:'relative', overflow:'hidden', borderRadius:4, height:460, marginBottom:20 }}>
          <div style={{ position:'absolute', top:14, left:14, zIndex:10, display:'flex', gap:6, flexWrap:'wrap' }}>
            {(['all','checked-in','late','absent','completed'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                style={{ padding:'5px 12px', background:filterStatus===s?hex2rgba((STATUS_COLOR[s as CheckStatus]||GL),0.22):'rgba(12,10,7,0.88)', border:`1px solid ${filterStatus===s?(STATUS_COLOR[s as CheckStatus]||GL):'rgba(212,136,10,0.22)'}`, color:filterStatus===s?(STATUS_COLOR[s as CheckStatus]||GL):WM, fontFamily:FD, fontSize:10, cursor:'pointer', letterSpacing:'0.08em', borderRadius:3 }}>
                {s==='all' ? 'All' : STATUS_LABEL[s as CheckStatus]}
              </button>
            ))}
          </div>
          <div style={{ position:'absolute', top:52, left:14, zIndex:10, display:'flex', gap:6, flexWrap:'wrap' }}>
            {cities.map(c => (
              <button key={c} onClick={() => setFilterCity(c)}
                style={{ padding:'4px 10px', background:filterCity===c?hex2rgba(G2,0.45):'rgba(12,10,7,0.88)', border:`1px solid ${filterCity===c?G2:'rgba(212,136,10,0.18)'}`, color:filterCity===c?GL:WM, fontFamily:FD, fontSize:9, cursor:'pointer', letterSpacing:'0.06em', borderRadius:3 }}>
                {c==='all' ? 'All Cities' : c}
              </button>
            ))}
          </div>
          <div ref={mapRef} style={{ width:'100%', height:'100%' }} />
          {mapError && (
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:D2, gap:12 }}>
              <div style={{ fontSize:28 }}>🗺</div>
              <div style={{ fontSize:13, color:WM, fontFamily:FD, textAlign:'center', maxWidth:300, lineHeight:1.6 }}>{mapError}</div>
              <div style={{ fontSize:10, color:WD, fontFamily:FD }}>Add VITE_GOOGLE_MAPS_KEY to your .env and restart</div>
            </div>
          )}
          <div style={{ position:'absolute', bottom:14, left:14, background:'rgba(10,8,4,0.92)', border:`1px solid ${BB}`, padding:'8px 14px', display:'flex', gap:14, borderRadius:3, zIndex:5 }}>
            {(Object.keys(STATUS_COLOR) as CheckStatus[]).map(s => (
              <div key={s} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:STATUS_COLOR[s], flexShrink:0 }} />
                <span style={{ fontSize:10, color:WM, letterSpacing:'0.05em', fontFamily:FD, whiteSpace:'nowrap' }}>{STATUS_LABEL[s]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── PROMOTER GRID — below map ── */}
        <div style={{ background:D2, border:`1px solid ${BB}`, borderRadius:4, overflow:'hidden' }}>
          <div style={{ padding:'16px 20px 14px', borderBottom:`1px solid ${BB}`, background:D1, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:9, letterSpacing:'0.25em', textTransform:'uppercase', color:GL, fontWeight:700, fontFamily:FD }}>Active Promoters</div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ fontSize:11, color:WD, fontFamily:FD }}>{filtered.length} showing</div>
              {selected && (
                <button onClick={() => setSelected(null)} style={{ fontSize:10, color:WD, background:'none', border:`1px solid ${BB}`, padding:'3px 10px', cursor:'pointer', fontFamily:FD, borderRadius:3 }}>
                  ✕ Clear
                </button>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding:40, textAlign:'center', color:WD, fontSize:13, fontFamily:FD }}>No promoters match this filter.</div>
          ) : (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:1, background:BB }}>
                {(showAll ? filtered : filtered.slice(0, PREVIEW)).map(p => (
                  <div key={p.id} onClick={() => panTo(p)}
                    style={{ background:selected?.id===p.id?hex2rgba(GL,0.08):D2, padding:'14px 20px', cursor:'pointer', transition:'background 0.18s', borderTop:`2px solid ${selected?.id===p.id?STATUS_COLOR[p.status]:'transparent'}` }}
                    onMouseEnter={e => { if (selected?.id!==p.id) (e.currentTarget as HTMLElement).style.background=BB2 }}
                    onMouseLeave={e => { if (selected?.id!==p.id) (e.currentTarget as HTMLElement).style.background=D2 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                      <div style={{ minWidth:0, flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:W, fontFamily:FD, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize:11, color:WM, marginTop:3, fontFamily:FD, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.venue}</div>
                        <div style={{ fontSize:10, color:WD, marginTop:2, fontFamily:FD, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.job}</div>
                        <div style={{ fontSize:9, color:WD, marginTop:3, fontFamily:FD, letterSpacing:'0.1em', textTransform:'uppercase' }}>{p.city}</div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <StatusBadge status={p.status} />
                        {p.time !== '—' && <div style={{ fontSize:10, color:WD, marginTop:6, fontFamily:FD }}>In at <span style={{ color:GL, fontWeight:600 }}>{p.time}</span></div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filtered.length > PREVIEW && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'16px 28px', gap:16, borderTop:`1px solid ${BB}`, background:D1 }}>
                  <div style={{ height:1, flex:1, background:`linear-gradient(90deg,transparent,${BB})` }} />
                  <button onClick={() => setShowAll(v => !v)}
                    style={{ fontSize:10, fontFamily:FD, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', color:GL, background:hex2rgba(GL,0.08), border:`1px solid ${hex2rgba(GL,0.35)}`, padding:'9px 24px', cursor:'pointer', borderRadius:3, whiteSpace:'nowrap' }}
                    onMouseEnter={e => { e.currentTarget.style.background=hex2rgba(GL,0.16); e.currentTarget.style.borderColor=GL }}
                    onMouseLeave={e => { e.currentTarget.style.background=hex2rgba(GL,0.08); e.currentTarget.style.borderColor=hex2rgba(GL,0.35) }}>
                    {showAll ? `↑ Show Less` : `↓ Show More (${filtered.length - PREVIEW} more)`}
                  </button>
                  <div style={{ height:1, flex:1, background:`linear-gradient(90deg,${BB},transparent)` }} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}