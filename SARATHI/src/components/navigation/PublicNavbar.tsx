import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, ArrowRight, Sparkles } from 'lucide-react';
import { Logo } from '../common/Logo';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';

export const PublicNavbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-[#E0E7F2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center">
            <Logo size="md" showTagline={true} />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-[#405B8B]">
            <a href="#how-it-works" className="hover:text-[#087BFA] transition-colors">How It Works</a>
            <a href="#features" className="hover:text-[#087BFA] transition-colors">Features</a>
            <a href="#students" className="hover:text-[#087BFA] transition-colors">For Students</a>
            <a href="#recruiters" className="hover:text-[#087BFA] transition-colors">For Recruiters</a>
            <a href="#colleges" className="hover:text-[#087BFA] transition-colors">For Colleges</a>
          </nav>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <Button 
                variant="purple" 
                onClick={() => navigate(user.role === 'recruiter' ? '/recruiter/dashboard' : user.role === 'college' ? '/college/dashboard' : '/student/dashboard')}
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link to="/signup">
                  <Button variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#0B1B43] hover:bg-slate-100 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E0E7F2] bg-white px-4 pt-2 pb-6 space-y-4 shadow-lg animate-fade-in">
          <nav className="flex flex-col space-y-3 font-semibold text-sm text-[#405B8B]">
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#students" onClick={() => setMobileMenuOpen(false)}>For Students</a>
            <a href="#recruiters" onClick={() => setMobileMenuOpen(false)}>For Recruiters</a>
            <a href="#colleges" onClick={() => setMobileMenuOpen(false)}>For Colleges</a>
          </nav>

          <div className="pt-4 border-t border-[#E0E7F2] flex flex-col gap-2">
            {user ? (
              <Button 
                variant="purple" 
                className="w-full"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate(user.role === 'recruiter' ? '/recruiter/dashboard' : user.role === 'college' ? '/college/dashboard' : '/student/dashboard');
                }}
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="secondary" className="w-full">Sign In</Button>
                </Link>
                <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" className="w-full">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
