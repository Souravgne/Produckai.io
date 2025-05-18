import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ArrowRight, CheckCircle } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { supabase } from '../../lib/supabase';

export default function ProfileSetupStep() {
  const navigate = useNavigate();
  const { completeStep } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [profile, setProfile] = useState({
    fullName: '',
    role: '',
    goals: [] as string[]
  });

  useEffect(() => {
    // Get user email from auth
    const getUserEmail = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.email) {
        setUserEmail(data.user.email);
      }
      
      // Get user profile if it exists
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('full_name, role')
        .eq('id', data.user?.id)
        .single();
        
      if (profileData) {
        setProfile({
          ...profile,
          fullName: profileData.full_name || '',
          role: profileData.role || ''
        });
      }
    };
    
    getUserEmail();
  }, []);

  const handleGoalToggle = (goal: string) => {
    setProfile(prev => {
      const goals = prev.goals.includes(goal)
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal];
      return { ...prev, goals };
    });
  };

  const handleContinue = async () => {
    if (!profile.fullName || !profile.role) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Update user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          full_name: profile.fullName,
          role: profile.role,
          department: getDepartmentFromRole(profile.role),
          // Store goals in metadata if needed
          // metadata: { goals: profile.goals }
        });

      if (profileError) throw profileError;

      await completeStep('profile_setup');
      navigate('/onboarding/product-details');
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentFromRole = (role: string) => {
    switch (role) {
      case 'Product Manager':
        return 'Product';
      case 'Product Marketer':
        return 'Marketing';
      case 'Sales':
        return 'Sales';
      case 'Customer Success':
      case 'Customer Support':
        return 'Support';
      default:
        return 'Other';
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#00A4B8] text-white flex items-center justify-center">
            1
          </div>
          <span className="font-medium text-[#00A4B8]">Profile</span>
        </div>
        <div className="h-1 w-16 bg-gray-200 rounded-full"></div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center">
            2
          </div>
          <span className="font-medium text-gray-400">Product</span>
        </div>
        <div className="h-1 w-16 bg-gray-200 rounded-full"></div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center">
            3
          </div>
          <span className="font-medium text-gray-400">Data Sources</span>
        </div>
      </div>

      <div className="text-center mb-10">
        <User className="w-16 h-16 text-[#00A4B8] mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Let's get to know you
        </h1>
        <p className="text-lg text-gray-600">
          Tell us a bit about yourself so we can personalize your experience.
        </p>
      </div>

      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm mb-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={profile.fullName}
              onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A4B8] focus:border-transparent"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Email
            </label>
            <input
              type="email"
              value={userEmail}
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Role
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {['Product Manager', 'Product Marketer', 'Sales', 'Customer Success', 'Customer Support'].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setProfile({ ...profile, role })}
                  className={`flex items-center justify-between p-4 border-2 rounded-lg transition-colors ${
                    profile.role === role
                      ? 'border-[#00A4B8] bg-[#00A4B8]/5'
                      : 'border-gray-200 hover:border-[#00A4B8]/50'
                  }`}
                >
                  <span className="font-medium">{role}</span>
                  {profile.role === role && (
                    <CheckCircle className="w-5 h-5 text-[#00A4B8]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What are your goals? (Optional)
            </label>
            <div className="space-y-3">
              {[
                'Prioritize roadmap',
                'Collect customer feedback',
                'Analyze themes',
                'Collaborate with my team'
              ].map((goal) => (
                <div key={goal} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`goal-${goal}`}
                    checked={profile.goals.includes(goal)}
                    onChange={() => handleGoalToggle(goal)}
                    className="h-5 w-5 text-[#00A4B8] rounded border-gray-300 focus:ring-[#00A4B8]"
                  />
                  <label
                    htmlFor={`goal-${goal}`}
                    className="ml-3 text-gray-700"
                  >
                    {goal}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          disabled={!profile.fullName || !profile.role || loading}
          className="px-6 py-3 bg-[#00A4B8] text-white rounded-lg text-lg font-semibold hover:bg-[#008a9a] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? 'Saving...' : 'Next'}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}