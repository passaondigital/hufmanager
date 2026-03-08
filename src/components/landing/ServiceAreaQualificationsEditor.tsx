import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Save, Loader2, MapPin, Award, Plus, Trash2 } from "lucide-react";

interface Qualification {
  title: string;
  year: string;
  institution: string;
}

export function ServiceAreaQualificationsEditor() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["business-settings-area-quals", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("business_settings")
        .select("service_area_text, qualifications")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const [serviceArea, setServiceArea] = useState("");
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [initialized, setInitialized] = useState(false);

  if (!initialized && settings !== undefined) {
    setServiceArea((settings as any)?.service_area_text || "");
    const quals = (settings as any)?.qualifications;
    setQualifications(Array.isArray(quals) ? quals : []);
    setInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("business_settings")
        .update({
          service_area_text: serviceArea || null,
          qualifications: qualifications.filter((q) => q.title.trim()),
        } as any)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-settings-area-quals"] });
      toast({ title: "Gespeichert" });
    },
    onError: () => {
      toast({ title: "Fehler", variant: "destructive" });
    },
  });

  const addQualification = () => {
    setQualifications([...qualifications, { title: "", year: "", institution: "" }]);
  };

  const removeQualification = (index: number) => {
    setQualifications(qualifications.filter((_, i) => i !== index));
  };

  const updateQualification = (index: number, field: keyof Qualification, value: string) => {
    setQualifications(qualifications.map((q, i) => (i === index ? { ...q, [field]: value } : q)));
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
    <div className="space-y-4">
      {/* Service Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-5 w-5" />
            Einzugsgebiet
          </CardTitle>
          <CardDescription>Beschreibe dein Tätigkeitsgebiet in einem Satz.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="z.B. Raum München, 50km Umkreis"
            value={serviceArea}
            onChange={(e) => setServiceArea(e.target.value)}
            rows={2}
          />
        </CardContent>
      </Card>

      {/* Qualifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-5 w-5" />
            Ausbildung & Zertifikate
          </CardTitle>
          <CardDescription>Zeige deine Qualifikationen als Timeline an.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {qualifications.map((q, index) => (
            <div key={index} className="flex gap-2 items-start">
              <Input
                placeholder="Jahr"
                value={q.year}
                onChange={(e) => updateQualification(index, "year", e.target.value)}
                className="w-20"
              />
              <Input
                placeholder="Titel / Zertifikat"
                value={q.title}
                onChange={(e) => updateQualification(index, "title", e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Institution (optional)"
                value={q.institution}
                onChange={(e) => updateQualification(index, "institution", e.target.value)}
                className="flex-1"
              />
              <Button variant="ghost" size="icon" onClick={() => removeQualification(index)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          {qualifications.length < 10 && (
            <Button variant="outline" size="sm" className="gap-1" onClick={addQualification}>
              <Plus className="h-4 w-4" /> Eintrag hinzufügen
            </Button>
          )}
        </CardContent>
      </Card>

      <Button
        className="w-full gap-2"
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
      >
        {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Speichern
      </Button>
    </div>
  );
}
