import { Badge } from "@/components/ui/badge";

interface CooperationBadge {
  company_name: string;
  badge_text: string | null;
  badge_color: string;
  logo_url: string | null;
}

interface CooperationBadgesSectionProps {
  badges: CooperationBadge[];
}

export function CooperationBadgesSection({ badges }: CooperationBadgesSectionProps) {
  if (!badges || badges.length === 0) return null;

  return (
    <div className="py-6">
      <h3 className="text-lg font-semibold mb-4 text-center">Kooperationspartner</h3>
      <div className="flex flex-wrap justify-center gap-3">
        {badges.map((b, i) => (
          <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-full border" style={{ borderColor: b.badge_color }}>
            {b.logo_url && <img src={b.logo_url} alt={b.company_name} className="w-6 h-6 rounded" />}
            <span className="text-sm font-medium">{b.badge_text || b.company_name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
