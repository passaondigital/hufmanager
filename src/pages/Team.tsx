import { Users, Lock, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const Team = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Users className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Team-Verwaltung</h1>
        <p className="text-muted-foreground">
          Verwalte dein Team und weise Termine zu
        </p>
        <Badge variant="secondary" className="mt-2 bg-orange-500/10 text-orange-500 border-orange-500/30">
          <Sparkles className="h-3 w-3 mr-1" />
          Coming Soon
        </Badge>
      </div>

      <Card className="border-dashed">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            Modul in Entwicklung
          </CardTitle>
          <CardDescription>
            Die Team-Verwaltung wird bald verfügbar sein
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
              <div>
                <p className="font-medium text-foreground">Mitarbeiter hinzufügen</p>
                <p>Lade Teammitglieder ein und verwalte ihre Rollen</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
              <div>
                <p className="font-medium text-foreground">Termine zuweisen</p>
                <p>Weise Termine einzelnen Mitarbeitern zu</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
              <div>
                <p className="font-medium text-foreground">Team-Kalender</p>
                <p>Gemeinsamer Kalender für alle Teammitglieder</p>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-center">
            <Button variant="outline" onClick={() => navigate("/")}>
              Zurück zum Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Team;
