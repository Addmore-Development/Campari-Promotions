// promoter/index.tsx
// Promoter portal shell — single route /promoter/ with ?tab= navigation.
// Reads onboarding status from session (synchronous, no flicker).
// Only blacklisted accounts are hard-locked; others see an informational banner.

import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PromoterLayout } from './PromoterLayout'
import { Dashboard }      from './dashboard/dashboard'
import { ViewAcceptJobs } from './jobs/ViewAcceptJobs'
import { GeoCheckInOut }  from './shifts/GeoCheckInOut'
import { ViewEarnings }   from './payments/ViewEarnings'
import { EditOwnProfile } from './users/EditOwnProfile'
import { useAuth }        from '../shared/hooks/useAuth'

const CORAL = '#C4614A'
const GL    = '#E8A820'
const G     = '#D4880A'

function getSessionStatus(): string {
  try {
    const sess = JSON.parse(localStorage.getItem('hg_session') || '{}')
    return sess.onboardingStatus || sess.status || 'pending_review'
  } catch {
    return 'pending_review'
  }
}

const BANNER: Record<string, { msg: string; color: string }> = {
  pending_review: {
    msg: '⏳ Your application is under review. You\'ll be notified within 24–48 hours.',
    color: GL,
  },
  documents_submitted: {
    msg: '📋 Documents submitted — admin review in progress.',
    color: GL,
  },
  rejected: {
    msg: '❌ Your application was not approved. Contact support or update your documents.',
    color: CORAL,
  },
  incomplete: {
    msg: '📝 Your profile is incomplete. Please update your details.',
    color: GL,
  },
}

export const PromoterApp: React.FC = () => {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'dashboard'
  const [status, setStatus] = useState<string>(() => getSessionStatus())

  useEffect(() => {
    if (!isLoading && !user) navigate('/login', { replace: true })
  }, [user, isLoading, navigate])

  useEffect(() => {
    setStatus(getSessionStatus())
  }, [user?.id])

  if (isLoading || !user) return null

  const isBlacklisted = status === 'blacklisted'
  const banner = !isBlacklisted ? BANNER[status] : null

  return (
    <PromoterLayout>
      {/* Informational banner — never blocks access */}
      {banner && (
        <div style={{
          padding: '12px 48px',
          background: `rgba(212,136,10,0.06)`,
          borderBottom: `1px solid rgba(212,136,10,0.2)`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: banner.color }}>
            {banner.msg}
          </span>
          <span
            onClick={() => navigate('/promoter/?tab=profile')}
            style={{ color: 'rgba(250,243,232,0.28)', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}
          >
            View profile →
          </span>
        </div>
      )}

      {/* Blacklisted — hard block */}
      {isBlacklisted && (
        <div style={{
          margin: '32px 48px',
          padding: '28px',
          background: `${CORAL}0f`,
          border: `1px solid ${CORAL}44`,
          borderRadius: 2,
          textAlign: 'center',
        }}>
          <p style={{ color: CORAL, fontSize: 15, fontWeight: 700, margin: 0 }}>
            🚫 Your account has been suspended. Please contact support at support@honeygroup.co.za
          </p>
        </div>
      )}

      {tab === 'dashboard' && <Dashboard onNavigate={view => navigate(`/promoter/?tab=${view}`)} />}
      {tab === 'jobs'      && <ViewAcceptJobs />}
      {tab === 'shifts'    && <GeoCheckInOut />}
      {tab === 'earnings'  && <ViewEarnings />}
      {tab === 'profile'   && <EditOwnProfile />}
    </PromoterLayout>
  )
}