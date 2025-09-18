import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getUserSubscriptionPlan, type SubscriptionPlan } from '@/utils/subscriptionUtils';

interface UserCredits {
  credits_remaining: number;
  credits_used_this_month: number;
  last_reset_date: string;
}

interface CreditContextType {
  credits: UserCredits | null;
  plan: SubscriptionPlan | null;
  loading: boolean;
  lastUpdated: Date | null;
  refreshCredits: () => Promise<void>;
  deductCredits: (amount: number) => Promise<boolean>;
  isUnlimited: boolean;
}

const CreditContext = createContext<CreditContextType | undefined>(undefined);

export const useCreditContext = () => {
  const context = useContext(CreditContext);
  if (context === undefined) {
    throw new Error('useCreditContext must be used within a CreditProvider');
  }
  return context;
};

interface CreditProviderProps {
  children: React.ReactNode;
}

export const CreditProvider: React.FC<CreditProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Calculate if user has unlimited credits
  const isUnlimited = plan?.ai_credits_monthly === -1;

  const fetchCredits = useCallback(async () => {
    if (!user) {
      setCredits(null);
      setPlan(null);
      setLoading(false);
      return;
    }

    try {
      // Reset credits if needed (monthly reset)
      await supabase.rpc('reset_credits_if_needed', { user_id: user.id });

      // Fetch user credits
      const { data: creditsData, error: creditsError } = await supabase
        .from('user_credits')
        .select('credits_remaining, credits_used_this_month, last_reset_date')
        .eq('user_id', user.id)
        .single();

      if (creditsError && creditsError.code !== 'PGRST116') {
        console.error('Error fetching credits:', creditsError);
        // Set default values for new users
        setCredits({ 
          credits_remaining: 5, 
          credits_used_this_month: 0,
          last_reset_date: new Date().toISOString().split('T')[0]
        });
      } else if (creditsData) {
        setCredits(creditsData);
      } else {
        // Create default credits record for new users
        setCredits({ 
          credits_remaining: 5, 
          credits_used_this_month: 0,
          last_reset_date: new Date().toISOString().split('T')[0]
        });
      }

      // Fetch subscription plan
      const subscriptionPlan = await getUserSubscriptionPlan(user.id);
      setPlan(subscriptionPlan);

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching credit data:', error);
      // Set fallback values
      setCredits({ 
        credits_remaining: 5, 
        credits_used_this_month: 0,
        last_reset_date: new Date().toISOString().split('T')[0]
      });
      setPlan({ id: 'free', name: 'Free', ai_credits_monthly: 5 });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refreshCredits = useCallback(async () => {
    setLoading(true);
    await fetchCredits();
  }, [fetchCredits]);

  const deductCredits = useCallback(async (amount: number): Promise<boolean> => {
    if (!user || !credits) return false;

    // Check if unlimited plan
    if (isUnlimited) return true;

    // Optimistic update
    const newCreditsRemaining = credits.credits_remaining - amount;
    const newCreditsUsed = credits.credits_used_this_month + amount;

    if (newCreditsRemaining < 0) return false;

    // Update local state immediately for better UX
    setCredits(prev => prev ? {
      ...prev,
      credits_remaining: newCreditsRemaining,
      credits_used_this_month: newCreditsUsed
    } : null);

    try {
      // Update database
      const { error } = await supabase
        .from('user_credits')
        .update({
          credits_remaining: newCreditsRemaining,
          credits_used_this_month: newCreditsUsed,
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating credits:', error);
        // Rollback on error
        await refreshCredits();
        return false;
      }

      // Log usage
      await supabase
        .from('usage_logs')
        .insert({
          user_id: user.id,
          action_type: 'dream_analysis',
          credits_used: amount
        });

      setLastUpdated(new Date());
      return true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      // Rollback on error
      await refreshCredits();
      return false;
    }
  }, [user, credits, isUnlimited, refreshCredits]);

  // Initial load and user change effect
  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  // Real-time subscription to credit changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user-credits-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_credits',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Credits updated in real-time:', payload);
          // Refresh credits when they change in the database
          fetchCredits();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchCredits]);

  const value: CreditContextType = {
    credits,
    plan,
    loading,
    lastUpdated,
    refreshCredits,
    deductCredits,
    isUnlimited,
  };

  return (
    <CreditContext.Provider value={value}>
      {children}
    </CreditContext.Provider>
  );
};