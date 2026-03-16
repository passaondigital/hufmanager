import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z.object({
  type: z.enum(["creator", "profi", "unternehmen"]),
  social_handle: z.string().max(200).optional(),
  copecart_username: z.string().max(100).optional(),
  motivation: z.string().max(300).optional(),
  privacy: z.literal(true, { errorMap: () => ({ message: "Pflichtfeld" }) }),
});

type BotschafterData = {
  id: string;
  status: string | null;
  referral_code: string;
  total_clicks: number | null;
  total_conversions: number | null;
  total_earnings_cents: number | null;
  commission_rate: number | null;
};

interface Props {
  sourceRole: "provider" | "partner" | "employee" | "client";
}

export function BotschafterRegistration({ sourceRole }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<BotschafterData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state
  const [type, setType] = useState<"creator" | "profi" | "unternehmen">("creator");
  const [socialHandle, setSocialHandle] = useState("");
  const [copecartUsername, setCopecartUsername] = useState("");
  const [motivation, setMotivation] = useState("");
  const [privacy, setPrivacy] = useState(false);

  useEffect(() => {
    if (user?.id) checkExisting();
  }, [user?.id]);

  const checkExisting = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("pferdeakte_botschafter")
      .select("id, status, referral_code, total_clicks, total_conversions, total_earnings_cents, commission_rate")
      .eq("user_id", user!.id)
      .maybeSingle();
    if (data) setExisting(data);
    setLoading(false);
  };

  const generateRef = () => Math.random().toString(36).substring(2, 10).toUpperCase();

  const handleSubmit = async () => {
    const parsed = formSchema.safeParse({ type, social_handle: socialHandle, copecart_username: copecartUsername, motivation, privacy });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Bitte Pflichtfelder ausfüllen");
      return;
    }

    // Load profile for name/email
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user!.id)
      .maybeSingle();

    if (!profile?.email) {
      toast.error("Profil konnte nicht geladen werden");
      return;
    }

    const nameParts = (profile.full_name || "").split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    setSubmitting(true);
    const { data, error } = await supabase.from("pferdeakte_botschafter").insert({
      user_id: user!.id,
      type,
      first_name: firstName,
      last_name: lastName,
      email: profile.email,
      social_handle: socialHandle || null,
      copecart_username: copecartUsername || null,
      motivation: motivation || null,
      status: "pending",
      referral_code: generateRef(),
    }).select("id, status, referral_code, total_clicks, total_conversions, total_earnings_cents, commission_rate").single();

    setSubmitting(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("Du bist bereits als Botschafter registriert.");
      } else {
        toast.error("Fehler: " + error.message);
      }
      return;
    }

    setExisting(data);
    setSuccess(true);
    toast.success("Registrierung eingegangen!");
  };

  const referralLink = existing ? `https://hufmanager.de/pferdeakte?ref=${existing.referral_code}` : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Link kopiert!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  // FALL 3 — Active
  if (existing?.status === "active") {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <Card className="border-t-4 border-t-green-500">
          <CardContent className="pt-6 space-y-4">
            <Badge className="bg-green-500/20 text-green-500 border-green-500/30">✅ AKTIV</Badge>
            <h2 className="text-xl font-bold">Du bist aktiver Botschafter!</h2>
            <p className="text-sm text-muted-foreground">Deine #BID: <Badge variant="outline">{existing.id.slice(0, 8)}</Badge></p>

            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Input value={referralLink} readOnly className="h-9 text-sm" />
              <Button size="sm" variant="outline" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{existing.total_clicks || 0}</p>
                <p className="text-xs text-muted-foreground">Klicks</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{existing.total_conversions || 0}</p>
                <p className="text-xs text-muted-foreground">Conversions</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{((existing.total_earnings_cents || 0) / 100).toFixed(0)} €</p>
                <p className="text-xs text-muted-foreground">Provision</p>
              </div>
            </div>

            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={() => window.open("/botschafter/dashboard", "_blank")}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Zum Botschafter-Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // FALL 2 — Pending
  if (existing?.status === "pending" || success) {
    return (
      <div className="max-w-xl mx-auto">
        <Card className="bg-muted/50">
          <CardContent className="pt-6 space-y-4 text-center">
            <div className="text-4xl">🎉</div>
            <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">
              {success ? "REGISTRIERUNG EINGEGANGEN" : "IN PRÜFUNG"}
            </Badge>
            <h2 className="text-xl font-bold">
              {success ? "Willkommen in der Bewegung." : "Registrierung wird geprüft"}
            </h2>
            <p className="text-muted-foreground">
              {success
                ? "Pascal schaltet dich in der Regel innerhalb von 24 Stunden frei. Du wirst per E-Mail benachrichtigt."
                : "Du erhältst eine E-Mail sobald du freigeschaltet wirst."}
            </p>
            {existing && (
              <p className="text-sm text-muted-foreground">Deine #BID: <Badge variant="outline">{existing.id.slice(0, 8)}</Badge></p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // FALL 1 — Registration Form
  return (
    <div className="max-w-xl mx-auto">
      <Card className="border-t-4 border-t-orange-500">
        <CardContent className="pt-6 space-y-6">
          <div>
            <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30 mb-3">BOTSCHAFTER-PROGRAMM</Badge>
            <h2 className="text-xl font-bold">Werde HufManager Botschafter</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Empfehle HufManager und verdiene bis zu 50% Provision auf jedes gebuchte Paket. Deine #BID verknüpft sich automatisch mit deinem bestehenden Account.
            </p>
          </div>

          <div className="space-y-1">
            {[
              "Bis 50% Provision pro Empfehlung",
              "Top 10 Empfehler: HufManager Pro 1 Jahr kostenlos",
              "Eigenes Dashboard mit KI-Werbemittel-Generator",
            ].map(text => (
              <div key={text} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-orange-500 shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>

          {/* Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Typ</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { val: "creator" as const, icon: "🎙️", label: "Creator" },
                { val: "profi" as const, icon: "🔨", label: "Pferdeprofi" },
                { val: "unternehmen" as const, icon: "🏢", label: "Unternehmen" },
              ]).map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setType(opt.val)}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    type === opt.val
                      ? "border-orange-500 bg-orange-500/10"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <div className="text-xl">{opt.icon}</div>
                  <div className="text-xs font-medium mt-1">{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Social Handle / Website (optional)</label>
              <Input
                placeholder="@instagram oder www.website.de"
                value={socialHandle}
                onChange={e => setSocialHandle(e.target.value)}
                maxLength={200}
              />
            </div>
            <div>
              <label className="text-sm font-medium">CopeCart-Benutzername (optional)</label>
              <Input
                placeholder="Kann später ergänzt werden"
                value={copecartUsername}
                onChange={e => setCopecartUsername(e.target.value)}
                maxLength={100}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Motivation (optional, max 300 Zeichen)</label>
              <Textarea
                placeholder="Warum möchtest du Botschafter werden?"
                value={motivation}
                onChange={e => setMotivation(e.target.value)}
                maxLength={300}
                rows={3}
              />
              <p className="text-xs text-muted-foreground text-right mt-1">{motivation.length}/300</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              checked={privacy}
              onCheckedChange={v => setPrivacy(v === true)}
              id="privacy"
            />
            <label htmlFor="privacy" className="text-sm text-muted-foreground cursor-pointer">
              Ich habe die{" "}
              <a href="https://hufmanager.de/datenschutz" target="_blank" rel="noopener noreferrer" className="underline text-primary">
                Datenschutzerklärung
              </a>{" "}
              gelesen und stimme zu.
            </label>
          </div>

          <Button
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            onClick={handleSubmit}
            disabled={submitting || !privacy}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Jetzt als Botschafter registrieren
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
