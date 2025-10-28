import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How does AI analyze my dreams?",
    answer: "Our AI system uses advanced machine learning algorithms and relies on scientific theories of Freud and Jung. It analyzes symbolism, patterns, and emotions in your dreams and provides personalized insights."
  },
  {
    question: "Are my dreams safe?",
    answer: "Absolutely. All data is encrypted and stored securely. Your dreams are visible only to you and we never share them with third parties. We use the latest security protocols to protect your privacy."
  },
  {
    question: "How many dreams can I analyze for free?",
    answer: "With a free account, you can analyze up to 5 dreams per month. For unlimited analyses and additional features, you can upgrade to a premium package."
  },
  {
    question: "Can the analyses help with therapy?",
    answer: "Our analyses are scientifically supported and can serve as a useful complement to the therapeutic process, but they do not replace professional psychological help. Always consult a professional for personal issues."
  },
  {
    question: "How accurate are AI analyses?",
    answer: "Our AI system is trained on an extensive database of psychological research and has a high degree of accuracy in recognizing patterns. However, every interpretation is subjective and we advise you to take the results as a guide for self-reflection."
  },
  {
    question: "Can I export my analyses?",
    answer: "Yes, premium users can export all their analyses and data in various formats (PDF, CSV). This allows you to track patterns long-term and share with professionals."
  }
];

export const FAQSection = () => {
  return (
    <section className="container mx-auto px-4 py-16 bg-muted/20">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Answers to the most common questions about AI dream analysis
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