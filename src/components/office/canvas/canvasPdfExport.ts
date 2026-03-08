import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { CanvasDocument, CANVAS_WIDTH, CANVAS_HEIGHT } from "./types";

/**
 * Export canvas document to PDF using html2canvas for accurate visual rendering.
 * Falls back to structured jsPDF if html2canvas fails.
 */
export async function exportCanvasToPdf(doc: CanvasDocument): Promise<jsPDF> {
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const canvasEl = document.querySelector('[data-canvas-export="true"]') as HTMLElement;

  if (canvasEl) {
    try {
      // Preload all images
      const images = canvasEl.querySelectorAll("img");
      await Promise.all(
        Array.from(images).map(
          (img) =>
            new Promise((resolve) => {
              if ((img as HTMLImageElement).complete) return resolve(null);
              img.onload = () => resolve(null);
              img.onerror = () => resolve(null);
            })
        )
      );

      const canvas = await html2canvas(canvasEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        logging: false,
        imageTimeout: 5000,
        onclone: (clonedDoc) => {
          const el = clonedDoc.querySelector(
            '[data-canvas-export="true"]'
          ) as HTMLElement;
          if (el) {
            el.style.transform = "none";
            el.style.zoom = "1";
          }
        },
      });

      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);
    } catch {
      addFallbackContent(pdf, doc, pageWidth, pageHeight);
    }
  } else {
    addFallbackContent(pdf, doc, pageWidth, pageHeight);
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

function addFallbackContent(pdf: jsPDF, doc: CanvasDocument, pageWidth: number, pageHeight: number) {
  let y = 30;
  const margin = 30;
  const contentWidth = pageWidth - margin * 2;

  // Title
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text(doc.title || "Dokument", margin, y);
  y += 8;

  // Underline
  pdf.setDrawColor(200);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 20;

  // Blocks
  for (const block of doc.blocks) {
    if (y > pageHeight - 60) {
      pdf.addPage();
      y = 30;
    }

    // Label
    if (block.label) {
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(80);
      pdf.text(block.label, margin, y);
      y += 14;
    }

    // Value / content
    if (block.value) {
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(30);
      const lines = pdf.splitTextToSize(block.value, contentWidth);
      pdf.text(lines, margin, y);
      y += lines.length * 13 + 5;
    }

    // Checkbox items
    if (block.type === "checkbox" && block.checkboxItems) {
      pdf.setFontSize(9);
      pdf.setTextColor(30);
      for (const item of block.checkboxItems) {
        if (y > pageHeight - 40) { pdf.addPage(); y = 30; }
        // Draw checkbox
        pdf.setDrawColor(120);
        pdf.setLineWidth(0.8);
        pdf.rect(margin, y - 7, 8, 8);
        if (item.checked) {
          pdf.setFont("helvetica", "bold");
          pdf.text("✓", margin + 1.8, y);
          pdf.setFont("helvetica", "normal");
        }
        pdf.text(item.label, margin + 14, y);
        y += 14;
      }
    }

    // Scale
    if (block.type === "scale") {
      pdf.setFontSize(10);
      pdf.setTextColor(30);
      pdf.text(`Wert: ${block.scaleValue || "–"} (${block.scaleMin || 1}–${block.scaleMax || 5})`, margin, y);
      y += 15;
    }

    // Signature
    if (block.signatureDataUrl) {
      try {
        pdf.addImage(block.signatureDataUrl, "PNG", margin, y, 150, 60);
        y += 70;
      } catch { y += 5; }
    }

    // Image
    if (block.imageUrl) {
      try {
        pdf.addImage(block.imageUrl, "PNG", margin, y, 180, 120);
        y += 130;
      } catch { y += 5; }
    }

    // Separator line between blocks
    pdf.setDrawColor(230);
    pdf.setLineWidth(0.3);
    pdf.line(margin, y, margin + contentWidth * 0.3, y);
    y += 8;
  }
}
