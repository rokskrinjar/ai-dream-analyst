import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, 
  BookOpen, 
  Brain, 
  TrendingUp, 
  LogOut, 
  User,
  Calendar,
  Sparkles
} from 'lucide-react';

interface Dream {
  id: string;
  title: string;
  content: string;
  dream_date: string;
  mood?: string;
  created_at: string;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchDreams();
  }, [user, navigate]);

  const fetchDreams = async () => {
    try {
      const { data, error } = await supabase
        .from('dreams')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setDreams(data || []);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/30 bg-card/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Brain className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Lovilec Sanj</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{user?.email}</span>
              </div>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Odjava
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Skupaj sanj
                </CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{dreams.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Vaš osebni dnevnik
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ta mesec
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {dreams.filter(dream => {
                  const dreamDate = new Date(dream.created_at);
                  const now = new Date();
                  return dreamDate.getMonth() === now.getMonth() && 
                         dreamDate.getFullYear() === now.getFullYear();
                }).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Novih vnosov
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  AI analiz
                </CardTitle>
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">0</div>
              <p className="text-xs text-muted-foreground mt-1">
                Kmalu na voljo
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Actions */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Recent Dreams */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">Nedavne sanje</h2>
              <Button onClick={() => navigate('/dream/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Nova sanja
              </Button>
            </div>

            {dreams.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="p-8 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Še ni sanj
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Začnite z beleženja vaše prve sanje in odkrijte skrite vzorce.
                  </p>
                  <Button onClick={() => navigate('/dream/new')}>
                    Dodaj prvo sanje
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {dreams.map((dream) => (
                  <Card key={dream.id} className="border-border/50 hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base text-foreground">
                          {dream.title}
                        </CardTitle>
                        <span className="text-xs text-muted-foreground">
                          {new Date(dream.dream_date).toLocaleDateString('sl-SI')}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {dream.content}
                      </p>
                      {dream.mood && (
                        <div className="mt-3">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                            {dream.mood}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                
                {dreams.length >= 5 && (
                  <Button variant="outline" className="w-full">
                    Prikaži vse sanje
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Quick Actions & Tips */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-6">
              Hitri dostop
            </h2>
            
            <div className="space-y-4">
              <Card className="border-border/50 hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Plus className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Nova sanja</CardTitle>
                      <CardDescription>Beležite novo sanje</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card className="border-border/50 hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Analitika</CardTitle>
                      <CardDescription>Preglejte vzorce sanj</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <Brain className="h-6 w-6 text-primary" />
                    <div>
                      <CardTitle className="text-base">Nasvet dneva</CardTitle>
                      <CardDescription className="text-sm mt-2">
                        Beležite sanje takoj po prebujanju za najboljše rezultate. 
                        Spomin na sanje hitro zbledi.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;