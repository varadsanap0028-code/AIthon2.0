import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, Eye, EyeOff, ArrowRight, ArrowLeft, ShieldAlert } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';

export const AdminLoginPage: React.FC = () => {
  const { login, logout, isDemo, appMode } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // When explicitly accessing the Admin Login page, reset any previous session once on mount
  // so that administrator credentials are always prompted and required.
  const hasResetSessionRef = React.useRef(false);
  useEffect(() => {
    if (!hasResetSessionRef.current) {
      hasResetSessionRef.current = true;
      logout();
    }
  }, [logout]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMessage('Please enter both your administrator email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const profile = await login(cleanEmail, password, 'platform_admin', rememberMe);
      if (profile.role === 'platform_admin') {
        navigate('/admin', { replace: true });
      } else {
        setErrorMessage(
          `Access Denied: Account "${profile.email}" has role "${profile.role}". Only authorized Platform Administrators are permitted access.`
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication failed: Invalid administrator credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] p-4 text-slate-100">
      <div className="w-full max-w-[420px] space-y-6 bg-[#161F30] p-8 rounded-2xl border border-slate-700/80 shadow-2xl relative overflow-hidden">
        {/* Top security accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-600" />

        {/* Security Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Restricted Administration Gateway</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">SARATHI Platform Admin</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Please enter your administrator credentials to access the platform management console.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div role="alert" className="p-3 rounded-xl bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/30 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-email" className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide">
              Administrator Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" aria-hidden="true" />
              <input
                id="admin-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sarathi.dev"
                required
                className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/80 placeholder-slate-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide">
              Administrator Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" aria-hidden="true" />
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="w-full pl-10 pr-10 py-2.5 min-h-[44px] rounded-xl border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/80 placeholder-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-slate-400 cursor-pointer min-h-[32px]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Remember administrator session</span>
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            className="w-full min-h-[44px] bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold transition-all shadow-md"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Authenticate Administrator
          </Button>
        </form>

        {/* Security & Access Policy Notice */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
          <div className="font-semibold text-slate-300 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Access Policy & Auditing</span>
          </div>
          <p className="leading-relaxed">
            All administrative access attempts are monitored and recorded in the immutable audit log. Administrator accounts must be provisioned or invited by existing platform staff.
          </p>
          {(isDemo || appMode === 'demo') && (
            <div className="pt-1.5 text-[10px] text-slate-400 border-t border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-indigo-400 font-semibold">Demo Sandbox:</span> Seed account is <code className="text-slate-200 font-mono">admin@sarathi.dev</code> with password <code className="text-slate-200 font-mono">password123</code>.
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@sarathi.dev');
                  setPassword('password123');
                }}
                className="ml-2 text-indigo-400 hover:text-indigo-300 font-medium underline text-[10px] cursor-pointer shrink-0"
              >
                Auto-fill
              </button>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <Link to="/login" className="flex items-center gap-1.5 hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Standard User Login</span>
          </Link>
          <span className="text-[11px] text-slate-500">Security Guard v2.4</span>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
