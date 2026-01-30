import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, parseISO, differenceInMinutes } from "date-fns";
import { de } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet, ChevronLeft, ChevronRight, FileText, MapPin, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface MileageLog {
  id: string;
  log_date: string;
  odometer_start: number | null;
  odometer_end: number | null;
  purpose: string | null;
  route_description: string | null;
  status?: string;
  vehicle: {
    license_plate: string;
    brand: string | null;
  } | null;
}

interface GPSTrip {
  date: string;
  startTime: string;
  endTime: string;
  distanceKm: number;
  durationMinutes: number;
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
  pointCount: number;
}

interface Breadcrumb {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  tour_date: string;
}

// Haversine formula for distance calculation
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function FahrtenbuchExport() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<"manual" | "gps">("manual");

  // Navigate months
  const goToPrevMonth = () => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedMonth(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedMonth(newDate);
  };

  // Fetch mileage logs for selected month
  const { data: mileageLogs = [], isLoading: isLoadingManual } = useQuery({
    queryKey: ["fahrtenbuch-export", format(selectedMonth, "yyyy-MM"), user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const start = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
      const end = format(endOfMonth(selectedMonth), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("vehicle_mileage_logs")
        .select(`
          id,
          log_date,
          odometer_start,
          odometer_end,
          purpose,
          route_description,
          status,
          vehicle:provider_vehicles(license_plate, brand)
        `)
        .eq("provider_id", user.id)
        .eq("status", "completed")
        .gte("log_date", start)
        .lte("log_date", end)
        .order("log_date", { ascending: true });

      if (error) throw error;
      
      // Debug log to verify data
      console.log("[Fahrtenbuch] Loaded logs:", data?.map(l => ({
        date: l.log_date,
        start: l.odometer_start,
        end: l.odometer_end,
        distance: (l.odometer_end || 0) - (l.odometer_start || 0)
      })));
      
      return (data || []) as MileageLog[];
    },
    enabled: !!user?.id,
  });

  // Fetch GPS breadcrumbs for selected month
  const { data: breadcrumbs = [], isLoading: isLoadingGPS } = useQuery({
    queryKey: ["gps-breadcrumbs-month", format(selectedMonth, "yyyy-MM"), user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const start = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
      const end = format(endOfMonth(selectedMonth), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("tour_breadcrumbs")
        .select("id, latitude, longitude, timestamp, tour_date")
        .eq("provider_id", user.id)
        .gte("tour_date", start)
        .lte("tour_date", end)
        .order("timestamp", { ascending: true });

      if (error) throw error;
      return (data || []) as Breadcrumb[];
    },
    enabled: !!user?.id,
  });

  // Detect trips from GPS breadcrumbs
  const gpsTrips = useMemo((): GPSTrip[] => {
    if (breadcrumbs.length < 2) return [];

    const trips: GPSTrip[] = [];
    const groupedByDate: Record<string, Breadcrumb[]> = {};

    // Group by date
    breadcrumbs.forEach((bc) => {
      const date = bc.tour_date;
      if (!groupedByDate[date]) groupedByDate[date] = [];
      groupedByDate[date].push(bc);
    });

    // Process each day
    Object.entries(groupedByDate).forEach(([date, points]) => {
      if (points.length < 2) return;

      // Sort by timestamp
      points.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Calculate total distance for the day
      let totalDistance = 0;
      for (let i = 1; i < points.length; i++) {
        const dist = haversineDistance(
          points[i - 1].latitude, points[i - 1].longitude,
          points[i].latitude, points[i].longitude
        );
        // Filter out GPS noise (jumps > 50km in a short time are likely errors)
        if (dist < 50) {
          totalDistance += dist;
        }
      }

      // Only include if distance is meaningful (> 1km)
      if (totalDistance > 1) {
        const startTime = new Date(points[0].timestamp);
        const endTime = new Date(points[points.length - 1].timestamp);

        trips.push({
          date,
          startTime: format(startTime, "HH:mm"),
          endTime: format(endTime, "HH:mm"),
          distanceKm: Math.round(totalDistance * 10) / 10,
          durationMinutes: differenceInMinutes(endTime, startTime),
          startLocation: { lat: points[0].latitude, lng: points[0].longitude },
          endLocation: { lat: points[points.length - 1].latitude, lng: points[points.length - 1].longitude },
          pointCount: points.length,
        });
      }
    });

    return trips.sort((a, b) => a.date.localeCompare(b.date));
  }, [breadcrumbs]);

  // Calculate distance for each log
  const calculateDistance = (log: MileageLog): number => {
    if (log.odometer_start != null && log.odometer_end != null) {
      return log.odometer_end - log.odometer_start;
    }
    return 0;
  };

  // Calculate totals
  const totalManualKm = mileageLogs.reduce((sum, log) => sum + calculateDistance(log), 0);
  const totalManualTrips = mileageLogs.length;
  const totalGpsKm = gpsTrips.reduce((sum, trip) => sum + trip.distanceKm, 0);
  const totalGpsTrips = gpsTrips.length;

  // Find days with GPS data but no manual entry
  const missingManualEntries = useMemo(() => {
    const manualDates = new Set(mileageLogs.map((m) => m.log_date));
    return gpsTrips.filter((trip) => !manualDates.has(trip.date));
  }, [mileageLogs, gpsTrips]);

  // Parse route stops from JSON
  const parseRouteStops = (routeDesc: string | null): string => {
    if (!routeDesc) return "";
    try {
      const parsed = JSON.parse(routeDesc);
      
      // New format: { stops: [...], purpose: "..." }
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.stops)) {
        if (parsed.stops.length === 0) {
          return parsed.purpose || "";
        }
        return parsed.stops.map((s: { name?: string }) => s.name || "").filter(Boolean).join(" → ");
      }
      
      // Old format: direct array of stops
      if (Array.isArray(parsed)) {
        return parsed.map((s: { name?: string }) => s.name || "").filter(Boolean).join(" → ");
      }
      
      return routeDesc;
    } catch {
      // Not JSON, just a plain string description
      return routeDesc;
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (mileageLogs.length === 0 && gpsTrips.length === 0) {
      toast.error("Keine Fahrten für diesen Monat vorhanden");
      return;
    }

    setIsExporting(true);

    try {
      const headers = [
        "Datum",
        "Fahrzeug",
        "Kennzeichen",
        "Tachostand Start (km)",
        "Tachostand Ende (km)",
        "Gefahrene km",
        "Fahrtanlass/Zweck",
        "Route/Reiseziel",
        "Quelle"
      ];

      const rows: string[][] = [];

      // Add manual entries
      mileageLogs.forEach((log) => {
        const distance = calculateDistance(log);
        rows.push([
          format(new Date(log.log_date), "dd.MM.yyyy"),
          log.vehicle?.brand || "Unbekannt",
          log.vehicle?.license_plate || "",
          log.odometer_start?.toFixed(0) || "",
          log.odometer_end?.toFixed(0) || "",
          distance.toFixed(1),
          log.purpose || "Geschäftlich",
          parseRouteStops(log.route_description),
          "Manuell"
        ]);
      });

      // Add GPS entries (only those without manual entry)
      missingManualEntries.forEach((trip) => {
        rows.push([
          format(new Date(trip.date), "dd.MM.yyyy"),
          "",
          "",
          "",
          "",
          trip.distanceKm.toFixed(1),
          "Geschäftlich (GPS erkannt)",
          `${trip.startTime} - ${trip.endTime}`,
          "GPS"
        ]);
      });

      // Sort by date
      rows.sort((a, b) => {
        const dateA = a[0].split(".").reverse().join("-");
        const dateB = b[0].split(".").reverse().join("-");
        return dateA.localeCompare(dateB);
      });

      // Add summary
      rows.push([]);
      rows.push([
        "SUMME",
        "",
        "",
        "",
        "",
        (totalManualKm + missingManualEntries.reduce((s, t) => s + t.distanceKm, 0)).toFixed(1),
        `${totalManualTrips + missingManualEntries.length} Fahrten`,
        "",
        ""
      ]);

      const csvContent = [
        `Fahrtenbuch - ${format(selectedMonth, "MMMM yyyy", { locale: de })}`,
        "",
        headers.join(";"),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";"))
      ].join("\n");

      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Fahrtenbuch_${format(selectedMonth, "yyyy-MM")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Fahrtenbuch als CSV exportiert!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Export fehlgeschlagen");
    } finally {
      setIsExporting(false);
    }
  };

  // Export to PDF (official tax format)
  const handleExportPDF = async () => {
    if (isExporting) return; // Prevent double-click
    
    if (mileageLogs.length === 0 && gpsTrips.length === 0) {
      toast.error("Keine Fahrten für diesen Monat vorhanden");
      return;
    }
    
    setIsExporting(true);
    
    // Debug log to verify data before export
    console.log("[Fahrtenbuch PDF] Exporting logs:", mileageLogs.map(l => ({
      date: l.log_date,
      start: l.odometer_start,
      end: l.odometer_end,
      distance: calculateDistance(l),
      route: l.route_description?.substring(0, 50)
    })));

    try {
      // Fetch business data
      const { data: businessData } = await supabase
        .from("business_settings")
        .select("business_name, owner_name, address")
        .eq("user_id", user?.id)
        .single();

      // Fetch default vehicle
      const { data: vehicleData } = await supabase
        .from("provider_vehicles")
        .select("license_plate, brand")
        .eq("provider_id", user?.id || "")
        .limit(1)
        .maybeSingle();

      const vehicle = vehicleData as { license_plate: string; brand: string | null } | null;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const monthYear = format(selectedMonth, "MMMM yyyy", { locale: de });

      // Header
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("FAHRTENBUCH", pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Zeitraum: ${monthYear}`, pageWidth / 2, 28, { align: "center" });

      // Business info box
      doc.setDrawColor(200);
      doc.setFillColor(248, 248, 248);
      doc.roundedRect(14, 35, pageWidth - 28, 30, 2, 2, "FD");

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Fahrzeughalter / Unternehmen:", 18, 43);
      doc.setFont("helvetica", "normal");
      doc.text(businessData?.business_name || businessData?.owner_name || "—", 18, 50);
      doc.text(businessData?.address || "", 18, 56);

      doc.setFont("helvetica", "bold");
      doc.text("Fahrzeug:", pageWidth / 2 + 10, 43);
      doc.setFont("helvetica", "normal");
      doc.text(vehicle?.brand || "—", pageWidth / 2 + 10, 50);
      doc.text(`Kennzeichen: ${vehicle?.license_plate || "—"}`, pageWidth / 2 + 10, 56);

      // Prepare table data
      const tableData: string[][] = [];

      // Manual entries
      mileageLogs.forEach((log) => {
        const distance = calculateDistance(log);
        tableData.push([
          format(new Date(log.log_date), "dd.MM.yyyy"),
          log.odometer_start?.toFixed(0) || "—",
          log.odometer_end?.toFixed(0) || "—",
          distance.toFixed(1),
          log.purpose || "Geschäftlich",
          parseRouteStops(log.route_description) || "—"
        ]);
      });

      // GPS entries (only missing)
      missingManualEntries.forEach((trip) => {
        tableData.push([
          format(new Date(trip.date), "dd.MM.yyyy"),
          "GPS",
          "GPS",
          trip.distanceKm.toFixed(1),
          "Geschäftlich",
          `${trip.startTime} - ${trip.endTime} (GPS)`
        ]);
      });

      // Sort by date
      tableData.sort((a, b) => {
        const dateA = a[0].split(".").reverse().join("-");
        const dateB = b[0].split(".").reverse().join("-");
        return dateA.localeCompare(dateB);
      });

      // Add row numbers
      const numberedData = tableData.map((row, i) => [String(i + 1), ...row]);

      // Table
      autoTable(doc, {
        startY: 72,
        head: [["Nr.", "Datum", "km Start", "km Ende", "Strecke", "Zweck", "Route/Ziel"]],
        body: numberedData,
        theme: "striped",
        headStyles: {
          fillColor: [51, 51, 51],
          fontSize: 9,
          fontStyle: "bold",
        },
        bodyStyles: {
          fontSize: 8,
        },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 22 },
          2: { cellWidth: 20 },
          3: { cellWidth: 20 },
          4: { cellWidth: 18 },
          5: { cellWidth: 30 },
          6: { cellWidth: "auto" },
        },
        margin: { left: 14, right: 14 },
      });

      // Summary box
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      
      doc.setDrawColor(51, 51, 51);
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(14, finalY, pageWidth - 28, 25, 2, 2, "FD");

      const combinedKm = totalManualKm + missingManualEntries.reduce((s, t) => s + t.distanceKm, 0);
      const combinedTrips = totalManualTrips + missingManualEntries.length;

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("ZUSAMMENFASSUNG", 18, finalY + 8);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Gesamtstrecke: ${combinedKm.toFixed(1)} km`, 18, finalY + 16);
      doc.text(`Anzahl Fahrten: ${combinedTrips}`, pageWidth / 2, finalY + 16);

      // Footer with signature line
      const footerY = finalY + 40;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Erstellt am: ${format(new Date(), "dd.MM.yyyy HH:mm")} Uhr`, 14, footerY);
      doc.text("Dieses Dokument wurde elektronisch erstellt.", 14, footerY + 5);

      // Signature line
      doc.setDrawColor(0);
      doc.line(pageWidth - 80, footerY + 15, pageWidth - 14, footerY + 15);
      doc.text("Unterschrift Fahrzeughalter", pageWidth - 80, footerY + 20);

      // Legal notice
      doc.setFontSize(7);
      doc.setTextColor(120);
      doc.text(
        "Gemäß § 6 EStG / § 4 Abs. 5 Nr. 6 EStG für die steuerliche Absetzung von Fahrtkosten.",
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );

      // Save
      doc.save(`Fahrtenbuch_${format(selectedMonth, "yyyy-MM")}.pdf`);
      toast.success("Fahrtenbuch als PDF exportiert!");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("PDF-Export fehlgeschlagen");
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading = isLoadingManual || isLoadingGPS;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Fahrtenbuch-Export
        </CardTitle>
        <CardDescription>
          Exportiere alle Fahrten eines Monats für das Finanzamt
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Month Selector */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon" onClick={goToPrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium">
            {format(selectedMonth, "MMMM yyyy", { locale: de })}
          </span>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs for Manual vs GPS */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "manual" | "gps")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Manuell ({totalManualTrips})
            </TabsTrigger>
            <TabsTrigger value="gps" className="gap-2">
              <MapPin className="h-4 w-4" />
              GPS ({totalGpsTrips})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">{totalManualKm.toFixed(1)} km</p>
                <p className="text-sm text-muted-foreground">Gesamtstrecke</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">{totalManualTrips}</p>
                <p className="text-sm text-muted-foreground">Fahrten</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="gps" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-chart-3/10 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">{totalGpsKm.toFixed(1)} km</p>
                <p className="text-sm text-muted-foreground">GPS-Strecke</p>
              </div>
              <div className="bg-chart-3/10 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">{totalGpsTrips}</p>
                <p className="text-sm text-muted-foreground">GPS-Tage</p>
              </div>
            </div>

            {/* Missing entries warning */}
            {missingManualEntries.length > 0 && (
              <div className="bg-chart-4/10 border border-chart-4/30 rounded-lg p-3 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-chart-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {missingManualEntries.length} Fahrten ohne manuellen Eintrag erkannt
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Diese GPS-Fahrten werden beim Export automatisch ergänzt.
                  </p>
                </div>
              </div>
            )}

            {/* GPS trips list */}
            {gpsTrips.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {gpsTrips.slice(0, 5).map((trip) => {
                  const hasManual = mileageLogs.some((m) => m.log_date === trip.date);
                  return (
                    <div
                      key={trip.date}
                      className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span>{format(new Date(trip.date), "dd.MM.")}</span>
                        <Badge variant={hasManual ? "secondary" : "outline"} className="text-xs">
                          {hasManual ? "✓ Erfasst" : "Nur GPS"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span>{trip.distanceKm.toFixed(1)} km</span>
                        <span>{trip.startTime}–{trip.endTime}</span>
                      </div>
                    </div>
                  );
                })}
                {gpsTrips.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    + {gpsTrips.length - 5} weitere Tage
                  </p>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Export Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={isLoading || isExporting || (mileageLogs.length === 0 && gpsTrips.length === 0)}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button
            onClick={handleExportPDF}
            disabled={isLoading || isExporting || (mileageLogs.length === 0 && gpsTrips.length === 0)}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            PDF
          </Button>
        </div>

        {mileageLogs.length === 0 && gpsTrips.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground text-center">
            Keine Fahrten in diesem Monat erfasst.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
