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
import { AlertTriangle } from "lucide-react";

interface DuplicateCustomer {
  id: string;
  display_id?: string;
  full_name?: string;
  email?: string;
  phone?: string;
}

interface Props {
  open: boolean;
  duplicates: DuplicateCustomer[];
  onCancel: () => void;
  onViewExisting: (id: string) => void;
}

export function DuplicateWarningDialog({ open, duplicates, onCancel, onViewExisting }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Mögliches Duplikat gefunden
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>Ein Kunde mit ähnlichen Daten existiert bereits:</p>
            <div className="space-y-2">
              {duplicates.map((dup) => (
                <div
                  key={dup.id}
                  className="p-3 bg-muted rounded-lg border cursor-pointer hover:bg-muted/80"
                  onClick={() => onViewExisting(dup.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{dup.full_name}</span>
                    {dup.display_id && (
                      <span className="text-xs font-mono text-muted-foreground">
                        #{dup.display_id}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {dup.email && <span>{dup.email}</span>}
                    {dup.email && dup.phone && <span> • </span>}
                    {dup.phone && <span>{dup.phone}</span>}
                  </div>
                </div>
              ))}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Schließen</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
