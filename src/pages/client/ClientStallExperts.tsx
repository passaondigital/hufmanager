import { useState } from "react";
import { Star, Plus, Search, Award, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function ClientStallExperts() {
  const [search, setSearch] = useState("");

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Experten & Dienstleister</h1>
          <p className="text-sm text-muted-foreground mt-1">Empfohlene Fachleute für deinen Stall</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Experten empfehlen
        </Button>
      </div>

      <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
        <div className="flex items-start gap-3">
          <Star className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Stall-Empfehlungen</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Deine Einsteller sehen die hier empfohlenen Experten in ihrem Experten-Verzeichnis 
              mit dem Hinweis „Empfohlen von {"{Stallname}"}". So stärkst du dein Netzwerk.
            </p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Experten suchen..."
          className="pl-10"
        />
      </div>

      <Card className="bg-card border-border">
        <CardContent className="py-12">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Award className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Noch keine Experten verknüpft</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Verknüpfe Hufpfleger, Tierärzte und Therapeuten mit deinem Stall.
              Deine Einsteller sehen diese Empfehlungen direkt in ihrem Account.
            </p>
            <div className="flex gap-2 mt-4">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Experten suchen
              </Button>
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Per Hufi Connect
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
