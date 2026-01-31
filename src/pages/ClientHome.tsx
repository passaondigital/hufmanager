import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useTheme } from "@/components/ThemeProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  LogOut, FileText, ChevronRight, Plus, Shield, Scissors, User, 
  MessageSquare, Moon, Sun, Bell, Camera, Heart, Calendar,
  Sparkles, Star, TrendingUp, Clock
} from "lucide-react";
import { UnconfirmedAppointmentsBanner } from "@/components/UnconfirmedAppointmentsBanner";
import { CreateHorseModal } from "@/components/horse-detail/CreateHorseModal";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { MandatoryHorseModal } from "@/components/onboarding/MandatoryHorseModal";
import { UpcomingAppointmentsList } from "@/components/client/UpcomingAppointmentsList";
import { LastVisitWidget } from "@/components/client/LastVisitWidget";
import { EmergencyVetWidget } from "@/components/client/EmergencyVetWidget";
import { AppointmentChecklistWidget } from "@/components/client/AppointmentChecklistWidget";
import { PushNotificationBanner } from "@/components/notifications/PushNotificationBanner";
import { ServiceHistoryWidget } from "@/components/client/ServiceHistoryWidget";
import { ProviderSelector } from "@/components/client/ProviderSelector";
import { ConnectedProviderCard } from "@/components/client/ConnectedProviderCard";
import { PendingConnectionRequests } from "@/components/network/PendingConnectionRequests";
import { ConnectionSearch } from "@/components/network/ConnectionSearch";
import { MyConnectionRequests } from "@/components/network/MyConnectionRequests";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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

export default function ClientHome() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { showOnboarding, completeOnboarding, isLoading: onboardingLoading } = useOnboarding();
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

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    
    // Fetch profile with emergency contacts and check if first login
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, emergency_contacts, has_logged_in")
      .eq("id", user.id)
      .maybeSingle();
    
    if (profileData) {
      let parsedContacts: EmergencyContact[] = [];
      if (profileData.emergency_contacts && Array.isArray(profileData.emergency_contacts)) {
        parsedContacts = (profileData.emergency_contacts as unknown as EmergencyContact[]);
      }
      setProfile({
        full_name: profileData.full_name,
        emergency_contacts: parsedContacts,
      });
      
      // Check if this is first login (has_logged_in was false or null)
      if (!profileData.has_logged_in) {
        setIsFirstLogin(true);
        // Mark as logged in
        await supabase.from("profiles").update({ has_logged_in: true }).eq("id", user.id);
      }
    }
    
    // Check if client has a connected provider (status='active' AND is_active=true)
    const { data: grants } = await supabase
      .from("access_grants")
      .select("provider_id")
      .eq("client_id", user.id)
      .eq("status", "active")
      .eq("is_active", true)
      .limit(1);
    
    setHasProvider((grants && grants.length > 0) || false);

    // Fetch horses - explicitly filter deleted_at for RLS compatibility
    const { data: horsesData, error } = await supabase
      .from("horses")
      .select("id, name, breed, photo_url, color, nickname")
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .order("name");
    
    console.log("Horses query for user", user.id, "result:", horsesData, "error:", error);

    if (!error && horsesData) {
      setHorses(horsesData);
      
      // Show mandatory horse modal if first login AND no horses
      if (isFirstLogin && horsesData.length === 0) {
        setShowMandatoryHorseModal(true);
      }
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);
  
  // Show mandatory horse modal after initial data load if conditions met
  useEffect(() => {
    if (!loading && isFirstLogin && horses.length === 0 && !showOnboarding) {
      setShowMandatoryHorseModal(true);
    }
  }, [loading, isFirstLogin, horses.length, showOnboarding]);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleHorseCreated = (horseId: string) => {
    setShowMandatoryHorseModal(false);
    fetchData();
    navigate(`/client-horse/${horseId}`);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
        <img 
          src="/hufmanager-logo.png" 
          alt="HufManager" 
          className="h-24 w-auto animate-pulse"
        />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const firstName = profile?.full_name?.split(" ")[0] || "Kunde";

  return (
    <>
      {/* Mandatory Horse Modal - non-skippable */}
      {showMandatoryHorseModal && !showOnboarding && (
        <MandatoryHorseModal
          open={showMandatoryHorseModal}
          onComplete={handleHorseCreated}
        />
      )}

      {/* Onboarding Wizard */}
      {showOnboarding && (
        <OnboardingWizard 
          onComplete={completeOnboarding}
          onSkip={completeOnboarding}
        />
      )}

      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 overflow-safe">
        {/* Modern Header with glassmorphism + safe area */}
        <header 
          className="sticky top-0 z-20 bg-background/70 backdrop-blur-xl border-b border-border/50"
          style={{ paddingTop: "max(env(safe-area-inset-top), 0.5rem)" }}
        >
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="/hufmanager-logo.png" 
                alt="HufManager" 
                className="h-9 w-auto"
              />
              <Badge variant="secondary" className="text-xs font-medium hidden sm:flex">
                <Sparkles className="h-3 w-3 mr-1" />
                Pferdeportal
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative h-10 w-10 min-w-[40px]"
                onClick={() => navigate("/client-chat")}
              >
                <MessageSquare className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 min-w-[40px]" onClick={toggleTheme}>
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 min-w-[40px]" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main content with safe bottom padding */}
        <main className="px-4 py-6 max-w-lg mx-auto space-y-6 pb-safe" style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}>
          {/* Push Notification Banner */}
          <PushNotificationBanner />

          {/* Unconfirmed Appointments Banner */}
          <UnconfirmedAppointmentsBanner />

          {/* Hero Greeting with animation */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <h1 className="text-responsive-h2 text-foreground tracking-tight">
              Hallo {firstName}! 👋
            </h1>
            <p className="text-muted-foreground text-base md:text-lg">
              Dein Pferdeportal auf einen Blick
            </p>
          </motion.div>

          {/* Quick Stats Cards */}
          {horses.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-3 gap-3"
            >
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{horses.length}</div>
                  <div className="text-xs text-muted-foreground">Pferde</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                <CardContent className="p-4 text-center">
                  <Heart className="h-5 w-5 mx-auto text-green-600 mb-1" />
                  <div className="text-xs text-muted-foreground">Gesund</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                <CardContent className="p-4 text-center">
                  <Calendar className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                  <div className="text-xs text-muted-foreground">Termine</div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Emergency Vet Widget */}
          {profile?.emergency_contacts && profile.emergency_contacts.length > 0 && (
            <EmergencyVetWidget contacts={profile.emergency_contacts} />
          )}

          {/* Pending Connection Requests - Client needs to approve */}
          <PendingConnectionRequests 
            userType="client" 
            onStatusChanged={fetchData}
          />

          {/* My Sent Requests */}
          <MyConnectionRequests />

          {/* Connected Provider Card - show if provider connected */}
          {hasProvider === true && <ConnectedProviderCard />}

          {/* Provider Search - show if no provider connected */}
          {hasProvider === false && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
                <CardContent className="p-6 text-center">
                  <Sparkles className="h-10 w-10 mx-auto text-primary mb-3" />
                  <h3 className="font-semibold text-lg mb-2">Verbinde dich mit deinem Hufbearbeiter</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Suche nach deinem Hufbearbeiter, um Termine zu buchen und deine Pferdeakten zu teilen.
                  </p>
                </CardContent>
              </Card>
              <ConnectionSearch 
                searchType="provider" 
                onConnectionRequested={fetchData}
              />
              <ProviderSelector onProviderConnected={fetchData} />
            </motion.div>
          )}

          {/* Upcoming Appointments List */}
          {user && <UpcomingAppointmentsList userId={user.id} />}

          {/* Appointment Checklist Widget */}
          {user && <AppointmentChecklistWidget userId={user.id} />}

          {/* Service History Widget */}
          {user && <ServiceHistoryWidget userId={user.id} />}

          {/* Last Visit Widget */}
          {user && <LastVisitWidget userId={user.id} />}

          {/* Horses List - Modern Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                🐴 Meine Pferde
                <Badge variant="secondary">{horses.length}</Badge>
              </h2>
              <Button 
                variant="default"
                size="sm"
                className="gap-2 shadow-lg"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="h-4 w-4" />
                Neues Pferd
              </Button>
            </div>
          </motion.div>

          {/* Quick Actions - Mobile optimized grid */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-3 gap-2 sm:gap-3"
          >
            {/* HM-CAM Primary Button */}
            <Button 
              variant="default" 
              className="h-20 sm:h-24 flex-col gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg min-h-[44px] col-span-3"
              onClick={() => {
                // TODO: Open HM-CAM capture modal
                toast.info("HM-CAM wird geladen...");
              }}
            >
              <Camera className="h-6 w-6 sm:h-7 sm:w-7" />
              <span className="text-sm sm:text-base font-semibold">HM-CAM starten</span>
              <span className="text-[9px] sm:text-[10px] opacity-80">HufManager Cam Technology</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-14 sm:h-16 flex-col gap-1 rounded-xl hover:bg-primary/10 hover:border-primary/30 transition-all min-h-[44px]"
              onClick={() => navigate("/client-chat")}
            >
              <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <span className="text-[9px] sm:text-[10px]">Chat</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-14 sm:h-16 flex-col gap-1 rounded-xl hover:bg-primary/10 hover:border-primary/30 transition-all min-h-[44px]"
              onClick={() => navigate("/client-booking")}
            >
              <Scissors className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <span className="text-[9px] sm:text-[10px]">Buchen</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-14 sm:h-16 flex-col gap-1 rounded-xl hover:bg-primary/10 hover:border-primary/30 transition-all min-h-[44px]"
              onClick={() => navigate("/client-invoices")}
            >
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <span className="text-[9px] sm:text-[10px]">Rechnung</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-14 sm:h-16 flex-col gap-1 rounded-xl hover:bg-primary/10 hover:border-primary/30 transition-all min-h-[44px]"
              onClick={() => navigate("/client-permissions")}
            >
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <span className="text-[9px] sm:text-[10px]">Daten</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-14 sm:h-16 flex-col gap-1 rounded-xl hover:bg-primary/10 hover:border-primary/30 transition-all min-h-[44px]"
              onClick={() => navigate("/client-profile")}
            >
              <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <span className="text-[9px] sm:text-[10px]">Profil</span>
            </Button>
          </motion.div>


        {/* Horses List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Meine Pferde ({horses.length})
            </h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Neues Pferd
            </Button>
          </div>
          
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : horses.length === 0 ? (
            <Card className="overflow-hidden">
              <CardContent className="p-8 text-center">
                <div className="text-4xl mb-3">🐴</div>
                <p className="text-muted-foreground">
                  Noch keine Pferde vorhanden
                </p>
                <Button 
                  className="mt-4"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Erstes Pferd anlegen
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {horses.map((horse) => (
                <Card 
                  key={horse.id} 
                  className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
                  onClick={() => navigate(`/client-horse/${horse.id}`)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                      {horse.photo_url ? (
                        <img 
                          src={horse.photo_url} 
                          alt={horse.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl">🐴</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">
                        {horse.name}
                        {horse.nickname && (
                          <span className="text-muted-foreground font-normal"> „{horse.nickname}"</span>
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {[horse.breed, horse.color].filter(Boolean).join(" • ") || "Keine Details"}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Horse Modal */}
      <CreateHorseModal 
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleHorseCreated}
      />
      </div>
    </>
  );
}
