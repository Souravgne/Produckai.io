import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl ? 'present' : 'missing',
    key: supabaseAnonKey ? 'present' : 'missing'
  });
  throw new Error('Missing Supabase environment variables');
}

// Custom storage implementation with enhanced error handling
const customStorage = {
  getItem: (key: string): string | null => {
    try {
      const item = localStorage.getItem(key);
      // Additional validation to ensure we don't return invalid/corrupted tokens
      if (item && (key.includes('access_token') || key.includes('refresh_token'))) {
        JSON.parse(item); // Validate JSON structure
      }
      return item;
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      // If there's an error with token storage, clear it to prevent invalid states
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error('Error clearing invalid token:', e);
      }
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('Error setting localStorage:', error);
      // Attempt to clear storage if we can't set new items
      try {
        localStorage.clear();
      } catch (e) {
        console.error('Error clearing localStorage:', e);
      }
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token',
    storage: customStorage
  }
});