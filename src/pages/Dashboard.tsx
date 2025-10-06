import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCreditContext } from '@/contexts/CreditContext';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { AppHeader } from '@/components/AppHeader';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isPremiumUser, truncateRecommendations } from '@/utils/subscriptionUtils';
import { 
  Calendar, 
  Brain, 
  BarChart3, 
  PlusCircle, 
  ChevronDown, 
  ChevronRight, 
  Lightbulb,
  User,
  LogOut,
  TrendingUp,
  BookOpen,
  Sparkles,
  Settings,
  Shield,
  CreditCard,
  Plus,
  Loader2,
  Eye,
  Heart,
  MessageCircleQuestion,
  Menu,
  Pencil,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DreamActivityCalendar } from '@/components/DreamActivityCalendar';
import { CompactCreditDisplay } from '@/components/CompactCreditDisplay';
import { CreditDisplay } from '@/components/CreditDisplay';
import { CreditUsageModal } from '@/components/CreditUsageModal';
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';
import dreamBg1 from '@/assets/dream-bg-1.jpg';
import dreamBg2 from '@/assets/dream-bg-2.jpg';
import dreamBg3 from '@/assets/dream-bg-3.jpg';
import dreamBg4 from '@/assets/dream-bg-4.jpg';

interface Dream {
  id: string;
  title: string;
  content: string;
  dream_date: string;
  mood?: string;
  created_at: string;
}

interface DreamAnalysis {
  id: string;
  dream_id: string;
  themes: string[];
  emotions: string[];
  symbols: string[];
  analysis_text: string;
  recommendations: string;
  reflection_questions?: string[];
  created_at: string;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { credits, plan, refreshCredits, deductCredits, isUnlimited } = useCreditContext();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [analyses, setAnalyses] = useState<{ [key: string]: DreamAnalysis }>({});
  const [allDreams, setAllDreams] = useState<Dream[]>([]);
  const [allAnalyses, setAllAnalyses] = useState<{ [key: string]: DreamAnalysis }>({});
  const [loading, setLoading] = useState(true);
  const [analyzingDreams, setAnalyzingDreams] = useState<Set<string>>(new Set());
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState<string | null>(null);
  const [showAllDreams, setShowAllDreams] = useState(false);
  const [expandedDreamId, setExpandedDreamId] = useState<string | null>(null);
  const { toast } = useToast();

  // Debug logging
  console.log('Dashboard render - credits:', credits, 'plan:', plan);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchDreams();
    fetchAllDreamsForStats();
  }, [user, navigate, showAllDreams]);

  const fetchDreams = async () => {
    try {
      const query = supabase
        .from('dreams')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!showAllDreams) {
        query.limit(5);
      }
      
      const { data, error } = await query;

      if (error) throw error;
      setDreams(data || []);
      
      // Fetch analyses for these dreams
      await fetchAnalyses(data || []);
    } catch (error) {
      console.error('Error fetching dreams:', error);
      toast({
        title: "Napaka",
        description: "Napaka pri nalaganju sanj.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalyses = async (dreamsList: Dream[]) => {
    if (dreamsList.length === 0) return;
    
    try {
      const dreamIds = dreamsList.map(dream => dream.id);
      const { data, error } = await supabase
        .from('dream_analyses')
        .select('*')
        .in('dream_id', dreamIds);

      if (error) throw error;
      
      const analysesMap: { [key: string]: DreamAnalysis } = {};
      (data || []).forEach(analysis => {
        analysesMap[analysis.dream_id] = analysis;
      });
      setAnalyses(analysesMap);
    } catch (error) {
      console.error('Error fetching analyses:', error);
    }
  };

  const fetchAllDreamsForStats = async () => {
    try {
      // Fetch all dreams for statistics
      const { data: allDreamsData, error: dreamsError } = await supabase
        .from('dreams')
        .select('*')
        .order('created_at', { ascending: false });

      if (dreamsError) throw dreamsError;
      setAllDreams(allDreamsData || []);
      
      // Fetch all analyses for complete statistics
      if (allDreamsData && allDreamsData.length > 0) {
        const allDreamIds = allDreamsData.map(dream => dream.id);
        const { data: allAnalysesData, error: analysesError } = await supabase
          .from('dream_analyses')
          .select('*')
          .in('dream_id', allDreamIds);

        if (analysesError) throw analysesError;
        
        const allAnalysesMap: { [key: string]: DreamAnalysis } = {};
        (allAnalysesData || []).forEach(analysis => {
          allAnalysesMap[analysis.dream_id] = analysis;
        });
        setAllAnalyses(allAnalysesMap);
      }
    } catch (error) {
      console.error('Error fetching all dreams for stats:', error);
    }
  };

  const analyzeDream = async (dreamId: string) => {
    if (analyzingDreams.has(dreamId)) return;

    console.log('analyzeDream called - credits:', credits, 'isUnlimited:', isUnlimited);

    // Check credits first (unless unlimited)
    if (!isUnlimited && (!credits || credits.credits_remaining < 1)) {
      toast({
        title: "Ni dovolj kreditov",
        description: "Za analizo sanj potrebujete vsaj 1 kredit. Nadgradite svoj načrt.",
        variant: "destructive",
      });
      navigate('/pricing');
      return;
    }

    // Show credit confirmation modal
    setPendingAnalysis(dreamId);
    setShowCreditModal(true);
  };

  const confirmAnalysis = async () => {
    if (!pendingAnalysis) return;

    setShowCreditModal(false);
    setAnalyzingDreams(prev => new Set(prev).add(pendingAnalysis));
    toast({
      title: "Analiza se izvaja",
      description: "AI analizira vašo sanje...",
    });

    try {
      // Deduct credits first (optimistic update)
      const success = await deductCredits(1);
      if (!success && !isUnlimited) {
        toast({
          title: "Napaka pri odštevanju kreditov",
          description: "Prišlo je do napake pri odštevanju kreditov.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('analyze-dream', {
        body: { dreamId: pendingAnalysis }
      });

      if (error) {
        if (error.message?.includes('402')) {
          toast({
            title: "Ni dovolj kreditov",
            description: "Za to analizo potrebujete več kreditov.",
            variant: "destructive",
          });
          // Refresh credits to get the latest state
          await refreshCredits();
          navigate('/pricing');
          return;
        }
        throw error;
      }

      if (data.analysis) {
        setAnalyses(prev => ({
          ...prev,
          [pendingAnalysis]: data.analysis
        }));
        toast({
          title: "Analiza končana",
          description: `AI analiza je pripravljena! Porabili ste 1 kredit.`,
        });
      }
    } catch (error: any) {
      console.error('Error analyzing dream:', error);
      toast({
        title: "Napaka pri analizi",
        description: error.message || "Prišlo je do napake pri analizi sanj.",
        variant: "destructive",
      });
    } finally {
      setAnalyzingDreams(prev => {
        const newSet = new Set(prev);
        newSet.delete(pendingAnalysis);
        return newSet;
      });
      setPendingAnalysis(null);
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Napaka",
        description: "Napaka pri odjavi.",
        variant: "destructive",
      });
    } else {
      navigate('/');
    }
  };

  const formatSymbol = (symbol: string): string => {
    try {
      // Try to parse as JSON object
      const parsed = JSON.parse(symbol);
      if (parsed.symbol && parsed.meaning) {
        return `${parsed.symbol}: ${parsed.meaning}`;
      }
      // If parsing succeeds but doesn't have expected structure, return as is
      return symbol;
    } catch {
      // If parsing fails, it's likely a simple string, return as is
      return symbol;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-8 w-8 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Nalagam vaše sanje...</p>
        </div>
      </div>
    );
  }

  const userName = user?.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="container mx-auto px-4 py-8 space-y-8">

        {/* Dream Activity Calendar */}
        <DreamActivityCalendar />

        {/* Welcome Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {userName}!
          </h1>
          <p className="text-muted-foreground">
            Your dream journey continues. Explore your recent entries or start a new one.
          </p>
        </div>

        {/* Action Cards Section */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Action Cards */}
          <div className="md:col-span-2 space-y-4">
            {/* Record Dream Card */}
            <Card className="border-border/50 bg-gradient-to-br from-primary/5 via-primary/10 to-background">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <h3 className="text-xl font-semibold text-foreground">
                      Ready to explore your mind?
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Capture your dreams and unlock their hidden meanings
                    </p>
                  </div>
                  <Pencil className="h-8 w-8 text-primary ml-4" />
                </div>
                <Button 
                  onClick={() => navigate('/dream/new')}
                  className="mt-4 w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Record New Dream
                </Button>
              </CardContent>
            </Card>

            {/* Multiple Analysis Card */}
            <Card className="border-border/50 bg-gradient-to-br from-primary/5 via-primary/10 to-background">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <h3 className="text-xl font-semibold text-foreground">
                        Multiple Dream Analysis
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Unlock deeper insights by analyzing patterns across your dreams
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => navigate('/analytics')}
                  className="mt-4 w-full sm:w-auto"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analyze Multiple Dreams
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Credit Balance */}
          <Card className="border-border/50">
            <CardContent className="p-6 h-full flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Credit Balance
                </h3>
                <div className="text-5xl font-bold text-primary mb-2">
                  {isUnlimited ? '∞' : credits?.credits_remaining || 0}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Credits for AI analysis
                </p>
                {!isUnlimited && (
                  <div className="text-xs text-muted-foreground">
                    {credits?.credits_used_this_month || 0} used this month
                  </div>
                )}
              </div>
              <Button 
                variant="outline" 
                onClick={() => navigate('/pricing')}
                className="w-full mt-4"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Buy more
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Dreams Section */}
        <div>
          {/* Recent Dreams */}
          <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-foreground">Recent Dreams</h2>
            {dreams.length > 0 && (
              <Button variant="link" onClick={() => navigate('/analytics')}>
                View all →
              </Button>
            )}
          </div>

          {dreams.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-12 text-center">
                <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-medium text-foreground mb-2">
                  No dreams yet
                </h3>
                <p className="text-muted-foreground mb-6">
                  Start recording your first dream and discover hidden patterns.
                </p>
                <Button onClick={() => navigate('/dream/new')} size="lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Dream
                </Button>
              </CardContent>
            </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {dreams.slice(0, 4).map((dream, index) => {
                  const analysis = analyses[dream.id];
                  const isAnalyzing = analyzingDreams.has(dream.id);
                  const backgroundImages = [dreamBg1, dreamBg2, dreamBg3, dreamBg4];
                  const bgImage = backgroundImages[index % 4];
                  const isExpanded = expandedDreamId === dream.id;
                  
                  return (
                    <>
                      <Card 
                        key={dream.id}
                        className={cn(
                          "border-none overflow-hidden group hover:shadow-xl transition-all cursor-pointer h-[320px] flex flex-col",
                          isExpanded && "ring-2 ring-primary shadow-2xl"
                        )}
                        onClick={() => {
                          if (!isAnalyzing) {
                            if (analysis) {
                              setExpandedDreamId(isExpanded ? null : dream.id);
                            } else {
                              analyzeDream(dream.id);
                            }
                          }
                        }}
                      >
                        {/* Image Section */}
                        <div 
                          className="relative w-full h-48 bg-cover bg-center flex-shrink-0"
                          style={{ backgroundImage: `url(${bgImage})` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-black/60 to-black/30" />
                          {analysis && (
                            <Badge className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm text-white border-white/30">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Analyzed
                            </Badge>
                          )}
                        </div>
                        
                        {/* Content Section */}
                        <div className="flex-1 flex flex-col p-5 bg-card">
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground text-lg mb-2 line-clamp-2">
                              {dream.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {dream.content}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(dream.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          
                          {!analysis && !isAnalyzing && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                analyzeDream(dream.id);
                              }}
                              className="mt-4 w-full"
                            >
                              <Brain className="h-3 w-3 mr-2" />
                              Analyze Dream
                            </Button>
                          )}
                          
                          {isAnalyzing && (
                            <Button 
                              size="sm" 
                              disabled
                              className="mt-4 w-full"
                            >
                              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                              Analyzing...
                            </Button>
                          )}
                        </div>
                      </Card>

                      {/* Collapsible Analysis Section */}
                      {analysis && isExpanded && (
                        <Card key={`analysis-${dream.id}`} className="col-span-full border-l-4 border-l-primary bg-muted/30 animate-in slide-in-from-top-4 duration-300">
                          <CardContent className="p-6 space-y-6">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                <h3 className="text-lg font-semibold">
                                  {t('dashboard.analysisSection.viewAnalysis')}
                                </h3>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedDreamId(null);
                                }}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </div>

                            <Separator />

                            {/* Themes */}
                            {analysis.themes && analysis.themes.length > 0 && (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Heart className="h-4 w-4 text-primary" />
                                  <h4 className="font-semibold text-foreground">
                                    {t('dashboard.analysisSection.themes')}
                                  </h4>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {analysis.themes.map((theme, idx) => (
                                    <Badge key={idx} variant="secondary">
                                      {theme}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Symbols */}
                            {analysis.symbols && analysis.symbols.length > 0 && (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="h-4 w-4 text-primary" />
                                  <h4 className="font-semibold text-foreground">
                                    {t('dashboard.analysisSection.symbols')}
                                  </h4>
                                </div>
                                <ul className="space-y-2">
                                  {analysis.symbols.map((symbol, idx) => (
                                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                      <span className="text-primary mt-0.5">•</span>
                                      <span>{formatSymbol(symbol)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Analysis Text */}
                            {analysis.analysis_text && (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Brain className="h-4 w-4 text-primary" />
                                  <h4 className="font-semibold text-foreground">
                                    {t('dashboard.analysisSection.analysis')}
                                  </h4>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {analysis.analysis_text}
                                </p>
                              </div>
                            )}

                            {/* Recommendations */}
                            {analysis.recommendations && (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Lightbulb className="h-4 w-4 text-primary" />
                                  <h4 className="font-semibold text-foreground">
                                    {t('dashboard.analysisSection.recommendations')}
                                  </h4>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {analysis.recommendations}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </>
                  );
                })}
              </div>
            )}
        </div>
      </div>
      </div>

      {/* Credit Usage Modal */}
      <CreditUsageModal
        open={showCreditModal}
        onOpenChange={setShowCreditModal}
        onConfirm={confirmAnalysis}
        creditsRequired={1}
        creditsRemaining={credits?.credits_remaining || 0}
        actionName="AI Analiza Sanj"
        actionDescription="Analizirajte svojo sanje z naprednimi AI algoritmi"
      />
    </div>
  );
};

export default Dashboard;