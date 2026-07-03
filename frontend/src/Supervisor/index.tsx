// Supervisor/index.tsx
// Supervisor portal shell — single route /supervisor/ with ?tab= navigation.
// Mirrors the promoter portal pattern (promoter/index.tsx).

import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SupervisorLayout } from './SupervisorLayout'
import { SupervisorDashboard } from './dashboard/supervisorDashboard'
import { SupervisorActivations } from './activations/SupervisorActivations'
import { SupervisorFileReport } from './reports/SupervisorFileReport'
import { SupervisorReportsTab } from './reports/SupervisorReportsTab'
import { SupervisorProfile } from './profile/SupervisorProfile'
import { useAuth } from '../shared/hooks/useAuth'

export const SupervisorApp: React.FC = () => {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'dashboard'

  if (isLoading || !user) return null

  // NOTE: uses `jobId` (not `job`) so it matches what SubmitActivationReport
  // and SupervisorFileReport read from the URL.
  const goTo = (view: string, jobId?: string) =>
    navigate(`/supervisor/?tab=${view}${jobId ? `&jobId=${jobId}` : ''}`)

  return (
    <SupervisorLayout>
      {tab === 'dashboard'         && <SupervisorDashboard onNavigate={goTo} />}
      {tab === 'activations'       && <SupervisorActivations onNavigate={goTo} />}
      {tab === 'activation-report' && <SupervisorFileReport />}
      {tab === 'reports'           && <SupervisorReportsTab />}
      {tab === 'profile'           && <SupervisorProfile />}
    </SupervisorLayout>
  )
}

export default SupervisorApp