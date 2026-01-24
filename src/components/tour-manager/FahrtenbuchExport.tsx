import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, eachWeekOfInterval, isSameMonth } from "date-fns";
import { de } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface MileageLog {
  id: string;
  log_date: string;
  odometer_start: number | null;
  odometer_end: number | null;
  purpose: string | null;
  route_description: string | null;
  vehicle: {
    license_plate: string;
    brand: string | null;
  } | null;
}

export function FahrtenbuchExport() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [isExporting, setIsExporting] = useState(false);

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
  const { data: mileageLogs = [], isLoading } = useQuery({
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
          vehicle:provider_vehicles(license_plate, brand)
        `)
        .eq("provider_id", user.id)
        .gte("log_date", start)
        .lte("log_date", end)
        .order("log_date", { ascending: true });

      if (error) throw error;
      return (data || []) as MileageLog[];
    },
    enabled: !!user?.id,
  });

  // Calculate distance for each log
  const calculateDistance = (log: MileageLog): number => {
    if (log.odometer_start != null && log.odometer_end != null) {
      return log.odometer_end - log.odometer_start;
    }
    return 0;
  };

  // Calculate totals
  const totalKm = mileageLogs.reduce((sum, log) => sum + calculateDistance(log), 0);
  const totalTrips = mileageLogs.length;

  // Parse route stops from JSON
  const parseRouteStops = (routeDesc: string | null): string => {
    if (!routeDesc) return "";
    try {
      const stops = JSON.parse(routeDesc);
      if (Array.isArray(stops)) {
        return stops.map((s: { name?: string }) => s.name || "").filter(Boolean).join(" → ");
      }
    } catch {
      return routeDesc;
    }
    return routeDesc;
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (mileageLogs.length === 0) {
      toast.error("Keine Fahrten für diesen Monat vorhanden");
      return;
    }

    setIsExporting(true);

    try {
      // CSV Header (German, tax-compliant)
      const headers = [
        "Datum",
        "Fahrzeug",
        "Kennzeichen",
        "Tachostand Start (km)",
        "Tachostand Ende (km)",
        "Gefahrene km",
        "Fahrtanlass/Zweck",
        "Route/Reiseziel"
      ];

      // CSV Rows
      const rows = mileageLogs.map((log) => {
        const distance = calculateDistance(log);
        return [
          format(new Date(log.log_date), "dd.MM.yyyy"),
          log.vehicle?.brand || "Unbekannt",
          log.vehicle?.license_plate || "",
          log.odometer_start?.toFixed(0) || "",
          log.odometer_end?.toFixed(0) || "",
          distance.toFixed(1),
          log.purpose || "Geschäftlich",
          parseRouteStops(log.route_description)
        ];
      });

      // Add summary row
      rows.push([]);
      rows.push([
        "SUMME",
        "",
        "",
        "",
        "",
        totalKm.toFixed(1),
        `${totalTrips} Fahrten`,
        ""
      ]);

      // Create CSV content
      const csvContent = [
        `Fahrtenbuch - ${format(selectedMonth, "MMMM yyyy", { locale: de })}`,
        "",
        headers.join(";"),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";"))
      ].join("\n");

      // Create and download file
      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Fahrtenbuch_${format(selectedMonth, "yyyy-MM")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Fahrtenbuch exportiert!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Export fehlgeschlagen");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Fahrtenbuch-Export
        </CardTitle>
        <CardDescription>
          Exportiere alle Fahrten eines Monats als CSV für das Finanzamt
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

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold">{totalKm.toFixed(1)} km</p>
            <p className="text-sm text-muted-foreground">Gesamtstrecke</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold">{totalTrips}</p>
            <p className="text-sm text-muted-foreground">Fahrten</p>
          </div>
        </div>

        {/* Export Button */}
        <Button 
          onClick={handleExportCSV} 
          disabled={isLoading || isExporting || mileageLogs.length === 0}
          className="w-full gap-2"
        >
          <Download className="h-4 w-4" />
          {isExporting ? "Exportiere..." : "Als CSV exportieren"}
        </Button>

        {mileageLogs.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground text-center">
            Keine Fahrten in diesem Monat erfasst.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
