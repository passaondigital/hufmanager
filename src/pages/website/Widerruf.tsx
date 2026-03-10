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

    window.open(`mailto:support@hufmanager.de?subject=${subject}&body=${body}`, "_self");
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main className="container py-24 md:py-32">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-4 text-white">Widerruf</h1>
          <p className="text-white/50 mb-10">
            Nutzen Sie dieses Formular, um Ihren Vertrag mit HufManager fristgerecht zu widerrufen.
          </p>

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
