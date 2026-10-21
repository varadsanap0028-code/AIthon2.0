import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Logo } from '../components/common/Logo';
import { Button } from '../components/common/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F4F7FC]">
      <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl border border-[#E0E7F2] text-center space-y-6">
        <Logo size="lg" showTagline={false} className="justify-center" />
        <div className="text-6xl font-black text-[#087BFA]">404</div>
        <h2 className="text-2xl font-extrabold text-[#0B1B43]">Page Not Found</h2>
        <p className="text-xs text-[#405B8B]">
          The route you are trying to access does not exist or has been moved.
        </p>

        <div className="pt-2 flex justify-center">
          <Link to="/">
            <Button variant="primary" leftIcon={<Home className="w-4 h-4" />}>
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
