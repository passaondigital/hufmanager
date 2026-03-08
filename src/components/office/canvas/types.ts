// ============= Canvas Editor Type System =============

export type CanvasBlockType =
  | "text"
  | "textarea"
  | "checkbox"
  | "dropdown"
  | "scale"
  | "date"
  | "image"
  | "signature"
  | "draw"
  | "graphic"
  | "auto-info";

export type GraphicType =
  | "horse-side"
  | "hoof-bottom"
  | "hoof-side"
  | "hooves-all"
  | "horse-leg";

export type AutoInfoType =
  | "name"
  | "betrieb"
  | "datum"
  | "zeitstempel";

export interface CanvasBlock {
  id: string;
  type: CanvasBlockType;
  x: number;
  y: number;
  width: number;
  height: number;
  locked?: boolean;
  label?: string;
  value?: string;
  placeholder?: string;
  // Style
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  bgColor?: string;
  borderColor?: string;
  opacity?: number;
  // Dropdown / Checkbox
  options?: { label: string; value: string }[];
  checkboxItems?: { id: string; label: string; checked: boolean }[];
  // Scale
  scaleMin?: number;
  scaleMax?: number;
  scaleValue?: number;
  // Date
  showTimestamp?: boolean;
  // Image
  imageUrl?: string;
  // Signature
  signatureDataUrl?: string;
  // Drawing
  drawingDataUrl?: string;
  drawColor?: string;
  // Graphic
  graphicType?: GraphicType;
  graphicAnnotationUrl?: string;
  // Auto-info
  autoInfoType?: AutoInfoType;
  // Table (kept for compat)
  tableData?: { value: string }[][];
  rows?: number;
  cols?: number;
}

export interface CanvasDocument {
  id?: string;
  provider_id?: string;
  title: string;
  blocks: CanvasBlock[];
  branding?: CanvasBranding;
  horse_id?: string;
  contact_id?: string;
  status: "draft" | "completed" | "archived";
  template_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CanvasBranding {
  logoUrl?: string;
  primaryColor?: string;
  headingColor?: string;
  fontFamily?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  footerText?: string;
}

export const FONT_OPTIONS = [
  { value: "system-ui", label: "System (Standard)" },
  { value: "'Open Sans', sans-serif", label: "Open Sans" },
  { value: "'Roboto', sans-serif", label: "Roboto" },
  { value: "'Lora', serif", label: "Lora (Serif)" },
  { value: "'Playfair Display', serif", label: "Playfair Display" },
  { value: "'Source Sans 3', sans-serif", label: "Source Sans 3" },
  { value: "'Merriweather', serif", label: "Merriweather" },
  { value: "'Fira Sans', sans-serif", label: "Fira Sans" },
] as const;

export const COLOR_PRESETS = [
  "#F47B20", "#1a1a1a", "#374151", "#1e40af",
  "#166534", "#9333ea", "#dc2626", "#92400e",
  "#0891b2", "#be185d",
];

export interface CanvasTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  blocks: CanvasBlock[];
  branding?: CanvasBranding;
}

// A4 Canvas dimensions (px) - standard print ratio
export const CANVAS_WIDTH = 595;
export const CANVAS_HEIGHT = 842;
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2.0;
export const ZOOM_STEP = 0.1;
export const AUTO_SAVE_DELAY = 2000;
export const MIN_BLOCK_SIZE = 40;

// Default block sizes per type
export const DEFAULT_BLOCK_SIZES: Record<CanvasBlockType, { width: number; height: number }> = {
  text: { width: 250, height: 80 },
  textarea: { width: 300, height: 120 },
  checkbox: { width: 250, height: 140 },
  dropdown: { width: 250, height: 80 },
  scale: { width: 280, height: 80 },
  date: { width: 250, height: 80 },
  image: { width: 300, height: 200 },
  signature: { width: 350, height: 180 },
  draw: { width: 400, height: 250 },
  graphic: { width: 350, height: 280 },
  "auto-info": { width: 250, height: 80 },
};

export const BLOCK_TYPE_LABELS: Record<CanvasBlockType, string> = {
  text: "Textfeld",
  textarea: "Mehrzeiliges Textfeld",
  checkbox: "Checkbox-Gruppe",
  dropdown: "Dropdown-Auswahl",
  scale: "Bewertungsskala",
  date: "Datumsfeld",
  image: "Foto-Upload",
  signature: "Unterschrift",
  draw: "Freihand-Zeichnung",
  graphic: "Anatomische Grafik",
  "auto-info": "Automatisches Feld",
};

export const GRAPHIC_TYPE_LABELS: Record<GraphicType, string> = {
  "horse-side": "Pferd (Seitenansicht)",
  "hoof-bottom": "Huf (Sohle)",
  "hoof-side": "Huf (seitlich)",
  "hooves-all": "Alle vier Hufe",
  "horse-leg": "Vorderbein",
};

export const AUTO_INFO_LABELS: Record<AutoInfoType, string> = {
  name: "Name",
  betrieb: "Betrieb",
  datum: "Datum",
  zeitstempel: "Zeitstempel",
};
