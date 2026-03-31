import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ScrollText, Download, Plus, Loader2, FolderOpen } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface ProviderDocumentsSectionProps {
  providerId: string;
  onCreateInvoice?: () => void;
  onCreateContract?: () => void;
}

interface LinkedInvoice {
  id: string;
  invoice_number: string;
  status: string | null;
  total: number;
  issue_date?: string;
  period_start: string;
  period_end: string;
  pdf_url: string | null;
  created_at: string | null;
}

interface LinkedContract {
  id: string;
  contract_number: string;
  status: string | null;
  plan: string;
  period_start: string;
  period_end: string | null;
  pdf_url: string | null;
  created_at: string | null;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  paid: "bg-green-500/10 text-green-700 border-green-500/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground line-through",
  active: "bg-green-500/10 text-green-700 border-green-500/20",
  signed: "bg-primary/10 text-primary border-primary/20",
};

export function ProviderDocumentsSection({
  providerId,
  onCreateInvoice,
  onCreateContract,
}: ProviderDocumentsSectionProps) {
  const [invoices, setInvoices] = useState<LinkedInvoice[]>([]);
  const [contracts, setContracts] = useState<LinkedContract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, [providerId]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const [invRes, conRes] = await Promise.all([
        supabase
          .from("admin_invoices")
          .select("id, invoice_number, status, total, period_start, period_end, pdf_url, created_at")
          .eq("provider_id", providerId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("admin_contracts")
          .select("id, contract_number, status, plan, period_start, period_end, pdf_url, created_at")
          .eq("provider_id", providerId)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      setInvoices((invRes.data || []) as LinkedInvoice[]);
      setContracts((conRes.data || []) as LinkedContract[]);
    } catch (err) {
      console.error("Error loading provider documents:", err);
    } finally {
      setLoading(false);
    }
  };

  const openPdf = async (bucket: string, path: string | null) => {
    if (!path) return;
    if (path.startsWith("http")) {
      window.open(path, "_blank");
      return;
    }
    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const total = invoices.length + contracts.length;

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Dokumente laden…</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2 border-t">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FolderOpen className="w-4 h-4 text-primary" />
          Dokumente ({total})
        </div>
        <div className="flex gap-1.5">
          {onCreateInvoice && (
            <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={onCreateInvoice}>
              <Plus className="w-3 h-3" /> Rechnung
            </Button>
          )}
          {onCreateContract && (
            <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={onCreateContract}>
              <Plus className="w-3 h-3" /> Vertrag
            </Button>
          )}
        </div>
      </div>

      {total === 0 ? (
        <p className="text-xs text-muted-foreground pl-6">Keine Rechnungen oder Verträge hinterlegt.</p>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-1">
          {/* Invoices */}
          {invoices.map((inv) => (
            <div
              key={`inv-${inv.id}`}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-background border text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded shrink-0">
                  {inv.invoice_number || "—"}
                </span>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColors[inv.status || "draft"] || ""}`}>
                  {inv.status || "draft"}
                </Badge>
                <span className="text-muted-foreground truncate">
                  {inv.period_start ? format(new Date(inv.period_start), "MMM yyyy", { locale: de }) : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-medium">{inv.total?.toFixed(2)} €</span>
                {inv.pdf_url && (
                  <button
                    onClick={() => openPdf("admin-invoices", inv.pdf_url)}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title="PDF öffnen"
                  >
                    <Download className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Contracts */}
          {contracts.map((con) => (
            <div
              key={`con-${con.id}`}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-background border text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <ScrollText className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded shrink-0">
                  {con.contract_number || "—"}
                </span>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColors[con.status || "draft"] || ""}`}>
                  {con.status || "draft"}
                </Badge>
                <span className="truncate capitalize">{con.plan}</span>
                <span className="text-muted-foreground truncate">
                  {con.period_start ? format(new Date(con.period_start), "dd.MM.yyyy", { locale: de }) : ""}
                  {con.period_end ? ` – ${format(new Date(con.period_end), "dd.MM.yyyy", { locale: de })}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {con.pdf_url && (
                  <button
                    onClick={() => openPdf("admin-contracts", con.pdf_url)}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title="PDF öffnen"
                  >
                    <Download className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
