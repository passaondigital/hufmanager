import jsPDF from "jspdf";
import { DocumentBlock, DocumentBranding } from "./types";

const FONT_MAP: Record<string, string> = {
  system: "helvetica",
  serif: "times",
  mono: "courier",
};

export async function exportDocumentToPdf(
  title: string,
  blocks: DocumentBlock[],
  branding?: DocumentBranding
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;
  const baseFont = FONT_MAP[branding?.fontFamily || "system"] || "helvetica";

  const checkNewPage = (needed: number) => {
    const footerSpace = branding?.footerText ? 20 : 10;
    if (y + needed > pageHeight - margin - footerSpace) {
      addFooter();
      doc.addPage();
      y = margin;
    }
  };

  const addFooter = () => {
    if (branding?.footerText) {
      doc.setFontSize(7);
      doc.setFont(baseFont, "normal");
      doc.setTextColor(150);
      const footerLines = doc.splitTextToSize(branding.footerText, contentWidth);
      const footerY = pageHeight - 12;
      doc.setDrawColor(200);
      doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);
      doc.text(footerLines, pageWidth / 2, footerY, { align: "center" });
      doc.setTextColor(0);
    }
  };

  // Header with branding
  if (branding?.logoUrl) {
    try {
      doc.addImage(branding.logoUrl, "PNG", margin, y, 30, 15);
      if (branding.companyName) {
        doc.setFontSize(10);
        doc.setFont(baseFont, "bold");
        if (branding.primaryColor) {
          const c = hexToRgb(branding.primaryColor);
          if (c) doc.setTextColor(c.r, c.g, c.b);
        }
        doc.text(branding.companyName, margin + 34, y + 5);
        doc.setTextColor(0);
        doc.setFontSize(7);
        doc.setFont(baseFont, "normal");
        doc.setTextColor(100);
        const info = [branding.companyAddress, branding.companyPhone, branding.companyEmail].filter(Boolean).join(" · ");
        if (info) doc.text(info, margin + 34, y + 10);
        doc.setTextColor(0);
      }
      y += 20;
    } catch {
      y += 4;
    }
  } else if (branding?.companyName) {
    doc.setFontSize(11);
    doc.setFont(baseFont, "bold");
    if (branding.primaryColor) {
      const c = hexToRgb(branding.primaryColor);
      if (c) doc.setTextColor(c.r, c.g, c.b);
    }
    doc.text(branding.companyName, margin, y);
    doc.setTextColor(0);
    doc.setFontSize(7);
    doc.setFont(baseFont, "normal");
    doc.setTextColor(100);
    const info = [branding.companyAddress, branding.companyPhone, branding.companyEmail].filter(Boolean).join(" · ");
    if (info) { y += 5; doc.text(info, margin, y); }
    doc.setTextColor(0);
    y += 8;
  }

  // Separator after header
  if (branding?.companyName || branding?.logoUrl) {
    const lineColor = branding?.lineColor ? hexToRgb(branding.lineColor) : null;
    if (lineColor) doc.setDrawColor(lineColor.r, lineColor.g, lineColor.b);
    else doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  }

  // Title
  const headingColor = branding?.headingColor ? hexToRgb(branding.headingColor) : null;
  doc.setFontSize(20);
  doc.setFont(baseFont, "bold");
  if (headingColor) doc.setTextColor(headingColor.r, headingColor.g, headingColor.b);
  doc.text(title, margin, y);
  doc.setTextColor(0);
  y += 10;

  for (const block of blocks) {
    const bs = block.style || {};
    
    switch (block.type) {
      case "heading": {
        const sizes = { 1: 18, 2: 14, 3: 12 };
        const sz = sizes[block.headingLevel || 1] || 14;
        checkNewPage(sz / 2 + 4);
        doc.setFontSize(sz);
        doc.setFont(baseFont, "bold");
        if (headingColor) doc.setTextColor(headingColor.r, headingColor.g, headingColor.b);
        if (bs.textColor) { const c = hexToRgb(bs.textColor); if (c) doc.setTextColor(c.r, c.g, c.b); }
        const align = bs.textAlign === "center" ? "center" : bs.textAlign === "right" ? "right" : "left";
        const xPos = align === "center" ? pageWidth / 2 : align === "right" ? pageWidth - margin : margin;
        doc.text(block.value || "", xPos, y, { align });
        doc.setTextColor(0);
        y += sz / 2 + 4;
        break;
      }
      case "text":
      case "textarea":
      case "note": {
        if (block.label) {
          checkNewPage(8);
          doc.setFontSize(9);
          doc.setFont(baseFont, "bold");
          doc.text(block.label, margin, y);
          y += 5;
        }
        doc.setFontSize(10);
        doc.setFont(baseFont, bs.bold ? "bold" : bs.italic ? "italic" : "normal");
        if (bs.textColor) { const c = hexToRgb(bs.textColor); if (c) doc.setTextColor(c.r, c.g, c.b); }
        const lines = doc.splitTextToSize(block.value || "", contentWidth);
        checkNewPage(lines.length * 5 + 2);

        // Background box
        if (bs.bgColor || block.type === "note") {
          const bgC = bs.bgColor ? hexToRgb(bs.bgColor) : { r: 255, g: 249, b: 230 };
          if (bgC) doc.setFillColor(bgC.r, bgC.g, bgC.b);
          doc.roundedRect(margin - 2, y - 4, contentWidth + 4, lines.length * 5 + 6, 2, 2, "F");
        }

        doc.text(lines, margin, y);
        doc.setTextColor(0);
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
          doc.setFont(baseFont, "bold");
          doc.text(block.label + (block.required ? " *" : ""), margin, y);
          y += 5;
        }
        doc.setFontSize(10);
        doc.setFont(baseFont, "normal");
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
          doc.setFont(baseFont, "bold");
          doc.text("✓", margin + 0.5, y);
        }
        doc.setFont(baseFont, "normal");
        doc.text(block.label || "", margin + 7, y);
        y += 7;
        break;
      }
      case "checklist": {
        if (block.label) {
          checkNewPage(7);
          doc.setFontSize(9);
          doc.setFont(baseFont, "bold");
          doc.text(block.label, margin, y);
          y += 5;
        }
        for (const item of block.checklistItems || []) {
          checkNewPage(7);
          doc.setFontSize(10);
          doc.rect(margin + 2, y - 3, 3.5, 3.5);
          if (item.checked) {
            doc.setFont(baseFont, "bold");
            doc.text("✓", margin + 2.5, y);
          }
          doc.setFont(baseFont, "normal");
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
          doc.setFont(baseFont, "bold");
          doc.text(block.label, margin, y);
          y += 5;
        }
        doc.setFontSize(10);
        doc.setFont(baseFont, "normal");
        const selected = block.options?.find((o) => o.value === block.value);
        doc.text(selected?.label || block.value || "—", margin, y);
        y += 8;
        break;
      }
      case "placeholder": {
        checkNewPage(12);
        doc.setFontSize(9);
        doc.setFont(baseFont, "bold");
        doc.text(block.label || "", margin, y);
        y += 5;
        doc.setFontSize(10);
        doc.setFont(baseFont, "normal");
        doc.text(block.value || "_______________", margin, y);
        y += 8;
        break;
      }
      case "separator": {
        checkNewPage(6);
        const lineColor = branding?.lineColor ? hexToRgb(branding.lineColor) : null;
        if (bs.borderColor) { const c = hexToRgb(bs.borderColor); if (c) doc.setDrawColor(c.r, c.g, c.b); }
        else if (lineColor) doc.setDrawColor(lineColor.r, lineColor.g, lineColor.b);
        else doc.setDrawColor(200);
        doc.line(margin, y, pageWidth - margin, y);
        doc.setDrawColor(0);
        y += 6;
        break;
      }
      case "spacer": {
        const h = (block.spacerHeight || 24) * 0.264583; // px to mm
        checkNewPage(h);
        y += h;
        break;
      }
      case "box": {
        const lines = doc.splitTextToSize(block.value || "", contentWidth - 8);
        const boxHeight = lines.length * 5 + 8;
        checkNewPage(boxHeight);
        const bgC = bs.bgColor ? hexToRgb(bs.bgColor) : null;
        const borderC = bs.borderColor ? hexToRgb(bs.borderColor) : { r: 200, g: 200, b: 200 };
        if (bgC) {
          doc.setFillColor(bgC.r, bgC.g, bgC.b);
          doc.setDrawColor(borderC.r, borderC.g, borderC.b);
          doc.roundedRect(margin, y - 2, contentWidth, boxHeight, 2, 2, "FD");
        } else {
          doc.setDrawColor(borderC.r, borderC.g, borderC.b);
          doc.roundedRect(margin, y - 2, contentWidth, boxHeight, 2, 2, "D");
        }
        doc.setFontSize(10);
        doc.setFont(baseFont, "normal");
        doc.text(lines, margin + 4, y + 3);
        y += boxHeight + 2;
        break;
      }
      case "table": {
        const data = block.tableData || [];
        if (data.length > 0) {
          const colWidth = contentWidth / (data[0]?.length || 1);
          for (let ri = 0; ri < data.length; ri++) {
            checkNewPage(8);
            const row = data[ri];
            // Header row bg
            if (ri === 0) {
              const hdrColor = branding?.primaryColor ? hexToRgb(branding.primaryColor) : null;
              if (hdrColor) {
                doc.setFillColor(hdrColor.r, hdrColor.g, hdrColor.b);
                doc.setTextColor(255);
              } else {
                doc.setFillColor(240, 240, 240);
              }
            }
            row.forEach((cell, ci) => {
              doc.setFontSize(9);
              doc.setFont(baseFont, ri === 0 ? "bold" : "normal");
              if (ri === 0) {
                doc.rect(margin + ci * colWidth, y - 4, colWidth, 7, "FD");
              } else {
                doc.rect(margin + ci * colWidth, y - 4, colWidth, 7);
              }
              doc.text(cell.value, margin + ci * colWidth + 1, y);
            });
            if (ri === 0) { doc.setTextColor(0); }
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
          doc.setFont(baseFont, "bold");
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

  // Final footer
  addFooter();

  return doc;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}
