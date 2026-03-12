import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Loader2, Search, Horse } from "lucide-react";
import { toast } from "sonner";

interface EmployeeHorseAccessProps {
  employeeId: string;
  employeeName: string;
}

interface HorseAccess {
  id: string;
  horse_id: string;
  can_view: boolean;
  can_edit: boolean;
  can_add_notes: boolean;
  horse: {
    id: string;
    name: string;
    breed: string | null;
    photo_url: string | null;
    readable_id: string | null;
    owner_id: string | null;
  };
  ownerName?: string;
}

interface AvailableHorse {
  id: string;
  name: string;
  breed: string | null;
  photo_url: string | null;
  readable_id: string | null;
  owner_id: string | null;
  ownerName?: string;
}

export function EmployeeHorseAccess({ employeeId, employeeName }: EmployeeHorseAccessProps) {
  const queryClient = useQueryClient();
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);
  const [grantCanEdit, setGrantCanEdit] = useState(false);
  const [grantCanAddNotes, setGrantCanAddNotes] = useState(true);

  // Fetch current access list
  const { data: accessList = [], isLoading } = useQuery({
    queryKey: ["employee-horse-access", employeeId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("employee_horse_access")
        .select(`
          id, horse_id, can_view, can_edit, can_add_notes,
          horses (id, name, breed, photo_url, readable_id, owner_id)
        `)
        .eq("employee_id", employeeId)
        .eq("provider_id", user.id);

      if (error) throw error;

      // Load owner names
      const ownerIds = [...new Set((data || []).map((d: any) => d.horses?.owner_id).filter(Boolean))];
      let ownerMap: Record<string, string> = {};
      if (ownerIds.length > 0) {
        const { data: owners } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ownerIds);
        ownerMap = Object.fromEntries((owners || []).map((o) => [o.id, o.full_name || "Unbekannt"]));
      }

      return (data || []).map((d: any) => ({
        id: d.id,
        horse_id: d.horse_id,
        can_view: d.can_view,
        can_edit: d.can_edit,
        can_add_notes: d.can_add_notes,
        horse: d.horses,
        ownerName: d.horses?.owner_id ? ownerMap[d.horses.owner_id] : undefined,
      })) as HorseAccess[];
    },
  });

  // Fetch available horses (provider's clients' horses)
  const { data: availableHorses = [] } = useQuery({
    queryKey: ["provider-horses-for-grant", employeeId],
    enabled: showGrantModal,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get provider's clients
      const { data: grants } = await supabase
        .from("access_grants")
        .select("client_id")
        .eq("provider_id", user.id)
        .eq("is_active", true);

      const clientIds = (grants || []).map((g) => g.client_id);
      if (clientIds.length === 0) return [];

      const { data: horses } = await supabase
        .from("horses")
        .select("id, name, breed, photo_url, readable_id, owner_id")
        .in("owner_id", clientIds)
        .is("deleted_at", null)
        .order("name");

      // Owner names
      const ownerIds = [...new Set((horses || []).map((h) => h.owner_id).filter(Boolean))];
      let ownerMap: Record<string, string> = {};
      if (ownerIds.length > 0) {
        const { data: owners } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ownerIds as string[]);
        ownerMap = Object.fromEntries((owners || []).map((o) => [o.id, o.full_name || "Unbekannt"]));
      }

      // Filter out already granted
      const grantedIds = new Set(accessList.map((a) => a.horse_id));
      return (horses || [])
        .filter((h) => !grantedIds.has(h.id))
        .map((h) => ({
          ...h,
          ownerName: h.owner_id ? ownerMap[h.owner_id] : undefined,
        })) as AvailableHorse[];
    },
  });

  // Toggle permission mutation
  const togglePermission = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: boolean }) => {
      const { error } = await supabase
        .from("employee_horse_access")
        .update({ [field]: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-horse-access", employeeId] });
    },
    onError: () => toast.error("Fehler beim Aktualisieren"),
  });

  // Grant access mutation
  const grantAccess = useMutation({
    mutationFn: async () => {
      if (!selectedHorseId) throw new Error("Kein Pferd ausgewählt");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht authentifiziert");

      const { error } = await supabase
        .from("employee_horse_access")
        .upsert({
          employee_id: employeeId,
          horse_id: selectedHorseId,
          provider_id: user.id,
          granted_by: user.id,
          can_view: true,
          can_edit: grantCanEdit,
          can_add_notes: grantCanAddNotes,
        }, { onConflict: "employee_id,horse_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-horse-access", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["provider-horses-for-grant", employeeId] });
      setShowGrantModal(false);
      setSelectedHorseId(null);
      setGrantCanEdit(false);
      setGrantCanAddNotes(true);
      toast.success("Pferd freigegeben");
    },
    onError: () => toast.error("Fehler beim Freigeben"),
  });

  // Revoke access mutation
  const revokeAccess = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("employee_horse_access")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-horse-access", employeeId] });
      setRevokeId(null);
      toast.success("Freigabe entzogen");
    },
    onError: () => toast.error("Fehler beim Entziehen"),
  });

  const filteredAvailable = availableHorses.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    (h.readable_id && h.readable_id.toLowerCase().includes(search.toLowerCase()))
  );

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-sm">Pferde-Zugriff</h4>
          <p className="text-xs text-muted-foreground">
            Wähle welche Pferde {employeeName} sehen darf
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowGrantModal(true)}
          className="gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Pferd freigeben
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : accessList.length === 0 ? (
        <div className="rounded-xl border border-border bg-muted/30 p-8 text-center">
          <p className="text-sm font-medium text-foreground">Noch keine Pferde zugeteilt</p>
          <p className="text-xs text-muted-foreground mt-1">
            Nutze „+ Pferd freigeben" um diesem Mitarbeiter Zugriff auf Pferde zu geben.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {accessList.map((access) => (
            <div
              key={access.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent/5"
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={access.horse.photo_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {getInitials(access.horse.name)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {access.horse.name}
                  </span>
                  {access.horse.readable_id && (
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      #{access.horse.readable_id}
                    </Badge>
                  )}
                </div>
                {access.ownerName && (
                  <p className="text-xs text-muted-foreground truncate">{access.ownerName}</p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1" title="Ansehen">
                  <span className="text-xs">👁</span>
                  <Switch
                    checked={access.can_view}
                    disabled
                    className="scale-75"
                  />
                </div>
                <div className="flex items-center gap-1" title="Bearbeiten">
                  <span className="text-xs">✏️</span>
                  <Switch
                    checked={access.can_edit}
                    onCheckedChange={(v) =>
                      togglePermission.mutate({ id: access.id, field: "can_edit", value: v })
                    }
                    className="scale-75"
                  />
                </div>
                <div className="flex items-center gap-1" title="Notizen">
                  <span className="text-xs">📝</span>
                  <Switch
                    checked={access.can_add_notes}
                    onCheckedChange={(v) =>
                      togglePermission.mutate({ id: access.id, field: "can_add_notes", value: v })
                    }
                    className="scale-75"
                  />
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => setRevokeId(access.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grant Modal */}
      <Dialog open={showGrantModal} onOpenChange={setShowGrantModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pferd freigeben</DialogTitle>
            <DialogDescription>
              Wähle ein Pferd aus deinen Kunden für {employeeName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Name oder EQID suchen…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-lg p-1">
              {filteredAvailable.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Keine verfügbaren Pferde
                </p>
              ) : (
                filteredAvailable.map((horse) => (
                  <button
                    key={horse.id}
                    onClick={() => setSelectedHorseId(horse.id)}
                    className={`w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors ${
                      selectedHorseId === horse.id
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-accent/10"
                    }`}
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={horse.photo_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                        {getInitials(horse.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium truncate block">{horse.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {horse.readable_id && `#${horse.readable_id} · `}
                        {horse.ownerName}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="space-y-3 pt-2 border-t border-border">
              <Label className="text-xs font-medium text-muted-foreground">Berechtigungen</Label>
              <div className="flex items-center gap-2">
                <Checkbox checked disabled />
                <span className="text-sm">Ansehen</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={grantCanEdit}
                  onCheckedChange={(v) => setGrantCanEdit(!!v)}
                />
                <span className="text-sm">Bearbeiten</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={grantCanAddNotes}
                  onCheckedChange={(v) => setGrantCanAddNotes(!!v)}
                />
                <span className="text-sm">Notizen hinzufügen</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGrantModal(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => grantAccess.mutate()}
              disabled={!selectedHorseId || grantAccess.isPending}
            >
              {grantAccess.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Freigeben
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation */}
      <AlertDialog open={!!revokeId} onOpenChange={() => setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Freigabe entziehen?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Mitarbeiter kann dieses Pferd danach nicht mehr sehen oder bearbeiten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeId && revokeAccess.mutate(revokeId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Entziehen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
