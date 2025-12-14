import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, User, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Contact {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string;
  type: "client" | "provider" | "contact";
}

interface NewChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectContact: (contact: Contact) => void;
  currentUserId: string;
}

export function NewChatModal({
  open,
  onOpenChange,
  onSelectContact,
  currentUserId,
}: NewChatModalProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      loadContacts();
    }
  }, [open]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const allContacts: Contact[] = [];

      // 1. Load from access_grants (clients connected to this provider)
      const { data: grants } = await supabase
        .from("access_grants")
        .select("client_id")
        .eq("provider_id", currentUserId)
        .eq("is_active", true);

      if (grants && grants.length > 0) {
        const clientIds = grants.map((g) => g.client_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .in("id", clientIds)
          .is("deleted_at", null);

        if (profiles) {
          profiles.forEach((p) => {
            if (p.id !== currentUserId && p.full_name) {
              allContacts.push({
                id: p.id,
                name: p.full_name,
                email: p.email || undefined,
                avatar_url: p.avatar_url || undefined,
                type: "client",
              });
            }
          });
        }
      }

      // 2. Load profiles created by this provider
      const { data: createdProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .eq("created_by_provider_id", currentUserId)
        .is("deleted_at", null);

      if (createdProfiles) {
        createdProfiles.forEach((p) => {
          if (!allContacts.find((c) => c.id === p.id) && p.full_name) {
            allContacts.push({
              id: p.id,
              name: p.full_name,
              email: p.email || undefined,
              avatar_url: p.avatar_url || undefined,
              type: "client",
            });
          }
        });
      }

      // 3. Load from contacts table (legacy/manual contacts)
      const { data: legacyContacts } = await supabase
        .from("contacts")
        .select("id, full_name, email, profile_id")
        .eq("provider_id", currentUserId)
        .is("deleted_at", null);

      if (legacyContacts) {
        legacyContacts.forEach((c) => {
          const existingId = c.profile_id || c.id;
          if (!allContacts.find((existing) => existing.id === existingId)) {
            allContacts.push({
              id: existingId,
              name: c.full_name,
              email: c.email || undefined,
              type: "contact",
            });
          }
        });
      }

      setContacts(allContacts);
    } catch (error) {
      console.error("Error loading contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (contact: Contact) => {
    onSelectContact(contact);
    onOpenChange(false);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Neuen Chat starten</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Kontakt suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <ScrollArea className="h-[300px] mt-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search
                ? "Keine Kontakte gefunden"
                : "Keine Kontakte verfügbar"}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => handleSelect(contact)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={contact.avatar_url} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{contact.name}</p>
                    {contact.email && (
                      <p className="text-sm text-muted-foreground truncate">
                        {contact.email}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
