export type BlockType =
  | "heading"
  | "text"
  | "input"
  | "textarea"
  | "checkbox"
  | "checklist"
  | "dropdown"
  | "date"
  | "time"
  | "number"
  | "table"
  | "drawing"
  | "image"
  | "signature"
  | "placeholder"
  | "note"
  | "separator";

export interface BlockOption {
  label: string;
  value: string;
}

export interface TableCell {
  value: string;
}

export interface DocumentBlock {
  id: string;
  type: BlockType;
  label?: string;
  value?: string;
  placeholder?: string;
  options?: BlockOption[];
  checked?: boolean;
  checklistItems?: { id: string; label: string; checked: boolean }[];
  rows?: number;
  cols?: number;
  tableData?: TableCell[][];
  imageUrl?: string;
  signatureDataUrl?: string;
  drawingDataUrl?: string;
  placeholderKey?: string; // e.g. "horse_name", "client_name", "date"
  headingLevel?: 1 | 2 | 3;
  required?: boolean;
}

export interface DocumentBranding {
  logoUrl?: string;
  fontFamily?: string;
  primaryColor?: string;
  headingColor?: string;
  lineColor?: string;
  backgroundColor?: string;
}

export interface OfficeTemplate {
  id: string;
  provider_id: string;
  name: string;
  description?: string;
  category: string;
  blocks: DocumentBlock[];
  branding?: DocumentBranding;
  is_preset: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface OfficeDocument {
  id: string;
  provider_id: string;
  template_id?: string;
  title: string;
  blocks: DocumentBlock[];
  branding?: DocumentBranding;
  horse_id?: string;
  contact_id?: string;
  status: "draft" | "completed";
  pdf_url?: string;
  created_at: string;
  updated_at: string;
}

export const PLACEHOLDER_KEYS: Record<string, string> = {
  horse_name: "Pferdename",
  client_name: "Kundenname",
  date: "Datum",
  provider_name: "Bearbeiter:in",
  horse_breed: "Rasse",
  horse_age: "Alter",
};

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  heading: "Überschrift",
  text: "Textbaustein",
  input: "Einzeiliges Textfeld",
  textarea: "Mehrzeiliges Textfeld",
  checkbox: "Checkbox",
  checklist: "Checkliste",
  dropdown: "Dropdown-Feld",
  date: "Datumsfeld",
  time: "Zeitfeld",
  number: "Zahlenfeld",
  table: "Tabelle",
  drawing: "Freihand-Zeichenfeld",
  image: "Bildfeld",
  signature: "Unterschriftenfeld",
  placeholder: "Platzhalter",
  note: "Notizfeld",
  separator: "Trennlinie",
};
