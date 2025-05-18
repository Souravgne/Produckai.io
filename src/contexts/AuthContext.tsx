import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const handleAuthError = async (error: Error) => {
    const errorMessage = error.message.toLowerCase();
    if (
      errorMessage.includes('invalid refresh token') ||
      errorMessage.includes('refresh_token_not_found')
    ) {
      console.error('Invalid refresh token detected, clearing session');
      try {
        // Clear any stored tokens
        localStorage.removeItem('supabase.auth.token');
        // Sign out the user
        await supabase.auth.signOut();
        setUser(null);
      } catch (e) {
        console.error('Error during cleanup:', e);
      }
    } else {
      console.error('Auth error:', error);
    }
  };

  useEffect(() => {
    // Check active sessions and sets the user
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          await handleAuthError(error);
        } else {
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        await handleAuthError(error as Error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
          setUser(session?.user ?? null);
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setUser(null);
          // Clear any remaining auth data
          localStorage.removeItem('supabase.auth.token');
        } else {
          setUser(session?.user ?? null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}