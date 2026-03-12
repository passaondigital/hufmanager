import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  History, Image, Activity, FileText, Camera, Clock, Users, Syringe, Footprints, 
  ChevronDown, ChevronUp, Info, FolderOpen
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

import { TabSteckbrief } from "@/components/horse-detail/TabSteckbrief";
import { TabHistorie } from "@/components/horse-detail/TabHistorie";
import { TabMediaVault } from "@/components/horse-detail/TabMediaVault";
import { TabGesundheit } from "@/components/horse-detail/TabGesundheit";
import { TabDokumente } from "@/components/horse-detail/TabDokumente";
import { TabHufHistorie } from "@/components/horse-detail/TabHufHistorie";
import { TabImpfungEntwurmung } from "@/components/horse-detail/TabImpfungEntwurmung";
import { TabAktivitaeten } from "@/components/horse-detail/TabAktivitaeten";
import { EditHorseModal } from "@/components/horse-detail/EditHorseModal";
import { LTZAnalysisHistory } from "@/components/hoof-analysis/LTZAnalysisHistory";
import { HufCamPro } from "@/components/hufcam/HufCamPro";
import { HoofStatusGrid } from "@/components/horse-detail/HoofStatusGrid";
import { HoofPhotoTimeline } from "@/components/horse-detail/HoofPhotoTimeline";
import { HorsePartnerPanel } from "@/components/horse-detail/HorsePartnerPanel";
import { HorseDetailHero } from "@/components/horse-detail/HorseDetailHero";
import { HorseDetailStats } from "@/components/horse-detail/HorseDetailStats";
import { logHorseAction } from "@/utils/auditLog";
import type { Horse, Appointment, HoofPhoto, HorseDocument, HoofDetails } from "@/components/horse-detail/types";

interface OwnerProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

const TABS = [
  { value: "historie", label: "Historie", icon: Clock },
  { value: "steckbrief", label: "Steckbrief", icon: FileText },
  { value: "foto-timeline", label: "Fotos", icon: Camera },
  { value: "huf-doku", label: "HufCam", icon: Camera },
  { value: "huf-historie", label: "Huf", icon: Footprints },
  { value: "medien", label: "Medien", icon: Image },
  { value: "gesundheit", label: "Gesundheit", icon: Activity },
  { value: "impfung-entwurmung", label: "Impfung", icon: Syringe },
  { value: "dokumente", label: "Doku", icon: FolderOpen },
  { value: "partner", label: "Partner", icon: Users },
  { value: "aktivitaeten", label: "Aktivitäten", icon: Activity },
] as const;

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
  
  const defaultTab = searchParams.get("tab") || "historie";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [latestVisitExpanded, setLatestVisitExpanded] = useState(true);

  // Audit logging on tab change
  useEffect(() => {
    if (!id) return;
    const auditMap: Record<string, string> = {
      steckbrief: "view_basic",
      gesundheit: "view_medical",
      "huf-historie": "view_hoof_history",
      medien: "view_documents",
      dokumente: "view_documents",
      "impfung-entwurmung": "view_vaccinations",
    };
    const actionType = auditMap[activeTab];
    if (actionType) {
      logHorseAction(id, actionType);
    }
  }, [activeTab, id]);

  const fetchHorseData = async () => {
    if (!user || !id) return;
    setLoading(true);

    try {
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

      const hasAccess = await verifyProviderAccess(horseData.owner_id);
      if (!hasAccess) {
        toast.error("Keine Berechtigung für dieses Pferd");
        navigate("/");
        return;
      }

      setHorse(horseData as unknown as Horse);

      const { data: ownerData } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .eq("id", horseData.owner_id)
        .single();
      
      setOwner(ownerData);

      const { data: appointmentsData } = await supabase
        .from("appointments")
        .select("*")
        .eq("horse_id", id)
        .eq("provider_id", user.id)
        .order("date", { ascending: false });

      setAppointments((appointmentsData || []) as Appointment[]);

      const { data: hoofPhotosData } = await supabase
        .from("hoof_photos")
        .select("*")
        .eq("horse_id", id)
        .order("taken_at", { ascending: false });

      setHoofPhotos((hoofPhotosData || []) as HoofPhoto[]);

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("created_by_provider_id")
      .eq("id", ownerId)
      .single();

    if (profile?.created_by_provider_id === user.id) return true;

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

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  if (authLoading || loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="rounded-2xl bg-card p-5 space-y-4">
          <Skeleton className="h-5 w-20" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-[72px] w-[72px] rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
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
    <div className="space-y-4 animate-fade-in">
      {/* Hero Banner */}
      <HorseDetailHero horse={horse} />

      {/* Stats Row - overlaps hero */}
      <HorseDetailStats
        appointmentsCount={appointments.length}
        hoofPhotosCount={hoofPhotos.length}
        documentsCount={documents.length}
      />

      {/* Hoof Status Grid */}
      <HoofStatusGrid
        hoofDetails={horse.hoof_details as HoofDetails}
        lastAppointmentDate={horse.last_appointment_date || latestAppointment?.date}
        shoeingInterval={horse.shoeing_interval}
        horseName={horse.name}
        horseId={horse.id}
      />

      {/* Latest Visit Quick View */}
      {activeTab === "historie" && latestAppointment && (
        <Collapsible open={latestVisitExpanded} onOpenChange={setLatestVisitExpanded}>
          <Card className="border-primary/30 bg-primary/5">
            <CollapsibleTrigger asChild>
              <CardContent className="p-4 cursor-pointer hover:bg-primary/10 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-primary font-medium uppercase tracking-wide">Letzter Besuch</p>
                    <p className="font-semibold text-foreground">
                      {new Date(latestAppointment.date).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                    </p>
                    <p className="text-sm text-muted-foreground">{latestAppointment.service_type || "Allgemeiner Termin"}</p>
                  </div>
                  {latestVisitExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                </div>
              </CardContent>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 px-4 pb-4 border-t border-border/50">
                {latestAppointment.notes ? (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-1">Notizen:</p>
                    <p className="text-sm text-foreground">{latestAppointment.notes}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-3 italic">Keine Notizen vorhanden</p>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Scrollable Tab Navigation */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border -mx-4 px-4 sm:-mx-6 sm:px-6">
        <div className="flex overflow-x-auto gap-1 py-3 scrollbar-hide">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors flex-shrink-0",
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/30 font-medium"
                    : "text-muted-foreground hover:bg-secondary"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="min-h-[200px]">
        {activeTab === "historie" && (
          <TabHistorie appointments={appointments} horseId={horse.id} />
        )}
        {activeTab === "steckbrief" && (
          <TabSteckbrief horse={horse} onEdit={() => setShowEditModal(true)} />
        )}
        {activeTab === "foto-timeline" && (
          <HoofPhotoTimeline horseId={horse.id} horseName={horse.name} />
        )}
        {activeTab === "huf-doku" && (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">HufCam Pro</h3>
              <p className="text-sm text-muted-foreground">Fotografiere alle 4 Hufe mit dem geführten Wizard</p>
            </div>
            <HufCamPro 
              horseName={horse.name}
              horseId={horse.id}
              onCollageGenerated={() => toast.success("Collage erfolgreich erstellt")}
            />
          </div>
        )}
        {activeTab === "huf-historie" && (
          <TabHufHistorie horseId={horse.id} horseName={horse.name} />
        )}
        {activeTab === "medien" && (
          <TabMediaVault horseId={horse.id} />
        )}
        {activeTab === "gesundheit" && (
          <>
            <TabGesundheit horse={horse} onEdit={() => setShowEditModal(true)} />
            <div className="mt-6">
              <LTZAnalysisHistory 
                horseId={horse.id} 
                horseName={horse.name}
                ownerName={owner?.full_name || undefined}
              />
            </div>
          </>
        )}
        {activeTab === "impfung-entwurmung" && (
          <TabImpfungEntwurmung horseId={horse.id} />
        )}
        {activeTab === "dokumente" && (
          <TabDokumente 
            horseId={horse.id} 
            documents={documents} 
            hoofPhotos={hoofPhotos}
            onRefresh={fetchHorseData}
          />
        )}
        {activeTab === "partner" && (
          <HorsePartnerPanel
            horseId={horse.id}
            horseName={horse.name}
            inviterRole="provider"
          />
        )}
        {activeTab === "aktivitaeten" && (
          <TabAktivitaeten horseId={horse.id} />
        )}
      </div>

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
