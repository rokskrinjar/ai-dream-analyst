import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Brain, Sparkles, Moon, Stars } from "lucide-react";
import dreamCatcherHero from "@/assets/dream-catcher-hero.jpg";

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);

  const features = [
    {
      icon: <BookOpen className="h-6 w-6" />,
      title: "Dnevnik sanj",
      description: "Vsak dan zapišite svoje sanje in jih ohranite za vedno"
    },
    {
      icon: <Brain className="h-6 w-6" />,
      title: "AI analiza",
      description: "Napredna analiza vaših sanj z osebnimi vpogledi"
    },
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "Sanjski svetovalec",
      description: "Personalizirani nasveti na osnovi vaših sanjskih vzorcev"
    }
  ];

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Animated background stars */}
      <div className="fixed inset-0 pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          >
            <Stars className="h-1 w-1 star-shimmer" />
          </div>
        ))}
      </div>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 lg:py-24">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left">
              <div className="space-y-6">
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
                  <span className="moon-glow">Lovilec</span>
                  <br />
                  <span className="star-shimmer">Sanj</span>
                </h1>
                
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0">
                  Odkrijte skrita sporočila svojih sanj z močjo umetne inteligence. 
                  Vsak dan je nova priložnost za razumevanje svoje notranje modrosti.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Button 
                    size="lg" 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-3 rounded-full"
                    onClick={() => setIsLoading(true)}
                  >
                    <Moon className="mr-2 h-5 w-5" />
                    Začni beležiti sanje
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground font-semibold px-8 py-3 rounded-full"
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    Razišči funkcije
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 relative">
              <div className="relative float-animation">
                <img
                  src={dreamCatcherHero}
                  alt="Mističen lovilec sanj v zvezdnatem nebu"
                  className="w-full max-w-md mx-auto rounded-3xl shadow-2xl glass-effect"
                />
                <div className="absolute inset-0 rounded-3xl shimmer-effect"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold moon-glow mb-4">
              Vaše sanje, naša tehnologija
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Kombiniramo najnovejše dosežke umetne inteligence z globokim razumevanjem simbolike sanj
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="glass-effect border-border/50 hover:border-accent/50 transition-all duration-300 hover:scale-105"
              >
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center mb-4">
                    <div className="text-primary">
                      {feature.icon}
                    </div>
                  </div>
                  <CardTitle className="text-xl moon-glow">
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
          <Card className="glass-effect border-border/50 max-w-4xl mx-auto">
            <CardContent className="p-8 md:p-12 text-center">
              <h3 className="text-2xl md:text-3xl font-bold moon-glow mb-4">
                Pripravljen na sanjsko potovanje?
              </h3>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Pridruži se tisočim uporabnikom, ki že odkrivajo skrivnosti svojih sanj
                in izboljšujejo kakovost spanja z našo platformo.
              </p>
              <Button 
                size="lg"
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold px-12 py-4 rounded-full text-lg"
                onClick={() => setIsLoading(true)}
              >
                <Brain className="mr-2 h-6 w-6" />
                Registriraj se brezplačno
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 mt-24">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">
            <p>© 2024 Lovilec Sanj. Vse pravice pridržane.</p>
            <p className="mt-2 text-sm">
              Odkrijte moč svojih sanj z umetno inteligenco
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;