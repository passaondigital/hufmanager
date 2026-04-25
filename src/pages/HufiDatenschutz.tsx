import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ChevronLeft, Shield, Brain, Cpu, FileText, Trash2 } from "lucide-react";

interface ProfileData {
  id: string;
  full_name: string | null;
  user_type: string | null;
  is_data_contribution_active?: boolean;
  exclude_from_training?: boolean;
}

export default function HufiDatenschutz() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [dataConsent, setDataConsent] = useState(false);
  const [excludeTraining, setExcludeTraining] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("id, full_name, user_type, is_data_contribution_active, exclude_from_training")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile(data as ProfileData);
          setDataConsent((data as any).is_data_contribution_active ?? false);
          setExcludeTraining((data as any).exclude_from_training ?? false);
        }
      });
  }, [user]);

  const updateConsent = async (field: string, value: boolean) => {
    if (!user) return;
    const prev = field === "is_data_contribution_active" ? dataConsent : excludeTraining;
    if (field === "is_data_contribution_active") setDataConsent(value);
    else setExcludeTraining(value);
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: value })
      .eq("id", user.id);
    if (error) {
      if (field === "is_data_contribution_active") setDataConsent(prev);
      else setExcludeTraining(prev);
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Einwilligung aktualisiert" });
    }
  };

  const revokeAll = async () => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ is_data_contribution_active: false, exclude_from_training: true })
      .eq("id", user.id);
    setDataConsent(false);
    setExcludeTraining(true);
    toast({ title: "Alle Einwilligungen widerrufen" });
  };

  const memoryBadges = [
    profile?.full_name && { label: "Name", value: profile.full_name },
    profile?.user_type && { label: "Typ", value: profile.user_type },
    user?.email && { label: "E-Mail", value: user.email },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="space-y-6 p-4 pb-24 max-w-2xl mx-auto animate-fade-in">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 -ml-2 mb-2 text-muted-foreground"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-4 w-4" /> Zurück
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Datenschutz & Privatsphäre</h1>
        <p className="text-muted-foreground mt-1">DSGVO-konforme Verwaltung deiner Daten</p>
      </div>

      {/* DSGVO Einwilligungen */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" /> DSGVO Einwilligungen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">KI-Training (anonymisiert)</p>
              <p className="text-xs text-muted-foreground">Deine Daten verbessern das Hufi-Modell</p>
            </div>
            <Switch
              checked={dataConsent}
              onCheckedChange={(v) => updateConsent("is_data_contribution_active", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Von Training ausschließen</p>
              <p className="text-xs text-muted-foreground">Deine Daten werden nicht verwendet</p>
            </div>
            <Switch
              checked={excludeTraining}
              onCheckedChange={(v) => updateConsent("exclude_from_training", v)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={revokeAll}>
            Alle Einwilligungen widerrufen
          </Button>
        </CardContent>
      </Card>

      {/* Hufi Memory */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-4 h-4" /> Hufi Memory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">Hufi kennt folgende Informationen über dich:</p>
          <div className="flex flex-wrap gap-2">
            {memoryBadges.map((b) => (
              <Badge key={b.label} variant="secondary">
                {b.label}: {b.value}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* EU AI Act */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="w-4 h-4" /> Warum hat Hufi das entschieden?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Gemäß EU AI Act (Art. 13) hast du das Recht auf Erklärbarkeit. Hufi-Entscheidungen basieren auf:
          </p>
          <div className="space-y-2">
            {[
              { icon: "👤", title: "Nutzerprofil", desc: "Rolle, Erfahrung und bisherige Interaktionen" },
              { icon: "💬", title: "Chat-Kontext", desc: "Inhalt und Verlauf des Gesprächs" },
              { icon: "📋", title: "Expertenregeln", desc: "Hufschmied-Fachwissen und Sicherheitsregeln" },
            ].map((item) => (
              <div key={item.title} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <span className="text-lg">{item.icon}</span>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Datenschutzerklärung */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" /> Rechtliches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={() => navigate("/datenschutz")}>
            Datenschutzerklärung ansehen
          </Button>
        </CardContent>
      </Card>

      {/* Daten löschen */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <Trash2 className="w-4 h-4" /> Alle Daten löschen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Du kannst die vollständige Löschung deines Kontos und aller Daten beantragen.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">Konto & Daten löschen</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Bist du sicher?</AlertDialogTitle>
                <AlertDialogDescription>
                  Diese Aktion kann nicht rückgängig gemacht werden. Tippe <strong>LÖSCHEN</strong> zur Bestätigung.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="LÖSCHEN"
                className="my-2"
              />
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteConfirm("")}>Abbrechen</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleteConfirm !== "LÖSCHEN"}
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={() => {
                    setDeleteConfirm("");
                    toast({
                      title: "Anfrage erhalten",
                      description: "Bitte kontaktiere support@hufiapp.de für die vollständige Datenlöschung.",
                    });
                  }}
                >
                  Endgültig löschen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
