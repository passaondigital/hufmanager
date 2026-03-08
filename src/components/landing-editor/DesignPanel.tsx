import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DesignPanelProps {
  editor: any;
}

const TEMPLATES = [
  { id: "classic", name: "Classic", desc: "Bewährt & klar" },
  { id: "modern", name: "Modern", desc: "Fullscreen Hero" },
  { id: "minimal", name: "Minimal", desc: "Text-fokussiert" },
];

const COLOR_PALETTES = [
  { label: "🌑 Dunkel", primary: "#F5970A", bg: "#1a1a1a" },
  { label: "☀️ Hell", primary: "#F5970A", bg: "#ffffff" },
  { label: "🌿 Natur", primary: "#2d8a4e", bg: "#1a1a1a" },
  { label: "🔵 Blau", primary: "#3b82f6", bg: "#0f172a" },
  { label: "💜 Lila", primary: "#8b5cf6", bg: "#1e1b2e" },
  { label: "🟤 Erde", primary: "#a0845c", bg: "#1c1917" },
];

export const DesignPanel = ({ editor }: DesignPanelProps) => {
  const { settings, updateSetting } = editor;

  return (
    <div className="space-y-6">
      {/* Template */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Template wählen</h3>
        <div className="grid grid-cols-3 gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => updateSetting("landing_template", t.id)}
              className={cn(
                "border rounded-lg p-3 text-center transition-all hover:border-primary/50",
                settings.landing_template === t.id
                  ? "border-primary bg-primary/10 ring-2 ring-primary"
                  : "border-border"
              )}
            >
              <div className={cn(
                "h-12 rounded mb-2 mx-auto w-full",
                t.id === "classic" && "bg-gradient-to-b from-muted to-muted/50",
                t.id === "modern" && "bg-gradient-to-br from-primary/30 to-muted",
                t.id === "minimal" && "bg-muted/30 border border-dashed border-muted-foreground/30",
              )} />
              <p className="text-xs font-medium text-foreground">{t.name}</p>
              <p className="text-[10px] text-muted-foreground">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Farben</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Label className="text-xs w-24">Hauptfarbe</Label>
            <div className="flex items-center gap-2 flex-1">
              <input
                type="color"
                value={settings.primary_color}
                onChange={(e) => updateSetting("primary_color", e.target.value)}
                className="h-8 w-8 rounded border border-border cursor-pointer"
              />
              <Input
                value={settings.primary_color}
                onChange={(e) => updateSetting("primary_color", e.target.value)}
                className="text-xs font-mono h-8"
              />
            </div>
          </div>
        </div>

        {/* Quick palettes */}
        <div className="grid grid-cols-3 gap-2">
          {COLOR_PALETTES.map((p) => (
            <button
              key={p.label}
              onClick={() => updateSetting("primary_color", p.primary)}
              className={cn(
                "border rounded-lg p-2 text-center transition-all hover:border-primary/50",
                settings.primary_color === p.primary ? "border-primary" : "border-border"
              )}
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: p.primary }} />
                <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: p.bg }} />
              </div>
              <p className="text-[10px]">{p.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Layout options */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Layout</h3>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Exit-Intent Popup</Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {settings.exit_intent_enabled ? "An" : "Aus"}
            </span>
            <input
              type="checkbox"
              checked={settings.exit_intent_enabled}
              onChange={(e) => updateSetting("exit_intent_enabled", e.target.checked)}
              className="accent-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
