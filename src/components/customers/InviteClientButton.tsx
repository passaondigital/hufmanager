import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageCircle, Mail, Link2, Loader2, Smartphone, Check, Copy, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useSubscription } from "@/hooks/useSubscription";
import { ProGateDialog } from "@/components/subscription/ProGateDialog";

interface InviteClientButtonProps {
  clientId: string;
  clientName?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  /** First horse name for personalized message */
  horseName?: string | null;
  /** Provider name for the invite message */
  providerName?: string | null;
  /** Compact mode for list views */
  compact?: boolean;
  className?: string;
}

function generateSlug(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let slug = "";
  for (let i = 0; i < 6; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)];
  }
  return slug;
}

function formatPhoneForWhatsApp(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  if (clean.startsWith("0")) return `49${clean.substring(1)}`;
  return clean;
}

function buildInviteMessage({
  clientFirstName,
  horseName,
  providerName,
  slug,
}: {
  clientFirstName: string;
  horseName: string | null;
  providerName: string;
  slug: string;
}): string {
  const horseText = horseName
    ? `${horseName} immer im Blick behalten`
    : "deine Pferde immer im Blick behalten";

  return `Hallo ${clientFirstName} 👋

Ich nutze jetzt Hufi für meine Termine und Pferdeakten.

Mit deinem persönlichen Link kannst du ${horseText}:

✅ Kommende Termine
✅ Behandlungsberichte
✅ Direkt mit mir chatten

👉 Dein Link:
https://app.hufiapp.de/connect/${slug}

Einmal tippen – direkt drin.
Keine App-Installation nötig. 🐴

Bis bald,
${providerName}`;
}

export function InviteClientButton({
  clientId,
  clientName,
  clientPhone,
  clientEmail,
  horseName,
  providerName,
  compact = false,
  className,
}: InviteClientButtonProps) {
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // Fetch provider name if not passed
  const { data: fetchedProviderName } = useQuery({
    queryKey: ["provider-name-for-invite", user?.id],
    queryFn: async () => {
      if (!user?.id) return "Dein Hufbearbeiter";
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      return data?.full_name || "Dein Hufbearbeiter";
    },
    enabled: !!user?.id && !providerName,
    staleTime: 1000 * 60 * 30,
  });

  const effectiveProviderName = providerName || fetchedProviderName || "Dein Hufbearbeiter";
  const clientFirstName = clientName?.split(" ")[0] || "du";

  const getOrCreateMagicLink = useCallback(async (): Promise<string> => {
    if (!user?.id) throw new Error("Not authenticated");

    // Check for existing active magic link for this client
    const { data: existing } = await supabase
      .from("magic_links")
      .select("id, slug")
      .eq("provider_id", user.id)
      .eq("client_id", clientId)
      .eq("is_active", true)
      .maybeSingle();

    if (existing) return existing.slug;

    // Create new magic link
    const slug = generateSlug();
    const { error } = await supabase.from("magic_links").insert({
      provider_id: user.id,
      client_id: clientId,
      slug,
      is_active: true,
      uses_count: 0,
    });

    if (error) throw error;
    return slug;
  }, [user?.id, clientId]);

  const updateSentTracking = useCallback(async (slug: string, via: "whatsapp" | "email" | "copy") => {
    await supabase
      .from("magic_links")
      .update({ last_sent_at: new Date().toISOString(), sent_via: via })
      .eq("provider_id", user?.id)
      .eq("slug", slug);

    // Also update invited_at on the profile if not set yet
    await supabase
      .from("profiles")
      .update({ invited_at: new Date().toISOString() })
      .eq("id", clientId)
      .is("invited_at", null);
  }, [user?.id, clientId]);

  const handleWhatsApp = useCallback(async () => {
    setLoading(true);
    try {
      const slug = await getOrCreateMagicLink();
      const message = buildInviteMessage({
        clientFirstName,
        horseName: horseName || null,
        providerName: effectiveProviderName,
        slug,
      });

      const encodedText = encodeURIComponent(message);
      const phone = clientPhone ? formatPhoneForWhatsApp(clientPhone) : "";
      const url = phone
        ? `https://wa.me/${phone}?text=${encodedText}`
        : `https://wa.me/?text=${encodedText}`;

      window.open(url, "_blank");
      await updateSentTracking(slug, "whatsapp");
      toast.success("WhatsApp geöffnet");
    } catch (err) {
      console.error("WhatsApp invite error:", err);
      toast.error("Einladung konnte nicht erstellt werden");
    } finally {
      setLoading(false);
    }
  }, [getOrCreateMagicLink, clientFirstName, horseName, effectiveProviderName, clientPhone, updateSentTracking]);

  const handleEmail = useCallback(async () => {
    if (!clientEmail) {
      toast.error("Keine E-Mail-Adresse hinterlegt");
      return;
    }
    setLoading(true);
    try {
      const slug = await getOrCreateMagicLink();
      const subject = encodeURIComponent(`${effectiveProviderName} lädt dich zu Hufi ein`);
      const body = encodeURIComponent(buildInviteMessage({
        clientFirstName,
        horseName: horseName || null,
        providerName: effectiveProviderName,
        slug,
      }));

      window.location.href = `mailto:${clientEmail}?subject=${subject}&body=${body}`;
      await updateSentTracking(slug, "email");
      toast.success("E-Mail-Programm geöffnet");
    } catch (err) {
      console.error("Email invite error:", err);
      toast.error("Einladung konnte nicht erstellt werden");
    } finally {
      setLoading(false);
    }
  }, [getOrCreateMagicLink, clientFirstName, horseName, effectiveProviderName, clientEmail, updateSentTracking]);

  const handleCopyLink = useCallback(async () => {
    setLoading(true);
    try {
      const slug = await getOrCreateMagicLink();
      const link = `https://app.hufiapp.de/connect/${slug}`;
      await navigator.clipboard.writeText(link);
      await updateSentTracking(slug, "copy");
      toast.success("Link kopiert!");
    } catch (err) {
      console.error("Copy link error:", err);
      toast.error("Link konnte nicht kopiert werden");
    } finally {
      setLoading(false);
    }
  }, [getOrCreateMagicLink, updateSentTracking]);

  if (!isPro) {
    if (compact) {
      return (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => { e.stopPropagation(); setUpgradeOpen(true); }}
            className={`gap-1.5 text-muted-foreground border-muted/60 ${className || ""}`}
          >
            <Lock className="h-3.5 w-3.5" />
            Einladen
          </Button>
          <ProGateDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} featureName="Kunden einladen" />
        </>
      );
    }

    return (
      <div className={`flex flex-col gap-2 ${className || ""}`}>
        <Button
          onClick={() => setUpgradeOpen(true)}
          variant="outline"
          className="w-full gap-2 min-h-[48px] text-base text-muted-foreground"
        >
          <Lock className="h-5 w-5" />
          Kunden einladen — Pro erforderlich
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          Diese Funktion ist in HufManager Pro enthalten.
        </p>
        <ProGateDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} featureName="Kunden einladen" />
      </div>
    );
  }

  if (loading) {
    return (
      <Button variant="outline" size={compact ? "sm" : "default"} disabled className={className}>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Wird erstellt...
      </Button>
    );
  }

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`gap-1.5 text-green-600 border-green-200 hover:bg-green-50 hover:border-green-300 ${className || ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <Smartphone className="h-3.5 w-3.5" />
            Einladen
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={handleWhatsApp} className="gap-2">
            <MessageCircle className="h-4 w-4 text-green-500" />
            WhatsApp
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleEmail} className="gap-2" disabled={!clientEmail}>
            <Mail className="h-4 w-4 text-blue-500" />
            E-Mail
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyLink} className="gap-2">
            <Copy className="h-4 w-4 text-muted-foreground" />
            Link kopieren
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${className || ""}`}>
      {/* Primary: WhatsApp */}
      <Button
        onClick={handleWhatsApp}
        className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white min-h-[48px] text-base"
      >
        <MessageCircle className="h-5 w-5" />
        Per WhatsApp einladen
      </Button>

      {/* Secondary: Email + Link */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleEmail}
          disabled={!clientEmail}
          className="gap-1.5 min-h-[40px]"
        >
          <Mail className="h-4 w-4" />
          E-Mail
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
          className="gap-1.5 min-h-[40px]"
        >
          <Copy className="h-4 w-4" />
          Link kopieren
        </Button>
      </div>
    </div>
  );
}

/** Status badge for invite state */
export function InviteStatusBadge({
  hasLoggedIn,
  invitedAt,
  size = "sm",
}: {
  hasLoggedIn?: boolean;
  invitedAt?: string | null;
  size?: "sm" | "md";
}) {
  const sizeClasses = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";

  if (hasLoggedIn) {
    return (
      <Badge className={`bg-green-500/10 text-green-600 border-green-500/30 gap-1 ${sizeClasses}`}>
        <Check className="h-3 w-3" />
        App aktiv
      </Badge>
    );
  }

  if (invitedAt) {
    return (
      <Badge variant="secondary" className={`gap-1 text-amber-600 bg-amber-500/10 border-amber-500/30 ${sizeClasses}`}>
        <Mail className="h-3 w-3" />
        Eingeladen
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={`text-muted-foreground gap-1 ${sizeClasses}`}>
      <Smartphone className="h-3 w-3" />
      Nicht eingeladen
    </Badge>
  );
}

/** Ghost profile banner prompting invitation */
export function GhostProfileBanner({
  clientId,
  clientName,
  clientPhone,
  clientEmail,
  horseName,
  providerName,
}: {
  clientId: string;
  clientName?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  horseName?: string | null;
  providerName?: string | null;
}) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="text-2xl">👻</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground">Noch kein App-Zugang</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {clientName || "Dieser Kunde"} hat sich noch nicht registriert.
          </p>
        </div>
      </div>
      <InviteClientButton
        clientId={clientId}
        clientName={clientName}
        clientPhone={clientPhone}
        clientEmail={clientEmail}
        horseName={horseName}
        providerName={providerName}
      />
    </div>
  );
}
