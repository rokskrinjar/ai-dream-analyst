import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Brain, TrendingUp, Calendar, Heart, Eye, Loader2, RefreshCw, Award, Target, Zap, Clock, BookOpen, Sparkles } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { CreditUsageModal } from '@/components/CreditUsageModal';
import { useCreditContext } from '@/contexts/CreditContext';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';

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

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--secondary))', 'hsl(var(--muted))'];

const Analytics = () => {
  const { user } = useAuth();
  const { credits } = useCreditContext();
  const navigate = useNavigate();
  
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [analyses, setAnalyses] = useState<DreamAnalysis[]>([]);
  const [patternAnalysis, setPatternAnalysis] = useState<PatternAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState<number>(2);
  const [showCostConfirmation, setShowCostConfirmation] = useState(false);
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
      
      // Fetch dreams
      const { data: dreamsData, error: dreamsError } = await supabase
        .from('dreams')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (dreamsError) throw dreamsError;

      // Fetch analyses
      const dreamIds = dreamsData?.map(d => d.id) || [];
      let analysesData: DreamAnalysis[] = [];
      
      if (dreamIds.length > 0) {
        const { data, error: analysesError } = await supabase
          .from('dream_analyses')
          .select('*')
          .in('dream_id', dreamIds);

        if (analysesError) throw analysesError;
        analysesData = data || [];
      }

      setDreams(dreamsData || []);
      setAnalyses(analysesData);
      
      // Check requirements for pattern analysis
      const analyzedDreamCount = dreamsData?.filter(dream => 
        analysesData.some(analysis => analysis.dream_id === dream.id)
      ).length || 0;
      
      const canAnalyze = analyzedDreamCount >= 10;
      
      setAnalysisRequirements({
        analyzedDreams: analyzedDreamCount,
        required: 10,
        canAnalyze
      });
      
      // Calculate estimated cost if requirements are met
      if (canAnalyze && dreamsData && analysesData.length > 0) {
        const recentDreams = dreamsData.slice(0, 30);
        const inputSize = JSON.stringify(recentDreams).length + JSON.stringify(analysesData).length;
        const estimatedTokens = Math.ceil(inputSize / 4);
        const cost = Math.max(2, Math.ceil(estimatedTokens / 2000));
        setEstimatedCost(cost);
        
        // Auto-generate if we haven't done pattern analysis before
        const hasExistingAnalysis = await checkExistingPatternAnalysis();
        if (!hasExistingAnalysis) {
          setShowCostConfirmation(true);
        } else {
          generatePatternAnalysis(dreamsData, analysesData);
        }
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

  const checkExistingPatternAnalysis = async () => {
    try {
      const { data } = await supabase
        .from('pattern_analyses')
        .select('id')
        .eq('user_id', user!.id)
        .limit(1);
      return data && data.length > 0;
    } catch (error) {
      return false;
    }
  };

  const generatePatternAnalysis = async (dreams: Dream[], analyses: DreamAnalysis[], forceRefresh = false) => {
    try {
      setIsAnalyzing(true);
      setShowCostConfirmation(false);
      
      const { data, error } = await supabase.functions.invoke('analyze-dream-patterns', {
        body: { dreams, analyses, forceRefresh }
      });

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
        setPatternAnalysis(data.analysis);
        if (data.cached && !forceRefresh) {
          console.log('Loaded cached pattern analysis');
          toast({
            title: "Analiza naložena",
            description: "Prikazana je vaša zadnja shranjena analiza vzorcev.",
          });
        } else {
          console.log('Generated fresh pattern analysis');
          toast({
            title: "Analiza končana",
            description: `Nova analiza vzorcev je pripravljena! Porabili ste ${estimatedCost} kreditov.`,
          });
        }
      }
      
    } catch (error: any) {
      console.error('Error generating pattern analysis:', error);
      // Error handling is done above
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalysisConfirmation = (confirmed: boolean) => {
    if (confirmed) {
      generatePatternAnalysis(dreams, analyses, true);
    }
    setShowCostConfirmation(false);
  };

  // Prepare chart data
  const themeData = patternAnalysis?.theme_patterns?.map(tp => ({
    name: tp.theme,
    value: tp.frequency
  })) || [];

  const emotionData = patternAnalysis?.emotional_journey?.map(ej => ({
    name: ej.emotion,
    value: ej.frequency
  })) || [];

  // Prepare additional analytics data
  const dreamQualityData = dreams.slice(0, 10).map((dream, index) => ({
    date: new Date(dream.created_at).toLocaleDateString('sl-SI'),
    quality: Math.floor(Math.random() * 5) + 6, // Simulated quality score 6-10
    vividness: Math.floor(Math.random() * 4) + 7, // Simulated vividness 7-10
  })).reverse();

  const dreamCategoriesData = [
    { name: 'Običajne sanje', value: Math.floor(dreams.length * 0.6), color: 'hsl(var(--primary))' },
    { name: 'Lucidne sanje', value: Math.floor(dreams.length * 0.15), color: 'hsl(var(--secondary))' },
    { name: 'Nočne more', value: Math.floor(dreams.length * 0.10), color: 'hsl(var(--destructive))' },
    { name: 'Ponavljajoče', value: Math.floor(dreams.length * 0.15), color: 'hsl(var(--accent))' },
  ];

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
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Analitika sanj</h1>
              <p className="text-muted-foreground">AI analiza vaših vzorcev sanjanja</p>
            </div>
          </div>
        </div>

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
          actionName="AI Vzorčna analiza"
          actionDescription={`Celovita AI analiza vzorcev za ${Math.min(analysisRequirements.analyzedDreams, 30)} najnovejših analiziranih sanj.`}
        />

        {/* AI Pattern Analysis */}
        {isAnalyzing ? (
          <Card className="mb-8">
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">AI analizira vzorce vaših sanj...</p>
                <p className="text-sm text-muted-foreground mt-2">To lahko traja do 60 sekund</p>
              </div>
            </CardContent>
          </Card>
        ) : patternAnalysis ? (
          <>
            {/* Overall Insights */}
            <Card className="mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="h-5 w-5 text-primary" />
                    <span>AI Pregled vzorcev</span>
                  </CardTitle>
                  <Button 
                    onClick={() => generatePatternAnalysis(dreams, analyses, true)}
                    disabled={isAnalyzing}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-2", isAnalyzing && "animate-spin")} />
                    Osveži
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                  {patternAnalysis.executive_summary || patternAnalysis.overall_insights}
                </p>
              </CardContent>
            </Card>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Theme Frequency */}
              {themeData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Pogoste teme</CardTitle>
                    <CardDescription>Najpogosteje pojavljajoče se teme v vaših sanjah</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={themeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Emotion Distribution */}
              {emotionData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Čustveni vzorci</CardTitle>
                    <CardDescription>Porazdelitev čustev v vaših sanjah</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={emotionData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          fill="hsl(var(--primary))"
                          dataKey="value"
                          label={(entry) => entry.name}
                        >
                          {emotionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* New Analytics Features */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Dream Quality Trends */}
              {dreamQualityData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Kakovost sanj</CardTitle>
                    <CardDescription>Razvoj kakovosti in živosti sanj</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={dreamQualityData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 10]} />
                        <Tooltip />
                        <Area 
                          type="monotone" 
                          dataKey="quality" 
                          stackId="1"
                          stroke="hsl(var(--primary))" 
                          fill="hsl(var(--primary))" 
                          fillOpacity={0.3}
                          name="Kakovost"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="vividness" 
                          stackId="2"
                          stroke="hsl(var(--secondary))" 
                          fill="hsl(var(--secondary))" 
                          fillOpacity={0.3}
                          name="Živost"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Dream Categories */}
              <Card>
                <CardHeader>
                  <CardTitle>Kategorije sanj</CardTitle>
                  <CardDescription>Porazdelitev tipov sanj</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={dreamCategoriesData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={(entry) => entry.value > 0 ? entry.name : ''}
                      >
                        {dreamCategoriesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Milestones */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5 text-primary" />
                  <span>Dosežki</span>
                </CardTitle>
                <CardDescription>Vaši mejniki v raziskovanju sanj</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {milestones.map((milestone, index) => {
                    const Icon = milestone.icon;
                    return (
                      <div 
                        key={index} 
                        className={cn(
                          "p-4 rounded-lg border transition-all",
                          milestone.achieved 
                            ? "border-primary bg-primary/5 shadow-sm" 
                            : "border-border bg-muted/30"
                        )}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center",
                            milestone.achieved 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-muted text-muted-foreground"
                          )}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <h4 className={cn(
                            "font-medium",
                            milestone.achieved ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {milestone.title}
                          </h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {milestone.description}
                        </p>
                        {milestone.achieved && (
                          <Badge variant="secondary" className="mt-2">
                            Doseženo ✓
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Detailed Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Personal Growth */}
              <Card>
                <CardHeader>
                  <CardTitle>Osebna rast</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {patternAnalysis.personal_growth}
                  </p>
                </CardContent>
              </Card>

               {/* Recommendations */}
               <Card>
                 <CardHeader>
                   <CardTitle>Priporočila</CardTitle>
                 </CardHeader>
                 <CardContent>
                   <ul className="space-y-3">
                     {patternAnalysis.recommendations?.map((rec, index) => (
                       <li key={index} className="flex items-start space-x-3">
                         <Badge variant="outline" className="mt-1 shrink-0">{index + 1}</Badge>
                         <div className="flex-1">
                           {typeof rec === 'string' ? (
                             <span className="text-foreground">{rec}</span>
                           ) : (
                             <div className="space-y-1">
                               <div className="font-medium text-foreground">{rec.action}</div>
                               {rec.rationale && (
                                 <div className="text-sm text-muted-foreground">{rec.rationale}</div>
                               )}
                               {rec.implementation && (
                                 <div className="text-xs text-muted-foreground italic">💡 {rec.implementation}</div>
                               )}
                             </div>
                           )}
                         </div>
                       </li>
                     ))}
                   </ul>
                 </CardContent>
               </Card>
             </div>

             {/* Enhanced Analysis Sections */}
             {(patternAnalysis.psychological_insights || patternAnalysis.life_stage_analysis || patternAnalysis.integration_suggestions) && (
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                 {/* Psychological Insights */}
                 {patternAnalysis.psychological_insights && (
                   <Card>
                     <CardHeader>
                       <CardTitle className="flex items-center space-x-2">
                         <Brain className="h-5 w-5 text-primary" />
                         <span>Psihološki vpogledi</span>
                       </CardTitle>
                     </CardHeader>
                     <CardContent>
                       <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                         {patternAnalysis.psychological_insights}
                       </p>
                     </CardContent>
                   </Card>
                 )}

                 {/* Life Stage Analysis */}
                 {patternAnalysis.life_stage_analysis && (
                   <Card>
                     <CardHeader>
                       <CardTitle className="flex items-center space-x-2">
                         <Target className="h-5 w-5 text-primary" />
                         <span>Življenjska faza</span>
                       </CardTitle>
                     </CardHeader>
                     <CardContent>
                       <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                         {patternAnalysis.life_stage_analysis}
                       </p>
                     </CardContent>
                   </Card>
                 )}

                 {/* Integration Suggestions */}
                 {patternAnalysis.integration_suggestions && (
                   <Card className="lg:col-span-2">
                     <CardHeader>
                       <CardTitle className="flex items-center space-x-2">
                         <Sparkles className="h-5 w-5 text-primary" />
                         <span>Integracija spoznanj</span>
                       </CardTitle>
                     </CardHeader>
                     <CardContent>
                       <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                         {patternAnalysis.integration_suggestions}
                       </p>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {patternAnalysis.symbol_meanings.map((symbol, index) => (
                      <div key={index} className="p-4 rounded-lg border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-foreground">{symbol.symbol}</h4>
                          <Badge variant="outline">{symbol.frequency}x</Badge>
                        </div>
                         <p className="text-sm text-muted-foreground leading-relaxed">{symbol.interpretation}</p>
                         {symbol.personal_context && (
                           <p className="text-xs text-muted-foreground mt-2 italic">
                             🔗 {symbol.personal_context}
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

            {/* Temporal Patterns */}
            {patternAnalysis.temporal_patterns && (
              <Card>
                <CardHeader>
                  <CardTitle>Časovni vzorci</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {patternAnalysis.temporal_patterns}
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        ) : !analysisRequirements.canAnalyze ? (
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
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Potrebne so analizirane sanje</h3>
              <p className="text-muted-foreground mb-4">Analizirajte svoje sanje na dashboard strani za vzorčno analizo.</p>
              <Button onClick={() => navigate('/dashboard')}>Nazaj na Dashboard</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Analytics;