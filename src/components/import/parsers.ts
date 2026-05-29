import type { ParsedContact } from "./types";

const genId = () => crypto.randomUUID();

// Validate a single contact and set status/errors
export function validateContact(c: ParsedContact): ParsedContact {
  const errors: string[] = [];
  if (!c.full_name || c.full_name.trim().length < 2) errors.push("Name fehlt oder zu kurz");
  if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) errors.push("E-Mail ungültig");
  if (c.phone && !/^[\d\s\+\-\(\)\/]{5,}$/.test(c.phone)) errors.push("Telefonnummer ungültig");

  return {
    ...c,
    full_name: c.full_name?.trim() || "",
    email: c.email?.trim() || undefined,
    phone: c.phone?.trim() || undefined,
    status: errors.length > 0 ? "error" : c.email || c.phone ? "valid" : "warning",
    errors,
  };
}

// CSV / TSV parser
export function parseCSV(text: string): ParsedContact[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const sep = lines[0].includes(";") ? ";" : lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());

  const findCol = (patterns: RegExp[]) => headers.findIndex(h => patterns.some(p => p.test(h)));
  const nameIdx = findCol([/name|vorname|nachname|bezeichnung/]);
  const emailIdx = findCol([/e-?mail/]);
  const phoneIdx = findCol([/tel|phone|handy|mobil|fon/]);
  const companyIdx = findCol([/firma|company|unternehmen|betrieb/]);
  const streetIdx = findCol([/stra[sß]e|street|adresse|anschrift/]);
  const notesIdx = findCol([/notiz|note|bemerkung|kommentar/]);

  return lines.slice(1).map(line => {
    const cols = line.split(sep).map(c => c.trim().replace(/^"|"$/g, ""));
    const raw: ParsedContact = {
      id: genId(),
      full_name: cols[nameIdx >= 0 ? nameIdx : 0] || "",
      email: emailIdx >= 0 ? cols[emailIdx] : undefined,
      phone: phoneIdx >= 0 ? cols[phoneIdx] : undefined,
      company_name: companyIdx >= 0 ? cols[companyIdx] : undefined,
      street: streetIdx >= 0 ? cols[streetIdx] : undefined,
      notes: notesIdx >= 0 ? cols[notesIdx] : undefined,
      status: "valid",
      errors: [],
    };
    return validateContact(raw);
  }).filter(r => r.full_name || r.email || r.phone);
}

// Excel parser
export async function parseExcel(data: ArrayBuffer): Promise<ParsedContact[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(data, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const csv = XLSX.utils.sheet_to_csv(sheet, { FS: ";" });
  return parseCSV(csv);
}

// vCard parser
export function parseVCard(text: string): ParsedContact[] {
  const cards = text.split("END:VCARD").filter(c => c.includes("BEGIN:VCARD"));
  return cards.map(card => {
    const getField = (field: string) => {
      const match = card.match(new RegExp(`${field}[^:]*:(.+)`, "i"));
      return match?.[1]?.trim() || undefined;
    };
    const fn = getField("FN") || "";
    const n = getField("N");
    const name = fn || (n ? n.split(";").filter(Boolean).reverse().join(" ") : "");
    const email = getField("EMAIL");
    const phone = getField("TEL");
    const org = getField("ORG");
    const adr = getField("ADR");
    const street = adr ? adr.split(";").filter(Boolean).join(", ") : undefined;

    return validateContact({
      id: genId(),
      full_name: name,
      email,
      phone: phone?.replace(/[^\d\+\-\s\(\)]/g, ""),
      company_name: org?.replace(/;/g, ""),
      street,
      status: "valid",
      errors: [],
    });
  }).filter(c => c.full_name);
}

// JSON parser
export function parseJSON(text: string): ParsedContact[] {
  try {
    const data = JSON.parse(text);
    const arr = Array.isArray(data) ? data : data.contacts || data.data || [data];
    return arr.map((item: any) => {
      return validateContact({
        id: genId(),
        full_name: item.full_name || item.name || item.Name || item.vorname
          ? `${item.vorname || ""} ${item.nachname || item.name || ""}`.trim()
          : "",
        email: item.email || item.Email || item.mail,
        phone: item.phone || item.telefon || item.tel || item.Telefon || item.Phone,
        company_name: item.company || item.firma || item.Firma || item.company_name,
        street: item.street || item.strasse || item.straße || item.adresse || item.address,
        notes: item.notes || item.notizen || item.bemerkung,
        status: "valid",
        errors: [],
      });
    }).filter((c: ParsedContact) => c.full_name || c.email || c.phone);
  } catch {
    return [];
  }
}

// Plain text / Copy-Paste parser (heuristic)
export function parsePlainText(text: string): ParsedContact[] {
  const lines = text.trim().split(/\n/).filter(l => l.trim());
  return lines.map(line => {
    const emailMatch = line.match(/[\w.+-]+@[\w.-]+\.\w+/);
    const phoneMatch = line.match(/[\+]?[\d\s\-\(\)\/]{7,}/);
    let name = line
      .replace(emailMatch?.[0] || "", "")
      .replace(phoneMatch?.[0] || "", "")
      .replace(/[,;|\t]+/g, " ")
      .trim();
    if (!name && !emailMatch && !phoneMatch) return null;

    return validateContact({
      id: genId(),
      full_name: name || "Unbekannt",
      email: emailMatch?.[0],
      phone: phoneMatch?.[0]?.trim(),
      status: "valid",
      errors: [],
    });
  }).filter(Boolean) as ParsedContact[];
}

// Detect format and parse
export async function parseFile(file: File, content: string | ArrayBuffer): Promise<ParsedContact[]> {
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext === "xlsx" || ext === "xls") return parseExcel(content as ArrayBuffer);
  if (ext === "vcf") return parseVCard(content as string);
  if (ext === "json") return parseJSON(content as string);
  if (ext === "csv" || ext === "tsv" || ext === "txt") return parseCSV(content as string);
  // fallback: try CSV
  return parseCSV(content as string);
}
