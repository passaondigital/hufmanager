import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, Wrench } from "lucide-react";
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
    horse_count: number;
    customer_count: number;
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
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedRoleOption = ROLE_OPTIONS.find(r => r.value === newRole);
  const isChanged = newRole && newRole !== user?.role;

  const warnings = useMemo(() => {
    if (!user || !newRole || newRole === user.role) return [];
    const w: string[] = [];

    // Provider → other: may lose customer/horse associations
    if (user.role === "provider" && newRole !== "provider") {
      if (user.customer_count > 0) {
        w.push(`Dieser Provider hat ${user.customer_count} aktive Kunden-Verbindungen. Diese bleiben in access_grants bestehen, aber der Nutzer kann nicht mehr als Provider agieren.`);
      }
      if (user.horse_count > 0) {
        w.push(`${user.horse_count} Pferde sind mit diesem Nutzer verknüpft.`);
      }
    }

    // Client → Provider: unusual
    if (user.role === "client" && newRole === "provider") {
      w.push("Dieser Kunde wird zum Provider hochgestuft. Bestehende Kunden-Verbindungen bleiben als Client-Seite erhalten.");
    }

    // Any → Employee: should have provider assignment
    if (newRole === "employee") {
      w.push("Mitarbeiter müssen einem Provider zugeordnet sein (über employee_profiles). Stelle sicher, dass die Zuordnung existiert.");
    }

    return w;
  }, [user, newRole]);

  const handleRepair = async () => {
    if (!user || !adminUser || !newRole || !reason.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("admin_repair_user_role", {
        p_user_id: user.id,
        p_new_role: newRole,
        p_admin_id: adminUser.id,
        p_reason: reason.trim(),
      });

      if (error) throw error;

      const result = data as any;
      if (!result?.success) {
        throw new Error(result?.error || "Unbekannter Fehler");
      }

      toast.success(`Rolle geändert: ${ROLE_LABEL_MAP[result.old_role]} → ${ROLE_LABEL_MAP[result.new_role]} (${result.new_readable_id})`);
      onOpenChange(false);
      setNewRole("");
      setReason("");
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Nutzer reparieren
          </DialogTitle>
          <DialogDescription>
            Rolle und ID-Klasse für {user.full_name || user.email} korrigieren
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current state */}
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Aktuelle Rolle:</span>
              <Badge variant="outline">{ROLE_LABEL_MAP[user.role] || user.role}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Aktuelle ID:</span>
              <code className="text-xs font-mono bg-background px-2 py-0.5 rounded">{user.readable_id || "—"}</code>
            </div>
            {user.horse_count > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pferde:</span>
                <span>{user.horse_count}</span>
              </div>
            )}
            {user.customer_count > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Kunden:</span>
                <span>{user.customer_count}</span>
              </div>
            )}
          </div>

          {/* New role selector */}
          <div className="space-y-2">
            <Label>Neue Rolle zuweisen</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue placeholder="Rolle wählen..." />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map(r => (
                  <SelectItem key={r.value} value={r.value} disabled={r.value === user.role}>
                    {r.label} ({r.prefix})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedRoleOption && isChanged && (
              <p className="text-xs text-muted-foreground">
                Neue ID-Klasse: <code className="font-mono bg-muted px-1 rounded">{selectedRoleOption.prefix}-XXXXXX</code>
              </p>
            )}
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-2">
              {warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 p-3 rounded-lg border border-orange-500/30 bg-orange-500/5">
                  <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-700 dark:text-orange-300">{w}</p>
                </div>
              ))}
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label>Grund der Änderung *</Label>
            <Textarea
              placeholder="Warum wird die Rolle geändert? (Pflichtfeld)"
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button
            onClick={handleRepair}
            disabled={saving || !isChanged || !reason.trim()}
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Rolle ändern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
