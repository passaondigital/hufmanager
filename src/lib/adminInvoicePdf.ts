import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface IssuerData {
  name: string;
  company: string;
  address: string;
  email: string;
  phone: string;
  iban: string;
  bic: string;
  account_holder: string;
  tax_note: string;
  tax_id: string;
}

export interface AdminInvoiceData {
  invoiceNumber: string;
  invoiceDate: string; // DD.MM.YYYY
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  providerName: string;
  providerEmail: string;
  providerAddress: string;
  providerPid: string;
  items: {
    position: number;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  notes?: string;
  issuer?: IssuerData;
}

const DEFAULT_ISSUER: IssuerData = {
  name: "Pascal Christian Schmid",
  company: "HufManager",
  address: "Pascal Schmid c/o Postflex #10643, Emsdettener Str. 10, 48268 Greven",
  email: "support@hufiapp.de",
  phone: "0152 0900 7017",
  iban: "DE66 2020 2080 0002 8383 704",
  bic: "SXPYDEHH",
  account_holder: "Pascal Christian Schmid",
  tax_note: "Gemäß §19 UStG wird keine Umsatzsteuer berechnet und ausgewiesen.",
  tax_id: "",
};

const formatCurrency = (val: number) =>
  val.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export function generateAdminInvoicePdf(data: AdminInvoiceData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;
  const issuer = data.issuer || DEFAULT_ISSUER;

  // ── Header Left: Company ──
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(issuer.company, margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`${issuer.email} | ${issuer.phone}`, margin, y);
  y += 4;
  // Only show tax_id if provided
  if (issuer.tax_id) {
    doc.text(`Steuernummer: ${issuer.tax_id}`, margin, y);
  }
  doc.setTextColor(0);

  // ── Header Right: RECHNUNG ──
  const rightX = pageWidth - margin;
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("RECHNUNG", rightX, 20, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Nr: ${data.invoiceNumber}`, rightX, 30, { align: "right" });
  doc.text(`Datum: ${data.invoiceDate}`, rightX, 35, { align: "right" });
  doc.text(`Zahlungsziel: ${data.dueDate}`, rightX, 40, { align: "right" });
  doc.text(`Zeitraum: ${data.periodStart} – ${data.periodEnd}`, rightX, 45, { align: "right" });

  // ── Absender (klein) ──
  y = 55;
  doc.setFontSize(7);
  doc.setTextColor(140);
  doc.text(`${issuer.name} · ${issuer.address}`, margin, y);
  doc.setTextColor(0);

  // ── Empfänger ──
  y = 62;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("Empfänger:", margin, y);
  doc.setTextColor(0);
  y += 5;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(data.providerName, margin, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  if (data.providerAddress) {
    const addrLines = data.providerAddress.split("\n");
    addrLines.forEach((line) => {
      doc.text(line.trim(), margin, y);
      y += 4;
    });
  }
  doc.text(data.providerEmail, margin, y);
  y += 4;
  doc.text(`Provider-ID: ${data.providerPid}`, margin, y);
  y += 10;

  // ── Positionen-Tabelle ──
  autoTable(doc, {
    startY: y,
    head: [["Pos", "Beschreibung", "Menge", "Einheit", "Einzelpreis", "Gesamt"]],
    body: data.items.map((item) => [
      item.position.toString(),
      item.description,
      item.quantity.toLocaleString("de-DE"),
      item.unit,
      formatCurrency(item.unitPrice),
      formatCurrency(item.total),
    ]),
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: {
      fillColor: [41, 37, 36],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      2: { cellWidth: 16, halign: "right" },
      3: { cellWidth: 18 },
      4: { cellWidth: 28, halign: "right" },
      5: { cellWidth: 28, halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  // @ts-ignore - autoTable adds this
  y = doc.lastAutoTable.finalY + 8;

  // ── Summen-Block (rechts) ──
  const sumX = pageWidth - margin - 70;
  doc.setFontSize(9);
  doc.text("Zwischensumme:", sumX, y);
  doc.text(formatCurrency(data.subtotal), rightX, y, { align: "right" });
  y += 5;

  if (data.discount > 0) {
    doc.text("Rabatt:", sumX, y);
    doc.text(`-${formatCurrency(data.discount)}`, rightX, y, { align: "right" });
    y += 5;
  }

  doc.setDrawColor(180);
  doc.line(sumX, y, rightX, y);
  y += 5;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Gesamtbetrag:", sumX, y);
  doc.text(formatCurrency(data.total), rightX, y, { align: "right" });
  y += 10;

  // ── §19 UStG Hinweis ──
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100);
  doc.text(issuer.tax_note, margin, y);
  doc.setTextColor(0);
  y += 10;

  // ── Notes ──
  if (data.notes) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Hinweis:", margin, y);
    y += 4;
    doc.setFontSize(8);
    const noteLines = doc.splitTextToSize(data.notes, pageWidth - margin * 2);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4 + 6;
  }

  // ── Bankverbindung (bei Überweisung) ──
  if (data.paymentMethod === "bank_transfer") {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Bankverbindung", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      "Bitte überweisen Sie den Betrag unter Angabe der Rechnungsnummer auf folgendes Konto:",
      margin, y
    );
    y += 5;
    doc.text(`IBAN: ${issuer.iban}`, margin, y);
    y += 4;
    doc.text(`BIC: ${issuer.bic}`, margin, y);
    y += 4;
    doc.text(`Kontoinhaber: ${issuer.account_holder}`, margin, y);
    y += 8;
  }

  // ── Footer ──
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(7);
  doc.setTextColor(140);
  doc.setDrawColor(200);
  doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);
  doc.text(
    `${issuer.company} | ${issuer.email} | ${issuer.phone}`,
    pageWidth / 2,
    footerY,
    { align: "center" }
  );

  return doc;
}

/**
 * Generate PDF and return as base64 string
 */
export function generateAdminInvoicePdfBase64(data: AdminInvoiceData): string {
  const doc = generateAdminInvoicePdf(data);
  return doc.output("datauristring").split(",")[1];
}

/**
 * Generate PDF and return as Blob
 */
export function generateAdminInvoicePdfBlob(data: AdminInvoiceData): Blob {
  const doc = generateAdminInvoicePdf(data);
  return doc.output("blob");
}
