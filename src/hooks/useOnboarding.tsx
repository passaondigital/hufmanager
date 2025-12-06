import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface OnboardingState {
  isLoading: boolean;
  showOnboarding: boolean;
  completeOnboarding: () => Promise<void>;
}

export function useOnboarding(): OnboardingState {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) {
        setIsLoading(false);
        setShowOnboarding(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking onboarding status:', error);
          setShowOnboarding(false);
        } else {
          // Show onboarding if not completed
          setShowOnboarding(data?.onboarding_completed === false);
        }
      } catch (err) {
        console.error('Error:', err);
        setShowOnboarding(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [user]);

  const completeOnboarding = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      if (error) {
        console.error('Error completing onboarding:', error);
      } else {
        setShowOnboarding(false);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  }, [user]);

  return {
    isLoading,
    showOnboarding,
    completeOnboarding,
  };
}
