import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ArrowRight } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { supabase } from '../../lib/supabase';

const roles = [
  { id: 'product_manager', title: 'Product Manager', department: 'Product' },
  { id: 'product_marketer', title: 'Product Marketer', department: 'Marketing' },
  { id: 'sales_representative', title: 'Sales Representative', department: 'Sales' },
  { id: 'customer_support', title: 'Customer Support', department: 'Support' },
  { id: 'software_engineer', title: 'Software Engineer', department: 'Engineering' },
  { id: 'product_designer', title: 'Product Designer', department: 'Design' },
  { id: 'other', title: 'Other', department: 'Other' }
];

export default function RoleStep() {
  const navigate = useNavigate();
  const { completeStep } = useOnboarding();
  const [selectedRole, setSelectedRole] = useState('');
  const [otherRole, setOtherRole] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!selectedRole) return;
    
    setLoading(true);
    try {
      const role = roles.find(r => r.id === selectedRole);
      if (!role) throw new Error('Invalid role selected');

      const roleTitle = role.id === 'other' ? otherRole : role.title;
      const department = role.id === 'other' ? 'Other' : role.department;

      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: (await supabase.auth.getUser()).data.user?.id,
          role: roleTitle,
          department: department
        });

      if (profileError) throw profileError;

      // Set a flag to indicate we're coming from onboarding
      sessionStorage.setItem('from_onboarding', 'true');
      
      await completeStep('role');
      navigate('/onboarding/integrations');
    } catch (error) {
      console.error('Error updating role:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-12">
        <Users className="w-16 h-16 text-blue-600 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          What's your role?
        </h1>
        <p className="text-lg text-gray-600">
          To customize your experience, we need to know your role.
        </p>
      </div>

      <div className="space-y-4 mb-8">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => setSelectedRole(role.id)}
            className={`w-full p-6 text-left rounded-xl transition-all ${
              selectedRole === role.id
                ? 'bg-blue-50 border-2 border-blue-600'
                : 'bg-white border-2 border-gray-200 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{role.title}</h3>
                {role.id !== 'other' && (
                  <p className="text-sm text-gray-500">{role.department}</p>
                )}
              </div>
              <div className={`w-5 h-5 rounded-full border-2 ${
                selectedRole === role.id
                  ? 'border-blue-600 bg-blue-600'
                  : 'border-gray-300'
              }`}>
                {selectedRole === role.id && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}

        {selectedRole === 'other' && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <label htmlFor="otherRole" className="block text-sm font-medium text-gray-700 mb-2">
              Please specify your role
            </label>
            <input
              type="text"
              id="otherRole"
              value={otherRole}
              onChange={(e) => setOtherRole(e.target.value)}
              placeholder="Enter your role"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
      </div>

      <button
        onClick={handleContinue}
        disabled={!selectedRole || (selectedRole === 'other' && !otherRole.trim()) || loading}
        className="w-full px-8 py-4 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          'Saving...'
        ) : (
          <>
            Continue
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>
    </div>
  );
}