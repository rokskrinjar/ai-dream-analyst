import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Brain, Sparkles, ArrowRight, TrendingUp, Moon, Eye, Heart, Lightbulb, Users, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import dreamCatcherHero from "@/assets/dream-catcher-colorful.jpg";

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
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 lg:py-24">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left">
              <div className="space-y-6">
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight text-foreground">
                  Lovilec Sanj
                </h1>
                
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0">
                  Odkrijte skrita sporočila svojih sanj z močjo umetne inteligence. 
                  Analizirajte vzorce, razumejte simboliko in pridobite osebne vpoglede v svoj notranji svet.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Button 
                    size="lg" 
                    className="font-semibold px-8 py-3"
                    onClick={() => navigate('/auth')}
                  >
                    Začni raziskovati svoje sanje
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="font-semibold px-8 py-3"
                    onClick={() => {
                      document.getElementById('about-dreams')?.scrollIntoView({ 
                        behavior: 'smooth' 
                      });
                    }}
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    Izvedite več o sanjah
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 relative">
              <img
                src={dreamCatcherHero}
                alt="Pisani lovilec sanj - simbol varstva in razumevanja sanj"
                className="w-full max-w-xs mx-auto"
              />
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

        {/* Features Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
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
                className="border-border/50 hover:shadow-lg transition-all duration-300 hover:border-primary/20"
              >
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <div className="text-primary">
                      {feature.icon}
                    </div>
                  </div>
                  <CardTitle className="text-xl text-foreground">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-muted-foreground">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* How It Works Section */}
        <section className="container mx-auto px-4 py-16 bg-muted/30">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Kako deluje analiza sanj?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Preprost proces v štirih korakih za globlje razumevanje vaših sanj
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <div className="text-primary">
                    {step.icon}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Scientific Background Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Znanstvena podlaga
              </h2>
              <p className="text-lg text-muted-foreground">
                Naša analiza temelji na priznajih psiholoških teorijah in modernih raziskavah spanja
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 mb-12">
              <div>
                <h3 className="text-2xl font-semibold text-foreground mb-4">Freudova teorija</h3>
                <p className="text-muted-foreground mb-4">
                  Sigmund Freud je opredelil sanje kot "ventile" za nepotešene želje in nezavedne impulze. 
                  Sanje nam omogočajo, da potešimo nagone, zaradi katerih smo nemirni, in razkrijejo 
                  potlačene misli ter spomini.
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Brain className="h-4 w-4" />
                  <span>Nezavedno procesiranje</span>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-semibold text-foreground mb-4">Jungovi arhetipi</h3>
                <p className="text-muted-foreground mb-4">
                  Carl Gustav Jung je predstavil teorijo kolektivnega nezavednega in arhetipov. 
                  Vsak posameznik shranjuje simbole in vzorce, ki se izražajo skozi sanje in 
                  nosijo pomembna sporočila podzavesti.
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  <span>Simbolika in vzorci</span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Button 
                variant="outline"
                size="lg"
                className="font-semibold px-8 py-3"
                onClick={() => navigate('/auth')}
              >
                Odkrijte svojo simboliko sanj
                <Sparkles className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-16 bg-gradient-to-r from-primary/5 to-secondary/5">
          <Card className="border-border/50 max-w-4xl mx-auto">
            <CardContent className="p-8 md:p-12 text-center">
              <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Pripravljen odkrivati skrivnosti svojih sanj?
              </h3>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Pridruži se uporabnikom, ki že raziskujejo vzorce svojih sanj in izboljšujejo 
                razumevanje svojega notranjega sveta z znanstveno podprto analizo.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg"
                  className="font-semibold px-12 py-4 text-lg"
                  onClick={() => navigate('/auth')}
                >
                  <Brain className="mr-2 h-6 w-6" />
                  Registriraj se brezplačno
                </Button>
                <Button 
                  variant="outline"
                  size="lg"
                  className="font-semibold px-8 py-4 text-lg"
                  onClick={() => {
                    document.getElementById('about-dreams')?.scrollIntoView({ 
                      behavior: 'smooth' 
                    });
                  }}
                >
                  Preberi več o sanjah
                </Button>
              </div>
            </CardContent>
          </Card>
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