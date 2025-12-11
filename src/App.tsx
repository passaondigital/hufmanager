import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PasswordRecoveryRedirect } from "@/components/auth/PasswordRecoveryRedirect";
import { AppLayout } from "@/components/layout/AppLayout";
import { OfflineIndicator } from "@/components/offline/OfflineIndicator";
import { createIDBPersister } from "@/lib/offline/persister";
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
import NotFound from "@/pages/NotFound";
import ProviderLanding from "@/pages/ProviderLanding";
import ImportCenter from "@/pages/ImportCenter";
import ConnectForm from "@/pages/ConnectForm";
import Netzwerk from "@/pages/Netzwerk";

// Components
import { AIChatWidget } from "@/components/chat/AIChatWidget";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";

// Create persister for IndexedDB storage
const persister = createIDBPersister();

function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: 1000 * 60 * 60 * 24, // 24 hours
            staleTime: 1000 * 60 * 5, // 5 minutes
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            networkMode: "offlineFirst",
          },
          mutations: {
            networkMode: "offlineFirst",
            retry: 3,
          },
        },
      })
  );

  useEffect(() => {
    const cleanup = initSyncManager();
    return cleanup;
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24,
        buster: "v1",
      }}
    >
      <ThemeProvider defaultTheme="dark">
        <BrowserRouter>
          <AuthProvider>
            <SubscriptionProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <AIChatWidget />
                <PWAInstallPrompt />
                
                {/* Global offline indicator */}
                <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50">
                  <OfflineIndicator />
                </div>
                
                <PasswordRecoveryRedirect>
                  <Routes>
                    {/* --- 1. ÖFFENTLICHE ROUTES (Kein Login nötig) --- */}
                    {/* WICHTIG: Diese müssen VOR den Protected Routes stehen */}
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/update-password" element={<UpdatePassword />} />
                    
                    {/* Landingpages für Hufbearbeiter (z.B. hufmanager.de/p/max-mustermann) */}
                    <Route path="/p/:slug" element={<ProviderLanding />} />
                    
                    {/* Einladungs-Links für Kunden */}
                    <Route path="/connect/:slug" element={<ConnectForm />} />

                    {/* --- 2. PROVIDER (PROFI) ROUTES --- */}
                    <Route
                      element={
                        <ProtectedRoute allowedRoles={["provider"]}>
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
                      <Route path="/rechnungen" element={<Rechnungen />} />
                      <Route path="/support" element={<Support />} />
                    </Route>

                    {/* --- 3. CLIENT (PFERDEBESITZER) ROUTES --- */}
                    <Route
                      element={
                        <ProtectedRoute allowedRoles={["client"]}>
                           {/* Hier könnte man auch ein ClientLayout nutzen */}
                           <div className="min-h-screen bg-background">
                              {/* Client Routes direct mapping */}
                              <Routes>
                                <Route path="/client-home" element={<ClientHome />} />
                                <Route path="/client-horse/:id" element={<ClientHorseDetail />} />
                                <Route path="/client-invoices" element={<ClientInvoices />} />
                                <Route path="/client-permissions" element={<ClientPermissions />} />
                                <Route path="/client-booking" element={<ClientBooking />} />
                                <Route path="/client-profile" element={<ClientProfile />} />
                              </Routes>
                           </div>
                        </ProtectedRoute>
                      }
                    >
                        {/* ACHTUNG: React Router 6 Nested Routes Workaround.
                           Da oben schon Routes definiert sind, fangen wir hier die Pfade ab.
                           Wir duplizieren sie hier explizit für die Struktur.
                        */}
                        <Route path="/client-home" element={<ClientHome />} />
                        <Route path="/client-horse/:id" element={<ClientHorseDetail />} />
                        <Route path="/client-invoices" element={<ClientInvoices />} />
                        <Route path="/client-permissions" element={<ClientPermissions />} />
                        <Route path="/client-booking" element={<ClientBooking />} />
                        <Route path="/client-profile" element={<ClientProfile />} />
                    </Route>

                    {/* Fallback für alles andere */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </PasswordRecoveryRedirect>
              </TooltipProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}

export default App;