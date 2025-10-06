import { useAuth } from "@/contexts/AuthContext";
import { useCreditContext } from "@/contexts/CreditContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, CreditCard, Calendar, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AppHeader } from "@/components/AppHeader";

interface UserSubscription {
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price_monthly: number;
  ai_credits_monthly: number;
}

export default function Account() {
  const { user, signOut } = useAuth();
  const { credits, plan, loading: creditsLoading, isUnlimited } = useCreditContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchSubscriptionData();
  }, [user, navigate]);

  const fetchSubscriptionData = async () => {
    if (!user) return;

    try {
      // Fetch user subscription
      const { data: subData, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (subError && subError.code !== 'PGRST116') throw subError;

      if (subData) {
        setSubscription(subData);

        // Fetch plan details
        const { data: planData, error: planError } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', subData.plan_id)
          .single();

        if (planError) throw planError;
        setSubscriptionPlan(planData);
      }

    } catch (error) {
      console.error('Error fetching subscription data:', error);
      toast({
        title: "Napaka",
        description: "Napaka pri nalaganju podatkov o naročnini.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sl-SI', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };


  if (!user) {
    return null;
  }

  if (loading || creditsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader showBackButton title="Moj račun" subtitle="Upravljajte svoj profil in naročnino" />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Profile Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Profil</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">E-pošta</label>
                <p className="text-foreground">{user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Registriran</label>
                <p className="text-foreground">{formatDate(user.created_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credits Overview */}
        {credits && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
                <span>Krediti</span>
              </CardTitle>
              <CardDescription>
                Vaš mesečni pregled kreditov za AI analize
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">{credits.credits_remaining}</p>
                  <p className="text-sm text-muted-foreground">Preostali krediti</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-foreground">{credits.credits_used_this_month}</p>
                  <p className="text-sm text-muted-foreground">Uporabljeni ta mesec</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-foreground">
                    {isUnlimited ? '∞' : plan?.ai_credits_monthly || 5}
                  </p>
                  <p className="text-sm text-muted-foreground">Mesečna kvota</p>
                </div>
              </div>
              <Separator className="my-4" />
              <p className="text-sm text-muted-foreground">
                Zadnja obnovitev: {credits?.last_reset_date ? formatDate(credits.last_reset_date) : 'N/A'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Subscription Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>Naročnina</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subscriptionPlan && subscription ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{subscriptionPlan.name}</h3>
                    <p className="text-muted-foreground">€{subscriptionPlan.price_monthly}/mesec</p>
                  </div>
                  <Badge 
                    variant={subscription.status === 'active' ? 'default' : 'secondary'}
                  >
                    {subscription.status === 'active' ? 'Aktivno' : subscription.status}
                  </Badge>
                </div>
                
                <Separator />
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Začetek obdobja</label>
                    <p className="text-foreground">{formatDate(subscription.current_period_start)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Konec obdobja</label>
                    <p className="text-foreground">{formatDate(subscription.current_period_end)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => navigate('/pricing')}>
                    Spremeni načrt
                  </Button>
                  <Button variant="outline">
                    Upravljaj plačila
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <h3 className="text-lg font-semibold text-foreground mb-2">Brezplačni načrt</h3>
                <p className="text-muted-foreground mb-4">
                  Trenutno uporabljate brezplačni načrt z 5 krediti na mesec.
                </p>
                <Button onClick={() => navigate('/pricing')}>
                  Nadgradi na plačljivi načrt
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Zgodovina uporabe</span>
            </CardTitle>
            <CardDescription>
              Pregled vaših zadnjih AI analiz
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>Zgodovina uporabe bo prikazana tukaj</p>
              <p className="text-sm mt-2">Funkcija bo kmalu na voljo</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}