import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getUserSubscriptionPlan, type SubscriptionPlan } from "@/utils/subscriptionUtils";

interface UserCredits {
  credits_remaining: number;
  credits_used_this_month: number;
}

export const CompactCreditDisplay: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCreditData();
    }
  }, [user]);

  const fetchCreditData = async () => {
    if (!user) return;

    try {
      // Fetch credits
      const { data: creditsData } = await supabase
        .from('user_credits')
        .select('credits_remaining, credits_used_this_month')
        .eq('user_id', user.id)
        .single();

      if (creditsData) {
        setCredits(creditsData);
      } else {
        // Default credits for new users
        setCredits({ credits_remaining: 5, credits_used_this_month: 0 });
      }

      // Fetch subscription plan
      const subscriptionPlan = await getUserSubscriptionPlan(user.id);
      setPlan(subscriptionPlan);
    } catch (error) {
      console.error('Error fetching credit data:', error);
      setCredits({ credits_remaining: 5, credits_used_this_month: 0 });
      setPlan({ id: 'free', name: 'Free', ai_credits_monthly: 5 });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !credits || !plan) {
    return null;
  }

  const isUnlimited = plan.ai_credits_monthly === -1;
  const totalCredits = isUnlimited ? 'neomejeno' : plan.ai_credits_monthly;
  const remaining = isUnlimited ? 'neomejeno' : credits.credits_remaining;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">
        Krediti AI ({remaining}/{totalCredits} na voljo)
      </span>
      {!isUnlimited && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate('/pricing')}
          className="h-8 px-3 text-xs"
        >
          Nadgradi
        </Button>
      )}
    </div>
  );
};