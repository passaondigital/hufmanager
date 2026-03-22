import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Eye, Trash2, Loader2, Mail } from "lucide-react";
import { useEmailCampaigns } from "../hooks/useEmailCampaigns";
import { CampaignEditor } from "../campaigns/CampaignEditor";
import { CampaignDetailModal } from "../campaigns/CampaignDetailModal";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";

export function CampaignsTab() {
  const { campaigns, isLoading, deleteCampaign } = useEmailCampaigns();
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [detailCampaign, setDetailCampaign] = useState<any>(null);

  const filtered = campaigns.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.subject.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      draft: { label: "Entwurf", className: "bg-gray-100 text-gray-700" },
      scheduled: { label: "Geplant", className: "bg-blue-100 text-blue-700" },
      sending: { label: "Wird gesendet", className: "bg-yellow-100 text-yellow-700" },
      sent: { label: "Gesendet", className: "bg-green-100 text-green-700" },
    };
    const s = map[status] || map.draft;
    return <Badge className={s.className}>{s.label}</Badge>;
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Kampagnen durchsuchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
        <Button
          onClick={() => { setEditingCampaign(null); setEditorOpen(true); }}
          className="bg-[#F47B20] hover:bg-[#e06a10] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Neue Kampagne erstellen
        </Button>
      </div>

      {/* Table */}
      <Card className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#F47B20]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Noch keine Kampagnen erstellt.</p>
            <p className="text-sm">Klicke auf "Neue Kampagne erstellen" um zu starten.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Datum</TableHead>
                <TableHead className="hidden md:table-cell">Performance</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-gray-50" onClick={() => c.status === 'sent' && setDetailCampaign(c)}>
                  <TableCell className="max-w-[140px] sm:max-w-none">
                    <div>
                      <p className="font-medium text-black text-sm truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.subject}</p>
                    </div>
                  </TableCell>
                  <TableCell>{statusBadge(c.status)}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {format(new Date(c.created_at), "dd.MM.yyyy", { locale: de })}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {c.status === 'sent' && c.stats_sent > 0 ? (
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">
                          📬 {Math.round((c.stats_opened / c.stats_sent) * 100)}%
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          🖱️ {Math.round((c.stats_clicked / c.stats_sent) * 100)}%
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {c.status === 'sent' && (
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDetailCampaign(c); }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      {c.status === 'draft' && (
                        <Button variant="ghost" size="icon" onClick={(e) => {
                          e.stopPropagation();
                          setEditingCampaign(c);
                          setEditorOpen(true);
                        }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={(e) => {
                        e.stopPropagation();
                        deleteCampaign.mutate(c.id, { onSuccess: () => toast.success("Kampagne gelöscht") });
                      }}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? "Kampagne bearbeiten" : "Neue Kampagne"}</DialogTitle>
          </DialogHeader>
          <CampaignEditor campaign={editingCampaign} onClose={() => setEditorOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      {detailCampaign && (
        <CampaignDetailModal campaign={detailCampaign} onClose={() => setDetailCampaign(null)} />
      )}
    </div>
  );
}
