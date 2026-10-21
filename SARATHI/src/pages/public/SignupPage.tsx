import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../../components/common/Logo';
import { Button } from '../../components/common/Button';
import { GoogleLoginButton } from '../../components/auth/GoogleLoginButton';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types/user';

export const SignupPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [error, setError] = useState('');

  const { signup, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === 'admin@sarathi.dev' || (role as string) === 'platform_admin') {
      setError('Administrator accounts cannot be registered publicly. Platform administrators must be invited by an existing administrator.');
      return;
    }

    try {
      await signup(fullName, email, role, password);
      if (role === 'recruiter') navigate('/recruiter/dashboard');
      else if (role === 'college') navigate('/college/dashboard');
      else navigate('/student/dashboard');
    } catch (err: any) {
      setError(err.message || 'Signup failed.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f7fb]">
      <div className="mb-6 text-center">
        <Logo size="lg" lightMode={true} showTagline={false} />
        <p className="mt-2 text-gray-600">Your Skills. Your Journey. Our AI.</p>
      </div>
      <div className="w-full max-w-sm bg-white border border-[#d3d9e6] rounded-[14px] p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[#12182b] mb-4">Create your account</h2>
        {error && (
          <div className="p-3 mb-3 rounded-xl bg-red-50 text-[#DC2626] text-xs font-medium border border-red-200">
            {error}
          </div>
        )}
        <div className="space-y-4 mb-4">
          <GoogleLoginButton role={role} text={`Continue with Google`} />
          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-gray-200" />
            <span className="bg-white px-3 text-xs text-gray-400 font-medium uppercase tracking-wider relative">
              or sign up with email
            </span>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#12182b] mb-1">Select Your Role</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`p-2 rounded-[14px] border text-sm font-bold text-center transition ${role === 'student' ? 'bg-white border-[#2563eb] text-[#2563eb]' : 'border-[#d3d9e6] text-[#5d667d]'}`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setRole('recruiter')}
                className={`p-2 rounded-[14px] border text-sm font-bold text-center transition ${role === 'recruiter' ? 'bg-white border-[#2563eb] text-[#2563eb]' : 'border-[#d3d9e6] text-[#5d667d]'}`}
              >
                Recruiter
              </button>
              <button
                type="button"
                onClick={() => setRole('college')}
                className={`p-2 rounded-[14px] border text-sm font-bold text-center transition ${role === 'college' ? 'bg-white border-[#2563eb] text-[#2563eb]' : 'border-[#d3d9e6] text-[#5d667d]'}`}
              >
                College
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#12182b] mb-1">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              className="w-full px-3 py-2 rounded-[14px] border border-[#d3d9e6] text-sm text-[#12182b] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#12182b] mb-1">Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="alex@example.com"
              className="w-full px-3 py-2 rounded-[14px] border border-[#d3d9e6] text-sm text-[#12182b] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#12182b] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-[14px] border border-[#d3d9e6] text-sm text-[#12182b] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              required
            />
          </div>
          <Button type="submit" variant="primary" size="lg" className="w-full min-h-[44px]" isLoading={isLoading}>
            Create {role} account
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-[#5d667d]">
          Already have an account? <Link to="/login" className="font-semibold text-[#2563eb] hover:underline">Sign in</Link>
        </p>
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-[#405B8B]">
          <span>Authorized Staff only:</span>
          <Link to="/admin/login" className="font-bold text-[#2563eb] hover:underline">Platform Admin Sign In</Link>
        </div>
      </div>
    </div>
  );
};
