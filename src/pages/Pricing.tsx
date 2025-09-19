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
  const [debugMode, setDebugMode] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    fetchPricingData();
  }, [user]);

  const fetchPricingData = async () => {
    console.log('🔄 Fetching pricing data...');
    try {
      // Fetch subscription plans
      console.log('Fetching subscription plans...');
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      console.log('Plans query result:', { plansData, plansError });

      if (plansError) throw plansError;

      // Fetch user's current subscription if logged in
      if (user) {
        console.log('Fetching user subscription for user:', user.id);
        const { data: subData, error: subError } = await supabase
          .from('user_subscriptions')
          .select('plan_id, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        console.log('Subscription query result:', { subData, subError });

        if (subError && subError.code !== 'PGRST116') throw subError;
        setUserSubscription(subData);
      }

      console.log('✅ Successfully loaded:', {
        plans: plansData?.length || 0,
        userSubscription: user ? 'checked' : 'skipped'
      });

      setPlans(plansData || []);
    } catch (error) {
      console.error('❌ Error fetching pricing data:', error);
      setLastError(`Data loading error: ${error.message}`);
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
    setLastError(null);
    
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
    
    // Enhanced logging
    console.group('🚀 Plan Selection Process');
    console.log('Plan details:', {
      id: plan.id,
      name: plan.name,
      price: plan.price_monthly,
      stripeId: plan.stripe_price_id_monthly
    });
    console.log('User ID:', user.id);
    console.log('Current URL:', window.location.href);
    console.log('User agent:', navigator.userAgent);
    
    setProcessingPlanId(plan.id);
    
    try {
      console.log('🔄 Invoking create-checkout-session edge function...');
      const startTime = Date.now();
      
      const requestPayload = { planId: plan.id };
      console.log('🛒 Request payload:', requestPayload);
      
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: requestPayload,
      });

      const duration = Date.now() - startTime;
      console.log(`⏱️ Request completed in ${duration}ms`);
      console.log('Full response object:', { data, error, duration });
      
      // Detailed error analysis
      if (error) {
        console.error('❌ Edge function error:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        setLastError(`Edge function error: ${error.message || 'Unknown error'}`);
        alert(`Napaka pri ustvarjanju plačila: ${error.message || 'Poskusite znova.'}`);
        return;
      }

      // Enhanced response validation
      console.log('✅ Response validation starting...');
      if (!data) {
        console.error('❌ No data in response');
        setLastError('No data received from server');
        alert('Napaka: Ni podatkov s strežnika. Poskusite znova.');
        return;
      }

      console.log('Data object keys:', Object.keys(data));
      console.log('SessionUrl present:', !!data.sessionUrl);
      console.log('SessionUrl value:', data.sessionUrl);
      console.log('SessionUrl type:', typeof data.sessionUrl);

      if (!data.sessionUrl) {
        console.error('❌ Missing sessionUrl in response');
        console.error('Available keys:', Object.keys(data));
        setLastError('Missing sessionUrl in server response');
        alert('Napaka: Manjka URL za plačilo. Poskusite znova.');
        return;
      }

      // URL validation
      try {
        const url = new URL(data.sessionUrl);
        console.log('✅ Valid URL:', {
          origin: url.origin,
          pathname: url.pathname,
          protocol: url.protocol
        });
      } catch (urlError) {
        console.error('❌ Invalid URL format:', data.sessionUrl);
        setLastError(`Invalid URL format: ${data.sessionUrl}`);
        alert('Napaka: Neveljaven URL za plačilo. Poskusite znova.');
        return;
      }

      console.log('🎯 Attempting redirect to:', data.sessionUrl);
      
      // Multiple redirect attempts with fallbacks
      let redirectSuccess = false;
      
      // Method 1: Direct assignment (most common)
      try {
        console.log('Method 1: Direct window.location.href assignment');
        window.location.href = data.sessionUrl;
        redirectSuccess = true;
        console.log('✅ Direct assignment initiated');
      } catch (redirectError) {
        console.error('❌ Method 1 failed:', redirectError);
      }
      
      // Method 2: window.open as fallback
      if (!redirectSuccess) {
        setTimeout(() => {
          try {
            console.log('Method 2: window.open fallback');
            const newWindow = window.open(data.sessionUrl, '_self');
            if (newWindow) {
              console.log('✅ window.open initiated');
            } else {
              console.error('❌ window.open blocked');
              setLastError('Popup blocked - please allow popups and try again');
              alert('Preusmerjanje je bilo blokirano. Prosimo omogočite popup okna in poskusite znova.');
            }
          } catch (openError) {
            console.error('❌ Method 2 failed:', openError);
            // Method 3: Manual copy/paste option
            setLastError(`Redirect failed: ${data.sessionUrl}`);
            if (confirm(`Avtomatična preusmeritev ni uspela. Kopiraj URL in odpri v novem zavihku?\n\n${data.sessionUrl}`)) {
              navigator.clipboard?.writeText(data.sessionUrl);
            }
          }
        }, 100);
      }
      
    } catch (error) {
      console.error('💥 Unexpected error in handlePlanSelection:', error);
      console.error('Error stack:', error.stack);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      
      setLastError(`Unexpected error: ${error.message}`);
      alert(`Nepričakovana napaka: ${error.message}. Preverite konzolo za podrobnosti.`);
    } finally {
      console.groupEnd();
      // Reset processing state after a delay
      setTimeout(() => {
        setProcessingPlanId(null);
      }, 1000);
    }
  };

  // Debug helper function
  const toggleDebugMode = () => {
    setDebugMode(!debugMode);
    console.log('Debug mode:', !debugMode ? 'ON' : 'OFF');
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
              <div className="flex items-center space-x-2">
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  Nadzorna plošča
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={toggleDebugMode}
                  className="text-xs"
                >
                  {debugMode ? '🐛 ON' : '🐛 OFF'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Debug and Error Display */}
      {(debugMode || lastError) && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="container mx-auto">
            {lastError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 rounded">
                <h4 className="font-semibold text-red-800">Last Error:</h4>
                <p className="text-red-700 text-sm">{lastError}</p>
              </div>
            )}
            {debugMode && (
              <div className="space-y-2 text-sm">
                <h4 className="font-semibold">Debug Information:</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>User ID:</strong> {user?.id || 'Not logged in'}
                  </div>
                  <div>
                    <strong>Current URL:</strong> {window.location.href}
                  </div>
                  <div>
                    <strong>User Agent:</strong> {navigator.userAgent.substring(0, 50)}...
                  </div>
                  <div>
                    <strong>Plans Loaded:</strong> {plans.length}
                  </div>
                  <div>
                    <strong>Processing Plan:</strong> {processingPlanId || 'None'}
                  </div>
                  <div>
                    <strong>User Subscription:</strong> {userSubscription?.plan_id || 'None'}
                  </div>
                </div>
                <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                  <strong>Console Instructions:</strong> Open browser DevTools (F12) → Console tab to see detailed logs
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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