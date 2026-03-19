import { useNavigate } from "react-router-dom";

interface HorseItem {
  id: string;
  name: string;
  breed: string | null;
  photo_url: string | null;
  birth_year: number | null;
  health_status: string | null;
}

interface HorseCarouselProps {
  horses: HorseItem[];
  onAddHorse: () => void;
}

export function HorseCarousel({ horses, onAddHorse }: HorseCarouselProps) {
  const navigate = useNavigate();

  return (
    <div className="px-4 md:px-0">
      <div className="hm-section-header">
        <span className="hm-section-title">🐴 Meine Pferde</span>
        <button onClick={onAddHorse} className="hm-section-link">+ Neues Pferd</button>
      </div>

      {/* Mobile: horizontal scroll / Desktop: grid */}
      <div className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory pb-1 md:!hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" role="list">
        {horses.map((horse) => (
          <HorseCard key={horse.id} horse={horse} onClick={() => navigate(`/client-horse/${horse.id}`)} />
        ))}
        <AddCard onClick={onAddHorse} />
      </div>

      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" role="list">
        {horses.map((horse) => (
          <HorseCard key={horse.id} horse={horse} onClick={() => navigate(`/client-horse/${horse.id}`)} />
        ))}
        <AddCard onClick={onAddHorse} />
      </div>
    </div>
  );
}

function HorseCard({ horse, onClick }: { horse: HorseItem; onClick: () => void }) {
  const age = horse.birth_year ? new Date().getFullYear() - horse.birth_year : null;
  const isHealthy = !horse.health_status || horse.health_status === "healthy";

  return (
    <div
      role="listitem"
      onClick={onClick}
      className="min-w-[140px] md:min-w-0 flex-shrink-0 rounded-xl p-4 text-center cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        background: "var(--hm-bg3)",
        border: "0.5px solid var(--hm-border)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--hm-amber)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 16px rgba(0,0,0,0.3)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--hm-border)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      <div
        className="w-[52px] h-[52px] md:w-[64px] md:h-[64px] rounded-full mx-auto mb-2 overflow-hidden border-2 flex items-center justify-center hm-avatar-pulse"
        style={{
          borderColor: "var(--hm-amber)",
          background: "var(--hm-amber-glow)",
        }}
      >
        {horse.photo_url ? (
          <img src={horse.photo_url} alt={horse.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="text-lg md:text-xl">🐴</span>
        )}
      </div>
      <p className="text-[14px] md:text-[15px] font-medium truncate" style={{ color: "var(--hm-text)" }}>
        {horse.name}
      </p>
      <p className="text-[11px] md:text-[12px] mt-0.5 truncate" style={{ color: "var(--hm-text3)" }}>
        {[horse.breed, age ? `${age} J.` : null].filter(Boolean).join(" · ") || "–"}
      </p>
      <span
        className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-[20px] text-[10px] md:text-[11px] font-medium"
        style={{
          background: isHealthy ? "var(--hm-green-bg)" : "var(--hm-yellow-bg)",
          color: isHealthy ? "var(--hm-green)" : "var(--hm-yellow)",
        }}
      >
        <span className="w-1 h-1 rounded-full bg-current" />
        {isHealthy ? "Gesund" : "Befund"}
      </span>
    </div>
  );
}

function AddCard({ onClick }: { onClick: () => void }) {
  return (
    <div
      role="listitem"
      onClick={onClick}
      className="min-w-[140px] md:min-w-0 flex-shrink-0 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-[var(--hm-amber)]"
      style={{
        border: "1.5px dashed var(--hm-border)",
        color: "var(--hm-text3)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--hm-amber)";
        (e.currentTarget as HTMLDivElement).style.color = "var(--hm-amber)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--hm-border)";
        (e.currentTarget as HTMLDivElement).style.color = "var(--hm-text3)";
      }}
    >
      <span className="text-[28px] opacity-50">+</span>
      <span className="text-[12px] font-medium mt-1">Pferd hinzufügen</span>
    </div>
  );
}