import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import jsPDF from "jspdf";
import {
  LTZHoofData,
  STANCE_OPTIONS,
  CROUP_MOVEMENT_OPTIONS,
  BELLY_SWING_OPTIONS,
  FOOTFALL_OPTIONS,
  PASTERN_ANGLE_OPTIONS,
  CORONET_THEORY_OPTIONS,
  SOLE_FROG_PLANE_OPTIONS,
  LANDING_THEORY_OPTIONS,
  HORN_QUALITY_OPTIONS,
  TOE_AXIS_OPTIONS,
  HOOF_POSITIONS,
} from "./ltz-constants";

interface HoofAnalysis {
  id: string;
  created_at: string;
  horse_id?: string;
  stance_front: string | null;
  stance_rear: string | null;
  croup_movement: string | null;
  belly_swing: string | null;
  footfall_left: string | null;
  footfall_right: string | null;
  hoof_data_vl: LTZHoofData | null;
  hoof_data_vr: LTZHoofData | null;
  hoof_data_hl: LTZHoofData | null;
  hoof_data_hr: LTZHoofData | null;
  notes: string | null;
  recommendations: string[] | null;
  status: string | null;
}

interface LTZPdfSaveButtonProps {
  analysis: HoofAnalysis;
  horseId: string;
  horseName: string;
  ownerName?: string;
}

function getLabel(options: readonly { value: string; label: string }[], value?: string): string {
  return options.find(o => o.value === value)?.label || '—';
}

export function LTZPdfSaveButton({ analysis, horseId, horseName, ownerName }: LTZPdfSaveButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleSaveToStorage = async () => {
    if (!user) {
      toast({
        title: "Nicht angemeldet",
        description: "Bitte melden Sie sich an.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Generate PDF with jsPDF
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const hoofData = {
        vl: (analysis.hoof_data_vl || {}) as LTZHoofData,
        vr: (analysis.hoof_data_vr || {}) as LTZHoofData,
        hl: (analysis.hoof_data_hl || {}) as LTZHoofData,
        hr: (analysis.hoof_data_hr || {}) as LTZHoofData,
      };

      const dateStr = format(parseISO(analysis.created_at), "dd.MM.yyyy", { locale: de });
      const timeStr = format(parseISO(analysis.created_at), "HH:mm", { locale: de });

      // Colors
      const primaryColor: [number, number, number] = [244, 123, 32]; // #f47b20
      const textColor: [number, number, number] = [26, 26, 26];
      const grayColor: [number, number, number] = [107, 114, 128];
      const greenColor: [number, number, number] = [34, 197, 94];
      const warningColor: [number, number, number] = [245, 158, 11];

      let yPos = 15;

      // Header
      doc.setFontSize(20);
      doc.setTextColor(...textColor);
      doc.setFont("helvetica", "bold");
      doc.text("LTZ Bearbeitungsbogen", 15, yPos);
      
      yPos += 6;
      doc.setFontSize(10);
      doc.setTextColor(...grayColor);
      doc.setFont("helvetica", "normal");
      doc.text("Hufanalyse nach Leipziger Standard", 15, yPos);

      // Right side header info
      doc.setFontSize(12);
      doc.setTextColor(...textColor);
      doc.setFont("helvetica", "bold");
      doc.text(horseName, 195, 15, { align: "right" });
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...grayColor);
      if (ownerName) {
        doc.text(`Besitzer: ${ownerName}`, 195, 21, { align: "right" });
      }
      doc.text(`Datum: ${dateStr} | ${timeStr}`, 195, ownerName ? 27 : 21, { align: "right" });

      // Orange line under header
      yPos += 8;
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(1);
      doc.line(15, yPos, 195, yPos);

      // Section: Exterieur & Gangbild
      yPos += 12;
      doc.setFontSize(11);
      doc.setTextColor(...primaryColor);
      doc.setFont("helvetica", "bold");
      doc.text("Exterieur & Gangbild", 15, yPos);
      
      yPos += 2;
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(0.3);
      doc.line(15, yPos, 80, yPos);

      yPos += 8;
      doc.setFontSize(8);
      doc.setTextColor(...grayColor);
      doc.setFont("helvetica", "normal");

      const infoItems = [
        { label: "Stellung Vordergliedmaße", value: getLabel(STANCE_OPTIONS, analysis.stance_front || undefined) },
        { label: "Stellung Hintergliedmaße", value: getLabel(STANCE_OPTIONS, analysis.stance_rear || undefined) },
        { label: "Bewegung Kruppe", value: getLabel(CROUP_MOVEMENT_OPTIONS, analysis.croup_movement || undefined) },
        { label: "Bauchpendel", value: getLabel(BELLY_SWING_OPTIONS, analysis.belly_swing || undefined) },
        { label: "Fußung Links", value: getLabel(FOOTFALL_OPTIONS, analysis.footfall_left || undefined) },
        { label: "Fußung Rechts", value: getLabel(FOOTFALL_OPTIONS, analysis.footfall_right || undefined) },
      ];

      const colWidth = 60;
      infoItems.forEach((item, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const x = 15 + col * colWidth;
        const y = yPos + row * 12;

        // Background box
        doc.setFillColor(248, 249, 250);
        doc.roundedRect(x, y - 4, colWidth - 5, 10, 1, 1, "F");

        doc.setTextColor(...grayColor);
        doc.setFontSize(7);
        doc.text(item.label, x + 2, y);
        
        doc.setTextColor(...textColor);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(item.value, x + 2, y + 5);
        doc.setFont("helvetica", "normal");
      });

      yPos += 28;

      // Section: Hufbefunde Table
      doc.setFontSize(11);
      doc.setTextColor(...primaryColor);
      doc.setFont("helvetica", "bold");
      doc.text("Hufbefunde", 15, yPos);
      
      yPos += 2;
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(0.3);
      doc.line(15, yPos, 55, yPos);

      yPos += 6;

      // Table headers
      const tableHeaders = ["Parameter", "VL", "VR", "HL", "HR"];
      const colWidths = [55, 32, 32, 32, 32];
      let xPos = 15;

      doc.setFillColor(...primaryColor);
      doc.rect(xPos, yPos, 180, 7, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      
      tableHeaders.forEach((header, idx) => {
        const align = idx === 0 ? "left" : "center";
        const textX = idx === 0 ? xPos + 2 : xPos + colWidths[idx] / 2;
        doc.text(header, textX, yPos + 5, { align: align as any });
        xPos += colWidths[idx];
      });

      yPos += 7;

      // Table rows
      const tableRows = [
        { label: "Fesselstand (1/3:2/3)", key: "pasternAngle" as const, goodValue: "correct", options: PASTERN_ANGLE_OPTIONS },
        { label: "Zehenachse", key: "toeAxis" as const, goodValue: "straight", options: TOE_AXIS_OPTIONS },
        { label: "Kronrandtheorie", key: "coronetTheory" as const, goodValue: "equal", options: CORONET_THEORY_OPTIONS },
        { label: "Sohle-Strahl-Ebene", key: "soleFrogPlane" as const, goodValue: "equal", options: SOLE_FROG_PLANE_OPTIONS },
        { label: "Fußungstheorie", key: "landingTheory" as const, goodValue: "flat", options: LANDING_THEORY_OPTIONS },
        { label: "Hornqualität", key: "hornQuality" as const, goodValue: "normal", options: HORN_QUALITY_OPTIONS },
      ];

      tableRows.forEach((row, rowIdx) => {
        xPos = 15;
        const rowY = yPos + rowIdx * 7;
        
        // Alternating row background
        if (rowIdx % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(xPos, rowY, 180, 7, "F");
        }

        // Draw cell borders
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.2);
        doc.rect(xPos, rowY, 180, 7);

        // First column - parameter name
        doc.setFillColor(248, 249, 250);
        doc.rect(xPos, rowY, colWidths[0], 7, "F");
        doc.setTextColor(...textColor);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(row.label, xPos + 2, rowY + 5);
        xPos += colWidths[0];

        // Hoof columns
        HOOF_POSITIONS.forEach((hoof, hoofIdx) => {
          const data = hoofData[hoof.key as keyof typeof hoofData];
          const val = data[row.key];
          const label = getLabel(row.options, val);
          
          // Set color based on value
          if (val === row.goodValue) {
            doc.setTextColor(...greenColor);
          } else if (val) {
            doc.setTextColor(...warningColor);
          } else {
            doc.setTextColor(...grayColor);
          }
          
          doc.setFont("helvetica", "normal");
          doc.text(label, xPos + colWidths[hoofIdx + 1] / 2, rowY + 5, { align: "center" });
          xPos += colWidths[hoofIdx + 1];
        });
      });

      yPos += tableRows.length * 7 + 10;

      // Recommendations
      if (analysis.recommendations && analysis.recommendations.length > 0) {
        doc.setFillColor(255, 247, 237);
        doc.setDrawColor(254, 215, 170);
        doc.roundedRect(15, yPos, 180, 8 + analysis.recommendations.length * 6, 2, 2, "FD");
        
        yPos += 6;
        doc.setTextColor(234, 88, 12);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("⚠ Bearbeitungsempfehlungen", 20, yPos);
        
        yPos += 5;
        doc.setTextColor(...textColor);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        
        analysis.recommendations.forEach((rec) => {
          doc.text(`• ${rec}`, 22, yPos);
          yPos += 5;
        });
        
        yPos += 5;
      }

      // Notes
      if (analysis.notes) {
        doc.setFillColor(241, 245, 249);
        const notesHeight = Math.ceil(analysis.notes.length / 80) * 5 + 10;
        doc.roundedRect(15, yPos, 180, notesHeight, 2, 2, "F");
        
        yPos += 6;
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Zusätzliche Notizen", 20, yPos);
        
        yPos += 5;
        doc.setTextColor(...textColor);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const splitNotes = doc.splitTextToSize(analysis.notes, 170);
        doc.text(splitNotes, 20, yPos);
        
        yPos += splitNotes.length * 4 + 5;
      }

      // Signature area
      yPos = Math.max(yPos + 15, 250);
      doc.setDrawColor(...textColor);
      doc.setLineWidth(0.3);
      
      doc.line(15, yPos, 90, yPos);
      doc.line(110, yPos, 195, yPos);
      
      yPos += 5;
      doc.setTextColor(...grayColor);
      doc.setFontSize(8);
      doc.text("Unterschrift Hufbearbeiter", 15, yPos);
      doc.text("Unterschrift Pferdebesitzer", 110, yPos);

      // Footer
      yPos = 285;
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.2);
      doc.line(15, yPos - 5, 195, yPos - 5);
      
      doc.setTextColor(156, 163, 175);
      doc.setFontSize(7);
      doc.text("LTZ Bearbeitungsbogen - Generiert mit HufManager", 15, yPos);
      doc.text("Seite 1 von 1", 195, yPos, { align: "right" });

      // Get PDF as blob
      const pdfBlob = doc.output("blob");
      const fileName = `LTZ-Analyse_${horseName.replace(/\s+/g, '-')}_${dateStr.replace(/\./g, '-')}.pdf`;
      const storagePath = `${horseId}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("horse-documents")
        .upload(storagePath, pdfBlob, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Upload fehlgeschlagen: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("horse-documents")
        .getPublicUrl(storagePath);

      // Create database entry
      const { error: dbError } = await supabase
        .from("horse_documents")
        .insert({
          horse_id: horseId,
          file_name: fileName,
          file_url: urlData.publicUrl,
          file_type: "application/pdf",
          category: "hufanalyse",
          notes: `LTZ-Analyse vom ${dateStr}`,
          uploaded_by: user.id,
        });

      if (dbError) {
        throw new Error(`Datenbank-Eintrag fehlgeschlagen: ${dbError.message}`);
      }

      // Invalidate queries to refresh document lists
      queryClient.invalidateQueries({ queryKey: ["horse-documents", horseId] });

      toast({
        title: "PDF gespeichert",
        description: `${fileName} wurde erfolgreich in den Dokumenten gespeichert.`,
      });

      // Also trigger download for the user
      doc.save(fileName);

    } catch (error) {
      console.error("PDF save error:", error);
      toast({
        title: "Fehler beim Speichern",
        description: error instanceof Error ? error.message : "Ein unbekannter Fehler ist aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handleSaveToStorage}
      disabled={isSaving}
      className="gap-2"
    >
      {isSaving ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      PDF erstellen & speichern
    </Button>
  );
}
