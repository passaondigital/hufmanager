import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Search, RefreshCw, Loader2, Users, Heart, FileText, Calendar, Receipt, Eye, Settings, MapPin, Zap } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { FeatureStatuses, FeatureStatus, FEATURE_DEFINITIONS, migrateBooleanToStatus } from "@/types/featureFlags";
import { ProviderFeatureEditor } from "@/components/admin/ProviderFeatureEditor";

interface PartnerData {
  id: string;
  email: string | null;
  full_name: string | null;
  readable_id: string | null;
  created_at: string;
  is_suspended: boolean | null;
  feature_statuses: FeatureStatuses | null;
  phone: string | null;
  horse_access_count: number;
  document_count: number;
  invoice_count: number;
  appointment_count: number;
  contact_count: number;
  service_count: number;
}

export default function AdminPartnerOverview() {
  const [partners, setPartners] = useState<PartnerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPartner, setSelectedPartner] = useState<PartnerData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [editFeatureStatuses, setEditFeatureStatuses] = useState<FeatureStatuses>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      // Get partner user IDs
      const { data: partnerRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "partner");
      if (rolesError) throw rolesError;

      const partnerIds = partnerRoles?.map(r => r.user_id) || [];
      if (partnerIds.length === 0) {
        setPartners([]);
        setLoading(false);
        return;
      }

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, readable_id, created_at, is_suspended, feature_statuses, phone")
        .in("id", partnerIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (profilesError) throw profilesError;

      // Fetch horse access counts (uses partner_profile_id column)
      const { data: horseAccess } = await supabase
        .from("horse_partner_access")
        .select("partner_profile_id")
        .in("partner_profile_id", partnerIds)
        .eq("status", "active");

      // Fetch document counts
      const { data: docs } = await supabase
        .from("partner_documents")
        .select("partner_id")
        .in("partner_id", partnerIds);

      // Fetch invoice counts
      const { data: invoices } = await supabase
        .from("partner_invoices")
        .select("partner_id")
        .in("partner_id", partnerIds);

      // Fetch appointment counts
      const { data: appointments } = await supabase
        .from("appointments")
        .select("provider_id")
        .in("provider_id", partnerIds);

      // Fetch contact counts
      const { data: contacts } = await supabase
        .from("contacts")
        .select("provider_id")
        .in("provider_id", partnerIds)
        .is("deleted_at", null);

      // Fetch service counts
      const { data: services } = await supabase
        .from("partner_services")
        .select("partner_id")
        .in("partner_id", partnerIds);

      // Build counts
      const horseCountMap = new Map<string, number>();
      horseAccess?.forEach(h => {
        const pid = h.partner_profile_id;
        if (pid) horseCountMap.set(pid, (horseCountMap.get(pid) || 0) + 1);
      });
      const docCountMap = new Map<string, number>();
      docs?.forEach(d => docCountMap.set(d.partner_id, (docCountMap.get(d.partner_id) || 0) + 1));
      const invoiceCountMap = new Map<string, number>();
      invoices?.forEach(i => invoiceCountMap.set(i.partner_id, (invoiceCountMap.get(i.partner_id) || 0) + 1));
      const appointmentCountMap = new Map<string, number>();
      appointments?.forEach(a => appointmentCountMap.set(a.provider_id, (appointmentCountMap.get(a.provider_id) || 0) + 1));
      const contactCountMap = new Map<string, number>();
      contacts?.forEach(c => contactCountMap.set(c.provider_id, (contactCountMap.get(c.provider_id) || 0) + 1));
      const serviceCountMap = new Map<string, number>();
      services?.forEach(s => serviceCountMap.set(s.partner_id, (serviceCountMap.get(s.partner_id) || 0) + 1));

      const partnerData: PartnerData[] = (profiles || []).map(p => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        readable_id: p.readable_id,
        created_at: p.created_at,
        is_suspended: p.is_suspended,
        feature_statuses: p.feature_statuses as FeatureStatuses | null,
        phone: p.phone,
        horse_access_count: horseCountMap.get(p.id) || 0,
        document_count: docCountMap.get(p.id) || 0,
        invoice_count: invoiceCountMap.get(p.id) || 0,
        appointment_count: appointmentCountMap.get(p.id) || 0,
        contact_count: contactCountMap.get(p.id) || 0,
        service_count: serviceCountMap.get(p.id) || 0,
      }));

      setPartners(partnerData);
    } catch (error) {
      console.error("Error fetching partners:", error);
      toast.error("Fehler beim Laden der Partner");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!searchTerm) return partners;
    const s = searchTerm.toLowerCase();
    return partners.filter(p =>
      p.full_name?.toLowerCase().includes(s) ||
      p.email?.toLowerCase().includes(s) ||
      p.readable_id?.toLowerCase().includes(s)
    );
  }, [partners, searchTerm]);

  const openFeatureEditor = (partner: PartnerData) => {
    setSelectedPartner(partner);
    setEditFeatureStatuses(partner.feature_statuses || {});
    setFeatureDialogOpen(true);
  };

  const saveFeatureStatuses = async () => {
    if (!selectedPartner) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ feature_statuses: editFeatureStatuses as any })
        .eq("id", selectedPartner.id);
      if (error) throw error;
      toast.success("Feature-Flags gespeichert");
      setFeatureDialogOpen(false);
      fetchPartners();
    } catch (error) {
      console.error("Error saving feature statuses:", error);
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const toggleSuspend = async (partner: PartnerData) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_suspended: !partner.is_suspended })
        .eq("id", partner.id);
      if (error) throw error;
      toast.success(partner.is_suspended ? "Partner entsperrt" : "Partner gesperrt");
      fetchPartners();
    } catch (error) {
      toast.error("Fehler beim Ändern des Status");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3">
          <p className="text-2xl font-bold">{partners.length}</p>
          <p className="text-xs text-muted-foreground">Partner gesamt</p>
        </Card>
        <Card className="p-3">
          <p className="text-2xl font-bold">{partners.filter(p => !p.is_suspended).length}</p>
          <p className="text-xs text-muted-foreground">Aktiv</p>
        </Card>
        <Card className="p-3">
          <p className="text-2xl font-bold">{partners.reduce((s, p) => s + p.horse_access_count, 0)}</p>
          <p className="text-xs text-muted-foreground">Pferde-Zugriffe</p>
        </Card>
        <Card className="p-3">
          <p className="text-2xl font-bold">{partners.reduce((s, p) => s + p.appointment_count, 0)}</p>
          <p className="text-xs text-muted-foreground">Termine</p>
        </Card>
        <Card className="p-3">
          <p className="text-2xl font-bold">{partners.reduce((s, p) => s + p.contact_count, 0)}</p>
          <p className="text-xs text-muted-foreground">Kunden</p>
        </Card>
        <Card className="p-3">
          <p className="text-2xl font-bold">{partners.reduce((s, p) => s + p.invoice_count, 0)}</p>
          <p className="text-xs text-muted-foreground">Rechnungen</p>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Partner suchen..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon" onClick={fetchPartners}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Partner</TableHead>
              <TableHead className="hidden md:table-cell">ID</TableHead>
              <TableHead>Pferde</TableHead>
              <TableHead className="hidden md:table-cell">Termine</TableHead>
              <TableHead className="hidden md:table-cell">Kunden</TableHead>
              <TableHead className="hidden lg:table-cell">Rechnungen</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(partner => (
              <TableRow key={partner.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{partner.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{partner.email}</p>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant="outline" className="text-xs font-mono">{partner.readable_id}</Badge>
                </TableCell>
                <TableCell>{partner.horse_access_count}</TableCell>
                <TableCell className="hidden md:table-cell">{partner.appointment_count}</TableCell>
                <TableCell className="hidden md:table-cell">{partner.contact_count}</TableCell>
                <TableCell className="hidden lg:table-cell">{partner.invoice_count}</TableCell>
                <TableCell>
                  {partner.is_suspended ? (
                    <Badge variant="destructive" className="text-xs">Gesperrt</Badge>
                  ) : (
                    <Badge variant="default" className="text-xs bg-green-500">Aktiv</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setSelectedPartner(partner); setDetailOpen(true); }}
                      title="Details"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openFeatureEditor(partner)}
                      title="Features"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Keine Partner gefunden
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="overflow-auto">
          <SheetHeader>
            <SheetTitle>{selectedPartner?.full_name || "Partner Details"}</SheetTitle>
          </SheetHeader>
          {selectedPartner && (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <p className="text-sm"><span className="text-muted-foreground">E-Mail:</span> {selectedPartner.email}</p>
                <p className="text-sm"><span className="text-muted-foreground">ID:</span> {selectedPartner.readable_id}</p>
                <p className="text-sm"><span className="text-muted-foreground">Telefon:</span> {selectedPartner.phone || "—"}</p>
                <p className="text-sm"><span className="text-muted-foreground">Registriert:</span> {format(new Date(selectedPartner.created_at), "dd.MM.yyyy", { locale: de })}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-3 text-center">
                  <Heart className="w-4 h-4 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold">{selectedPartner.horse_access_count}</p>
                  <p className="text-xs text-muted-foreground">Pferde</p>
                </Card>
                <Card className="p-3 text-center">
                  <Calendar className="w-4 h-4 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold">{selectedPartner.appointment_count}</p>
                  <p className="text-xs text-muted-foreground">Termine</p>
                </Card>
                <Card className="p-3 text-center">
                  <Users className="w-4 h-4 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold">{selectedPartner.contact_count}</p>
                  <p className="text-xs text-muted-foreground">Kunden</p>
                </Card>
                <Card className="p-3 text-center">
                  <FileText className="w-4 h-4 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold">{selectedPartner.document_count}</p>
                  <p className="text-xs text-muted-foreground">Dokumente</p>
                </Card>
                <Card className="p-3 text-center">
                  <Receipt className="w-4 h-4 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold">{selectedPartner.invoice_count}</p>
                  <p className="text-xs text-muted-foreground">Rechnungen</p>
                </Card>
                <Card className="p-3 text-center">
                  <Zap className="w-4 h-4 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold">{selectedPartner.service_count}</p>
                  <p className="text-xs text-muted-foreground">Services</p>
                </Card>
              </div>
              <Separator />
              <div className="flex gap-2">
                <Button
                  variant={selectedPartner.is_suspended ? "default" : "destructive"}
                  size="sm"
                  onClick={() => toggleSuspend(selectedPartner)}
                  className="flex-1"
                >
                  {selectedPartner.is_suspended ? "Entsperren" : "Sperren"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setDetailOpen(false); openFeatureEditor(selectedPartner); }}
                  className="flex-1"
                >
                  Feature-Flags
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Feature Editor Dialog */}
      <Dialog open={featureDialogOpen} onOpenChange={setFeatureDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Feature-Flags: {selectedPartner?.full_name}</DialogTitle>
          </DialogHeader>
          <ProviderFeatureEditor
            featureStatuses={editFeatureStatuses}
            onFeatureStatusChange={(key, status) => setEditFeatureStatuses(prev => ({ ...prev, [key]: status }))}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeatureDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={saveFeatureStatuses} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
