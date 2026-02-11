import { useState, useCallback } from "react";
import { CanvasBranding, FONT_OPTIONS, COLOR_PRESETS } from "./types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImagePlus, Trash2, Building2, Palette, Type } from "lucide-react";

interface CanvasBrandingPanelProps {
  branding: CanvasBranding;
  onChange: (branding: CanvasBranding) => void;
}

export function CanvasBrandingPanel({ branding, onChange }: CanvasBrandingPanelProps) {
  const update = (patch: Partial<CanvasBranding>) => onChange({ ...branding, ...patch });

  return (
    <div className="space-y-4 p-3">
      {/* Logo */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          <Building2 className="h-3 w-3" /> Logo
        </Label>
        {branding.logoUrl ? (
          <div className="relative inline-block">
            <img src={branding.logoUrl} alt="Logo" className="h-14 object-contain rounded border p-1" />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-5 w-5"
              onClick={() => update({ logoUrl: undefined })}
            >
              <Trash2 className="h-2.5 w-2.5" />
            </Button>
          </div>
        ) : (
          <label className="flex items-center gap-2 p-2.5 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-all">
            <ImagePlus className="h-4 w-4 text-muted-foreground/50" />
            <span className="text-[10px] text-muted-foreground">Logo hochladen</span>
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
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Firmendaten</Label>
        <Input value={branding.companyName || ""} onChange={(e) => update({ companyName: e.target.value })} placeholder="Firmenname" className="h-7 text-xs" />
        <Input value={branding.companyAddress || ""} onChange={(e) => update({ companyAddress: e.target.value })} placeholder="Adresse" className="h-7 text-xs" />
        <div className="grid grid-cols-2 gap-1.5">
          <Input value={branding.companyPhone || ""} onChange={(e) => update({ companyPhone: e.target.value })} placeholder="Telefon" className="h-7 text-xs" />
          <Input value={branding.companyEmail || ""} onChange={(e) => update({ companyEmail: e.target.value })} placeholder="E-Mail" className="h-7 text-xs" />
        </div>
      </div>

      {/* Font */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          <Type className="h-3 w-3" /> Schriftart
        </Label>
        <Select value={branding.fontFamily || "system-ui"} onValueChange={(v) => update({ fontFamily: v })}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((f) => (
              <SelectItem key={f.value} value={f.value} className="text-xs" style={{ fontFamily: f.value }}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Colors */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          <Palette className="h-3 w-3" /> Farben
        </Label>
        <ColorRow label="Primärfarbe" value={branding.primaryColor || ""} onChange={(v) => update({ primaryColor: v })} />
        <ColorRow label="Überschriften" value={branding.headingColor || ""} onChange={(v) => update({ headingColor: v })} />
      </div>

      {/* Footer */}
      <div className="space-y-1">
        <Label className="text-xs">Fußzeile</Label>
        <Textarea
          value={branding.footerText || ""}
          onChange={(e) => update({ footerText: e.target.value })}
          placeholder="Steuernummer, Bank..."
          className="text-xs min-h-[50px] resize-y"
        />
      </div>
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-0.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange("")}
          className={`h-5 w-5 rounded-full border-2 transition-all ${!value ? "border-primary scale-110" : "border-border"}`}
          title="Standard"
        >
          <span className="text-[7px] text-muted-foreground flex items-center justify-center">∅</span>
        </button>
        {COLOR_PRESETS.slice(0, 6).map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`h-5 w-5 rounded-full border-2 transition-all ${value === c ? "border-primary scale-110" : "border-border"}`}
            style={{ backgroundColor: c }}
          />
        ))}
        <Input type="color" value={value || "#F47B20"} onChange={(e) => onChange(e.target.value)} className="h-5 w-7 p-0 border-none cursor-pointer" />
      </div>
    </div>
  );
}
