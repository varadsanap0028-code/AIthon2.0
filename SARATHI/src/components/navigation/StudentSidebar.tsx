import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  User,
  Settings,
  LogOut,
  Building2,
  GraduationCap,
  ChevronDown,
  ChevronRight,
  X
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { useAuth } from '../../context/AuthContext';
import {
  studentNavSections,
  type StudentNavItem,
  type StudentNavSection
} from './studentNavConfig';

export { studentNavSections, type StudentNavItem, type StudentNavSection };

interface StudentSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const StudentSidebar: React.FC<StudentSidebarProps> = ({
  mobileOpen = false,
  onMobileClose
}) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-[#E0E7F2] w-64 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-[#E0E7F2] flex items-center justify-between">
        <NavLink to="/" className="flex items-center" aria-label="Sarathi Home">
          <Logo size="md" showTagline={false} />
        </NavLink>
        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close sidebar menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Grouped Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-4 overflow-y-auto">
        {studentNavSections.map((section) => {
          const isCollapsed = !!collapsedSections[section.id];
          const sectionHasActive = section.items.some(
            (item) => location.pathname === item.path || (item.path !== '/student/dashboard' && location.pathname.startsWith(item.path))
          );

          return (
            <div key={section.id} className="space-y-1">
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                aria-expanded={!isCollapsed}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-[#405B8B] hover:text-[#0B1B43] uppercase tracking-wider rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087BFA]"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <span>{section.title}</span>
                  {isCollapsed && sectionHasActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#087BFA] shrink-0" title="Active page inside" />
                  )}
                </span>
                <span className="text-[#8FA1C0] group-hover:text-[#405B8B] transition-transform">
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </span>
              </button>

              {!isCollapsed && (
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={onMobileClose}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087BFA] ${
                            isActive
                              ? 'bg-[#087BFA]/10 text-[#087BFA] font-bold shadow-2xs border-r-2 border-[#087BFA]'
                              : 'text-[#405B8B] hover:text-[#0B1B43] hover:bg-slate-100/70 font-medium'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <div className="flex items-center gap-3 min-w-0">
                              <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-[#087BFA]' : 'text-[#8FA1C0]'}`} />
                              <span className="truncate">{item.label}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              {item.path === '/student/opportunities' && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-[#087BFA]">
                                  Live
                                </span>
                              )}
                              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#087BFA]" />}
                            </div>
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Account Settings */}
        <div className="pt-2 border-t border-slate-100">
          <NavLink
            to="/student/settings"
            onClick={onMobileClose}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087BFA] ${
                isActive
                  ? 'bg-[#087BFA]/10 text-[#087BFA] font-bold shadow-2xs border-r-2 border-[#087BFA]'
                  : 'text-[#405B8B] hover:text-[#0B1B43] hover:bg-slate-100/70 font-medium'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-3">
                  <Settings className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-[#087BFA]' : 'text-[#8FA1C0]'}`} />
                  <span>Settings</span>
                </div>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#087BFA] shrink-0 ml-2" />}
              </>
            )}
          </NavLink>
        </div>

        {/* Authorized Multi-Role Switcher */}
        {user?.roles && user.roles.length > 1 && (
          <div className="pt-2 border-t border-slate-100 space-y-1">
            <div className="px-3 mb-1 text-[10px] font-bold text-[#405B8B] uppercase tracking-wider">
              Authorized Portals
            </div>

            {user.roles.includes('recruiter') && (
              <NavLink
                to="/recruiter/dashboard"
                onClick={onMobileClose}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-[#603DF5] bg-purple-50 hover:bg-purple-100/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#603DF5]"
              >
                <Building2 className="w-4 h-4 shrink-0 text-[#603DF5]" />
                <span>Recruiter Platform</span>
              </NavLink>
            )}

            {user.roles.includes('college') && (
              <NavLink
                to="/college/dashboard"
                onClick={onMobileClose}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-[#087BFA] bg-blue-50 hover:bg-blue-100/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087BFA]"
              >
                <GraduationCap className="w-4 h-4 shrink-0 text-[#087BFA]" />
                <span>College Portal</span>
              </NavLink>
            )}
          </div>
        )}
      </div>

      {/* Footer User Info & Logout (Bottom-Left Corner: My Profile Card & Details) */}
      <div className="p-3 border-t border-[#E0E7F2] bg-[#F4F7FC]/70">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[10px] font-bold text-[#405B8B] uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3 h-3 text-[#087BFA]" />
            My Profile
          </span>
          <NavLink
            to="/student/profile"
            onClick={onMobileClose}
            className="text-[11px] font-bold text-[#087BFA] hover:text-[#065ec0] flex items-center gap-0.5"
            title="View complete profile details"
          >
            <span>Details</span>
            <ChevronRight className="w-3 h-3" />
          </NavLink>
        </div>

        <NavLink
          to="/student/profile"
          onClick={onMobileClose}
          className="flex items-center gap-3 p-2 rounded-xl bg-white border border-[#E0E7F2] hover:border-[#087BFA] hover:shadow-2xs transition-all group cursor-pointer mb-2.5"
          title="View profile details"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#087BFA] to-[#603DF5] flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs">
            {user?.fullName ? user.fullName.charAt(0) : 'A'}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-bold text-[#0B1B43] group-hover:text-[#087BFA] transition-colors truncate">
              {user?.fullName || 'Student Account'}
            </span>
            <span className="text-[11px] text-[#405B8B] truncate">
              {user?.targetRole || 'Full-Stack Developer'}
            </span>
          </div>
        </NavLink>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold text-[#DC2626] bg-red-50 hover:bg-red-100/80 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626]"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Overlay Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={onMobileClose}
          />
          <div className="relative flex-1 max-w-xs w-full bg-white h-full z-10 animate-slide-in">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
