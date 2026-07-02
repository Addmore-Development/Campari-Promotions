// ── Activation Report types ─────────────────────────────────────────────────
// One report per Job ("activation"), filled in by the on-site supervisor so
// admins can auto-generate a client report: serves/conversions, insights,
// feedback, and a required 3-shot photo set.

export type ShotKey = 'shotSetup' | 'shotMidEvent' | 'shotClose'

export interface ShotDef {
  key: ShotKey
  label: string
  hint: string
}

export const REQUIRED_SHOTS: ShotDef[] = [
  { key: 'shotSetup',    label: 'Setup',      hint: 'Stand/table fully set up, before doors open' },
  { key: 'shotMidEvent', label: 'Mid-Event',  hint: 'Activation in action with consumers present' },
  { key: 'shotClose',    label: 'Close-Out',  hint: 'Breakdown / stock remaining at end of shift' },
]

export interface ActivationReport {
  id: string
  jobId: string
  submittedBy: string
  unitsServed: number
  conversions: number
  insights: string | null
  feedback: string | null
  shotSetupUrl: string | null
  shotMidEventUrl: string | null
  shotCloseUrl: string | null
  status: 'draft' | 'submitted'
  submittedAt: string | null
  createdAt: string
  updatedAt: string
  job?: { id: string; title: string; client: string; brand: string; venue: string; date: string; city?: string }
  reporter?: { id: string; fullName: string; email: string }
}

export interface ActivationReportDraft {
  unitsServed: string
  conversions: string
  insights: string
  feedback: string
}
