import jsPDF from "jspdf";
import "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface BusinessSettings {
  business_name: string | null;
  owner_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  primary_color: string | null;
  tax_number: string | null;
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
}

interface Invoice {
  id: string;
  invoice_number: string | null;
  issue_date: string;
  due_date: string | null;
  total_amount: number;
  status: string | null;
  notes: string | null;
  horse?: { name: string } | null;
}

// Helper to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 217, g: 119, b: 6 }; // Default amber color
}

// Simplified logo loader - returns null on ANY error, never throws
async function tryLoadLogo(url: string): Promise<string | null> {
  if (!url) return null;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
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
    return null; // Silently fail, no logo
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
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
    primary_color: "#d97706",
    tax_number: null,
  };
  
  // Try to fetch business settings (non-blocking on error)
  try {
    const { data } = await supabase
      .from("business_settings")
      .select("*")
      .eq("user_id", providerId)
      .single();
    
    if (data) settings = data;
  } catch {
    // Use defaults
  }

  const primaryColor = hexToRgb(settings.primary_color || "#d97706");
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = margin;

  // ============ HEADER SECTION ============
  // Try to add logo (completely optional, never crashes)
  let logoHeight = 0;
  if (settings.logo_url) {
    try {
      const logoBase64 = await tryLoadLogo(settings.logo_url);
      if (logoBase64) {
        const logoWidth = 40;
        logoHeight = 20;
        let imageFormat: "PNG" | "JPEG" = "PNG";
        if (logoBase64.includes("data:image/jpeg") || logoBase64.includes("data:image/jpg")) {
          imageFormat = "JPEG";
        }
        doc.addImage(logoBase64, imageFormat, margin, yPos, logoWidth, logoHeight);
      }
    } catch {
      logoHeight = 0; // Skip logo on any error
    }
  }

  // Business info (right side)
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  
  const businessInfoX = pageWidth - margin;
  let businessY = yPos;
  
  if (settings.business_name) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text(settings.business_name, businessInfoX, businessY, { align: "right" });
    businessY += 5;
  }
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  
  if (settings.owner_name) {
    doc.text(settings.owner_name, businessInfoX, businessY, { align: "right" });
    businessY += 4;
  }
  if (settings.address) {
    const addressLines = settings.address.split("\n");
    addressLines.forEach((line) => {
      doc.text(line.trim(), businessInfoX, businessY, { align: "right" });
      businessY += 4;
    });
  }
  if (settings.phone) {
    doc.text(`Tel: ${settings.phone}`, businessInfoX, businessY, { align: "right" });
    businessY += 4;
  }
  if (settings.email) {
    doc.text(settings.email, businessInfoX, businessY, { align: "right" });
    businessY += 4;
  }
  if (settings.tax_number) {
    doc.text(`Steuernummer: ${settings.tax_number}`, businessInfoX, businessY, { align: "right" });
    businessY += 4;
  }

  yPos = Math.max(yPos + logoHeight + 10, businessY + 5);

  // Divider line
  doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 15;

  // ============ CLIENT ADDRESS SECTION ============
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  
  const senderLine = [settings.business_name, settings.address?.split("\n")[0]]
    .filter(Boolean)
    .join(" • ");
  doc.text(senderLine, margin, yPos);
  yPos += 8;

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  
  const clientName = clientProfile?.full_name || "Kunde";
  doc.text(clientName, margin, yPos);
  yPos += 5;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  if (clientProfile?.stable_street) {
    doc.text(clientProfile.stable_street, margin, yPos);
    yPos += 4;
  }
  
  const clientCityLine = [
    clientProfile?.stable_zip || clientProfile?.zip_code,
    clientProfile?.stable_city || clientProfile?.city,
  ]
    .filter(Boolean)
    .join(" ");
  if (clientCityLine) {
    doc.text(clientCityLine, margin, yPos);
    yPos += 4;
  }

  yPos += 15;

  // ============ INVOICE TITLE ============
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text("RECHNUNG", margin, yPos);
  yPos += 10;

  // Invoice metadata
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "normal");

  const invoiceNumber = invoice.invoice_number || invoice.id.slice(0, 8).toUpperCase();
  const issueDate = format(new Date(invoice.issue_date), "dd. MMMM yyyy", { locale: de });
  const dueDate = invoice.due_date
    ? format(new Date(invoice.due_date), "dd. MMMM yyyy", { locale: de })
    : null;

  doc.text(`Rechnungsnummer: ${invoiceNumber}`, margin, yPos);
  yPos += 5;
  doc.text(`Rechnungsdatum: ${issueDate}`, margin, yPos);
  yPos += 5;
  if (dueDate) {
    doc.text(`Fällig bis: ${dueDate}`, margin, yPos);
    yPos += 5;
  }
  if (invoice.horse?.name) {
    doc.text(`Pferd: ${invoice.horse.name}`, margin, yPos);
    yPos += 5;
  }

  yPos += 10;

  // ============ TABLE ============
  const tableData = [
    ["Leistungsbeschreibung", "Betrag"],
    [invoice.notes || "Hufbearbeitung", formatCurrency(invoice.total_amount)],
  ];

  // @ts-expect-error jspdf-autotable types
  doc.autoTable({
    startY: yPos,
    head: [tableData[0]],
    body: [tableData[1]],
    theme: "plain",
    headStyles: {
      fillColor: [primaryColor.r, primaryColor.g, primaryColor.b],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 10,
    },
    columnStyles: {
      0: { cellWidth: pageWidth - margin * 2 - 40 },
      1: { cellWidth: 40, halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  // @ts-expect-error jspdf-autotable types
  yPos = doc.lastAutoTable.finalY + 10;

  // ============ TOTAL ============
  doc.setDrawColor(200, 200, 200);
  doc.line(pageWidth - margin - 80, yPos, pageWidth - margin, yPos);
  yPos += 8;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Gesamtbetrag:", pageWidth - margin - 80, yPos);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text(formatCurrency(invoice.total_amount), pageWidth - margin, yPos, { align: "right" });

  yPos += 20;

  // ============ PAYMENT INFO ============
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Bitte überweisen Sie den Betrag unter Angabe der Rechnungsnummer.", margin, yPos);
  yPos += 5;
  doc.text("Vielen Dank für Ihr Vertrauen!", margin, yPos);

  // ============ FOOTER ============
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  const footerText = [settings.business_name, settings.email, settings.phone]
    .filter(Boolean)
    .join(" | ");
  doc.text(footerText, pageWidth / 2, footerY, { align: "center" });

  return doc.output("blob");
}
