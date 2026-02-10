import { useState, useEffect } from "react";
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
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";
import { ProfileGuardianScreen } from "@/components/auth/ProfileGuardianScreen";
import { createIDBPersister, initImageSyncManager, QUERY_CACHE_MAX_AGE, STATIC_QUERY_KEYS } from "@/lib/offline";
import { initSyncManager } from "@/lib/offline/syncManager";

// Pages
import Dashboard from "@/pages/Dashboard";
import Anfragen from "@/pages/Anfragen";
import Angebote from "@/pages/Angebote";
import Aufnahme from "@/pages/Aufnahme";
import Auffassen from "@/pages/Auffassen";
import Analyse from "@/pages/Analyse";
import Kalender from "@/pages/Kalender";
import Kunden from "@/pages/Kunden";
import Services from "@/pages/Services";
import Management from "@/pages/Management";
import Academy from "@/pages/Academy";
import Chat from "@/pages/Chat";
import GeldVerdienen from "@/pages/GeldVerdienen";
import Hufanalyse from "@/pages/Hufanalyse";
import Rechnungen from "@/pages/Rechnungen";
import Support from "@/pages/Support";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import UpdatePassword from "@/pages/UpdatePassword";
import ClientHome from "@/pages/ClientHome";
import ClientHorseDetail from "@/pages/ClientHorseDetail";
import ClientInvoices from "@/pages/ClientInvoices";
import ClientPermissions from "@/pages/ClientPermissions";
import ClientBooking from "@/pages/ClientBooking";
import ClientProfile from "@/pages/ClientProfile";
import ClientChat from "@/pages/ClientChat";
import NotFound from "@/pages/NotFound";
import ProviderLanding from "@/pages/ProviderLanding";
import ProviderHorseDetail from "@/pages/ProviderHorseDetail";
import ImportCenter from "@/pages/ImportCenter";
import ConnectForm from "@/pages/ConnectForm";
import Netzwerk from "@/pages/Netzwerk";
import MissionControl from "@/pages/admin/MissionControl";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import FeatureUsageOverview from "@/pages/admin/FeatureUsageOverview";
import ModuleAccessLogs from "@/pages/admin/ModuleAccessLogs";
import SubmitReview from "@/pages/SubmitReview";
import AboMatrix from "@/pages/AboMatrix";
import Blog from "@/pages/Blog";
import BlogPost from "@/pages/BlogPost";
import Lager from "@/pages/Lager";
import Ausgaben from "@/pages/Ausgaben";
import WorkMode from "@/pages/WorkMode";
import Tour from "@/pages/Tour";
import Team from "@/pages/Team";
import EmployeeDashboard from "@/pages/EmployeeDashboard";
import EmployeeInvite from "@/pages/EmployeeInvite";
import EmployeeTour from "@/pages/EmployeeTour";

// Components
import { AIChatWidget } from "@/components/chat/AIChatWidget";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { VersionChecker } from "@/components/version/VersionChecker";

// Create persister for IndexedDB storage
const persister = createIDBPersister();

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

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: QUERY_CACHE_MAX_AGE,
        buster: "v2", // Increment when schema changes
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            // Always persist queries for offline use
            return query.state.status === "success";
          },
        },
      }}
    >
      <ThemeProvider defaultTheme="dark">
        <BrowserRouter>
          <AuthProvider>
            <AppContent queryClient={queryClient} />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}

// Separate component that can use useAuth and Profile Guardian
function AppContent({ queryClient }: { queryClient: QueryClient }) {
  const { user, loading } = useAuth();
  const { isRepairing, repairError, isProfileReady } = useProfileGuardian(user);

  // Show loading screen while checking authentication
  if (loading) {
    return <AuthLoadingScreen />;
  }

  // Show profile repair screen if authenticated but profile is being repaired
  if (user && (isRepairing || !isProfileReady)) {
    return <ProfileGuardianScreen isRepairing={isRepairing} error={repairError} />;
  }

  return (
    <SubscriptionProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AIChatWidget />
        <PWAInstallPrompt />
        <VersionChecker />
        
        
        
        <PasswordRecoveryRedirect>
          <Routes>
            {/* --- 1. ÖFFENTLICHE ROUTES (Kein Login nötig) --- */}
            {/* WICHTIG: Diese müssen VOR den Protected Routes stehen */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />
             {/* Legacy/alias route */}
             <Route path="/dashboard" element={<Navigate to="/" replace />} />
            
            {/* Landingpages für Hufbearbeiter (z.B. hufmanager.de/p/max-mustermann) */}
            <Route path="/p/:slug" element={<ProviderLanding />} />
            
            {/* Einladungs-Links für Kunden */}
            <Route path="/connect/:slug" element={<ConnectForm />} />
            
            {/* Öffentliche Review-Seite */}
            <Route path="/submit-review" element={<SubmitReview />} />
            <Route path="/bewertung/:providerId" element={<SubmitReview />} />
            
            {/* Öffentliche Blog-Seiten */}
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            
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

            {/* --- 2. PROVIDER (PROFI) ROUTES --- */}
            <Route
              element={
                <ProtectedRoute allowedRoles={["provider", "admin"]}>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/anfragen" element={<Anfragen />} />
              <Route path="/angebote" element={<Angebote />} />
              <Route path="/aufnahme" element={<Aufnahme />} />
              <Route path="/auffassen" element={<Auffassen />} />
              <Route path="/analyse" element={<Analyse />} />
              {/* Beide Schreibweisen für Kalender abfangen */}
              <Route path="/calendar" element={<Kalender />} />
              <Route path="/kalender" element={<Kalender />} />
              {/* Beide Schreibweisen für Kunden abfangen */}
              <Route path="/customers" element={<Kunden />} />
              <Route path="/kunden" element={<Kunden />} />
              
              <Route path="/netzwerk" element={<Netzwerk />} />
              <Route path="/services" element={<Services />} />
              <Route path="/management" element={<Management />} />
              <Route path="/management/import" element={<ImportCenter />} />
              <Route path="/academy" element={<Academy />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/partner" element={<GeldVerdienen />} />
              <Route path="/hufanalyse" element={<Hufanalyse />} />
              <Route path="/work-mode" element={<WorkMode />} />
              <Route path="/tour" element={<Tour />} />
              <Route path="/ausgaben" element={<Ausgaben />} />
              <Route path="/rechnungen" element={<Rechnungen />} />
              <Route path="/lager" element={<Lager />} />
              <Route path="/team" element={<Team />} />
              <Route path="/support" element={<Support />} />
              <Route path="/abo-matrix" element={<AboMatrix />} />
              {/* Provider Horse Detail - Direct Access */}
              <Route path="/horse/:id" element={<ProviderHorseDetail />} />
              {/* German alias for horse detail */}
              <Route path="/pferd/:id" element={<ProviderHorseDetail />} />
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
            </Route>

            {/* --- 4. EMPLOYEE (MITARBEITER) ROUTES --- */}
            {/* Employee invite - public route */}
            <Route path="/employee-invite" element={<EmployeeInvite />} />
            
            {/* Employee dashboard - protected */}
            <Route
              path="/employee"
              element={
                <ProtectedRoute allowedRoles={["employee"]}>
                  <EmployeeDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee/tour"
              element={
                <ProtectedRoute allowedRoles={["employee"]}>
                  <EmployeeTour />
                </ProtectedRoute>
              }
            />

            {/* Fallback für alles andere */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </PasswordRecoveryRedirect>
      </TooltipProvider>
    </SubscriptionProvider>
  );
}

// Simple client layout wrapper
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
      <Outlet />
      {HelpCenterFAB && <HelpCenterFAB currentRoute={location.pathname} />}
    </div>
  );
}

export default App;