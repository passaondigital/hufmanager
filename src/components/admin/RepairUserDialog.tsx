import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface RepairUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string | null;
    full_name: string | null;
    readable_id: string | null;
    role: string;
  } | null;
  onSuccess: () => void;
}

const ROLE_OPTIONS = [
  { value: "provider", label: "Provider", prefix: "#PID" },
  { value: "client", label: "Kunde", prefix: "#KID" },
  { value: "partner", label: "Partner", prefix: "#PRID" },
  { value: "employee", label: "Mitarbeiter", prefix: "#EID" },
];

const ROLE_LABEL_MAP: Record<string, string> = {
  provider: "Provider",
  client: "Kunde",
  partner: "Partner",
  employee: "Mitarbeiter",
  admin: "Admin",
};

export function RepairUserDialog({ open, onOpenChange, user, onSuccess }: RepairUserDialogProps) {
  const { user: adminUser } = useAuth();
  const [newRole, setNewRole] = useState("");
  const [saving, setSaving] = useState(false);

  const isChanged = newRole && newRole !== user?.role;

  const handleSave = async () => {
    if (!user || !adminUser || !newRole) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("admin_repair_user_role", {
        p_user_id: user.id,
        p_new_role: newRole,
        p_admin_id: adminUser.id,
        p_reason: "Rolle geändert via Admin-Panel",
      });

      if (error) throw error;

      const result = data as any;
      if (!result?.success) {
        throw new Error(result?.error || "Unbekannter Fehler");
      }

      toast.success(`Rolle geändert: ${ROLE_LABEL_MAP[result.old_role]} → ${ROLE_LABEL_MAP[result.new_role]}`);
      onOpenChange(false);
      setNewRole("");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Fehler bei der Rollenänderung");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Rolle ändern</DialogTitle>
          <DialogDescription>
            {user.full_name || user.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Aktuelle Rolle:</span>
            <Badge variant="outline">{ROLE_LABEL_MAP[user.role] || user.role}</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Aktuelle ID:</span>
            <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{user.readable_id || "—"}</code>
          </div>

          <Select value={newRole} onValueChange={setNewRole}>
            <SelectTrigger>
              <SelectValue placeholder="Neue Rolle wählen..." />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map(r => (
                <SelectItem key={r.value} value={r.value} disabled={r.value === user.role}>
                  {r.label} ({r.prefix})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={handleSave} disabled={saving || !isChanged}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Rolle ändern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
