import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, FileDown, Save, Pencil, Check, X, Shield } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ProcessingEntry {
  id: string;
  category: string;
  purpose: string;
  legalBasis: string;
  retention: string;
  recipients: string;
  safeguards: string;
  deletionProcess: string;
}

const DEFAULT_ENTRIES: ProcessingEntry[] = [
  {
    id: "1",
    category: "Profildaten (Provider)",
    purpose: "Vertragsdurchführung — Bereitstellung der Plattform für Hufbearbeiter",
    legalBasis: "Art. 6 Abs. 1 lit. b DSGVO",
    retention: "Unbegrenzt bis Kontolöschung",
    recipients: "Supabase (EU, SOC 2 Type II)",
    safeguards: "RLS, AES-256 at rest, TLS 1.3 in transit, Soft-Delete",
    deletionProcess: "Kontolöschung → Soft-Delete → 30 Tage Frist → Hard-Delete",
  },
  {
    id: "2",
    category: "Profildaten (Client/Kunde)",
    purpose: "Vertragsdurchführung — Verwaltung der Kundenbeziehung",
    legalBasis: "Art. 6 Abs. 1 lit. b DSGVO",
    retention: "Unbegrenzt bis Kontolöschung",
    recipients: "Supabase (EU, SOC 2 Type II)",
    safeguards: "RLS, AES-256, TLS 1.3, Pseudonymisierung via IDs, Soft-Delete",
    deletionProcess: "Self-Service Löschung oder Provider-Löschung → Cascade",
  },
  {
    id: "3",
    category: "Pferdedaten (inkl. Gesundheit)",
    purpose: "Vertragsdurchführung — Dokumentation der Hufbearbeitung",
    legalBasis: "Art. 6 Abs. 1 lit. b DSGVO",
    retention: "Unbegrenzt bis Löschung durch Eigentümer/Provider",
    recipients: "Supabase (EU), ggf. Fachpartner (mit Consent)",
    safeguards: "RLS, medizinische Daten nur mit can_view_medical, Soft-Delete",
    deletionProcess: "delete_horse_safe() → Soft-Delete + Termin-Stornierung",
  },
  {
    id: "4",
    category: "Termindaten",
    purpose: "Vertragsdurchführung — Planung und Dokumentation von Behandlungen",
    legalBasis: "Art. 6 Abs. 1 lit. b DSGVO",
    retention: "10 Jahre (§147 AO, steuerliche Aufbewahrungspflicht)",
    recipients: "Supabase (EU), Kunden per E-Mail-Benachrichtigung",
    safeguards: "RLS, Provider-/Client-Isolation, Signatur-Erfassung",
    deletionProcess: "Status → cancelled, nach 10 Jahren automatische Löschung",
  },
  {
    id: "5",
    category: "Rechnungsdaten",
    purpose: "Gesetzliche Pflicht — Buchführung und Steuerdokumentation",
    legalBasis: "Art. 6 Abs. 1 lit. c DSGVO (§147 AO)",
    retention: "10 Jahre ab Rechnungsdatum",
    recipients: "Supabase (EU), PDF-Export lokal",
    safeguards: "RLS, Provider-isoliert, unveränderliche Rechnungsnummern",
    deletionProcess: "Keine Löschung vor Ablauf der Aufbewahrungsfrist",
  },
  {
    id: "6",
    category: "Chat-Nachrichten",
    purpose: "Berechtigtes Interesse — Kommunikation zwischen Provider und Client",
    legalBasis: "Art. 6 Abs. 1 lit. f DSGVO",
    retention: "6 Monate",
    recipients: "Supabase (EU)",
    safeguards: "RLS, Nachrichtenlänge validiert (max. 5000 Zeichen), Conversation-Isolation",
    deletionProcess: "Automatische Löschung nach 6 Monaten (geplant)",
  },
  {
    id: "7",
    category: "Audit-Logs",
    purpose: "Berechtigtes Interesse — Nachvollziehbarkeit und Sicherheit",
    legalBasis: "Art. 6 Abs. 1 lit. f DSGVO",
    retention: "1 Jahr",
    recipients: "Supabase (EU), nur Admin-Zugriff",
    safeguards: "SECURITY DEFINER Funktionen, Admin-only RLS, PII-Hashing",
    deletionProcess: "Automatische Löschung nach 12 Monaten (geplant)",
  },
  {
    id: "8",
    category: "Cookie-Consent-Daten",
    purpose: "Einwilligung — Nachweis der Zustimmung",
    legalBasis: "Art. 6 Abs. 1 lit. a DSGVO",
    retention: "3 Jahre",
    recipients: "Supabase (EU)",
    safeguards: "client_consents Tabelle mit IP, User-Agent, Timestamp",
    deletionProcess: "Löschung nach 3 Jahren oder bei Widerruf",
  },
  {
    id: "9",
    category: "KI-Anfragen (Google Gemini)",
    purpose: "Einwilligung — KI-gestützte Analyse und Empfehlungen",
    legalBasis: "Art. 6 Abs. 1 lit. a DSGVO",
    retention: "Keine Speicherung — Echtzeitverarbeitung",
    recipients: "Google Gemini API (EU-Endpoint), keine Trainingsdaten",
    safeguards: "Opt-Out via ki_features_enabled, AiDisclosure an allen Touchpoints",
    deletionProcess: "Keine persistente Speicherung, kein Löschbedarf",
  },
  {
    id: "10",
    category: "Zahlungsdaten / Abrechnungen",
    purpose: "Vertragsdurchführung — Abwicklung von Zahlungen",
    legalBasis: "Art. 6 Abs. 1 lit. b DSGVO",
    retention: "10 Jahre (§147 AO)",
    recipients: "Supabase (EU), CopeCart (Zahlungsabwicklung)",
    safeguards: "RLS, Provider-isoliert, keine Kreditkartendaten gespeichert",
    deletionProcess: "Keine Löschung vor Ablauf der Aufbewahrungsfrist",
  },
];

const STORAGE_KEY = "hm_verarbeitungsverzeichnis";

export default function Verarbeitungsverzeichnis() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ProcessingEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState<ProcessingEntry | null>(null);
  const [lastModified, setLastModified] = useState<string>(new Date().toISOString());
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
    loadEntries();
  }, []);

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!data) { navigate("/admin/mission-control"); return; }
    setIsAdmin(true);
    setLoading(false);
  };

  const loadEntries = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setEntries(parsed.entries);
      setLastModified(parsed.lastModified);
    } else {
      setEntries(DEFAULT_ENTRIES);
      setLastModified(new Date().toISOString());
    }
  };

  const saveEntries = (updated: ProcessingEntry[]) => {
    const now = new Date().toISOString();
    setEntries(updated);
    setLastModified(now);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries: updated, lastModified: now }));
    toast.success("Verarbeitungsverzeichnis gespeichert");
  };

  const startEdit = (entry: ProcessingEntry) => {
    setEditingId(entry.id);
    setEditBuffer({ ...entry });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditBuffer(null);
  };

  const confirmEdit = () => {
    if (!editBuffer) return;
    const updated = entries.map(e => e.id === editBuffer.id ? editBuffer : e);
    saveEntries(updated);
    setEditingId(null);
    setEditBuffer(null);
  };

  const updateField = (field: keyof ProcessingEntry, value: string) => {
    if (!editBuffer) return;
    setEditBuffer({ ...editBuffer, [field]: value });
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    
    doc.setFontSize(16);
    doc.text("Verzeichnis von Verarbeitungstätigkeiten", 14, 15);
    doc.setFontSize(10);
    doc.text("gemäß Art. 30 DSGVO (EU 2016/679)", 14, 22);
    doc.text(`Verantwortlicher: HufManager – Pascal Schmid`, 14, 28);
    doc.text(`Stand: ${format(new Date(lastModified), "dd.MM.yyyy HH:mm", { locale: de })} Uhr`, 14, 34);
    doc.text(`Exportiert am: ${format(new Date(), "dd.MM.yyyy HH:mm", { locale: de })} Uhr`, 14, 40);

    const headers = [
      "Nr.", "Datenkategorie", "Verarbeitungszweck", "Rechtsgrundlage",
      "Speicherdauer", "Empfänger", "Schutzmaßnahmen", "Löschprozess"
    ];

    const rows = entries.map((e, i) => [
      String(i + 1), e.category, e.purpose, e.legalBasis,
      e.retention, e.recipients, e.safeguards, e.deletionProcess
    ]);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 46,
      styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: [30, 30, 30], textColor: 255, fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 30 },
        2: { cellWidth: 38 },
        3: { cellWidth: 30 },
        4: { cellWidth: 28 },
        5: { cellWidth: 35 },
        6: { cellWidth: 45 },
        7: { cellWidth: 45 },
      },
      margin: { left: 10, right: 10 },
    });

    doc.save(`Verarbeitungsverzeichnis_HufManager_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF exportiert");
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Laden…</div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/mission-control")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h1 className="text-2xl font-bold">Verarbeitungsverzeichnis</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                gemäß Art. 30 DSGVO — Letzte Änderung: {format(new Date(lastModified), "dd.MM.yyyy, HH:mm", { locale: de })} Uhr
              </p>
            </div>
          </div>
          <Button onClick={exportPDF} className="gap-2">
            <FileDown className="h-4 w-4" />
            PDF-Export für Behörden
          </Button>
        </div>

        {/* Info */}
        <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
          <strong>Verantwortlicher:</strong> Pascal Schmid (HufManager) · 
          <strong> Datenschutzbeauftragter:</strong> datenschutz@hufmanager.de · 
          <strong> System:</strong> HufManager (hufmanager.lovable.app) · 
          <strong> Infrastruktur:</strong> Supabase (eu-central-1, Frankfurt)
        </div>

        {/* Table */}
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/70 border-b">
                <th className="text-left p-3 font-semibold w-8">Nr.</th>
                <th className="text-left p-3 font-semibold min-w-[140px]">Datenkategorie</th>
                <th className="text-left p-3 font-semibold min-w-[180px]">Verarbeitungszweck</th>
                <th className="text-left p-3 font-semibold min-w-[140px]">Rechtsgrundlage</th>
                <th className="text-left p-3 font-semibold min-w-[130px]">Speicherdauer</th>
                <th className="text-left p-3 font-semibold min-w-[150px]">Empfänger / Drittanbieter</th>
                <th className="text-left p-3 font-semibold min-w-[180px]">Techn. Schutzmaßnahmen</th>
                <th className="text-left p-3 font-semibold min-w-[170px]">Löschprozess</th>
                <th className="text-left p-3 font-semibold w-20">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <tr key={entry.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-muted-foreground font-mono">{idx + 1}</td>
                  {editingId === entry.id && editBuffer ? (
                    <>
                      <td className="p-2"><Input value={editBuffer.category} onChange={e => updateField("category", e.target.value)} className="text-xs" /></td>
                      <td className="p-2"><Textarea value={editBuffer.purpose} onChange={e => updateField("purpose", e.target.value)} className="text-xs min-h-[60px]" /></td>
                      <td className="p-2"><Input value={editBuffer.legalBasis} onChange={e => updateField("legalBasis", e.target.value)} className="text-xs" /></td>
                      <td className="p-2"><Input value={editBuffer.retention} onChange={e => updateField("retention", e.target.value)} className="text-xs" /></td>
                      <td className="p-2"><Textarea value={editBuffer.recipients} onChange={e => updateField("recipients", e.target.value)} className="text-xs min-h-[60px]" /></td>
                      <td className="p-2"><Textarea value={editBuffer.safeguards} onChange={e => updateField("safeguards", e.target.value)} className="text-xs min-h-[60px]" /></td>
                      <td className="p-2"><Textarea value={editBuffer.deletionProcess} onChange={e => updateField("deletionProcess", e.target.value)} className="text-xs min-h-[60px]" /></td>
                      <td className="p-2 space-y-1">
                        <Button size="icon" variant="ghost" onClick={confirmEdit} className="h-7 w-7 text-primary" aria-label="Änderung bestätigen"><Check className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={cancelEdit} className="h-7 w-7 text-destructive" aria-label="Abbrechen"><X className="h-4 w-4" /></Button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-3 font-medium">{entry.category}</td>
                      <td className="p-3 text-muted-foreground">{entry.purpose}</td>
                      <td className="p-3"><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{entry.legalBasis}</code></td>
                      <td className="p-3 text-muted-foreground">{entry.retention}</td>
                      <td className="p-3 text-muted-foreground">{entry.recipients}</td>
                      <td className="p-3 text-muted-foreground text-xs">{entry.safeguards}</td>
                      <td className="p-3 text-muted-foreground text-xs">{entry.deletionProcess}</td>
                      <td className="p-3">
                        <Button size="icon" variant="ghost" onClick={() => startEdit(entry)} className="h-7 w-7" aria-label="Eintrag bearbeiten"><Pencil className="h-3.5 w-3.5" /></Button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Dieses Verzeichnis ist vertraulich und nur für den internen Gebrauch sowie für die Vorlage bei Aufsichtsbehörden bestimmt.
        </p>
      </div>
    </div>
  );
}
