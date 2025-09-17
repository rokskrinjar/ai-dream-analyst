import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Brain, Moon, Heart, Star, Sparkles, Zap } from "lucide-react";

export const InteractiveDreamJournal = () => {
  const [typingText, setTypingText] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [showCards, setShowCards] = useState(false);

  const dreamText = "Sanjal sem, da letim nad pisanim mestom polnim luči...";
  const analysisSteps = [
    "Analiziram simboliko...",
    "Prepoznavam vzorce...",
    "Povezujem s teorijami...",
    "Pripravim osebne vpoglede..."
  ];

  const insightCards = [
    { icon: <Moon className="h-4 w-4" />, text: "Letenje: Svoboda, pobeg", color: "from-blue-500/20 to-purple-500/20" },
    { icon: <Star className="h-4 w-4" />, text: "Luči: Spoznanja, upanje", color: "from-yellow-500/20 to-orange-500/20" },
    { icon: <Heart className="h-4 w-4" />, text: "Mesto: Družbene vezi", color: "from-red-500/20 to-pink-500/20" },
    { icon: <Sparkles className="h-4 w-4" />, text: "Jung: Arhetip letenja", color: "from-green-500/20 to-teal-500/20" }
  ];

  useEffect(() => {
    // Typing animation for dream entry
    const typingInterval = setInterval(() => {
      setTypingText(prev => {
        if (prev.length < dreamText.length) {
          return dreamText.slice(0, prev.length + 1);
        }
        return prev;
      });
    }, 100);

    return () => clearInterval(typingInterval);
  }, []);

  useEffect(() => {
    // Start analysis after typing is complete
    if (typingText === dreamText) {
      const analysisInterval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev < analysisSteps.length - 1) {
            return prev + 1;
          }
          setShowCards(true);
          return prev;
        });
      }, 1500);

      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev < 100) {
            return prev + 2;
          }
          return prev;
        });
      }, 50);

      return () => {
        clearInterval(analysisInterval);
        clearInterval(progressInterval);
      };
    }
  }, [typingText]);

  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Main Dream Journal Interface */}
      <Card className="glass-card border-border/20 overflow-hidden">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary/30 to-accent/30 flex items-center justify-center">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Dnevnik sanj</h3>
              <p className="text-xs text-muted-foreground">AI analiza v teku...</p>
            </div>
          </div>

          {/* Dream Entry Area */}
          <div className="mb-4">
            <div className="bg-muted/20 rounded-lg p-4 min-h-[80px] border border-border/10">
              <p className="text-sm text-foreground leading-relaxed">
                {typingText}
                <span className="animate-pulse">|</span>
              </p>
            </div>
          </div>

          {/* Analysis Progress */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-sm font-medium text-foreground">
                {analysisSteps[currentStep]}
              </span>
            </div>
            <Progress value={analysisProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {analysisProgress}% analiza dokončana
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Floating Insight Cards */}
      {showCards && (
        <div className="absolute -inset-4 pointer-events-none">
          {insightCards.map((card, index) => (
            <Card
              key={index}
              className={`absolute glass-card border-border/20 animate-float transform transition-all duration-1000 ${
                index === 0 ? 'top-0 -right-4' :
                index === 1 ? 'top-1/3 -left-6' :
                index === 2 ? 'bottom-1/3 -right-8' :
                'bottom-0 -left-4'
              }`}
              style={{
                animationDelay: `${index * 0.5}s`,
                transform: `rotate(${index % 2 === 0 ? '' : '-'}${Math.random() * 5 + 2}deg)`
              }}
            >
              <CardContent className="p-3">
                <div className={`flex items-center gap-2 text-xs bg-gradient-to-r ${card.color} rounded-lg p-2`}>
                  <div className="text-primary">
                    {card.icon}
                  </div>
                  <span className="font-medium text-foreground whitespace-nowrap">
                    {card.text}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Floating Dream Symbols */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-2 animate-float opacity-20" style={{ animationDelay: '0s' }}>
          <Moon className="h-6 w-6 text-primary" />
        </div>
        <div className="absolute top-20 right-4 animate-float opacity-15" style={{ animationDelay: '1s' }}>
          <Star className="h-4 w-4 text-accent" />
        </div>
        <div className="absolute bottom-16 left-6 animate-float opacity-25" style={{ animationDelay: '2s' }}>
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="absolute bottom-8 right-2 animate-float opacity-20" style={{ animationDelay: '1.5s' }}>
          <Heart className="h-4 w-4 text-accent" />
        </div>
      </div>
    </div>
  );
};