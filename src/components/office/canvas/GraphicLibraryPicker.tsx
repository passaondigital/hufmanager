import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImagePlus, Library, Upload, Trash2 } from "lucide-react";
import { GraphicType, GRAPHIC_TYPE_LABELS } from "./types";
import graphicHorseSide from "@/assets/graphic-horse-side.png";

interface GraphicLibraryPickerProps {
  currentType?: GraphicType;
  currentCustomUrl?: string;
  onSelectSystem: (type: GraphicType) => void;
  onSelectCustom: (imageUrl: string) => void;
}

// System graphics with preview thumbnails
const SYSTEM_GRAPHICS: { type: GraphicType; label: string; preview: React.ReactNode }[] = [
  {
    type: "horse-side",
    label: GRAPHIC_TYPE_LABELS["horse-side"],
    preview: <img src={graphicHorseSide} alt="Pferd" className="w-full h-full object-contain" />,
  },
  {
    type: "hoof-bottom",
    label: GRAPHIC_TYPE_LABELS["hoof-bottom"],
    preview: (
      <svg viewBox="0 0 300 280" className="w-full h-full" fill="none" stroke="#94a3b8" strokeWidth="1.5">
        <ellipse cx="150" cy="140" rx="100" ry="110" strokeWidth="2" />
        <path d="M150 60 L120 180 L150 200 L180 180 Z" strokeWidth="1" />
      </svg>
    ),
  },
  {
    type: "hoof-side",
    label: GRAPHIC_TYPE_LABELS["hoof-side"],
    preview: (
      <svg viewBox="0 0 300 280" className="w-full h-full" fill="none" stroke="#94a3b8" strokeWidth="1.5">
        <path d="M80 60 Q90 40 120 30 Q160 20 180 40 L190 80 Q200 120 200 160 L210 200 Q215 230 200 250 L60 250 Q50 230 60 200 L65 160 Q65 120 70 80 Z" strokeWidth="2" />
      </svg>
    ),
  },
  {
    type: "hooves-all",
    label: GRAPHIC_TYPE_LABELS["hooves-all"],
    preview: (
      <svg viewBox="0 0 400 300" className="w-full h-full" fill="none" stroke="#94a3b8" strokeWidth="1.5">
        {[{ x: 60, y: 20 }, { x: 220, y: 20 }, { x: 60, y: 160 }, { x: 220, y: 160 }].map((h, i) => (
          <ellipse key={i} cx={h.x + 60} cy={h.y + 55} rx={50} ry={50} />
        ))}
      </svg>
    ),
  },
  {
    type: "horse-leg",
    label: GRAPHIC_TYPE_LABELS["horse-leg"],
    preview: (
      <svg viewBox="0 0 200 300" className="w-full h-full" fill="none" stroke="#94a3b8" strokeWidth="1.5">
        <path d="M80 20 Q75 10 90 5 Q110 5 115 15 L120 40 Q125 80 120 120 L115 160 Q110 180 108 200 L105 230 Q102 250 95 265 L80 270 Q70 265 75 250 L80 230 Q82 210 85 190 L88 160 Q90 140 88 120 L85 80 Q82 50 80 20 Z" strokeWidth="2" />
      </svg>
    ),
  },
];

const CUSTOM_GRAPHICS_KEY = "hufmanager_custom_graphics";

interface CustomGraphic {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: string;
}

function loadCustomGraphics(): CustomGraphic[] {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_GRAPHICS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveCustomGraphics(graphics: CustomGraphic[]) {
  localStorage.setItem(CUSTOM_GRAPHICS_KEY, JSON.stringify(graphics));
}

export function GraphicLibraryPicker({ currentType, currentCustomUrl, onSelectSystem, onSelectCustom }: GraphicLibraryPickerProps) {
  const [open, setOpen] = useState(false);
  const [customGraphics, setCustomGraphics] = useState<CustomGraphic[]>(loadCustomGraphics);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyWatermark = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);

        // Watermark settings
        const fontSize = Math.max(12, Math.min(img.width, img.height) * 0.035);
        ctx.font = `${fontSize}px 'Outfit', system-ui, sans-serif`;
        ctx.fillStyle = "rgba(244, 123, 32, 0.18)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Diagonal repeated watermark
        ctx.save();
        ctx.translate(img.width / 2, img.height / 2);
        ctx.rotate(-Math.PI / 6);
        const spacing = fontSize * 4;
        for (let y = -img.height; y < img.height; y += spacing) {
          for (let x = -img.width; x < img.width; x += spacing * 2.5) {
            ctx.fillText("Hufi", x, y);
          }
        }
        ctx.restore();

        resolve(canvas.toDataURL("image/png"));
      };
      img.src = dataUrl;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const watermarked = await applyWatermark(reader.result as string);
      const newGraphic: CustomGraphic = {
        id: crypto.randomUUID(),
        name: file.name.replace(/\.[^.]+$/, ""),
        dataUrl: watermarked,
        createdAt: new Date().toISOString(),
      };
      const updated = [...customGraphics, newGraphic];
      setCustomGraphics(updated);
      saveCustomGraphics(updated);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDeleteCustom = (id: string) => {
    const updated = customGraphics.filter((g) => g.id !== id);
    setCustomGraphics(updated);
    saveCustomGraphics(updated);
  };

  const handleSelectCustom = (graphic: CustomGraphic) => {
    onSelectCustom(graphic.dataUrl);
    setOpen(false);
  };

  const handleSelectSystem = (type: GraphicType) => {
    onSelectSystem(type);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full text-xs h-8 gap-1.5">
          <Library className="h-3 w-3" />
          Grafik-Bibliothek
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <Library className="h-4 w-4" />
            Grafik-Bibliothek
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="system" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="system" className="text-xs">System-Grafiken</TabsTrigger>
            <TabsTrigger value="custom" className="text-xs">Eigene Grafiken</TabsTrigger>
          </TabsList>

          <TabsContent value="system" className="mt-3">
            <div className="grid grid-cols-3 gap-2">
              {SYSTEM_GRAPHICS.map((g) => (
                <button
                  key={g.type}
                  onClick={() => handleSelectSystem(g.type)}
                  className={`flex flex-col items-center p-2 rounded-lg border-2 transition-all hover:border-primary/50 ${
                    currentType === g.type && !currentCustomUrl
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <div className="w-full aspect-square bg-white rounded overflow-hidden mb-1">
                    {g.preview}
                  </div>
                  <span className="text-[10px] text-muted-foreground text-center leading-tight">{g.label}</span>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="mt-3">
            <div className="space-y-3">
              {/* Upload button */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="outline"
                  className="w-full h-16 border-dashed border-2 gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Eigene Grafik hochladen (PNG, JPG, SVG)</span>
                </Button>
              </div>

              {/* Custom graphics grid */}
              {customGraphics.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Noch keine eigenen Grafiken hochgeladen.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {customGraphics.map((g) => (
                    <div
                      key={g.id}
                      className={`relative group flex flex-col items-center p-2 rounded-lg border-2 transition-all hover:border-primary/50 cursor-pointer ${
                        currentCustomUrl === g.dataUrl ? "border-primary bg-primary/5" : "border-border"
                      }`}
                      onClick={() => handleSelectCustom(g)}
                    >
                      <div className="w-full aspect-square bg-white rounded overflow-hidden mb-1">
                        <img src={g.dataUrl} alt={g.name} className="w-full h-full object-contain" />
                      </div>
                      <span className="text-[10px] text-muted-foreground text-center leading-tight truncate w-full">
                        {g.name}
                      </span>
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustom(g.id);
                        }}
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive/80 text-destructive-foreground items-center justify-center hidden group-hover:flex transition-all"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[9px] text-muted-foreground/70 text-center">
                Eigene Grafiken werden lokal im Browser gespeichert.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
