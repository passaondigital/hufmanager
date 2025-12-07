import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Star,
  Plus,
  Quote,
  Download,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const sourceLabels: Record<string, string> = {
  intern: "Intern",
  google: "Google",
  screenshot: "Screenshot",
};

interface Feedback {
  id: string;
  customer_name: string;
  rating: number;
  text: string | null;
  source: string | null;
  is_featured: boolean | null;
  created_at: string;
}

const Auffassen = () => {
  const [showForm, setShowForm] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [formData, setFormData] = useState({
    customerName: "",
    source: "intern",
    text: "",
  });
  const queryClient = useQueryClient();

  const { data: feedbacks = [] } = useQuery({
    queryKey: ["feedbacks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedbacks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Feedback[];
    },
  });

  // Fetch clients for dropdown
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const createFeedback = useMutation({
    mutationFn: async (data: { customer_name: string; rating: number; text: string; source: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");
      
      const { error } = await supabase.from("feedbacks").insert({
        ...data,
        is_featured: false,
        provider_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
      toast({ title: "Erfolg", description: "Feedback wurde gespeichert." });
      setShowForm(false);
      setFormData({ customerName: "", source: "intern", text: "" });
      setNewRating(5);
    },
    onError: () => {
      toast({ title: "Fehler", description: "Feedback konnte nicht gespeichert werden.", variant: "destructive" });
    },
  });

  const toggleFeatured = useMutation({
    mutationFn: async ({ id, is_featured }: { id: string; is_featured: boolean }) => {
      const { error } = await supabase.from("feedbacks").update({ is_featured }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
    },
  });

  const handleSubmit = () => {
    if (!formData.customerName || !formData.text) {
      toast({ title: "Fehler", description: "Bitte füllen Sie alle Felder aus.", variant: "destructive" });
      return;
    }
    createFeedback.mutate({
      customer_name: formData.customerName,
      rating: newRating,
      text: formData.text,
      source: formData.source,
    });
  };

  const handleExportCSV = () => {
    const csvContent = [
      ["Kunde", "Bewertung", "Quelle", "Text", "Datum"].join(","),
      ...feedbacks.map((f) =>
        [
          `"${f.customer_name}"`,
          f.rating,
          f.source,
          `"${f.text?.replace(/"/g, '""') || ""}"`,
          new Date(f.created_at).toLocaleDateString("de-DE"),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `feedbacks_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();

    toast({ title: "Export", description: "CSV wurde heruntergeladen." });
  };

  const avgRating = feedbacks.length
    ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Auffassen</h1>
          <p className="text-muted-foreground mt-1">
            Sammeln und verwalten Sie Kundenfeedback und Bewertungen
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button className="gap-2" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" />
            Feedback hinzufügen
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10">
              <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{avgRating}</p>
              <p className="text-sm text-muted-foreground">Durchschnitt</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Quote className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{feedbacks.length}</p>
              <p className="text-sm text-muted-foreground">Bewertungen</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-accent/10">
              <Star className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {feedbacks.filter((f) => f.is_featured).length}
              </p>
              <p className="text-sm text-muted-foreground">Auf Landingpage</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Feedback Form */}
      {showForm && (
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle>Neues Feedback hinzufügen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kunde</Label>
                <Select
                  value={formData.customerName}
                  onValueChange={(value) => setFormData({ ...formData, customerName: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kunde auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.full_name || client.email || "Unbekannt"}>
                        {client.full_name || client.email || "Unbekannt"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quelle</Label>
                <Select
                  value={formData.source}
                  onValueChange={(value) => setFormData({ ...formData, source: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Quelle auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intern">Intern erfasst</SelectItem>
                    <SelectItem value="google">Google Review</SelectItem>
                    <SelectItem value="screenshot">Screenshot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bewertung</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setNewRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={cn(
                        "h-8 w-8",
                        star <= newRating
                          ? "text-amber-500 fill-amber-500"
                          : "text-muted-foreground"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Feedback-Text</Label>
              <Textarea
                placeholder="Das Feedback des Kunden..."
                rows={4}
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleSubmit} disabled={createFeedback.isPending}>
                {createFeedback.isPending ? "Speichern..." : "Speichern"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback List */}
      <div className="space-y-4">
        {feedbacks.map((feedback, index) => (
          <Card
            key={feedback.id}
            className="animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-foreground">{feedback.customer_name}</h3>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            "h-4 w-4",
                            star <= feedback.rating
                              ? "text-amber-500 fill-amber-500"
                              : "text-muted-foreground"
                          )}
                        />
                      ))}
                    </div>
                    <Badge variant="outline">{sourceLabels[feedback.source || "intern"]}</Badge>
                    {feedback.is_featured && (
                      <Badge className="bg-accent/10 text-accent">Auf Landingpage</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground italic">"{feedback.text}"</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {new Date(feedback.created_at).toLocaleDateString("de-DE")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      toggleFeatured.mutate({ id: feedback.id, is_featured: !feedback.is_featured })
                    }
                  >
                    {feedback.is_featured ? "Entfernen" : "Hervorheben"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Auffassen;
