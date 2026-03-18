import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Horse } from "@/components/horse-detail/types";
import { HOOF_PROTECTION_OPTIONS } from "@/components/horse-detail/types";

interface HorseHeroProps {
  horse: Horse;
  appointmentsCount: number;
  hoofPhotosCount: number;
  documentsCount: number;
}

export function HorseHero({ horse, appointmentsCount, hoofPhotosCount, documentsCount }: HorseHeroProps) {
  const navigate = useNavigate();

  const age = horse.birth_year ? new Date().getFullYear() - horse.birth_year : null;
  const genderLabel = horse.gender === "gelding" ? "Wallach" :
    horse.gender === "mare" ? "Stute" :
    horse.gender === "stallion" ? "Hengst" : horse.gender;

  const hoofProt = HOOF_PROTECTION_OPTIONS.find(p => p.value === horse.hoof_protection);
  const hoofLabel = hoofProt?.label || "Barhuf";

  const healthStatus = horse.health_status || "healthy";
  const statusLabel = healthStatus === "healthy" ? "Gesund" :
    healthStatus === "acute" ? "Akut" :
    healthStatus === "chronic" ? "Chronisch" : "Reha";
  const statusOk = healthStatus === "healthy";

  const sinceYear = horse.birth_year ? `seit ${horse.birth_year}` : null;

  const stats = [
    { value: appointmentsCount, label: "TERMINE" },
    { value: hoofPhotosCount, label: "BEFUNDE" },
    { value: documentsCount, label: "FOTOS" },
  ];

  return (
    <div className="relative px-4 pt-4 pb-2">
      {/* Back Button */}
      <button
        onClick={() => {
          if (window.history.length > 1) navigate(-1);
          else navigate("/client-home");
        }}
        className="mb-3 flex items-center gap-1.5 text-[var(--hp-text3)] hover:text-[var(--hp-amber)] transition-colors"
        aria-label="Zurück"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-xs">Zurück</span>
      </button>

      {/* Avatar + Name */}
      <div className="flex items-center gap-4">
        <div
          className="hp-avatar-pulse w-[72px] h-[72px] rounded-full border-2 border-[var(--hp-amber)] flex-shrink-0 overflow-hidden"
        >
          {horse.photo_url ? (
            <img src={horse.photo_url} alt={horse.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[var(--hp-bg3)] flex items-center justify-center text-[var(--hp-amber)] text-xl font-bold">
              {horse.name.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-[22px] font-semibold text-[var(--hp-text)] truncate">{horse.name}</h1>
          <p className="text-[13px] text-[var(--hp-text3)] mt-0.5">
            {[horse.breed, age ? `${age} J.` : null, genderLabel].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mt-3">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[20px] text-xs font-medium"
          style={{
            background: statusOk ? "rgba(61,186,111,0.1)" : "rgba(232,184,74,0.1)",
            color: statusOk ? "var(--hp-green)" : "var(--hp-yellow)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {statusLabel}
        </span>
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-[20px] text-xs font-medium"
          style={{ background: "rgba(245,151,10,0.1)", color: "var(--hp-amber)" }}
        >
          {hoofLabel}
        </span>
        {sinceYear && (
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-[20px] text-xs font-medium"
            style={{ background: "var(--hp-bg3)", color: "var(--hp-text3)" }}
          >
            {sinceYear}
          </span>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="text-center py-2 px-1 rounded-lg"
            style={{ background: "var(--hp-bg2)" }}
          >
            <p className="text-[18px] font-semibold text-[var(--hp-text)]">{s.value}</p>
            <p className="text-[10px] uppercase tracking-[0.8px] text-[var(--hp-text3)] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
