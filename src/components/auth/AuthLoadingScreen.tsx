export function AuthLoadingScreen() {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F5F5" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20, background: "#F97316",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 14, animation: "pulse 2s cubic-bezier(.4,0,.6,1) infinite",
        }}>
          <img
            src="https://upload.assaon.com/files/medien/hufiapp-logo-ohne-text-1777028918553-0kdje.png"
            alt="Hufi"
            style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0) invert(1)" }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#9CA3AF" }}>
          <svg style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span style={{ fontSize: 14 }}>Wird geladen…</span>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
