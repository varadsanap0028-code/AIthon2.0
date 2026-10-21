import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PublicLayout } from './layouts/PublicLayout';
import { StudentLayout } from './layouts/StudentLayout';
import { RecruiterLayout } from './layouts/RecruiterLayout';
import { CollegeLayout } from './layouts/CollegeLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { RequireRole } from './components/admin/RequireRole';
import { FloatingChatbot } from './components/chat/FloatingChatbot';

// Public pages
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/public/LoginPage';
import { SignupPage } from './pages/public/SignupPage';
import { ForgotPasswordPage } from './pages/public/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/public/ResetPasswordPage';

// Student pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { AssessmentPage } from './pages/student/AssessmentPage';
import { SkillGapPage } from './pages/student/SkillGapPage';
import { RoadmapPage } from './pages/student/RoadmapPage';
import { ProjectsPage } from './pages/student/ProjectsPage';
import { OpportunitiesPage } from './pages/student/OpportunitiesPage';
import { SkillPassportPage } from './pages/student/SkillPassportPage';
import { ProfilePage } from './pages/student/ProfilePage';
import { SettingsPage } from './pages/student/SettingsPage';
import { ResourcesPage } from './pages/student/ResourcesPage';
import { HelpPage } from './pages/student/HelpPage';
import { ResumePage } from './pages/student/ResumePage';
import { PublicPassportPage } from './pages/public/PublicPassportPage';

// Recruiter enterprise platform pages
import { RecruiterDashboard } from './pages/recruiter/RecruiterDashboard';
import { RecruiterJobsPage } from './pages/recruiter/RecruiterJobsPage';
import { RecruiterCandidatesPage } from './pages/recruiter/RecruiterCandidatesPage';
import { RecruiterPipelinePage } from './pages/recruiter/RecruiterPipelinePage';
import { RecruiterVerificationsPage } from './pages/recruiter/RecruiterVerificationsPage';
import { RecruiterAssessmentsPage } from './pages/recruiter/RecruiterAssessmentsPage';
import { RecruiterSkillGapPage } from './pages/recruiter/RecruiterSkillGapPage';
import { RecruiterComparisonsPage } from './pages/recruiter/RecruiterComparisonsPage';
import { RecruiterInterviewsPage } from './pages/recruiter/RecruiterInterviewsPage';
import { RecruiterAnalyticsPage } from './pages/recruiter/RecruiterAnalyticsPage';
import { RecruiterCompanyPage } from './pages/recruiter/RecruiterCompanyPage';
import { RecruiterTeamPage } from './pages/recruiter/RecruiterTeamPage';
import { RecruiterSettingsPage } from './pages/recruiter/RecruiterSettingsPage';

// College Dashboard & 404
import { CollegeDashboard } from './pages/college/CollegeDashboard';
import { CollegeDrivesPage } from './pages/college/CollegeDrivesPage';
import { CollegeAtRiskPage } from './pages/college/CollegeAtRiskPage';
import { CollegeSettingsPage } from './pages/college/CollegeSettingsPage';
import { ReviewerAssessmentQueuePage } from './pages/reviewer/ReviewerAssessmentQueuePage';
import { NotFoundPage } from './pages/NotFoundPage';

// Lazy Admin Pages
const AdminDashboardPage = React.lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminUsersPage = React.lazy(() => import('./pages/admin/users/AdminUsersPage'));
const AdminApprovalsPage = React.lazy(() => import('./pages/admin/approvals/AdminApprovalsPage'));
const AdminIntegrityPage = React.lazy(() => import('./pages/admin/integrity/AdminIntegrityPage'));
const AdminContentPage = React.lazy(() => import('./pages/admin/content/AdminContentPage'));
const AdminSupportPage = React.lazy(() => import('./pages/admin/support/AdminSupportPage'));
const AdminAnnouncementsPage = React.lazy(() => import('./pages/admin/support/AdminAnnouncementsPage'));
const AdminInsightsPage = React.lazy(() => import('./pages/admin/insights/AdminInsightsPage'));
const AdminCopilotPage = React.lazy(() => import('./pages/admin/copilot/AdminCopilotPage'));
const AdminSystemPage = React.lazy(() => import('./pages/admin/system/AdminSystemPage'));
const AdminAuditPage = React.lazy(() => import('./pages/admin/system/AdminAuditPage'));
const AdminSettingsPage = React.lazy(() => import('./pages/admin/system/AdminSettingsPage'));
import { AdminLoginPage } from './pages/public/AdminLoginPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
          </Route>

          {/* Standalone Auth Pages */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin-login" element={<AdminLoginPage />} />
          <Route path="/passport/:publicId" element={<PublicPassportPage />} />

          {/* Student Portal Routes (Preserved Intact) */}
          <Route path="/student" element={<StudentLayout />}>
            <Route index element={<Navigate to="/student/dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="assessment" element={<AssessmentPage />} />
            <Route path="skill-gap" element={<SkillGapPage />} />
            <Route path="roadmap" element={<RoadmapPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="opportunities" element={<OpportunitiesPage />} />
            <Route path="skill-passport" element={<SkillPassportPage />} />
            <Route path="resources" element={<ResourcesPage />} />
            <Route path="analytics" element={<Navigate to="/student/dashboard" replace />} />
            <Route path="resume" element={<ResumePage />} />
            <Route path="help" element={<HelpPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Recruiter & Employer Enterprise Platform */}
          <Route path="/recruiter" element={<RecruiterLayout />}>
            <Route index element={<Navigate to="/recruiter/dashboard" replace />} />
            <Route path="dashboard" element={<RecruiterDashboard />} />
            <Route path="overview" element={<Navigate to="/recruiter/dashboard" replace />} />
            <Route path="jobs" element={<RecruiterJobsPage />} />
            <Route path="candidates" element={<RecruiterCandidatesPage />} />
            <Route path="pipeline" element={<RecruiterPipelinePage />} />
            <Route path="verifications" element={<RecruiterVerificationsPage />} />
            <Route path="assessments" element={<RecruiterAssessmentsPage />} />
            <Route path="skill-gap" element={<RecruiterSkillGapPage />} />
            <Route path="comparisons" element={<RecruiterComparisonsPage />} />
            <Route path="interviews" element={<RecruiterInterviewsPage />} />
            <Route path="analytics" element={<RecruiterAnalyticsPage />} />
            <Route path="company" element={<RecruiterCompanyPage />} />
            <Route path="team" element={<RecruiterTeamPage />} />
            <Route path="settings" element={<RecruiterSettingsPage />} />
            <Route path="assessments/queue" element={<ReviewerAssessmentQueuePage />} />
          </Route>

          {/* College Portal */}
          <Route path="/college" element={<CollegeLayout />}>
            <Route index element={<Navigate to="/college/dashboard" replace />} />
            <Route path="dashboard" element={<CollegeDashboard />} />
            <Route path="drives" element={<CollegeDrivesPage />} />
            <Route path="at-risk" element={<CollegeAtRiskPage />} />
            <Route path="settings" element={<CollegeSettingsPage />} />
            <Route path="assessments/queue" element={<ReviewerAssessmentQueuePage />} />
          </Route>

          {/* Platform Admin Portal */}
          <Route
            path="/admin"
            element={
              <RequireRole allowedRoles={['platform_admin']}>
                <AdminLayout />
              </RequireRole>
            }
          >
            <Route
              index
              element={
                <React.Suspense fallback={<div className="p-6 text-[13px] text-[#6B7280]">Loading...</div>}>
                  <AdminDashboardPage />
                </React.Suspense>
              }
            />
            <Route
              path="insights"
              element={
                <React.Suspense fallback={<div className="p-6 text-[13px] text-[#6B7280]">Loading...</div>}>
                  <AdminInsightsPage />
                </React.Suspense>
              }
            />
            <Route
              path="copilot"
              element={
                <React.Suspense fallback={<div className="p-6 text-[13px] text-[#6B7280]">Loading...</div>}>
                  <AdminCopilotPage />
                </React.Suspense>
              }
            />
            <Route
              path="users"
              element={
                <React.Suspense fallback={<div className="p-6 text-[13px] text-[#6B7280]">Loading...</div>}>
                  <AdminUsersPage />
                </React.Suspense>
              }
            />
            <Route
              path="approvals"
              element={
                <React.Suspense fallback={<div className="p-6 text-[13px] text-[#6B7280]">Loading...</div>}>
                  <AdminApprovalsPage />
                </React.Suspense>
              }
            />
            <Route
              path="integrity"
              element={
                <React.Suspense fallback={<div className="p-6 text-[13px] text-[#6B7280]">Loading...</div>}>
                  <AdminIntegrityPage />
                </React.Suspense>
              }
            />
            <Route
              path="content"
              element={
                <React.Suspense fallback={<div className="p-6 text-[13px] text-[#6B7280]">Loading...</div>}>
                  <AdminContentPage />
                </React.Suspense>
              }
            />
            <Route
              path="support"
              element={
                <React.Suspense fallback={<div className="p-6 text-[13px] text-[#6B7280]">Loading...</div>}>
                  <AdminSupportPage />
                </React.Suspense>
              }
            />
            <Route
              path="announcements"
              element={
                <React.Suspense fallback={<div className="p-6 text-[13px] text-[#6B7280]">Loading...</div>}>
                  <AdminAnnouncementsPage />
                </React.Suspense>
              }
            />
            <Route
              path="system"
              element={
                <React.Suspense fallback={<div className="p-6 text-[13px] text-[#6B7280]">Loading...</div>}>
                  <AdminSystemPage />
                </React.Suspense>
              }
            />
            <Route
              path="audit"
              element={
                <React.Suspense fallback={<div className="p-6 text-[13px] text-[#6B7280]">Loading...</div>}>
                  <AdminAuditPage />
                </React.Suspense>
              }
            />
            <Route
              path="settings"
              element={
                <React.Suspense fallback={<div className="p-6 text-[13px] text-[#6B7280]">Loading...</div>}>
                  <AdminSettingsPage />
                </React.Suspense>
              }
            />
          </Route>

          {/* Catch-all 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>

        {/* Global Floating AI Career Copilot */}
        <FloatingChatbot />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
