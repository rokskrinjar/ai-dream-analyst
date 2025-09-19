import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  ai_credits_monthly: number;
  features: any; // Can be string[] or Json from Supabase
  stripe_price_id_monthly: string;
  stripe_price_id_yearly: string;
}

interface UserSubscription {
  plan_id: string;
  status: string;
}

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  useEffect(() => {
    fetchPricingData();
  }, [user]);

  const fetchPricingData = async () => {
    try {
      // Fetch subscription plans
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (plansError) throw plansError;

      // Fetch user's current subscription if logged in
      if (user) {
        const { data: subData, error: subError } = await supabase
          .from('user_subscriptions')
          .select('plan_id, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (subError && subError.code !== 'PGRST116') throw subError;
        setUserSubscription(subData);
      }

      setPlans(plansData || []);
    } catch (error) {
      console.error('Error fetching pricing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlanIcon = (planName: string) => {
    if (planName.toLowerCase().includes('premium')) return Crown;
    if (planName.toLowerCase().includes('basic')) return Zap;
    return Heart;
  };

  const isCurrentPlan = (planId: string) => {
    return userSubscription?.plan_id === planId;
  };

  const handlePlanSelection = async (plan: SubscriptionPlan) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (isCurrentPlan(plan.id)) {
      navigate('/account');
      return;
    }

    // Handle free plan selection
    if (plan.name.toLowerCase() === 'free') {
      navigate('/account');
      return;
    }
    
    console.log('Starting plan selection for:', plan.name, 'ID:', plan.id);
    setProcessingPlanId(plan.id);
    
    try {
      console.log('Calling create-checkout-session...');
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { planId: plan.id }
      });

      console.log('Response:', { data, error });

      if (error) {
        console.error('Error creating checkout session:', error);
        alert('Napaka pri ustvarjanju plačila. Poskusite znova.');
        return;
      }

      if (!data || !data.sessionUrl) {
        console.error('Invalid response - missing sessionUrl:', data);
        alert('Napaka pri ustvarjanju plačila. Poskusite znova.');
        return;
      }

      console.log('Redirecting to:', data.sessionUrl);
      
      // Add a small delay to ensure UI updates, then redirect
      setTimeout(() => {
        window.location.href = data.sessionUrl;
      }, 100);
      
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('Nepričakovana napaka. Poskusite znova.');
    } finally {
      // Reset processing state after a delay to prevent UI flicker
      setTimeout(() => {
        setProcessingPlanId(null);
      }, 1000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate('/')}>
                ← Nazaj
              </Button>
              <h1 className="text-2xl font-bold text-foreground">Naročnine</h1>
            </div>
            {user && (
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Nadzorna plošča
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Izberi svoj načrt analize sanj
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Začni z brezplačnim načrtom ali nadgradi za neomejene analize z AI. 
            Vsak načrt vključuje zmožne analize s pomočjo umetne inteligence.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => {
              const Icon = getPlanIcon(plan.name);
              const isPopular = plan.name.toLowerCase().includes('basic');
              const isCurrent = isCurrentPlan(plan.id);
              const isUnlimited = plan.ai_credits_monthly === -1;

              return (
                <Card key={plan.id} className={`relative ${isPopular ? 'border-primary' : 'border-border'}`}>
                  {isPopular && (
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                      Najpopularnejši
                    </Badge>
                  )}
                  {isCurrent && (
                    <Badge className="absolute -top-3 right-4 bg-green-500 text-white">
                      Trenutni načrt
                    </Badge>
                  )}
                  
                  <CardHeader className="text-center pb-8">
                    <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground">{plan.name}</CardTitle>
                    <CardDescription className="text-muted-foreground">{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-foreground">€{plan.price_monthly}</span>
                      <span className="text-muted-foreground">/mesec</span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-lg font-semibold text-foreground">
                        {isUnlimited ? 'Neomejeno' : plan.ai_credits_monthly} kreditov/mesec
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isUnlimited ? 'Analiziraj koliko koli sanj' : 'za AI analize sanj'}
                      </p>
                    </div>

                    <ul className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center space-x-3">
                          <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                          <span className="text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter>
                    <Button 
                      className="w-full" 
                      variant={isCurrent ? "outline" : (isPopular ? "default" : "outline")}
                      onClick={() => handlePlanSelection(plan)}
                      disabled={processingPlanId === plan.id}
                    >
                      {processingPlanId === plan.id ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                          <span>Obdelavam...</span>
                        </div>
                      ) : (
                        isCurrent ? 'Upravljaj naročnino' : 'Izberi načrt'
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold text-center text-foreground mb-12">
            Pogosto zastavljena vprašanja
          </h3>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-2">
                Kaj so krediti?
              </h4>
              <p className="text-muted-foreground">
                Krediti so enote, ki jih porabite za AI analize sanj. Vsaka analiza sanj porabi 1 kredit, 
                analiza vzorcev pa 2 kredita.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-2">
                Se krediti prenašajo na naslednji mesec?
              </h4>
              <p className="text-muted-foreground">
                Ne, krediti se ponastavijo vsak mesec. Priporočamo, da jih uporabite v tekočem mesecu.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-2">
                Lahko prekličem kadarkoli?
              </h4>
              <p className="text-muted-foreground">
                Da, lahko prekličete svojo naročnino kadarkoli brez dodatnih stroškov. 
                Dostop boste imeli do konca plačane periode.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-2">
                Kaj vključuje AI analiza?
              </h4>
              <p className="text-muted-foreground">
                AI analiza vključuje prepoznavanje tem, čustev, simbolov ter personalizirane 
                priporočke za razumevanje vaših sanj.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}