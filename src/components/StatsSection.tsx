import { TrendingUp, Users, Brain, Clock } from "lucide-react";

const stats = [
  {
    icon: <Users className="h-8 w-8" />,
    number: "10,000+",
    label: "Aktivnih uporabnikov",
    description: "Raziskuje svoje sanje"
  },
  {
    icon: <Brain className="h-8 w-8" />,
    number: "150,000+",
    label: "Analiziranih sanj",
    description: "Z AI tehnologijo"
  },
  {
    icon: <TrendingUp className="h-8 w-8" />,
    number: "97%",
    label: "Zadovoljstvo",
    description: "Uporabnikov z vpogledi"
  },
  {
    icon: <Clock className="h-8 w-8" />,
    number: "2 min",
    label: "Povprečen čas",
    description: "Za analizo sanj"
  }
];

export const StatsSection = () => {
  return (
    <section className="container mx-auto px-4 py-16 gradient-bg">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Zaupajo nam strokovnjaki
        </h2>
        <p className="text-lg text-muted-foreground">
          Številke, ki govorijo o uspešnosti naše platforme
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
        {stats.map((stat, index) => (
          <div 
            key={index}
            className="text-center group animate-fade-in-up"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors duration-300">
              <div className="text-primary">
                {stat.icon}
              </div>
            </div>
            <div className="text-3xl md:text-4xl font-bold text-foreground mb-2 animate-glow-pulse">
              {stat.number}
            </div>
            <div className="text-sm font-semibold text-foreground mb-1">
              {stat.label}
            </div>
            <div className="text-xs text-muted-foreground">
              {stat.description}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};