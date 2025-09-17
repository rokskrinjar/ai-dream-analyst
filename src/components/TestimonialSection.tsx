import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Marija K.",
    role: "Psihologinja",
    content: "Aplikacija mi je pomagala razumeti vzorce v mojih sanjah, ki sem jih prej spregledala. AI analiza je presenetljivo natančna.",
    rating: 5,
    location: "Ljubljana"
  },
  {
    name: "Tomaž S.", 
    role: "Student psihologije",
    content: "Končno lahko sledim svojim sanjam sistematično. Vpogledi so poglobljeni in mi pomagajo pri študiju.",
    rating: 5,
    location: "Maribor"
  },
  {
    name: "Ana P.",
    role: "Terapevtka",
    content: "Uporabljam aplikacijo za svoje stranke. Analize so znanstveno podprte in koristne za terapevtski proces.",
    rating: 5,
    location: "Celje"
  }
];

export const TestimonialSection = () => {
  return (
    <section className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Kaj pravijo naši uporabniki
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Pridruži se več kot 10.000 uporabnikom, ki že odkrivajo skrivnosti svojih sanj
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {testimonials.map((testimonial, index) => (
          <Card 
            key={index}
            className="glass-card hover:shadow-lg transition-all duration-500 hover:scale-105 animate-fade-in-up"
            style={{ animationDelay: `${index * 0.2}s` }}
          >
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <Quote className="h-8 w-8 text-primary/60 mr-2" />
                <div className="flex">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                  ))}
                </div>
              </div>
              
              <p className="text-muted-foreground mb-6 leading-relaxed">
                "{testimonial.content}"
              </p>
              
              <div className="border-t border-border/30 pt-4">
                <div className="font-semibold text-foreground">
                  {testimonial.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {testimonial.role} • {testimonial.location}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};