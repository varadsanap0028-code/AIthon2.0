import React from 'react';
import { Outlet } from 'react-router-dom';
import { PublicNavbar } from '../components/navigation/PublicNavbar';
import { Footer } from '../components/navigation/Footer';

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FC]">
      <PublicNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
