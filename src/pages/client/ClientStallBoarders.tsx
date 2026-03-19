import { useState } from "react";
import { Users, Plus, Search, Mail, Phone, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClientStallBoarders() {
  const [search, setSearch] = useState("");

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Einsteller-Verwaltung</h1>
          <p className="text-sm text-muted-foreground mt-1">Deine Kunden und deren Pferde</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Einsteller hinzufügen
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Einsteller suchen..."
          className="pl-10"
        />
      </div>

      <Card className="bg-card border-border">
        <CardContent className="py-12">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Noch keine Einsteller</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Füge deine Einsteller hinzu oder lade sie per HM Connect ein. Du kannst dann deren Pferde,
              Verträge und Zahlungen hier verwalten.
            </p>
            <Button className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Ersten Einsteller anlegen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
