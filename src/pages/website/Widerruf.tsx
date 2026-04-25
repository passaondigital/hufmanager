import { useState } from "react";
import Navbar from "@/components/website/Navbar";
import FooterNew from "@/components/website/FooterNew";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle } from "lucide-react";

const plans = ["Starter", "Pro", "Duo", "Team"];

const Widerruf = () => {
  const [submitted, setSubmitted] = useState(false);
  const [plan, setPlan] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const firstName = data.get("firstName") as string;
    const lastName = data.get("lastName") as string;
    const email = data.get("email") as string;
    const customerId = data.get("customerId") as string;
    const contractDate = data.get("contractDate") as string;
    const reason = data.get("reason") as string;

    const subject = encodeURIComponent(`Widerruf – ${firstName} ${lastName}`);
    const body = encodeURIComponent(
      `Hiermit widerrufe ich meinen mit HufManager geschlossenen Vertrag über die Nutzung der digitalen Plattform.\n\n` +
      `Vorname: ${firstName}\nNachname: ${lastName}\nE-Mail: ${email}\n` +
      `Kundennummer: ${customerId || "–"}\nVertragsdatum: ${contractDate}\n` +
      `Plan: ${plan}\nGrund: ${reason || "–"}`
    );

    window.open(`mailto:support@hufiapp.de?subject=${subject}&body=${body}`, "_self");
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main className="container py-24 md:py-32">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-4 text-white">Widerrufsbelehrung</h1>
          <p className="text-white/50 mb-10">
            Nutzen Sie dieses Formular, um Ihren Vertrag mit HufManager fristgerecht zu widerrufen.
          </p>

          {/* Widerrufsbelehrung */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 md:p-8 mb-12 space-y-6 text-white/70 text-sm leading-relaxed">
            <div>
              <h2 className="text-xl font-semibold text-white mb-3">Widerrufsrecht für Verbraucher</h2>
              <p>Verbraucher ist jede natürliche Person, die ein Rechtsgeschäft zu Zwecken abschließt, die überwiegend weder ihrer gewerblichen noch ihrer selbständigen beruflichen Tätigkeit zugerechnet werden können.</p>
            </div>

            <p>Sie haben das Recht, binnen 14 Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt 14 Tage ab dem Tag des Vertragsabschlusses.</p>

            <p>
              Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (Barhufserviceschmid, c/o Postflex #10643, Emsdettener Str. 10, 48268 Greven, Telefon: 015209007017, E-Mail: support@hufiapp.de) mittels einer eindeutigen Erklärung (z.&nbsp;B. ein mit der Post versandter Brief oder eine E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist. Sie können das Muster-Widerrufsformular oder eine andere eindeutige Erklärung auch auf unserer Webseite (<a href="https://www.hufmanager.de/widerruf" className="text-[#F5970A] underline">https://www.hufmanager.de/widerruf</a>) elektronisch ausfüllen und übermitteln. Machen Sie von dieser Möglichkeit Gebrauch, so werden wir Ihnen unverzüglich (z.&nbsp;B. per E-Mail) eine Bestätigung über den Eingang eines solchen Widerrufs übermitteln.
            </p>

            <p>Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.</p>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Folgen des Widerrufs</h3>
              <p>Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass Sie eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt haben), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Muster-Widerrufsformular</h3>
              <p className="mb-3">Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden Sie es zurück.</p>
              <div className="bg-white/5 rounded-lg p-5 space-y-2 font-mono text-xs text-white/50">
                <p className="text-white/70 font-sans text-sm font-semibold">An</p>
                <p>Barhufserviceschmid</p>
                <p>c/o Postflex #10643</p>
                <p>Emsdettener Str. 10</p>
                <p>48268 Greven</p>
                <p>E-Mail: support@hufiapp.de</p>
                <br />
                <p>Hiermit widerrufe(n) ich/wir den von mir/uns abgeschlossenen Vertrag über die Bereitstellung des Zugangs zu folgenden digitalen Inhalten (Bezeichnung, ggf. Bestellnummer und Preis):</p>
                <p>......................................................................</p>
                <p>Bestellt am (Datum): .............................</p>
                <p>Erhalten am (Datum): .............................</p>
                <p>Name und Anschrift des Verbrauchers:</p>
                <p>.............................</p>
                <p>.............................</p>
                <p>Datum: ....................................................</p>
                <p>Unterschrift (nur bei schriftlichem Widerruf): ....................................................</p>
              </div>
            </div>
          </div>

          {/* Online-Formular */}
          <h2 className="text-2xl font-bold text-white mb-6">Online-Widerrufsformular</h2>

          {submitted ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-[#F5970A] mx-auto" />
              <h2 className="text-xl font-semibold text-white">Widerruf erfolgreich übermittelt</h2>
              <p className="text-white/60 max-w-md mx-auto">
                Ihr Widerruf wurde erfolgreich übermittelt. Sie erhalten eine Bestätigung an Ihre E-Mail-Adresse.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Vorname *</Label>
                  <Input name="firstName" required className="bg-white/5 border-white/10 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Nachname *</Label>
                  <Input name="lastName" required className="bg-white/5 border-white/10 text-white" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white/70">E-Mail-Adresse *</Label>
                <Input name="email" type="email" required className="bg-white/5 border-white/10 text-white" />
              </div>

              <div className="space-y-2">
                <Label className="text-white/70">Kundennummer / Account-ID</Label>
                <Input name="customerId" placeholder="Zu finden in Ihren Kontoeinstellungen" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              </div>

              <div className="space-y-2">
                <Label className="text-white/70">Vertragsdatum / Datum der Registrierung *</Label>
                <Input name="contractDate" type="date" required className="bg-white/5 border-white/10 text-white" />
              </div>

              <div className="space-y-2">
                <Label className="text-white/70">Gewählter Plan *</Label>
                <Select required value={plan} onValueChange={setPlan}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Plan auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white/70">Grund des Widerrufs (optional)</Label>
                <Textarea name="reason" rows={4} className="bg-white/5 border-white/10 text-white placeholder:text-white/30" placeholder="Bitte teilen Sie uns optional den Grund mit…" />
              </div>

              <p className="text-white/60 text-sm border-l-2 border-[#F5970A]/60 pl-4">
                Hiermit widerrufe ich meinen mit HufManager geschlossenen Vertrag über die Nutzung der digitalen Plattform.
              </p>

              <Button type="submit" size="lg" className="w-full bg-[#F5970A] hover:bg-[#F5970A]/90 text-black font-bold">
                Widerruf jetzt einreichen
              </Button>
            </form>
          )}
        </div>
      </main>
      <FooterNew />
    </div>
  );
};

export default Widerruf;
