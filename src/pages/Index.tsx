import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Brain, Sparkles, ArrowRight, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import modernDreamHero from "@/assets/modern-dream-hero.jpg";

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
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
                  Analizirajte vzorce in pridobite osebne vpoglede v svoj notranji svet.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Button 
                    size="lg" 
                    className="font-semibold px-8 py-3"
                    onClick={() => navigate('/auth')}
                  >
                    Začni beležiti sanje
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="font-semibold px-8 py-3"
                    onClick={() => {
                      document.getElementById('features')?.scrollIntoView({ 
                        behavior: 'smooth' 
                      });
                    }}
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    Razišči funkcije
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 relative">
              <img
                src={modernDreamHero}
                alt="Sodobna predstava analize sanj z AI tehnologijo"
                className="w-full max-w-lg mx-auto rounded-lg shadow-lg"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="container mx-auto px-4 py-16 bg-muted/30">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Napredne funkcije za analizo sanj
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Kombiniramo najnovejše dosežke umetne inteligence z uporabnostjo moderne aplikacije
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
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

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-16">
          <Card className="border-border/50 max-w-4xl mx-auto">
            <CardContent className="p-8 md:p-12 text-center">
              <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Pripravljen začeti?
              </h3>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Pridruži se uporabnikom, ki že odkrivajo vzorce svojih sanj
                in izboljšujejo razumevanje svojega notranjega sveta.
              </p>
              <Button 
                size="lg"
                className="font-semibold px-12 py-4 text-lg"
                onClick={() => navigate('/auth')}
              >
                <Brain className="mr-2 h-6 w-6" />
                Registriraj se brezplačno
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 mt-24 bg-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">
            <p>© 2024 Lovilec Sanj. Vse pravice pridržane.</p>
            <p className="mt-2 text-sm">
              Analizirajte svoje sanje z umetno inteligenco
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;