import { useEffect } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  { question: "Funktioniert die App auch ohne Internet – im Stall?", answer: "Ja. HufManager ist Offline-First. Du kannst im Stall Kunden anlegen, Termine abhaken und Befunde dokumentieren. Sobald du wieder Netz hast, synchronisiert sich alles automatisch." },
  { question: "Was ist die Kunden-App?", answer: "Eine kostenlose App für deine Pferdebesitzer. Sie sehen Termine, Befunde und Rechnungen – und können Daten freigeben. Du sparst Rückfragen, sie fühlen sich gut betreut." },
  { question: "Ist HufManager DSGVO-konform?", answer: "Vollständig. Deutsche Server in Frankfurt, verschlüsselte Übertragung, AVV inklusive. Deine Daten und die deiner Kunden sind sicher." },
  { question: "Kann ich jederzeit kündigen?", answer: "Ja. Monatlich kündbar, kein Knebelvertrag. Du bleibst, weil es dir hilft – nicht weil du musst." },
  { question: "Wie bekomme ich die Demo?", answer: "Kommentiere 'DEMO' unter einem unserer Instagram-Reels oder schreib uns eine DM. Wir zeigen dir beide Apps persönlich – ohne Verkaufsdruck." },
  { question: "Muss ich meinen Kunden die App aufzwingen?", answer: "Nein. Die Kunden-App ist ein Service, keine Pflicht. Du kannst HufManager komplett alleine nutzen – auch wenn deine Kunden kein Smartphone haben." },
];

const FAQ = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "faq-schema";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
    });
    const existing = document.getElementById("faq-schema");
    if (existing) existing.remove();
    document.head.appendChild(script);
    return () => { document.getElementById("faq-schema")?.remove(); };
  }, []);

  return (
    <section className="py-20 md:py-32 bg-zinc-950">
      <div className="container">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-primary font-bold text-sm uppercase tracking-widest">FAQ</span>
            <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mt-4 mb-6">Häufige Fragen</h2>
            <p className="text-white/60 text-lg">Alles was du wissen musst, bevor du startest.</p>
          </div>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="bg-zinc-900/50 rounded-2xl border border-white/10 px-6 overflow-hidden data-[state=open]:border-primary/50 transition-colors">
                <AccordionTrigger className="text-left text-lg font-semibold text-white hover:text-primary hover:no-underline py-6 [&[data-state=open]>svg]:text-primary [&>svg]:text-primary [&>svg]:w-5 [&>svg]:h-5">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-white/70 text-base leading-relaxed pb-6">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
