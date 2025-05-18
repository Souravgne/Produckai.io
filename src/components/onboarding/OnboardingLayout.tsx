import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboarding } from '../../contexts/OnboardingContext';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { hasCompletedOnboarding } = useOnboarding();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (hasCompletedOnboarding && location.pathname !== '/dashboard') {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#00A4B8]/5 to-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-[#00A4B8]/10 p-12">
          {children}
        </div>
      </div>
    </div>
  );
}