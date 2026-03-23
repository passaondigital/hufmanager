import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrgMembers } from "@/hooks/useOrganization";
import type { Organization } from "@/hooks/useOrganization";

export default function PortalSettings() {
  const { org, membership } = useOutletContext<{ org: Organization; membership: any; basePath: string }>();
  const { data: members = [] } = useOrgMembers(org?.id);
  const qc = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const isAdmin = membership?.role === "admin";

  const updateOrg = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase
        .from("organizations")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", org.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["organization", org.slug] });
      toast.success("Einstellungen gespeichert");
    },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Einstellungen</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Branding</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input defaultValue={org.name} disabled={!isAdmin}
              onBlur={(e) => isAdmin && e.target.value !== org.name && updateOrg.mutate({ name: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium">Beschreibung</label>
            <Textarea defaultValue={org.description || ""} disabled={!isAdmin}
              onBlur={(e) => isAdmin && updateOrg.mutate({ description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Primärfarbe</label>
              <Input type="color" defaultValue={org.brand_color_primary || "#F5970A"} disabled={!isAdmin}
                onChange={(e) => isAdmin && updateOrg.mutate({ brand_color_primary: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Website</label>
              <Input defaultValue={org.website || ""} disabled={!isAdmin}
                onBlur={(e) => isAdmin && updateOrg.mutate({ website: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Team</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="text-sm">{m.user_id.slice(0, 8)}…</span>
              <Badge variant={m.role === "admin" ? "default" : "secondary"} className="capitalize">{m.role}</Badge>
            </div>
          ))}
          {isAdmin && (
            <div className="flex gap-2 pt-2">
              <Input placeholder="E-Mail einladen" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              <Button size="sm" disabled={!inviteEmail}>
                <UserPlus className="h-4 w-4 mr-1" /> Einladen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Abrechnung</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Plan: <span className="font-medium capitalize">{org.plan || "starter"}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
