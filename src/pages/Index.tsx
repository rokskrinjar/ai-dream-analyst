import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Brain, Sparkles, TrendingUp, Moon, Activity, Eye, BookOpen, Heart, Lightbulb, Shield, Check, Users, CheckCircle2, Star, Zap } from "lucide-react";
import { TestimonialSection } from "@/components/TestimonialSection";
import { FAQSection } from "@/components/FAQSection";
import { LandingHeader } from "@/components/LandingHeader";
import heroImage from "@/assets/modern-dream-hero.jpg";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const features = [
    {
      icon: <BookOpen className="h-6 w-6" />,
      title: "Dream Journal",
      description: "Keep a secure digital journal of your dreams with rich details and emotions"
    },
    {
      icon: <Brain className="h-6 w-6" />,
      title: "AI Analysis",
      description: "Get deep insights powered by advanced AI based on psychological theories"
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Personal Insights",
      description: "Track patterns and discover meanings in your subconscious"
    },
    {
      icon: <Moon className="h-6 w-6" />,
      title: "REM Analysis",
      description: "Understand your sleep cycles and dream phases"
    },
    {
      icon: <Eye className="h-6 w-6" />,
      title: "Symbolism",
      description: "Decode symbols and their personal significance"
    },
    {
      icon: <Heart className="h-6 w-6" />,
      title: "Emotional Analysis",
      description: "Track emotional patterns across your dreams"
    }
  ];

  const steps = [
    {
      icon: <Lightbulb className="h-8 w-8" />,
      title: "Record Your Dreams",
      description: "Write down your dreams immediately after waking for best recall"
    },
    {
      icon: <Brain className="h-8 w-8" />,
      title: "AI Analysis",
      description: "Get instant AI-powered analysis based on psychology"
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Discover Insights",
      description: "Understand themes, emotions, and patterns in your dreams"
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Track Progress",
      description: "Monitor your dream journey and personal growth"
    }
  ];

  const emotionalPoints = [
    "Dreams help process daily emotions and experiences",
    "REM sleep is crucial for emotional regulation",
    "Recurring dreams often reflect unresolved emotional issues",
    "Dreams can reveal suppressed feelings and thoughts"
  ];

  const creativityPoints = [
    "Dreams enhance problem-solving abilities",
    "Many innovations came from dreams (e.g., periodic table, sewing machine)",
    "Dreams connect seemingly unrelated concepts",
    "Artists and musicians often find inspiration in dreams"
  ];

  const mentalHealthPoints = [
    "Dreams reflect mental and emotional well-being",
    "Analyzing dreams can reveal stress and anxiety patterns",
    "Dream journaling is therapeutic and promotes self-awareness",
    "Understanding dreams can improve overall mental health"
  ];

  const recallPoints = [
    "Keeping a dream journal significantly improves recall",
    "Writing dreams immediately after waking preserves details",
    "Regular practice strengthens dream memory",
    "Better recall leads to deeper self-understanding"
  ];

  const selfAwarenessPoints = [
    "Dreams reveal subconscious thoughts and desires",
    "Patterns in dreams reflect life patterns",
    "Understanding symbols leads to personal growth",
    "Dreams are a window to your inner self"
  ];

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        {/* Hero Section */}
        <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-background/90 z-10" />
          <img 
            src={heroImage} 
            alt="Dream" 
            className="w-full h-full object-cover opacity-20"
          />
        </div>

        {/* Content */}
        <div className="relative z-20 container mx-auto px-6 py-32 text-center">
          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 max-w-5xl mx-auto leading-tight animate-fade-in">
            Unlock the Secrets of Your Dreams
          </h1>

          {/* Subtext */}
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed animate-fade-in">
            Transform your dreams into insights with AI-powered analysis. Discover hidden meanings, track patterns, and embark on a journey of self-discovery.
          </p>

          {/* CTA Button */}
          <div className="animate-fade-in">
            <Button 
              size="lg" 
              className="text-lg px-10 py-7 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => navigate("/auth")}
            >
              Start Your Dream Journal
            </Button>
          </div>
        </div>
      </section>


      {/* Science Behind Dreams Section */}
      <section id="science-behind-dreams" className="container mx-auto px-4 py-16 bg-muted/30">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">The Science Behind Dreams</h2>
            <p className="text-lg text-muted-foreground">Evidence-based insights into why dreams matter for your wellbeing</p>
          </div>
          
          <Tabs defaultValue="emotional" className="max-w-6xl mx-auto">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-2 h-auto bg-background/60 backdrop-blur-sm p-2">
              <TabsTrigger value="emotional" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-primary/10">
                <Brain className="h-5 w-5" />
                <span className="text-xs md:text-sm">Emotional Health</span>
              </TabsTrigger>
              <TabsTrigger value="creativity" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-primary/10">
                <Sparkles className="h-5 w-5" />
                <span className="text-xs md:text-sm">Creativity</span>
              </TabsTrigger>
              <TabsTrigger value="mentalHealth" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-primary/10">
                <TrendingUp className="h-5 w-5" />
                <span className="text-xs md:text-sm">Mental Health</span>
              </TabsTrigger>
              <TabsTrigger value="recall" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-primary/10">
                <BookOpen className="h-5 w-5" />
                <span className="text-xs md:text-sm">Dream Recall</span>
              </TabsTrigger>
              <TabsTrigger value="selfAwareness" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-primary/10">
                <Eye className="h-5 w-5" />
                <span className="text-xs md:text-sm">Self-Awareness</span>
              </TabsTrigger>
            </TabsList>

            {/* Emotional Tab */}
            <TabsContent value="emotional" className="mt-8 space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-4">Dreams and Emotional Processing</h3>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">Dreams are your brain's way of processing emotions and experiences from daily life.</p>
              </div>

              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-l-4 border-primary p-6 max-w-3xl mx-auto">
                <p className="text-lg italic mb-2">"Dreams are the royal road to the unconscious."</p>
                <p className="text-sm text-muted-foreground">— Sigmund Freud</p>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {emotionalPoints.map((point, idx) => (
                  <Card key={idx} className="p-4 hover-scale">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{point}</p>
                    </div>
                  </Card>
                ))}
              </div>

              <p className="text-sm text-center text-muted-foreground italic">Research from Harvard Medical School, 2020</p>
            </TabsContent>

            {/* Creativity Tab */}
            <TabsContent value="creativity" className="mt-8 space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-4">Dreams Boost Creativity</h3>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">REM sleep and dreams enhance creative problem-solving and innovation.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {creativityPoints.map((point, idx) => (
                  <Card key={idx} className="p-4 hover-scale">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{point}</p>
                    </div>
                  </Card>
                ))}
              </div>

              <Card className="bg-accent/50 p-6 max-w-3xl mx-auto">
                <p className="text-center"><span className="font-semibold">Famous breakthroughs: </span>Periodic table (Mendeleev), DNA structure (James Watson), Google (Larry Page)</p>
              </Card>

              <p className="text-sm text-center text-muted-foreground italic">UC Berkeley Sleep and Neuroimaging Lab</p>
            </TabsContent>

            {/* Mental Health Tab */}
            <TabsContent value="mentalHealth" className="mt-8 space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-4">Dreams and Mental Wellbeing</h3>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">Understanding your dreams can improve mental health and emotional balance.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {mentalHealthPoints.map((point, idx) => (
                  <Card key={idx} className="p-4 hover-scale">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{point}</p>
                    </div>
                  </Card>
                ))}
              </div>

              <p className="text-sm text-center text-muted-foreground italic">American Psychological Association</p>
            </TabsContent>

            {/* Recall Tab */}
            <TabsContent value="recall" className="mt-8 space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-4">Improving Dream Recall</h3>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">Learn techniques to remember and analyze your dreams effectively.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {recallPoints.map((point, idx) => (
                  <Card key={idx} className="p-4 hover-scale">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{point}</p>
                    </div>
                  </Card>
                ))}
              </div>

              <p className="text-sm text-center text-muted-foreground italic">Journal of Sleep Research</p>
            </TabsContent>

            {/* Self-Awareness Tab */}
            <TabsContent value="selfAwareness" className="mt-8 space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-4">Dreams and Self-Discovery</h3>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">Dreams provide unique insights into your subconscious mind and personal growth.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {selfAwarenessPoints.map((point, idx) => (
                  <Card key={idx} className="p-4 hover-scale">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{point}</p>
                    </div>
                  </Card>
                ))}
              </div>

              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-l-4 border-primary p-6 max-w-3xl mx-auto">
                <p className="text-lg font-semibold text-center">Understanding your dreams is a journey of self-discovery and personal transformation.</p>
              </Card>

              <p className="text-sm text-center text-muted-foreground italic">Carl Jung Institute</p>
            </TabsContent>
          </Tabs>

          <div className="text-center mt-12">
            <Button size="lg" onClick={() => navigate('/auth')} className="gap-2">
              <Sparkles className="h-5 w-5" />
              Start Analyzing Your Dreams
            </Button>
          </div>
        </section>

      {/* Enhanced Features Section */}
      <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12 animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Powerful Features for Dream Analysis
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to understand and track your dreams
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

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 bg-card">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-foreground">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-full w-full h-0.5 bg-primary/20 -translate-x-1/2" 
                       style={{ width: 'calc(100% - 3rem)' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section id="pricing-preview" className="py-20 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
            Choose Your Plan
          </h2>
          <p className="text-muted-foreground text-center mb-12 text-lg">
            Start with our free plan or upgrade for unlimited AI-powered analysis
          </p>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Free Plan */}
            <Card className="border-border hover:shadow-lg transition-shadow">
              <CardHeader className="text-center pb-8">
                <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold">Free</CardTitle>
                <CardDescription>Perfect for getting started</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">€0</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-lg font-semibold">5 credits/month</p>
                  <p className="text-sm text-muted-foreground">for AI dream analysis</p>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>Unlimited dream journaling</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>5 AI analyses per month</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>Basic dream tracking</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Basic Plan */}
            <Card className="border-primary relative">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                Most Popular
              </Badge>
              <CardHeader className="text-center pb-8">
                <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold">Basic</CardTitle>
                <CardDescription>For regular dreamers</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">€4.99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-lg font-semibold">50 credits/month</p>
                  <p className="text-sm text-muted-foreground">for AI dream analysis</p>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>Everything in Free</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>50 AI analyses per month</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>Advanced pattern analysis</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card className="border-border hover:shadow-lg transition-shadow">
              <CardHeader className="text-center pb-8">
                <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold">Premium</CardTitle>
                <CardDescription>For dream enthusiasts</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">€9.99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg">
                  <p className="text-lg font-semibold">Unlimited</p>
                  <p className="text-sm text-muted-foreground">dream analyses</p>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>Everything in Basic</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>Unlimited AI analyses</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>Priority support</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <Button size="lg" onClick={() => navigate('/pricing')}>
              View All Plans
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQSection />

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Understand Your Dreams?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of users discovering the hidden meanings in their dreams
          </p>
          <Button size="lg" onClick={() => navigate('/auth')} className="text-lg px-10">
            Get Started For Free
          </Button>
        </div>
      </section>
      </main>
    </div>
  );
};

export default Index;
