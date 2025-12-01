import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Star,
  Plus,
  Image as ImageIcon,
  ExternalLink,
  Quote,
  Search,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const feedbacks = [
  {
    id: 1,
    customerName: "Anna Schmidt",
    rating: 5,
    text: "Herr Hufeisen ist ein absoluter Profi! Meine Pferde sind immer bestens versorgt und die Terminvereinbarung läuft reibungslos.",
    source: "intern",
    isFeatured: true,
    date: "28.11.2024",
  },
  {
    id: 2,
    customerName: "Thomas Müller",
    rating: 5,
    text: "Kompetent, pünktlich und sehr einfühlsam mit den Pferden. Kann ich nur weiterempfehlen!",
    source: "google",
    isFeatured: true,
    date: "15.11.2024",
  },
  {
    id: 3,
    customerName: "Maria Weber",
    rating: 4,
    text: "Gute Arbeit, faire Preise. Einziger Nachteil: manchmal schwer einen Termin zu bekommen.",
    source: "intern",
    isFeatured: false,
    date: "02.11.2024",
  },
];

const sourceLabels: Record<string, string> = {
  intern: "Intern",
  google: "Google",
  screenshot: "Screenshot",
};

const Auffassen = () => {
  const [showForm, setShowForm] = useState(false);
  const [newRating, setNewRating] = useState(5);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Auffassen</h1>
          <p className="text-muted-foreground mt-1">
            Sammeln und verwalten Sie Kundenfeedback und Bewertungen
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Feedback hinzufügen
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10">
              <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">4.8</p>
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
                {feedbacks.filter((f) => f.isFeatured).length}
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
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Kunde auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kid1">Anna Schmidt</SelectItem>
                    <SelectItem value="kid2">Thomas Müller</SelectItem>
                    <SelectItem value="kid3">Maria Weber</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quelle</Label>
                <Select>
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
              <Textarea placeholder="Das Feedback des Kunden..." rows={4} />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Abbrechen
              </Button>
              <Button>Speichern</Button>
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
                    <h3 className="font-semibold text-foreground">{feedback.customerName}</h3>
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
                    <Badge variant="outline">{sourceLabels[feedback.source]}</Badge>
                    {feedback.isFeatured && (
                      <Badge className="bg-accent/10 text-accent">Auf Landingpage</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground italic">"{feedback.text}"</p>
                  <p className="text-sm text-muted-foreground mt-2">{feedback.date}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    {feedback.isFeatured ? "Entfernen" : "Hervorheben"}
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
