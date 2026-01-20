import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Users,
  FileText,
  Settings,
  MessageSquare,
  Search,
  Plus,
  Home,
  Clipboard,
  Receipt,
  Network,
  TrendingUp,
  HelpCircle,
  UserPlus,
  CalendarPlus,
  FileUp,
  Send,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SearchResult {
  id: string;
  type: "customer" | "horse";
  name: string;
  subtitle?: string;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Reset search when closing
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [open]);

  // Search handler with debounce
  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);

      if (!query || query.length < 2 || !user) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);

      try {
        // Search customers (contacts)
        const { data: contacts } = await supabase
          .from("contacts")
          .select("id, full_name, email, phone")
          .eq("provider_id", user.id)
          .is("deleted_at", null)
          .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
          .limit(5);

        // Search horses
        const { data: horses } = await supabase
          .from("horses")
          .select("id, name, breed, owner_id")
          .is("deleted_at", null)
          .ilike("name", `%${query}%`)
          .limit(5);

        const results: SearchResult[] = [];

        if (contacts) {
          results.push(
            ...contacts.map((c) => ({
              id: c.id,
              type: "customer" as const,
              name: c.full_name,
              subtitle: c.email || c.phone || undefined,
            }))
          );
        }

        if (horses) {
          results.push(
            ...horses.map((h) => ({
              id: h.id,
              type: "horse" as const,
              name: h.name,
              subtitle: h.breed || "Pferd",
            }))
          );
        }

        setSearchResults(results);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    },
    [user]
  );

  const runAction = (action: () => void) => {
    onOpenChange(false);
    action();
  };

  // Quick actions / Schnellbausteine
  const quickActions = [
    {
      icon: CalendarPlus,
      label: "Neuer Termin",
      shortcut: "T",
      action: () => navigate("/kalender"),
    },
    {
      icon: UserPlus,
      label: "Neuer Kunde",
      shortcut: "K",
      action: () => navigate("/kunden"),
    },
    {
      icon: FileUp,
      label: "Hufanalyse starten",
      shortcut: "H",
      action: () => navigate("/hufanalyse"),
    },
    {
      icon: Send,
      label: "Rechnung erstellen",
      shortcut: "R",
      action: () => navigate("/rechnungen"),
    },
  ];

  // Navigation items
  const navigationItems = [
    { icon: Home, label: "Dashboard", path: "/" },
    { icon: Calendar, label: "Kalender", path: "/kalender" },
    { icon: Users, label: "Kunden", path: "/kunden" },
    { icon: Network, label: "Netzwerk", path: "/netzwerk" },
    { icon: Clipboard, label: "Hufanalyse", path: "/hufanalyse" },
    { icon: TrendingUp, label: "Analyse", path: "/analyse" },
    { icon: Receipt, label: "Rechnungen", path: "/rechnungen" },
    { icon: MessageSquare, label: "Chat", path: "/chat" },
    { icon: FileText, label: "Anfragen", path: "/anfragen" },
    // Academy removed from navigation - Coming Soon
    { icon: Settings, label: "Einstellungen", path: "/management" },
    { icon: HelpCircle, label: "Support", path: "/support" },
  ];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Suchen oder Aktion starten..."
        value={searchQuery}
        onValueChange={handleSearch}
      />
      <CommandList>
        <CommandEmpty>
          {isSearching ? "Suche läuft..." : "Keine Ergebnisse gefunden."}
        </CommandEmpty>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <CommandGroup heading="Suchergebnisse">
            {searchResults.map((result) => (
              <CommandItem
                key={`${result.type}-${result.id}`}
                onSelect={() =>
                  runAction(() =>
                    navigate(
                      result.type === "customer"
                        ? `/kunden`
                        : `/horse/${result.id}?tab=historie`
                    )
                  )
                }
              >
                {result.type === "customer" ? (
                  <Users className="mr-2 h-4 w-4" />
                ) : (
                  <span className="mr-2 text-lg">🐴</span>
                )}
                <div className="flex flex-col">
                  <span>{result.name}</span>
                  {result.subtitle && (
                    <span className="text-xs text-muted-foreground">
                      {result.subtitle}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Quick Actions / Schnellbausteine */}
        {!searchQuery && (
          <>
            <CommandGroup heading="Schnellbausteine">
              {quickActions.map((action) => (
                <CommandItem
                  key={action.label}
                  onSelect={() => runAction(action.action)}
                >
                  <action.icon className="mr-2 h-4 w-4" />
                  <span>{action.label}</span>
                  <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    {action.shortcut}
                  </kbd>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            {/* Navigation */}
            <CommandGroup heading="Navigation">
              {navigationItems.map((item) => (
                <CommandItem
                  key={item.path}
                  onSelect={() => runAction(() => navigate(item.path))}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

// Trigger component for the header
export function GlobalSearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative flex-1 flex items-center gap-2 h-11 px-4 rounded-md border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      <Search className="h-4 w-4" />
      <span className="text-sm">Suchen...</span>
      <kbd className="pointer-events-none ml-auto hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}
