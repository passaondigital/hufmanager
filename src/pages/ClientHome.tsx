import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, MessageSquare, Camera, Calendar, ChevronRight, Sparkles,
} from "lucide-react";

import { motion } from "framer-motion";

// Existing components (preserved)
import { ClientPushPermissionBanner } from "@/components/client/ClientPushPermissionBanner";
import { UnconfirmedAppointmentsBanner } from "@/components/UnconfirmedAppointmentsBanner";
import { PostAppointmentReviewPrompt } from "@/components/client/PostAppointmentReviewPrompt";
import { HorseTipsWidget } from "@/components/client/HorseTipsWidget";
import { HorseIntervalReminderWidget } from "@/components/client/HorseIntervalReminderWidget";
import { HorseTransferReceive } from "@/components/client/HorseTransferReceive";
import { ServiceOrderList } from "@/components/client/ServiceOrderList";
import { ConnectedProviderCard } from "@/components/client/ConnectedProviderCard";
import { PendingConnectionRequests } from "@/components/network/PendingConnectionRequests";
import { MyConnectionRequests } from "@/components/network/MyConnectionRequests";
import { ConnectionSearch } from "@/components/network/ConnectionSearch";
import { ProviderSelector } from "@/components/client/ProviderSelector";
import { CreateHorseModal } from "@/components/horse-detail/CreateHorseModal";
import { ClientOnboarding } from "@/components/client/ClientOnboarding";
import { MandatoryHorseModal } from "@/components/onboarding/MandatoryHorseModal";
import { HMCamModal } from "@/components/hufcam";

import { NotificationBell } from "@/components/notifications/NotificationBell";
import { DemoTourButton } from "@/components/demo/DemoTourButton";
import { DemoModeIndicator } from "@/components/demo/DemoModeIndicator";
import { useBusinessUpgradeHint } from "@/hooks/useBusinessUpgradeHint";
import { BusinessUpgradeHint } from "@/components/client/BusinessUpgradeHint";
import { BusinessRegistrationForm } from "@/components/auth/BusinessRegistrationForm";
import { ServiceHistoryWidget } from "@/components/client/ServiceHistoryWidget";

// New shared dashboard components
import { DashboardHero, KpiGrid, NextAppointmentCard, QuickActionBar, SectionHeader } from "@/components/dashboard-zones";

interface Horse {
  id: string;
  name: string;
  breed: string | null;
  photo_url: string | null;
  color: string | null;
  nickname: string | null;
}

interface EmergencyContact {
  role: string;
  name: string;
  phone: string;
}

interface Profile {
  full_name: string | null;
  emergency_contacts: EmergencyContact[];
}

function ClientKpiGrid({ horses, userId }: { horses: Horse[]; userId?: string }) {
  const { data: openOrdersCount = 0 } = useQuery({
    queryKey: ["client-open-orders", userId],
    queryFn: async () => {
      const { count } = await supabase
        .from("service_orders")
        .select("*", { count: "exact", head: true })
        .eq("client_id", userId!)
        .in("order_status", ["pending", "open", "in_progress"]);
      return count ?? 0;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  const { data: completedCount = 0 } = useQuery({
    queryKey: ["client-completed-services", userId],
    queryFn: async () => {
      const { count } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("client_id", userId!)
        .eq("status", "completed");
      return count ?? 0;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  const { data: healthStatus = "unknown" as string } = useQuery({
    queryKey: ["client-health-status", userId, horses.map(h => h.id).join(",")],
    queryFn: async (): Promise<string> => {
      if (horses.length === 0) return "none";
      const horseIds = horses.map(h => h.id);
      // Check horse_health_logs for any warning/critical entries
      const { data: logs } = await supabase
        .from("horse_health_logs")
        .select("wellbeing")
        .in("horse_id", horseIds)
        .order("date", { ascending: false })
        .limit(horseIds.length);
      if (!logs || logs.length === 0) return "healthy";
      const hasWarning = logs.some(l => (l.wellbeing ?? 100) < 70);
      return hasWarning ? "warning" : "healthy";
    },
    enabled: !!userId && horses.length > 0,
    staleTime: 120_000,
  });

  return (
    <KpiGrid items={[
      {
        icon: "🐴",
        label: "Meine Pferde",
        value: horses.length,
        sub: horses.length === 0 ? "Noch keine"
          : healthStatus === "warning" ? "Befund vorhanden"
          : `${horses.length} Pferd${horses.length !== 1 ? "e" : ""}`,
        highlight: true,
      },
      {
        icon: "📋",
        label: "Aufträge",
        value: openOrdersCount,
        sub: openOrdersCount > 0 ? `${openOrdersCount} offen` : "Keine offenen",
      },
      {
        icon: "✅",
        label: "Bearbeitungen",
        value: completedCount,
        sub: "Gesamt",
      },
      {
        icon: "❤",
        label: "Gesundheit",
        value: "●",
        valueClassName: healthStatus === "warning" ? "text-yellow-500" : "text-green-500",
        sub: healthStatus === "healthy" ? "Alles stabil"
          : healthStatus === "warning" ? "Befund offen"
          : healthStatus === "none" ? "Keine Pferde"
          : "Unbekannt",
        warning: healthStatus === "warning",
      },
    ]} />
  );
}

export default function ClientHome() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [horses, setHorses] = useState<Horse[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [hasProvider, setHasProvider] = useState<boolean | null>(null);
  const [showConnectionSearch, setShowConnectionSearch] = useState(false);
  const [showMandatoryHorseModal, setShowMandatoryHorseModal] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [showHMCamModal, setShowHMCamModal] = useState(false);
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const { showHint, checkAfterHorseCreation, dismiss: dismissHint } = useBusinessUpgradeHint();

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, emergency_contacts, has_logged_in")
      .eq("id", user.id)
      .maybeSingle();

    if (profileData) {
      let parsedContacts: EmergencyContact[] = [];
      if (profileData.emergency_contacts && Array.isArray(profileData.emergency_contacts)) {
        parsedContacts = profileData.emergency_contacts as unknown as EmergencyContact[];
      }
      setProfile({ full_name: profileData.full_name, emergency_contacts: parsedContacts });
      if (!profileData.has_logged_in) {
        setIsFirstLogin(true);
        await supabase.from("profiles").update({ has_logged_in: true }).eq("id", user.id);
      }
    }

    const { data: grants } = await supabase
      .from("access_grants")
      .select("provider_id")
      .eq("client_id", user.id)
      .eq("status", "active")
      .eq("is_active", true)
      .limit(1);

    setHasProvider((grants && grants.length > 0) || false);

    const { data: horsesData, error } = await supabase
      .from("horses")
      .select("id, name, breed, photo_url, color, nickname")
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .order("name");

    if (!error && horsesData) {
      setHorses(horsesData);
      if (isFirstLogin && horsesData.length === 0) setShowMandatoryHorseModal(true);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  useEffect(() => {
    if (!loading && isFirstLogin && horses.length === 0 && !showOnboarding) {
      setShowMandatoryHorseModal(true);
    }
  }, [loading, isFirstLogin, horses.length, showOnboarding]);

  const handleLogout = async () => { await signOut(); navigate("/auth"); };
  const handleHorseCreated = (horseId: string) => {
    setShowMandatoryHorseModal(false);
    fetchData();
    checkAfterHorseCreation();
    navigate(`/client-horse/${horseId}`);
  };

  const firstName = profile?.full_name?.split(" ")[0] || "Kunde";

  if (authLoading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background gap-6">
        <img src="/hufmanager-logo.png" alt="HufManager" className="h-24 w-auto animate-pulse" />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      {showMandatoryHorseModal && !showOnboarding && (
        <MandatoryHorseModal open={showMandatoryHorseModal} onComplete={handleHorseCreated} />
      )}
      {showOnboarding && <ClientOnboarding onComplete={completeOnboarding} />}

      <div className="min-h-[100dvh] bg-gradient-to-b from-background via-background to-muted/20 overflow-safe">

        {/* Main Content */}
        <main className="px-4 py-6 max-w-lg mx-auto space-y-5 pb-safe" style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}>

          {/* === Compact Banners (non-intrusive) === */}
          <ClientPushPermissionBanner />
          <UnconfirmedAppointmentsBanner />
          <PostAppointmentReviewPrompt />
          <HorseIntervalReminderWidget />
          <HorseTransferReceive />

          {/* ══════════════════════════════════════ */}
          {/* ZONE 1 — HERO                         */}
          {/* ══════════════════════════════════════ */}
          <DashboardHero
            name={profile?.full_name}
            subtitle="Dein Pferdeplaner auf einen Blick"
          >
            {/* Next Appointment */}
            {user && (
              <NextAppointmentCard
                userId={user.id}
                role="client"
                onNavigate={() => navigate("/client-booking")}
              />
            )}

            {/* Quick Actions */}
            <QuickActionBar actions={[
              { key: "chat", label: "Chat", icon: MessageSquare, primary: true, onClick: () => navigate("/client-chat") },
              { key: "buchen", label: "Buchen", icon: Calendar, onClick: () => navigate("/client-booking") },
              { key: "foto", label: "HufCam", icon: Camera, onClick: () => setShowHMCamModal(true) },
            ]} />
          </DashboardHero>

          {/* ══════════════════════════════════════ */}
          {/* ZONE 2 — KPI GRID                     */}
          {/* ══════════════════════════════════════ */}
          <ClientKpiGrid horses={horses} userId={user?.id} />

          {/* ══════════════════════════════════════ */}
          {/* ZONE 3 — DETAIL SECTIONS              */}
          {/* ══════════════════════════════════════ */}

          {/* 3a: Meine Pferde (horizontal scroll) */}
          <div>
            <SectionHeader
              title="Meine Pferde"
              badge={horses.length}
              linkLabel="Alle"
              onLinkClick={() => {/* scroll to full list */}}
            />

            {loading ? (
              <div className="flex gap-2.5 overflow-hidden">
                {[1, 2].map(i => <Skeleton key={i} className="h-28 min-w-[140px] rounded-xl" />)}
              </div>
            ) : horses.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full py-8 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 text-center hover:bg-primary/10 transition-colors"
                >
                  <Plus className="h-6 w-6 mx-auto text-primary mb-2" />
                  <p className="text-sm font-medium text-primary">Erstes Pferd anlegen</p>
                </button>
              </motion.div>
            ) : (
              <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
                {horses.map(horse => (
                  <button
                    key={horse.id}
                    onClick={() => navigate(`/client-horse/${horse.id}`)}
                    className="min-w-[140px] rounded-xl border border-border bg-card p-3 text-left hover:shadow-md hover:border-primary/30 transition-all active:scale-[0.98] flex-shrink-0"
                  >
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden mb-2">
                      {horse.photo_url ? (
                        <img src={horse.photo_url} alt={horse.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-lg">🐴</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-foreground truncate">{horse.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {horse.breed || horse.color || "—"}
                    </p>
                  </button>
                ))}
                {/* Add card */}
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="min-w-[100px] rounded-xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors flex-shrink-0"
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-[10px]">Hinzufügen</span>
                </button>
              </div>
            )}
          </div>

          {/* 3b: Service Orders */}
          <ServiceOrderList />

          {/* 3c: Tips */}
          <HorseTipsWidget />

          {/* 3d: Provider Connection */}
          <PendingConnectionRequests userType="client" onStatusChanged={fetchData} />
          <MyConnectionRequests />

          {hasProvider === true && <ConnectedProviderCard />}

          {hasProvider === false && (
            <div className="space-y-3">
              <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-5 text-center">
                <Sparkles className="h-8 w-8 mx-auto text-primary mb-2" />
                <h3 className="font-semibold text-foreground mb-1">Hufbearbeiter verbinden</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Suche deinen Hufbearbeiter, um Termine zu buchen und Pferdeakten zu teilen.
                </p>
              </div>
              <ConnectionSearch searchType="provider" onConnectionRequested={fetchData} />
              <ProviderSelector onProviderConnected={fetchData} />
            </div>
          )}

          {/* 3e: Service History */}
          {user && <ServiceHistoryWidget userId={user.id} />}
        </main>

        

        {/* Modals */}
        <CreateHorseModal open={showCreateModal} onClose={() => setShowCreateModal(false)} onCreated={handleHorseCreated} />
        <HMCamModal
          open={showHMCamModal}
          onOpenChange={setShowHMCamModal}
          onComplete={(photos) => toast.success(`${photos.length} Huf-Foto${photos.length > 1 ? "s" : ""} aufgenommen!`)}
          mode="client"
        />
        <BusinessUpgradeHint
          open={showHint}
          onClose={dismissHint}
          onUpgrade={() => { dismissHint(); setShowBusinessForm(true); }}
        />
        {showBusinessForm && (
          <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <BusinessRegistrationForm onComplete={() => setShowBusinessForm(false)} onSkip={() => setShowBusinessForm(false)} />
          </div>
        )}
      </div>
    </>
  );
}
