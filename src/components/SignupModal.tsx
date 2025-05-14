import React, { useState } from 'react';
import { X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Logo from './Logo';

interface SignupModalProps {
  onClose: () => void;
}

export default function SignupModal({ onClose }: SignupModalProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    company: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const isBusinessEmail = (email: string) => {
    if (!email) return false;
    
    const commonPersonalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'];
    const domain = email.split('@')[1]?.toLowerCase();
    
    if (!domain) return false;
    return !commonPersonalDomains.includes(domain);
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return false;
    }
    
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    
    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!isBusinessEmail(formData.email)) {
      setError('Please use a business email address');
      return false;
    }
    
    if (!formData.company.trim()) {
      setError('Company name is required');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Generate a random password for the user
      const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
      
      // Create user account
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: tempPassword,
        options: {
          data: {
            full_name: formData.fullName.trim(),
            company: formData.company.trim()
          }
        }
      });
      
      if (signUpError) throw signUpError;
      
      if (!data.user) {
        throw new Error('Failed to create account');
      }
      
      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          full_name: formData.fullName.trim(),
          role: 'Product Manager', // Default role
          department: 'Product' // Default department
        });
      
      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Continue anyway as the auth account was created
      }
      
      setSuccess(true);
      
      // Clear form
      setFormData({
        fullName: '',
        email: '',
        company: ''
      });
      
      // Close modal after delay
      setTimeout(() => {
        onClose();
      }, 3000);
      
    } catch (error) {
      console.error('Error during signup:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="text-center mb-6">
          <Logo size="md" className="mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Get Started with ProduckAI</h2>
          <p className="text-gray-600 mt-2">
            Join Product led companies to transform scattered customer feedback and build what matters!
          </p>
        </div>
        
        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 mb-6">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-green-800">Account created successfully!</h3>
              <p className="text-green-700 text-sm mt-1">
                Please check your email to verify your account and set your password.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-red-700">{error}</div>
              </div>
            )}
            
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A4B8] focus:border-transparent"
                placeholder="Your full name"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Business Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A4B8] focus:border-transparent"
                placeholder="you@company.com"
              />
            </div>
            
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                Company
              </label>
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A4B8] focus:border-transparent"
                placeholder="Your company name"
              />
            </div>
            
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#00A4B8] text-white rounded-lg hover:bg-[#008a9a] transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Free Account'
                )}
              </button>
            </div>
            
            <p className="text-xs text-gray-500 text-center mt-4">
              By signing up, you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}