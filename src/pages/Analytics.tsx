import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Brain, TrendingUp, Calendar, Heart, Eye, Loader2, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

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
  overall_insights: string;
  theme_patterns: Array<{ theme: string; frequency: number; significance: string }>;
  emotional_journey: Array<{ emotion: string; frequency: number; trend: string }>;
  symbol_meanings: Array<{ symbol: string; frequency: number; interpretation: string }>;
  temporal_patterns: string;
  recommendations: string[];
  personal_growth: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--secondary))', 'hsl(var(--muted))'];

const Analytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [analyses, setAnalyses] = useState<DreamAnalysis[]>([]);
  const [patternAnalysis, setPatternAnalysis] = useState<PatternAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
      
      // Generate pattern analysis if we have enough data
      if (dreamsData && dreamsData.length > 0 && analysesData.length > 0) {
        generatePatternAnalysis(dreamsData, analysesData);
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

  const generatePatternAnalysis = async (dreams: Dream[], analyses: DreamAnalysis[], forceRefresh = false) => {
    try {
      setIsAnalyzing(true);
      
      const { data, error } = await supabase.functions.invoke('analyze-dream-patterns', {
        body: { dreams, analyses, forceRefresh }
      });

      if (error) throw error;
      
      if (data?.analysis) {
        setPatternAnalysis(data.analysis);
        if (data.cached && !forceRefresh) {
          console.log('Loaded cached pattern analysis');
        } else {
          console.log('Generated fresh pattern analysis');
        }
      }
      
    } catch (error: any) {
      console.error('Error generating pattern analysis:', error);
      toast({
        title: "Napaka",
        description: "Napaka pri ustvarjanju analize vzorcev.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
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

  const moodData = dreams.reduce((acc: any[], dream) => {
    if (dream.mood) {
      const existing = acc.find(item => item.name === dream.mood);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: dream.mood, value: 1 });
      }
    }
    return acc;
  }, []);

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
              <CardTitle className="text-sm font-medium">Različna razpoloženja</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{moodData.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* AI Pattern Analysis */}
        {isAnalyzing ? (
          <Card className="mb-8">
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">AI analizira vzorce vaših sanj...</p>
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
                  {patternAnalysis.overall_insights}
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

            {/* Mood Distribution */}
            {moodData.length > 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Razpoloženje ob sanjah</CardTitle>
                  <CardDescription>Kako se počutite med sanjami</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={moodData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--accent))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

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
                  <ul className="space-y-2">
                    {patternAnalysis.recommendations?.map((rec, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <Badge variant="outline" className="mt-1 shrink-0">{index + 1}</Badge>
                        <span className="text-foreground">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

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
                        <p className="text-sm text-muted-foreground">{symbol.interpretation}</p>
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