import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLogout } from "@/hooks/useLogout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, Users, Database, Bug, Activity, Crown, Plus, Zap, Package, BookOpen, Brain, AlertTriangle, PiggyBank, Link2, Globe, ScrollText, Mic, UserPlus } from "lucide-react";
import { toast } from "sonner";

// Admin Views
import { AdminUserDB } from "@/components/admin/AdminUserDB";
import { AdminUserManagement } from "@/components/admin/AdminUserManagement";
import { AdminHorseDB } from "@/components/admin/AdminHorseDB";
import { AdminDevZentrale } from "@/components/admin/AdminDevZentrale";
import { AdminSystemHealth } from "@/components/admin/AdminSystemHealth";
import { AdminQuickNote } from "@/components/admin/AdminQuickNote";
import { AdminProductCatalog } from "@/components/admin/AdminProductCatalog";
import { AdminSystemDoku } from "@/components/admin/AdminSystemDoku";
import { AdminKIDataHub } from "@/components/admin/AdminKIDataHub";
import { AdminRevenue } from "@/components/admin/AdminRevenue";
import { AdminConnections } from "@/components/admin/AdminConnections";
import { AdminHealthDashboard } from "@/components/admin/AdminHealthDashboard";
import { AdminContractManager } from "@/components/admin/AdminContractManager";
import { AdminInvoices } from "@/components/admin/AdminInvoices";
import { AdminDomainPanel } from "@/components/admin/AdminDomainPanel";
import { AffiliateCenter } from "@/components/admin/AffiliateCenter";
import { CooperationCenter } from "@/components/admin/CooperationCenter";
import { HMTeamCenter } from "@/components/admin/HMTeamCenter";
import { EducationCenter } from "@/components/admin/EducationCenter";
import { AdminBotschafterOverview } from "@/components/admin/AdminBotschafterOverview";
import { AdminBotschafterConversions } from "@/components/admin/AdminBotschafterConversions";
import { AdminBotschafterAbrechnungen } from "@/components/admin/AdminBotschafterAbrechnungen";
import { AdminBotschafterWerbemittel } from "@/components/admin/AdminBotschafterWerbemittel";
import { AdminBotschafterRangliste } from "@/components/admin/AdminBotschafterRangliste";
import { AdminBotschafterKommunikation } from "@/components/admin/AdminBotschafterKommunikation";
import { HeartPulse, FileText, Handshake, Building2, UsersRound, GraduationCap, ShieldCheck, ClipboardList } from "lucide-react";
import { AdminVerifications } from "@/components/admin/AdminVerifications";
import { AdminPortalApplications } from "@/components/admin/AdminPortalApplications";
import { AdminPortalCustomers } from "@/components/admin/AdminPortalCustomers";
import { AdminRegistrations } from "@/components/admin/AdminRegistrations";

type AdminView = "users" | "user-mgmt" | "verifications" | "registrations" | "horses" | "dev" | "health" | "catalog" | "docs" | "ki-hub" | "revenue" | "invoices" | "contracts" | "connections" | "domains" | "self-healing" | "affiliates" | "cooperations" | "hm_team" | "education" | "botschafter" | "botschafter-conversions" | "botschafter-abrechnungen" | "botschafter-werbemittel" | "botschafter-rangliste" | "botschafter-kommunikation" | "portal-applications" | "portal-customers";

const NAV_ITEMS: { id: AdminView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "user-mgmt", label: "Nutzer-Verwaltung", icon: Shield },
  { id: "registrations", label: "Registrierungen", icon: UserPlus },
  { id: "verifications", label: "Gewerbe-Verifizierung", icon: ShieldCheck },
  { id: "users", label: "User-DB", icon: Users },
  { id: "horses", label: "Pferde-DB", icon: Database },
  { id: "revenue", label: "Einnahmen", icon: PiggyBank },
  { id: "invoices", label: "Rechnungen", icon: FileText },
  { id: "contracts", label: "Verträge", icon: ScrollText },
  { id: "catalog", label: "Produktkatalog", icon: Package },
  { id: "affiliates", label: "Affiliates", icon: Handshake },
  { id: "cooperations", label: "Kooperationen", icon: Building2 },
  { id: "portal-applications", label: "Portal-Bewerbungen", icon: ClipboardList },
  { id: "portal-customers", label: "Portal-Kunden", icon: Building2 },
  { id: "education", label: "Hufschulen", icon: GraduationCap },
  { id: "hm_team", label: "HM Team", icon: UsersRound },
  { id: "botschafter", label: "Botschafter", icon: Mic },
  { id: "botschafter-conversions", label: "↳ Conversions", icon: Mic },
  { id: "botschafter-abrechnungen", label: "↳ Abrechnungen", icon: Mic },
  { id: "botschafter-werbemittel", label: "↳ Werbemittel", icon: Mic },
  { id: "botschafter-rangliste", label: "↳ Rangliste", icon: Mic },
  { id: "botschafter-kommunikation", label: "↳ Kommunikation", icon: Mic },
  { id: "docs", label: "System & Doku", icon: BookOpen },
  { id: "ki-hub", label: "KI-Daten-Hub", icon: Brain },
  { id: "connections", label: "HM Connect", icon: Link2 },
  { id: "domains", label: "Domains", icon: Globe },
  { id: "dev", label: "Dev-Zentrale", icon: Bug },
  { id: "health", label: "System-Health", icon: Activity },
  { id: "self-healing", label: "Self-Healing", icon: HeartPulse },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const logout = useLogout();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const [activeView, setActiveView] = useState<AdminView>(() => {
    const view = searchParams.get("view");
    return (view as AdminView) || "users";
  });
  const [showQuickNote, setShowQuickNote] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    setSearchParams({ view: activeView });
  }, [activeView, setSearchParams]);

  const checkAdminAccess = async () => {
    if (!user) {
      navigate("/auth?redirect=/admin/god-mode");
      return;
    }

    // Check admin role
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (error) {
      console.error("Error checking admin access:", error);
      setIsAdmin(false);
      return;
    }

    setIsAdmin(!!data);
    
    // Check if master admin
    setIsMasterAdmin(user.email === "kontakt@hufiapp.de");
  };

  const handleViewChange = (view: AdminView) => {
    setActiveView(view);
  };

  // Access denied screen
  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-destructive" />
              Zugriff verweigert
            </CardTitle>
            <CardDescription>
              Du hast keine Berechtigung für diesen Bereich.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/home")} className="w-full">
              Zurück zum Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading screen
  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg">God Mode</h1>
              <p className="text-xs text-muted-foreground">Mission Control</p>
            </div>
          </div>
          {isMasterAdmin && (
            <Badge className="mt-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black">
              <Crown className="w-3 h-3 mr-1" />
              Master Admin
            </Badge>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                activeView === item.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => setShowQuickNote(true)}
          >
            <Plus className="w-4 h-4" />
            Quick Note
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => navigate("/admin/hufi-brain")}
          >
            <Brain className="w-4 h-4" />
            Hufi Brain Wissen
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-destructive hover:text-destructive"
            onClick={() => navigate("/admin/notfall")}
          >
            <AlertTriangle className="w-4 h-4" />
            1. Hilfe Kunden Center
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground"
            onClick={() => navigate("/home")}
          >
            ← Dashboard
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={logout}
          >
            🚪 Ausloggen
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {activeView === "user-mgmt" && <AdminUserManagement />}
        {activeView === "registrations" && <AdminRegistrations />}
        {activeView === "verifications" && <AdminVerifications />}
        {activeView === "users" && <AdminUserDB isMasterAdmin={isMasterAdmin} />}
        {activeView === "horses" && <AdminHorseDB isMasterAdmin={isMasterAdmin} />}
        {activeView === "revenue" && <AdminRevenue />}
        {activeView === "invoices" && <AdminInvoices />}
        {activeView === "contracts" && <AdminContractManager />}
        {activeView === "connections" && <AdminConnections />}
        {activeView === "domains" && <AdminDomainPanel />}
        {activeView === "catalog" && <AdminProductCatalog />}
        {activeView === "docs" && <AdminSystemDoku />}
        {activeView === "ki-hub" && <AdminKIDataHub />}
        {activeView === "dev" && <AdminDevZentrale />}
        {activeView === "health" && <AdminSystemHealth />}
        {activeView === "self-healing" && <AdminHealthDashboard />}
        {activeView === "affiliates" && <AffiliateCenter />}
        {activeView === "cooperations" && <CooperationCenter />}
        {activeView === "hm_team" && <HMTeamCenter />}
        {activeView === "education" && <EducationCenter />}
        {activeView === "botschafter" && <AdminBotschafterOverview />}
        {activeView === "botschafter-conversions" && <AdminBotschafterConversions />}
        {activeView === "botschafter-abrechnungen" && <AdminBotschafterAbrechnungen />}
        {activeView === "botschafter-werbemittel" && <AdminBotschafterWerbemittel />}
        {activeView === "botschafter-rangliste" && <AdminBotschafterRangliste />}
        {activeView === "botschafter-kommunikation" && <AdminBotschafterKommunikation />}
        {activeView === "portal-applications" && <AdminPortalApplications />}
        {activeView === "portal-customers" && <AdminPortalCustomers />}
      </main>

      {/* Quick Note FAB */}
      <AdminQuickNote open={showQuickNote} onOpenChange={setShowQuickNote} />
    </div>
  );
}
