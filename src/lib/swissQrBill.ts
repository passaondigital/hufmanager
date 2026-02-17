/**
 * Swiss QR-Bill Generator
 * 
 * Generates the QR payment slip section for Swiss invoices
 * according to the Swiss Implementation Guidelines for QR-bills (v2.3).
 * 
 * Reference: https://www.paymentstandards.ch/dam/downloads/ig-qr-bill-en.pdf
 */

import QRCode from "qrcode";
import jsPDF from "jspdf";

interface SwissQrBillData {
  // Creditor (Zahlungsempfänger)
  creditorName: string;
  creditorStreet?: string;
  creditorZip?: string;
  creditorCity?: string;
  creditorCountry?: string; // default CH
  iban: string;

  // Amount
  amount: number;
  currency: "CHF" | "EUR";

  // Debtor (Zahlungspflichtiger) - optional
  debtorName?: string;
  debtorStreet?: string;
  debtorZip?: string;
  debtorCity?: string;
  debtorCountry?: string;

  // Reference
  referenceType?: "QRR" | "SCOR" | "NON";
  reference?: string;

  // Additional info
  additionalInfo?: string; // e.g. invoice number
}

/**
 * Format IBAN for display (groups of 4)
 */
function formatIban(iban: string): string {
  const clean = iban.replace(/\s/g, "");
  return clean.replace(/(.{4})/g, "$1 ").trim();
}

/**
 * Format amount for display (Swiss standard: 1'234.56)
 */
function formatSwissAmount(amount: number): string {
  return amount.toLocaleString("de-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Build the SPC (Swiss Payments Code) data string for the QR code
 */
function buildSpcData(data: SwissQrBillData): string {
  const lines: string[] = [];

  // Header
  lines.push("SPC");           // QR Type
  lines.push("0200");          // Version
  lines.push("1");             // Coding Type (UTF-8)

  // Creditor Account (IBAN)
  lines.push(data.iban.replace(/\s/g, ""));

  // Creditor (Combined address type "K")
  lines.push("K"); // Address type: K = Combined
  lines.push(data.creditorName.substring(0, 70));
  const addressLine1 = data.creditorStreet || "";
  const addressLine2 = [data.creditorZip, data.creditorCity].filter(Boolean).join(" ");
  lines.push(addressLine1.substring(0, 70));
  lines.push(addressLine2.substring(0, 70));
  lines.push(""); // Postal code (empty for type K)
  lines.push(""); // City (empty for type K)
  lines.push(data.creditorCountry || "CH");

  // Ultimate Creditor (not used, 7 empty fields)
  lines.push(""); // Address type
  lines.push(""); // Name
  lines.push(""); // Street
  lines.push(""); // Building
  lines.push(""); // Postal code
  lines.push(""); // City
  lines.push(""); // Country

  // Payment Amount
  lines.push(data.amount.toFixed(2));
  lines.push(data.currency);

  // Ultimate Debtor
  if (data.debtorName) {
    lines.push("K"); // Address type
    lines.push(data.debtorName.substring(0, 70));
    const debtorAddr1 = data.debtorStreet || "";
    const debtorAddr2 = [data.debtorZip, data.debtorCity].filter(Boolean).join(" ");
    lines.push(debtorAddr1.substring(0, 70));
    lines.push(debtorAddr2.substring(0, 70));
    lines.push(""); // Postal code (empty for type K)
    lines.push(""); // City (empty for type K)
    lines.push(data.debtorCountry || "CH");
  } else {
    lines.push(""); // Address type
    lines.push(""); // Name
    lines.push(""); // Street
    lines.push(""); // Building
    lines.push(""); // Postal code
    lines.push(""); // City
    lines.push(""); // Country
  }

  // Reference
  lines.push(data.referenceType || "NON");
  lines.push(data.reference || "");

  // Additional information
  lines.push(data.additionalInfo || "");

  // Trailer
  lines.push("EPD");

  return lines.join("\n");
}

/**
 * Generate the QR code as a data URL
 */
async function generateQrCodeDataUrl(spcData: string): Promise<string> {
  return QRCode.toDataURL(spcData, {
    errorCorrectionLevel: "M",
    margin: 0,
    width: 400,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

// Swiss Cross SVG path for overlay on QR code
const SWISS_CROSS_SIZE = 7; // mm in the PDF

/**
 * Draw the Swiss QR-Bill payment slip on the invoice PDF.
 * This adds a new page or draws at the bottom of the current page.
 */
export async function addSwissQrBillToInvoice(
  doc: jsPDF,
  data: SwissQrBillData
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // QR-Bill dimensions (according to spec)
  const billHeight = 105; // mm
  const receiptWidth = 62; // mm
  const paymentPartWidth = pageWidth - receiptWidth;
  const billY = pageHeight - billHeight;

  // Perforation line (dashed)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(0, billY, pageWidth, billY);
  // Vertical perforation between receipt and payment part
  doc.line(receiptWidth, billY, receiptWidth, pageHeight);
  doc.setLineDashPattern([], 0);

  // Scissors icon (✂) at perforation
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text("✂", 2, billY - 1);
  doc.text("✂", receiptWidth - 4, billY + billHeight / 2, { angle: 90 });

  // ========== EMPFANGSSCHEIN (Receipt - left part) ==========
  const rMargin = 5;
  let rY = billY + 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Empfangsschein", rMargin, rY);
  rY += 7;

  // Konto / Zahlbar an
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.text("Konto / Zahlbar an", rMargin, rY);
  rY += 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(formatIban(data.iban), rMargin, rY);
  rY += 3.5;
  doc.text(data.creditorName, rMargin, rY);
  rY += 3.5;
  if (data.creditorStreet) {
    doc.text(data.creditorStreet, rMargin, rY);
    rY += 3.5;
  }
  const creditorCityLine = [data.creditorZip, data.creditorCity].filter(Boolean).join(" ");
  if (creditorCityLine) {
    doc.text(creditorCityLine, rMargin, rY);
    rY += 3.5;
  }

  // Reference
  if (data.reference) {
    rY += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.text("Referenz", rMargin, rY);
    rY += 3;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(data.reference, rMargin, rY);
    rY += 3.5;
  }

  // Zahlbar durch
  if (data.debtorName) {
    rY += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.text("Zahlbar durch", rMargin, rY);
    rY += 3;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(data.debtorName, rMargin, rY);
    rY += 3.5;
    if (data.debtorStreet) {
      doc.text(data.debtorStreet, rMargin, rY);
      rY += 3.5;
    }
    const debtorCityLine = [data.debtorZip, data.debtorCity].filter(Boolean).join(" ");
    if (debtorCityLine) {
      doc.text(debtorCityLine, rMargin, rY);
      rY += 3.5;
    }
  } else {
    rY += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.text("Zahlbar durch (Name/Adresse)", rMargin, rY);
    rY += 3;
    // Empty box for handwriting
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.rect(rMargin, rY, receiptWidth - rMargin * 2, 20);
    rY += 22;
  }

  // Amount on receipt
  const amountY = pageHeight - 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.text("Währung", rMargin, amountY);
  doc.text("Betrag", rMargin + 18, amountY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(data.currency, rMargin, amountY + 4);
  doc.text(formatSwissAmount(data.amount), rMargin + 18, amountY + 4);

  // Annahmestelle
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.text("Annahmestelle", receiptWidth - rMargin, amountY + 4, { align: "right" });

  // ========== ZAHLTEIL (Payment part - right side) ==========
  const pMargin = receiptWidth + 5;
  let pY = billY + 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Zahlteil", pMargin, pY);
  pY += 7;

  // QR Code
  try {
    const spcData = buildSpcData(data);
    const qrDataUrl = await generateQrCodeDataUrl(spcData);
    
    const qrSize = 46; // mm (spec: 46x46mm)
    const qrX = pMargin;
    const qrY = pY;
    
    doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

    // Swiss Cross overlay in center of QR
    const crossX = qrX + (qrSize - SWISS_CROSS_SIZE) / 2;
    const crossY = qrY + (qrSize - SWISS_CROSS_SIZE) / 2;
    
    // White background
    doc.setFillColor(255, 255, 255);
    doc.rect(crossX, crossY, SWISS_CROSS_SIZE, SWISS_CROSS_SIZE, "F");
    
    // Black border
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.rect(crossX, crossY, SWISS_CROSS_SIZE, SWISS_CROSS_SIZE, "S");
    
    // Red cross
    doc.setFillColor(255, 0, 0);
    const crossPadding = 1;
    const innerSize = SWISS_CROSS_SIZE - crossPadding * 2;
    doc.rect(crossX + crossPadding, crossY + crossPadding, innerSize, innerSize, "F");
    
    // White cross arms
    doc.setFillColor(255, 255, 255);
    const armWidth = innerSize * 0.2;
    const armLength = innerSize * 0.6;
    const centerX = crossX + SWISS_CROSS_SIZE / 2;
    const centerY = crossY + SWISS_CROSS_SIZE / 2;
    // Horizontal arm
    doc.rect(centerX - armLength / 2, centerY - armWidth / 2, armLength, armWidth, "F");
    // Vertical arm
    doc.rect(centerX - armWidth / 2, centerY - armLength / 2, armWidth, armLength, "F");

    pY += qrSize + 5;
  } catch (err) {
    console.error("QR code generation failed:", err);
    pY += 50;
  }

  // Amount on payment part
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Währung", pMargin, pY);
  doc.text("Betrag", pMargin + 22, pY);
  pY += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(data.currency, pMargin, pY);
  doc.text(formatSwissAmount(data.amount), pMargin + 22, pY);

  // Right column: text info
  const infoX = pMargin + 56;
  let infoY = billY + 12;

  // Konto / Zahlbar an
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Konto / Zahlbar an", infoX, infoY);
  infoY += 3.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(formatIban(data.iban), infoX, infoY);
  infoY += 4;
  doc.text(data.creditorName, infoX, infoY);
  infoY += 4;
  if (data.creditorStreet) {
    doc.text(data.creditorStreet, infoX, infoY);
    infoY += 4;
  }
  if (creditorCityLine) {
    doc.text(creditorCityLine, infoX, infoY);
    infoY += 4;
  }

  // Reference
  if (data.reference) {
    infoY += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("Referenz", infoX, infoY);
    infoY += 3.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(data.reference, infoX, infoY);
    infoY += 4;
  }

  // Additional info
  if (data.additionalInfo) {
    infoY += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("Zusätzliche Informationen", infoX, infoY);
    infoY += 3.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(data.additionalInfo.substring(0, 60), infoX, infoY);
    infoY += 4;
  }

  // Zahlbar durch
  if (data.debtorName) {
    infoY += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("Zahlbar durch", infoX, infoY);
    infoY += 3.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(data.debtorName, infoX, infoY);
    infoY += 4;
    if (data.debtorStreet) {
      doc.text(data.debtorStreet, infoX, infoY);
      infoY += 4;
    }
    const debtorCityLine = [data.debtorZip, data.debtorCity].filter(Boolean).join(" ");
    if (debtorCityLine) {
      doc.text(debtorCityLine, infoX, infoY);
    }
  }
}
