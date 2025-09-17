import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Coins, Zap, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface UserCredits {
  credits_remaining: number;
  credits_used_this_month: number;
}

interface SubscriptionPlan {
  name: string;
  ai_credits_monthly: number;
}

export function CreditDisplay() {
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
      // Fetch user credits
      const { data: creditsData, error: creditsError } = await supabase
        .from('user_credits')
        .select('credits_remaining, credits_used_this_month')
        .eq('user_id', user.id)
        .single();

      if (creditsError && creditsError.code !== 'PGRST116') {
        // If no credits record exists, create one with default values
        setCredits({ credits_remaining: 5, credits_used_this_month: 0 });
      } else {
        setCredits(creditsData);
      }

      // Fetch user's current plan
      const { data: subscriptionData, error: subError } = await supabase
        .from('user_subscriptions')
        .select(`
          subscription_plans (
            name,
            ai_credits_monthly
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (subError && subError.code !== 'PGRST116') {
        // Default to free plan
        setPlan({ name: 'Brezplačni', ai_credits_monthly: 5 });
      } else {
        setPlan(subscriptionData.subscription_plans);
      }

    } catch (error) {
      console.error('Error fetching credit data:', error);
      setCredits({ credits_remaining: 5, credits_used_this_month: 0 });
      setPlan({ name: 'Brezplačni', ai_credits_monthly: 5 });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !credits || !plan) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-2 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isUnlimited = plan.ai_credits_monthly === -1;
  const totalCredits = isUnlimited ? 999999 : plan.ai_credits_monthly;
  const usagePercent = isUnlimited ? 0 : (credits.credits_used_this_month / totalCredits) * 100;
  const isLowCredits = !isUnlimited && credits.credits_remaining < totalCredits * 0.2;

  return (
    <Card className={isLowCredits ? "border-orange-200 bg-orange-50" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center space-x-2">
            <Coins className="w-5 h-5 text-primary" />
            <span>Krediti AI</span>
          </div>
          <Badge variant={isLowCredits ? "destructive" : "secondary"}>
            {plan.name}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">
              {isUnlimited ? '∞' : credits.credits_remaining}
            </p>
            <p className="text-sm text-muted-foreground">
              {isUnlimited ? 'Neomejeno' : 'preostalih kreditov'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg text-muted-foreground">
              {credits.credits_used_this_month} / {isUnlimited ? '∞' : totalCredits}
            </p>
            <p className="text-sm text-muted-foreground">uporabljenih ta mesec</p>
          </div>
        </div>

        {!isUnlimited && (
          <div className="space-y-2">
            <Progress value={usagePercent} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {Math.round(usagePercent)}% uporabljenih
            </p>
          </div>
        )}

        {isLowCredits && (
          <div className="flex items-center space-x-2 p-3 bg-orange-100 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <p className="text-sm text-orange-800">
              Ostaja vam malo kreditov. Razmislite o nadgradnji!
            </p>
          </div>
        )}

        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/account')}
            className="flex-1"
          >
            Podrobnosti
          </Button>
          {!isUnlimited && (
            <Button 
              size="sm" 
              onClick={() => navigate('/pricing')}
              className="flex-1"
            >
              <Zap className="w-4 h-4 mr-1" />
              Nadgradi
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}