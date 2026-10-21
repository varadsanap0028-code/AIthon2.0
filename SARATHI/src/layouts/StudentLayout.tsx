import React, { useState } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { StudentSidebar, studentNavSections } from '../components/navigation/StudentSidebar';
import { StudentHeader } from '../components/navigation/StudentHeader';
import { StudentProvider } from '../context/StudentContext';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { NotificationDrawer } from '../components/common/NotificationDrawer';
import { FeedbackModal } from '../components/common/FeedbackModal';
import { apiClient } from '../services/apiClient';

export const StudentLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();

  React.useEffect(() => {
    if (!user) return;
    apiClient
      .get<{ success: boolean; unreadCount: number }>('/api/notifications')
      .then((res) => {
        if (res && typeof res.unreadCount === 'number') {
          setUnreadCount(res.unreadCount);
        }
      })
      .catch(() => {});
  }, [user?.id]);

  if (isLoading) {
    return <LoadingSpinner fullScreen variant="blue" message="Loading student portal..." />;
  }

  if (!user) {
    return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  // Enforce role authorization: users without student authorization are redirected to their portal
  if (user.role !== 'student' && !user.roles?.includes('student')) {
    const redirectPath =
      user.role === 'platform_admin' ? '/admin' :
      user.role === 'recruiter' ? '/recruiter/dashboard' : '/college/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  const getPageMeta = (path: string) => {
    for (const section of studentNavSections) {
      const item = section.items.find(
        i => path === i.path || (i.path !== '/student/dashboard' && path.startsWith(i.path))
      );
      if (item) {
        return {
          section: section.title,
          title: item.label === 'Dashboard' ? 'Student Dashboard' : item.label,
        };
      }
    }
    if (path.startsWith('/student/settings')) {
      return { section: 'Account', title: 'Account Settings' };
    }
    if (path.startsWith('/student/resources')) {
      return { section: 'Learning & Growth', title: 'Curated Learning Library' };
    }
    return { section: 'Student Portal', title: 'Student Portal' };
  };

  const pageMeta = getPageMeta(location.pathname);

  return (
    <StudentProvider>
      <div className="min-h-screen flex bg-[#F4F7FC]">
        <StudentSidebar
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <StudentHeader
            onMobileMenuToggle={() => setMobileSidebarOpen(true)}
            pageTitle={pageMeta.title}
            sectionTitle={pageMeta.section}
            unreadCount={unreadCount}
            onOpenNotifications={() => setNotificationDrawerOpen(true)}
            onOpenFeedback={() => setFeedbackModalOpen(true)}
          />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>

      <NotificationDrawer
        isOpen={notificationDrawerOpen}
        onClose={() => setNotificationDrawerOpen(false)}
        onUnreadCountChange={setUnreadCount}
      />

      <FeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
      />
    </StudentProvider>
  );
};
