import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Props {
  bid: string;
  referralCode: string;
  botschafterId: string;
  onComplete: () => void;
}

export function BotschafterOnboardingModal({ bid, referralCode, botschafterId, onComplete }: Props) {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const referralLink = `${window.location.origin}/pferdeakte/botschafter?ref=${referralCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Link kopiert!");
  };

  const finish = async () => {
    await supabase
      .from("pferdeakte_botschafter")
      .update({ onboarding_completed: true } as any)
      .eq("id", botschafterId);
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Progress bar */}
        <div className="p-4 pb-0">
          <Progress value={(step / 4) * 100} className="h-2 [&>div]:bg-orange-500" />
          <p className="text-xs text-muted-foreground mt-1.5">Schritt {step} von 4</p>
        </div>

        <div className="p-6 pt-4 min-h-[320px] flex flex-col">
          {step === 1 && (
            <div className="flex-1 flex flex-col items-center text-center justify-center">
              <div className="text-6xl mb-4">🎙️</div>
              <h2 className="text-xl font-bold mb-2">Willkommen als HufManager Botschafter!</h2>
              <p className="text-sm text-muted-foreground">
                In 3 Minuten weißt du alles was du brauchst.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Deine <span className="font-mono font-semibold text-foreground">#{bid.slice(0, 8).toUpperCase()}</span> — das ist deine eindeutige Botschafter-ID.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-xl font-bold mb-3">Dein persönlicher Link</h2>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg mb-3">
                <code className="text-xs flex-1 break-all text-foreground">{referralLink}</code>
                <Button size="sm" variant="outline" onClick={copyLink}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Jeder der über diesen Link kauft wird dir zugeordnet. Du verdienst automatisch Provision — ohne weiteren Aufwand.
              </p>
              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                💡 Teile den Link auf Instagram, WhatsApp oder per E-Mail. Unter Werbemittel findest du fertige Texte und einen KI-Generator für Bilder und Bannerwerbung.
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-xl font-bold mb-3">Für deine Auszahlungen brauchst du CopeCart</h2>
              <p className="text-sm text-muted-foreground mb-4">
                CopeCart ist die Abrechnungsplattform über die deine Provisionen ausgezahlt werden.
              </p>
              <ol className="space-y-2 text-sm mb-4">
                <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center flex-shrink-0">1</span> Kostenlos registrieren auf copecart.com</li>
                <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center flex-shrink-0">2</span> E-Mail verifizieren</li>
                <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center flex-shrink-0">3</span> Benutzernamen hier hinterlegen (unter Einstellungen)</li>
              </ol>
              <Button variant="ghost" size="sm" className="w-fit" onClick={() => window.open("https://copecart.com", "_blank")}>
                <ExternalLink className="w-4 h-4 mr-1" /> copecart.com öffnen
              </Button>
            </div>
          )}

          {step === 4 && (
            <div className="flex-1 flex flex-col items-center text-center justify-center">
              <h2 className="text-xl font-bold mb-4">Du bist startklar! 🚀</h2>
              <div className="grid grid-cols-3 gap-3 w-full mb-4">
                {[
                  { emoji: "📢", label: "Werbemittel", path: "/botschafter/werbemittel" },
                  { emoji: "💰", label: "Abrechnung", path: "/botschafter/abrechnung" },
                  { emoji: "🎓", label: "Akademie", path: "/botschafter/akademie" },
                ].map(item => (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="p-3 rounded-lg border hover:border-orange-500/40 hover:bg-orange-500/5 transition-colors text-center"
                  >
                    <div className="text-2xl mb-1">{item.emoji}</div>
                    <div className="text-xs font-medium">{item.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-end gap-2 pt-4 border-t mt-auto">
            {step < 4 ? (
              <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setStep(s => s + 1)}>
                {step === 1 ? "Los geht's →" : "Weiter →"}
              </Button>
            ) : (
              <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={finish}>
                Dashboard öffnen
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
