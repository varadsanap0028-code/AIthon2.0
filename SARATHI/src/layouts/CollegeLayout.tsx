import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, NavLink, Navigate } from 'react-router-dom';
import { Logo } from '../components/common/Logo';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  LayoutDashboard,
  GraduationCap,
  Target,
  BarChart3,
  LogOut,
  Menu,
  X,
  ChevronDown,
  BookOpen,
  Briefcase,
  ShieldAlert,
  Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { mockCollegeAnalyticsData } from '../data/mockRecruiterCollege';

export interface CollegeNavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

export interface CollegeNavSection {
  id: string;
  title: string;
  items: CollegeNavItem[];
}

export const collegeNavSections: CollegeNavSection[] = [
  {
    id: 'institutional-overview',
    title: 'Institutional Intelligence',
    items: [
      { label: 'Readiness Overview', path: '/college/dashboard', icon: LayoutDashboard },
      { label: 'Placement Drives', path: '/college/drives', icon: Briefcase },
      { label: 'At-Risk Students', path: '/college/at-risk', icon: ShieldAlert },
    ],
  },
  {
    id: 'cohort-analytics',
    title: 'Cohort & Curriculum',
    items: [
      { label: 'Skill Gap Matrix', path: '/college/dashboard#skill-gaps', icon: Target },
      { label: 'Batch Benchmark Trends', path: '/college/dashboard#benchmarks', icon: BarChart3 },
      { label: 'Technical Domains', path: '/college/dashboard#domains', icon: BookOpen },
      { label: 'Settings', path: '/college/settings', icon: Settings },
    ],
  },
];

export const CollegeLayout: React.FC = () => {
  const { user, isLoading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return <LoadingSpinner fullScreen variant="green" message="Loading college portal..." />;
  }

  if (!user) {
    return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  // Enforce role authorization: users without college authorization are redirected to their portal
  if (user.role !== 'college' && !user.roles?.includes('college')) {
    const redirectPath =
      user.role === 'platform_admin' ? '/admin' :
      user.role === 'recruiter' ? '/recruiter/dashboard' : '/student/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  const institutionName = user.institution || mockCollegeAnalyticsData.institutionName;
  const userInitials = user?.fullName
    ? user.fullName.split(' ').map((n: string) => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()
    : 'CO';
  const userName = user?.fullName || 'College Administrator';
  const userEmail = user?.email || 'admin@apex.edu';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navContent = (
    <div className="flex flex-col h-full bg-white border-r border-[#E0E7F2] w-64 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-[#E0E7F2] flex items-center justify-between">
        <NavLink to="/" className="flex items-center" aria-label="Sarathi Home">
          <Logo size="md" showTagline={false} />
        </NavLink>
        {mobileMenuOpen && (
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close sidebar menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* College Info Card in Sidebar */}
      <div className="p-4 mx-3 my-3 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
            <GraduationCap className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-[#0B1B43] truncate">{institutionName}</h4>
            <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
              Institutional Admin
            </span>
          </div>
        </div>
      </div>

      {/* Grouped Navigation Links */}
      <div className="flex-1 py-2 px-3 space-y-4 overflow-y-auto">
        {collegeNavSections.map((section) => (
          <div key={section.id} className="space-y-1">
            <div className="px-3 py-1.5 text-[11px] font-bold text-[#405B8B] uppercase tracking-wider">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isHashLink = item.path.includes('#');
                const hashAnchor = isHashLink ? item.path.substring(item.path.indexOf('#')) : '';
                const basePath = isHashLink ? item.path.substring(0, item.path.indexOf('#')) : item.path;

                const isActive = isHashLink
                  ? location.pathname === basePath && location.hash === hashAnchor
                  : location.pathname === item.path && (!location.hash || location.hash === '');

                return (
                  <NavLink
                    key={item.label}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 font-bold shadow-2xs border-r-2 border-emerald-600'
                        : 'text-[#405B8B] hover:text-[#0B1B43] hover:bg-slate-100/70 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-emerald-600' : 'text-[#8FA1C0]'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 ml-2" />}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Sign Out */}
      <div className="p-3 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F4F7FC]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block shrink-0 sticky top-0 h-screen z-20">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-navy-dark/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white z-10 shadow-2xl">
            {navContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-[#E0E7F2] px-4 sm:px-6 py-3.5">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Mobile Toggle & Page Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 text-[#0B1B43] hover:bg-slate-100 rounded-lg focus:outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500"
                aria-label="Toggle navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8FA1C0] leading-none mb-1">
                  <span>College Portal</span>
                  <span>/</span>
                  <span className="text-[#405B8B] font-medium">Placement & Cohort Intelligence</span>
                </div>
                <h1 className="text-xl font-extrabold text-[#0B1B43] tracking-tight">{institutionName}</h1>
              </div>
            </div>

            {/* Right: Notifications & Profile */}
            <div className="flex items-center gap-3">
              <div className="relative" ref={profileDropdownRef}>
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
                  aria-label="User profile menu"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                    {userInitials}
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#405B8B]" />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#E0E7F2] py-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="font-bold text-xs text-[#0B1B43]">{userName}</p>
                      <p className="text-[11px] text-[#405B8B] truncate">{userEmail}</p>
                      <span className="mt-1 inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Institutional Authority
                      </span>
                    </div>

                    {user?.roles && user.roles.length > 1 && (
                      <div className="py-1 border-b border-slate-100">
                        <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8FA1C0]">
                          Authorized Portals
                        </div>
                        {user.roles.includes('student') && (
                          <NavLink
                            to="/student/dashboard"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="block px-4 py-1.5 text-xs text-blue-600 hover:bg-blue-50 font-medium"
                          >
                            Student Portal
                          </NavLink>
                        )}
                        {user.roles.includes('recruiter') && (
                          <NavLink
                            to="/recruiter/dashboard"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="block px-4 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 font-medium"
                          >
                            Recruiter Platform
                          </NavLink>
                        )}
                      </div>
                    )}

                    <div className="pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-xs text-[#DC2626] font-semibold hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
