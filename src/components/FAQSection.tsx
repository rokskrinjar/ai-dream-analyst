import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Kako AI analizira moje sanje?",
    answer: "Naš AI sistem uporablja napredne algoritme strojnega učenja in se opira na znanstvene teorije Freuda in Junga. Analizira simboliko, vzorce in čustva v vaših sanjah ter vam ponudi personalizirane vpoglede."
  },
  {
    question: "So moje sanje v varnosti?",
    answer: "Absolutno. Vsi podatki so šifrirani in shranjeni varno. Vaše sanje so vidne samo vam in jih nikoli ne delimo s tretjimi osebami. Uporabljamo najnovejše varnostne protokole za zaščito vaše zasebnosti."
  },
  {
    question: "Koliko sanj lahko analiziram brezplačno?",
    answer: "Z brezplačnim računom lahko mesečno analizirate do 5 sanj. Za neomejene analize in dodatne funkcije lahko nadgradite na premium paket."
  },
  {
    question: "Ali lahko analize pomagajo pri terapiji?",
    answer: "Naše analize so znanstveno podprte in lahko služijo kot koristno dopolnilo k terapevtskemu procesu, vendar ne nadomešajo strokovne psihološke pomoči. Vedno se posvetujte s strokovnjakom za osebne težave."
  },
  {
    question: "Kako natančne so AI analize?",
    answer: "Naš AI sistem je treniran na obsežni bazi psiholoških raziskav in ima visoko stopnjo natančnosti pri prepoznavanju vzorcev. Vendar pa je vsaka interpretacija subjektivna in vam svetujemo, da rezultate jemljete kot vodilo za samorazmislek."
  },
  {
    question: "Lahko izvozim svoje analize?",
    answer: "Da, premium uporabniki lahko izvozijo vse svoje analize in podatke v različnih formatih (PDF, CSV). To vam omogoča dolgotrajno sledenje vzorcev in deljenje z strokovnjaki."
  }
];

export const FAQSection = () => {
  return (
    <section className="container mx-auto px-4 py-16 bg-muted/20">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Pogosta vprašanja
          </h2>
          <p className="text-lg text-muted-foreground">
            Odgovori na najpogostejša vprašanja o analizi sanj z AI
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="border-border/50 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <AccordionTrigger className="text-left hover:text-primary transition-colors duration-200">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};