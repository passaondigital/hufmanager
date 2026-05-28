import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const NotFound = () => {
  const location = useLocation();
  const navigate  = useNavigate();
  const { user, role } = useAuth();

  useEffect(() => {
    console.warn("[Hufi] 404 — Route nicht gefunden:", location.pathname);
  }, [location.pathname]);

  function handleHome() {
    if (!user) { navigate("/"); return; }
    const roleMap: Record<string, string> = {
      admin: "/admin/mission-control",
      provider: "/home",
      employee: "/employee",
      partner: "/partner-home",
      client: "/client-home",
    };
    navigate(roleMap[role ?? ""] ?? "/home");
  }

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center gap-6 px-6 overflow-hidden"
      style={{ background: "#0A0A0A" }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(249,115,22,0.06) 0%, transparent 70%)",
        }}
      />

      {/* Ghost number */}
      <p
        className="absolute select-none font-bold tracking-tighter"
        style={{
          fontSize: "clamp(120px,30vw,200px)",
          color: "rgba(255,255,255,0.03)",
          lineHeight: 1,
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
        }}
      >
        404
      </p>

      {/* Card */}
      <div className="relative z-10 flex flex-col items-center gap-3 text-center">
        <div
          className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{
            background: "rgba(249,115,22,0.1)",
            border: "1px solid rgba(249,115,22,0.22)",
          }}
        >
          <span style={{ fontSize: 26 }}>🐴</span>
        </div>

        <h1
          className="font-semibold tracking-tight"
          style={{ fontSize: 22, color: "rgba(255,255,255,0.88)" }}
        >
          Seite nicht gefunden
        </h1>

        <p
          className="max-w-[260px] leading-relaxed"
          style={{ fontSize: 14, color: "rgba(255,255,255,0.38)" }}
        >
          Diese Seite existiert nicht oder wurde verschoben.
        </p>
      </div>

      <button
        onClick={handleHome}
        className="relative z-10 rounded-2xl px-6 py-3 font-semibold transition-all duration-200 active:scale-95"
        style={{
          background: "#F97316",
          color: "#fff",
          fontSize: 15,
          boxShadow: "0 4px 20px rgba(249,115,22,0.35)",
        }}
      >
        Zurück zur App
      </button>
    </div>
  );
};

export default NotFound;
