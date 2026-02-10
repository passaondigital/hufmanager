import jsPDF from "jspdf";
import { DocumentBlock, DocumentBranding } from "./types";

export async function exportDocumentToPdf(
  title: string,
  blocks: DocumentBlock[],
  branding?: DocumentBranding
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  const checkNewPage = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, y);
  y += 10;

  for (const block of blocks) {
    switch (block.type) {
      case "heading": {
        const sizes = { 1: 18, 2: 14, 3: 12 };
        const sz = sizes[block.headingLevel || 1] || 14;
        checkNewPage(sz / 2 + 4);
        doc.setFontSize(sz);
        doc.setFont("helvetica", "bold");
        doc.text(block.value || "", margin, y);
        y += sz / 2 + 4;
        break;
      }
      case "text":
      case "textarea":
      case "note": {
        if (block.label) {
          checkNewPage(8);
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text(block.label, margin, y);
          y += 5;
        }
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(block.value || "", contentWidth);
        checkNewPage(lines.length * 5 + 2);
        doc.text(lines, margin, y);
        y += lines.length * 5 + 4;
        break;
      }
      case "input":
      case "number":
      case "date":
      case "time": {
        checkNewPage(12);
        if (block.label) {
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text(block.label + (block.required ? " *" : ""), margin, y);
          y += 5;
        }
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const val = block.value || "_______________";
        doc.text(val, margin, y);
        y += 8;
        break;
      }
      case "checkbox": {
        checkNewPage(7);
        doc.setFontSize(10);
        doc.rect(margin, y - 3, 4, 4);
        if (block.checked) {
          doc.setFont("helvetica", "bold");
          doc.text("✓", margin + 0.5, y);
        }
        doc.setFont("helvetica", "normal");
        doc.text(block.label || "", margin + 7, y);
        y += 7;
        break;
      }
      case "checklist": {
        if (block.label) {
          checkNewPage(7);
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text(block.label, margin, y);
          y += 5;
        }
        for (const item of block.checklistItems || []) {
          checkNewPage(7);
          doc.setFontSize(10);
          doc.rect(margin + 2, y - 3, 3.5, 3.5);
          if (item.checked) {
            doc.setFont("helvetica", "bold");
            doc.text("✓", margin + 2.5, y);
          }
          doc.setFont("helvetica", "normal");
          doc.text(item.label, margin + 9, y);
          y += 6;
        }
        y += 2;
        break;
      }
      case "dropdown": {
        checkNewPage(12);
        if (block.label) {
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text(block.label, margin, y);
          y += 5;
        }
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const selected = block.options?.find((o) => o.value === block.value);
        doc.text(selected?.label || block.value || "—", margin, y);
        y += 8;
        break;
      }
      case "placeholder": {
        checkNewPage(12);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(block.label || "", margin, y);
        y += 5;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(block.value || "_______________", margin, y);
        y += 8;
        break;
      }
      case "separator": {
        checkNewPage(6);
        doc.setDrawColor(200);
        doc.line(margin, y, pageWidth - margin, y);
        y += 6;
        break;
      }
      case "table": {
        const data = block.tableData || [];
        if (data.length > 0) {
          const colWidth = contentWidth / (data[0]?.length || 1);
          for (const row of data) {
            checkNewPage(8);
            row.forEach((cell, ci) => {
              doc.setFontSize(9);
              doc.setFont("helvetica", "normal");
              doc.rect(margin + ci * colWidth, y - 4, colWidth, 7);
              doc.text(cell.value, margin + ci * colWidth + 1, y);
            });
            y += 7;
          }
          y += 2;
        }
        break;
      }
      case "image": {
        if (block.imageUrl) {
          try {
            checkNewPage(50);
            doc.addImage(block.imageUrl, "PNG", margin, y, 60, 40);
            y += 44;
          } catch {
            y += 4;
          }
        }
        break;
      }
      case "signature": {
        checkNewPage(30);
        if (block.label) {
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text(block.label, margin, y);
          y += 5;
        }
        if (block.signatureDataUrl) {
          try {
            doc.addImage(block.signatureDataUrl, "PNG", margin, y, 50, 20);
            y += 24;
          } catch {
            doc.setDrawColor(180);
            doc.line(margin, y + 15, margin + 60, y + 15);
            y += 20;
          }
        } else {
          doc.setDrawColor(180);
          doc.line(margin, y + 15, margin + 60, y + 15);
          y += 20;
        }
        break;
      }
      case "drawing": {
        if (block.drawingDataUrl) {
          try {
            checkNewPage(45);
            doc.addImage(block.drawingDataUrl, "PNG", margin, y, 70, 35);
            y += 39;
          } catch {
            y += 4;
          }
        }
        break;
      }
    }
  }

  return doc;
}
