import { useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { TourAppointment } from "./TourCard";

interface TourPdfExportProps {
  tourDate: Date;
  userId: string;
  appointments: TourAppointment[];
  routeInfo: { distance: number; duration: number } | null;
}

export function TourPdfExport({
  tourDate,
  userId,
  appointments,
  routeInfo,
}: TourPdfExportProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = async () => {
    setIsGenerating(true);

    try {
      // Fetch business settings for branding
      const { data: businessSettings } = await supabase
        .from("business_settings")
        .select("business_name, owner_name, logo_url, address, phone, email")
        .eq("user_id", userId)
        .maybeSingle();

      // Fetch breadcrumbs for the day
      const dateStr = format(tourDate, "yyyy-MM-dd");
      const { data: breadcrumbs } = await supabase
        .from("tour_breadcrumbs")
        .select("latitude, longitude, timestamp, accuracy")
        .eq("provider_id", userId)
        .eq("tour_date", dateStr)
        .order("timestamp", { ascending: true });

      // Fetch daily tour stats
      const { data: dailyTour } = await supabase
        .from("daily_tours")
        .select("tour_active_since, tour_ended_at, total_distance_km")
        .eq("provider_id", userId)
        .eq("tour_date", dateStr)
        .maybeSingle();

      // Create PDF
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let yPos = 20;

      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Tour-Nachweis", margin, yPos);
      yPos += 8;

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(format(tourDate, "EEEE, dd. MMMM yyyy", { locale: de }), margin, yPos);
      yPos += 15;

      // Business Info
      if (businessSettings) {
        doc.setFontSize(10);
        doc.setTextColor(100);
        const businessName = businessSettings.business_name || businessSettings.owner_name || "Hufbearbeiter";
        doc.text(businessName, margin, yPos);
        yPos += 5;
        
        if (businessSettings.address) {
          doc.text(businessSettings.address, margin, yPos);
          yPos += 5;
        }
        
        const contactLine = [businessSettings.phone, businessSettings.email].filter(Boolean).join(" | ");
        if (contactLine) {
          doc.text(contactLine, margin, yPos);
          yPos += 5;
        }
        
        doc.setTextColor(0);
        yPos += 5;
      }

      // Tour Summary Box
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 28, 3, 3, "F");
      
      const summaryY = yPos + 8;
      const colWidth = (pageWidth - 2 * margin) / 4;
      
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text("Termine", margin + 8, summaryY);
      doc.text("Abgeschlossen", margin + colWidth + 8, summaryY);
      doc.text("Distanz", margin + colWidth * 2 + 8, summaryY);
      doc.text("Fahrzeit", margin + colWidth * 3 + 8, summaryY);
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      
      const completedCount = appointments.filter(a => a.status === "completed").length;
      const distance = dailyTour?.total_distance_km || routeInfo?.distance || 0;
      const duration = routeInfo?.duration || 0;
      
      doc.text(String(appointments.length), margin + 8, summaryY + 10);
      doc.text(String(completedCount), margin + colWidth + 8, summaryY + 10);
      doc.text(`${distance.toFixed(1)} km`, margin + colWidth * 2 + 8, summaryY + 10);
      doc.text(`${Math.floor(duration / 60)}h ${duration % 60}m`, margin + colWidth * 3 + 8, summaryY + 10);
      
      doc.setFont("helvetica", "normal");
      yPos += 35;

      // Tour Time
      if (dailyTour?.tour_active_since) {
        doc.setFontSize(10);
        doc.setTextColor(100);
        const startTime = format(new Date(dailyTour.tour_active_since), "HH:mm", { locale: de });
        const endTime = dailyTour.tour_ended_at 
          ? format(new Date(dailyTour.tour_ended_at), "HH:mm", { locale: de })
          : "laufend";
        doc.text(`Tour-Zeitraum: ${startTime} - ${endTime}`, margin, yPos);
        doc.setTextColor(0);
        yPos += 10;
      }

      // Appointments Table
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Termine", margin, yPos);
      yPos += 5;

      const tableData = appointments.map((apt, index) => [
        String(index + 1),
        apt.time || "--:--",
        apt.client?.full_name || "Unbekannt",
        `${apt.horse_count || 1} Pferd(e)`,
        apt.service_type || "-",
        apt.status === "completed" ? "✓" : "○",
        [apt.client?.street, apt.client?.zip, apt.client?.city]
          .filter(Boolean)
          .join(", ") || (apt.client?.geo_lat ? "GPS" : "-"),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["#", "Zeit", "Kunde", "Pferde", "Service", "Status", "Adresse"]],
        body: tableData,
        theme: "striped",
        headStyles: { 
          fillColor: [60, 60, 60],
          fontSize: 9,
          fontStyle: "bold",
        },
        bodyStyles: { 
          fontSize: 9,
        },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 15 },
          2: { cellWidth: 35 },
          3: { cellWidth: 22 },
          4: { cellWidth: 25 },
          5: { cellWidth: 12, halign: "center" },
          6: { cellWidth: "auto" },
        },
        margin: { left: margin, right: margin },
      });

      // Get final Y position after table
      // @ts-ignore - autoTable adds this property
      yPos = doc.lastAutoTable.finalY + 10;

      // Breadcrumbs Summary
      if (breadcrumbs && breadcrumbs.length > 0) {
        // Check if we need a new page
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("GPS-Verlauf", margin, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);

        const firstCrumb = breadcrumbs[0];
        const lastCrumb = breadcrumbs[breadcrumbs.length - 1];
        
        doc.text(`Aufzeichnungspunkte: ${breadcrumbs.length}`, margin, yPos);
        yPos += 5;
        
        doc.text(
          `Zeitraum: ${format(new Date(firstCrumb.timestamp), "HH:mm:ss")} - ${format(new Date(lastCrumb.timestamp), "HH:mm:ss")}`,
          margin,
          yPos
        );
        yPos += 5;

        // Calculate rough distance from breadcrumbs
        let totalBreadcrumbDistance = 0;
        for (let i = 1; i < breadcrumbs.length; i++) {
          totalBreadcrumbDistance += haversineDistance(
            breadcrumbs[i - 1].latitude,
            breadcrumbs[i - 1].longitude,
            breadcrumbs[i].latitude,
            breadcrumbs[i].longitude
          );
        }
        
        doc.text(`GPS-Strecke (gemessen): ${totalBreadcrumbDistance.toFixed(1)} km`, margin, yPos);
        doc.setTextColor(0);
        yPos += 15;
      }

      // Footer
      const footerY = doc.internal.pageSize.getHeight() - 15;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Erstellt am ${format(new Date(), "dd.MM.yyyy 'um' HH:mm", { locale: de })} • Hufi`,
        margin,
        footerY
      );
      doc.text(
        `Seite 1 von 1`,
        pageWidth - margin - 20,
        footerY
      );

      // Save
      const fileName = `Tour-Nachweis_${format(tourDate, "yyyy-MM-dd")}.pdf`;
      doc.save(fileName);
      toast.success("PDF erstellt!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("PDF konnte nicht erstellt werden");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-10 gap-2 bg-background/90 backdrop-blur-sm shadow-lg"
      onClick={generatePdf}
      disabled={isGenerating}
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">Export</span>
    </Button>
  );
}

// Haversine distance in km
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
