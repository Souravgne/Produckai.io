import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface OnboardingContextType {
  currentStep: string;
  setCurrentStep: (step: string) => void;
  completeStep: (step: string) => Promise<void>;
  skipOnboarding: () => Promise<void>;
  hasCompletedOnboarding: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [currentStep, setCurrentStep] = useState('welcome');
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    // Check if user has completed onboarding
    const checkOnboardingStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check if user has completed any onboarding steps
        const { data: onboardingProgress, error } = await supabase
          .from('onboarding_progress')
          .select('*')
          .eq('user_id', user.id);

        if (error) throw error;

        // If user has completed any steps, they've started onboarding
        if (onboardingProgress && onboardingProgress.length > 0) {
          // Check if all required steps are completed
          const requiredSteps = ['welcome', 'profile_setup', 'product_details', 'product_themes', 'data_sources'];
          const completedRequiredSteps = onboardingProgress
            .filter(step => requiredSteps.includes(step.step_name) && step.completed)
            .length;

          // If all required steps are completed, mark onboarding as complete
          if (completedRequiredSteps === requiredSteps.length) {
            setHasCompletedOnboarding(true);
          }
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };

    checkOnboardingStatus();
  }, []);

  const completeStep = async (step: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // First try to get existing progress
      const { data: existingProgress } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('step_name', step)
        .maybeSingle();

      if (existingProgress) {
        // Update existing progress
        const { error } = await supabase
          .from('onboarding_progress')
          .update({ 
            completed: true,
            completed_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('step_name', step);

        if (error) throw error;
      } else {
        // Create new progress entry
        const { error } = await supabase
          .from('onboarding_progress')
          .insert({
            user_id: user.id,
            step_name: step,
            completed: true,
            completed_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      // Check if all required steps are completed
      const requiredSteps = ['welcome', 'profile_setup', 'product_details', 'product_themes', 'data_sources'];
      if (requiredSteps.includes(step)) {
        const { data: completedSteps } = await supabase
          .from('onboarding_progress')
          .select('step_name')
          .eq('user_id', user.id)
          .eq('completed', true);
          
        const completedRequiredSteps = completedSteps
          ? completedSteps.filter(s => requiredSteps.includes(s.step_name)).length
          : 0;
          
        if (completedRequiredSteps === requiredSteps.length) {
          setHasCompletedOnboarding(true);
        }
      }
    } catch (error) {
      console.error('Error completing step:', error);
      throw error;
    }
  };

  const skipOnboarding = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Get all possible steps
      const steps = ['welcome', 'role', 'integrations', 'product_areas', 'pod_setup', 
                     'profile_setup', 'product_details', 'product_themes', 'data_sources'];

      // Create or update progress for all steps
      const promises = steps.map(async (step) => {
        const { data: existingProgress } = await supabase
          .from('onboarding_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('step_name', step)
          .maybeSingle();

        if (existingProgress) {
          return supabase
            .from('onboarding_progress')
            .update({ 
              completed: true,
              completed_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .eq('step_name', step);
        } else {
          return supabase
            .from('onboarding_progress')
            .insert({
              user_id: user.id,
              step_name: step,
              completed: true,
              completed_at: new Date().toISOString()
            });
        }
      });

      await Promise.all(promises);
      setHasCompletedOnboarding(true);
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      throw error;
    }
  };

  return (
    <OnboardingContext.Provider value={{ 
      currentStep,
      setCurrentStep,
      completeStep,
      skipOnboarding,
      hasCompletedOnboarding
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}