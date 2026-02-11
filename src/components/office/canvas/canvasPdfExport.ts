import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { CanvasDocument, CANVAS_WIDTH, CANVAS_HEIGHT } from "./types";

/**
 * Export canvas document to PDF using html2canvas for accurate visual rendering.
 * Falls back to basic jsPDF if html2canvas fails.
 */
export async function exportCanvasToPdf(doc: CanvasDocument): Promise<jsPDF> {
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth(); // ~595pt
  const pageHeight = pdf.internal.pageSize.getHeight(); // ~842pt

  // Try to render the canvas element
  const canvasEl = document.querySelector('[data-canvas-export="true"]') as HTMLElement;

  if (canvasEl) {
    try {
      const canvas = await html2canvas(canvasEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);
    } catch {
      // Fallback: basic PDF with title
      addFallbackContent(pdf, doc, pageWidth);
    }
  } else {
    addFallbackContent(pdf, doc, pageWidth);
  }

  // Branding footer
  if (doc.branding?.footerText) {
    pdf.setFontSize(7);
    pdf.setTextColor(150);
    const footerLines = pdf.splitTextToSize(doc.branding.footerText, pageWidth - 40);
    pdf.text(footerLines, pageWidth / 2, pageHeight - 15, { align: "center" });
  }

  return pdf;
}

function addFallbackContent(pdf: jsPDF, doc: CanvasDocument, pageWidth: number) {
  let y = 30;
  const margin = 30;

  // Title
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text(doc.title || "Dokument", margin, y);
  y += 25;

  // Blocks as simple text
  for (const block of doc.blocks) {
    if (y > 780) {
      pdf.addPage();
      y = 30;
    }

    if (block.label) {
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.text(block.label, margin, y);
      y += 12;
    }

    if (block.value) {
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      const lines = pdf.splitTextToSize(block.value, pageWidth - margin * 2);
      pdf.text(lines, margin, y);
      y += lines.length * 12 + 5;
    }

    if (block.type === "checkbox" && block.checkboxItems) {
      pdf.setFontSize(9);
      for (const item of block.checkboxItems) {
        if (y > 780) { pdf.addPage(); y = 30; }
        pdf.rect(margin, y - 6, 7, 7);
        if (item.checked) {
          pdf.setFont("helvetica", "bold");
          pdf.text("✓", margin + 1.5, y);
        }
        pdf.setFont("helvetica", "normal");
        pdf.text(item.label, margin + 12, y);
        y += 12;
      }
    }

    if (block.type === "scale") {
      pdf.setFontSize(10);
      pdf.text(`Wert: ${block.scaleValue || "–"} (${block.scaleMin || 1}–${block.scaleMax || 5})`, margin, y);
      y += 15;
    }

    if (block.signatureDataUrl) {
      try {
        pdf.addImage(block.signatureDataUrl, "PNG", margin, y, 150, 60);
        y += 70;
      } catch { y += 5; }
    }

    if (block.imageUrl) {
      try {
        pdf.addImage(block.imageUrl, "PNG", margin, y, 180, 120);
        y += 130;
      } catch { y += 5; }
    }

    y += 5;
  }
}
