import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { toast } from "sonner";
import { ChevronDown, Ban, CheckCircle, Trash2, Mail, Loader2 } from "lucide-react";
import { useAdminActivityLog } from "@/hooks/useAdminActivityLog";

interface ProviderData {
  id: string;
  email: string | null;
  full_name: string | null;
  is_suspended: boolean | null;
}

interface BulkActionsBarProps {
  selectedIds: string[];
  providers: ProviderData[];
  onSelectionChange: (ids: string[]) => void;
  onActionComplete: () => void;
}

export default function BulkActionsBar({
  selectedIds,
  providers,
  onSelectionChange,
  onActionComplete,
}: BulkActionsBarProps) {
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"suspend" | "unsuspend" | "delete" | null>(null);
  const { logActivity } = useAdminActivityLog();

  const selectedProviders = providers.filter((p) => selectedIds.includes(p.id));
  const allSelected = providers.length > 0 && selectedIds.length === providers.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < providers.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(providers.map((p) => p.id));
    }
  };

  const handleBulkSuspend = async () => {
    setLoading(true);
    setConfirmAction(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_suspended: true,
          suspended_at: new Date().toISOString(),
          suspended_reason: "Bulk action by admin",
        })
        .in("id", selectedIds);

      if (error) throw error;

      // Log activity
      await logActivity({
        actionType: "bulk_action",
        targetType: "bulk",
        targetName: `${selectedIds.length} Provider gesperrt`,
        details: { action: "suspend", count: selectedIds.length, ids: selectedIds },
      });

      toast.success(`${selectedIds.length} Provider gesperrt`);
      onSelectionChange([]);
      onActionComplete();
    } catch (error: any) {
      console.error("Bulk suspend error:", error);
      toast.error("Fehler beim Sperren");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUnsuspend = async () => {
    setLoading(true);
    setConfirmAction(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_suspended: false,
          suspended_at: null,
          suspended_reason: null,
        })
        .in("id", selectedIds);

      if (error) throw error;

      await logActivity({
        actionType: "bulk_action",
        targetType: "bulk",
        targetName: `${selectedIds.length} Provider entsperrt`,
        details: { action: "unsuspend", count: selectedIds.length },
      });

      toast.success(`${selectedIds.length} Provider entsperrt`);
      onSelectionChange([]);
      onActionComplete();
    } catch (error: any) {
      console.error("Bulk unsuspend error:", error);
      toast.error("Fehler beim Entsperren");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkEmail = () => {
    const emails = selectedProviders
      .map((p) => p.email)
      .filter(Boolean)
      .join(",");

    if (emails) {
      window.open(`mailto:${emails}`, "_blank");
      toast.success("E-Mail-Client geöffnet");
    } else {
      toast.error("Keine E-Mail-Adressen gefunden");
    }
  };

  if (selectedIds.length === 0) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Checkbox
          checked={allSelected}
          onCheckedChange={handleSelectAll}
          aria-label="Alle auswählen"
        />
        <span className="text-sm text-muted-foreground">Alle auswählen</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-4 py-2 px-4 bg-primary/5 rounded-lg border border-primary/20">
        <Checkbox
          checked={allSelected}
          ref={(el) => {
            if (el) {
              // @ts-ignore
              el.indeterminate = someSelected;
            }
          }}
          onCheckedChange={handleSelectAll}
          aria-label="Auswahl ändern"
        />
        
        <Badge variant="secondary" className="gap-1">
          {selectedIds.length} ausgewählt
        </Badge>

        <div className="flex items-center gap-2 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Aktionen
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleBulkEmail}>
                <Mail className="w-4 h-4 mr-2" />
                E-Mail senden
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setConfirmAction("suspend")}>
                <Ban className="w-4 h-4 mr-2 text-destructive" />
                Alle sperren
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setConfirmAction("unsuspend")}>
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                Alle entsperren
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectionChange([])}
          >
            Auswahl aufheben
          </Button>
        </div>
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmAction !== null} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "suspend" && `${selectedIds.length} Provider sperren?`}
              {confirmAction === "unsuspend" && `${selectedIds.length} Provider entsperren?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "suspend" && 
                "Diese Aktion sperrt alle ausgewählten Provider. Sie können sich nicht mehr einloggen."}
              {confirmAction === "unsuspend" && 
                "Diese Aktion entsperrt alle ausgewählten Provider."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction === "suspend" ? handleBulkSuspend : handleBulkUnsuspend}
              className={confirmAction === "suspend" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              Bestätigen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
