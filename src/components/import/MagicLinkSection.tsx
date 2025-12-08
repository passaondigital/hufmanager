import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Link2,
  MessageCircle,
  Copy,
  Share2,
  Check,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

const MagicLinkSection = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  // Fetch or create magic link
  const { data: magicLink, isLoading } = useQuery({
    queryKey: ["magic-link", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Try to get existing link
      const { data, error } = await supabase
        .from("magic_links")
        .select("*")
        .eq("provider_id", user.id)
        .eq("is_active", true)
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      
      // If no link exists, create one
      if (!data) {
        const slug = generateSlug(user.id);
        const { data: newLink, error: insertError } = await supabase
          .from("magic_links")
          .insert({ provider_id: user.id, slug })
          .select()
          .single();
        
        if (insertError) throw insertError;
        return newLink;
      }
      
      return data;
    },
    enabled: !!user?.id,
  });

  const generateSlug = (userId: string) => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let slug = "";
    for (let i = 0; i < 6; i++) {
      slug += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return slug;
  };

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !magicLink?.id) return;
      
      // Deactivate old link
      await supabase
        .from("magic_links")
        .update({ is_active: false })
        .eq("id", magicLink.id);
      
      // Create new link
      const slug = generateSlug(user.id);
      const { data, error } = await supabase
        .from("magic_links")
        .insert({ provider_id: user.id, slug })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["magic-link"] });
      toast({ title: "Neuer Link generiert" });
    },
    onError: () => {
      toast({ title: "Fehler", description: "Link konnte nicht generiert werden", variant: "destructive" });
    },
  });

  const magicUrl = magicLink?.slug 
    ? `${window.location.origin}/connect/${magicLink.slug}`
    : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(magicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Link kopiert!" });
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`Trag dich bei mir ein, damit ich dich und dein Pferd besser betreuen kann: ${magicUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          Magic Link
        </CardTitle>
        <CardDescription>
          Teile diesen Link per WhatsApp oder Social Media. Interessenten können sich selbst eintragen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Link Display */}
        <div className="flex gap-2">
          <Input
            value={magicUrl}
            readOnly
            className="font-mono text-sm"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleWhatsAppShare} className="gap-2 bg-[#25D366] hover:bg-[#128C7E]">
            <MessageCircle className="h-4 w-4" />
            Per WhatsApp teilen
          </Button>
          <Button variant="outline" onClick={handleCopy} className="gap-2">
            <Copy className="h-4 w-4" />
            Link kopieren
          </Button>
          <Button
            variant="ghost"
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${regenerateMutation.isPending ? "animate-spin" : ""}`} />
            Neuen Link generieren
          </Button>
        </div>

        {/* Stats */}
        {magicLink && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Nutzungen: <strong>{magicLink.uses_count || 0}</strong></span>
            <a
              href={`/connect/${magicLink.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Vorschau
            </a>
          </div>
        )}

        {/* How it works */}
        <div className="rounded-lg bg-muted/50 p-4">
          <h4 className="font-medium mb-2">So funktioniert's:</h4>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>Teile den Link mit potenziellen Kunden</li>
            <li>Sie füllen ein kurzes Formular aus (Name, Pferd, Stall)</li>
            <li>Du erhältst eine Benachrichtigung und kannst die Anfrage annehmen</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default MagicLinkSection;
