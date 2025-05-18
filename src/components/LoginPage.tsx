import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import Logo from './Logo';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isBusinessEmail = (email: string) => {
    if (!email) return false;
    
    const commonPersonalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'];
    const domain = email.split('@')[1]?.toLowerCase();
    
    if (!domain) return false;
    return !commonPersonalDomains.includes(domain);
  };

  const validateInput = () => {
    if (!email) {
      setError('Email is required');
      return false;
    }
    
    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!isBusinessEmail(email)) {
      setError('Please use a business email address');
      return false;
    }

    if (!showResetPassword && !password) {
      setError('Password is required');
      return false;
    }

    if (!showResetPassword && password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    return true;
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateInput()) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      console.log('Attempting login with email:', email.trim());

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (signInError) {
        if (signInError.message === 'Invalid login credentials') {
          setError('Invalid email or password. Please try again or reset your password.');
        } else {
          setError(signInError.message);
        }
        return;
      }

      if (!data.user) {
        setError('No user data received');
        return;
      }

      navigate('/onboarding/welcome', { replace: true });
    } catch (error) {
      console.error('Unexpected error during login:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setError('');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            hd: '*' // This restricts to Google Workspace domains (business accounts)
          },
          redirectTo: `${window.location.origin}/onboarding/welcome`
        }
      });

      if (error) {
        setError(error.message);
        return;
      }

      // The user will be redirected to Google for authentication
      // No need to navigate here as the redirectTo option handles it
    } catch (error) {
      console.error('Error with Google sign in:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateInput()) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setResetSent(true);
    } catch (error) {
      console.error('Error sending password reset:', error);
      setError(error instanceof Error ? error.message : 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex items-center justify-center mb-12">
          <Logo size="lg" className="w-32 h-32" />
        </div>
        
        <p className="text-center text-xl text-gray-600 mb-12">
          Turn scattered customer feedback into actionable product strategy
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4 flex items-center text-red-700">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {resetSent ? (
            <div className="text-center">
              <div className="mb-4 text-green-600">
                Password reset instructions have been sent to your email.
              </div>
              <button
                onClick={() => {
                  setShowResetPassword(false);
                  setResetSent(false);
                }}
                className="text-[#00A0C1] hover:text-[#008a9a] font-medium"
              >
                Return to login
              </button>
            </div>
          ) : (
            <form onSubmit={showResetPassword ? handlePasswordReset : handleEmailLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Business Email
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#00A0C1] focus:border-[#00A0C1] sm:text-sm"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                  />
                </div>
              </div>

              {!showResetPassword && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#00A0C1] focus:border-[#00A0C1] sm:text-sm"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                      }}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#00A0C1] hover:bg-[#008a9a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00A0C1] disabled:opacity-50 gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {showResetPassword ? 'Send Reset Instructions' : 'Sign in'}
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                  className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00A0C1] disabled:opacity-50 gap-2"
                >
                  {googleLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                    </svg>
                  )}
                  <span>Sign in with Google Workspace</span>
                </button>
                <p className="mt-2 text-xs text-center text-gray-500">
                  Only business Google accounts are supported
                </p>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPassword(!showResetPassword);
                    setError('');
                  }}
                  className="text-[#00A0C1] hover:text-[#008a9a] font-medium"
                >
                  {showResetPassword ? 'Back to login' : 'Forgot your password?'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}