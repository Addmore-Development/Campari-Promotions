// frontend/src/App.tsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider }             from './shared/context/AuthContext'
import ProtectedRoute               from './shared/routes/ProtectedRoute'
import LandingPage                  from './shared/auth/LandingPage'
import LoginPage                    from './shared/auth/LoginPage'
import RegisterPage                 from './shared/auth/RegisterPage'
import AboutPage                    from './shared/auth/AboutPage'
import AdminDashboard               from './Admin/dashboard/adminDashboard'
import FullCRUDUsers                from './Admin/users/FullCRUDUsers'
import CRUDJobsLogic                from './Admin/jobs/CRUDJobsLogic'
import ViewLiveMap                  from './Admin/shifts/ViewLiveMap'
import ApproveExport                from './Admin/payments/ApproveExport'
import ReviewApproveDocs            from './Admin/onboarding/ReviewApproveDocs'
import ReviewsAndComplaintsPage     from './Admin/reviews/ReviewsandComplaintsPage'
import { PromoterApp }              from './promoter/index'
import PendingApprovalPage          from './promoter/PendingApprovalPage'
import JobDetailPage                from './shared/jobs/JobdetailPage'
import BusinessLayout               from './Business/BusinessLayout'
import BusinessDashboard            from './Business/Businessdashboard'
import BusinessJobs                 from './Business/Businessjobs'
import BusinessTracking             from './Business/Businesstracking'
import BusinessPayroll              from './Business/Businesspayroll'
import JobsPage                     from './shared/jobs/JobsPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── Public ── */}
          <Route path="/"         element={<LandingPage />}  />
          <Route path="/login"    element={<LoginPage />}    />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/about"    element={<AboutPage />}    />

          {/* ── Jobs public browse ── */}
          <Route path="/jobs"        element={<JobsPage />}      />
          <Route path="/jobs/:jobId" element={<JobDetailPage />} />

          {/* ── Promoter pending approval gate (public — shown before approval) ── */}
          <Route path="/promoter/pending" element={<PendingApprovalPage />} />

          {/* ── Promoter portal — protected ── */}
          <Route element={<ProtectedRoute allowedRoles={['promoter']} />}>
            <Route path="/promoter/"  element={<PromoterApp />} />
            <Route path="/promoter"   element={<Navigate to="/promoter/" replace />} />
          </Route>

          {/* ── Admin — protected ── */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin"             element={<AdminDashboard />}           />
            <Route path="/admin/users"       element={<FullCRUDUsers />}            />
            <Route path="/admin/jobs"        element={<CRUDJobsLogic />}            />
            <Route path="/admin/map"         element={<ViewLiveMap />}              />
            <Route path="/admin/payments"    element={<ApproveExport />}            />
            <Route path="/admin/onboarding"  element={<ReviewApproveDocs />}        />
            <Route path="/admin/reviews"     element={<ReviewsAndComplaintsPage />} />
          </Route>

          {/* ── Business — protected ── */}
          <Route element={<ProtectedRoute allowedRoles={['business']} />}>
            <Route path="/business" element={<BusinessLayout />}>
              <Route index            element={<Navigate to="/business/dashboard" replace />} />
              <Route path="dashboard" element={<BusinessDashboard />} />
              <Route path="jobs"      element={<BusinessJobs />}      />
              <Route path="tracking"  element={<BusinessTracking />}  />
              <Route path="payroll"   element={<BusinessPayroll />}   />
            </Route>
          </Route>

          {/* ── Fallback ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}