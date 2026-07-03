// Supervisor/index.tsx
// Supervisor portal shell — single route /supervisor/ with ?tab= navigation.
// Mirrors the promoter portal pattern (promoter/index.tsx).

import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SupervisorLayout } from './SupervisorLayout'
import { SupervisorDashboard } from './dashboard/supervisorDashboard'
import { useAuth } from '../shared/hooks/useAuth'

// TODO: build these out — stubbed for now so the portal doesn't 404.
// Follow the same file pattern as promoter/jobs, promoter/activation, promoter/users.
const ActivationsPlaceholder: React.FC = () => (
  <div style={{ padding: '40px 36px', color: 'rgba(248,248,248,0.5)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
    Activations list view — coming soon.
  </div>
)
const ActivationReportPlaceholder: React.FC = () => (
  <div style={{ padding: '40px 36px', color: 'rgba(248,248,248,0.5)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
    File report view — coming soon. Can likely reuse promoter/activation/SubmitActivationReport
    since the backend route (/api/activation-reports/job/:jobId) already accepts promoter + supervisor.
  </div>
)
const ProfilePlaceholder: React.FC = () => (
  <div style={{ padding: '40px 36px', color: 'rgba(248,248,248,0.5)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
    My profile view — coming soon.
  </div>
)

export const SupervisorApp: React.FC = () => {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'dashboard'

  if (isLoading || !user) return null

  return (
    <SupervisorLayout>
      {tab === 'dashboard' && (
        <SupervisorDashboard onNavigate={(view: string, jobId?: string) => navigate(`/supervisor/?tab=${view}${jobId ? `&job=${jobId}` : ''}`)} />
      )}
      {tab === 'activations'       && <ActivationsPlaceholder />}
      {tab === 'activation-report' && <ActivationReportPlaceholder />}
      {tab === 'profile'           && <ProfilePlaceholder />}
    </SupervisorLayout>
  )
}

export default SupervisorApp