import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Link2, Copy, ExternalLink, Trash2, MessageSquare, Share2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export const SharePreviewSheet = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draftLabel, setDraftLabel] = useState("");
  const [feedbackLabel, setFeedbackLabel] = useState("");
  const [draftDays, setDraftDays] = useState("7");
  const [feedbackDays, setFeedbackDays] = useState("7");
  const [justCreated, setJustCreated] = useState<string | null>(null);

  const { data: links = [] } = useQuery({
    queryKey: ["preview-links", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("preview_links")
        .select("*")
        .eq("provider_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && open,
  });

  const createLink = useMutation({
    mutationFn: async ({ type, label, days }: { type: string; label: string; days: number }) => {
      if (!user?.id) throw new Error("Nicht eingeloggt");
      
      // Generate token client-side (crypto.getRandomValues)
      const arr = new Uint8Array(16);
      crypto.getRandomValues(arr);
      const token = Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);
      
      const { data, error } = await supabase
        .from("preview_links")
        .insert({
          provider_id: user.id,
          token,
          link_type: type,
          label: label || null,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["preview-links"] });
      setJustCreated(getPreviewUrl(data.token));
      setDraftLabel("");
      setFeedbackLabel("");
      toast({ title: "✅ Link erstellt!" });
    },
    onError: () => {
      toast({ title: "Fehler beim Erstellen", variant: "destructive" });
    },
  });

  const deleteLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("preview_links")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preview-links"] });
      toast({ title: "Link deaktiviert" });
    },
  });

  const getPreviewUrl = (token: string) => `${window.location.origin}/preview/${token}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "📋 Link kopiert!" });
  };

  const shareWhatsApp = (url: string) => {
    const text = `Hey! Schau mal kurz auf meine neue Hufpflege-Website, noch bevor sie live geht – was sagst du? ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const daysRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? `noch ${days} Tage` : "abgelaufen";
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); setJustCreated(null); }}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Link2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Teilen</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>🔗 Vorschau teilen</SheetTitle>
          <p className="text-xs text-muted-foreground">
            Teile deine Seite – auch bevor sie live ist.
          </p>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Success state */}
          {justCreated && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">✅ Link erstellt!</p>
                <code className="text-xs text-muted-foreground block break-all bg-muted/50 p-2 rounded">
                  {justCreated}
                </code>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => copyToClipboard(justCreated)}>
                    <Copy className="h-3 w-3" /> Kopieren
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => shareWhatsApp(justCreated)}>
                    📲 WhatsApp
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1" asChild>
                    <a href={justCreated} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" /> Öffnen
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Create Draft Link */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold">👁 Entwurfs-Vorschau</p>
                <p className="text-xs text-muted-foreground">Zeigt aktuellen Stand (auch wenn noch nicht live)</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Label (optional)</Label>
                <Input
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
                  placeholder="z.B. Für Ehepartner"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Gültigkeitsdauer</Label>
                <Select value={draftDays} onValueChange={setDraftDays}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Tag</SelectItem>
                    <SelectItem value="3">3 Tage</SelectItem>
                    <SelectItem value="7">7 Tage</SelectItem>
                    <SelectItem value="30">30 Tage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                className="w-full gap-1"
                onClick={() => createLink.mutate({ type: "draft", label: draftLabel, days: parseInt(draftDays) })}
                disabled={createLink.isPending}
              >
                <Link2 className="h-3.5 w-3.5" /> Link erstellen
              </Button>
            </CardContent>
          </Card>

          {/* Create Feedback Link */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold">💬 Mit Feedback-Funktion</p>
                <p className="text-xs text-muted-foreground">Betrachter können Sterne und Kommentar hinterlassen</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Label (optional)</Label>
                <Input
                  value={feedbackLabel}
                  onChange={(e) => setFeedbackLabel(e.target.value)}
                  placeholder="z.B. Kunden-Test"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Gültigkeitsdauer</Label>
                <Select value={feedbackDays} onValueChange={setFeedbackDays}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Tag</SelectItem>
                    <SelectItem value="3">3 Tage</SelectItem>
                    <SelectItem value="7">7 Tage</SelectItem>
                    <SelectItem value="30">30 Tage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="w-full gap-1"
                onClick={() => createLink.mutate({ type: "feedback", label: feedbackLabel, days: parseInt(feedbackDays) })}
                disabled={createLink.isPending}
              >
                <MessageSquare className="h-3.5 w-3.5" /> Feedback-Link erstellen
              </Button>
            </CardContent>
          </Card>

          {/* Active Links */}
          {links.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aktive Links</h4>
              {links.map((link: any) => (
                <Card key={link.id} className="bg-muted/20">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {link.link_type === "feedback" ? "💬" : "🔗"}{" "}
                          {link.label || (link.link_type === "feedback" ? "Feedback-Link" : "Vorschau-Link")}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {link.link_type} · {link.view_count} Aufrufe
                          {link.link_type === "feedback" && ` · ${link.feedback_count} Feedbacks`}
                          {" · "}{daysRemaining(link.expires_at)}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => copyToClipboard(getPreviewUrl(link.token))}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          asChild
                        >
                          <a href={getPreviewUrl(link.token)} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => deleteLink.mutate(link.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <code className="text-[10px] text-muted-foreground block truncate">
                      {getPreviewUrl(link.token)}
                    </code>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
