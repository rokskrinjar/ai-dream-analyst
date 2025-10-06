import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Brain, Mail, Lock, Globe } from 'lucide-react';

const Auth = () => {
  const { t, i18n } = useTranslation(['auth', 'common']);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('sl');
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, signIn, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: t('common:error'),
        description: t('auth:errors.emptyFields'),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    await i18n.changeLanguage(selectedLanguage);
    const { error } = await signUp(email, password, selectedLanguage);
    
    if (error) {
      toast({
        title: t('auth:errors.signUpFailed'),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: t('auth:success.signUpComplete'),
        description: t('auth:success.signUpMessage'),
      });
    }
    setIsLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: t('common:error'),
        description: t('auth:errors.emptyFields'),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: t('auth:errors.signInFailed'),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: t('auth:success.signInComplete'),
        description: t('auth:success.signInMessage'),
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4 p-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common:back')}
          </Button>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Brain className="h-8 w-8 text-primary mr-2" />
              <h1 className="text-2xl font-bold text-foreground">{t('common:appName')}</h1>
            </div>
            <p className="text-muted-foreground">
              {t('auth:joinMessage')}
            </p>
          </div>
        </div>

        <Card className="border-border/50">
          <CardHeader className="text-center pb-4">
            <CardTitle>{t('auth:welcome')}</CardTitle>
            <CardDescription>
              {t('auth:welcomeMessage')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">{t('auth:signIn')}</TabsTrigger>
                <TabsTrigger value="signup">{t('auth:signUp')}</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      {t('auth:email')}
                    </Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder={t('auth:emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="flex items-center">
                      <Lock className="h-4 w-4 mr-2" />
                      {t('auth:password')}
                    </Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder={t('auth:passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? t('auth:signingIn') : t('auth:signInButton')}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="language-select" className="flex items-center">
                      <Globe className="h-4 w-4 mr-2" />
                      {t('auth:selectLanguage')}
                    </Label>
                    <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                      <SelectTrigger id="language-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="sl">🇸🇮 Slovenščina</SelectItem>
                        <SelectItem value="en">🇬🇧 English</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {t('auth:languageDescription')}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      {t('auth:email')}
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder={t('auth:emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="flex items-center">
                      <Lock className="h-4 w-4 mr-2" />
                      {t('auth:password')}
                    </Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder={t('auth:createPassword')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? t('auth:signingUp') : t('auth:signUpButton')}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;