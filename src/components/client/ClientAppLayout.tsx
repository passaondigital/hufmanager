import { useState, useMemo } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppSidebar, MobileAppSidebar, NavigationConfig } from "@/components/shared/AppSidebar";
import { AppTopBar } from "@/components/layout/AppTopBar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import "@/styles/hm-theme.css";
import { FEATURE_FLAGS } from "@/config/featureFlags";
import { useClientMode } from "@/hooks/useClientMode";

type ClientModeType = "private" | "stall" | "commercial";

function getClientNavigationConfig(mode: ClientModeType, isVerified: boolean): NavigationConfig {
  const isStall = mode === "stall" && FEATURE_FLAGS.stallbetreiberRolle.enabled;
  const isCommercial = mode === "commercial" && FEATURE_FLAGS.stallbetreiberRolle.enabled;
  const isBusiness = isStall || isCommercial;

  return {
    directItems: [
      { label: "Dashboard", iconName: "Home", path: "/client-home" },
    ],
    groups: [
      {
        label: "Meine Pferde",
        items: [
          { label: "Pferde", iconName: "Heart", path: "/client-horses" },
          ...(isStall ? [{ label: "Stallboard", iconName: "Warehouse", path: "/client-stall" }] : []),
        ],
      },
      {
        label: "Termine & Aufträge",
        items: [
          { label: "Buchen", iconName: "Calendar", path: "/client-booking" },
          { label: "Aufträge", iconName: "ClipboardList", path: "/client-orders" },
          { label: "Rechnungen", iconName: "Receipt", path: "/client-invoices" },
        ],
      },
      {
        label: "Kommunikation",
        items: [
          { label: "Chat", iconName: "MessageSquare", path: "/client-chat" },
          { label: "Benachrichtigungen", iconName: "Bell", path: "/client-notifications" },
          { label: "HM Connect", iconName: "Link2", path: "/client-connect" },
          { label: "Netzwerk", iconName: "Users", path: "/client-network" },
          ...(FEATURE_FLAGS.clientMarketplaceBrowse.enabled
            ? [{ label: "Pferdemarkt", iconName: "Store", path: "/client-marketplace" }]
            : []),
          ...(isBusiness ? [{ label: "Meine Inserate", iconName: "Tag", path: "/client-marketplace/mine" }] : []),
        ],
      },
      ...(isStall
        ? [
            {
              label: "Stallbetrieb",
              items: [
                { label: "Stallverwaltung", iconName: "Building2", path: "/client-stall-management" },
                { label: "Tages-Cockpit", iconName: "LayoutDashboard", path: "/client-stall/home" },
                { label: "Kalender", iconName: "CalendarDays", path: "/client-stall/kalender" },
              ],
            },
            {
              label: "Anfrage & Aufnahme",
              items: [
                { label: "Anfragen & Leads", iconName: "Search", path: "/client-stall/anfragen" },
                { label: "Buchungsportal", iconName: "Send", path: "/client-stall/buchungsportal" },
                { label: "Angebote & Verträge", iconName: "FileText", path: "/client-stall/angebote" },
                { label: "Leistungskatalog", iconName: "ClipboardList", path: "/client-stall/leistungen" },
                { label: "Einsteller", iconName: "Users", path: "/client-stall/boarders" },
              ],
            },
            {
              label: "Analyse & Betrieb",
              items: [
                { label: "Betriebsübersicht", iconName: "BarChart3", path: "/client-stall/overview" },
                { label: "Mitarbeiter", iconName: "UserPlus", path: "/client-stall/staff" },
                { label: "Lager & Futter", iconName: "Package", path: "/client-stall/lager" },
                { label: "Stall-Experten", iconName: "Award", path: "/client-stall/experts" },
                { label: "Berichte & Behörden", iconName: "FileText", path: "/client-stall/reports" },
                { label: "Stall-Einstellungen", iconName: "Settings", path: "/client-stall/settings" },
              ],
            },
          ]
        : []),
      ...(isCommercial
        ? [
            {
              label: "Gewerbebetrieb",
              items: [
                { label: "Gewerbeverwaltung", iconName: "Briefcase", path: "/client-business" },
                { label: "Betriebsübersicht", iconName: "BarChart3", path: "/client-business/overview" },
                { label: "Kunden", iconName: "Users", path: "/client-business/customers" },
                { label: "Betriebsrechnungen", iconName: "FileText", path: "/client-business/invoices" },
                { label: "Berichte & Behörden", iconName: "FileText", path: "/client-business/reports" },
              ],
            },
          ]
        : []),
      {
        label: "Verwaltung",
        items: [
          { label: "Berechtigungen", iconName: "Shield", path: "/client-permissions" },
          { label: "Notfall", iconName: "AlertTriangle", path: "/client-notfall" },
          { label: "Experten-Verzeichnis", iconName: "Search", path: "/client/search-providers" },
        ],
      },
      {
        label: "Konto",
        items: [
          { label: "Profil", iconName: "User", path: "/client-profile" },
          { label: "Account-Typ", iconName: "Settings2", path: "/client-account-type" },
          ...(FEATURE_FLAGS.botschafterDashboard.enabled
            ? [{ label: "Botschafter", iconName: "Megaphone", path: "/client/botschafter" }]
            : []),
          { label: "Hilfe & Support", iconName: "LifeBuoy", path: "/client-support" },
        ],
      },
    ],
  };
}

export const ClientAppLayout = () => {
  const { user } = useAuth();
  const { mode, modeInfo } = useClientMode();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const displayName = user?.email?.split("@")[0] || "Pferdebesitzer";
  const navigationConfig = useMemo(
    () => getClientNavigationConfig(mode, modeInfo.isVerified),
    [mode, modeInfo.isVerified]
  );

  return (
    <div className="hm-app min-h-screen min-w-0 max-w-full overflow-x-hidden bg-hm-canvas text-hm-text">
      <div className="hidden lg:block">
        <AppSidebar
          appName={modeInfo.label}
          userDisplayName={displayName}
          navigationConfig={navigationConfig}
        />
      </div>

      <MobileAppSidebar
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
        appName={modeInfo.label}
        userDisplayName={displayName}
        navigationConfig={navigationConfig}
      />

      <div className="min-w-0 max-w-full overflow-x-hidden lg:pl-[var(--hm-sidebar-w)]">
        <AppTopBar />

        <main className="relative z-0 min-h-screen w-full min-w-0 max-w-full overflow-x-hidden px-4 pb-bottom-nav pt-app-header sm:px-6 lg:px-8 lg:pb-10">
          <div className="mx-auto w-full min-w-0 max-w-[1440px]">
            <Outlet />
          </div>
        </main>
      </div>

      <div className="lg:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
};
