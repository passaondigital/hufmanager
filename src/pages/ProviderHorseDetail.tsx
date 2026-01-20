import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Info, History, Image, Activity, FileText, ChevronDown, ChevronUp, Footprints } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { TabSteckbrief } from "@/components/horse-detail/TabSteckbrief";
import { TabHistorie } from "@/components/horse-detail/TabHistorie";
import { TabMediaVault } from "@/components/horse-detail/TabMediaVault";
import { TabGesundheit } from "@/components/horse-detail/TabGesundheit";
import { TabDokumente } from "@/components/horse-detail/TabDokumente";
import { TabHufHistorie } from "@/components/horse-detail/TabHufHistorie";
import { EditHorseModal } from "@/components/horse-detail/EditHorseModal";
import { LTZAnalysisHistory } from "@/components/hoof-analysis/LTZAnalysisHistory";
import type { Horse, Appointment, HoofPhoto, HorseDocument } from "@/components/horse-detail/types";

interface OwnerProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

export default function ProviderHorseDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [horse, setHorse] = useState<Horse | null>(null);
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [hoofPhotos, setHoofPhotos] = useState<HoofPhoto[]>([]);
  const [documents, setDocuments] = useState<HorseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Get tab from URL params, default to "historie" for quick access
  const defaultTab = searchParams.get("tab") || "historie";
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Auto-expand latest visit state
  const [latestVisitExpanded, setLatestVisitExpanded] = useState(true);

  const fetchHorseData = async () => {
    if (!user || !id) return;
    setLoading(true);

    try {
      // Fetch horse (provider can access via access_grants or if horse owner was created by provider)
      const { data: horseData, error: horseError } = await supabase
        .from("horses")
        .select("*")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();

      if (horseError) throw horseError;
      if (!horseData) {
        toast.error("Pferd nicht gefunden");
        navigate("/");
        return;
      }

      // Verify provider has access to this horse
      const hasAccess = await verifyProviderAccess(horseData.owner_id);
      if (!hasAccess) {
        toast.error("Keine Berechtigung für dieses Pferd");
        navigate("/");
        return;
      }

      setHorse(horseData as unknown as Horse);

      // Fetch owner profile
      const { data: ownerData } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .eq("id", horseData.owner_id)
        .single();
      
      setOwner(ownerData);

      // Fetch appointments (sorted by date descending for proper timeline)
      const { data: appointmentsData } = await supabase
        .from("appointments")
        .select("*")
        .eq("horse_id", id)
        .eq("provider_id", user.id)
        .order("date", { ascending: false });

      setAppointments((appointmentsData || []) as Appointment[]);

      // Fetch hoof photos
      const { data: hoofPhotosData } = await supabase
        .from("hoof_photos")
        .select("*")
        .eq("horse_id", id)
        .order("taken_at", { ascending: false });

      setHoofPhotos((hoofPhotosData || []) as HoofPhoto[]);

      // Fetch documents
      const { data: documentsData } = await supabase
        .from("horse_documents")
        .select("*")
        .eq("horse_id", id)
        .order("created_at", { ascending: false });

      setDocuments((documentsData || []) as HorseDocument[]);

    } catch (error: any) {
      console.error("Error fetching horse data:", error);
      toast.error("Fehler beim Laden der Daten");
    } finally {
      setLoading(false);
    }
  };

  const verifyProviderAccess = async (ownerId: string): Promise<boolean> => {
    if (!user) return false;

    // Check if owner was created by this provider
    const { data: profile } = await supabase
      .from("profiles")
      .select("created_by_provider_id")
      .eq("id", ownerId)
      .single();

    if (profile?.created_by_provider_id === user.id) return true;

    // Check if provider has active access grant
    const { data: grant } = await supabase
      .from("access_grants")
      .select("id")
      .eq("provider_id", user.id)
      .eq("client_id", ownerId)
      .eq("is_active", true)
      .in("status", ["active", "pending"])
      .maybeSingle();

    return !!grant;
  };

  useEffect(() => {
    if (user && id) {
      fetchHorseData();
    }
  }, [user, id]);

  // Update tab when URL changes
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  if (authLoading || loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!horse) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Pferd nicht gefunden</p>
          <Button onClick={() => navigate("/")}>Zurück zum Dashboard</Button>
        </div>
      </div>
    );
  }

  const latestAppointment = appointments[0];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with back button and horse info */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <Avatar className="h-12 w-12 ring-2 ring-border">
          <AvatarImage src={horse.photo_url || undefined} alt={horse.name} />
          <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
            {horse.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">{horse.name}</h1>
          <p className="text-sm text-muted-foreground truncate">
            {horse.breed || "Pferd"} {horse.readable_id && `• ${horse.readable_id}`}
            {owner?.full_name && ` • Besitzer: ${owner.full_name}`}
          </p>
        </div>
      </div>

      {/* Quick Stats Card */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{appointments.length}</p>
              <p className="text-xs text-muted-foreground">Termine</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{hoofPhotos.length}</p>
              <p className="text-xs text-muted-foreground">Huffotos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{documents.length}</p>
              <p className="text-xs text-muted-foreground">Dokumente</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Latest Visit Quick View (only on Historie tab) */}
      {activeTab === "historie" && latestAppointment && (
        <Collapsible open={latestVisitExpanded} onOpenChange={setLatestVisitExpanded}>
          <Card className="border-primary/30 bg-primary/5">
            <CollapsibleTrigger asChild>
              <CardContent className="p-4 cursor-pointer hover:bg-primary/10 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-primary font-medium uppercase tracking-wide">
                      Letzter Besuch
                    </p>
                    <p className="font-semibold text-foreground">
                      {new Date(latestAppointment.date).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric"
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {latestAppointment.service_type || "Allgemeiner Termin"}
                    </p>
                  </div>
                  {latestVisitExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardContent>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 px-4 pb-4 border-t border-border/50">
                {latestAppointment.notes && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-1">Notizen:</p>
                    <p className="text-sm text-foreground">{latestAppointment.notes}</p>
                  </div>
                )}
                {!latestAppointment.notes && (
                  <p className="text-sm text-muted-foreground mt-3">Keine Notizen vorhanden</p>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="historie" className="flex items-center gap-1.5">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Historie</span>
          </TabsTrigger>
          <TabsTrigger value="steckbrief" className="flex items-center gap-1.5">
            <Info className="h-4 w-4" />
            <span className="hidden sm:inline">Steckbrief</span>
          </TabsTrigger>
          <TabsTrigger value="huf-historie" className="flex items-center gap-1.5">
            <Footprints className="h-4 w-4" />
            <span className="hidden sm:inline">Huf-Historie</span>
          </TabsTrigger>
          <TabsTrigger value="medien" className="flex items-center gap-1.5">
            <Image className="h-4 w-4" />
            <span className="hidden sm:inline">Medien</span>
          </TabsTrigger>
          <TabsTrigger value="gesundheit" className="flex items-center gap-1.5">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Gesundheit</span>
          </TabsTrigger>
          <TabsTrigger value="dokumente" className="flex items-center gap-1.5">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Dokumente</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="historie">
          <TabHistorie appointments={appointments} horseId={horse.id} />
        </TabsContent>

        <TabsContent value="steckbrief">
          <TabSteckbrief horse={horse} onEdit={() => setShowEditModal(true)} />
        </TabsContent>

        <TabsContent value="huf-historie">
          <TabHufHistorie horseId={horse.id} horseName={horse.name} />
        </TabsContent>

        <TabsContent value="medien">
          <TabMediaVault horseId={horse.id} />
        </TabsContent>

        <TabsContent value="gesundheit">
          <TabGesundheit 
            horse={horse} 
            onEdit={() => setShowEditModal(true)}
          />
          {/* LTZ Analysis History */}
          <div className="mt-6">
            <LTZAnalysisHistory 
              horseId={horse.id} 
              horseName={horse.name}
              ownerName={owner?.full_name || undefined}
            />
          </div>
        </TabsContent>

        <TabsContent value="dokumente">
          <TabDokumente 
            horseId={horse.id} 
            documents={documents} 
            hoofPhotos={hoofPhotos}
            onRefresh={fetchHorseData}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      {showEditModal && (
        <EditHorseModal
          horse={horse}
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false);
            fetchHorseData();
          }}
        />
      )}
    </div>
  );
}
