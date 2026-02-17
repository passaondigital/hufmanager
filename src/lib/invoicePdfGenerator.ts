import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { 
  TaxCountry, 
  Currency, 
  getDACHConfig, 
  formatCurrencyDACH, 
  applySwissRounding,
  calculateVatFromGross 
} from "./dachConfig";
import { addSwissQrBillToInvoice } from "./swissQrBill";

interface BusinessSettings {
  business_name: string | null;
  owner_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  iban: string | null;
  bic: string | null;
  bank_name: string | null;
  primary_color: string | null;
  tax_number: string | null;
  vat_id: string | null;
  paypal_link?: string | null;
  // DACH tax settings
  tax_country?: TaxCountry | null;
  default_vat_rate?: number | null;
  currency?: Currency | null;
  swiss_rounding?: boolean | null;
}

interface ClientProfile {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  zip_code: string | null;
  stable_street: string | null;
  stable_city: string | null;
  stable_zip: string | null;
  readable_id?: string | null;
  vat_id?: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string | null;
  issue_date: string;
  due_date: string | null;
  total_amount: number;
  status: string | null;
  notes: string | null;
  payment_method?: string | null;
  customer_type?: string | null;
  horse?: { name: string } | null;
  signature_url?: string | null;
  client_id?: string | null;
}

// Design tokens - Premium color palette
const COLORS = {
  primary: { r: 244, g: 123, b: 32 }, // #F47B20 - Brand Orange
  dark: { r: 17, g: 24, b: 39 },      // #111827 - Near black
  gray900: { r: 17, g: 24, b: 39 },
  gray700: { r: 55, g: 65, b: 81 },
  gray600: { r: 75, g: 85, b: 99 },
  gray500: { r: 107, g: 114, b: 128 },
  gray400: { r: 156, g: 163, b: 175 },
  gray200: { r: 229, g: 231, b: 235 },
  gray100: { r: 243, g: 244, b: 246 }, // #F3F4F6 - Table header
  white: { r: 255, g: 255, b: 255 },
};

// Helper to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : COLORS.primary;
}

// Simplified logo loader - returns null on ANY error, never throws
async function tryLoadLogo(url: string): Promise<string | null> {
  if (!url) return null;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(url, { 
      signal: controller.signal,
      mode: 'cors',
      credentials: 'omit'
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) return null;
    
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return null;
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Legacy wrapper - will be replaced with context-aware formatting in generateInvoicePdf
let _currentCurrency: Currency = 'EUR';
let _swissRounding = false;

function formatCurrency(amount: number): string {
  return formatCurrencyDACH(amount, _currentCurrency, { swissRounding: _swissRounding });
}

// Parse invoice notes to extract line items
function parseLineItems(notes: string | null, totalAmount: number): { description: string; quantity: number; unitPrice: number; total: number; isBundle?: boolean }[] {
  if (!notes) {
    return [{ description: "Hufbearbeitung", quantity: 1, unitPrice: totalAmount, total: totalAmount }];
  }

  const items: { description: string; quantity: number; unitPrice: number; total: number; isBundle?: boolean }[] = [];
  const lines = notes.split('\n');
  
  let currentSection = '';
  let runningTotal = 0;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    // Check for section headers
    if (trimmedLine === 'Produkte:') {
      currentSection = 'products';
      continue;
    }
    
    // Parse product lines: "Product Name (2x) = €10.00"
    const productMatch = trimmedLine.match(/^(.+?)\s*\((\d+)x\)\s*=\s*€?([\d.,]+)$/);
    if (productMatch) {
      const [, name, qty, total] = productMatch;
      const quantity = parseInt(qty, 10);
      const totalPrice = parseFloat(total.replace(',', '.'));
      const unitPrice = totalPrice / quantity;
      items.push({
        description: name.trim(),
        quantity,
        unitPrice,
        total: totalPrice,
        isBundle: currentSection === 'bundles'
      });
      runningTotal += totalPrice;
      continue;
    }
    
    // Parse travel cost: "Anfahrt: 25 km (Hin- und Rückfahrt) = €25.00"
    const travelMatch = trimmedLine.match(/^Anfahrt:\s*(\d+)\s*km.*=\s*€?([\d.,]+)$/);
    if (travelMatch) {
      const [, km, total] = travelMatch;
      const totalPrice = parseFloat(total.replace(',', '.'));
      items.push({
        description: `Anfahrt (${km} km × 2)`,
        quantity: 1,
        unitPrice: totalPrice,
        total: totalPrice
      });
      runningTotal += totalPrice;
      continue;
    }
  }
  
  // If we couldn't parse anything, add a generic service line
  if (items.length === 0) {
    const cleanNotes = notes.replace(/\n/g, ' ').substring(0, 80);
    items.push({
      description: cleanNotes || "Hufbearbeitung",
      quantity: 1,
      unitPrice: totalAmount,
      total: totalAmount
    });
  } else {
    // Check if we need to add remaining amount as a service fee
    const remaining = totalAmount - runningTotal;
    if (remaining > 0.01) {
      items.unshift({
        description: "Hufbearbeitung / Dienstleistung",
        quantity: 1,
        unitPrice: remaining,
        total: remaining
      });
    }
  }
  
  return items;
}

export async function generateInvoicePdf(
  invoice: Invoice,
  clientProfile: ClientProfile | null,
  providerId: string
): Promise<Blob> {
  // Default settings
  let settings: BusinessSettings = {
    business_name: null,
    owner_name: null,
    address: null,
    phone: null,
    email: null,
    logo_url: null,
    primary_color: "#F47B20",
    tax_number: null,
    vat_id: null,
    iban: null,
    bic: null,
    bank_name: null,
  };
  
  // Try to fetch business settings
  try {
    const { data } = await supabase
      .from("business_settings")
      .select("*")
      .eq("user_id", providerId)
      .maybeSingle();
    
    if (data) {
      settings = {
        ...data,
        tax_country: (data.tax_country as TaxCountry) || 'DE',
        currency: (data.currency as Currency) || 'EUR',
      };
    }
  } catch {
    // Use defaults
  }
  
  // Set global currency context for formatCurrency helper
  const taxCountry = settings.tax_country || 'DE';
  const dachConfig = getDACHConfig(taxCountry);
  _currentCurrency = settings.currency || dachConfig.currency;
  _swissRounding = settings.swiss_rounding ?? false;
  const vatRate = settings.default_vat_rate ?? dachConfig.defaultVatRate;

  // Fetch customer VAT ID from contacts table (for B2B clients)
  let customerVatId: string | null = null;
  if (invoice.client_id) {
    try {
      const { data: contactData } = await supabase
        .from("contacts")
        .select("vat_id, is_business")
        .eq("profile_id", invoice.client_id)
        .eq("provider_id", providerId)
        .maybeSingle();
      
      if (contactData?.is_business && contactData?.vat_id) {
        customerVatId = contactData.vat_id;
      }
    } catch {
      // Customer VAT ID not available
    }
  }
  
  // Merge customer VAT ID into client profile for rendering
  const enrichedClientProfile = clientProfile 
    ? { ...clientProfile, vat_id: customerVatId } 
    : null;

  const brandColor = settings.primary_color ? hexToRgb(settings.primary_color) : COLORS.primary;
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // ============================================================================
  // HEADER SECTION - Logo left, "RECHNUNG" right
  // ============================================================================
  
  const headerHeight = 28;
  let logoLoaded = false;
  
  // Try to add logo (left side)
  if (settings.logo_url) {
    try {
      const logoBase64 = await tryLoadLogo(settings.logo_url);
      if (logoBase64) {
        const logoMaxWidth = 50;
        const logoMaxHeight = 24;
        let imageFormat: "PNG" | "JPEG" = "PNG";
        if (logoBase64.includes("data:image/jpeg") || logoBase64.includes("data:image/jpg")) {
          imageFormat = "JPEG";
        }
        doc.addImage(logoBase64, imageFormat, margin, yPos, logoMaxWidth, logoMaxHeight);
        logoLoaded = true;
      }
    } catch {
      // Skip logo on error
    }
  }
  
  // If no logo, show business name on left
  if (!logoLoaded && settings.business_name) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(COLORS.gray900.r, COLORS.gray900.g, COLORS.gray900.b);
    doc.text(settings.business_name, margin, yPos + 10);
  }
  
  // "RECHNUNG" title (right side, large)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(COLORS.gray900.r, COLORS.gray900.g, COLORS.gray900.b);
  doc.text("RECHNUNG", pageWidth - margin, yPos + 10, { align: "right" });
  
  yPos += headerHeight + 8;

  // ============================================================================
  // META-DATA GRID - Invoice info on the right
  // ============================================================================
  
  const invoiceNumber = invoice.invoice_number || `INV-${invoice.id.slice(0, 8).toUpperCase()}`;
  const issueDate = format(new Date(invoice.issue_date), "dd.MM.yyyy", { locale: de });
  const dueDate = invoice.due_date
    ? format(new Date(invoice.due_date), "dd.MM.yyyy", { locale: de })
    : null;
  const customerNumber = enrichedClientProfile?.readable_id || "-";

  // Meta data box (right side)
  const metaBoxX = pageWidth - margin - 70;
  const metaBoxWidth = 70;
  
  doc.setFillColor(COLORS.gray100.r, COLORS.gray100.g, COLORS.gray100.b);
  doc.roundedRect(metaBoxX, yPos, metaBoxWidth, dueDate ? 40 : 32, 2, 2, 'F');
  
  doc.setFontSize(8);
  doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
  doc.setFont("helvetica", "normal");
  
  let metaY = yPos + 7;
  
  doc.text("Rechnungs-Nr.", metaBoxX + 4, metaY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.gray900.r, COLORS.gray900.g, COLORS.gray900.b);
  doc.text(invoiceNumber, metaBoxX + metaBoxWidth - 4, metaY, { align: "right" });
  
  metaY += 8;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
  doc.text("Datum", metaBoxX + 4, metaY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.gray900.r, COLORS.gray900.g, COLORS.gray900.b);
  doc.text(issueDate, metaBoxX + metaBoxWidth - 4, metaY, { align: "right" });
  
  metaY += 8;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
  doc.text("Kunden-Nr.", metaBoxX + 4, metaY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.gray900.r, COLORS.gray900.g, COLORS.gray900.b);
  doc.text(customerNumber, metaBoxX + metaBoxWidth - 4, metaY, { align: "right" });
  
  if (dueDate) {
    metaY += 8;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
    doc.text("Fällig bis", metaBoxX + 4, metaY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(brandColor.r, brandColor.g, brandColor.b);
    doc.text(dueDate, metaBoxX + metaBoxWidth - 4, metaY, { align: "right" });
  }

  // ============================================================================
  // ADDRESS FIELD - DIN 5008 style for window envelopes
  // ============================================================================
  
  // Sender line (small, above recipient)
  doc.setFontSize(7);
  doc.setTextColor(COLORS.gray400.r, COLORS.gray400.g, COLORS.gray400.b);
  doc.setFont("helvetica", "normal");
  
  const senderLine = [settings.business_name, settings.address?.split("\n")[0]?.trim()]
    .filter(Boolean)
    .join(" · ");
  doc.text(senderLine, margin, yPos + 2);
  
  // Recipient address
  const addressY = yPos + 8;
  doc.setFontSize(10);
  doc.setTextColor(COLORS.gray900.r, COLORS.gray900.g, COLORS.gray900.b);
  doc.setFont("helvetica", "bold");
  
  const clientName = enrichedClientProfile?.full_name || "Kunde";
  doc.text(clientName, margin, addressY);
  
  doc.setFont("helvetica", "normal");
  let addrY = addressY + 5;
  
  if (enrichedClientProfile?.stable_street) {
    doc.text(enrichedClientProfile.stable_street, margin, addrY);
    addrY += 4.5;
  }
  
  const clientCityLine = [
    enrichedClientProfile?.stable_zip || enrichedClientProfile?.zip_code,
    enrichedClientProfile?.stable_city || enrichedClientProfile?.city,
  ]
    .filter(Boolean)
    .join(" ");
  if (clientCityLine) {
    doc.text(clientCityLine, margin, addrY);
    addrY += 4.5;
  }
  
  // Customer VAT ID for B2B clients
  if (enrichedClientProfile?.vat_id) {
    addrY += 2;
    doc.setFontSize(8);
    doc.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);
    doc.text(`Ihre USt-IdNr.: ${enrichedClientProfile.vat_id}`, margin, addrY);
    doc.setFontSize(10);
    doc.setTextColor(COLORS.gray900.r, COLORS.gray900.g, COLORS.gray900.b);
    addrY += 4.5;
  }

  yPos = Math.max(yPos + 50, addrY + 10);

  // Horse reference if available
  if (invoice.horse?.name) {
    doc.setFontSize(9);
    doc.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);
    doc.text(`Betreff: Leistungen für ${invoice.horse.name}`, margin, yPos);
    yPos += 10;
  }

  yPos += 5;

  // ============================================================================
  // ITEM TABLE - Clean, modern design
  // ============================================================================
  
  const lineItems = parseLineItems(invoice.notes, invoice.total_amount);
  
  const tableBody = lineItems.map((item, index) => [
    (index + 1).toString(),
    item.description,
    item.quantity.toString(),
    formatCurrency(item.unitPrice),
    formatCurrency(item.total)
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["Pos.", "Beschreibung", "Menge", "Einzelpreis", "Gesamt"]],
    body: tableBody,
    theme: "plain",
    styles: {
      fontSize: 9,
      cellPadding: { top: 4, right: 6, bottom: 4, left: 6 },
      textColor: [COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b],
      lineColor: [COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [COLORS.gray100.r, COLORS.gray100.g, COLORS.gray100.b],
      textColor: [COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b],
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: {
      fillColor: [COLORS.white.r, COLORS.white.g, COLORS.white.b],
    },
    alternateRowStyles: {
      fillColor: [COLORS.white.r, COLORS.white.g, COLORS.white.b],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 18, halign: "center" },
      3: { cellWidth: 28, halign: "right" },
      4: { cellWidth: 28, halign: "right" },
    },
    margin: { left: margin, right: margin },
    tableLineColor: [COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b],
    tableLineWidth: 0.1,
    didDrawCell: (data) => {
      // Add bottom border to each row
      if (data.section === 'body') {
        doc.setDrawColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
        doc.setLineWidth(0.1);
        doc.line(
          data.cell.x,
          data.cell.y + data.cell.height,
          data.cell.x + data.cell.width,
          data.cell.y + data.cell.height
        );
      }
    },
  });

  // @ts-expect-error jspdf-autotable types
  yPos = doc.lastAutoTable.finalY + 8;

  // ============================================================================
  // TOTAL SECTION - Clean summary with brand accent
  // ============================================================================
  
  const totalBoxWidth = 80;
  const totalBoxX = pageWidth - margin - totalBoxWidth;
  
  // Subtotal line
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);
  
  const isGewerbe = invoice.customer_type === "gewerbe";
  const isKleinunternehmer = invoice.customer_type === "kleinunternehmer" || vatRate === 0;
  
  // Apply Swiss rounding if enabled
  let finalAmount = invoice.total_amount;
  if (_swissRounding && _currentCurrency === 'CHF') {
    finalAmount = applySwissRounding(finalAmount);
  }
  
  if (isKleinunternehmer) {
    // Kleinunternehmer: Keine MwSt.
    doc.text("Betrag:", totalBoxX, yPos);
    doc.text(formatCurrency(finalAmount), pageWidth - margin, yPos, { align: "right" });
    
    yPos += 5;
    
    doc.setFontSize(8);
    doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
    doc.text(dachConfig.vatExemptLabel, totalBoxX, yPos);
  } else if (isGewerbe) {
    // Gewerbekunde: Netto-Rechnung
    doc.text("Nettobetrag:", totalBoxX, yPos);
    doc.text(formatCurrency(finalAmount), pageWidth - margin, yPos, { align: "right" });
    
    yPos += 5;
    
    doc.text(`${dachConfig.vatLabel}:`, totalBoxX, yPos);
    doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
    doc.text("nicht ausgewiesen (Reverse Charge)", pageWidth - margin, yPos, { align: "right" });
  } else {
    // Privatkunde: Brutto mit MwSt - use actual VAT rate from settings
    const { netAmount, vatAmount } = calculateVatFromGross(finalAmount, vatRate);
    
    doc.text("Nettobetrag:", totalBoxX, yPos);
    doc.text(formatCurrency(netAmount), pageWidth - margin, yPos, { align: "right" });
    
    yPos += 5;
    
    // Use country-specific VAT label
    doc.text(`${dachConfig.vatLabel} (${vatRate}%):`, totalBoxX, yPos);
    doc.text(formatCurrency(vatAmount), pageWidth - margin, yPos, { align: "right" });
  }
  
  yPos += 8;
  
  // Total line with brand color accent
  doc.setFillColor(brandColor.r, brandColor.g, brandColor.b);
  doc.roundedRect(totalBoxX - 4, yPos - 4, totalBoxWidth + 4, 14, 2, 2, 'F');
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
  
  let totalLabel = "Gesamtbetrag:";
  if (isGewerbe) totalLabel = "Gesamtbetrag (Netto):";
  if (isKleinunternehmer) totalLabel = "Rechnungsbetrag:";
  
  doc.text(totalLabel, totalBoxX, yPos + 5);
  doc.text(formatCurrency(finalAmount), pageWidth - margin - 2, yPos + 5, { align: "right" });

  yPos += 25;

  // ============================================================================
  // SIGNATURE SECTION - If signature is available
  // ============================================================================
  
  if (invoice.signature_url) {
    try {
      const signatureBase64 = await tryLoadLogo(invoice.signature_url);
      if (signatureBase64) {
        // Add separator line
        doc.setDrawColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
        doc.setLineWidth(0.3);
        doc.line(margin, yPos, margin + 80, yPos);
        
        yPos += 3;
        
        // Add signature image
        const sigWidth = 60;
        const sigHeight = 25;
        
        let imageFormat: "PNG" | "JPEG" = "PNG";
        if (signatureBase64.includes("data:image/jpeg") || signatureBase64.includes("data:image/jpg")) {
          imageFormat = "JPEG";
        }
        
        doc.addImage(signatureBase64, imageFormat, margin, yPos, sigWidth, sigHeight);
        
        yPos += sigHeight + 3;
        
        // Add signature label and legal text
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
        doc.text("Kundenunterschrift", margin, yPos);
        
        yPos += 4;
        
        doc.setFontSize(7);
        doc.setTextColor(COLORS.gray400.r, COLORS.gray400.g, COLORS.gray400.b);
        doc.text("Hiermit bestätige ich die ordnungsgemäße Durchführung der Arbeiten.", margin, yPos);
        
        yPos += 10;
      }
    } catch {
      // Skip signature on error
    }
  }

  // ============================================================================
  // PAYMENT INFO - Friendly note
  // ============================================================================
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);
  
  const paymentNote = dueDate 
    ? `Bitte überweisen Sie den Betrag bis zum ${format(new Date(invoice.due_date!), "dd.MM.yyyy")} unter Angabe der Rechnungsnummer.`
    : "Bitte überweisen Sie den Betrag unter Angabe der Rechnungsnummer.";
  
  doc.text(paymentNote, margin, yPos);
  yPos += 6;
  
  // Show payment method if available (for paid invoices)
  if (invoice.payment_method) {
    doc.setFont("helvetica", "bold");
    doc.text(`Zahlart: ${invoice.payment_method}`, margin, yPos);
    yPos += 6;
    doc.setFont("helvetica", "normal");
  }
  
  doc.text("Vielen Dank für Ihr Vertrauen!", margin, yPos);

  // ============================================================================
  // FOOTER - 3-Column Layout (Contact, Bank, Legal)
  // ============================================================================
  
  // Calculate footer height based on content (extra space for tax IDs)
  const hasVatId = !!settings.vat_id;
  const hasTaxNumber = !!settings.tax_number;
  const footerHeight = 30 + (hasVatId && hasTaxNumber ? 4 : 0);
  const footerY = pageHeight - footerHeight - 10;
  const colWidth = contentWidth / 3;
  
  // Footer separator line
  doc.setDrawColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  
  doc.setFontSize(7);
  doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
  
  // Column 1: Contact Info
  let col1Y = footerY;
  doc.setFont("helvetica", "bold");
  doc.text("Kontakt", margin, col1Y);
  col1Y += 4;
  doc.setFont("helvetica", "normal");
  
  if (settings.business_name) {
    doc.text(settings.business_name, margin, col1Y);
    col1Y += 3.5;
  }
  if (settings.address) {
    const addressLines = settings.address.split('\n').slice(0, 2);
    addressLines.forEach(line => {
      doc.text(line.trim(), margin, col1Y);
      col1Y += 3.5;
    });
  }
  if (settings.phone) {
    doc.text(`Tel: ${settings.phone}`, margin, col1Y);
    col1Y += 3.5;
  }
  if (settings.email) {
    doc.text(settings.email, margin, col1Y);
  }
  
  // Column 2: Bank Details
  const col2X = margin + colWidth;
  let col2Y = footerY;
  doc.setFont("helvetica", "bold");
  doc.text("Bankverbindung", col2X, col2Y);
  col2Y += 4;
  doc.setFont("helvetica", "normal");
  
  if (settings.bank_name) {
    doc.text(settings.bank_name, col2X, col2Y);
    col2Y += 3.5;
  }
  if (settings.iban) {
    doc.text(`IBAN: ${settings.iban}`, col2X, col2Y);
    col2Y += 3.5;
  }
  if (settings.bic) {
    doc.text(`BIC: ${settings.bic}`, col2X, col2Y);
    col2Y += 3.5;
  }
  if (!settings.iban && !settings.bic && !settings.bank_name) {
    doc.text("Bitte bei Überweisung angeben:", col2X, col2Y);
    col2Y += 3.5;
    doc.text(`Ref: ${invoiceNumber}`, col2X, col2Y);
  }
  
  // Column 3: Legal Info
  const col3X = margin + colWidth * 2;
  let col3Y = footerY;
  doc.setFont("helvetica", "bold");
  doc.text("Rechtliches", col3X, col3Y);
  col3Y += 4;
  doc.setFont("helvetica", "normal");
  
  if (settings.owner_name) {
    doc.text(`Inhaber: ${settings.owner_name}`, col3X, col3Y);
    col3Y += 3.5;
  }
  if (settings.vat_id) {
    doc.text(`USt-IdNr.: ${settings.vat_id}`, col3X, col3Y);
    col3Y += 3.5;
  }
  if (settings.tax_number) {
    doc.text(`St.-Nr.: ${settings.tax_number}`, col3X, col3Y);
    col3Y += 3.5;
  }
  
  // Page number (bottom center)
  doc.setFontSize(7);
  doc.setTextColor(COLORS.gray400.r, COLORS.gray400.g, COLORS.gray400.b);
  doc.text("Seite 1 von 1", pageWidth / 2, pageHeight - 8, { align: "center" });

  // ============================================================================
  // SWISS QR-BILL - Add QR payment slip for Swiss invoices
  // ============================================================================
  if (taxCountry === 'CH' && settings.iban) {
    try {
      // Parse creditor address
      const addressParts = (settings.address || "").split("\n").map(l => l.trim()).filter(Boolean);
      const creditorStreet = addressParts[0] || "";
      const creditorCityLine = addressParts[1] || "";
      const creditorZipMatch = creditorCityLine.match(/^(\d{4})\s+(.+)$/);

      // Parse debtor address
      const debtorStreet = enrichedClientProfile?.stable_street || "";
      const debtorZip = enrichedClientProfile?.stable_zip || enrichedClientProfile?.zip_code || "";
      const debtorCity = enrichedClientProfile?.stable_city || enrichedClientProfile?.city || "";

      // Add a second page for the QR-Bill
      doc.addPage();

      await addSwissQrBillToInvoice(doc, {
        creditorName: settings.business_name || settings.owner_name || "Hufbearbeitung",
        creditorStreet,
        creditorZip: creditorZipMatch?.[1] || "",
        creditorCity: creditorZipMatch?.[2] || "",
        creditorCountry: "CH",
        iban: settings.iban,
        amount: finalAmount,
        currency: (_currentCurrency as "CHF" | "EUR") || "CHF",
        debtorName: enrichedClientProfile?.full_name || undefined,
        debtorStreet: debtorStreet || undefined,
        debtorZip: debtorZip || undefined,
        debtorCity: debtorCity || undefined,
        debtorCountry: "CH",
        referenceType: "NON",
        additionalInfo: invoiceNumber,
      });

      // Update page count
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(COLORS.gray400.r, COLORS.gray400.g, COLORS.gray400.b);
        // Only show page numbers on non-QR pages
        if (i < totalPages) {
          doc.text(`Seite ${i} von ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: "center" });
        }
      }
    } catch (err) {
      console.error("Swiss QR-Bill generation failed:", err);
      // Continue without QR bill - invoice is still valid
    }
  }

  return doc.output("blob");
}
