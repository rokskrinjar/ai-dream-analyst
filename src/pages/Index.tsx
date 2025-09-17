import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Brain, Sparkles, ArrowRight, TrendingUp, Moon, Eye, Heart, Lightbulb, Users, Shield, Star, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { TestimonialSection } from "@/components/TestimonialSection";
import { FAQSection } from "@/components/FAQSection";
import { InteractiveDreamJournal } from "@/components/InteractiveDreamJournal";

// Force cache refresh

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
      title: "Dnevnik sanj",
      description: "Enostavno beležite in organizirajte svoje sanje z intuitivnim vmesnikom"
    },
    {
      icon: <Brain className="h-6 w-6" />,
      title: "AI analiza",
      description: "Napredne algoritme prepoznajo vzorce in vam nudijo osebne vpoglede"
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Osebni vpogledi",
      description: "Odkrijte povezave med vašimi sanjami in vsakodnevnim življenjem"
    },
    {
      icon: <Moon className="h-6 w-6" />,
      title: "REM analiza",
      description: "Razumejte različne faze spanja in kako vplivajo na vaše sanje"
    },
    {
      icon: <Eye className="h-6 w-6" />,
      title: "Simbolika sanj",
      description: "Odkrijte pomen simbolov v vaših sanjah z arhetipskim pristopom"
    },
    {
      icon: <Heart className="h-6 w-6" />,
      title: "Čustvena analiza",
      description: "Analizirajte čustvene vzorce in njihov vpliv na vsakdanje življenje"
    }
  ];

  const dreamFacts = [
    {
      title: "Vsi sanjamo",
      description: "Kljub temu da 7% ljudi trdi, da ne sanja, znanost potrjuje, da vsi sanjamo med REM fazo spanja"
    },
    {
      title: "Freudova teorija",
      description: "Sanje so ventili za nepotešene želje in omogočajo sprostitev nezavednih potreb"
    },
    {
      title: "Jungovi arhetipi", 
      description: "Vsak posameznik shranjuje simbole in vzorce v kolektivnem nezavednem"
    },
    {
      title: "Čustveno procesiranje",
      description: "Možgani med spanjem bolj delujejo na čustveni ravni in ustvarijo povezave"
    }
  ];

  const steps = [
    {
      icon: <Lightbulb className="h-8 w-8" />,
      title: "Beležite sanje",
      description: "Takoj po prebujenju zapišite svoje sanje v dnevnik"
    },
    {
      icon: <Brain className="h-8 w-8" />,
      title: "AI analiza",
      description: "Naša umetna inteligenca analizira vzorce in simboliko"
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Osebni vpogledi",
      description: "Prejmite personalizirane interpretacije na podlagi psiholoških teorij"
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Sledite napredku",
      description: "Opazujte dolgoročne vzorce in čustvene spremembe"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <main>
        {/* Enhanced Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 gradient-bg"></div>
          <div className="container relative mx-auto px-4 py-16 lg:py-24">
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="flex-1 text-center lg:text-left">
                <div className="space-y-8 animate-fade-in-up">
                  {/* Trust indicators */}
                  <div className="flex items-center justify-center lg:justify-start gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span>4.9/5 ocena</span>
                    </div>
                    <div className="w-px h-4 bg-border"></div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>10,000+ uporabnikov</span>
                    </div>
                    <div className="w-px h-4 bg-border"></div>
                    <div className="flex items-center gap-1">
                      <Shield className="h-4 w-4" />
                      <span>100% zasebno</span>
                    </div>
                  </div>

                  <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-foreground animate-glow-pulse">
                    <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      Lovilec Sanj
                    </span>
                  </h1>
                  
                  <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                    Odkrijte skrita sporočila svojih sanj z močjo umetne inteligence. 
                    Analizirajte vzorce, razumejte simboliko in pridobite osebne vpoglede v svoj notranji svet.
                  </p>

                  {/* Social proof */}
                  <div className="glass-card p-4 max-w-md mx-auto lg:mx-0">
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-primary" />
                      <div className="text-sm">
                        <span className="font-semibold text-foreground">Nova AI analiza</span>
                        <span className="text-muted-foreground"> • Posodobljena z GPT-4o</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                    <Button 
                      size="lg" 
                      className="font-semibold px-8 py-4 text-lg hover:shadow-lg transition-all duration-300 animate-glow-pulse"
                      onClick={() => navigate('/auth')}
                    >
                      Začni brezplačno
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="lg"
                      className="font-semibold px-8 py-4 text-lg glass-card hover:bg-primary/5"
                      onClick={() => navigate('/pricing')}
                    >
                      <TrendingUp className="mr-2 h-5 w-5" />
                      Poglej cene
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex-1 relative">
                <InteractiveDreamJournal />
              </div>
            </div>
          </div>
        </section>


        {/* About Dreams Section */}
        <section id="about-dreams" className="container mx-auto px-4 py-16 bg-muted/30">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Zakaj so sanje pomembne?
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Sanje so fiziološko in psihološko zavestno stanje, ki se pojavi med spanjem. 
              Vključujejo slike, misli in čustva, ki odražajo naša doživljanja, izkušnje in nezavedne procese.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {dreamFacts.map((fact, index) => (
              <Card key={index} className="border-border/50 hover:shadow-lg transition-all duration-300">
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-lg text-foreground">
                    {fact.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-muted-foreground">
                    {fact.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button 
              size="lg"
              className="font-semibold px-8 py-3"
              onClick={() => navigate('/auth')}
            >
              <Brain className="mr-2 h-5 w-5" />
              Analiziraj svoje sanje zdaj
            </Button>
          </div>
        </section>

        {/* Enhanced Features Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12 animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Napredne funkcije za analizo sanj
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Kombiniramo najnovejše dosežke umetne inteligence z globokimi psihološkimi teorijami Freuda in Junga
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
              Kako deluje analiza sanj?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Preprost proces v štirih korakih za globlje razumevanje vaših sanj
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
                Znanstvena podlaga
              </h2>
              <p className="text-lg text-muted-foreground">
                Naša analiza temelji na priznajih psiholoških teorijah in modernih raziskavah spanja
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 mb-12">
              <Card className="glass-card p-8 animate-fade-in-up">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Brain className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground">Freudova teorija</h3>
                </div>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Sigmund Freud je opredelil sanje kot "ventile" za nepotešene želje in nezavedne impulze. 
                  Sanje nam omogočajo, da potešimo nagone, zaradi katerih smo nemirni, in razkrijejo 
                  potlačene misli ter spomini.
                </p>
                <div className="glass-card p-3 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Nezavedno procesiranje</span>
                </div>
              </Card>

              <Card className="glass-card p-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                    <Eye className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground">Jungovi arhetipi</h3>
                </div>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Carl Gustav Jung je predstavil teorijo kolektivnega nezavednega in arhetipov. 
                  Vsak posameznik shranjuje simbole in vzorce, ki se izražajo skozi sanje in 
                  nosijo pomembna sporočila podzavesti.
                </p>
                <div className="glass-card p-3 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-foreground">Simbolika in vzorci</span>
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
                Odkrijte svojo simboliko sanj
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
                    <span className="text-sm font-medium text-foreground">Začni danes brezplačno</span>
                  </div>
                  
                  <h3 className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
                    Pripravljen odkrivati 
                    <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> 
                      {" "}skrivnosti svojih sanj?
                    </span>
                  </h3>
                  
                  <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
                    Pridruži se več kot 10,000 uporabnikom, ki že raziskujejo vzorce svojih sanj in izboljšujejo 
                    razumevanje svojega notranjega sveta z znanstveno podprto AI analizo.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-6 justify-center mb-8">
                  <Button 
                    size="lg"
                    className="font-semibold px-12 py-4 text-xl hover:shadow-lg transition-all duration-300 animate-glow-pulse"
                    onClick={() => navigate('/auth')}
                  >
                    <Brain className="mr-3 h-6 w-6" />
                    Registriraj se brezplačno
                  </Button>
                  <Button 
                    variant="outline"
                    size="lg"
                    className="font-semibold px-8 py-4 text-xl glass-card hover:bg-primary/5"
                    onClick={() => {
                      document.getElementById('about-dreams')?.scrollIntoView({ 
                        behavior: 'smooth' 
                      });
                    }}
                  >
                    Preberi več o sanjah
                  </Button>
                </div>

                {/* Trust indicators */}
                <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span>100% zasebno in varno</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span>4.9/5 povprečna ocena</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <span>Takojšnja analiza</span>
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
              <h4 className="text-lg font-semibold text-foreground mb-4">Lovilec Sanj</h4>
              <p className="text-muted-foreground text-sm">
                Analizirajte svoje sanje z umetno inteligenco in odkrijte vzorce svojega nezavednega.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">O sanjah</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• REM faza spanja</li>
                <li>• Simbolika in arhetipi</li>
                <li>• Čustveno procesiranje</li>
                <li>• Psihološka interpretacija</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">Začnite</h4>
              <Button 
                className="w-full mb-4"
                onClick={() => navigate('/auth')}
              >
                Raziskuj svoje sanje
              </Button>
              <p className="text-xs text-muted-foreground">
                Brezplačna registracija • Zaupne analize
              </p>
            </div>
          </div>
          
          <div className="border-t border-border/30 pt-8 text-center text-muted-foreground">
            <p>© 2024 Lovilec Sanj. Vse pravice pridržane.</p>
            <p className="mt-2 text-sm">
              Bazirana na Freudovih in Jungovih teorijah • Podprta z AI tehnologijo
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;