import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Link, Navigate } from 'react-router-dom';
import { Logo } from '../components/common/Logo';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  GitPullRequest,
  BadgeCheck,
  FileCode,
  GitCompare,
  BarChart3,
  Calendar,
  Building2,
  ShieldCheck,
  Settings,
  Split,
  ChevronDown,
  ChevronRight,
  Bell,
  Search,
  Menu,
  X,
  ExternalLink,
  GraduationCap
} from 'lucide-react';
import { RecruiterProvider, useRecruiter } from '../context/RecruiterContext';
import { useAuth } from '../context/AuthContext';

export interface RecruiterNavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

export interface RecruiterNavSection {
  id: string;
  title: string;
  items: RecruiterNavItem[];
}

export const recruiterNavSections: RecruiterNavSection[] = [
  {
    id: 'talent-acquisition',
    title: 'Talent Acquisition',
    items: [
      { label: 'Overview', path: '/recruiter/dashboard', icon: LayoutDashboard },
      { label: 'Find Candidates', path: '/recruiter/candidates', icon: Users },
      { label: 'Jobs & Postings', path: '/recruiter/jobs', icon: Briefcase },
      { label: 'Applicants & Pipeline', path: '/recruiter/pipeline', icon: GitPullRequest },
    ],
  },
  {
    id: 'skill-intelligence',
    title: 'Skill Intelligence & Evaluation',
    items: [
      { label: 'Skill Verification', path: '/recruiter/verifications', icon: BadgeCheck },
      { label: 'Assessments', path: '/recruiter/assessments', icon: FileCode },
      { label: 'Skill Gap Analysis', path: '/recruiter/skill-gap', icon: Split },
      { label: 'Interviews', path: '/recruiter/interviews', icon: Calendar },
    ],
  },
  {
    id: 'decision-support',
    title: 'Decision Support',
    items: [
      { label: 'Shortlists & Comparisons', path: '/recruiter/comparisons', icon: GitCompare },
      { label: 'Hiring Analytics', path: '/recruiter/analytics', icon: BarChart3 },
    ],
  },
  {
    id: 'organization-settings',
    title: 'Organization & Settings',
    items: [
      { label: 'Company Profile', path: '/recruiter/company', icon: Building2 },
      { label: 'Team & Permissions', path: '/recruiter/team', icon: ShieldCheck },
      { label: 'Hiring Settings', path: '/recruiter/settings', icon: Settings },
    ],
  },
];

const allNavigationItems = recruiterNavSections.flatMap(section => section.items);

const RecruiterLayoutContent: React.FC = () => {
  const { user, isLoading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { activeOrgId, setActiveOrgId, organizations } = useRecruiter();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const orgDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(e.target as Node)) {
        setOrgDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return <LoadingSpinner fullScreen variant="indigo" message="Loading recruiter platform..." />;
  }

  if (!user) {
    return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  // Enforce role authorization: users without recruiter authorization are redirected to their portal
  if (user.role !== 'recruiter' && !user.roles?.includes('recruiter')) {
    const redirectPath =
      user.role === 'platform_admin' ? '/admin' :
      user.role === 'student' ? '/student/dashboard' : '/college/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const activeOrg = organizations.find(o => o.id === activeOrgId) || organizations[0];

  const userInitials = user?.fullName
    ? user.fullName.split(' ').map((n: string) => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()
    : 'RE';
  const userName = user?.fullName || 'Enterprise Recruiter';
  const userEmail = user?.email || 'recruiter@sarathi.ai';

  const currentItem = allNavigationItems.find(item =>
    location.pathname === item.path || (item.path !== '/recruiter/dashboard' && location.pathname.startsWith(item.path))
  ) || allNavigationItems[0];

  const currentSection = recruiterNavSections.find(section =>
    section.items.some(item => item.path === currentItem.path)
  ) || recruiterNavSections[0];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col antialiased">
      {/* TOP BAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="flex items-center justify-between px-4 sm:px-6 h-16">
          {/* Left: Mobile Toggle & Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Toggle Sidebar Width"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link to="/recruiter/dashboard" className="flex items-center gap-2.5">
              <Logo size="md" showTagline={false} />
            </Link>

            {/* Organization Switcher */}
            <div className="relative ml-4 hidden sm:block" ref={orgDropdownRef}>
              <button
                onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-semibold text-slate-700"
              >
                <Building2 className="w-3.5 h-3.5 text-[#4F46E5]" />
                <span className="max-w-[160px] truncate">{activeOrg.name}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {orgDropdownOpen && (
                <div className="absolute left-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50">
                  <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    Switch Organization
                  </div>
                  {organizations.map(org => (
                    <button
                      key={org.id}
                      onClick={() => {
                        setActiveOrgId(org.id);
                        setOrgDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between hover:bg-indigo-50/50 transition-colors ${
                        org.id === activeOrgId ? 'text-[#4F46E5] bg-indigo-50 font-bold' : 'text-slate-700'
                      }`}
                    >
                      <span>{org.name}</span>
                      {org.id === activeOrgId && <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Center: Global Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Search candidates, verified skills, or job postings..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    navigate(`/recruiter/candidates?query=${encodeURIComponent((e.target as HTMLInputElement).value)}`);
                  }
                }}
                className="w-full pl-9 pr-4 py-2 bg-slate-100/80 hover:bg-slate-100 focus:bg-white rounded-xl border border-transparent focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 text-xs transition-all outline-none"
              />
            </div>
          </div>

          {/* Right: Actions, Portal Switcher & Profile */}
          <div className="flex items-center gap-3">
            {/* Multi-Role Switcher (only for accounts explicitly authorized for multiple roles) */}
            {user?.roles && user.roles.length > 1 && (
              <>
                {user.roles.includes('student') && (
                  <Link
                    to="/student/dashboard"
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 text-[#4F46E5] hover:bg-indigo-50 font-semibold text-xs transition-colors shadow-2xs"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Student Portal</span>
                    <ExternalLink className="w-3 h-3 text-indigo-400" />
                  </Link>
                )}
                {user.roles.includes('college') && (
                  <Link
                    to="/college/dashboard"
                    className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 text-[#087BFA] hover:bg-blue-50 font-semibold text-xs transition-colors shadow-2xs"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>College Portal</span>
                    <ExternalLink className="w-3 h-3 text-blue-400" />
                  </Link>
                )}
              </>
            )}

            {/* Notifications */}
            <button
              onClick={() => navigate('/recruiter/verifications')}
              className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Skill Verification Queue"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
            </button>

            {/* User Profile Menu */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 p-1 pl-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="User profile menu"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center font-bold text-xs ring-2 ring-indigo-200">
                  {userInitials}
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 leading-tight">{userName}</span>
                  <span className="text-[10px] text-slate-500">Recruiter</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-800">{userName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{userEmail}</p>
                    <span className="mt-1 inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Enterprise Recruiter
                    </span>
                  </div>
                  <Link
                    to="/recruiter/company"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="block px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Organization Profile
                  </Link>
                  <Link
                    to="/recruiter/team"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="block px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Team & RBAC Permissions
                  </Link>
                  <Link
                    to="/recruiter/settings"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="block px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Hiring Preferences
                  </Link>
                  {user?.roles && user.roles.length > 1 && (
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Authorized Portals
                      </div>
                      {user.roles.includes('student') && (
                        <Link
                          to="/student/dashboard"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="block px-4 py-2 text-xs text-indigo-600 hover:bg-indigo-50 font-medium transition-colors"
                        >
                          Student Portal
                        </Link>
                      )}
                      {user.roles.includes('college') && (
                        <Link
                          to="/college/dashboard"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="block px-4 py-2 text-xs text-[#087BFA] hover:bg-blue-50 font-medium transition-colors"
                        >
                          College Portal
                        </Link>
                      )}
                    </div>
                  )}
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                        navigate('/login');
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 font-semibold transition-colors cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* BODY SHELL */}
      <div className="flex-1 flex min-h-0">
        {/* DESKTOP SIDEBAR */}
        <aside
          className={`hidden lg:flex flex-col border-r border-slate-200 bg-white transition-all duration-200 ${
            sidebarCollapsed ? 'w-18' : 'w-64'
          }`}
        >
          <div className="flex-1 py-4 overflow-y-auto space-y-3 px-3">
            {recruiterNavSections.map(section => {
              const isSectionCollapsed = !sidebarCollapsed && !!collapsedSections[section.id];
              const sectionHasActive = section.items.some(
                item => location.pathname === item.path ||
                  (item.path !== '/recruiter/dashboard' && location.pathname.startsWith(item.path))
              );

              return (
                <div key={section.id} className="space-y-1">
                  {!sidebarCollapsed ? (
                    <div>
                      <button
                        type="button"
                        onClick={() => toggleSection(section.id)}
                        aria-expanded={!isSectionCollapsed}
                        className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-700 uppercase tracking-wider rounded-md hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        <span className="truncate flex items-center gap-1.5">
                          {section.title}
                          {isSectionCollapsed && sectionHasActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" title="Active page inside" />
                          )}
                        </span>
                        <span className="text-slate-400 group-hover:text-slate-600 transition-transform">
                          {isSectionCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </span>
                      </button>

                      {!isSectionCollapsed && (
                        <div className="space-y-0.5 mt-1">
                          {section.items.map(item => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path ||
                              (item.path !== '/recruiter/dashboard' && location.pathname.startsWith(item.path));

                            return (
                              <Link
                                key={item.path}
                                to={item.path}
                                aria-current={isActive ? 'page' : undefined}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                                  isActive
                                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm shadow-indigo-600/20 font-bold'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
                                }`}
                              >
                                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                <span className="truncate flex-1">{item.label}</span>
                                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Collapsed mode (w-18) */
                    <div className="space-y-1 py-1 border-b border-slate-100 last:border-b-0">
                      {section.items.map(item => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path ||
                          (item.path !== '/recruiter/dashboard' && location.pathname.startsWith(item.path));

                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            title={`${section.title}: ${item.label}`}
                            aria-current={isActive ? 'page' : undefined}
                            className={`flex items-center justify-center p-2.5 rounded-xl text-xs transition-all ${
                              isActive
                                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm shadow-indigo-600/20 font-bold'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                            }`}
                          >
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!sidebarCollapsed && (
            <div className="p-3 border-t border-slate-100 bg-slate-50/50 m-3 rounded-xl">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                <span>Active Organization</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Pro</span>
              </div>
              <p className="text-xs font-bold text-slate-800 truncate">{activeOrg.name}</p>
              <p className="text-[10px] text-slate-400">Multi-Domain Skill Intelligence</p>
            </div>
          )}
        </aside>

        {/* MOBILE SIDEBAR MODAL */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-72 bg-white flex flex-col h-full z-10 shadow-2xl p-4 overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <Logo size="sm" showTagline={false} />
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  aria-label="Close mobile menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 flex-1">
                {recruiterNavSections.map(section => (
                  <div key={section.id} className="space-y-1">
                    <div className="px-2.5 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {section.title}
                    </div>
                    <div className="space-y-0.5">
                      {section.items.map(item => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path ||
                          (item.path !== '/recruiter/dashboard' && location.pathname.startsWith(item.path));

                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setMobileMenuOpen(false)}
                            aria-current={isActive ? 'page' : undefined}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                              isActive
                                ? 'bg-indigo-600 text-white font-bold'
                                : 'text-slate-600 hover:bg-slate-100 font-medium'
                            }`}
                          >
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                            <span className="flex-1">{item.label}</span>
                            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {user?.roles && user.roles.length > 1 && (
                <div className="pt-4 border-t border-slate-100 mt-4 space-y-2">
                  <div className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Authorized Portals
                  </div>
                  {user.roles.includes('student') && (
                    <Link
                      to="/student/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
                    >
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      <span>Switch to Student Portal</span>
                    </Link>
                  )}
                  {user.roles.includes('college') && (
                    <Link
                      to="/college/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-50 text-[#087BFA] text-xs font-bold hover:bg-blue-100 transition-colors"
                    >
                      <Building2 className="w-4 h-4 text-[#087BFA]" />
                      <span>Switch to College Portal</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">
          {/* Breadcrumbs Banner */}
          <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-medium text-slate-400 shrink-0">Employer</span>
              <span className="text-slate-300">/</span>
              <span className="font-medium text-slate-500 truncate hidden sm:inline">{currentSection.title}</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="font-semibold text-indigo-600 truncate">{currentItem.label}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="hidden xs:inline">Enterprise Active • Verified Workspace</span>
            </div>
          </div>

          <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export const RecruiterLayout: React.FC = () => {
  return (
    <RecruiterProvider>
      <RecruiterLayoutContent />
    </RecruiterProvider>
  );
};
