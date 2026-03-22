import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Trash2, Loader2, Users } from "lucide-react";
import { useEmailSubscribers } from "../hooks/useEmailSubscribers";
import { useEmailLists } from "../hooks/useEmailLists";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";

export function ContactsTab() {
  const { lists } = useEmailLists();
  const [selectedList, setSelectedList] = useState<string>("");
  const { subscribers, isLoading, deleteSubscriber } = useEmailSubscribers(selectedList || undefined);
  const [search, setSearch] = useState("");

  const filtered = subscribers.filter(s =>
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.first_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.last_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      subscribed: { label: "Aktiv", cls: "bg-green-100 text-green-700" },
      unsubscribed: { label: "Abgemeldet", cls: "bg-gray-100 text-gray-700" },
      bounced: { label: "Bounced", cls: "bg-red-100 text-red-700" },
    };
    const s = map[status] || map.subscribed;
    return <Badge className={s.cls}>{s.label}</Badge>;
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Kontakte suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white" />
        </div>
        <Select value={selectedList} onValueChange={setSelectedList}>
          <SelectTrigger className="w-[200px] bg-white"><SelectValue placeholder="Alle Listen" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Listen</SelectItem>
            {lists.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#F47B20]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Noch keine Kontakte vorhanden.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-Mail</TableHead>
                <TableHead className="hidden sm:table-cell">Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Quelle</TableHead>
                <TableHead className="hidden md:table-cell">Datum</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium text-black">{s.email}</TableCell>
                  <TableCell className="hidden sm:table-cell text-black">
                    {[s.first_name, s.last_name].filter(Boolean).join(" ") || "—"}
                  </TableCell>
                  <TableCell>{statusBadge(s.status)}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{s.source}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {format(new Date(s.created_at), "dd.MM.yyyy", { locale: de })}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => {
                      deleteSubscriber.mutate(s.id, { onSuccess: () => toast.success("Kontakt entfernt") });
                    }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
