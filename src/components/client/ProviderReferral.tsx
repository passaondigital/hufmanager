import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Check, Heart } from "lucide-react";
import { toast } from "sonner";

export function ProviderReferral() {
  const { user } = useAuth();
  const [providerName, setProviderName] = useState<string | null>(null);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Get provider via access_grants
      const { data: grant } = await supabase
        .from("access_grants")
        .select("provider_id")
        .eq("client_id", user.id)
        .eq("is_active", true)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (!grant) return;
      setProviderId(grant.provider_id);

      const { data: bs } = await supabase
        .from("business_settings")
        .select("business_name, owner_name, subdomain")
        .eq("user_id", grant.provider_id)
        .maybeSingle();

      if (bs) {
        setProviderName(bs.business_name || bs.owner_name || "Mein Hufpfleger");
        setSubdomain(bs.subdomain);
      }
    })();
  }, [user]);

  if (!providerName || !providerId) return null;

  const profileUrl = subdomain
    ? `${window.location.origin}/p/${subdomain}`
    : `${window.location.origin}`;

  const shareText = `Ich nutze Hufi für mein Pferd — alle Termine, Befunde und Rechnungen digital. Mein Hufpfleger ${providerName} ist dabei. Schau mal rein: ${profileUrl}`;

  const handleShare = async () => {
    // Log referral
    if (user) {
      await supabase.from("client_referrals").insert({
        referrer_id: user.id,
        provider_id: providerId,
        channel: "share",
      });
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: "Hufi Empfehlung", text: shareText });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success("Text in Zwischenablage kopiert!");
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link kopiert!");

    if (user) {
      await supabase.from("client_referrals").insert({
        referrer_id: user.id,
        provider_id: providerId,
        channel: "copy_link",
      });
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary" />
          Empfiehl deinen Hufpfleger
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {providerName} ist digital und professionell unterwegs. Kennst du jemanden, dem das auch helfen würde?
        </p>
        <div className="flex gap-2">
          <Button onClick={handleShare} className="flex-1 gap-2">
            <Share2 className="h-4 w-4" />
            Teilen
          </Button>
          <Button variant="outline" onClick={handleCopyLink} className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            Link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
