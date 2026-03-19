import { useState } from "react";
import { UserPlus, Users, Search, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function ClientStallStaff() {
  const [search, setSearch] = useState("");

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mitarbeiterverwaltung</h1>
          <p className="text-sm text-muted-foreground mt-1">Stallpersonal, Aufgaben und Schichtpläne</p>
        </div>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Mitarbeiter einladen
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Mitarbeiter suchen..."
          className="pl-10"
        />
      </div>

      <Card className="bg-card border-border">
        <CardContent className="py-12">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Noch keine Mitarbeiter</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Lade dein Stallpersonal ein und verwalte Aufgaben, Schichtpläne und Zugangsrechte zentral.
            </p>
            <Button className="mt-4 gap-2">
              <UserPlus className="h-4 w-4" />
              Ersten Mitarbeiter einladen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
