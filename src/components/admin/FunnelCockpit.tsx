import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, Loader2, Target } from "lucide-react";
import { FunnelKPIs } from "./funnel/FunnelKPIs";
import { FunnelLeadCard, STATUS_CONFIG, type FunnelLeadData } from "./funnel/FunnelLeadCard";
import { FunnelLeadDialog } from "./funnel/FunnelLeadDialog";

export function FunnelCockpit() {
  const [leads, setLeads] = useState<FunnelLeadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("alle");
  const [filterTopic, setFilterTopic] = useState("alle");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<FunnelLeadData | null>(null);

  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("funnel_leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching leads:", error);
      toast.error("Fehler beim Laden der Leads");
    } else {
      setLeads((data as FunnelLeadData[]) || []);
    }
    setLoading(false);
  };

  const openNewLead = () => {
    setEditingLead(null);
    setDialogOpen(true);
  };

  const openEditLead = (lead: FunnelLeadData) => {
    setEditingLead(lead);
    setDialogOpen(true);
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !search ||
      lead.full_name.toLowerCase().includes(search.toLowerCase()) ||
      lead.email?.toLowerCase().includes(search.toLowerCase()) ||
      lead.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      lead.message?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "alle" || lead.status === filterStatus;
    const matchesTopic = filterTopic === "alle" || lead.topic === filterTopic;
    return matchesSearch && matchesStatus && matchesTopic;
  });

  return (
    <div className="space-y-4">
      <FunnelKPIs leads={leads} />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Suchen..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterTopic} onValueChange={setFilterTopic}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Themen</SelectItem>
            <SelectItem value="demo_1zu1">1:1 Demo</SelectItem>
            <SelectItem value="frage">Frage</SelectItem>
            <SelectItem value="beratung">Beratung</SelectItem>
            <SelectItem value="sonstiges">Sonstiges</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={openNewLead} className="gap-2">
          <Plus className="h-4 w-4" /> Lead
        </Button>
      </div>

      {/* Leads List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredLeads.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Keine Leads gefunden</p>
            <Button variant="outline" className="mt-3" onClick={openNewLead}>Ersten Lead anlegen</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredLeads.map(lead => (
            <FunnelLeadCard key={lead.id} lead={lead} onClick={() => openEditLead(lead)} />
          ))}
        </div>
      )}

      {/* Dialog */}
      {dialogOpen && (
        <FunnelLeadDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          lead={editingLead}
          onSaved={fetchLeads}
        />
      )}
    </div>
  );
}
