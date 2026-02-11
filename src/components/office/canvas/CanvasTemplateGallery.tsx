import { FARRIER_TEMPLATES } from "./templates";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, ClipboardList, UserPlus, TrendingUp, BarChart3, ArrowRightLeft, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  protokoll: ClipboardList,
  aufnahme: UserPlus,
  verlauf: TrendingUp,
  analyse: BarChart3,
  uebergabe: ArrowRightLeft,
};

const CATEGORY_COLORS: Record<string, string> = {
  protokoll: "from-primary/20 to-primary/5 border-primary/20",
  aufnahme: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/20",
  verlauf: "from-blue-500/15 to-blue-500/5 border-blue-500/20",
  analyse: "from-amber-500/15 to-amber-500/5 border-amber-500/20",
  uebergabe: "from-purple-500/15 to-purple-500/5 border-purple-500/20",
};

interface CanvasTemplateGalleryProps {
  onSelectTemplate: (index: number) => void;
  onCreateBlank: () => void;
}

export function CanvasTemplateGallery({ onSelectTemplate, onCreateBlank }: CanvasTemplateGalleryProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = [
    { value: "all", label: "Alle" },
    { value: "protokoll", label: "Protokolle" },
    { value: "aufnahme", label: "Aufnahme" },
    { value: "verlauf", label: "Verlauf" },
    { value: "analyse", label: "Analyse" },
    { value: "uebergabe", label: "Übergabe" },
  ];

  const filteredTemplates = activeCategory === "all"
    ? FARRIER_TEMPLATES
    : FARRIER_TEMPLATES.filter((t) => t.category === activeCategory);

  return (
    <div className="space-y-8">
      {/* Blank doc */}
      <Card className="p-5 border-dashed border-2 hover:border-primary/40 transition-colors cursor-pointer group" onClick={onCreateBlank}>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Plus className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h4 className="font-medium">Leeres Dokument erstellen</h4>
            <p className="text-sm text-muted-foreground">Starte von Null mit deinem eigenen Layout auf A4-Canvas</p>
          </div>
        </div>
      </Card>

      {/* Templates */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Fach-Vorlagen für Hufbearbeiter:innen</h3>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                activeCategory === cat.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template, _) => {
            const originalIndex = FARRIER_TEMPLATES.indexOf(template);
            const Icon = CATEGORY_ICONS[template.category] || FileText;
            const gradient = CATEGORY_COLORS[template.category] || "from-muted to-muted/50 border-border";
            return (
              <Card
                key={template.id}
                className={cn("overflow-hidden cursor-pointer hover:shadow-lg transition-all group border", gradient.split(" ").pop())}
                onClick={() => onSelectTemplate(originalIndex)}
              >
                <div className={cn("h-1.5 bg-gradient-to-r", gradient.split("border")[0])} />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("p-2.5 rounded-xl bg-gradient-to-br shrink-0", gradient.split("border")[0])}>
                      <Icon className="h-5 w-5 text-foreground/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{template.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {template.blocks.length} Bausteine
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">A4 Canvas</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
