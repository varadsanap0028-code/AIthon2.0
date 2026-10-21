// Updated LoginPage to match new design specifications
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight, Sparkles, Building2, Briefcase, GraduationCap } from 'lucide-react';
import { Logo } from '../../components/common/Logo';
import { Button } from '../../components/common/Button';
import { GoogleLoginButton } from '../../components/auth/GoogleLoginButton';
import { useAuth } from '../../context/AuthContext';
import type { UserRole, UserProfile } from '../../types/user';

/**
 * Sanitizes the optional returnTo query parameter to prevent open redirects.
 */
function sanitizeReturnTo(param: string | null): string | null {
  if (!param) return null;
  const decoded = decodeURIComponent(param).trim();
  // Reject absolute URLs, scheme-relative URLs, javascript, and protocol escapes
  if (decoded.startsWith('//') || decoded.includes('://') || decoded.startsWith('javascript:')) {
    return null;
  }
  return decoded.startsWith('/') ? decoded : `/${decoded}`;
}

/**
 * Login page for Student, Recruiter and College portals.
 * Admin login has been moved to a dedicated route (/admin/login).
 */
export const LoginPage: React.FC = () => {
  const { user, isAuthenticated, isLoading: isAuthLoading, login, logout, isDemo, appMode, loginAsNewStudent } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawReturnTo = searchParams.get('returnTo');
  const safeReturnTo = sanitizeReturnTo(rawReturnTo);

  // UI state
  const [activeTab, setActiveTab] = useState<UserRole>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [portalNotice, setPortalNotice] = useState<string | null>(null);

  // Only auto-redirect if an explicit return destination was requested
  useEffect(() => {
    if (isAuthenticated && user && safeReturnTo) {
      navigate(safeReturnTo, { replace: true });
    }
  }, [isAuthenticated, user, safeReturnTo, navigate]);

  const handleAuthSuccess = (profile: UserProfile) => {
    if (profile.role !== activeTab) {
      setPortalNotice(`Note: Your account is verified as a ${profile.role}. Redirecting to your authorized portal...`);
    }
    const destination = safeReturnTo || (
      profile.role === 'platform_admin' ? '/admin' :
      profile.role === 'recruiter' ? '/recruiter/dashboard' :
      profile.role === 'college' ? '/college/dashboard' :
      '/student/dashboard'
    );
    setTimeout(() => navigate(destination, { replace: true }), portalNotice ? 800 : 0);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setPortalNotice(null);
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }
    setIsSubmitting(true);
    try {
      const profile = await login(cleanEmail, password, activeTab, rememberMe);
      handleAuthSuccess(profile);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTabChange = (newRole: UserRole) => {
    setActiveTab(newRole);
    setErrorMessage(null);
    // Demo mode auto‑fill credentials
    if (isDemo && appMode === 'demo') {
      if (newRole === 'student') {
        setEmail('student@sarathi.ai');
        setPassword('password123');
      } else if (newRole === 'recruiter') {
        setEmail('recruiter@sarathi.ai');
        setPassword('password123');
      } else if (newRole === 'college') {
        setEmail('admin@apex.edu');
        setPassword('password123');
      }
    }
  };

  if (isAuthLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FB]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#087BFA]" aria-label="Loading session" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FB]">
      <div className="w-full max-w-[384px] space-y-6 bg-white p-8 rounded-[14px] border border-[#d3d9e6]">
        {/* Logo – visible on small screens */}
        <div className="lg:hidden text-center mb-4">
          <Logo size="md" showTagline={true} className="justify-center" />
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-[#0B1B43] tracking-tight">Sign in to SARATHI</h2>
          <p className="text-xs text-[#405B8B] mt-1">Single sign‑on access to Student, Recruiter and College portals.</p>
        </div>

        {/* Existing Session Alert */}
        {isAuthenticated && user && (
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-950">Active Session Found</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                {user.role}
              </span>
            </div>
            <p className="text-[11px] text-blue-800">
              You are currently signed in as <span className="font-semibold text-blue-950">{user.fullName || user.email}</span>.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const dest =
                    user.role === 'platform_admin' ? '/admin' :
                    user.role === 'recruiter' ? '/recruiter/dashboard' :
                    user.role === 'college' ? '/college/dashboard' :
                    '/student/dashboard';
                  navigate(dest);
                }}
                className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer text-center"
              >
                Go to Dashboard
              </button>
              <button
                type="button"
                onClick={() => {
                  logout();
                  setEmail('');
                  setPassword('');
                }}
                className="py-1.5 px-3 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Switch Account
              </button>
            </div>
          </div>
        )}

        {/* Portal selector – Admin tab removed */}
        <div role="tablist" aria-label="Portal Selection" className="grid grid-cols-3 gap-1.5 p-1 bg-[#F4F7FC] rounded-xl text-xs font-semibold">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'student'}
            onClick={() => handleTabChange('student')}
            className={`py-2 px-1 rounded-lg flex items-center justify-center gap-1 min-h-[44px] cursor-pointer ${activeTab === 'student' ? 'bg-white text-[#087BFA] shadow-xs font-bold' : 'text-[#405B8B] hover:text-[#0B1B43]'}`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Student</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'recruiter'}
            onClick={() => handleTabChange('recruiter')}
            className={`py-2 px-1 rounded-lg flex items-center justify-center gap-1 min-h-[44px] cursor-pointer ${activeTab === 'recruiter' ? 'bg-white text-[#603DF5] shadow-xs font-bold' : 'text-[#405B8B] hover:text-[#0B1B43]'}`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Recruiter</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'college'}
            onClick={() => handleTabChange('college')}
            className={`py-2 px-1 rounded-lg flex items-center justify-center gap-1 min-h-[44px] cursor-pointer ${activeTab === 'college' ? 'bg-white text-[#16A34A] shadow-xs font-bold' : 'text-[#405B8B] hover:text-[#0B1B43]'}`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>College</span>
          </button>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div id="login-error-alert" role="alert" className="p-3 rounded-xl bg-red-50 text-[#DC2626] text-xs font-medium border border-red-200">
            {errorMessage}
          </div>
        )}
        {portalNotice && (
          <div role="status" className="p-3 rounded-xl bg-blue-50 text-[#087BFA] text-xs font-medium border border-blue-200">
            {portalNotice}
          </div>
        )}

        {/* Google SSO */}
        <GoogleLoginButton
          role={activeTab}
          rememberMe={rememberMe}
          text={`Continue with Google`}
          onSuccess={handleAuthSuccess}
        />

        {/* Divider */}
        <div className="relative flex items-center justify-center my-4">
          <div className="w-full border-t border-gray-200" />
          <span className="bg-white px-3 text-[11px] text-gray-400 font-semibold uppercase tracking-wider relative">or sign in with email</span>
        </div>

        {/* Email / Password Form */}
        <form onSubmit={handlePasswordSubmit} aria-describedby={errorMessage ? 'login-error-alert' : undefined} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-bold text-[#0B1B43] mb-1.5 uppercase tracking-wide">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#405B8B] absolute left-3.5 top-3.5" aria-hidden="true" />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] focus:outline-none focus:ring-2 focus:ring-[#087BFA] bg-[#F4F7FC]/40"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-bold text-[#0B1B43] mb-1.5 uppercase tracking-wide">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#405B8B] absolute left-3.5 top-3.5" aria-hidden="true" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-10 py-2.5 min-h-[44px] rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] focus:outline-none focus:ring-2 focus:ring-[#087BFA] bg-[#F4F7FC]/40"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-3 text-[#405B8B] hover:text-[#0B1B43] p-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-[#405B8B] cursor-pointer min-h-[32px]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-[#E0E7F2] text-[#087BFA] focus:ring-[#087BFA]"
              />
              <span>Remember me</span>
            </label>
            <Link to="/forgot-password" className="font-semibold text-[#087BFA] hover:underline py-1">Forgot password?</Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            className="w-full min-h-[44px]"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Sign In to SARATHI
          </Button>
        </form>

        {/* Student registration link */}
        <div className="text-center pt-1 text-xs text-[#405B8B]">
          Need a student account?{' '}
          <Link to="/signup" className="font-bold text-[#087BFA] hover:underline">Create an Account</Link>
        </div>

        {/* Admin login link */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-[#405B8B]">
          <span>Authorized Staff only:</span>
          <Link to="/admin/login" className="font-bold text-[#2563eb] hover:underline">Platform Admin Sign In</Link>
        </div>

        {/* Demo quick‑fill block */}
        {isDemo && appMode === 'demo' && (
          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 space-y-2">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Demo Mode Quick Access</span>
            </div>
            <p className="text-[11px] text-indigo-700">
              Click a portal tab above to auto‑fill credentials, or launch a zero‑progress student sandbox:
            </p>
            <button
              type="button"
              onClick={async () => {
                await loginAsNewStudent('Brand-New Student');
                navigate('/student/dashboard');
              }}
              className="w-full py-2 px-3 rounded-lg bg-white hover:bg-indigo-100/60 text-indigo-700 font-bold text-xs border border-indigo-300 transition-colors cursor-pointer text-center"
            >
              🚀 Quick Start as New Student
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
