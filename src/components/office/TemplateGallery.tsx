import { OfficeTemplate } from "./types";
import { PRESET_TEMPLATES } from "./presets";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Copy, Trash2, ClipboardList, UserPlus, TrendingUp, Info, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  protokoll: ClipboardList,
  aufnahme: UserPlus,
  verlauf: TrendingUp,
  info: Info,
  uebergabe: ArrowRightLeft,
  eigene: FileText,
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

  return (
    <div className="space-y-8">
      {/* Quick Actions */}
      <div>
        <Button onClick={onCreateBlank} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Leeres Dokument erstellen
        </Button>
      </div>

      {/* Preset Templates */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Vorlagen für Hufbearbeiter:innen</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRESET_TEMPLATES.map((preset, index) => {
            const Icon = CATEGORY_ICONS[preset.category] || FileText;
            return (
              <Card
                key={index}
                className="p-4 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                onClick={() => onCreateFromPreset(index)}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{preset.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{preset.description}</p>
                    <Badge variant="secondary" className="mt-2 text-[10px]">
                      {preset.blocks.length} Bausteine
                    </Badge>
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
                  className="p-4 hover:border-primary/50 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-accent text-accent-foreground">
                      <Icon className="h-5 w-5" />
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
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => onDeleteTemplate(template.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
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
