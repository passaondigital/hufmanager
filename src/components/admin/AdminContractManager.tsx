import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText, Plus, Send, MoreHorizontal, Loader2, Download, Eye, Ban,
  Clock, AlertTriangle, BookOpen, Shield, Radio, Settings, FilePlus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { AdminContractModal } from "./AdminContractModal";
import { AdminTemplateManager } from "./AdminTemplateManager";
import { AdminDunningManager } from "./AdminDunningManager";
import { AdminComplianceManager } from "./AdminComplianceManager";
import { AdminBroadcastManager } from "./AdminBroadcastManager";
import { AdminAutomationSettings } from "./AdminAutomationSettings";
import { ContractAmendmentDialog } from "./ContractAmendmentDialog";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Entwurf", className: "bg-muted text-muted-foreground" },
  sent: { label: "Versendet", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  active: { label: "Aktiv", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  cancelled: { label: "Gekündigt", className: "bg-destructive/10 text-destructive" },
  expired: { label: "Abgelaufen", className: "bg-muted text-muted-foreground" },
};

export function AdminContractManager() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editContract, setEditContract] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("contracts");
  const [amendmentContract, setAmendmentContract] = useState<any>(null);
  const [showAmendment, setShowAmendment] = useState(false);

  const fetchContracts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("admin_contracts")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setContracts(data);
    setLoading(false);
  };

  useEffect(() => { fetchContracts(); }, []);

  // Stats
  const active = contracts.filter(c => c.status === "active").length;
  const pendingCancellations = contracts.filter(c => c.cancellation_requested_at && c.status === "active").length;
  const expiringSoon = contracts.filter(c => {
    if (!c.period_end || c.status !== "active") return false;
    const days = (new Date(c.period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days <= 60 && days > 0;
  }).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Verträge & Fristen</h2>
          <p className="text-sm text-muted-foreground">Vertragsmanagement, Vorlagen & Mahnwesen</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Aktive Verträge</p>
            <p className="text-2xl font-bold text-green-600">{active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Kündigungen offen</p>
            <p className="text-2xl font-bold text-amber-600">{pendingCancellations}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Läuft aus (60 Tage)</p>
            <p className="text-2xl font-bold text-blue-600">{expiringSoon}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="contracts" className="gap-1.5">
            <FileText className="h-4 w-4" /> Verträge
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5">
            <BookOpen className="h-4 w-4" /> Vorlagen
          </TabsTrigger>
          <TabsTrigger value="dunning" className="gap-1.5">
            <AlertTriangle className="h-4 w-4" /> Mahnwesen
          </TabsTrigger>
          <TabsTrigger value="compliance" className="gap-1.5">
            <Shield className="h-4 w-4" /> Compliance
          </TabsTrigger>
          <TabsTrigger value="broadcast" className="gap-1.5">
            <Radio className="h-4 w-4" /> Broadcast
          </TabsTrigger>
          <TabsTrigger value="deadlines" className="gap-1.5">
            <Clock className="h-4 w-4" /> Fristen
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="h-4 w-4" /> Automatisierung
          </TabsTrigger>
        </TabsList>

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditContract(null); setShowModal(true); }}>
              <Plus className="h-4 w-4 mr-1.5" /> Vertrag erstellen
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : contracts.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Noch keine Verträge vorhanden.</p>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nr.</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Anbieter-Adresse</TableHead>
                    <TableHead>Laufzeit</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.filter(c => !(c as any).is_amendment).map((c) => {
                    const status = STATUS_CONFIG[c.status] || STATUS_CONFIG.draft;
                    const amendmentCount = contracts.filter(a => (a as any).amendment_of_id === c.id).length;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-sm">
                          {c.contract_number}
                          {amendmentCount > 0 && (
                            <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0">
                              {amendmentCount} Nachtrag{amendmentCount > 1 ? "e" : ""}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{c.provider_pid || "–"}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{c.plan}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={status.className}>
                            {status.label}
                            {c.cancellation_requested_at && c.status === "active" && (
                              <AlertTriangle className="h-3 w-3 ml-1" />
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={
                          c.variables_used && typeof c.variables_used === 'object' && 'ANBIETER_ADRESSE' in (c.variables_used as Record<string, unknown>)
                            ? String((c.variables_used as Record<string, string>).ANBIETER_ADRESSE)
                            : "–"
                        }>
                          {c.variables_used && typeof c.variables_used === 'object' && 'ANBIETER_ADRESSE' in (c.variables_used as Record<string, unknown>)
                            ? String((c.variables_used as Record<string, string>).ANBIETER_ADRESSE).substring(0, 40) + (String((c.variables_used as Record<string, string>).ANBIETER_ADRESSE).length > 40 ? "…" : "")
                            : "–"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(c.period_start), "MM/yyyy")}
                          {c.period_end ? ` – ${format(new Date(c.period_end), "MM/yyyy")}` : " – ∞"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditContract(c); setShowModal(true); }}>
                                <Eye className="h-4 w-4 mr-2" /> Öffnen
                              </DropdownMenuItem>
                              {c.pdf_url && (
                                <DropdownMenuItem onClick={() => window.open(c.pdf_url, "_blank")}>
                                  <Download className="h-4 w-4 mr-2" /> PDF
                                </DropdownMenuItem>
                              )}
                              {(c.status === "active" || c.status === "expired") && (
                                <DropdownMenuItem onClick={() => { setAmendmentContract(c); setShowAmendment(true); }}>
                                  <FilePlus className="h-4 w-4 mr-2" /> Nachtrag erstellen
                                </DropdownMenuItem>
                              )}
                              {c.status === "active" && c.cancellation_requested_at && (
                                <DropdownMenuItem onClick={async () => {
                                  await supabase.from("admin_contracts").update({ status: "cancelled", cancellation_effective_date: new Date().toISOString().split("T")[0] }).eq("id", c.id);
                                  toast.success("Kündigung bestätigt");
                                  fetchContracts();
                                }}>
                                  <Ban className="h-4 w-4 mr-2" /> Kündigung bestätigen
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <AdminTemplateManager />
        </TabsContent>

        {/* Dunning Tab */}
        <TabsContent value="dunning">
          <AdminDunningManager />
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance">
          <AdminComplianceManager />
        </TabsContent>

        {/* Broadcast Tab */}
        <TabsContent value="broadcast">
          <AdminBroadcastManager />
        </TabsContent>

        {/* Deadlines Tab */}
        <TabsContent value="deadlines" className="space-y-4">
          <h3 className="text-lg font-semibold">Bevorstehende Fristen (60 Tage)</h3>
          {contracts.filter(c => {
            if (!c.period_end || c.status !== "active") return false;
            const days = (new Date(c.period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
            return days <= 60 && days > 0;
          }).length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Keine bevorstehenden Fristen.</p>
          ) : (
            <div className="space-y-3">
              {contracts
                .filter(c => c.period_end && c.status === "active")
                .sort((a, b) => new Date(a.period_end).getTime() - new Date(b.period_end).getTime())
                .filter(c => {
                  const days = (new Date(c.period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
                  return days <= 60 && days > 0;
                })
                .map(c => {
                  const days = Math.ceil((new Date(c.period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <Card key={c.id}>
                      <CardContent className="flex items-center justify-between py-3">
                        <div>
                          <p className="font-medium">{c.contract_number} – {c.provider_pid}</p>
                          <p className="text-sm text-muted-foreground">{c.plan} · endet {format(new Date(c.period_end), "dd.MM.yyyy")}</p>
                        </div>
                        <Badge className={days <= 14 ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-800"}>
                          {days} Tage
                          {c.cancellation_requested_at && " · Kündigung"}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>

        {/* Automation Settings Tab */}
        <TabsContent value="settings">
          <AdminAutomationSettings />
        </TabsContent>
      </Tabs>

      <AdminContractModal
        open={showModal}
        onOpenChange={setShowModal}
        contract={editContract}
        onSaved={fetchContracts}
      />
    </div>
  );
}
