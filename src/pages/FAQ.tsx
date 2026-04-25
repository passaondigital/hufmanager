import { useState, useMemo } from "react";
import { Search, MessageCircle, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ_DATA } from "@/data/faq-data";

export default function FAQ() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return FAQ_DATA;
    const s = search.toLowerCase();
    return FAQ_DATA.map((cat) => ({
      ...cat,
      questions: cat.questions.filter(
        (q) => q.q.toLowerCase().includes(s) || q.a.toLowerCase().includes(s)
      ),
    })).filter((cat) => cat.questions.length > 0);
  }, [search]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            Häufig gestellte Fragen
          </h1>
          <p className="text-muted-foreground mt-2">
            Finde schnell Antworten zu HufManager
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Suche nach Fragen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* FAQ Categories */}
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Keine passenden Fragen gefunden.
            </p>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                const fab = document.querySelector<HTMLButtonElement>(
                  "button.fixed.bottom-24.right-4, button.fixed.bottom-6.right-4, button.fixed.bottom-6.right-6"
                );
                if (fab) fab.click();
              }}
            >
              <MessageCircle className="h-4 w-4" />
              Frag Hufi
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {filtered.map((cat) => (
              <div key={cat.category}>
                <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span>{cat.icon}</span>
                  {cat.category}
                </h2>
                <Accordion type="single" collapsible className="border rounded-lg overflow-hidden">
                  {cat.questions.map((faq, i) => (
                    <AccordionItem key={i} value={`${cat.category}-${i}`}>
                      <AccordionTrigger className="px-4 text-left text-sm hover:no-underline">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="px-4 text-muted-foreground text-sm leading-relaxed">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        )}

        {/* Footer CTA */}
        <div className="mt-12 text-center border-t pt-8">
          <p className="text-sm text-muted-foreground mb-3">
            Frage nicht gefunden?
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                const fab = document.querySelector<HTMLButtonElement>(
                  "button.fixed.bottom-24.right-4, button.fixed.bottom-6.right-4, button.fixed.bottom-6.right-6"
                );
                if (fab) fab.click();
              }}
            >
              <MessageCircle className="h-4 w-4" />
              Hufi fragen
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() =>
                (window.location.href = "mailto:support@hufiapp.de")
              }
            >
              E-Mail an Support
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
