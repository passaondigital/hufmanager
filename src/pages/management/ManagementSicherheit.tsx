import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { HufiBiometricGate } from "@/components/sensors/HufiBiometricGate";
import {
  isBiometricsAvailable,
  hasBiometricRegistered,
  removeBiometricRegistration,
} from "@/lib/hufi-biometrics";

export default function ManagementSicherheit() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const userId = user?.id ?? "";
  const userName = user?.email ?? userId;
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) || userName;

  const [mode, setMode] = useState<"idle" | "setup" | "verify">("idle");
  const [registered, setRegistered] = useState(() =>
    userId ? hasBiometricRegistered(userId) : false
  );
  const available = isBiometricsAvailable();

  const handleRemove = () => {
    if (userId) removeBiometricRegistration(userId);
    setRegistered(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 -ml-2 mb-2 text-muted-foreground"
          onClick={() => navigate("/management")}
        >
          <ArrowLeft className="h-4 w-4" /> Zurück zur Übersicht
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Sicherheit</h1>
        <p className="text-muted-foreground mt-1">
          Biometrische Anmeldung &amp; Zugriffsschutz
        </p>
      </div>

      {/* Biometrics card */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ backgroundColor: "rgba(249,115,22,0.1)" }}
          >
            🫆
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">
              Biometrische Anmeldung
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Fingerabdruck, Face ID oder Iris-Scan — je nach Gerät
            </p>
          </div>
          <span
            className="ml-auto text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0"
            style={{
              backgroundColor: registered
                ? "rgba(16,185,129,0.12)"
                : "rgba(156,163,175,0.12)",
              color: registered ? "#10B981" : "#9CA3AF",
            }}
          >
            {registered ? "Aktiv" : "Inaktiv"}
          </span>
        </div>

        {!available && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-4 py-3">
            Dein Browser unterstützt keine biometrische Anmeldung (WebAuthn
            nicht verfügbar).
          </p>
        )}

        {available && !registered && (
          <Button
            className="w-full"
            style={{ backgroundColor: "#F97316", color: "#fff" }}
            onClick={() => setMode("setup")}
          >
            Biometrie einrichten
          </Button>
        )}

        {available && registered && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setMode("verify")}
            >
              Testen
            </Button>
            <Button
              variant="outline"
              className="flex-1 text-destructive hover:text-destructive"
              onClick={handleRemove}
            >
              Entfernen
            </Button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground space-y-1">
        <p>
          <strong className="text-foreground">Wie es funktioniert:</strong>{" "}
          Der biometrische Schlüssel wird nur auf deinem Gerät gespeichert.
          Es werden keine biometrischen Daten an Hufi übertragen.
        </p>
        <p>
          Unterstützt wird: Fingerabdrucksensor (Android), Face ID (iPhone),
          Iris-Scan (Samsung Galaxy), Windows Hello (PC/Laptop).
        </p>
      </div>

      {/* Biometric gate overlay */}
      {mode !== "idle" && userId && (
        <HufiBiometricGate
          userId={userId}
          userName={userName}
          mode={mode}
          onSuccess={() => {
            if (mode === "setup") setRegistered(true);
            setMode("idle");
          }}
          onCancel={() => setMode("idle")}
        />
      )}
    </div>
  );
}
