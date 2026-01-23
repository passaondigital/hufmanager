import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Timer, Route, ClipboardList, Car, Map } from "lucide-react";
import { HufCamProStandalone } from "@/components/hufcam";
import { VehicleManagement, MileageTracker, WorkTimer } from "@/components/workmode";
import { TourMapView } from "@/components/calendar/TourMapView";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { LTZAnalysisWizard, LTZAnalysisHistory } from "@/components/hoof-analysis";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const WorkMode = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("timer");
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Hufanalyse state
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  // Fetch horses for Hufanalyse
  const { data: horses = [] } = useQuery({
    queryKey: ["provider-horses", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("horses")
        .select("id, name, breed")
        .is("deleted_at", null);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch appointments for map
  const { data: mapAppointments = [] } = useQuery({
    queryKey: ["appointments-map-workmode", format(currentDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const dateStr = format(currentDate, "yyyy-MM-dd");
      
      const { data: aptData, error } = await supabase
        .from("appointments")
        .select(`
          id,
          date,
          time,
          status,
          service_type,
          horses(id, name, owner_id)
        `)
        .eq("date", dateStr)
        .order("time", { ascending: true });
      
      if (error || !aptData) return [];
      
      const ownerIds = [...new Set(
        aptData.map(apt => apt.horses?.owner_id).filter((id): id is string => !!id)
      )];
      
      if (ownerIds.length === 0) {
        return aptData.map(apt => ({
          id: apt.id,
          date: apt.date,
          time: apt.time,
          status: apt.status,
          service_type: apt.service_type,
          horses: apt.horses ? { name: apt.horses.name } : null,
          clients: null,
        }));
      }
      
      const { data: clients } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ownerIds);
      
      interface ProfileData { id: string; full_name: string | null }
      const clientArr = (clients || []) as ProfileData[];
      const clientMap = Object.fromEntries(clientArr.map(c => [c.id, c]));
      
      return aptData.map(apt => {
        const client = apt.horses?.owner_id ? clientMap[apt.horses.owner_id] : null;
        return {
          id: apt.id,
          date: apt.date,
          time: apt.time,
          status: apt.status,
          service_type: apt.service_type,
          horses: apt.horses ? { name: apt.horses.name } : null,
          clients: client ? {
            first_name: client.full_name?.split(" ")[0] || null,
            last_name: client.full_name?.split(" ").slice(1).join(" ") || null,
            geo_lat: null,
            geo_lng: null,
            zip: null,
          } : null,
        };
      });
    },
    enabled: activeTab === "tour",
  });

  const selectedHorse = horses.find(h => h.id === selectedHorseId);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Work-Mode</h1>
        <p className="text-muted-foreground text-sm">
          Alle Tools für deinen Arbeitstag an einem Ort
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto">
          <TabsTrigger value="timer" className="flex flex-col gap-1 py-3">
            <Timer className="h-4 w-4" />
            <span className="text-xs">Zeit</span>
          </TabsTrigger>
          <TabsTrigger value="mileage" className="flex flex-col gap-1 py-3">
            <Route className="h-4 w-4" />
            <span className="text-xs">km-Tracker</span>
          </TabsTrigger>
          <TabsTrigger value="tour" className="flex flex-col gap-1 py-3">
            <Map className="h-4 w-4" />
            <span className="text-xs">Tour</span>
          </TabsTrigger>
          <TabsTrigger value="hufcam" className="flex flex-col gap-1 py-3">
            <Camera className="h-4 w-4" />
            <span className="text-xs">HufCam</span>
          </TabsTrigger>
          <TabsTrigger value="analyse" className="flex flex-col gap-1 py-3">
            <ClipboardList className="h-4 w-4" />
            <span className="text-xs">Analyse</span>
          </TabsTrigger>
          <TabsTrigger value="vehicle" className="flex flex-col gap-1 py-3">
            <Car className="h-4 w-4" />
            <span className="text-xs">Fahrzeug</span>
          </TabsTrigger>
        </TabsList>

        {/* Timer Tab */}
        <TabsContent value="timer" className="space-y-4">
          <WorkTimer />
        </TabsContent>

        {/* Mileage Tab */}
        <TabsContent value="mileage" className="space-y-4">
          <MileageTracker />
        </TabsContent>

        {/* Tour Map Tab */}
        <TabsContent value="tour" className="space-y-4">
          <div className="h-[calc(100vh-250px)] min-h-[500px]">
            <TourMapView
              appointments={mapAppointments}
              selectedDate={currentDate}
              isLoading={false}
            />
          </div>
        </TabsContent>

        {/* HufCam Tab */}
        <TabsContent value="hufcam" className="space-y-4">
          <HufCamProStandalone />
        </TabsContent>

        {/* Hufanalyse Tab */}
        <TabsContent value="analyse" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Hufanalyse-Bogen
              </CardTitle>
              <CardDescription>
                Erstelle professionelle Bearbeitungsbögen nach LTZ-Standard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={selectedHorseId || ""} onValueChange={setSelectedHorseId}>
                  <SelectTrigger className="w-full sm:w-[300px]">
                    <SelectValue placeholder="Pferd auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {horses.map((horse) => (
                      <SelectItem key={horse.id} value={horse.id}>
                        {horse.name} {horse.breed ? `(${horse.breed})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={() => setShowWizard(true)} 
                  disabled={!selectedHorseId}
                  className="gap-2"
                >
                  <ClipboardList className="h-4 w-4" />
                  Analyse starten
                </Button>
              </div>
            </CardContent>
          </Card>

          {selectedHorseId && selectedHorse && (
            <LTZAnalysisHistory horseId={selectedHorseId} horseName={selectedHorse.name} />
          )}

          {selectedHorse && (
            <LTZAnalysisWizard
              isOpen={showWizard}
              horseId={selectedHorse.id}
              horseName={selectedHorse.name}
              onClose={() => setShowWizard(false)}
            />
          )}
        </TabsContent>

        {/* Vehicle Tab */}
        <TabsContent value="vehicle" className="space-y-4">
          <VehicleManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WorkMode;
