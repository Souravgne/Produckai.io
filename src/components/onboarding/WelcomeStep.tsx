import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, ArrowRight } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import Logo from '../Logo';

export default function WelcomeStep() {
  const navigate = useNavigate();
  const { completeStep } = useOnboarding();

  const handleStartSetup = async () => {
    try {
      await completeStep('welcome');
      // Navigate to the new profile setup instead of role
      navigate('/onboarding/profile-setup');
    } catch (error) {
      console.error('Error starting setup:', error);
    }
  };

  return (
    <div className="relative min-h-[500px] flex flex-col items-center justify-center text-center">
      {/* Floating Logo Animation */}
      <div className="mb-12">
        <div className="relative inline-block animate-float">
          <div className="relative">
            <Logo size="lg" className="w-24 h-24" />
            <div className="absolute -top-2 -right-2">
              <Rocket className="w-8 h-8 text-[#00A4B8] animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8 max-w-2xl animate-fadeIn">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-gray-900 leading-tight">
            Welcome to ProduckAI
            <span className="block text-2xl text-[#00A4B8] mt-2">
              Your AI-powered Product Manager Assistant
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 leading-relaxed">
            We'll guide you through a quick setup to help you capture customer feedback, 
            analyze product themes, and collaborate with your team.
          </p>
        </div>

        <div className="flex flex-col items-center gap-6 pt-4">
          <button
            onClick={handleStartSetup}
            className="group w-full max-w-md px-8 py-4 bg-[#00A4B8] text-white rounded-xl text-xl font-semibold hover:bg-[#008a9a] transition-all transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-3"
          >
            <Rocket className="w-6 h-6 group-hover:animate-pulse" />
            Start Setup
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#00A4B8]/5 rounded-full blur-3xl opacity-30" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-50 rounded-full blur-3xl opacity-30" />
    </div>
  );
}