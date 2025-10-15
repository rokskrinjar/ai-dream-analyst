import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, TrendingUp, Calendar, Heart, Eye, Loader2, RefreshCw, Award, Target, Zap, Clock, BookOpen, Sparkles, AlertCircle, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { CreditUsageModal } from '@/components/CreditUsageModal';
import { useCreditContext } from '@/contexts/CreditContext';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useIsMobile } from '@/hooks/use-mobile';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AppHeader } from '@/components/AppHeader';

interface Dream {
  id: string;
  title: string;
  content: string;
  mood?: string;
  dream_date: string;
  created_at: string;
  tags?: string[];
}

interface DreamAnalysis {
  id: string;
  dream_id: string;
  themes?: string[];
  emotions?: string[];
  symbols?: string[];
  analysis_text: string;
  image_url?: string;
  created_at: string;
}

interface PatternAnalysis {
  executive_summary?: string;
  overall_insights?: string; // Keep for backward compatibility
  theme_patterns: Array<{ 
    theme: string; 
    frequency: number; 
    significance: string;
    evolution?: string;
  }>;
  emotional_journey: Array<{ 
    emotion: string; 
    frequency: number; 
    trend: string;
    psychological_significance?: string;
    triggers?: string;
  }>;
  symbol_meanings: Array<{ 
    symbol: string; 
    frequency: number; 
    interpretation: string;
    personal_context?: string;
    archetypal_meaning?: string;
  }>;
  temporal_patterns: string;
  psychological_insights?: string;
  life_stage_analysis?: string;
  recommendations: Array<{
    action?: string;
    rationale?: string;
    implementation?: string;
    expected_outcome?: string;
  }> | string[]; // Support both formats
  personal_growth: string;
  integration_suggestions?: string;
}

const EMOTION_COLORS = [
  '#ec4899', // Pink/Hot Pink - Primary emotion
  '#8b5cf6', // Purple - Secondary emotion
  '#3b82f6', // Blue - Third emotion  
  '#10b981', // Green - Fourth emotion
  '#e5e7eb'  // Light Gray - "Other" category
];

// Helper function to safely render text content from various formats
const renderTextContent = (content: any): React.ReactNode => {
  if (!content) return <p className="text-muted-foreground">Ni podatkov.</p>;
  
  // If it's already a string, split by paragraphs
  if (typeof content === 'string') {
    return content.trim().split('\n\n').map((para, idx) => (
      <p key={idx}>{para}</p>
    ));
  }
  
  // If it's an array, handle each element
  if (Array.isArray(content)) {
    return content.map((item, idx) => {
      if (typeof item === 'string') {
        return <p key={idx}>{item}</p>;
      }
      if (typeof item === 'object' && item.paragraph) {
        return <p key={idx}>{item.paragraph}</p>;
      }
      // Fallback for other object types
      if (typeof item === 'object') {
        const text = item.text || item.content || JSON.stringify(item);
        return <p key={idx}>{text}</p>;
      }
      return null;
    });
  }
  
  // If it's an object, check for paragraph_N keys
  if (typeof content === 'object') {
    // Extract numbered paragraph keys (paragraph_1, paragraph_2, etc.)
    const paragraphKeys = Object.keys(content).filter(key => key.startsWith('paragraph_'));
    
    if (paragraphKeys.length > 0) {
      // Sort by number to maintain order
      const sortedKeys = paragraphKeys.sort((a, b) => {
        const numA = parseInt(a.replace('paragraph_', ''));
        const numB = parseInt(b.replace('paragraph_', ''));
        return numA - numB;
      });
      
      return sortedKeys.map((key, idx) => (
        <p key={idx} className="mb-4">{content[key]}</p>
      ));
    }
    
    // Fallback to other object properties
    const text = content.paragraph || content.text || content.content || JSON.stringify(content);
    return <p>{text}</p>;
  }
  
  return <p className="text-muted-foreground">Napaka pri prikazu vsebine.</p>;
};

const Analytics = () => {
  const { user, signOut } = useAuth();
  const { credits } = useCreditContext();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [analyses, setAnalyses] = useState<DreamAnalysis[]>([]);
  const [patternAnalysis, setPatternAnalysis] = useState<PatternAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState<number>(2);
  const [showCostConfirmation, setShowCostConfirmation] = useState(false);
  const [showUpgradeOption, setShowUpgradeOption] = useState(false);
  const [showChoiceScreen, setShowChoiceScreen] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [hasExistingAnalysis, setHasExistingAnalysis] = useState(false);
  const [lastAnalysisDate, setLastAnalysisDate] = useState<string | null>(null);
  const [analysisRequirements, setAnalysisRequirements] = useState({
    analyzedDreams: 0,
    required: 10,
    canAnalyze: false
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      console.log('🔍 Fetching analytics data for user:', user!.id);
      
      // Fetch dreams
      const { data: dreamsData, error: dreamsError } = await supabase
        .from('dreams')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (dreamsError) throw dreamsError;
      console.log('📚 Fetched dreams:', dreamsData?.length || 0, dreamsData);

      // Fetch analyses
      const dreamIds = dreamsData?.map(d => d.id) || [];
      let analysesData: DreamAnalysis[] = [];
      
      if (dreamIds.length > 0) {
      const { data, error: analysesError } = await supabase
        .from('dream_analyses')
        .select('id, dream_id, themes, emotions, symbols, analysis_text, recommendations, created_at, reflection_questions, language')
        .in('dream_id', dreamIds);

        if (analysesError) throw analysesError;
        analysesData = data || [];
      }

      console.log('🧠 Fetched analyses:', analysesData?.length || 0, analysesData);

      setDreams(dreamsData || []);
      setAnalyses(analysesData);
      
      // Check requirements for pattern analysis
      const analyzedDreamCount = dreamsData?.filter(dream => 
        analysesData.some(analysis => analysis.dream_id === dream.id)
      ).length || 0;
      
      console.log('✅ Analyzed dream count calculation:');
      console.log('  - Total dreams:', dreamsData?.length || 0);
      console.log('  - Total analyses:', analysesData?.length || 0);  
      console.log('  - Dreams with analyses:', analyzedDreamCount);
      
      const canAnalyze = analyzedDreamCount >= 10;
      console.log('🎯 Can analyze patterns:', canAnalyze, '(need 10+, have', analyzedDreamCount, ')');
      
      setAnalysisRequirements({
        analyzedDreams: analyzedDreamCount,
        required: 10,
        canAnalyze
      });
      
      // Calculate estimated cost
      if (dreamsData && analysesData.length > 0) {
        const recentDreams = dreamsData.slice(0, 30);
        const inputSize = JSON.stringify(recentDreams).length + JSON.stringify(analysesData).length;
        const estimatedTokens = Math.ceil(inputSize / 4);
        const cost = Math.max(2, Math.ceil(estimatedTokens / 15000)); // Realistic cost: ~5-10 credits for 30 dreams
        setEstimatedCost(cost);
      }
        
      // Check if there's an existing analysis
      const existingAnalysisInfo = await checkExistingPatternAnalysis();
      console.log('📊 Existing pattern analysis check:', existingAnalysisInfo);
      
      if (existingAnalysisInfo.exists) {
        setHasExistingAnalysis(true);
        setLastAnalysisDate(existingAnalysisInfo.date);
      } else {
        setHasExistingAnalysis(false);
      }
      
      // Show choice screen if user has enough analyzed dreams
      if (canAnalyze) {
        console.log('🎉 Showing choice screen - user meets requirements');
        setShowChoiceScreen(true);
      } else {
        console.log('⏳ Not showing choice screen - insufficient analyzed dreams');
        setShowChoiceScreen(false);
      }
      
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Napaka",
        description: "Napaka pri nalaganju podatkov.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkExistingPatternAnalysis = async (): Promise<{ exists: boolean; date: string | null }> => {
    try {
      const { data } = await supabase
        .from('pattern_analyses')
        .select('id, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      // Invalidate analyses created before the second-person prompt update (September 19, 2025, 20:00 UTC)
      if (data && data.length > 0) {
        const analysisDate = new Date(data[0].created_at);
        const cutoffDate = new Date('2025-09-19T20:00:00Z');
        
        if (analysisDate < cutoffDate) {
          console.log('Invalidating old cached analysis - regenerating with updated second-person prompt');
          return { exists: false, date: null };
        }
        return { exists: true, date: data[0].created_at };
      }
      
      return { exists: false, date: null };
    } catch (error) {
      return { exists: false, date: null };
    }
  };

  const generatePatternAnalysis = async (dreams: Dream[], analyses: DreamAnalysis[], forceRefresh = false) => {
    try {
      // Only set loading if not already set
      if (!isAnalyzing) {
        setIsAnalyzing(true);
      }
      setShowCostConfirmation(false);
      
      console.log('🔄 Calling analyze-dream-patterns edge function...');
      console.log('  - forceRefresh:', forceRefresh);
      console.log('  - dreams count:', dreams.length);
      console.log('  - analyses count:', analyses.length);
      
      const { data, error } = await supabase.functions.invoke('analyze-dream-patterns', {
        body: { dreams, analyses, forceRefresh }
      });

      console.log('📥 Edge function response:', { data, error });

      if (error) {
        if (error.message?.includes('INSUFFICIENT_CREDITS')) {
          toast({
            title: "Premalo kreditov",
            description: `Potrebujete ${estimatedCost} kreditov za to analizo.`,
            variant: "destructive",
          });
        } else if (error.message?.includes('INSUFFICIENT_ANALYZED_DREAMS')) {
          toast({
            title: "Premalo analiziranih sanj",
            description: "Potrebujete vsaj 10 analiziranih sanj za vzorčno analizo.",
            variant: "destructive",
          });
        } else if (error.message?.includes('AI_ANALYSIS_FAILED')) {
          toast({
            title: "AI analiza neuspešna",
            description: "Poskusite znova čez nekaj trenutkov.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Napaka",
            description: "Napaka pri ustvarjanju analize vzorcev.",
            variant: "destructive",
          });
        }
        throw error;
      }
      
      if (data?.analysis) {
        console.log('✅ Setting pattern analysis data:', data.analysis);
        console.log('📊 Analysis structure:', {
          hasExecutiveSummary: !!data.analysis.executive_summary,
          hasOverallInsights: !!data.analysis.overall_insights,
          hasThemePatterns: !!data.analysis.theme_patterns,
          hasEmotionalJourney: !!data.analysis.emotional_journey,
          themeCount: data.analysis.theme_patterns?.length || 0,
          emotionCount: data.analysis.emotional_journey?.length || 0
        });
        console.log('📊 Analysis structure sample:', {
          executive_summary_type: typeof data.analysis.executive_summary,
          executive_summary_sample: data.analysis.executive_summary?.slice?.(0, 200),
          is_array: Array.isArray(data.analysis.executive_summary),
          first_element: data.analysis.executive_summary?.[0]
        });
        setPatternAnalysis(data.analysis);
        
        // Check if upgrade is available
        if (data.upgradeAvailable) {
          setEstimatedCost(data.estimatedUpgradeCost);
          setShowUpgradeOption(true);
        } else {
          setShowUpgradeOption(false);
        }
        
        if (data.cached && !forceRefresh) {
          console.log('📦 Loaded cached pattern analysis');
          if (data.upgradeAvailable) {
            toast({
              title: "Analiza naložena",
              description: "Prikazana je vaša analiza. Nova izboljšana verzija je na voljo!",
            });
          } else {
            toast({
              title: "Analiza naložena",
              description: "Prikazana je vaša zadnja shranjena analiza vzorcev.",
            });
          }
        } else {
          console.log('✨ Generated fresh pattern analysis');
          toast({
            title: "Analiza končana",
            description: `Nova analiza vzorcev je pripravljena! Porabili ste ${estimatedCost} kreditov.`,
          });
        }
        
        // CRITICAL: Set loading to false AND show results
        setIsAnalyzing(false);
        setShowResults(true);
        setShowChoiceScreen(false);
      } else {
        console.error('⚠️ No analysis data in response!');
        setIsAnalyzing(false);
        toast({
          title: "Napaka",
          description: "Analiza ni bila najdena. Poskusite ponovno.",
          variant: "destructive",
        });
      }
      
    } catch (error: any) {
      console.error('Error generating pattern analysis:', error);
      setIsAnalyzing(false);
      toast({
        title: "Napaka",
        description: "Prišlo je do napake pri analizi. Poskusite ponovno.",
        variant: "destructive",
      });
    }
  };

  const handleAnalysisConfirmation = (confirmed: boolean) => {
    if (confirmed) {
      setShowChoiceScreen(false);
      setShowResults(false);
      generatePatternAnalysis(dreams, analyses, true);
    }
    setShowCostConfirmation(false);
    setShowUpgradeOption(false);
  };

  const handleViewLastAnalysis = async () => {
    if (!hasExistingAnalysis) return;
    
    console.log('👁️ View Last Analysis clicked');
    console.log('  - hasExistingAnalysis:', hasExistingAnalysis);
    console.log('  - lastAnalysisDate:', lastAnalysisDate);
    
    // Set loading state FIRST to prevent blank screen
    setIsAnalyzing(true);
    setShowChoiceScreen(false);
    
    try {
      await generatePatternAnalysis(dreams, analyses, false);
    } catch (error) {
      console.error('Error loading analysis:', error);
      // If error, show choice screen again
      setShowChoiceScreen(true);
      setIsAnalyzing(false);
    }
  };

  const handleGenerateNewAnalysis = () => {
    setShowChoiceScreen(false);
    if (!analysisRequirements.canAnalyze) {
      toast({
        title: "Premalo analiziranih sanj",
        description: `Potrebujete vsaj 10 analiziranih sanj za vzorčno analizo. Trenutno imate ${analysisRequirements.analyzedDreams}.`,
        variant: "destructive",
      });
      return;
    }
    setShowCostConfirmation(true);
  };

  const handleBackToChoices = () => {
    setPatternAnalysis(null);
    setShowResults(false);
    setShowChoiceScreen(true);
  };

  // Prepare chart data
  const themeData = patternAnalysis?.theme_patterns?.map(tp => ({
    name: tp.theme,
    value: tp.frequency
  })) || [];

  const emotionData = (() => {
    const emotions = patternAnalysis?.emotional_journey?.map(ej => ({
      name: ej.emotion,
      value: ej.frequency
    })) || [];
    
    // Sort by frequency (highest first)
    const sorted = [...emotions].sort((a, b) => b.value - a.value);
    
    if (sorted.length <= 4) {
      return sorted;
    }
    
    // Take top 4, aggregate the rest into "Other"
    const top4 = sorted.slice(0, 4);
    const remaining = sorted.slice(4);
    const otherValue = remaining.reduce((sum, item) => sum + item.value, 0);
    
    if (otherValue > 0) {
      return [...top4, { name: 'Drugo', value: otherValue }];
    }
    
    return top4;
  })();


  const milestones = [
    { title: 'Prvi zapisovalec', description: 'Zapisali ste prvo sanje', achieved: dreams.length >= 1, icon: BookOpen },
    { title: 'Reden sanjač', description: 'Zapisali ste 10 sanj', achieved: dreams.length >= 10, icon: Target },
    { title: 'Mojster sanj', description: 'Zapisali ste 50 sanj', achieved: dreams.length >= 50, icon: Award },
    { title: 'AI raziskovalec', description: 'Analizirali ste 5 sanj', achieved: analyses.length >= 5, icon: Brain },
    { title: 'Vzorčni detektiv', description: 'Imeli ste vzorčno analizo', achieved: !!patternAnalysis, icon: Sparkles },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-4 mb-8">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="p-6">
                <Skeleton className="h-32 w-full" />
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader showBackButton title="Analiza vzorcev" subtitle="Odkrijte skrite pomene svojih sanj" />
      <div className="container mx-auto px-6 py-8">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Skupaj sanj</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dreams.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Analizirane sanje</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyses.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Zaupanje</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyses.length > 0 ? '94%' : 'N/A'}</div>
              <p className="text-xs text-muted-foreground">Povprečna zanesljivost</p>
            </CardContent>
          </Card>
        </div>

        {/* Requirements Check */}
        {!analysisRequirements.canAnalyze && (
          <Card className="mb-8 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-orange-800 dark:text-orange-200">
                <Clock className="h-5 w-5" />
                <span>AI Vzorčna analiza</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-orange-700 dark:text-orange-300">
                  Za poglobljeno AI analizo vzorcev potrebujete vsaj <strong>10 analiziranih sanj</strong>.
                </p>
                <div className="flex items-center space-x-3">
                  <div className="flex-1 bg-orange-200 dark:bg-orange-800 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((analysisRequirements.analyzedDreams / analysisRequirements.required) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                    {analysisRequirements.analyzedDreams}/{analysisRequirements.required}
                  </span>
                </div>
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  Še {Math.max(0, analysisRequirements.required - analysisRequirements.analyzedDreams)} analiziranih sanj do odklepa.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cost Confirmation Modal */}
        <CreditUsageModal 
          open={showCostConfirmation}
          onOpenChange={setShowCostConfirmation}
          onConfirm={() => handleAnalysisConfirmation(true)}
          creditsRequired={estimatedCost}
          creditsRemaining={credits?.credits_remaining || 0}
          actionName={showUpgradeOption ? "Izboljšana AI vzorčna analiza" : "AI Vzorčna analiza"}
          actionDescription={showUpgradeOption 
            ? `Nadgradite na novo izboljšano analizo z dodatnimi uvidi in priporočili za ${Math.min(analysisRequirements.analyzedDreams, 30)} najnovejših analiziranih sanj.`
            : `Celovita AI analiza vzorcev za ${Math.min(analysisRequirements.analyzedDreams, 30)} najnovejših analiziranih sanj.`
          }
        />

        {/* AI Pattern Analysis - Show choice screen or progress */}
        {analysisRequirements.canAnalyze && !showResults && (showChoiceScreen || isAnalyzing) && (
          <Card className="mb-8">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2 text-2xl">
                <Brain className="h-6 w-6 text-primary" />
                <span>AI Vzorčna analiza</span>
              </CardTitle>
              <CardDescription className="text-base">
                {isAnalyzing ? "Analiza v teku..." : "Izberite, kaj bi radi naredili z vašo vzorčno analizo"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isAnalyzing ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">AI analizira vzorce vaših sanj...</p>
                    <p className="text-sm text-muted-foreground mt-2">To lahko traja do 60 sekund</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* View Last Analysis */}
                  <Card className={cn(
                    "border-2 transition-colors",
                    hasExistingAnalysis ? "hover:border-primary/50 cursor-pointer" : "opacity-50 cursor-not-allowed border-muted"
                  )} onClick={hasExistingAnalysis ? handleViewLastAnalysis : undefined}>
                    <CardHeader className="text-center">
                      <Eye className="h-12 w-12 text-primary mx-auto mb-2" />
                      <CardTitle className="text-lg">Prikaži zadnjo analizo</CardTitle>
                      <CardDescription>
                        {hasExistingAnalysis ? (
                          "Brezplačno si oglejte vašo shranjeno vzorčno analizo"
                        ) : (
                          <span className="text-muted-foreground">
                            Nimate še nobene shranjene analize
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                       <div className="space-y-2">
                         <Badge variant="secondary" className="mb-2">BREZPLAČNO</Badge>
                         {hasExistingAnalysis ? (
                           lastAnalysisDate && (
                             <p className="text-sm text-muted-foreground">
                               Zadnja analiza: {new Date(lastAnalysisDate).toLocaleDateString('sl-SI')}
                             </p>
                           )
                         ) : (
                           <p className="text-sm text-muted-foreground">
                             Še ni na voljo
                           </p>
                         )}
                         <Button 
                           className="w-full" 
                           onClick={handleViewLastAnalysis}
                           disabled={!hasExistingAnalysis}
                         >
                           <Eye className="h-4 w-4 mr-2" />
                           Prikaži analizo
                         </Button>
                       </div>
                    </CardContent>
                  </Card>

                  {/* Generate New Analysis */}
                  <Card className={cn(
                    "border-2 hover:border-primary/50 transition-colors cursor-pointer",
                    !analysisRequirements.canAnalyze && "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20"
                  )} onClick={handleGenerateNewAnalysis}>
                    <CardHeader className="text-center">
                      <Sparkles className="h-12 w-12 text-primary mx-auto mb-2" />
                      <CardTitle className="text-lg">Ustvari novo analizo</CardTitle>
                      <CardDescription>
                        {analysisRequirements.canAnalyze ? (
                          "Generirajte svežo AI analizo z najnovejšimi uvidi"
                        ) : (
                          <span className="text-orange-700 dark:text-orange-300">
                            Potrebujete {analysisRequirements.required - analysisRequirements.analyzedDreams} več analiziranih sanj
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                       <div className="space-y-2">
                         <Badge 
                           variant={analysisRequirements.canAnalyze ? "outline" : "secondary"}
                           className="mb-2"
                         >
                           {analysisRequirements.canAnalyze ? `${estimatedCost} KREDITOV` : "ZAKLENJENO"}
                         </Badge>
                         <p className="text-sm text-muted-foreground">
                           {analysisRequirements.canAnalyze 
                             ? `Temelji na ${Math.min(analysisRequirements.analyzedDreams, 30)} najnovejših analiziranih sanjah`
                             : `Potrebujete ${analysisRequirements.required} analiziranih sanj`
                           }
                         </p>
                         <Button 
                           className="w-full" 
                           onClick={handleGenerateNewAnalysis}
                           variant={analysisRequirements.canAnalyze ? "default" : "secondary"}
                         >
                           <Sparkles className="h-4 w-4 mr-2" />
                           Nova analiza
                         </Button>
                       </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* AI Pattern Analysis Results */}
        {showResults && patternAnalysis && !isAnalyzing ? (
          <ErrorBoundary
            fallback={
              <Card className="mb-8 border-destructive">
                <CardContent className="py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Napaka pri prikazu analize</h3>
                  <p className="text-muted-foreground mb-4">
                    Analiza ni mogla biti prikazana. Poskusite ponovno.
                  </p>
                  <Button onClick={() => {
                    setPatternAnalysis(null);
                    setShowChoiceScreen(true);
                  }}>
                    Nazaj na izbire
                  </Button>
                </CardContent>
              </Card>
            }
            onError={(error) => {
              console.error('Pattern analysis rendering error:', error);
              // DON'T reset state - let ErrorBoundary fallback handle it
            }}
          >
            <>
            {console.log('🎨 Rendering pattern analysis UI', patternAnalysis)}
            {/* Overall Insights */}
            <Card className="mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="h-5 w-5 text-primary" />
                    <span>AI Pregled vzorcev</span>
                  </CardTitle>
                  <div className="flex gap-2">
                    {hasExistingAnalysis && !isAnalyzing && (
                      <Button
                        onClick={handleBackToChoices}
                        variant="ghost"
                        size="sm"
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Nazaj na izbire
                      </Button>
                    )}
                    {showUpgradeOption && (
                      <Button
                        onClick={() => setShowCostConfirmation(true)}
                        className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                        size="sm"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Nova izboljšana analiza ({estimatedCost} kreditov)
                      </Button>
                    )}
                    <Button 
                      onClick={() => generatePatternAnalysis(dreams, analyses, true)}
                      disabled={isAnalyzing}
                      variant="outline"
                      size="sm"
                      title={`Ustvari novo AI analizo vaših vzorcev sanjanja (${estimatedCost} kreditov)`}
                    >
                      <RefreshCw className={cn("h-4 w-4 mr-2", isAnalyzing && "animate-spin")} />
                      Osveži analizo ({estimatedCost} kreditov)
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
                  {renderTextContent(patternAnalysis.executive_summary || patternAnalysis.overall_insights)}
                </div>
              </CardContent>
            </Card>

            {/* Charts Section */}
            {(themeData.length > 0 || emotionData.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Themes Chart */}
                {themeData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Heart className="h-5 w-5 text-primary" />
                        <span>Pogoste teme</span>
                      </CardTitle>
                      <CardDescription>Najpogostejše teme v vaših sanjah</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={themeData.slice(0, 8)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="name" 
                            fontSize={12}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis fontSize={12} />
                          <Tooltip />
                          <Bar 
                            dataKey="value" 
                            fill="hsl(var(--primary))"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Emotions Chart */}
                {emotionData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Heart className="h-5 w-5 text-primary" />
                        <span>Čustveni vzorci</span>
                      </CardTitle>
                      <CardDescription>Čustveno doživljanje v sanjah</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={emotionData}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {emotionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={EMOTION_COLORS[index]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Milestones */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Award className="h-5 w-5 text-primary" />
                    <span>Vaši dosežki</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {milestones.map((milestone, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          milestone.achieved 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted text-muted-foreground"
                        )}>
                          <milestone.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <h4 className={cn(
                            "font-medium text-sm",
                            milestone.achieved ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {milestone.title}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {milestone.description}
                          </p>
                        </div>
                        {milestone.achieved && (
                          <Badge variant="secondary" className="text-xs">
                            ✓
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Personal Growth & Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle>Priporočila in rast</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {patternAnalysis.recommendations && (
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center">
                        💡 Ključna priporočila
                      </h4>
                      <div className="space-y-2">
                        {patternAnalysis.recommendations.slice(0, 3).map((rec, index) => {
                          const text = typeof rec === 'string' ? rec : (rec.action || rec.text || JSON.stringify(rec));
                          const rationale = typeof rec === 'object' ? rec.rationale : null;
                          
                          return (
                            <div key={index} className="p-3 rounded-lg bg-muted/30">
                              <h4 className="font-medium flex items-center space-x-1">
                                <span>• {text}</span>
                              </h4>
                              {rationale && (
                                <p className="text-sm text-muted-foreground mt-1">{rationale}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {patternAnalysis.personal_growth && (
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center">
                        🌱 Osebna rast
                      </h4>
                      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                        {renderTextContent(patternAnalysis.personal_growth)}
                      </div>
                    </div>
                  )}

                   {patternAnalysis.integration_suggestions && (
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center">
                        🔄 Predlogi za integracijo
                      </h4>
                      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                        {renderTextContent(patternAnalysis.integration_suggestions)}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Analysis Sections */}
            {(patternAnalysis.psychological_insights || patternAnalysis.life_stage_analysis || patternAnalysis.temporal_patterns) && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {patternAnalysis.psychological_insights && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Brain className="h-5 w-5 text-primary" />
                        <span>Psihološki uvidi</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                        {renderTextContent(patternAnalysis.psychological_insights)}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {patternAnalysis.life_stage_analysis && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Target className="h-5 w-5 text-primary" />
                        <span>Življenjska faza</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                        {renderTextContent(patternAnalysis.life_stage_analysis)}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {patternAnalysis.temporal_patterns && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Clock className="h-5 w-5 text-primary" />
                        <span>Časovni vzorci</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                        {renderTextContent(patternAnalysis.temporal_patterns)}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Symbol Meanings */}
            {patternAnalysis.symbol_meanings && patternAnalysis.symbol_meanings.length > 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Simboli in njihovi pomeni</CardTitle>
                  <CardDescription>Najpomembnejši simboli v vaših sanjah</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {patternAnalysis.symbol_meanings.map((symbol, index) => (
                      <div key={index} className="p-4 rounded-lg border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-foreground">{symbol.symbol}</h4>
                          <Badge variant="outline">{symbol.frequency}x</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-2">{symbol.interpretation}</p>
                        {symbol.personal_context && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            💡 {symbol.personal_context}
                          </p>
                        )}
                        {symbol.archetypal_meaning && (
                          <p className="text-xs text-muted-foreground mt-1">
                            🌍 {symbol.archetypal_meaning}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            </>
          </ErrorBoundary>
        ) : null}

        {/* Fallback: Show choice screen if nothing else is showing */}
        {!isAnalyzing && !patternAnalysis && analysisRequirements.canAnalyze && !showChoiceScreen ? (
          <Card className="mb-8">
            <CardContent className="py-12 text-center">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Pripravljen za analizo</h3>
              <p className="text-muted-foreground mb-4">
                Kliknite spodnji gumb za prikaz možnosti analize.
              </p>
              <Button onClick={() => setShowChoiceScreen(true)}>
                Prikaži možnosti
              </Button>
            </CardContent>
          </Card>
        ) : null}
        
        {!analysisRequirements.canAnalyze ? (
          <Card>
            <CardContent className="text-center py-12">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Potrebnih več analiziranih sanj</h3>
              <p className="text-muted-foreground mb-4">
                Imate {analysisRequirements.analyzedDreams} analiziranih sanj. 
                Potrebujete še {analysisRequirements.required - analysisRequirements.analyzedDreams} za vzorčno analizo.
              </p>
              <Button onClick={() => navigate('/dashboard')}>Analizirajte več sanj</Button>
            </CardContent>
          </Card>
        ) : dreams.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Ni sanj za analizo</h3>
              <p className="text-muted-foreground mb-4">Zabeležite nekaj sanj, da vidite analizo vzorcev.</p>
              <Button onClick={() => navigate('/dream/new')}>Dodaj novo sanje</Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

export default Analytics;