import { DocumentBranding } from "./types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, Trash2, Palette, Building2 } from "lucide-react";
import { FONT_OPTIONS, COLOR_PRESETS } from "./types";

interface BrandingPanelProps {
  branding: DocumentBranding;
  onChange: (branding: DocumentBranding) => void;
}

export function BrandingPanel({ branding, onChange }: BrandingPanelProps) {
  const update = (patch: Partial<DocumentBranding>) => onChange({ ...branding, ...patch });

  return (
    <div className="space-y-5">
      {/* Logo */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5" /> Firmenlogo
        </Label>
        {branding.logoUrl ? (
          <div className="relative inline-block">
            <img src={branding.logoUrl} alt="Logo" className="h-16 object-contain rounded border p-1" />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6"
              onClick={() => update({ logoUrl: undefined })}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <label className="flex items-center gap-3 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
            <ImagePlus className="h-5 w-5 text-muted-foreground/50" />
            <span className="text-xs text-muted-foreground">Logo hochladen (PNG, JPG)</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => update({ logoUrl: reader.result as string });
                  reader.readAsDataURL(file);
                }
              }}
            />
          </label>
        )}
      </div>

      {/* Company Info */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Firmendaten</Label>
        <Input
          value={branding.companyName || ""}
          onChange={(e) => update({ companyName: e.target.value })}
          placeholder="Firmenname"
          className="h-8 text-xs"
        />
        <Input
          value={branding.companyAddress || ""}
          onChange={(e) => update({ companyAddress: e.target.value })}
          placeholder="Adresse"
          className="h-8 text-xs"
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={branding.companyPhone || ""}
            onChange={(e) => update({ companyPhone: e.target.value })}
            placeholder="Telefon"
            className="h-8 text-xs"
          />
          <Input
            value={branding.companyEmail || ""}
            onChange={(e) => update({ companyEmail: e.target.value })}
            placeholder="E-Mail"
            className="h-8 text-xs"
          />
        </div>
      </div>

      {/* Typography */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Palette className="h-3.5 w-3.5" /> Design
        </Label>
        <div className="space-y-1.5">
          <Label className="text-xs">Schriftart</Label>
          <Select value={branding.fontFamily || "system"} onValueChange={(v) => update({ fontFamily: v })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Colors */}
      <div className="space-y-3">
        <ColorPicker label="Überschriften-Farbe" value={branding.headingColor || ""} onChange={(v) => update({ headingColor: v })} />
        <ColorPicker label="Primärfarbe (Akzente)" value={branding.primaryColor || ""} onChange={(v) => update({ primaryColor: v })} />
        <ColorPicker label="Linienfarbe" value={branding.lineColor || ""} onChange={(v) => update({ lineColor: v })} />
        <ColorPicker label="Hintergrund" value={branding.backgroundColor || ""} onChange={(v) => update({ backgroundColor: v })} />
      </div>

      {/* Footer */}
      <div className="space-y-1.5">
        <Label className="text-xs">Fußzeile</Label>
        <Textarea
          value={branding.footerText || ""}
          onChange={(e) => update({ footerText: e.target.value })}
          placeholder="z.B. Steuernummer, Bankverbindung..."
          className="text-xs min-h-[60px] resize-y"
        />
      </div>
    </div>
  );
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <div className="flex gap-1 flex-wrap flex-1">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c.value}
              onClick={() => onChange(c.value)}
              className={`h-6 w-6 rounded-full border-2 transition-all ${
                value === c.value ? "border-primary scale-110 ring-2 ring-primary/30" : "border-border hover:scale-105"
              }`}
              style={{ backgroundColor: c.value || "transparent" }}
              title={c.label}
            >
              {!c.value && <span className="text-[8px] text-muted-foreground">∅</span>}
            </button>
          ))}
        </div>
        <Input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-10 p-0 border-none cursor-pointer"
        />
      </div>
    </div>
  );
}
