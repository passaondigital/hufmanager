import { Shield, Star, CheckCircle2, Users } from "lucide-react";

interface Props {
  reviewCount?: number;
  averageRating?: number;
  horseCount?: number;
  yearActive?: number;
  primaryColor: string;
}

export const WebsiteTrustBadges = ({ reviewCount, averageRating, horseCount, yearActive, primaryColor }: Props) => {
  const badges = [
    averageRating && reviewCount ? { icon: Star, label: `${averageRating.toFixed(1)} ★`, sub: `${reviewCount} Bewertungen` } : null,
    yearActive ? { icon: CheckCircle2, label: `Aktiv seit ${yearActive}`, sub: "Erfahrung" } : null,
    horseCount ? { icon: Users, label: `${horseCount}+`, sub: "betreute Pferde" } : null,
    { icon: Shield, label: "Verifiziert", sub: "HufManager" },
    { icon: Shield, label: "DSGVO", sub: "Konform" },
  ].filter(Boolean) as { icon: any; label: string; sub: string }[];

  return (
    <div className="flex flex-wrap justify-center gap-3 py-4">
      {badges.map((b, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card/50 text-sm">
          <b.icon className="h-4 w-4" style={{ color: primaryColor }} />
          <div>
            <p className="font-medium text-foreground text-xs">{b.label}</p>
            <p className="text-[10px] text-muted-foreground">{b.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
