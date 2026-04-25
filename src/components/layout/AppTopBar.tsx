import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Grid3X3 } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";

const PATH_TITLES: Record<string, string> = {
  "/home": "Dashboard",
  "/pferde": "Pferde",
  "/chat": "Nachrichten",
  "/kalender": "Kalender",
  "/tour": "Tour",
  "/kunden": "Kunden",
  "/anfragen": "Anfragen",
  "/angebote": "Angebote",
  "/rechnungen": "Rechnungen",
  "/analyse": "Analyse",
  "/management": "Einstellungen",
  "/autoflow": "AutoFlow",
  "/archiv": "Menü",
  "/notizen": "Notizen",
  "/buchhaltung": "Buchhaltung",
  "/hufcam": "HufCam",
  "/hufanalyse": "Wissen",
  "/einstellungen": "Einstellungen",
  "/datenschutz-einstellungen": "Datenschutz",
  "/business-einstellungen": "Business",
};

export default function AppTopBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const NO_BACK = new Set(["/home", "/archiv", "/auth", "/landing", "/"]);
  const isHome = location.pathname === "/home";
  const showBack = !NO_BACK.has(location.pathname);
  const pageTitle = PATH_TITLES[location.pathname] ?? "Hufi";

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderBottom: "1px solid #E5E7EB",
        height: 56,
        paddingLeft: 16,
        paddingRight: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
        paddingTop: "max(env(safe-area-inset-top), 0px)",
      }}
    >
      {/* Left zone */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 56 }}>
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#F3F4F6",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <ChevronLeft size={18} style={{ color: "#374151" }} />
          </button>
        )}
        <button
          onClick={() => navigate("/meine-zentrale")}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
          title="Meine Zentrale"
        >
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "#F97316", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 4 }}>
            <img src="https://upload.assaon.com/files/medien/hufiapp-logo-ohne-text-1777028918553-0kdje.png" alt="Hufi" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0) invert(1)" }} />
          </div>
        </button>
        {isHome && (
          <span style={{ fontWeight: 800, fontSize: 16, color: "#1A1A1A" }}>Hufi</span>
        )}
      </div>

      {/* Center zone — page title */}
      <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>
        {pageTitle}
      </div>

      {/* Right zone */}
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 6, minWidth: 56, justifyContent: "flex-end" }}>
        <NotificationBell />
        <span
          style={{
            background: "rgba(249,115,22,0.12)",
            color: "#F97316",
            border: "1px solid rgba(249,115,22,0.3)",
            borderRadius: 20,
            padding: "3px 9px",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: ".06em",
            textTransform: "uppercase" as const,
          }}
        >
          PRO
        </span>
        <button
          onClick={() => navigate("/archiv")}
          style={{
            width: 32, height: 32, borderRadius: 8,
            background: "#F3F4F6", border: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", flexShrink: 0,
          }}
          title="Menü"
        >
          <Grid3X3 size={16} style={{ color: "#374151" }} />
        </button>
      </div>
    </div>
  );
}
