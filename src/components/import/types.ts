export type ContactCategory = "client" | "partner" | "supplier" | "lead";

export interface ParsedContact {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  street?: string;
  notes?: string;
  status: "valid" | "warning" | "error";
  errors: string[];
}

export interface ImportResult {
  contact: ParsedContact;
  success: boolean;
  error?: string;
}

export type ImportStep = "upload" | "validate" | "importing" | "done";

export const CATEGORY_CONFIG: Record<ContactCategory, { label: string; color: string }> = {
  client: { label: "Kunden", color: "bg-emerald-500" },
  partner: { label: "Partner (Tierarzt/Schmied)", color: "bg-blue-500" },
  supplier: { label: "Lieferanten", color: "bg-amber-500" },
  lead: { label: "Interessenten", color: "bg-purple-500" },
};
