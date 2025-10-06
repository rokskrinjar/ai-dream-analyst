import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Brain, Sparkles, ArrowRight, TrendingUp, Moon, Eye, Heart, Lightbulb, Users, Shield, Star, Zap, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { TestimonialSection } from "@/components/TestimonialSection";
import { FAQSection } from "@/components/FAQSection";
import { InteractiveDreamJournal } from "@/components/InteractiveDreamJournal";
import { useTranslation } from 'react-i18next';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation(['index', 'common']);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const features = [
    {
      icon: <BookOpen className="h-6 w-6" />,
      title: t('features.dreamJournal.title'),
      description: t('features.dreamJournal.description')
    },
    {
      icon: <Brain className="h-6 w-6" />,
      title: t('features.aiAnalysis.title'),
      description: t('features.aiAnalysis.description')
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: t('features.personalInsights.title'),
      description: t('features.personalInsights.description')
    },
    {
      icon: <Moon className="h-6 w-6" />,
      title: t('features.remAnalysis.title'),
      description: t('features.remAnalysis.description')
    },
    {
      icon: <Eye className="h-6 w-6" />,
      title: t('features.symbolism.title'),
      description: t('features.symbolism.description')
    },
    {
      icon: <Heart className="h-6 w-6" />,
      title: t('features.emotionalAnalysis.title'),
      description: t('features.emotionalAnalysis.description')
    }
  ];

  const dreamFacts = [
    {
      title: t('aboutDreams.facts.everyoneDreams.title'),
      description: t('aboutDreams.facts.everyoneDreams.description')
    },
    {
      title: t('aboutDreams.facts.freud.title'),
      description: t('aboutDreams.facts.freud.description')
    },
    {
      title: t('aboutDreams.facts.jung.title'), 
      description: t('aboutDreams.facts.jung.description')
    },
    {
      title: t('aboutDreams.facts.emotionalProcessing.title'),
      description: t('aboutDreams.facts.emotionalProcessing.description')
    }
  ];

  const steps = [
    {
      icon: <Lightbulb className="h-8 w-8" />,
      title: t('howItWorks.steps.record.title'),
      description: t('howItWorks.steps.record.description')
    },
    {
      icon: <Brain className="h-8 w-8" />,
      title: t('howItWorks.steps.analyze.title'),
      description: t('howItWorks.steps.analyze.description')
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: t('howItWorks.steps.insights.title'),
      description: t('howItWorks.steps.insights.description')
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: t('howItWorks.steps.track.title'),
      description: t('howItWorks.steps.track.description')
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <main>
        {/* Enhanced Hero Section */}
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
          {/* Radial gradient spotlight */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(139,92,246,0.15),transparent_50%)]" />
          
          {/* Floating particles */}
          <div className="absolute inset-0">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-primary/10 blur-xl animate-float-particles"
                style={{
                  width: `${Math.random() * 100 + 50}px`,
                  height: `${Math.random() * 100 + 50}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 10}s`,
                  animationDuration: `${Math.random() * 10 + 10}s`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="container relative z-10 mx-auto px-4 py-32 text-center">
          {/* Trust Badge */}
          <div className="mb-8 animate-fade-in">
            <p className="text-sm text-muted-foreground/80">
              {t('index:hero.trustBadge')}
            </p>
          </div>

          {/* Headline */}
          <h1 className="mx-auto mb-8 max-w-4xl text-5xl font-bold leading-tight text-white md:text-6xl lg:text-7xl animate-fade-in drop-shadow-2xl" style={{ animationDelay: '0.2s' }}>
            {t('index:hero.title')}
          </h1>

          {/* Subtext */}
          <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-muted-foreground/90 md:text-xl animate-fade-in" style={{ animationDelay: '0.4s' }}>
            {t('index:hero.subtitle')}
          </p>

          {/* CTA Buttons */}
          <div className="mb-16 flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <Button
              size="lg"
              className="h-14 px-8 text-lg shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all"
              onClick={() => navigate('/auth')}
            >
              {t('index:hero.cta.primary')}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="h-14 px-8 text-lg text-white hover:bg-white/10"
              onClick={() => document.getElementById('science-behind-dreams')?.scrollIntoView({ behavior: 'smooth' })}
            >
              {t('index:hero.cta.secondary')}
            </Button>
          </div>

          {/* Floating Insight Cards */}
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3 animate-fade-in" style={{ animationDelay: '0.8s' }}>
            {[
              { key: 'flying', icon: '✈️' },
              { key: 'water', icon: '💧' },
              { key: 'shadow', icon: '🌙' },
            ].map((card, index) => (
              <div
                key={card.key}
                className="group rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all hover:bg-white/10 hover:scale-105 hover:border-primary/30"
                style={{
                  animationDelay: `${1 + index * 0.2}s`,
                }}
              >
                <div className="mb-2 text-3xl">{card.icon}</div>
                <p className="text-sm text-white/80 group-hover:text-white transition-colors">
                  {t(`index:hero.insightCards.${card.key}`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>


        {/* Science Behind Dreams Section */}
        <section id="science-behind-dreams" className="container mx-auto px-4 py-16 bg-muted/30">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("index:scienceBehindDreams.title")}</h2>
            <p className="text-lg text-muted-foreground">{t("index:scienceBehindDreams.subtitle")}</p>
          </div>
          
          <Tabs defaultValue="emotional" className="max-w-6xl mx-auto">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-2 h-auto bg-background/60 backdrop-blur-sm p-2">
              <TabsTrigger value="emotional" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-primary/10">
                <Brain className="h-5 w-5" />
                <span className="text-xs md:text-sm">{t("index:scienceBehindDreams.tabs.emotional.title")}</span>
              </TabsTrigger>
              <TabsTrigger value="creativity" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-primary/10">
                <Sparkles className="h-5 w-5" />
                <span className="text-xs md:text-sm">{t("index:scienceBehindDreams.tabs.creativity.title")}</span>
              </TabsTrigger>
              <TabsTrigger value="mentalHealth" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-primary/10">
                <TrendingUp className="h-5 w-5" />
                <span className="text-xs md:text-sm">{t("index:scienceBehindDreams.tabs.mentalHealth.title")}</span>
              </TabsTrigger>
              <TabsTrigger value="recall" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-primary/10">
                <BookOpen className="h-5 w-5" />
                <span className="text-xs md:text-sm">{t("index:scienceBehindDreams.tabs.recall.title")}</span>
              </TabsTrigger>
              <TabsTrigger value="selfAwareness" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-primary/10">
                <Eye className="h-5 w-5" />
                <span className="text-xs md:text-sm">{t("index:scienceBehindDreams.tabs.selfAwareness.title")}</span>
              </TabsTrigger>
            </TabsList>

            {/* Emotional Tab */}
            <TabsContent value="emotional" className="mt-8 space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-4">{t("index:scienceBehindDreams.tabs.emotional.heading")}</h3>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">{t("index:scienceBehindDreams.tabs.emotional.description")}</p>
              </div>

              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-l-4 border-primary p-6 max-w-3xl mx-auto">
                <p className="text-lg italic mb-2">"{t("index:scienceBehindDreams.tabs.emotional.quote")}"</p>
                <p className="text-sm text-muted-foreground">— {t("index:scienceBehindDreams.tabs.emotional.quoteAuthor")}</p>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {(t("index:scienceBehindDreams.tabs.emotional.points", { returnObjects: true }) as string[]).map((point, idx) => (
                  <Card key={idx} className="p-4 hover-scale">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{point}</p>
                    </div>
                  </Card>
                ))}
              </div>

              <p className="text-sm text-center text-muted-foreground italic">{t("index:scienceBehindDreams.tabs.emotional.research")}</p>
            </TabsContent>

            {/* Creativity Tab */}
            <TabsContent value="creativity" className="mt-8 space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-4">{t("index:scienceBehindDreams.tabs.creativity.heading")}</h3>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">{t("index:scienceBehindDreams.tabs.creativity.description")}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {(t("index:scienceBehindDreams.tabs.creativity.points", { returnObjects: true }) as string[]).map((point, idx) => (
                  <Card key={idx} className="p-4 hover-scale">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{point}</p>
                    </div>
                  </Card>
                ))}
              </div>

              <Card className="bg-accent/50 p-6 max-w-3xl mx-auto">
                <p className="text-center"><span className="font-semibold">Famous breakthroughs: </span>{t("index:scienceBehindDreams.tabs.creativity.examples")}</p>
              </Card>

              <p className="text-sm text-center text-muted-foreground italic">{t("index:scienceBehindDreams.tabs.creativity.research")}</p>
            </TabsContent>

            {/* Mental Health Tab */}
            <TabsContent value="mentalHealth" className="mt-8 space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-4">{t("index:scienceBehindDreams.tabs.mentalHealth.heading")}</h3>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">{t("index:scienceBehindDreams.tabs.mentalHealth.description")}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {(t("index:scienceBehindDreams.tabs.mentalHealth.points", { returnObjects: true }) as string[]).map((point, idx) => (
                  <Card key={idx} className="p-4 hover-scale">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{point}</p>
                    </div>
                  </Card>
                ))}
              </div>

              <p className="text-sm text-center text-muted-foreground italic">{t("index:scienceBehindDreams.tabs.mentalHealth.research")}</p>
            </TabsContent>

            {/* Recall Tab */}
            <TabsContent value="recall" className="mt-8 space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-4">{t("index:scienceBehindDreams.tabs.recall.heading")}</h3>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">{t("index:scienceBehindDreams.tabs.recall.description")}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {(t("index:scienceBehindDreams.tabs.recall.points", { returnObjects: true }) as string[]).map((point, idx) => (
                  <Card key={idx} className="p-4 hover-scale">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{point}</p>
                    </div>
                  </Card>
                ))}
              </div>

              <p className="text-sm text-center text-muted-foreground italic">{t("index:scienceBehindDreams.tabs.recall.research")}</p>
            </TabsContent>

            {/* Self-Awareness Tab */}
            <TabsContent value="selfAwareness" className="mt-8 space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-4">{t("index:scienceBehindDreams.tabs.selfAwareness.heading")}</h3>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">{t("index:scienceBehindDreams.tabs.selfAwareness.description")}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {(t("index:scienceBehindDreams.tabs.selfAwareness.points", { returnObjects: true }) as string[]).map((point, idx) => (
                  <Card key={idx} className="p-4 hover-scale">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{point}</p>
                    </div>
                  </Card>
                ))}
              </div>

              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-l-4 border-primary p-6 max-w-3xl mx-auto">
                <p className="text-lg font-semibold text-center">{t("index:scienceBehindDreams.tabs.selfAwareness.summary")}</p>
              </Card>

              <p className="text-sm text-center text-muted-foreground italic">{t("index:scienceBehindDreams.tabs.selfAwareness.research")}</p>
            </TabsContent>
          </Tabs>

          <div className="text-center mt-12">
            <Button size="lg" onClick={() => navigate('/auth')} className="gap-2">
              <Sparkles className="h-5 w-5" />
              {t("index:scienceBehindDreams.cta")}
            </Button>
          </div>
        </section>

        {/* Enhanced Features Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12 animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t('features.title')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="glass-card hover:shadow-lg transition-all duration-500 hover:scale-105 group animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 flex items-center justify-center mb-4 group-hover:from-primary/30 group-hover:to-accent/30 transition-all duration-300">
                    <div className="text-primary group-hover:scale-110 transition-transform duration-300">
                      {feature.icon}
                    </div>
                  </div>
                  <CardTitle className="text-xl text-foreground group-hover:text-primary transition-colors duration-300">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-muted-foreground leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Testimonials Section */}
        <TestimonialSection />

        {/* Enhanced How It Works Section */}
        <section className="container mx-auto px-4 py-16 gradient-bg">
          <div className="text-center mb-12 animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t('howItWorks.title')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('howItWorks.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div 
                key={index} 
                className="text-center group animate-fade-in-up"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <div className="relative mb-6">
                  {/* Step number */}
                  <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                    {index + 1}
                  </div>
                  <div className="mx-auto w-20 h-20 rounded-full glass-card flex items-center justify-center group-hover:scale-110 transition-all duration-300">
                    <div className="text-primary group-hover:scale-110 transition-transform duration-300">
                      {step.icon}
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors duration-300">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Enhanced Scientific Background Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 animate-fade-in-up">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                {t('science.title')}
              </h2>
              <p className="text-lg text-muted-foreground">
                {t('science.subtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 mb-12">
              <Card className="glass-card p-8 animate-fade-in-up">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Brain className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground">{t('science.freud.title')}</h3>
                </div>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {t('science.freud.description')}
                </p>
                <div className="glass-card p-3 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{t('science.freud.tag')}</span>
                </div>
              </Card>

              <Card className="glass-card p-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                    <Eye className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground">{t('science.jung.title')}</h3>
                </div>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {t('science.jung.description')}
                </p>
                <div className="glass-card p-3 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-foreground">{t('science.jung.tag')}</span>
                </div>
              </Card>
            </div>

            <div className="text-center">
              <Button 
                variant="outline"
                size="lg"
                className="font-semibold px-8 py-4 text-lg glass-card hover:bg-primary/5 animate-glow-pulse"
                onClick={() => navigate('/auth')}
              >
                {t('science.cta')}
                <Sparkles className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <FAQSection />

        {/* Enhanced CTA Section */}
        <section className="relative py-24 overflow-hidden">
          <div className="absolute inset-0 gradient-bg"></div>
          <div className="container relative mx-auto px-4">
            <Card className="glass-card max-w-5xl mx-auto border-border/20 animate-fade-in-up">
              <CardContent className="p-12 md:p-16 text-center">
                <div className="mb-8">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">{t('cta.badge')}</span>
                  </div>
                  
                  <h3 className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
                    {t('cta.title')}
                    <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> 
                      {t('cta.titleHighlight')}
                    </span>
                  </h3>
                  
                  <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
                    {t('cta.description')}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-6 justify-center mb-8">
                  <Button 
                    size="lg"
                    className="font-semibold px-12 py-4 text-xl hover:shadow-lg transition-all duration-300 animate-glow-pulse"
                    onClick={() => navigate('/auth')}
                  >
                    <Brain className="mr-3 h-6 w-6" />
                    {t('cta.ctaButton')}
                  </Button>
                  <Button 
                    variant="outline"
                    size="lg"
                    className="font-semibold px-8 py-4 text-xl glass-card hover:bg-primary/5"
                    onClick={() => {
                      document.getElementById('science-behind-dreams')?.scrollIntoView({ 
                        behavior: 'smooth' 
                      });
                    }}
                  >
                    {t('cta.learnMore')}
                  </Button>
                </div>

                {/* Trust indicators */}
                <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span>{t('cta.trustPrivate')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span>{t('cta.trustRating')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <span>{t('cta.trustInstant')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Enhanced Footer */}
      <footer className="border-t border-border/30 mt-16 bg-muted/20">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">{t('common:appName')}</h4>
              <p className="text-muted-foreground text-sm">
                {t('footer.tagline')}
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">{t('footer.aboutDreamsTitle')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• {t('footer.dreamItem1')}</li>
                <li>• {t('footer.dreamItem2')}</li>
                <li>• {t('footer.dreamItem3')}</li>
                <li>• {t('footer.dreamItem4')}</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">{t('footer.getStartedTitle')}</h4>
              <Button 
                className="w-full mb-4"
                onClick={() => navigate('/auth')}
              >
                {t('footer.exploreButton')}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t('footer.signupInfo')}
              </p>
            </div>
          </div>
          
          <div className="border-t border-border/30 pt-8 text-center text-muted-foreground">
            <p>{t('footer.copyright')}</p>
            <p className="mt-2 text-sm">
              {t('footer.foundation')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
