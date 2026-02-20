import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { GripVertical, Eye, EyeOff, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface Section {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

const DEFAULT_SECTIONS: Section[] = [
  { id: "hero", label: "Hero / Header", description: "Logo, Name und Slogan", enabled: true },
  { id: "about", label: "Über mich", description: "Persönliche Vorstellung", enabled: true },
  { id: "highlights", label: "Angebote (Highlight)", description: "Große Preis-Karten (max. 3)", enabled: true },
  { id: "services", label: "Service-Liste", description: "Kompakte Preisliste", enabled: true },
  { id: "gallery", label: "Galerie", description: "Vorher/Nachher Bilder", enabled: true },
  { id: "reviews", label: "Bewertungen", description: "Kundenstimmen & Rezensionen", enabled: true },
  { id: "contact", label: "Kontakt", description: "Kontaktformular", enabled: true },
];

export const SectionManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sections, setSections] = useState<Section[]>(DEFAULT_SECTIONS);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["business-settings-sections", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("business_settings")
        .select("id, section_order")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Load section order from settings
  useEffect(() => {
    if (settings?.section_order && Array.isArray(settings.section_order)) {
      const orderArray = settings.section_order as string[];
      const orderedSections = orderArray
        .map((id) => {
          const defaultSection = DEFAULT_SECTIONS.find((s) => s.id === id);
          if (defaultSection) return { ...defaultSection, enabled: true };
          return null;
        })
        .filter(Boolean) as Section[];

      // Add any missing sections as disabled
      DEFAULT_SECTIONS.forEach((defaultSec) => {
        if (!orderedSections.find((s) => s.id === defaultSec.id)) {
          orderedSections.push({ ...defaultSec, enabled: false });
        }
      });

      setSections(orderedSections);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      const enabledOrder = sections.filter((s) => s.enabled).map((s) => s.id);

      if (settings?.id) {
        const { error } = await supabase
          .from("business_settings")
          .update({ section_order: enabledOrder })
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("business_settings").upsert({
          id: user.id,
          user_id: user.id,
          section_order: enabledOrder,
        }, { onConflict: "id" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-settings-sections"] });
      toast({ title: "Gespeichert", description: "Seitenreihenfolge wurde aktualisiert." });
    },
    onError: () => {
      toast({ title: "Fehler", description: "Reihenfolge konnte nicht gespeichert werden.", variant: "destructive" });
    },
  });

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newSections = [...sections];
    const [draggedItem] = newSections.splice(draggedIndex, 1);
    newSections.splice(index, 0, draggedItem);
    setSections(newSections);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const toggleSection = (index: number) => {
    const newSections = [...sections];
    // Hero and Contact must always be enabled
    if (newSections[index].id === "hero" || newSections[index].id === "contact") {
      toast({ title: "Hinweis", description: "Diese Sektion kann nicht deaktiviert werden." });
      return;
    }
    newSections[index].enabled = !newSections[index].enabled;
    setSections(newSections);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GripVertical className="h-5 w-5" />
          Seitenaufbau
        </CardTitle>
        <CardDescription>
          Ziehen Sie die Sektionen um die Reihenfolge zu ändern. Aktivieren/Deaktivieren Sie Bereiche.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {sections.map((section, index) => (
          <div
            key={section.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border bg-card transition-all cursor-grab active:cursor-grabbing",
              draggedIndex === index && "opacity-50 scale-[0.98]",
              !section.enabled && "opacity-50"
            )}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground">{section.label}</p>
              <p className="text-xs text-muted-foreground truncate">{section.description}</p>
            </div>

            <div className="flex items-center gap-2">
              {section.enabled ? (
                <Eye className="h-4 w-4 text-primary" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
              <Switch
                checked={section.enabled}
                onCheckedChange={() => toggleSection(index)}
                disabled={section.id === "hero" || section.id === "contact"}
              />
            </div>
          </div>
        ))}

        <Button
          className="w-full mt-4 gap-2"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Speichern...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Reihenfolge speichern
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
