import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PasswordRecoveryRedirect } from "@/components/auth/PasswordRecoveryRedirect";
import { AppLayout } from "@/components/layout/AppLayout";
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
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import UpdatePassword from "@/pages/UpdatePassword";
import { AIChatWidget } from "@/components/chat/AIChatWidget";
import ClientHome from "@/pages/ClientHome";
import ClientHorseDetail from "@/pages/ClientHorseDetail";
import ClientInvoices from "@/pages/ClientInvoices";
import ClientPermissions from "@/pages/ClientPermissions";
import NotFound from "@/pages/NotFound";

function App() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <BrowserRouter>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <AIChatWidget />
              <PasswordRecoveryRedirect>
                <Routes>
                  {/* Public routes */}
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/update-password" element={<UpdatePassword />} />
                
                {/* Provider (Admin) routes */}
                <Route element={
                  <ProtectedRoute allowedRoles={["provider"]}>
                    <AppLayout />
                  </ProtectedRoute>
                }>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/anfragen" element={<Anfragen />} />
                  <Route path="/angebote" element={<Angebote />} />
                  <Route path="/aufnahme" element={<Aufnahme />} />
                  <Route path="/auffassen" element={<Auffassen />} />
                  <Route path="/analyse" element={<Analyse />} />
                  <Route path="/calendar" element={<Kalender />} />
                  <Route path="/kalender" element={<Kalender />} />
                  <Route path="/customers" element={<Kunden />} />
                  <Route path="/kunden" element={<Kunden />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/management" element={<Management />} />
                  <Route path="/academy" element={<Academy />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/partner" element={<GeldVerdienen />} />
                </Route>
                
                {/* Client routes */}
                <Route path="/client-home" element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <ClientHome />
                  </ProtectedRoute>
                } />
                <Route path="/client-horse/:id" element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <ClientHorseDetail />
                  </ProtectedRoute>
                } />
                <Route path="/client-invoices" element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <ClientInvoices />
                  </ProtectedRoute>
                } />
                <Route path="/client-permissions" element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <ClientPermissions />
                  </ProtectedRoute>
                } />
                
                  {/* Fallback */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </PasswordRecoveryRedirect>
            </TooltipProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
