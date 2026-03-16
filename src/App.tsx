import { useState, useEffect, lazy, Suspense } from "react";
import { detectPortalMode } from "@/hooks/usePortalDetection";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useProfileGuardian } from "@/hooks/useProfileGuardian";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PasswordRecoveryRedirect } from "@/components/auth/PasswordRecoveryRedirect";
import { AppLayout } from "@/components/layout/AppLayout";
import { CockpitFullscreenProvider } from "@/components/day-cockpit/CockpitFullscreenContext";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";
import { ProfileGuardianScreen } from "@/components/auth/ProfileGuardianScreen";
import { createIDBPersister, initImageSyncManager, QUERY_CACHE_MAX_AGE, STATIC_QUERY_KEYS } from "@/lib/offline";
import { initSyncManager } from "@/lib/offline/syncManager";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TourProvider } from "@/components/tour/TourContext";
import { ClientErrorFallback as ClientErrorFallbackComponent } from "@/components/client/ClientErrorFallback";

// Eagerly loaded core pages
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";

// Lazy-loaded pages for code-splitting
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Anfragen = lazy(() => import("@/pages/Anfragen"));
const Angebote = lazy(() => import("@/pages/Angebote"));
const Aufnahme = lazy(() => import("@/pages/Aufnahme"));
const Pferde = lazy(() => import("@/pages/Pferde"));
const Auffassen = lazy(() => import("@/pages/Auffassen"));
const AuffassenHub = lazy(() => import("@/pages/AuffassenHub"));
const Analyse = lazy(() => import("@/pages/Analyse"));
const AnalyseHub = lazy(() => import("@/pages/AnalyseHub"));
const Kalender = lazy(() => import("@/pages/Kalender"));
const Kunden = lazy(() => import("@/pages/Kunden"));
const Services = lazy(() => import("@/pages/Services"));
const MeinAngebot = lazy(() => import("@/pages/MeinAngebot"));
const Management = lazy(() => import("@/pages/Management"));
const ManagementHub = lazy(() => import("@/pages/ManagementHub"));
const ManagementProfil = lazy(() => import("@/pages/management/ManagementProfil"));
const ManagementWebsite = lazy(() => import("@/pages/management/ManagementWebsite"));
const ManagementKommunikation = lazy(() => import("@/pages/management/ManagementKommunikation"));
const ManagementAbo = lazy(() => import("@/pages/management/ManagementAbo"));
const ManagementRechtliches = lazy(() => import("@/pages/management/ManagementRechtliches"));
const Academy = lazy(() => import("@/pages/Academy"));
const Chat = lazy(() => import("@/pages/Chat"));
const GeldVerdienen = lazy(() => import("@/pages/GeldVerdienen"));
const Hufrente = lazy(() => import("@/pages/Hufrente"));
const Hufanalyse = lazy(() => import("@/pages/Hufanalyse"));
const Rechnungen = lazy(() => import("@/pages/Rechnungen"));
const Support = lazy(() => import("@/pages/Support"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Welcome = lazy(() => import("@/pages/Welcome"));
const UpdatePassword = lazy(() => import("@/pages/UpdatePassword"));
const ClientHome = lazy(() => import("@/pages/ClientHome"));
const ClientHorseDetail = lazy(() => import("@/pages/ClientHorseDetail"));
const ClientInvoices = lazy(() => import("@/pages/ClientInvoices"));
const ClientPermissions = lazy(() => import("@/pages/ClientPermissions"));
const ClientBooking = lazy(() => import("@/pages/ClientBooking"));
const ClientProfile = lazy(() => import("@/pages/ClientProfile"));
const ClientChat = lazy(() => import("@/pages/ClientChat"));
const ClientStallBoard = lazy(() => import("@/pages/ClientStallBoard"));
const ClientHorses = lazy(() => import("@/pages/ClientHorses"));
const ClientLocations = lazy(() => import("@/pages/ClientLocations"));
const ClientNotifications = lazy(() => import("@/pages/ClientNotifications"));
const ClientOrders = lazy(() => import("@/pages/client/ClientOrders"));
const SearchProviders = lazy(() => import("@/pages/client/SearchProviders"));
const ProviderLanding = lazy(() => import("@/pages/ProviderLanding"));
const WidgetPage = lazy(() => import("@/pages/WidgetPage"));
const MeineWebsite = lazy(() => import("@/pages/MeineWebsite"));
const LandingEditor = lazy(() => import("@/pages/LandingEditor"));
const ProviderHorseDetail = lazy(() => import("@/pages/ProviderHorseDetail"));
const ImportCenter = lazy(() => import("@/pages/ImportCenter"));
const ConnectForm = lazy(() => import("@/pages/ConnectForm"));
const Netzwerk = lazy(() => import("@/pages/Netzwerk"));
const MissionControl = lazy(() => import("@/pages/admin/MissionControl"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const FeatureUsageOverview = lazy(() => import("@/pages/admin/FeatureUsageOverview"));
const ModuleAccessLogs = lazy(() => import("@/pages/admin/ModuleAccessLogs"));
const Verarbeitungsverzeichnis = lazy(() => import("@/pages/admin/Verarbeitungsverzeichnis"));
const AdminRoles = lazy(() => import("@/pages/admin/AdminRoles"));
const SubmitReview = lazy(() => import("@/pages/SubmitReview"));
const AboMatrix = lazy(() => import("@/pages/AboMatrix"));
const Blog = lazy(() => import("@/pages/Blog"));
const BlogPost = lazy(() => import("@/pages/BlogPost"));
const WebsiteHome = lazy(() => import("@/pages/website/WebsiteHome"));
const WebsiteImpressum = lazy(() => import("@/pages/website/Impressum"));
const WebsiteDatenschutz = lazy(() => import("@/pages/website/Datenschutz"));
const WebsiteAGB = lazy(() => import("@/pages/website/AGB"));
const WebsiteVertrauen = lazy(() => import("@/pages/website/Vertrauen"));
const WebsiteWiderruf = lazy(() => import("@/pages/website/Widerruf"));
const Glossar = lazy(() => import("@/pages/Glossar"));
const FAQ = lazy(() => import("@/pages/FAQ"));
const Changelog = lazy(() => import("@/pages/Changelog"));
const PferdeakteLanding = lazy(() => import("@/pages/PferdeakteLanding"));
const PferdeakteBotschafter = lazy(() => import("@/pages/PferdeakteBotschafter"));
const NotfallZugang = lazy(() => import("@/pages/NotfallZugang"));
const BotschafterAuth = lazy(() => import("@/pages/botschafter/BotschafterAuth"));
const BotschafterWarten = lazy(() => import("@/pages/botschafter/BotschafterWarten"));
const ManagementBotschafter = lazy(() => import("@/pages/provider/ManagementBotschafter"));
const PartnerManagementBotschafter = lazy(() => import("@/pages/partner/PartnerManagementBotschafter"));
const EmployeeManagementBotschafter = lazy(() => import("@/pages/employee/EmployeeManagementBotschafter"));
const ClientBotschafter = lazy(() => import("@/pages/client/ClientBotschafter"));
const BotschafterWerbemittelPage = lazy(() => import("@/pages/botschafter/BotschafterWerbemittelPage"));
const WerbemittelEditor = lazy(() => import("@/pages/botschafter/WerbemittelEditor"));
const BotschafterNachrichten = lazy(() => import("@/pages/botschafter/BotschafterNachrichten"));
const BotschafterUebersicht = lazy(() => import("@/pages/botschafter/BotschafterUebersicht"));
const Lager = lazy(() => import("@/pages/Lager"));
const Ausgaben = lazy(() => import("@/pages/Ausgaben"));
const GuV = lazy(() => import("@/pages/GuV"));
const WorkMode = lazy(() => import("@/pages/WorkMode"));
const Tour = lazy(() => import("@/pages/Tour"));
const Team = lazy(() => import("@/pages/Team"));
const EmployeeDashboard = lazy(() => import("@/pages/EmployeeDashboard"));
const EmployeeInvite = lazy(() => import("@/pages/EmployeeInvite"));
const EmergencyDashboard = lazy(() => import("@/pages/EmergencyDashboard"));
const PriceGroupManagement = lazy(() => import("@/pages/PriceGroupManagement"));
const AdminSeedDemo = lazy(() => import("@/pages/AdminSeedDemo"));
const AdminSmokeTest = lazy(() => import("@/pages/AdminSmokeTest"));
const EmployeeTour = lazy(() => import("@/pages/EmployeeTour"));
const EmployeeHorseDetail = lazy(() => import("@/pages/employee/EmployeeHorseDetail"));
const MeinOffice = lazy(() => import("@/pages/MeinOffice"));
const OfficeEditor = lazy(() => import("@/pages/OfficeEditor"));
const Hilfe = lazy(() => import("@/pages/Hilfe"));
const Docs = lazy(() => import("@/pages/Docs"));
const Status = lazy(() => import("@/pages/Status"));
const HMConnect = lazy(() => import("@/pages/HMConnect"));
const Buchhaltung = lazy(() => import("@/pages/Buchhaltung"));
const Fuhrpark = lazy(() => import("@/pages/Fuhrpark"));
const AutoFlow = lazy(() => import("@/pages/AutoFlow"));
const Marketplace = lazy(() => import("@/pages/Marketplace"));
const PortalDashboard = lazy(() => import("@/pages/portal/PortalDashboard"));
const PortalSettings = lazy(() => import("@/pages/portal/PortalSettings"));
const AdminOrganizations = lazy(() => import("@/pages/admin/AdminOrganizations"));
const Statistiken = lazy(() => import("@/pages/Statistiken"));
const EmployeeNotizbuch = lazy(() => import("@/pages/employee/EmployeeNotizbuch"));
const EmployeeProfil = lazy(() => import("@/pages/employee/EmployeeProfil"));
const EmployeeMaterial = lazy(() => import("@/pages/employee/EmployeeMaterial"));
const EmployeeAbwesenheiten = lazy(() => import("@/pages/employee/EmployeeAbwesenheiten"));
const EmployeeVertrag = lazy(() => import("@/pages/employee/EmployeeVertrag"));
const EmployeeTimer = lazy(() => import("@/pages/employee/EmployeeTimer"));
const EmployeeHufCam = lazy(() => import("@/pages/employee/EmployeeHufCam"));
const EmployeeAnalyse = lazy(() => import("@/pages/employee/EmployeeAnalyse"));
const EmployeeChat = lazy(() => import("@/pages/employee/EmployeeChat"));
const EmployeeCalendar = lazy(() => import("@/pages/employee/EmployeeCalendar"));
const EmployeeManagementHub = lazy(() => import("@/pages/employee/EmployeeManagementHub"));
const EmployeeManagementProfil = lazy(() => import("@/pages/employee/EmployeeManagementProfil"));
const EmployeeManagementEinstellungen = lazy(() => import("@/pages/employee/EmployeeManagementEinstellungen"));
const EmployeePferde = lazy(() => import("@/pages/employee/EmployeePferde"));
const PartnerHome = lazy(() => import("@/pages/partner/PartnerHome"));
const PartnerRechtliches = lazy(() => import("@/pages/partner/PartnerRechtliches"));
const PartnerHorseView = lazy(() => import("@/pages/partner/PartnerHorseView"));
const PartnerNotes = lazy(() => import("@/pages/partner/PartnerNotes"));
const PartnerChat = lazy(() => import("@/pages/partner/PartnerChat"));
const PartnerProfile = lazy(() => import("@/pages/partner/PartnerProfile"));
const PartnerInvite = lazy(() => import("@/pages/PartnerInvite"));
const PartnerCalendar = lazy(() => import("@/pages/partner/PartnerCalendar"));
const PartnerTreatmentPlans = lazy(() => import("@/pages/partner/PartnerTreatmentPlans"));
const PartnerDocuments = lazy(() => import("@/pages/partner/PartnerDocuments"));
const PartnerServices = lazy(() => import("@/pages/partner/PartnerServices"));
const PartnerInvoices = lazy(() => import("@/pages/partner/PartnerInvoices"));
const PartnerSettings = lazy(() => import("@/pages/partner/PartnerSettings"));
const PartnerManagementHub = lazy(() => import("@/pages/partner/PartnerManagementHub"));
const PartnerManagementProfil = lazy(() => import("@/pages/partner/PartnerManagementProfil"));
const PartnerManagementOeffentlich = lazy(() => import("@/pages/partner/PartnerManagementOeffentlich"));
const PartnerManagementKommunikation = lazy(() => import("@/pages/partner/PartnerManagementKommunikation"));
const PartnerManagementAbo = lazy(() => import("@/pages/partner/PartnerManagementAbo"));
const PartnerManagementRechtliches = lazy(() => import("@/pages/partner/PartnerManagementRechtliches"));
const PartnerPferde = lazy(() => import("@/pages/partner/PartnerPferde"));
const PartnerKunden = lazy(() => import("@/pages/partner/PartnerKunden"));
const PartnerConnect = lazy(() => import("@/pages/partner/PartnerConnect"));
const PartnerPublicProfile = lazy(() => import("@/pages/partner/PartnerPublicProfile"));
const PreviewLanding = lazy(() => import("@/pages/PreviewLanding"));

// Layouts (lazy)
const EmployeeAppLayout = lazy(() => import("@/components/employee/EmployeeAppLayout").then(m => ({ default: m.EmployeeAppLayout })));
const PartnerAppLayout = lazy(() => import("@/components/partner/PartnerAppLayout").then(m => ({ default: m.PartnerAppLayout })));

// Components
import { AIChatWidget } from "@/components/chat/AIChatWidget";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { VersionChecker } from "@/components/version/VersionChecker";
import { SystemStatusBanner } from "@/components/notifications/SystemStatusBanner";

// Suspense fallback with timeout
const LazyFallback = () => {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 15000);
    return () => clearTimeout(timer);
  }, []);

  if (timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-sm text-muted-foreground">
            Laden fehlgeschlagen. Bitte Seite neu laden.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            Neu laden
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

// Create persister for IndexedDB storage
const persister = createIDBPersister();
// Lazy-load portal pages for subdomain routing
const PortalLogin = lazy(() => import("@/pages/portal/PortalLogin"));
const MarketplacePublic = lazy(() => import("@/pages/portal/MarketplacePublic"));
const VetPortalLogin = lazy(() => import("@/pages/portal/VetPortalLogin"));
const VetDashboard = lazy(() => import("@/pages/vet/VetDashboard"));
const VetSOAPForm = lazy(() => import("@/pages/vet/VetSOAPForm"));
const VetPMSConnect = lazy(() => import("@/pages/vet/VetPMSConnect"));
const VetCSVImport = lazy(() => import("@/pages/vet/VetCSVImport"));
const VetGOTRechner = lazy(() => import("@/pages/vet/VetGOTRechner"));
const TierarztFinder = lazy(() => import("@/pages/TierarztFinder"));
const VetImpfungen = lazy(() => import("@/pages/vet/VetImpfungen"));

/** Intercepts /pferdeakte routes and portal subdomains BEFORE AuthProvider */
function PferdeakteRouteGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const path = location.pathname;
  const portalMode = detectPortalMode();

  // Subdomain routing: portal.hufmanager.de or versicherung.hufmanager.de
  if (portalMode.mode === 'portal' || portalMode.mode === 'insurance') {
    return (
      <AuthProvider>
        <Suspense fallback={<LazyFallback />}>
          <Routes>
            <Route path="/portal/:slug" element={<PortalDashboard />} />
            <Route path="/portal/:slug/settings" element={<PortalSettings />} />
            <Route path="*" element={<PortalLogin mode={portalMode.mode} />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    );
  }

  // Subdomain routing: markt.hufmanager.de
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

  // Subdomain routing: tierarzt.hufmanager.de
  if (portalMode.mode === 'veterinary') {
    return (
      <AuthProvider>
        <Suspense fallback={<LazyFallback />}>
          <Routes>
            <Route path="/vet/dashboard" element={<VetDashboard />} />
            <Route path="/vet/soap" element={<VetSOAPForm />} />
            <Route path="/vet/pms-connect" element={<VetPMSConnect />} />
            <Route path="/vet/csv-import" element={<VetCSVImport />} />
            <Route path="/vet/got-rechner" element={<VetGOTRechner />} />
            <Route path="/vet/impfungen" element={<VetImpfungen />} />
            <Route path="/tierarzt-finder" element={<TierarztFinder />} />
            <Route path="*" element={<VetPortalLogin />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    );
  }

  // Intercept public routes that don't need AuthProvider
  if (path.startsWith('/pferdeakte') || path.startsWith('/notfall/') || path === '/botschafter/login' || path === '/botschafter/warten') {
    return (
      <Suspense fallback={<LazyFallback />}>
        <Routes>
          <Route path="/pferdeakte" element={<PferdeakteLanding />} />
          <Route path="/pferdeakte/botschafter" element={<PferdeakteBotschafter />} />
          <Route path="/pferdeakte/*" element={<PferdeakteLanding />} />
          <Route path="/notfall/:eqid/:token" element={<NotfallZugang />} />
          <Route path="/botschafter/login" element={<BotschafterAuth />} />
          <Route path="/botschafter/warten" element={<BotschafterWarten />} />
        </Routes>
      </Suspense>
    );
  }
  return <>{children}</>;
}

function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: QUERY_CACHE_MAX_AGE, // 7 days
            staleTime: 1000 * 60 * 5, // 5 minutes default
            retry: (failureCount, error) => {
              // Don't retry if offline
              if (!navigator.onLine) return false;
              return failureCount < 3;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            networkMode: "offlineFirst",
            // Silent failures when offline - no error toasts
            throwOnError: false,
          },
          mutations: {
            networkMode: "offlineFirst",
            retry: (failureCount, error) => {
              if (!navigator.onLine) return false;
              return failureCount < 3;
            },
          },
        },
      })
  );

  useEffect(() => {
    const cleanupSync = initSyncManager();
    const cleanupImageSync = initImageSyncManager();
    return () => {
      cleanupSync();
      cleanupImageSync();
    };
  }, []);

  // Affiliate ?ref= tracking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && ref.length <= 20 && /^[A-Z0-9-]+$/i.test(ref)) {
      localStorage.setItem("huf_affiliate_ref", ref.toUpperCase());
      localStorage.setItem("huf_affiliate_ref_ts", Date.now().toString());
    }
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: QUERY_CACHE_MAX_AGE,
        buster: "v3", // Increment when schema changes – v3: fix stale cockpit cache
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            // Don't persist cockpit queries – they're daily/realtime
            const key = query.queryKey[0] as string;
            if (key?.startsWith("cockpit-")) return false;
            return query.state.status === "success";
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

// Separate component that can use useAuth and Profile Guardian
function AppContent({ queryClient }: { queryClient: QueryClient }) {
  const { user, loading } = useAuth();
  const { isRepairing, repairError, isProfileReady, retry } = useProfileGuardian(user);

  // Show loading screen while checking authentication
  if (loading) {
    return <AuthLoadingScreen />;
  }

  // Show profile repair screen if authenticated but profile is being repaired
  // Only block if still repairing AND not yet ready (safety timeout will release)
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
        <AIChatWidget />
        <PWAInstallPrompt />
        <VersionChecker />
        <SystemStatusBanner />
        
        
        <PasswordRecoveryRedirect>
          <Suspense fallback={<LazyFallback />}>
          <Routes>
            {/* --- 1. ÖFFENTLICHE ROUTES (Kein Login nötig) --- */}
            {/* WICHTIG: Diese müssen VOR den Protected Routes stehen */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />
             {/* Legacy/alias route */}
             <Route path="/dashboard" element={<Navigate to="/home" replace />} />
            
            {/* Domain-basierte Weiche: www.hufmanager.de → LP, app.hufmanager.de → Dashboard */}
            <Route path="/" element={<Index />} />
            
            {/* Widget Embeds (öffentlich, kein Auth) */}
            <Route path="/widget/:slug/:type" element={<WidgetPage />} />
            
            {/* Provider Website (Multi-Page) */}
            <Route path="/p/:slug" element={<ProviderLanding />} />
            <Route path="/p/:slug/:page" element={<ProviderLanding />} />
            
            {/* Preview Links (öffentlich, kein Auth) */}
            <Route path="/preview/:token" element={<PreviewLanding />} />

            {/* Einladungs-Links für Kunden */}
            <Route path="/connect/:slug" element={<ConnectForm />} />
            
            {/* Partner-Einladung (öffentlich) */}
            <Route path="/partner-invite/:token" element={<PartnerInvite />} />
            
            {/* Öffentliches Partner-Profil (kein Login nötig) */}
            <Route path="/partner/:prid" element={<PartnerPublicProfile />} />
            
            {/* Öffentliche Review-Seite */}
            <Route path="/submit-review" element={<SubmitReview />} />
            <Route path="/bewertung/:providerId" element={<SubmitReview />} />
            
            {/* Website / Landing Page Routes */}
            <Route path="/website" element={<WebsiteHome />} />
            <Route path="/impressum" element={<WebsiteImpressum />} />
            <Route path="/datenschutz" element={<WebsiteDatenschutz />} />
            <Route path="/agb" element={<WebsiteAGB />} />
            <Route path="/vertrauen" element={<WebsiteVertrauen />} />
            <Route path="/widerruf" element={<WebsiteWiderruf />} />
            
            {/* Öffentliche Blog-Seiten */}
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            
            {/* Öffentliches Glossar */}
            <Route path="/glossar" element={<Glossar />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/changelog" element={<Changelog />} />
            <Route path="/statistiken" element={<Statistiken />} />
            <Route path="/tierarzt-finder" element={<TierarztFinder />} />
            
            {/* Vet Portal Routes (accessible from main app too) */}
            <Route path="/vet/dashboard" element={<VetDashboard />} />
            <Route path="/vet/soap" element={<VetSOAPForm />} />
            <Route path="/vet/pms-connect" element={<VetPMSConnect />} />
            <Route path="/vet/csv-import" element={<VetCSVImport />} />
            <Route path="/vet/got-rechner" element={<VetGOTRechner />} />
            
            {/* Portal Routes (auth required, handled inside component) */}
            <Route path="/portal/:slug" element={<PortalDashboard />} />
            <Route path="/portal/:slug/settings" element={<PortalSettings />} />
            
            {/* Pferdeakte is handled by PferdeakteRouteGuard above AppContent */}
            
            {/* Öffentliche Dokumentation */}
            <Route path="/docs" element={<Docs />} />
            <Route path="/docs/changelog" element={<Docs />} />

            {/* Botschafter-App - für alle eingeloggten Nutzer (inkl. reine Botschafter ohne App-Rolle) */}
            <Route path="/botschafter/uebersicht" element={
              <ProtectedRoute>
                <BotschafterUebersicht />
              </ProtectedRoute>
            } />
            <Route path="/botschafter/werbemittel" element={
              <ProtectedRoute>
                <BotschafterWerbemittelPage />
              </ProtectedRoute>
            } />
            <Route path="/botschafter/werbemittel/erstellen" element={
              <ProtectedRoute>
                <WerbemittelEditor />
              </ProtectedRoute>
            } />
            <Route path="/botschafter/nachrichten" element={
              <ProtectedRoute>
                <BotschafterNachrichten />
              </ProtectedRoute>
            } />
            
            {/* Admin Mission Control - nur für Admins */}
            <Route path="/admin/mission-control" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <MissionControl />
              </ProtectedRoute>
            } />
            
            {/* God Mode Dashboard - Master Admin */}
            <Route path="/admin/god-mode" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            {/* Admin Notfall-Dashboard */}
            <Route path="/admin/notfall" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <EmergencyDashboard />
              </ProtectedRoute>
            } />

            {/* Feature Usage Overview - Admin */}
            <Route path="/admin/feature-usage" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <FeatureUsageOverview />
              </ProtectedRoute>
            } />
            <Route path="/admin/module-access-logs" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <ModuleAccessLogs />
              </ProtectedRoute>
            } />
            <Route path="/admin/verarbeitungsverzeichnis" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Verarbeitungsverzeichnis />
              </ProtectedRoute>
            } />
            <Route path="/admin/rollen" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminRoles />
              </ProtectedRoute>
            } />
            <Route path="/admin/seed-demo" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminSeedDemo />
              </ProtectedRoute>
            } />
            <Route path="/admin/smoke-test" element={
              <ProtectedRoute allowedRoles={["provider", "admin"]}>
                <AdminSmokeTest />
              </ProtectedRoute>
            } />
            <Route path="/admin/organizations" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminOrganizations />
              </ProtectedRoute>
            } />

            {/* --- 2. PROVIDER (PROFI) ROUTES --- */}
            <Route
              element={
                <ProtectedRoute allowedRoles={["provider", "admin"]}>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/home" element={<Dashboard />} />
              <Route path="/anfragen" element={<Anfragen />} />
              <Route path="/angebote" element={<Angebote />} />
              <Route path="/aufnahme" element={<Aufnahme />} />
              <Route path="/pferde" element={<Pferde />} />
              <Route path="/auffassen" element={<AuffassenHub />} />
              <Route path="/auffassen/feedback" element={<Auffassen />} />
              <Route path="/analyse" element={<AnalyseHub />} />
              <Route path="/analyse/betriebszahlen" element={<Analyse />} />
              {/* Beide Schreibweisen für Kalender abfangen */}
              <Route path="/calendar" element={<Kalender />} />
              <Route path="/kalender" element={<Kalender />} />
              {/* Beide Schreibweisen für Kunden abfangen */}
              <Route path="/customers" element={<Kunden />} />
              <Route path="/kunden" element={<Kunden />} />
              
              <Route path="/netzwerk" element={<Netzwerk />} />
              <Route path="/services" element={<Navigate to="/mein-angebot" replace />} />
              <Route path="/preise" element={<Navigate to="/mein-angebot" replace />} />
              <Route path="/mein-angebot" element={<MeinAngebot />} />
              <Route path="/management" element={<ManagementHub />} />
              <Route path="/management/profil" element={<ManagementProfil />} />
              <Route path="/management/website" element={<ManagementWebsite />} />
              <Route path="/management/kommunikation" element={<ManagementKommunikation />} />
              <Route path="/management/abo" element={<ManagementAbo />} />
              <Route path="/management/rechtliches" element={<ManagementRechtliches />} />
              <Route path="/management/import" element={<ImportCenter />} />
              <Route path="/management/botschafter" element={<ManagementBotschafter />} />
              <Route path="/academy" element={<Academy />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/partner" element={<GeldVerdienen />} />
              <Route path="/hufrente" element={<Hufrente />} />
              <Route path="/hufanalyse" element={<Hufanalyse />} />
              <Route path="/work-mode" element={<WorkMode />} />
              <Route path="/tour" element={<Tour />} />
              <Route path="/ausgaben" element={<Ausgaben />} />
              <Route path="/fuhrpark" element={<Fuhrpark />} />
              <Route path="/guv" element={<GuV />} />
              <Route path="/buchhaltung" element={<Buchhaltung />} />
              <Route path="/rechnungen" element={<Rechnungen />} />
              <Route path="/lager" element={<Lager />} />
              <Route path="/team" element={<Team />} />
              <Route path="/mein-office" element={<MeinOffice />} />
              <Route path="/mein-office/:id" element={<OfficeEditor />} />
              <Route path="/support" element={<Support />} />
              <Route path="/hilfe" element={<Hilfe />} />
              <Route path="/status" element={<Status />} />
              <Route path="/ecosystem" element={<Navigate to="/hm-connect" replace />} />
              <Route path="/hm-connect" element={<HMConnect />} />
              <Route path="/autoflow" element={<AutoFlow />} />
              <Route path="/abo-matrix" element={<AboMatrix />} />
              <Route path="/marketplace" element={<Marketplace />} />
              {/* neu: Notfall-Dashboard für Provider */}
              <Route path="/notfall" element={<EmergencyDashboard />} />
              {/* Provider Horse Detail - Direct Access */}
              <Route path="/horse/:id" element={<ProviderHorseDetail />} />
              {/* German alias for horse detail */}
              <Route path="/pferd/:id" element={<ProviderHorseDetail />} />
              {/* Meine Website - Provider Website Editor */}
              <Route path="/meine-website" element={<MeineWebsite />} />
              <Route path="/landing-editor" element={<LandingEditor />} />
            </Route>

            {/* --- 3. CLIENT (PFERDEBESITZER) ROUTES --- */}
            <Route
              element={
                <ProtectedRoute allowedRoles={["client"]}>
                  <ClientLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/client-home" element={<ClientHome />} />
              <Route path="/client-horse/:id" element={<ClientHorseDetail />} />
              <Route path="/client-invoices" element={<ClientInvoices />} />
              <Route path="/client-permissions" element={<ClientPermissions />} />
              <Route path="/client-booking" element={<ClientBooking />} />
              <Route path="/client-profile" element={<ClientProfile />} />
              <Route path="/client-chat" element={<ClientChat />} />
              <Route path="/client-stall" element={<ClientStallBoard />} />
              <Route path="/client-horses" element={<ClientHorses />} />
              <Route path="/client-locations" element={<ClientLocations />} />
              <Route path="/client-notifications" element={<ClientNotifications />} />
              <Route path="/client-orders" element={<ClientOrders />} />
              <Route path="/client-notfall" element={<EmergencyDashboard />} />
              <Route path="/client/botschafter" element={<ClientBotschafter />} />
              <Route path="/client/search-providers" element={<SearchProviders />} />
            </Route>

            {/* --- 4. EMPLOYEE (MITARBEITER) ROUTES --- */}
            {/* Employee invite - public route */}
            <Route path="/employee-invite" element={<EmployeeInvite />} />
            
            {/* Employee app - protected with EmployeeAppLayout */}
            <Route
              element={
                <ProtectedRoute allowedRoles={["employee"]}>
                  <EmployeeAppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/employee" element={<EmployeeDashboard />} />
              <Route path="/employee/tour" element={<EmployeeTour />} />
              <Route path="/employee/pferd/:id" element={<EmployeeHorseDetail />} />
              <Route path="/employee/timer" element={<EmployeeTimer />} />
              <Route path="/employee/hufcam" element={<EmployeeHufCam />} />
              <Route path="/employee/analyse" element={<EmployeeAnalyse />} />
              <Route path="/employee/chat" element={<EmployeeChat />} />
              <Route path="/employee/material" element={<EmployeeMaterial />} />
              <Route path="/employee/abwesenheiten" element={<EmployeeAbwesenheiten />} />
              <Route path="/employee/vertrag" element={<EmployeeVertrag />} />
              <Route path="/employee/angebot" element={<MeinAngebot readOnly />} />
              <Route path="/employee/notizbuch" element={<EmployeeNotizbuch />} />
              <Route path="/employee/profil" element={<EmployeeProfil />} />
              <Route path="/employee/kalender" element={<EmployeeCalendar />} />
              <Route path="/employee/management" element={<EmployeeManagementHub />} />
              <Route path="/employee/management/profil" element={<EmployeeManagementProfil />} />
              <Route path="/employee/management/einstellungen" element={<EmployeeManagementEinstellungen />} />
              <Route path="/employee/management/botschafter" element={<EmployeeManagementBotschafter />} />
              <Route path="/employee/support" element={<Support />} />
              <Route path="/employee/pferde" element={<EmployeePferde />} />
            </Route>

            {/* --- 5. PARTNER (FACHPARTNER) ROUTES --- */}
            <Route
              element={
                <ProtectedRoute allowedRoles={["partner"]}>
                  <PartnerAppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/partner-home" element={<PartnerHome />} />
              <Route path="/partner-horse/:id" element={<PartnerHorseView />} />
              <Route path="/partner-horses" element={<PartnerPferde />} />
              <Route path="/partner-pferde" element={<PartnerPferde />} />
              <Route path="/partner-calendar" element={<PartnerCalendar />} />
              <Route path="/partner-notes" element={<PartnerNotes />} />
              <Route path="/partner-plans" element={<PartnerTreatmentPlans />} />
              <Route path="/partner-documents" element={<PartnerDocuments />} />
              <Route path="/partner-services" element={<PartnerServices />} />
              <Route path="/partner-invoices" element={<PartnerInvoices />} />
              <Route path="/partner-website" element={<MeineWebsite />} />
              <Route path="/partner-chat" element={<PartnerChat />} />
              <Route path="/partner-settings" element={<PartnerSettings />} />
              <Route path="/partner-profile" element={<PartnerProfile />} />
              <Route path="/partner-notfall" element={<EmergencyDashboard />} />
              <Route path="/partner-connect" element={<PartnerConnect />} />
              <Route path="/partner-tour" element={<Tour />} />
              <Route path="/partner-work-mode" element={<WorkMode />} />
              <Route path="/partner-feedback" element={<Auffassen />} />
              <Route path="/partner-fuhrpark" element={<Fuhrpark />} />
              <Route path="/partner-anfragen" element={<Anfragen />} />
              <Route path="/partner-angebote" element={<Angebote />} />
              <Route path="/partner-kunden" element={<PartnerKunden />} />
              <Route path="/partner-ausgaben" element={<Ausgaben />} />
              <Route path="/partner-buchhaltung" element={<Buchhaltung />} />
              <Route path="/partner-guv" element={<GuV />} />
              <Route path="/partner-analyse" element={<Analyse />} />
              <Route path="/partner-office" element={<MeinOffice />} />
              <Route path="/partner-office/:id" element={<OfficeEditor />} />
              <Route path="/partner-lager" element={<Lager />} />
              <Route path="/partner-autoflow" element={<AutoFlow />} />
              <Route path="/partner-management" element={<PartnerManagementHub />} />
              <Route path="/partner-management/profil" element={<PartnerManagementProfil />} />
              <Route path="/partner-management/oeffentlich" element={<PartnerManagementOeffentlich />} />
              <Route path="/partner-management/kommunikation" element={<PartnerManagementKommunikation />} />
              <Route path="/partner-management/abo" element={<PartnerManagementAbo />} />
              <Route path="/partner-management/rechtliches" element={<PartnerManagementRechtliches />} />
              <Route path="/partner-management/botschafter" element={<PartnerManagementBotschafter />} />
              <Route path="/partner-support" element={<Support />} />
              <Route path="/partner-rechtliches" element={<PartnerRechtliches />} />
            </Route>

            {/* Fallback für alles andere */}
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

// Simple client layout wrapper with ErrorBoundary
function ClientLayout() {
  const location = useLocation();
  
  // Dynamic import to avoid circular dependencies
  const [HelpCenterFAB, setHelpCenterFAB] = useState<React.ComponentType<{ currentRoute?: string }> | null>(null);
  
  useEffect(() => {
    import("@/components/help").then((mod) => {
      setHelpCenterFAB(() => mod.HelpCenterFAB);
    });
  }, []);
  
  return (
    <div className="min-h-screen bg-background">
      <ErrorBoundary name="ClientApp" fallback={<ClientErrorFallbackComponent />}>
        <Outlet />
      </ErrorBoundary>
      {HelpCenterFAB && <HelpCenterFAB currentRoute={location.pathname} />}
    </div>
  );
}

export default App;