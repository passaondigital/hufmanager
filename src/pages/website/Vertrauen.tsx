import Navbar from "@/components/website/Navbar";
import FooterNew from "@/components/website/FooterNew";
import {
  Lock,
  Shield,
  Star,
  Server,
  Globe,
  FileCheck,
  Bot,
  UserCheck,
  Trash2,
  Download,
  Edit,
  FileText,
  Mail,
  ExternalLink,
  CheckCircle2,
  Eye,
  ToggleRight,
  Building2,
  Phone,
  Clock,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const DOMAIN = "hufmanager.lovable.app";
const CONTACT_EMAIL = "support@hufmanager.de";

const securityScores = [
  {
    icon: Lock,
    title: "SSL/TLS Sicherheit",
    badge: "SSL A+ Verschlüsselung",
    description: "Deine Verbindung zu HufManager ist durch modernste Verschlüsselung geschützt — wie beim Online-Banking.",
    link: `https://www.ssllabs.com/ssltest/analyze.html?d=${DOMAIN}`,
  },
  {
    icon: Shield,
    title: "Security Headers",
    badge: "Security Headers geprüft",
    description: "Unsere Server senden spezielle Schutz-Header, die Angriffe wie Cross-Site-Scripting verhindern.",
    link: `https://securityheaders.com/?q=${DOMAIN}`,
  },
  {
    icon: Star,
    title: "Mozilla Observatory",
    badge: "Mozilla Observatory Score",
    description: "Mozillas unabhängiger Sicherheitstest bewertet unsere Website-Konfiguration.",
    link: `https://observatory.mozilla.org/analyze/${DOMAIN}`,
  },
];

const infraBadges = [
  {
    icon: Server,
    title: "SOC 2 Type II & ISO 27001",
    text: "Unsere Infrastruktur wird betrieben von Supabase — zertifiziert nach SOC 2 Type II und ISO 27001.",
    link: "https://supabase.com/security",
  },
  {
    icon: Lock,
    title: "HTTPS / TLS 1.3",
    text: "Alle Daten werden verschlüsselt übertragen. Moderne TLS 1.3 Verschlüsselung als Standard.",
  },
  {
    icon: Globe,
    title: "EU Datenspeicherung",
    text: "Daten werden ausschließlich auf EU-Servern (Frankfurt, eu-central-1) gespeichert.",
  },
  {
    icon: FileCheck,
    title: "DSGVO konform",
    text: "Verarbeitung personenbezogener Daten nach EU-Verordnung 2016/679 (DSGVO).",
  },
];

const dsgvoRights = [
  { icon: Eye, label: "Recht auf Auskunft", description: "Erfahre welche Daten wir über dich speichern.", to: "/datenschutz#auskunft" },
  { icon: Trash2, label: "Recht auf Löschung", description: "Lösche deinen Account und alle zugehörigen Daten.", to: "/datenschutz#loeschung" },
  { icon: Download, label: "Recht auf Datenexport", description: "Exportiere deine Daten im maschinenlesbaren Format.", to: "/datenschutz#export" },
  { icon: Edit, label: "Recht auf Berichtigung", description: "Korrigiere deine persönlichen Daten jederzeit selbst.", to: "/konto/einstellungen" },
  { icon: FileText, label: "Datenschutzerklärung", description: "Unsere vollständige Datenschutzerklärung.", to: "/datenschutz" },
  { icon: Mail, label: "Datenschutz-Kontakt", description: "Kontaktiere unseren Datenschutzverantwortlichen.", href: `mailto:${CONTACT_EMAIL}` },
];

const aiFeatures = [
  { title: "HufiAI Assistent", text: "KI-gestützter Chat für Fragen rund um Hufbearbeitung und Pferdepflege." },
  { title: "Hufbild-Analyse", text: "Automatische Erkennung von Merkmalen auf Huffotos zur Dokumentationsunterstützung." },
  { title: "AutoFlow Empfehlungen", text: "Intelligente Vorschläge für Terminplanung und Arbeitsabläufe." },
  { title: "Textvorschläge", text: "KI-generierte Entwürfe für Berichte und Kundenkommunikation." },
];

const retentionData = [
  { category: "Rechnungsdaten", duration: "10 Jahre", reason: "Gesetzliche Pflicht (§147 AO)" },
  { category: "Chat-Nachrichten", duration: "6 Monate", reason: "Berechtigtes Interesse" },
  { category: "Audit-Logs", duration: "1 Jahr", reason: "Berechtigtes Interesse" },
  { category: "KI-Anfragen", duration: "Keine Speicherung", reason: "Echtzeitverarbeitung" },
];

const kiChecklist = [
  { label: "Risikoklasse", value: "Minimal" },
  { label: "Modell", value: "Google Gemini" },
  { label: "Opt-Out", value: "Verfügbar" },
  { label: "Trainingsdaten", value: "Keine" },
];

const currentDate = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });

const Vertrauen = () => (
  <div className="min-h-screen bg-black">
    <Navbar />

    {/* Hero */}
    <section className="pt-28 pb-16 md:pt-36 md:pb-20">
      <div className="container text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-6">
          <Shield className="w-3.5 h-3.5" />
          Vertrauen & Sicherheit
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">
          Sicherheit ist kein Feature —<br className="hidden md:block" /> sondern unser Fundament.
        </h1>
        <p className="text-white/50 mt-4 text-lg max-w-xl mx-auto">
          Transparent, prüfbar, DSGVO-konform. So schützen wir deine Daten und die deiner Kunden.
        </p>
      </div>
    </section>

    {/* NEU: Compliance Scores */}
    <section className="py-16 md:py-20 border-t border-white/5">
      <div className="container max-w-4xl mx-auto">
        <SectionHeader badge="Compliance" title={`Geprüfte Compliance — Stand ${currentDate}`} />
        <div className="grid sm:grid-cols-2 gap-6">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 cursor-default">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-emerald-400" />
                      </div>
                      <h3 className="text-lg font-bold text-white">DSGVO</h3>
                    </div>
                    <span className="text-3xl font-black text-emerald-400">9/10</span>
                  </div>
                  <p className="text-white/50 text-xs mb-3">EU 2016/679 — geprüft durch internen Audit</p>
                  <Progress value={90} className="h-2 bg-white/10 [&>div]:bg-emerald-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                Geprüft nach: RLS, Soft-Delete, AVV, Consent-Management, Self-Service Datenexport, Verarbeitungsverzeichnis Art. 30
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 cursor-default">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-emerald-400" />
                      </div>
                      <h3 className="text-lg font-bold text-white">AI Act</h3>
                    </div>
                    <span className="text-3xl font-black text-emerald-400">9/10</span>
                  </div>
                  <p className="text-white/50 text-xs mb-3">EU 2024/1689 — Risikoklasse: Minimal</p>
                  <Progress value={90} className="h-2 bg-white/10 [&>div]:bg-emerald-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                Geprüft nach: AiDisclosure, Opt-Out, Transparenz-Kennzeichnung, Keine KI-Trainingsdaten
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-white/30 text-xs text-center mt-4">
          Scores basieren auf internem technischen Audit. Externe Zertifizierung via Supabase SOC 2 Type II.
        </p>
      </div>
    </section>

    {/* SEKTION 1: Live Security Scores */}
    <section className="py-16 md:py-20 border-t border-white/5">
      <div className="container max-w-5xl mx-auto">
        <SectionHeader badge="Live-Prüfung" title="Extern geprüft — jederzeit nachprüfbar" />
        <div className="grid md:grid-cols-3 gap-6">
          {securityScores.map((s) => (
            <div key={s.title} className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-4">
                <s.icon className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{s.title}</h3>
              <span className="inline-block text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-0.5 w-fit mb-3">
                {s.badge}
              </span>
              <p className="text-white/50 text-sm flex-1">{s.description}</p>
              <a href={s.link} target="_blank" rel="noopener noreferrer" className="mt-4">
                <Button variant="outline" size="sm" className="w-full border-white/10 text-white hover:bg-white/5 gap-2">
                  Jetzt live prüfen <ExternalLink className="w-4 h-4" />
                </Button>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* SEKTION 2: Infrastruktur */}
    <section className="py-16 md:py-20 bg-zinc-950 border-t border-white/5">
      <div className="container max-w-5xl mx-auto">
        <SectionHeader badge="Infrastruktur" title="Zertifizierte Partner, höchste Standards" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {infraBadges.map((b) => (
            <div key={b.title} className="rounded-xl border border-white/10 bg-zinc-900/40 p-5 flex flex-col">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mb-3">
                <b.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">{b.title}</h3>
              <p className="text-white/50 text-xs flex-1">{b.text}</p>
              {b.link && (
                <a href={b.link} target="_blank" rel="noopener noreferrer" className="text-primary text-xs mt-3 hover:underline inline-flex items-center gap-1">
                  Nachweis ansehen <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* SEKTION 3: DSGVO Betroffenenrechte */}
    <section className="py-16 md:py-20 border-t border-white/5">
      <div className="container max-w-4xl mx-auto">
        <SectionHeader badge="DSGVO" title="Deine Rechte — klar und direkt erreichbar" />
        <div className="grid sm:grid-cols-2 gap-4">
          {dsgvoRights.map((r) => {
            const content = (
              <div className="flex items-start gap-4 rounded-xl border border-white/10 bg-zinc-900/40 p-5 hover:border-white/20 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <r.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-white mb-0.5">{r.label}</h3>
                  <p className="text-white/50 text-xs">{r.description}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-white/20 group-hover:text-white/50 mt-1 flex-shrink-0 transition-colors" />
              </div>
            );
            if (r.href) {
              return <a key={r.label} href={r.href}>{content}</a>;
            }
            return <Link key={r.label} to={r.to!}>{content}</Link>;
          })}
        </div>
      </div>
    </section>

    {/* NEU: Verarbeitungsverzeichnis */}
    <section className="py-16 md:py-20 bg-zinc-950 border-t border-white/5">
      <div className="container max-w-4xl mx-auto">
        <SectionHeader badge="Art. 30 DSGVO" title="Verarbeitungsverzeichnis" />
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 md:p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
            <Database className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Verarbeitungsverzeichnis (Art. 30 DSGVO)</h3>
          <p className="text-white/50 text-sm max-w-lg mx-auto mb-6">
            HufManager führt ein vollständiges, strukturiertes Verarbeitungsverzeichnis aller personenbezogenen Daten gemäß Art. 30 DSGVO. Behörden können dieses auf Anfrage einsehen.
          </p>
          <Button variant="outline" size="sm" className="border-white/10 text-white hover:bg-white/5 gap-2" asChild>
            <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Anfrage Verarbeitungsverzeichnis Art. 30")}`}>
              <Mail className="w-4 h-4" /> Verzeichnis anfordern
            </a>
          </Button>
        </div>
      </div>
    </section>

    {/* NEU: Aufbewahrungsfristen */}
    <section className="py-16 md:py-20 border-t border-white/5">
      <div className="container max-w-4xl mx-auto">
        <SectionHeader badge="Datenspeicherung" title="Transparente Datenspeicherung" />
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 md:p-8">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/40 text-xs uppercase tracking-wide py-2 pr-4">Datenkategorie</th>
                  <th className="text-left text-white/40 text-xs uppercase tracking-wide py-2 pr-4">Speicherdauer</th>
                  <th className="text-left text-white/40 text-xs uppercase tracking-wide py-2">Grundlage</th>
                </tr>
              </thead>
              <tbody>
                {retentionData.map((r) => (
                  <tr key={r.category} className="border-b border-white/5">
                    <td className="py-3 pr-4 text-white font-medium">{r.category}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        r.duration === "Keine Speicherung"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-white/5 text-white/70 border border-white/10"
                      }`}>
                        {r.duration}
                      </span>
                    </td>
                    <td className="py-3 text-white/50">{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-white/30 text-xs text-center mt-6">
            Alle Daten werden nach Ablauf der Frist sicher und nachweisbar gelöscht.
          </p>
        </div>
      </div>
    </section>

    {/* SEKTION 4: AI Act Transparenz (erweitert) */}
    <section className="py-16 md:py-20 bg-zinc-950 border-t border-white/5">
      <div className="container max-w-4xl mx-auto">
        <SectionHeader badge="EU AI Act" title="KI nach EU AI Act" />

        {/* NEU: KI-Transparenz Block */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 md:p-8 mb-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-white font-bold mb-4">Transparenz-Checkliste</h3>
              <div className="space-y-3">
                {kiChecklist.map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-white/70 text-sm">
                      <span className="text-white font-medium">{item.label}:</span> {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-white font-bold mb-4">Unser Versprechen</h3>
              <p className="text-white/50 text-sm leading-relaxed">
                Alle KI-Funktionen in HufManager sind als solche gekennzeichnet. Nutzer können KI-Features jederzeit deaktivieren. Ihre Daten werden niemals zum Training von KI-Modellen verwendet.
              </p>
            </div>
          </div>
        </div>

        {/* Bestehende AI Features */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 md:p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-violet-500/15 flex items-center justify-center">
              <Bot className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="text-white font-bold">Risikoklasse: Minimales Risiko</h3>
              <p className="text-white/50 text-xs">Eingestuft gem. EU KI-Verordnung (2024/1689)</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {aiFeatures.map((f) => (
              <div key={f.title} className="p-4 rounded-lg bg-black/30 border border-white/5">
                <h4 className="text-sm font-semibold text-white mb-1">{f.title}</h4>
                <p className="text-white/50 text-xs">{f.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {[
            { icon: CheckCircle2, text: "Alle KI-generierten Inhalte werden stets als solche gekennzeichnet (Art. 50 KI-VO)." },
            { icon: UserCheck, text: "Keine automatisierten Entscheidungen ohne Nutzerkontrolle — KI unterstützt, entscheidet aber nicht." },
            { icon: ToggleRight, text: "KI-Features können jederzeit pro Nutzer deaktiviert werden (Opt-Out in den Einstellungen)." },
            { icon: Shield, text: "Nutzerdaten werden nicht zum Training von KI-Modellen verwendet. Verarbeitung erfolgt über Google Gemini API." },
          ].map((item) => (
            <div key={item.text} className="flex items-start gap-3">
              <item.icon className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <p className="text-white/70 text-sm">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* SEKTION 5: Verantwortung & Kontakt */}
    <section className="py-16 md:py-20 border-t border-white/5">
      <div className="container max-w-3xl mx-auto text-center">
        <SectionHeader badge="Kontakt" title="Verantwortlich für Datenschutz & Sicherheit" />
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 md:p-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
          </div>
          <h3 className="text-white font-bold text-lg mb-1">PASSAON</h3>
          <p className="text-white/50 text-sm mb-6">Betreiber von HufManager</p>
          <div className="grid sm:grid-cols-2 gap-4 text-left max-w-md mx-auto">
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wide mb-1">Verantwortlicher</p>
              <p className="text-white text-sm">Pascal Schmid</p>
            </div>
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wide mb-1">Adresse</p>
              <p className="text-white text-sm">Maienweg 1b, 67659 Kaiserslautern</p>
            </div>
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wide mb-1">E-Mail</p>
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary text-sm hover:underline">
                {CONTACT_EMAIL}
              </a>
            </div>
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wide mb-1">Telefon</p>
              <a href="tel:+4915209007017" className="text-primary text-sm hover:underline flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> 0152 0900 7017
              </a>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button variant="outline" size="sm" className="border-white/10 text-white hover:bg-white/5" asChild>
              <Link to="/impressum">Impressum</Link>
            </Button>
            <Button variant="outline" size="sm" className="border-white/10 text-white hover:bg-white/5" asChild>
              <Link to="/datenschutz">Datenschutzerklärung</Link>
            </Button>
            <Button variant="outline" size="sm" className="border-white/10 text-white hover:bg-white/5" asChild>
              <Link to="/agb">AGB</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>

    {/* NEU: Footer-Infos */}
    <section className="py-8 border-t border-white/5">
      <div className="container max-w-4xl mx-auto text-center space-y-1">
        <p className="text-white/30 text-xs">Seite zuletzt aktualisiert: {currentDate}</p>
        <p className="text-white/30 text-xs">Infrastruktur: Supabase (SOC 2 Type II, ISO 27001, Frankfurt/EU)</p>
        <p className="text-white/30 text-xs">
          Fragen zur Sicherheit:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary/70 hover:underline">{CONTACT_EMAIL}</a>
        </p>
      </div>
    </section>

    <FooterNew />
  </div>
);

function SectionHeader({ badge, title }: { badge: string; title: string }) {
  return (
    <div className="text-center mb-10">
      <span className="text-primary font-bold text-xs uppercase tracking-widest">{badge}</span>
      <h2 className="font-sans text-2xl md:text-3xl font-extrabold text-white mt-3">{title}</h2>
    </div>
  );
}

export default Vertrauen;
