import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, AlertTriangle, XCircle, Pencil, Save, Trash2 } from "lucide-react";
import type { ParsedContact } from "./types";
import { validateContact } from "./parsers";

interface ImportDataValidatorProps {
  contacts: ParsedContact[];
  onUpdate: (contacts: ParsedContact[]) => void;
}

const ImportDataValidator = ({ contacts, onUpdate }: ImportDataValidatorProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ParsedContact>>({});
  const [filter, setFilter] = useState<"all" | "valid" | "error" | "warning">("all");

  const counts = {
    all: contacts.length,
    valid: contacts.filter(c => c.status === "valid").length,
    warning: contacts.filter(c => c.status === "warning").length,
    error: contacts.filter(c => c.status === "error").length,
  };

  const filtered = filter === "all" ? contacts : contacts.filter(c => c.status === filter);

  const startEdit = (c: ParsedContact) => {
    setEditingId(c.id);
    setEditData({ full_name: c.full_name, email: c.email, phone: c.phone, company_name: c.company_name, street: c.street });
  };

  const saveEdit = (id: string) => {
    const updated = contacts.map(c => {
      if (c.id !== id) return c;
      return validateContact({ ...c, ...editData });
    });
    onUpdate(updated);
    setEditingId(null);
  };

  const removeContact = (id: string) => {
    onUpdate(contacts.filter(c => c.id !== id));
  };

  const statusIcon = (status: string) => {
    if (status === "valid") return <Check className="h-4 w-4 text-emerald-500" />;
    if (status === "warning") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    return <XCircle className="h-4 w-4 text-destructive" />;
  };

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {(["all", "valid", "warning", "error"] as const).map(f => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className="gap-1.5 text-xs"
          >
            {f === "all" && "Alle"}
            {f === "valid" && <><Check className="h-3 w-3" /> OK</>}
            {f === "warning" && <><AlertTriangle className="h-3 w-3" /> Warnung</>}
            {f === "error" && <><XCircle className="h-3 w-3" /> Fehler</>}
            <Badge variant="secondary" className="ml-1 text-xs">{counts[f]}</Badge>
          </Button>
        ))}
      </div>

      {/* Contact list */}
      <ScrollArea className="max-h-[50vh] rounded-lg border">
        <div className="divide-y">
          {filtered.map(contact => (
            <div key={contact.id} className="p-3 space-y-2">
              {editingId === contact.id ? (
                /* Edit mode */
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Name *"
                      value={editData.full_name || ""}
                      onChange={e => setEditData(d => ({ ...d, full_name: e.target.value }))}
                      className="text-sm"
                    />
                    <Input
                      placeholder="E-Mail"
                      value={editData.email || ""}
                      onChange={e => setEditData(d => ({ ...d, email: e.target.value }))}
                      className="text-sm"
                    />
                    <Input
                      placeholder="Telefon"
                      value={editData.phone || ""}
                      onChange={e => setEditData(d => ({ ...d, phone: e.target.value }))}
                      className="text-sm"
                    />
                    <Input
                      placeholder="Firma"
                      value={editData.company_name || ""}
                      onChange={e => setEditData(d => ({ ...d, company_name: e.target.value }))}
                      className="text-sm"
                    />
                  </div>
                  <Input
                    placeholder="Straße/Adresse"
                    value={editData.street || ""}
                    onChange={e => setEditData(d => ({ ...d, street: e.target.value }))}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(contact.id)} className="gap-1">
                      <Save className="h-3 w-3" /> Speichern
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Abbrechen</Button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{statusIcon(contact.status)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{contact.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[contact.email, contact.phone, contact.company_name].filter(Boolean).join(" · ") || "Keine Kontaktdaten"}
                    </p>
                    {contact.errors.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {contact.errors.map((err, i) => (
                          <Badge key={i} variant="destructive" className="text-[10px] px-1.5 py-0">{err}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(contact)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeContact(contact.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-6 text-center text-muted-foreground text-sm">
              Keine Kontakte in dieser Kategorie
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ImportDataValidator;
