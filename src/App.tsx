import { useState, useEffect, lazy, Suspense } from "react";
import { detectPortalMode } from "@/hooks/usePortalDetection";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useProfileGuardian } from "@/hooks/useProfileGuardian";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PasswordRecoveryRedirect } from "@/components/auth/PasswordRecoveryRedirect";
import { CockpitFullscreenProvider } from "@/components/day-cockpit/CockpitFullscreenContext";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";
import { ProfileGuardianScreen } from "@/components/auth/ProfileGuardianScreen";
import { createIDBPersister } from "@/lib/offline/persister";
import { QUERY_CACHE_MAX_AGE } from "@/lib/offline/offlineConfig";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TourProvider } from "@/components/tour/TourContext";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";

import Index from "@/pages/Index";

// ── KERN-PAGES ────────────────────────────────────────────────────────────────
const NotFound    = lazy(() => import("@/pages/NotFound"));
const Auth        = lazy(() => import("@/pages/Auth"));
const AppLayout   = lazy(() => import("@/components/layout/AppLayout").then((m) => ({ default: m.AppLayout })));
const MobileShell = lazy(() => import("@/components/layout/MobileShell").then((m) => ({ default: m.MobileShell })));

// Auth
const ResetPassword  = lazy(() => import("@/pages/ResetPassword"));
const UpdatePassword = lazy(() => import("@/pages/UpdatePassword"));
const Welcome        = lazy(() => import("@/pages/Welcome"));

// Provider – CRM Kern
const Pferde      = lazy(() => import("@/pages/Pferde"));
const Kalender    = lazy(() => import("@/pages/Kalender"));
const Kunden      = lazy(() => import("@/pages/Kunden"));
const Rechnungen  = lazy(() => import("@/pages/Rechnungen"));
const MeinAngebot = lazy(() => import("@/pages/MeinAngebot"));
const Anfragen    = lazy(() => import("@/pages/Anfragen"));
const Aufnahme    = lazy(() => import("@/pages/Aufnahme"));
const Tour        = lazy(() => import("@/pages/Tour"));
const Lager       = lazy(() => import("@/pages/Lager"));
const BhsBalanceCockpit = lazy(() => import("@/pages/BhsBalanceCockpit"));
const BhsLandingPage    = lazy(() => import("@/pages/BhsLandingPage"));
const ProviderHorseDetail = lazy(() => import("@/pages/ProviderHorseDetail"));
const EmergencyDashboard  = lazy(() => import("@/pages/EmergencyDashboard"));

// Provider – Business-Features (Finanzen, Kommunikation, Arbeit)
const GuV         = lazy(() => import("@/pages/GuV"));
const Buchhaltung = lazy(() => import("@/pages/Buchhaltung"));
const Ausgaben    = lazy(() => import("@/pages/Ausgaben"));
const WorkMode    = lazy(() => import("@/pages/WorkMode"));
const Chat        = lazy(() => import("@/pages/Chat"));
const Business    = lazy(() => import("@/pages/Business"));
const Archiv      = lazy(() => import("@/pages/Archiv"));
const MeinOffice  = lazy(() => import("@/pages/MeinOffice"));
const OfficeEditor = lazy(() => import("@/pages/OfficeEditor"));
const Analyse     = lazy(() => import("@/pages/Analyse"));
const AnalyseHub  = lazy(() => import("@/pages/AnalyseHub"));
const Auffassen   = lazy(() => import("@/pages/Auffassen"));
const AuffassenHub = lazy(() => import("@/pages/AuffassenHub"));
const Fuhrpark    = lazy(() => import("@/pages/Fuhrpark"));
const Team        = lazy(() => import("@/pages/Team"));

// Provider – Management
const ManagementHub         = lazy(() => import("@/pages/ManagementHub"));
const ManagementProfil      = lazy(() => import("@/pages/management/ManagementProfil"));
const ManagementAbo         = lazy(() => import("@/pages/management/ManagementAbo"));
const AboSettings           = lazy(() => import("@/pages/settings/AboSettings"));
const ManagementRechtliches = lazy(() => import("@/pages/management/ManagementRechtliches"));
const ManagementSteuer      = lazy(() => import("@/pages/management/ManagementSteuer"));
const ManagementBusinessHub = lazy(() => import("@/pages/management/ManagementBusinessHub"));
const ManagementSicherheit  = lazy(() => import("@/pages/management/ManagementSicherheit"));
const ManagementKommunikation = lazy(() => import("@/pages/management/ManagementKommunikation"));
const ManagementWebsite       = lazy(() => import("@/pages/management/ManagementWebsite"));
const ImportCenter  = lazy(() => import("@/pages/ImportCenter"));
const Support       = lazy(() => import("@/pages/Support"));

// Client (Pferdebesitzer)
const ClientAppLayout     = lazy(() => import("@/components/client/ClientAppLayout").then(m => ({ default: m.ClientAppLayout })));
const ClientHome          = lazy(() => import("@/pages/ClientHome"));
const ClientHorseDetail   = lazy(() => import("@/pages/ClientHorseDetail"));
const ClientInvoices      = lazy(() => import("@/pages/ClientInvoices"));
const ClientBhsAbo        = lazy(() => import("@/pages/ClientBhsAbo"));
const ClientPermissions   = lazy(() => import("@/pages/ClientPermissions"));
const ClientBooking       = lazy(() => import("@/pages/ClientBooking"));
const ClientProfile       = lazy(() => import("@/pages/ClientProfile"));
const ClientAccountType   = lazy(() => import("@/pages/ClientAccountType"));
const ClientHorses        = lazy(() => import("@/pages/ClientHorses"));
const ClientNotifications = lazy(() => import("@/pages/ClientNotifications"));
const ClientOrders        = lazy(() => import("@/pages/client/ClientOrders"));
const ClientChat          = lazy(() => import("@/pages/ClientChat"));
const ClientNetwork       = lazy(() => import("@/pages/client/ClientNetwork"));
const ClientMarketplace   = lazy(() => import("@/pages/client/ClientMarketplace"));
const ClientMarketplaceCreate = lazy(() => import("@/pages/client/ClientMarketplaceCreate"));
const ClientMyListings    = lazy(() => import("@/pages/client/ClientMyListings"));
const ClientKalender      = lazy(() => import("@/pages/client/ClientKalender"));
const ClientHistorie      = lazy(() => import("@/pages/client/ClientHistorie"));
const ClientDokumente     = lazy(() => import("@/pages/client/ClientDokumente"));
const SearchProviders     = lazy(() => import("@/pages/client/SearchProviders"));

// Admin (unberührt)
const MissionControl           = lazy(() => import("@/pages/admin/MissionControl"));
const AdminDashboard           = lazy(() => import("@/pages/admin/AdminDashboard"));
const FeatureUsageOverview     = lazy(() => import("@/pages/admin/FeatureUsageOverview"));
const ModuleAccessLogs         = lazy(() => import("@/pages/admin/ModuleAccessLogs"));
const Verarbeitungsverzeichnis = lazy(() => import("@/pages/admin/Verarbeitungsverzeichnis"));
const AdminRoles               = lazy(() => import("@/pages/admin/AdminRoles"));
const AdminSeedDemo            = lazy(() => import("@/pages/AdminSeedDemo"));
const AdminSmokeTest           = lazy(() => import("@/pages/AdminSmokeTest"));
const AdminOrganizations       = lazy(() => import("@/pages/admin/AdminOrganizations"));
const HufiBrainAdmin           = lazy(() => import("@/pages/admin/HufiBrainAdmin"));
const AdminNachrichten         = lazy(() => import("@/pages/AdminNachrichten"));

// Öffentliche Spezial-Routen (Einladungen, Notfall, Pferdeakte)
const ConnectForm       = lazy(() => import("@/pages/ConnectForm"));
const SubmitReview      = lazy(() => import("@/pages/SubmitReview"));
const ProviderLanding   = lazy(() => import("@/pages/ProviderLanding"));
const WidgetPage        = lazy(() => import("@/pages/WidgetPage"));
const PreviewLanding    = lazy(() => import("@/pages/PreviewLanding"));
const PferdeakteLanding = lazy(() => import("@/pages/PferdeakteLanding"));
const NotfallZugang     = lazy(() => import("@/pages/NotfallZugang"));
const BotschafterAuth   = lazy(() => import("@/pages/botschafter/BotschafterAuth"));
const BotschafterWarten = lazy(() => import("@/pages/botschafter/BotschafterWarten"));
const SponsoringPublic  = lazy(() => import("@/pages/botschafter/SponsoringPublic"));

// Rechtliches (minimal – nur was zwingend erreichbar sein muss)
const WebsiteImpressum   = lazy(() => import("@/pages/website/Impressum"));
const WebsiteDatenschutz = lazy(() => import("@/pages/website/Datenschutz"));
const WebsiteAGB         = lazy(() => import("@/pages/website/AGB"));
const WebsiteWiderruf    = lazy(() => import("@/pages/website/Widerruf"));

// HufiApp-Landing (bleibt für hufiapp.de Domain)
const WebsiteHome = lazy(() => import("@/pages/website/WebsiteHome"));

// Subdomain-Routing (Portal, Vet, Marketplace – nur auf Subdomains aktiv)
const PortalLogin       = lazy(() => import("@/pages/portal/PortalLogin"));
const MarketplacePublic = lazy(() => import("@/pages/portal/MarketplacePublic"));
const VetPortalLogin    = lazy(() => import("@/pages/portal/VetPortalLogin"));
const VetDashboard      = lazy(() => import("@/pages/vet/VetDashboard"));
const VetSOAPForm       = lazy(() => import("@/pages/vet/VetSOAPForm"));
const VetPMSConnect     = lazy(() => import("@/pages/vet/VetPMSConnect"));
const VetCSVImport      = lazy(() => import("@/pages/vet/VetCSVImport"));
const VetGOTRechner     = lazy(() => import("@/pages/vet/VetGOTRechner"));
const VetImpfungen      = lazy(() => import("@/pages/vet/VetImpfungen"));
const TierarztFinder    = lazy(() => import("@/pages/TierarztFinder"));
const PortalAppLayout   = lazy(() => import("@/components/portal/PortalAppLayout"));
const PortalDashboard   = lazy(() => import("@/pages/portal/PortalDashboard"));
const PortalCalendar    = lazy(() => import("@/pages/portal/PortalCalendar"));
const PortalManagementHub = lazy(() => import("@/pages/portal/PortalManagementHub"));
const PortalSettings    = lazy(() => import("@/pages/portal/PortalSettings"));
const PortalAnalytics   = lazy(() => import("@/pages/portal/PortalAnalytics"));
const PortalTeam        = lazy(() => import("@/pages/portal/PortalTeam"));
const PortalConnect     = lazy(() => import("@/pages/portal/PortalConnect"));
const PortalImport      = lazy(() => import("@/pages/portal/PortalImport"));
const PortalPlaceholder = lazy(() => import("@/pages/portal/PortalPlaceholder"));
const PortalPolicen     = lazy(() => import("@/pages/portal/modules/PortalPolicen"));
const PortalClaims      = lazy(() => import("@/pages/portal/modules/PortalClaims"));
const PortalProdukte    = lazy(() => import("@/pages/portal/modules/PortalProdukte"));
const PortalOrders      = lazy(() => import("@/pages/portal/modules/PortalOrders"));
const PortalSchulungen  = lazy(() => import("@/pages/portal/modules/PortalSchulungen"));
const PortalKurse       = lazy(() => import("@/pages/portal/modules/PortalKurse"));
const PortalSchueler    = lazy(() => import("@/pages/portal/modules/PortalSchueler"));
const PortalPruefungen  = lazy(() => import("@/pages/portal/modules/PortalPruefungen"));
const PortalStandards   = lazy(() => import("@/pages/portal/modules/PortalStandards"));
const PortalMitglieder  = lazy(() => import("@/pages/portal/modules/PortalMitglieder"));
const PortalStatistiken = lazy(() => import("@/pages/portal/modules/PortalStatistiken"));
const PortalPatienten   = lazy(() => import("@/pages/portal/modules/PortalPatienten"));
const PortalBefunde     = lazy(() => import("@/pages/portal/modules/PortalBefunde"));
const PortalImpfungen   = lazy(() => import("@/pages/portal/modules/PortalImpfungen"));
const PortalGallery     = lazy(() => import("@/pages/portal/PortalGallery"));
const PortalApplication = lazy(() => import("@/pages/portal/PortalApplication"));
const PortalHorseDetail = lazy(() => import("@/pages/portal/PortalHorseDetail"));
const InsurancePortalDemo    = lazy(() => import("@/pages/portal/demos/InsurancePortalDemo"));
const ManufacturerPortalDemo = lazy(() => import("@/pages/portal/demos/ManufacturerPortalDemo"));
const VetPortalDemo          = lazy(() => import("@/pages/portal/demos/VetPortalDemo"));
const SupplierPortalDemo     = lazy(() => import("@/pages/portal/demos/SupplierPortalDemo"));
const EducationPortalDemo    = lazy(() => import("@/pages/portal/demos/EducationPortalDemo"));
const AssociationPortalDemo  = lazy(() => import("@/pages/portal/demos/AssociationPortalDemo"));

// ── THERAPEUTEN / PARTNER ─────────────────────────────────────────────────────
const PartnerAppLayout        = lazy(() => import("@/components/partner/PartnerAppLayout"));
const PartnerHome             = lazy(() => import("@/pages/partner/PartnerHome"));
const PartnerPferde           = lazy(() => import("@/pages/partner/PartnerPferde"));
const PartnerHorseView        = lazy(() => import("@/pages/partner/PartnerHorseView"));
const PartnerKunden           = lazy(() => import("@/pages/partner/PartnerKunden"));
const PartnerCalendar         = lazy(() => import("@/pages/partner/PartnerCalendar"));
const PartnerChat             = lazy(() => import("@/pages/partner/PartnerChat"));
const PartnerNotes            = lazy(() => import("@/pages/partner/PartnerNotes"));
const PartnerTreatmentPlans   = lazy(() => import("@/pages/partner/PartnerTreatmentPlans"));
const PartnerDocuments        = lazy(() => import("@/pages/partner/PartnerDocuments"));
const PartnerInvoices         = lazy(() => import("@/pages/partner/PartnerInvoices"));
const PartnerServices         = lazy(() => import("@/pages/partner/PartnerServices"));
const PartnerConnect          = lazy(() => import("@/pages/partner/PartnerConnect"));
const PartnerPublicProfile    = lazy(() => import("@/pages/partner/PartnerPublicProfile"));
const PartnerProfile          = lazy(() => import("@/pages/partner/PartnerProfile"));
const PartnerSettings         = lazy(() => import("@/pages/partner/PartnerSettings"));
const PartnerManagementHub    = lazy(() => import("@/pages/partner/PartnerManagementHub"));
const PartnerManagementProfil = lazy(() => import("@/pages/partner/PartnerManagementProfil"));
const PartnerManagementAbo    = lazy(() => import("@/pages/partner/PartnerManagementAbo"));
const PartnerManagementBusinessHub = lazy(() => import("@/pages/partner/PartnerManagementBusinessHub"));
const PartnerManagementSteuer = lazy(() => import("@/pages/partner/PartnerManagementSteuer"));
const PartnerInvite           = lazy(() => import("@/pages/PartnerInvite"));

// ── Suspense Fallback ─────────────────────────────────────────────────────────
const LazyFallback = () => {
  const [timedOut, setTimedOut] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setSlow(true), 5000);
    const t2 = setTimeout(() => setTimedOut(true), 25000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#F8FAFC" }}>
        <div className="flex flex-col items-center gap-4 text-center max-w-xs">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)" }}>
            <span style={{ fontSize: 22 }}>⚡</span>
          </div>
          <p className="font-semibold text-gray-800 text-sm">Verbindung unterbrochen</p>
          <p className="text-xs text-gray-400 leading-relaxed">Prüfe deine Internetverbindung und lade die Seite neu.</p>
          <button onClick={() => window.location.reload()} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#F97316" }}>
            Neu laden
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: "#F8FAFC" }}>
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(249,115,22,0.1)" }}>
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
      {slow && <p className="text-xs text-gray-400 animate-pulse">Einen Moment...</p>}
    </div>
  );
};

const persister = createIDBPersister();

// ── Portal/Subdomain Guard ────────────────────────────────────────────────────
function PferdeakteRouteGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const path = location.pathname;
  const portalMode = detectPortalMode();

  if (portalMode.mode === 'portal' || portalMode.mode === 'insurance') {
    return (
      <AuthProvider>
        <Suspense fallback={<LazyFallback />}>
          <Routes>
            <Route path="/portal/:slug" element={<PortalAppLayout />}>
              <Route index element={<PortalDashboard />} />
              <Route path="kalender"    element={<PortalCalendar />} />
              <Route path="management"  element={<PortalManagementHub />} />
              <Route path="settings"    element={<PortalSettings />} />
              <Route path="analytics"   element={<PortalAnalytics />} />
              <Route path="team"        element={<PortalTeam />} />
              <Route path="connect"     element={<PortalConnect />} />
              <Route path="import"      element={<PortalImport />} />
              <Route path="policen"     element={<PortalPolicen />} />
              <Route path="claims"      element={<PortalClaims />} />
              <Route path="produkte"    element={<PortalProdukte />} />
              <Route path="orders"      element={<PortalOrders />} />
              <Route path="schulungen"  element={<PortalSchulungen />} />
              <Route path="kurse"       element={<PortalKurse />} />
              <Route path="schueler"    element={<PortalSchueler />} />
              <Route path="pruefungen"  element={<PortalPruefungen />} />
              <Route path="standards"   element={<PortalStandards />} />
              <Route path="mitglieder"  element={<PortalMitglieder />} />
              <Route path="statistiken" element={<PortalStatistiken />} />
              <Route path="patienten"   element={<PortalPatienten />} />
              <Route path="befunde"     element={<PortalBefunde />} />
              <Route path="impfungen"   element={<PortalImpfungen />} />
              <Route path="horse/:id"   element={<PortalHorseDetail />} />
              <Route path="*"           element={<PortalPlaceholder />} />
            </Route>
            <Route path="*" element={<PortalLogin mode={portalMode.mode} />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    );
  }

  if (portalMode.mode === 'marketplace') {
    return (
      <AuthProvider>
        <Suspense fallback={<LazyFallback />}>
          <Routes>
            <Route path="*" element={<MarketplacePublic />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    );
  }

  if (portalMode.mode === 'veterinary') {
    return (
      <AuthProvider>
        <Suspense fallback={<LazyFallback />}>
          <Routes>
            <Route path="/vet/dashboard"   element={<VetDashboard />} />
            <Route path="/vet/soap"        element={<VetSOAPForm />} />
            <Route path="/vet/pms-connect" element={<VetPMSConnect />} />
            <Route path="/vet/csv-import"  element={<VetCSVImport />} />
            <Route path="/vet/got-rechner" element={<VetGOTRechner />} />
            <Route path="/vet/impfungen"   element={<VetImpfungen />} />
            <Route path="/tierarzt-finder" element={<TierarztFinder />} />
            <Route path="*"               element={<VetPortalLogin />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    );
  }

  // Öffentliche Routen ohne AuthProvider
  if (
    path.startsWith('/pferdeakte') ||
    path.startsWith('/notfall/') ||
    path === '/botschafter/login' ||
    path === '/botschafter/warten' ||
    path.startsWith('/ref/')
  ) {
    return (
      <Suspense fallback={<LazyFallback />}>
        <Routes>
          <Route path="/pferdeakte"           element={<PferdeakteLanding />} />
          <Route path="/pferdeakte/botschafter" element={<PferdeakteLanding />} />
          <Route path="/pferdeakte/*"         element={<PferdeakteLanding />} />
          <Route path="/notfall/:eqid/:token" element={<NotfallZugang />} />
          <Route path="/botschafter/login"    element={<BotschafterAuth />} />
          <Route path="/botschafter/warten"   element={<BotschafterWarten />} />
          <Route path="/ref/:code"            element={<SponsoringPublic />} />
        </Routes>
      </Suspense>
    );
  }

  return <>{children}</>;
}

// ── App Root ──────────────────────────────────────────────────────────────────
function App() {
  const [queryClient] = useState(() =>
    new QueryClient({
      defaultOptions: {
        queries: {
          gcTime: QUERY_CACHE_MAX_AGE,
          staleTime: 1000 * 60 * 5,
          retry: (failureCount) => { if (!navigator.onLine) return false; return failureCount < 3; },
          retryDelay: (i) => Math.min(1000 * 2 ** i, 30000),
          networkMode: "offlineFirst",
          throwOnError: false,
        },
        mutations: {
          networkMode: "offlineFirst",
          retry: (failureCount) => { if (!navigator.onLine) return false; return failureCount < 3; },
        },
      },
    })
  );

  useEffect(() => {
    let cleanupSync: (() => void) | undefined;
    let cleanupImageSync: (() => void) | undefined;
    let cancelled = false;
    const start = async () => {
      const [{ initSyncManager }, { initImageSyncManager }] = await Promise.all([
        import("@/lib/offline/syncManager"),
        import("@/lib/offline/imageSyncManager"),
      ]);
      if (cancelled) return;
      cleanupSync = initSyncManager();
      cleanupImageSync = initImageSyncManager();
    };
    const id = "requestIdleCallback" in window
      ? window.requestIdleCallback(() => { void start(); }, { timeout: 3000 })
      : window.setTimeout(() => { void start(); }, 1500);
    return () => {
      cancelled = true;
      if ("cancelIdleCallback" in window && typeof id === "number") window.cancelIdleCallback(id);
      else clearTimeout(id);
      cleanupSync?.();
      cleanupImageSync?.();
    };
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: QUERY_CACHE_MAX_AGE,
        buster: "v3",
        dehydrateOptions: {
          shouldDehydrateQuery: (q) => {
            const key = q.queryKey[0] as string;
            if (key?.startsWith("cockpit-")) return false;
            return q.state.status === "success";
          },
        },
      }}
    >
      <ErrorBoundary name="App">
        <ThemeProvider defaultTheme="dark">
          <BrowserRouter>
            <PferdeakteRouteGuard>
              <AuthProvider>
                <AppContent queryClient={queryClient} />
              </AuthProvider>
            </PferdeakteRouteGuard>
          </BrowserRouter>
        </ThemeProvider>
      </ErrorBoundary>
    </PersistQueryClientProvider>
  );
}

// ── AppContent ────────────────────────────────────────────────────────────────
function AppContent({ queryClient }: { queryClient: QueryClient }) {
  const { user, loading } = useAuth();
  const { isRepairing, repairError, isProfileReady, retry } = useProfileGuardian(user);

  if (loading) return <AuthLoadingScreen />;
  if (user && isRepairing && !isProfileReady) {
    return <ProfileGuardianScreen isRepairing={isRepairing} error={repairError} onRetry={retry} />;
  }

  return (
    <SubscriptionProvider>
      <CockpitFullscreenProvider>
      <TourProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PWAInstallPrompt />
        <PasswordRecoveryRedirect>
          <Suspense fallback={<LazyFallback />}>
          <Routes>

            {/* ── AUTH ──────────────────────────────────────────────────── */}
            <Route path="/auth"            element={<Auth />} />
            <Route path="/audit"           element={<Auth />} />
            <Route path="/login"           element={<Navigate to="/auth?force=login" replace />} />
            <Route path="/signup"          element={<Navigate to="/auth" replace />} />
            <Route path="/register"        element={<Navigate to="/auth" replace />} />
            <Route path="/welcome"         element={<Welcome />} />
            <Route path="/reset-password"  element={<ResetPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />

            {/* Redirects für alte / alternative Pfade */}
            <Route path="/dashboard"      element={<Navigate to="/home" replace />} />
            <Route path="/credits"        element={<Navigate to="/management/abo" replace />} />
            <Route path="/meine-zentrale" element={<Navigate to="/management" replace />} />
            <Route path="/einstellungen"  element={<Navigate to="/management" replace />} />
            <Route path="/services"       element={<Navigate to="/mein-angebot" replace />} />
            <Route path="/preise"         element={<Navigate to="/mein-angebot" replace />} />
            <Route path="/customers"      element={<Navigate to="/kunden" replace />} />
            <Route path="/calendar"       element={<Navigate to="/kalender" replace />} />
            <Route path="/horse/:id"      element={<Navigate to="/pferd/:id" replace />} />

            {/* Einstieg: hufiapp.de → LP, rest → direkt /auth */}
            <Route path="/" element={<Index />} />

            {/* Öffentliche Seiten */}
            <Route path="/bhs"                  element={<BhsLandingPage />} />
            <Route path="/partner-einladung/:token" element={<PartnerInvite />} />
            <Route path="/partner/:prid"         element={<PartnerPublicProfile />} />
            <Route path="/p/:slug"              element={<ProviderLanding />} />
            <Route path="/p/:slug/:page"        element={<ProviderLanding />} />
            <Route path="/connect/:slug"        element={<ConnectForm />} />
            <Route path="/submit-review"        element={<SubmitReview />} />
            <Route path="/bewertung/:providerId" element={<SubmitReview />} />
            <Route path="/preview/:token"       element={<PreviewLanding />} />
            <Route path="/widget/:slug/:type"   element={<WidgetPage />} />

            {/* Rechtliches (zwingend erreichbar) */}
            <Route path="/impressum"   element={<WebsiteImpressum />} />
            <Route path="/datenschutz" element={<WebsiteDatenschutz />} />
            <Route path="/agb"         element={<WebsiteAGB />} />
            <Route path="/widerruf"    element={<WebsiteWiderruf />} />

            {/* HufiApp-Landing (nur auf hufiapp.de aktiv via Index.tsx) */}
            <Route path="/website" element={<WebsiteHome />} />

            {/* ── ADMIN (unberührt) ──────────────────────────────────── */}
            <Route path="/admin/mission-control"         element={<ProtectedRoute allowedRoles={["admin"]}><MissionControl /></ProtectedRoute>} />
            <Route path="/admin/god-mode"                element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/notfall"                 element={<ProtectedRoute allowedRoles={["admin"]}><EmergencyDashboard /></ProtectedRoute>} />
            <Route path="/admin/feature-usage"          element={<ProtectedRoute allowedRoles={["admin"]}><FeatureUsageOverview /></ProtectedRoute>} />
            <Route path="/admin/module-access-logs"     element={<ProtectedRoute allowedRoles={["admin"]}><ModuleAccessLogs /></ProtectedRoute>} />
            <Route path="/admin/verarbeitungsverzeichnis" element={<ProtectedRoute allowedRoles={["admin"]}><Verarbeitungsverzeichnis /></ProtectedRoute>} />
            <Route path="/admin/rollen"                 element={<ProtectedRoute allowedRoles={["admin"]}><AdminRoles /></ProtectedRoute>} />
            <Route path="/admin/seed-demo"              element={<ProtectedRoute allowedRoles={["admin"]}><AdminSeedDemo /></ProtectedRoute>} />
            <Route path="/admin/smoke-test"             element={<ProtectedRoute allowedRoles={["provider", "admin"]}><AdminSmokeTest /></ProtectedRoute>} />
            <Route path="/admin/organizations"          element={<ProtectedRoute allowedRoles={["admin"]}><AdminOrganizations /></ProtectedRoute>} />
            <Route path="/admin/hufi-brain"             element={<ProtectedRoute allowedRoles={["admin"]}><HufiBrainAdmin /></ProtectedRoute>} />
            <Route path="/admin-nachrichten"            element={<ProtectedRoute allowedRoles={["admin"]}><AdminNachrichten /></ProtectedRoute>} />

            {/* ── PROVIDER (HUFBEARBEITER) ───────────────────────────── */}
            <Route path="/home" element={
              <ProtectedRoute allowedRoles={["provider", "admin"]}>
                <MobileShell />
              </ProtectedRoute>
            } />

            <Route element={<ProtectedRoute allowedRoles={["provider", "admin"]}><AppLayout /></ProtectedRoute>}>
              {/* CRM – Kern */}
              <Route path="/pferde"       element={<Pferde />} />
              <Route path="/pferd/:id"    element={<ProviderHorseDetail />} />
              <Route path="/kunden"       element={<Kunden />} />
              <Route path="/kalender"     element={<Kalender />} />
              <Route path="/rechnungen"   element={<Rechnungen />} />
              <Route path="/mein-angebot" element={<MeinAngebot />} />
              <Route path="/anfragen"     element={<Anfragen />} />
              <Route path="/aufnahme"     element={<Aufnahme />} />

              {/* Touren + Material */}
              <Route path="/tour"    element={<Tour />} />
              <Route path="/lager"   element={<Lager />} />
              <Route path="/work-mode" element={<WorkMode />} />

              {/* Finanzen & Buchhaltung */}
              <Route path="/ausgaben"   element={<Ausgaben />} />
              <Route path="/buchhaltung" element={<Buchhaltung />} />
              <Route path="/guv"        element={<GuV />} />
              <Route path="/business"   element={<Business />} />
              <Route path="/analyse"    element={<AnalyseHub />} />
              <Route path="/analyse/betriebszahlen" element={<Analyse />} />

              {/* Kommunikation & Feedback */}
              <Route path="/chat"               element={<Chat />} />
              <Route path="/auffassen"          element={<AuffassenHub />} />
              <Route path="/auffassen/feedback" element={<Auffassen />} />

              {/* Dokumente & Archiv */}
              <Route path="/mein-office"     element={<MeinOffice />} />
              <Route path="/mein-office/:id" element={<OfficeEditor />} />
              <Route path="/archiv"          element={<Archiv />} />

              {/* Fuhrpark & Team */}
              <Route path="/fuhrpark" element={<Fuhrpark />} />
              <Route path="/team"     element={<Team />} />

              {/* Notfall */}
              <Route path="/notfall" element={<EmergencyDashboard />} />

              {/* Management / Einstellungen */}
              <Route path="/management"                element={<ManagementHub />} />
              <Route path="/management/profil"         element={<ManagementProfil />} />
              <Route path="/management/sicherheit"     element={<ManagementSicherheit />} />
              <Route path="/management/business"       element={<ManagementBusinessHub />} />
              <Route path="/management/kommunikation"  element={<ManagementKommunikation />} />
              <Route path="/management/abo"            element={<ManagementAbo />} />
              <Route path="/settings/abo"              element={<AboSettings />} />
              <Route path="/management/rechtliches"    element={<ManagementRechtliches />} />
              <Route path="/management/steuer"         element={<ManagementSteuer />} />
              <Route path="/management/import"         element={<ImportCenter />} />
              <Route path="/management/website"        element={<ManagementWebsite />} />
              <Route path="/management/botschafter"    element={<Navigate to="/management" replace />} />

              {/* BHS Balance */}
              <Route path="/bhs-balance" element={<BhsBalanceCockpit />} />

              {/* Support */}
              <Route path="/support" element={<Support />} />
            </Route>

            {/* ── CLIENT (PFERDEBESITZER) ────────────────────────────── */}
            <Route element={<ProtectedRoute allowedRoles={["client"]}><ClientAppLayout /></ProtectedRoute>}>
              <Route path="/client-home"          element={<ClientHome />} />
              <Route path="/client-horses"        element={<ClientHorses />} />
              <Route path="/client-horse/:id"     element={<ClientHorseDetail />} />
              <Route path="/client-booking"       element={<ClientBooking />} />
              <Route path="/client-invoices"      element={<ClientInvoices />} />
              <Route path="/client-bhs-abo"       element={<ClientBhsAbo />} />
              <Route path="/client-permissions"   element={<ClientPermissions />} />
              <Route path="/client-profile"       element={<ClientProfile />} />
              <Route path="/client-account-type"  element={<ClientAccountType />} />
              <Route path="/client-notifications" element={<ClientNotifications />} />
              <Route path="/client-notfall"       element={<EmergencyDashboard />} />
              <Route path="/client/search-providers" element={<SearchProviders />} />
              <Route path="/client-support"       element={<Support />} />
              {/* Fehlende Client-Routen */}
              <Route path="/client-orders"        element={<ClientOrders />} />
              <Route path="/client-chat"          element={<ClientChat />} />
              <Route path="/client-network"       element={<ClientNetwork />} />
              <Route path="/client-marketplace"   element={<ClientMarketplace />} />
              <Route path="/client-marketplace/create" element={<ClientMarketplaceCreate />} />
              <Route path="/client-marketplace/mine"   element={<ClientMyListings />} />
              <Route path="/client-kalender"      element={<ClientKalender />} />
              <Route path="/client-historie"      element={<ClientHistorie />} />
              <Route path="/client-dokumente"     element={<ClientDokumente />} />
              <Route path="/client-connect"       element={<Navigate to="/client-network" replace />} />
            </Route>

            {/* ── THERAPEUT / PARTNER ────────────────────────────────── */}
            <Route element={<ProtectedRoute allowedRoles={["partner", "admin"]}><PartnerAppLayout /></ProtectedRoute>}>
              <Route path="/partner-home"         element={<PartnerHome />} />
              <Route path="/partner-pferde"       element={<PartnerPferde />} />
              <Route path="/partner-pferd/:id"    element={<PartnerHorseView />} />
              <Route path="/partner-kunden"       element={<PartnerKunden />} />
              <Route path="/partner-calendar"     element={<PartnerCalendar />} />
              <Route path="/partner-chat"         element={<PartnerChat />} />
              <Route path="/partner-notes"        element={<PartnerNotes />} />
              <Route path="/partner-plans"        element={<PartnerTreatmentPlans />} />
              <Route path="/partner-documents"    element={<PartnerDocuments />} />
              <Route path="/partner-invoices"     element={<PartnerInvoices />} />
              <Route path="/partner-services"     element={<PartnerServices />} />
              <Route path="/partner-connect"      element={<PartnerConnect />} />
              <Route path="/partner-profile"      element={<PartnerProfile />} />
              <Route path="/partner-settings"     element={<PartnerSettings />} />
              <Route path="/partner-management"              element={<PartnerManagementHub />} />
              <Route path="/partner-management/profil"       element={<PartnerManagementProfil />} />
              <Route path="/partner-management/abo"          element={<PartnerManagementAbo />} />
              <Route path="/partner-management/business"     element={<PartnerManagementBusinessHub />} />
              <Route path="/partner-management/steuer"       element={<PartnerManagementSteuer />} />
              {/* Fehlende Partner-Routen → sinnvolle Redirects */}
              <Route path="/partner-anfragen"     element={<Navigate to="/partner-kunden" replace />} />
              <Route path="/partner-angebote"     element={<Navigate to="/partner-services" replace />} />
              <Route path="/partner-tour"         element={<Navigate to="/partner-calendar" replace />} />
              <Route path="/partner-work-mode"    element={<Navigate to="/partner-calendar" replace />} />
              <Route path="/partner-feedback"     element={<Navigate to="/partner-home" replace />} />
              <Route path="/partner-support"      element={<Support />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<NotFound />} />

          </Routes>
          </Suspense>
        </PasswordRecoveryRedirect>
      </TooltipProvider>
      </TourProvider>
      </CockpitFullscreenProvider>
    </SubscriptionProvider>
  );
}

export default App;
