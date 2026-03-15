import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Building2, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const ORG_TYPES = [
  { value: "insurance", label: "Versicherung" },
  { value: "manufacturer", label: "Hersteller" },
  { value: "supplier", label: "Lieferant" },
  { value: "school", label: "Ausbildungsstätte" },
  { value: "association", label: "Verband" },
  { value: "event", label: "Veranstaltung" },
  { value: "media", label: "Medien" },
  { value: "other", label: "Sonstiges" },
];

export default function AdminOrganizations() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: "", type: "other", contact_email: "" });

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ["admin-organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, slug, type, plan, is_active, created_at, logo_url")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const createOrg = useMutation({
    mutationFn: async () => {
      const slug = newOrg.name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      const { error } = await supabase.from("organizations").insert({
        name: newOrg.name,
        slug,
        type: newOrg.type,
        contact_email: newOrg.contact_email || null,
        owner_id: (await supabase.auth.getUser()).data.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-organizations"] });
      setOpen(false);
      setNewOrg({ name: "", type: "other", contact_email: "" });
      toast({ title: "Organisation erstellt" });
    },
    onError: (e: Error) => toast({ title: "Fehler", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-background p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/mission-control">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" /> Organisationen
          </h1>
          <p className="text-sm text-muted-foreground">{orgs.length} Organisationen registriert</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Neue Organisation</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neue Organisation erstellen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input value={newOrg.name} onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Typ</label>
                <Select value={newOrg.type} onValueChange={(v) => setNewOrg({ ...newOrg, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ORG_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Kontakt-E-Mail</label>
                <Input value={newOrg.contact_email} onChange={(e) => setNewOrg({ ...newOrg, contact_email: e.target.value })} />
              </div>
              <Button onClick={() => createOrg.mutate()} disabled={!newOrg.name || createOrg.isPending} className="w-full">
                {createOrg.isPending ? "Erstelle…" : "Organisation erstellen"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Typ</th>
                  <th className="text-left p-3 font-medium">Slug</th>
                  <th className="text-left p-3 font-medium">Plan</th>
                  <th className="text-left p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((org) => (
                  <tr key={org.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-medium">{org.name}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="capitalize">
                        {ORG_TYPES.find((t) => t.value === org.type)?.label || org.type}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">{org.slug || "–"}</td>
                    <td className="p-3 capitalize">{org.plan || "starter"}</td>
                    <td className="p-3">
                      <Badge variant={org.is_active ? "default" : "secondary"}>
                        {org.is_active ? "Aktiv" : "Inaktiv"}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {orgs.length === 0 && !isLoading && (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Noch keine Organisationen</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
