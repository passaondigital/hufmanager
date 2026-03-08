import { FARRIER_TEMPLATES } from "@/components/office/canvas/templates";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, Sparkles, ClipboardList, UserPlus, TrendingUp,
  BarChart3, ArrowRightLeft, FileText, Search, MessageSquare,
  Briefcase, AlertTriangle, Blocks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  protokoll: ClipboardList,
  aufnahme: UserPlus,
  verlauf: TrendingUp,
  analyse: BarChart3,
  uebergabe: ArrowRightLeft,
  kommunikation: MessageSquare,
  verwaltung: Briefcase,
  notfall: AlertTriangle,
};

const CATEGORY_COLORS: Record<string, string> = {
  protokoll: "from-primary/20 to-primary/5 border-primary/20",
  aufnahme: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/20",
  verlauf: "from-blue-500/15 to-blue-500/5 border-blue-500/20",
  analyse: "from-amber-500/15 to-amber-500/5 border-amber-500/20",
  uebergabe: "from-purple-500/15 to-purple-500/5 border-purple-500/20",
  kommunikation: "from-cyan-500/15 to-cyan-500/5 border-cyan-500/20",
  verwaltung: "from-slate-500/15 to-slate-500/5 border-slate-500/20",
  notfall: "from-red-500/15 to-red-500/5 border-red-500/20",
};

interface OfficeTemplateGalleryProps {
  onSelectTemplate: (index: number) => void;
  onCreateBlank: () => void;
}

// New template IDs that get the "Neu" badge
const NEW_TEMPLATE_IDS = [
  "tpl-ta-empfehlung", "tpl-hufschuh-empfehlung", "tpl-dsgvo",
  "tpl-preisliste", "tpl-angebot", "tpl-notfallprotokoll", "tpl-kolik-bogen",
];

export function OfficeTemplateGallery({ onSelectTemplate, onCreateBlank }: OfficeTemplateGalleryProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  const categories = [
    { value: "all", label: "Alle" },
    { value: "protokoll", label: "Protokolle" },
    { value: "aufnahme", label: "Aufnahme" },
    { value: "verlauf", label: "Verlauf" },
    { value: "analyse", label: "Analyse" },
    { value: "uebergabe", label: "Übergabe" },
    { value: "kommunikation", label: "Kommunikation" },
    { value: "verwaltung", label: "Verwaltung" },
    { value: "notfall", label: "Notfall" },
  ];

  const filteredTemplates = FARRIER_TEMPLATES.filter((t) => {
    const matchesCat = activeCategory === "all" || t.category === activeCategory;
    const matchesSearch = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Vorlage suchen..."
          className="pl-9 h-9"
        />
      </div>

      {/* Blank doc */}
      <Card className="p-4 border-dashed border-2 hover:border-primary/40 transition-colors cursor-pointer group" onClick={onCreateBlank}>
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Plus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-medium text-sm">Leeres Dokument erstellen</h4>
            <p className="text-xs text-muted-foreground">Starte von Null mit deinem eigenen Layout</p>
          </div>
        </div>
      </Card>

      {/* Category filters */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Fach-Vorlagen</h3>
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
          {filteredTemplates.map((template) => {
            const originalIndex = FARRIER_TEMPLATES.indexOf(template);
            const Icon = CATEGORY_ICONS[template.category] || FileText;
            const gradient = CATEGORY_COLORS[template.category] || "from-muted to-muted/50 border-border";
            const isNew = NEW_TEMPLATE_IDS.includes(template.id);

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
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm truncate">{template.name}</h4>
                        {isNew && <Badge className="text-[9px] px-1.5 py-0 bg-primary/20 text-primary border-primary/30">🆕 Neu</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Blocks className="h-3 w-3" />
                          {template.blocks.length} Bausteine
                        </span>
                        <Badge variant="outline" className="text-[10px]">A4</Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-3 h-8 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Vorlage nutzen →
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">Keine Vorlagen gefunden.</p>
          </div>
        )}
      </div>
    </div>
  );
}
