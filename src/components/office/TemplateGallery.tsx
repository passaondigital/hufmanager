import { OfficeTemplate } from "./types";
import { PRESET_TEMPLATES } from "./presets";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, FileText, Copy, Trash2, ClipboardList, UserPlus, TrendingUp, Info, ArrowRightLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  protokoll: ClipboardList,
  aufnahme: UserPlus,
  verlauf: TrendingUp,
  info: Info,
  uebergabe: ArrowRightLeft,
  eigene: FileText,
};

const CATEGORY_COLORS: Record<string, string> = {
  protokoll: "from-primary/20 to-primary/5 border-primary/20",
  aufnahme: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/20",
  verlauf: "from-blue-500/15 to-blue-500/5 border-blue-500/20",
  info: "from-amber-500/15 to-amber-500/5 border-amber-500/20",
  uebergabe: "from-purple-500/15 to-purple-500/5 border-purple-500/20",
};

interface TemplateGalleryProps {
  templates: OfficeTemplate[];
  onSelectTemplate: (template: OfficeTemplate) => void;
  onCreateFromPreset: (presetIndex: number) => void;
  onCreateBlank: () => void;
  onDuplicateTemplate: (template: OfficeTemplate) => void;
  onDeleteTemplate: (id: string) => void;
}

export function TemplateGallery({
  templates,
  onSelectTemplate,
  onCreateFromPreset,
  onCreateBlank,
  onDuplicateTemplate,
  onDeleteTemplate,
}: TemplateGalleryProps) {
  const userTemplates = templates.filter((t) => !t.is_preset);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = [
    { value: "all", label: "Alle" },
    { value: "protokoll", label: "Protokolle" },
    { value: "aufnahme", label: "Aufnahme" },
    { value: "verlauf", label: "Verlauf" },
    { value: "info", label: "Information" },
    { value: "uebergabe", label: "Übergabe" },
  ];

  const filteredPresets = activeCategory === "all"
    ? PRESET_TEMPLATES
    : PRESET_TEMPLATES.filter(p => p.category === activeCategory);

  return (
    <div className="space-y-8">
      {/* Quick Actions */}
      <Card className="p-5 border-dashed border-2 hover:border-primary/40 transition-colors cursor-pointer group" onClick={onCreateBlank}>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Plus className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h4 className="font-medium">Leeres Dokument erstellen</h4>
            <p className="text-sm text-muted-foreground">Starte von Null mit deinem eigenen Layout</p>
          </div>
        </div>
      </Card>

      {/* Preset Templates */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Vorlagen für Hufbearbeiter:innen</h3>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                activeCategory === cat.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPresets.map((preset, index) => {
            const originalIndex = PRESET_TEMPLATES.indexOf(preset);
            const Icon = CATEGORY_ICONS[preset.category] || FileText;
            const gradient = CATEGORY_COLORS[preset.category] || "from-muted to-muted/50 border-border";
            return (
              <Card
                key={originalIndex}
                className={cn(
                  "overflow-hidden cursor-pointer hover:shadow-lg transition-all group border",
                  gradient.split(" ").pop()
                )}
                onClick={() => onCreateFromPreset(originalIndex)}
              >
                <div className={cn("h-1.5 bg-gradient-to-r", gradient.split("border")[0])} />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("p-2.5 rounded-xl bg-gradient-to-br shrink-0", gradient.split("border")[0])}>
                      <Icon className="h-5 w-5 text-foreground/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{preset.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{preset.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {preset.blocks.length} Bausteine
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* User Templates */}
      {userTemplates.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Meine Vorlagen</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {userTemplates.map((template) => {
              const Icon = CATEGORY_ICONS[template.category] || FileText;
              return (
                <Card
                  key={template.id}
                  className="p-4 hover:border-primary/40 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-accent/10">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{template.name}</h4>
                      {template.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                      )}
                      <div className="flex gap-1 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => onSelectTemplate(template)}
                        >
                          Verwenden
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => onDuplicateTemplate(template)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Vorlage löschen?</AlertDialogTitle>
                              <AlertDialogDescription>
                                „{template.name}" wird unwiderruflich gelöscht.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDeleteTemplate(template.id)} className="bg-destructive hover:bg-destructive/90">
                                Löschen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
