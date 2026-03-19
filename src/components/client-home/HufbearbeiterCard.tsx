import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface HufbearbeiterCardProps {
  userId: string;
}

export function HufbearbeiterCard({ userId }: HufbearbeiterCardProps) {
  const { data: provider } = useQuery({
    queryKey: ["client-provider", userId],
    queryFn: async () => {
      const { data: grant } = await supabase
        .from("access_grants")
        .select("provider_id, profiles!access_grants_provider_id_fkey(full_name, avatar_url, phone, city)")
        .eq("client_id", userId)
        .eq("status", "active")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (!grant) return null;
      const p = (grant as any).profiles;
      return {
        name: p?.full_name || "Hufbearbeiter",
        avatar_url: p?.avatar_url,
        phone: p?.phone,
        city: p?.city,
      };
    },
    staleTime: 10 * 60 * 1000,
  });

  if (!provider) return null;

  const initials = provider.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="px-4 md:px-0">
      <div className="hm-section-header">
        <span className="hm-section-title">👤 Dein Hufbearbeiter</span>
      </div>

      <div className="hm-card flex items-center gap-3.5">
        <div
          className="w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0 border-[1.5px] text-[18px] font-medium"
          style={{
            borderColor: "var(--hm-amber)",
            background: "var(--hm-amber-glow)",
            color: "var(--hm-amber)",
          }}
        >
          {provider.avatar_url ? (
            <img src={provider.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] md:text-[15px] font-medium" style={{ color: "var(--hm-text)" }}>
            {provider.name}
          </p>
          {provider.city && (
            <p className="text-[11px] md:text-[12px]" style={{ color: "var(--hm-text3)" }}>
              {provider.city}
            </p>
          )}
        </div>
        <div className="flex gap-1.5">
          <button
            className="w-8 h-8 md:w-9 md:h-9 rounded-md flex items-center justify-center text-sm"
            style={{ background: "var(--hm-bg4)", border: "0.5px solid var(--hm-border)" }}
          >
            💬
          </button>
          {provider.phone && (
            <a
              href={`tel:${provider.phone}`}
              className="w-8 h-8 md:w-9 md:h-9 rounded-md flex items-center justify-center text-sm"
              style={{ background: "var(--hm-bg4)", border: "0.5px solid var(--hm-border)" }}
            >
              📞
            </a>
          )}
        </div>
      </div>
    </div>
  );
}