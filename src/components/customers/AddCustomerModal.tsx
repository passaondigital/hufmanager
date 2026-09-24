import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { useFormDraft } from "@/hooks/useFormDraft";

import { useSubmitLock } from "@/hooks/useSubmitLock";
const emptyCustomer = { first_name: "", last_name: "", email: "", phone: "", street: "", zip_code: "", city: "" };

function getErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message: unknown }).message;
    return typeof message === "string" ? message : undefined;
  }
  return undefined;
}

interface CreatedCustomer {
  id: string;
  full_name: string;
}

interface CreateCustomerRpcResult {
  profile_id: string;
  contact_id: string;
  full_name: string;
}

function isCreateCustomerRpcResult(value: unknown): value is CreateCustomerRpcResult {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>).profile_id === "string" &&
    typeof (value as Record<string, unknown>).contact_id === "string" &&
    typeof (value as Record<string, unknown>).full_name === "string"
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (customer: CreatedCustomer) => void;
  draftKey?: string;
  draftRoute?: string;
}

/**
 * Single, shared "Neuer Kunde"-Dialog. Ursprünglich inline in
 * SlimCustomerHorseWorkspace, jetzt extrahiert, damit AppointmentFormModal
 * dieselbe Anlage-Logik ohne Duplikat nutzen kann.
 */

export function AddCustomerModal({ open, onClose, onCreated, draftKey = "new-customer", draftRoute = "/kunden" }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const runLocked = useSubmitLock();
  const { value: form, setValue: setForm, hasDraft, clearDraft, discardDraft } = useFormDraft(
    draftKey,
    emptyCustomer,
    { userId: user?.id, route: draftRoute, step: 1, section: "customer" },
  );

  // P1-A: einziger canonical Customer-Create-Pfad ist die atomare RPC
  // create_customer_with_contact (supabase/migrations/20260917120000_add_
  // create_customer_with_contact_v1.sql, geprüft/gehärtet, NICHT angewendet).
  // profiles + contacts liegen serverseitig in einer Transaktion — kein
  // Client-Rollback-Fallback mehr nötig oder vorhanden.
  const createCustomer = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("NOT_AUTHENTICATED");
      if (!form.first_name.trim() || !form.last_name.trim()) throw new Error("NAME_REQUIRED");

      const fullName = `${form.first_name.trim()} ${form.last_name.trim()}`;

      const { data, error } = await supabase.rpc("create_customer_with_contact", {
        p_profile: {
          full_name: fullName,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          street: form.street.trim() || null,
          zip_code: form.zip_code.trim() || null,
          city: form.city.trim() || null,
        },
        p_contact: { category: "client" },
      });
      if (error) throw error;
      if (!isCreateCustomerRpcResult(data)) {
        throw new Error("UNEXPECTED_RPC_RESULT");
      }

      return { id: data.profile_id, full_name: data.full_name } satisfies CreatedCustomer;
    },
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ["slim-customer-horse-workspace"] });
      queryClient.invalidateQueries({ queryKey: ["provider-clients"] });
      queryClient.invalidateQueries({ queryKey: ["provider-horses"] });
      queryClient.invalidateQueries({ queryKey: ["horses-with-price-group"] });
      toast({ title: "Kunde angelegt", description: "Du kannst jetzt direkt ein Pferd hinzufügen." });
      clearDraft();
      setForm(emptyCustomer);
      onCreated?.(customer);
      onClose();
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error);
      const description = message === "NAME_REQUIRED"
        ? "Vor- und Nachname fehlen"
        : message === "UNEXPECTED_RPC_RESULT"
          ? "Unerwartete Serverantwort. Bitte versuche es erneut."
          : "Bitte prüfe die Eingaben und versuche es erneut.";
      toast({ title: "Kunde konnte nicht angelegt werden", description, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Neuen Kunden anlegen</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vorname" value={form.first_name} onChange={(value) => setForm((current) => ({ ...current, first_name: value }))} />
          <Field label="Nachname" value={form.last_name} onChange={(value) => setForm((current) => ({ ...current, last_name: value }))} />
          <Field label="E-Mail" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
          <Field label="Telefon" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
          <div className="sm:col-span-2"><Field label="Straße" value={form.street} onChange={(value) => setForm((current) => ({ ...current, street: value }))} /></div>
          <Field label="PLZ" value={form.zip_code} onChange={(value) => setForm((current) => ({ ...current, zip_code: value }))} />
          <Field label="Ort" value={form.city} onChange={(value) => setForm((current) => ({ ...current, city: value }))} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          {hasDraft && <Button variant="ghost" onClick={() => { discardDraft(); onClose(); }}>Entwurf verwerfen</Button>}
          <Button onClick={() => { void runLocked(() => createCustomer.mutateAsync()).catch(() => {}); }} disabled={createCustomer.isPending}>
            {createCustomer.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Kunde anlegen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = `customer-${label.toLowerCase().replace(/\W/g, "-")}`;
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}
