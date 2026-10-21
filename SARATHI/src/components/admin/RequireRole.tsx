import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types/user';

interface RequireRoleProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

/**
 * Route guard enforcing authentication and role authorization.
 * Redirects unauthenticated users to /login with returnTo context.
 * Redirects unauthorized users to their own portal home.
 */
export const RequireRole: React.FC<RequireRoleProps> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div
          className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"
          aria-label="Loading authentication"
        />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    const targetLogin = allowedRoles.includes('platform_admin') ? '/admin/login' : '/login';
    return <Navigate to={targetLogin} state={{ returnTo: location.pathname + location.search }} replace />;
  }

  if (user.status === 'suspended') {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    let home = '/student/dashboard';
    if (user.role === 'platform_admin') {
      home = '/admin';
    } else if (user.role === 'recruiter') {
      home = '/recruiter/dashboard';
    } else if (user.role === 'college') {
      home = '/college/dashboard';
    }
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
};

export default RequireRole;
