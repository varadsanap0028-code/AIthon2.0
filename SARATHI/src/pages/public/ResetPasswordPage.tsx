import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { Logo } from '../../components/common/Logo';
import { Button } from '../../components/common/Button';
import { apiClient } from '../../services/apiClient';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage('Reset token is missing. Please request a new password reset link.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/api/auth/reset-password', {
        token,
        newPassword,
      });

      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F4F7FC]">
      <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-[#E0E7F2] space-y-6">
        <div className="text-center">
          <Logo size="md" showTagline={false} className="justify-center mb-4" />
          <h2 className="text-2xl font-extrabold text-[#0B1B43]">Create New Password</h2>
          <p className="text-xs text-[#405B8B] mt-1">Please enter and confirm your new secure password.</p>
        </div>

        {!token && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium space-y-2">
            <p>No reset token was detected in your link.</p>
            <Link to="/forgot-password" className="text-[#087BFA] font-bold underline block">
              Request a new password reset link
            </Link>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold border border-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isSuccess ? (
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-[#16A34A] mx-auto" />
            <h3 className="font-bold text-sm text-[#0B1B43]">Password Reset Complete!</h3>
            <p className="text-xs text-[#405B8B]">
              Your password has been securely updated. You can now log into your account with your new credentials.
            </p>
            <div className="pt-2">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => navigate('/login')}
              >
                Sign In Now
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#0B1B43] mb-1.5 uppercase tracking-wide">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#405B8B] absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] focus:outline-none focus:ring-2 focus:ring-[#087BFA]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-[#405B8B] hover:text-[#0B1B43]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0B1B43] mb-1.5 uppercase tracking-wide">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#405B8B] absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] focus:outline-none focus:ring-2 focus:ring-[#087BFA]"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isSubmitting || !token || !newPassword || !confirmPassword}
            >
              {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
            </Button>

            <div className="text-center pt-2">
              <Link to="/login" className="inline-flex items-center gap-1 text-xs font-semibold text-[#405B8B] hover:text-[#0B1B43]">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
