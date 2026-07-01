export interface Shift {
  id:        string
  checkIn:   string       // ISO datetime
  checkOut?: string       // ISO datetime — undefined means still working
}

export interface Applicant {
  email:     string
  fullName:  string
  phone?:    string
  idNumber?: string
  shifts:    Shift[]
  joinedAt:  string
}

export interface Job {
  id:              string
  businessEmail:   string
  title:           string
  promotersNeeded: number
  location:        string
  terms:           string
  ratePerHour:     number
  startDate?:      string   // ISO date string — optional for backwards compat
  endDate:         string   // ISO date string
  status:          'active' | 'cancelled'
  createdAt:       string
  applicants:      Applicant[]
}

const KEY = 'hg_jobs'

// ─── CRUD helpers ─────────────────────────────────────────────────────────────

export function getAllJobs(): Job[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as Job[]
  } catch {
    return []
  }
}

export function saveAllJobs(jobs: Job[]): void {
  localStorage.setItem(KEY, JSON.stringify(jobs))
  // Broadcast so other business portal tabs and BusinessDashboard react
  window.dispatchEvent(new Event('storage'))
}

export function getBusinessJobs(businessEmail: string): Job[] {
  return getAllJobs().filter(j => j.businessEmail === businessEmail)
}

export function getJobById(id: string): Job | undefined {
  return getAllJobs().find(j => j.id === id)
}

export function upsertJob(job: Job): void {
  const all = getAllJobs()
  const idx = all.findIndex(j => j.id === job.id)
  if (idx >= 0) {
    all[idx] = job
  } else {
    all.push(job)
  }
  saveAllJobs(all)
}

export function deleteJob(id: string): void {
  saveAllJobs(getAllJobs().filter(j => j.id !== id))
}

// ─── Shift calculations ───────────────────────────────────────────────────────

/** Total completed hours across all shifts for an applicant */
export function calcHours(shifts: Shift[]): number {
  return shifts
    .filter(s => s.checkOut)
    .reduce((acc, s) => {
      return acc + (new Date(s.checkOut!).getTime() - new Date(s.checkIn).getTime()) / 3600000
    }, 0)
}

/** Total payout for an applicant based on completed shifts */
export function calcPayout(shifts: Shift[], ratePerHour: number): number {
  return calcHours(shifts) * ratePerHour
}

/** Hours worked in the current active (unchecked-out) shift, if any */
export function calcLiveHours(shifts: Shift[]): number {
  const activeShift = shifts.find(s => !s.checkOut)
  if (!activeShift) return 0
  return (Date.now() - new Date(activeShift.checkIn).getTime()) / 3600000
}

/** Total payout including ongoing live shift */
export function calcLivePayout(shifts: Shift[], ratePerHour: number): number {
  return (calcHours(shifts) + calcLiveHours(shifts)) * ratePerHour
}

// ─── Applicant helpers ────────────────────────────────────────────────────────

/** Add or update an applicant on a job */
export function upsertApplicant(jobId: string, applicant: Applicant): void {
  const all = getAllJobs()
  const job = all.find(j => j.id === jobId)
  if (!job) return
  const idx = job.applicants.findIndex(a => a.email === applicant.email)
  if (idx >= 0) {
    job.applicants[idx] = applicant
  } else {
    job.applicants.push(applicant)
  }
  saveAllJobs(all)
}

/** Add a check-in shift for an applicant */
export function checkInApplicant(jobId: string, email: string): void {
  const all = getAllJobs()
  const job = all.find(j => j.id === jobId)
  if (!job) return
  const applicant = job.applicants.find(a => a.email === email)
  if (!applicant) return
  // Don't allow double check-in
  if (applicant.shifts.some(s => !s.checkOut)) return
  applicant.shifts.push({ id: `s-${Date.now()}`, checkIn: new Date().toISOString() })
  saveAllJobs(all)
}

/** Check out the active shift for an applicant */
export function checkOutApplicant(jobId: string, email: string): void {
  const all = getAllJobs()
  const job = all.find(j => j.id === jobId)
  if (!job) return
  const applicant = job.applicants.find(a => a.email === email)
  if (!applicant) return
  const activeShift = applicant.shifts.find(s => !s.checkOut)
  if (activeShift) activeShift.checkOut = new Date().toISOString()
  saveAllJobs(all)
}

// ─── Demo seed ────────────────────────────────────────────────────────────────

/**
 * Seeds mock promoter applicants onto empty active jobs for a given business.
 * Useful for demo / onboarding screens.
 */
export function seedMockApplicants(businessEmail: string): void {
  const all     = getAllJobs()
  const bizJobs = all.filter(
    j => j.businessEmail === businessEmail &&
         j.applicants.length === 0 &&
         j.status === 'active'
  )
  if (bizJobs.length === 0) return

  const mockPromoters: Omit<Applicant, 'shifts' | 'joinedAt'>[] = [
    { email: 'ayanda@promo.co.za',  fullName: 'Ayanda Dlamini',  phone: '+27711234567', idNumber: '9501015009087' },
    { email: 'sipho@promo.co.za',   fullName: 'Sipho Nkosi',     phone: '+27829876543', idNumber: '9203025008083' },
    { email: 'lerato@promo.co.za',  fullName: 'Lerato Mokoena',  phone: '+27613334455', idNumber: '9807060009081' },
  ]

  const now             = new Date()
  const twoHoursAgo     = new Date(now.getTime() - 2 * 3600000).toISOString()
  const oneHourAgo      = new Date(now.getTime() - 1 * 3600000).toISOString()
  const thirtyMinsAgo   = new Date(now.getTime() - 0.5 * 3600000).toISOString()

  bizJobs.forEach((job, ji) => {
    job.applicants = mockPromoters
      .slice(0, Math.min(2, job.promotersNeeded))
      .map((p, pi) => ({
        ...p,
        joinedAt: new Date(Date.now() - (ji + pi) * 3600000 * 24).toISOString(),
        shifts: pi === 0
          ? [
              { id: `s-${Date.now()}-1`, checkIn: twoHoursAgo,   checkOut: oneHourAgo     },
              { id: `s-${Date.now()}-2`, checkIn: thirtyMinsAgo                            },
            ]
          : [
              { id: `s-${Date.now()}-3`, checkIn: oneHourAgo,    checkOut: thirtyMinsAgo  },
            ],
      }))
  })

  saveAllJobs(all)
}