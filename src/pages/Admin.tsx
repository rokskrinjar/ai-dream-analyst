import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Users, 
  Brain, 
  CreditCard, 
  Activity,
  Search,
  Shield,
  FileText,
  TrendingUp
} from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';

interface AdminStats {
  totalUsers: number;
  totalDreams: number;
  totalAnalyses: number;
  totalCreditsUsed: number;
  newUsersToday: number;
  dreamsToday: number;
}

interface User {
  id: string;
  email: string;
  created_at: string;
  display_name?: string;
  credits_remaining?: number;
  role?: string;
}

const Admin = () => {
  const { isAdmin, loading } = useAdmin();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    if (isAdmin) {
      loadStats();
      loadUsers();
    }
  }, [isAdmin]);

  const loadStats = async () => {
    try {
      const [
        { count: totalUsers },
        { count: totalDreams },
        { count: totalAnalyses },
        { data: creditData }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('dreams').select('*', { count: 'exact', head: true }),
        supabase.from('dream_analyses').select('*', { count: 'exact', head: true }),
        supabase.from('user_credits').select('credits_used_this_month')
      ]);

      const totalCreditsUsed = creditData?.reduce((sum, user) => sum + (user.credits_used_this_month || 0), 0) || 0;
      
      // Get today's stats
      const today = new Date().toISOString().split('T')[0];
      const [
        { count: newUsersToday },
        { count: dreamsToday }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', today),
        supabase.from('dreams').select('*', { count: 'exact', head: true }).gte('created_at', today)
      ]);

      setStats({
        totalUsers: totalUsers || 0,
        totalDreams: totalDreams || 0,
        totalAnalyses: totalAnalyses || 0,
        totalCreditsUsed,
        newUsersToday: newUsersToday || 0,
        dreamsToday: dreamsToday || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('Napaka pri nalaganju statistik');
    }
  };

  const loadUsers = async () => {
    try {
      // Get profiles with user credits and roles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          user_credits (credits_remaining),
          user_roles (role)
        `);

      if (profileError) throw profileError;

      // Transform data to include email from auth metadata if available
      const formattedUsers = profiles?.map(profile => ({
        id: profile.user_id,
        email: `user-${profile.user_id.slice(0, 8)}`, // Placeholder since we can't access auth.users directly
        created_at: profile.created_at,
        display_name: profile.display_name,
        credits_remaining: Array.isArray(profile.user_credits) ? profile.user_credits[0]?.credits_remaining || 0 : 0,
        role: Array.isArray(profile.user_roles) ? profile.user_roles[0]?.role || 'user' : 'user'
      })) || [];

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Napaka pri nalaganju uporabnikov');
    }
  };

  const updateUserCredits = async (userId: string, credits: number) => {
    try {
      const { error } = await supabase
        .from('user_credits')
        .upsert({
          user_id: userId,
          credits_remaining: credits,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Krediti uspešno posodobljeni');
      loadUsers(); // Reload users to show updated credits
    } catch (error) {
      console.error('Error updating credits:', error);
      toast.error('Napaka pri posodabljanju kreditov');
    }
  };

  const makeUserAdmin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'admin'
        });

      if (error) throw error;

      toast.success('Uporabnik je sedaj administrator');
      loadUsers(); // Reload to show updated role
    } catch (error) {
      console.error('Error making user admin:', error);
      toast.error('Napaka pri dodeljevanju admin pravic');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const filteredUsers = users.filter(user => 
    user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader showBackButton title="Administracija" subtitle="Upravljanje sistema Lovilec Sanj" />
      
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Skupaj Uporabnikov</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                +{stats?.newUsersToday} danes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Skupaj Sanj</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalDreams}</div>
              <p className="text-xs text-muted-foreground">
                +{stats?.dreamsToday} danes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Analize</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalAnalyses}</div>
              <p className="text-xs text-muted-foreground">
                Skupaj opravljenih
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Porabljeni Krediti</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCreditsUsed}</div>
              <p className="text-xs text-muted-foreground">
                Ta mesec
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uspešnost Sistema</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">98.5%</div>
              <p className="text-xs text-muted-foreground">
                Uptime ta mesec
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Uporabniki</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
            <TabsTrigger value="system">Sistem</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upravljanje Uporabnikov</CardTitle>
                <CardDescription>
                  Pregled in upravljanje vseh registriranih uporabnikov
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-4">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Išči po imenu ali email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>

                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="font-medium">{user.display_name || 'Brez imena'}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                        <div className="flex items-center gap-2">
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {user.credits_remaining} kreditov
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Krediti"
                          className="w-20"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const credits = parseInt((e.target as HTMLInputElement).value);
                              if (!isNaN(credits)) {
                                updateUserCredits(user.id, credits);
                              }
                            }
                          }}
                        />
                        {user.role !== 'admin' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => makeUserAdmin(user.id)}
                          >
                            Naredi Admin
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Audit Log</CardTitle>
                <CardDescription>
                  Pregled vseh admin aktivnosti v sistemu
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4" />
                  <p>Audit log funkcionalnost bo na voljo kmalu</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sistemske Informacije</CardTitle>
                <CardDescription>
                  Pregled delovanja in performance metrik
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4" />
                  <p>Sistemske metrике bodo na voljo kmalu</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Admin;