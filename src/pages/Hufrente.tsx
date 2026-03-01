import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Shield, Handshake, Coins, Copy, Share2, QrCode, Download,
  Users, TrendingUp, CheckCircle2, Calculator, ExternalLink,
} from "lucide-react";
import { useHufrenteStats } from "@/hooks/useHufrenteStats";
import { useDachConfig } from "@/hooks/useDachConfig";
import { toast } from "@/hooks/use-toast";
import { StatGridSkeleton } from "@/components/ui/skeletons";

const Hufrente = () => {
  const { data: stats, isLoading } = useHufrenteStats();
  const { formatCurrency } = useDachConfig();
  const [calcReferrals, setCalcReferrals] = useState([5]);

  const commissionPerReferral = 9.80;
  const monthlyCalc = calcReferrals[0] * commissionPerReferral;
  const aboCost = 49;
  const netCalc = monthlyCalc - aboCost;

  const referralLink = `https://hufmanager.de/ref/${stats?.affiliateSlug || "..."}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Link kopiert!", description: "Dein persönlicher Empfehlungslink wurde in die Zwischenablage kopiert." });
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "HufManager — Empfehlung",
          text: "Hey, ich nutze HufManager für meine Hufpflege — Termine, Rechnungen, Pferdeakten alles digital. Schau mal rein:",
          url: referralLink,
        });
      } catch {}
    } else {
      copyLink();
    }
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `Hey, ich nutze seit einer Weile HufManager für meine Hufpflege — Termine, Rechnungen, Pferdeakten alles digital, auch offline im Stall. Falls du das auch suchst: ${referralLink} (14 Tage kostenlos, keine Kreditkarte)`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const shareEmail = () => {
    const subject = encodeURIComponent("HufManager — vielleicht interessant für dich");
    const body = encodeURIComponent(
      `Hallo,\n\nich nutze seit einer Weile HufManager für meine tägliche Arbeit — Termine, Rechnungen, Pferdeakten, alles digital und DSGVO-konform.\n\nFalls du etwas Ähnliches suchst, schau dir das mal an:\n${referralLink}\n\n14 Tage kostenlos testen, keine Kreditkarte nötig.\n\nViele Grüße`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-background to-accent/10 border border-border p-6 md:p-10">
        <Badge className="mb-4 bg-primary/15 text-primary border-0">
          <Shield className="h-3 w-3 mr-1" />
          Dein Ausfallfonds
        </Badge>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Deine Hufrente</h1>
        <p className="text-sm text-muted-foreground mb-1">Du hast aufgebaut. Wir helfen dir, es abzusichern.</p>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed mt-4">
          Ein Ausfall als Selbstständige:r kann alles ins Wanken bringen. Die Hufrente ist dein Netz:
          Empfiehl HufManager an Kolleginnen und Kollegen — und solange sie aktive Nutzer sind,
          erhältst du 20% ihrer Monatsgebühr als Provision. Automatisch. Monatlich. Dauerhaft.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          {[
            { icon: Handshake, label: "Empfehlen", desc: "Teile deinen persönlichen Link" },
            { icon: Coins, label: "Verdienen", desc: "20% Provision lebenslang" },
            { icon: Shield, label: "Absichern", desc: "Passives Einkommen bei Ausfall" },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
              <div className="p-2 rounded-lg bg-primary/10">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Affiliate Link */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dein persönlicher Empfehlungslink</CardTitle>
          <CardDescription>Jeder der über diesen Link kommt wird dir dauerhaft zugeordnet — egal wann er sich anmeldet.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 px-4 py-3 rounded-lg bg-muted/50 border border-border text-sm font-mono text-foreground truncate">
              {referralLink}
            </div>
            <Button size="icon" variant="outline" onClick={copyLink} title="Link kopieren">
              <Copy className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={shareLink} title="Teilen">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Share buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={shareWhatsApp} className="gap-2">
              💬 WhatsApp
            </Button>
            <Button variant="outline" size="sm" onClick={shareEmail} className="gap-2">
              ✉️ E-Mail
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              const text = `Als Hufpfleger/Therapeut/Trainer kennst du das: nach dem letzten Pferd fängt die eigentliche Arbeit erst an. HufManager hat das bei mir geändert — alles digital, offline-fähig, DSGVO-konform. Schau mal rein: ${referralLink} #HufManager #ZukunftPferd2030`;
              navigator.clipboard.writeText(text);
              toast({ title: "Text kopiert!", description: "Social-Media-Text in der Zwischenablage." });
            }} className="gap-2">
              📱 Social Media Text kopieren
            </Button>
          </div>

          {/* QR Code placeholder */}
          <div className="border border-dashed border-border rounded-xl p-6 text-center">
            <QrCode className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Dein QR-Code für Visitenkarten und Ausdrucke</p>
            <Button variant="outline" size="sm" className="mt-3 gap-2">
              <Download className="h-4 w-4" />
              QR-Code herunterladen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Deine Statistiken</h2>
        {isLoading ? (
          <StatGridSkeleton />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              {[
                { label: "Geworbene Kollegen", value: stats?.totalReferred || 0 },
                { label: "Aktive Empfehlungen", value: stats?.activeReferrals || 0 },
                { label: "Provision (Monat)", value: formatCurrency(stats?.monthlyCommission || 0) },
                { label: "Provision (gesamt)", value: formatCurrency(stats?.totalCommission || 0) },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {stats && stats.referrals.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left px-4 py-3 text-muted-foreground font-medium">Datum</th>
                          <th className="text-left px-4 py-3 text-muted-foreground font-medium">Kollege</th>
                          <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                          <th className="text-right px-4 py-3 text-muted-foreground font-medium">Provision/Monat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.referrals.map((r) => (
                          <tr key={r.id} className="border-b border-border last:border-0">
                            <td className="px-4 py-3 text-foreground">
                              {new Date(r.created_at).toLocaleDateString("de-DE")}
                            </td>
                            <td className="px-4 py-3 text-foreground">
                              {r.referred_name_anonymous || "Anonymisiert"}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={r.status === "active" ? "default" : "secondary"}>
                                {r.status === "active" ? "Aktiv" : r.status === "inactive" ? "Inaktiv" : "Ausstehend"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-foreground">
                              {formatCurrency(Number(r.monthly_commission || 0))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground px-4 py-3 border-t border-border">
                    Kolleginnen und Kollegen werden aus Datenschutzgründen anonymisiert angezeigt.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Noch keine Empfehlungen — teile deinen Link und starte deine Hufrente.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4 text-muted-foreground" />
            Provisionsrechner
          </CardTitle>
          <CardDescription>
            Hochrechnung auf Basis von 20% auf das Fortgeschritten-Abo (49€/Monat)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Geworbene Kollegen</span>
              <span className="text-lg font-semibold text-foreground">{calcReferrals[0]}</span>
            </div>
            <Slider value={calcReferrals} onValueChange={setCalcReferrals} max={20} min={1} step={1} />
          </div>
          <div className="border rounded-lg divide-y divide-border">
            <div className="flex justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">Monatliche Provision</span>
              <span className="text-sm font-semibold text-foreground">{monthlyCalc.toFixed(2)}&nbsp;€</span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">Dein HufManager-Abo</span>
              <span className="text-sm font-semibold text-foreground">−{aboCost.toFixed(2)}&nbsp;€</span>
            </div>
            <div className="flex justify-between px-4 py-3 bg-muted/30">
              <span className="text-sm font-medium text-foreground">{netCalc >= 0 ? "Netto-Verdienst" : "Differenz"}</span>
              <span className={`text-sm font-bold ${netCalc >= 0 ? "text-accent" : "text-muted-foreground"}`}>
                {netCalc >= 0 ? "+" : ""}{netCalc.toFixed(2)}&nbsp;€
              </span>
            </div>
          </div>
          {calcReferrals[0] >= 5 && (
            <p className="text-sm text-muted-foreground text-center">
              Ab {calcReferrals[0]} Empfehlungen deckt die Provision dein Abo.
              {netCalc > 0 && ` Verbleibend: ${netCalc.toFixed(2)}€/Monat.`}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Legal transparency */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-accent" />
            Ist das legal? — Ja, vollständig.
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Affiliate Marketing ist eine der verbreitetsten und transparentesten Formen der Kundengewinnung weltweit.
            Es ist kein Schneeballsystem — der entscheidende Unterschied:
          </p>
          <div className="space-y-2">
            {[
              "Du verdienst nur wenn dein Kollege ein echtes Produkt nutzt und dafür zahlt",
              "Es gibt keine Einstiegsgebühr",
              "Du musst nichts kaufen um teilzunehmen",
              "Du bist nicht verpflichtet jemanden zu werben",
              "Dein Konto wird nicht gesperrt wenn du niemanden wirbst",
            ].map((t) => (
              <div key={t} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                <span className="text-sm text-foreground">{t}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Rechtliche Grundlage: Affiliate Marketing ist in Deutschland, Österreich und der Schweiz vollkommen legal
            und steuerlich als Provisionseinkommen einzustufen. Dein Steuerberater kann dir mehr dazu sagen.
          </p>

          {/* Affiliate explanation */}
          <div className="rounded-lg bg-muted/50 border border-border p-4 mt-4">
            <p className="text-xs font-medium text-foreground mb-1">Was ist Affiliate Marketing?</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Affiliate Marketing ist das gleiche Prinzip wie wenn ein Hotel dir Punkte gibt weil du einen Freund empfohlen hast —
              nur dass du hier echtes Geld bekommst, dauerhaft, solange dein Kollege HufManager nutzt.
              Es ist vollkommen legal, transparent und in Deutschland, Österreich und der Schweiz weit verbreitet.
              Amazon macht es. Booking.com macht es. Wir auch.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Häufige Fragen zur Hufrente</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {[
              {
                q: "Ist das ein Schneeballsystem?",
                a: "Nein. Bei einem Schneeballsystem verdienst du daran dass andere einzahlen — unabhängig vom Produkt. Bei der Hufrente verdienst du nur wenn dein Kollege aktiv HufManager nutzt und einen echten Mehrwert erhält. Hört er auf zu zahlen, erhältst du keine Provision mehr. Das ist der fundamentale Unterschied.",
              },
              {
                q: "Muss ich Steuern auf die Provision zahlen?",
                a: "Provisionen aus Affiliate Marketing sind in DE, AT und CH steuerpflichtige Einnahmen. Bitte trage sie in deiner Steuererklärung ein. Wir empfehlen die Rücksprache mit deinem Steuerberater.",
              },
              {
                q: "Wie bekomme ich mein Geld ausgezahlt?",
                a: "Die Auszahlung erfolgt über CopeCart direkt auf dein hinterlegtes Konto. Auszahlungsintervall und Mindestbetrag findest du in deinem CopeCart-Account.",
              },
              {
                q: "Was passiert wenn mein Kollege kündigt?",
                a: "Dann endet die Provision für diesen Kollegen. Du verlierst nichts rückwirkend — alle bereits verdienten Provisionen bleiben.",
              },
              {
                q: "Gibt es eine Begrenzung wie viele ich empfehlen kann?",
                a: "Nein. Empfiehl so viele Kolleginnen und Kollegen wie du möchtest — keine Limits, keine Staffelung, keine versteckten Regeln.",
              },
            ].map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-sm text-left">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="border-t border-border pt-6 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Affiliate-Registrierung über CopeCart. Kostenlos, keine Verpflichtungen.
        </p>
        <Button onClick={() => window.open("https://www.copecart.com/affiliate/hufmanager", "_blank")} className="gap-2">
          Bei CopeCart als Partner registrieren
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default Hufrente;
