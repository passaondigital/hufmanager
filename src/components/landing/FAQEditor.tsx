import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Loader2, GripVertical, HelpCircle } from "lucide-react";

interface FAQ {
  id?: string;
  question: string;
  answer: string;
  is_active: boolean;
  sort_order: number;
}

const DEFAULT_FAQS: Omit<FAQ, "sort_order">[] = [
  { question: "In welchem Gebiet bist du tätig?", answer: "Mein Einzugsgebiet umfasst...", is_active: true },
  { question: "Was kostet eine Hufbearbeitung?", answer: "Die Preise findest du unter meinen Leistungen.", is_active: true },
  { question: "Wie oft sollte ich einen Termin buchen?", answer: "In der Regel alle 6-8 Wochen, abhängig vom Pferd.", is_active: true },
  { question: "Wie kann ich einen Termin anfragen?", answer: "Über das Kontaktformular auf dieser Seite oder direkt per Telefon.", is_active: true },
];

export function FAQEditor() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: existingFaqs, isLoading } = useQuery({
    queryKey: ["provider-faqs-editor", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("provider_faqs")
        .select("*")
        .eq("provider_id", user.id)
        .order("sort_order");
      if (error) throw error;
      return data as FAQ[];
    },
    enabled: !!user?.id,
  });

  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [initialized, setInitialized] = useState(false);

  if (!initialized && existingFaqs !== undefined) {
    if (existingFaqs.length > 0) {
      setFaqs(existingFaqs);
    } else {
      setFaqs(DEFAULT_FAQS.map((f, i) => ({ ...f, sort_order: i })));
    }
    setInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      await supabase.from("provider_faqs").delete().eq("provider_id", user.id);
      const validFaqs = faqs
        .filter((f) => f.question.trim())
        .map((f, i) => ({
          provider_id: user.id,
          question: f.question.trim(),
          answer: f.answer.trim(),
          is_active: f.is_active,
          sort_order: i,
        }));
      if (validFaqs.length > 0) {
        const { error } = await supabase.from("provider_faqs").insert(validFaqs);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-faqs-editor"] });
      toast({ title: "Gespeichert", description: "FAQs wurden aktualisiert." });
    },
    onError: () => {
      toast({ title: "Fehler", description: "FAQs konnten nicht gespeichert werden.", variant: "destructive" });
    },
  });

  const addFaq = () => {
    setFaqs([...faqs, { question: "", answer: "", is_active: true, sort_order: faqs.length }]);
  };

  const removeFaq = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index));
  };

  const updateFaq = (index: number, field: keyof FAQ, value: any) => {
    setFaqs(faqs.map((f, i) => (i === index ? { ...f, [field]: value } : f)));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Häufig gestellte Fragen (FAQ)
        </CardTitle>
        <CardDescription>Füge bis zu 8 Fragen und Antworten hinzu.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {faqs.slice(0, 8).map((faq, index) => (
          <div key={index} className="p-3 border rounded-lg space-y-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Frage {index + 1}</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={faq.is_active} onCheckedChange={(v) => updateFaq(index, "is_active", v)} />
                <Button variant="ghost" size="icon" onClick={() => removeFaq(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
            <Input
              placeholder="Frage..."
              value={faq.question}
              onChange={(e) => updateFaq(index, "question", e.target.value)}
            />
            <Textarea
              placeholder="Antwort..."
              rows={2}
              value={faq.answer}
              onChange={(e) => updateFaq(index, "answer", e.target.value)}
            />
          </div>
        ))}

        {faqs.length < 8 && (
          <Button variant="outline" className="w-full gap-2" onClick={addFaq}>
            <Plus className="h-4 w-4" /> Frage hinzufügen
          </Button>
        )}

        <Button
          className="w-full gap-2"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          FAQs speichern
        </Button>
      </CardContent>
    </Card>
  );
}
