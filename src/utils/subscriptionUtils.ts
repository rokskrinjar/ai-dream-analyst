import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionPlan {
  id: string;
  name: string;
  ai_credits_monthly: number;
}

export interface UserSubscription {
  plan_id: string;
  status: string;
  subscription_plans: SubscriptionPlan;
}

export const getUserSubscriptionPlan = async (userId: string): Promise<SubscriptionPlan | null> => {
  try {
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select(`
        plan_id,
        status,
        subscription_plans!inner(
          id,
          name,
          ai_credits_monthly
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error || !subscription) {
      // Return free plan if no active subscription
      return {
        id: 'free',
        name: 'Free',
        ai_credits_monthly: 5
      };
    }

    return subscription.subscription_plans;
  } catch (error) {
    console.error('Error fetching subscription plan:', error);
    // Return free plan on error
    return {
      id: 'free',
      name: 'Free',
      ai_credits_monthly: 5
    };
  }
};

export const isPremiumUser = (plan: SubscriptionPlan | null): boolean => {
  if (!plan) return false;
  return plan.name.toLowerCase() !== 'free';
};

export const truncateRecommendations = (recommendations: string): { 
  fullText: string; 
  truncatedText: string; 
  fadedLine: string; 
  hasMore: boolean; 
} => {
  const lines = recommendations.split('\n').filter(line => line.trim() !== '');
  
  if (lines.length <= 2) {
    return {
      fullText: recommendations,
      truncatedText: recommendations,
      fadedLine: '',
      hasMore: false
    };
  }
  
  const truncatedText = lines.slice(0, 2).join('\n');
  const fadedLine = lines[2] || '';
  
  return {
    fullText: recommendations,
    truncatedText,
    fadedLine,
    hasMore: lines.length > 3
  };
};