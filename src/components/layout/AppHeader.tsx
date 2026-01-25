import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, LogOut, Settings, Sun, Moon, Download, Copy, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "@/hooks/use-toast";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { FeierabendWaechter } from "@/components/tracking/FeierabendWaechter";
import { ConnectionStatus } from "@/components/offline/ConnectionStatus";
import { supabase } from "@/integrations/supabase/client";
import { GlobalSearch } from "@/components/search/GlobalSearch";

export function AppHeader() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { canInstall, isInstalled, promptInstall } = usePWAInstall();
  const [readableId, setReadableId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const fetchReadableId = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("profiles")
        .select("readable_id")
        .eq("id", user.id)
        .single();
      if (data?.readable_id) {
        setReadableId(data.readable_id);
      }
    };
    fetchReadableId();
  }, [user?.id]);

  // Keyboard shortcut handler
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const copyToClipboard = () => {
    if (readableId) {
      navigator.clipboard.writeText(`#${readableId}`);
      setCopied(true);
      toast({ title: "ID kopiert!", description: `#${readableId}` });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Abgemeldet",
        description: "Sie wurden erfolgreich abgemeldet.",
      });
      navigate("/auth");
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Beim Abmelden ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    }
  };

  const userInitials = user?.email?.substring(0, 2).toUpperCase() || "MH";

  return (
    <>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6">
        <div className="flex items-center gap-4 flex-1 max-w-md">
          <button
            onClick={() => setSearchOpen(true)}
            className="relative flex-1 flex items-center gap-2 h-11 px-4 rounded-md border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Search className="h-4 w-4" />
            <span className="text-sm">Suchen...</span>
            <kbd className="pointer-events-none ml-auto hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
        </div>

      <div className="flex items-center gap-2">
        {/* Connection Status Indicator */}
        <ConnectionStatus />
        {/* PWA Install Button (Desktop) */}
        {canInstall && !isInstalled && (
          <Button
            variant="outline"
            size="sm"
            onClick={promptInstall}
            className="hidden lg:flex items-center gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            <Download className="h-4 w-4" />
            <span>Installieren</span>
          </Button>
        )}

        {/* Feierabend-Wächter Toggle */}
        <FeierabendWaechter />

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-11 w-11"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5 text-primary" />
          ) : (
            <Moon className="h-5 w-5 text-muted-foreground" />
          )}
        </Button>

        <NotificationBell />

        {/* User ID Badge */}
        {readableId && (
          <button
            onClick={copyToClipboard}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted hover:bg-muted/80 transition-colors group"
            title="ID kopieren"
          >
            <span className="font-mono text-xs text-muted-foreground group-hover:text-foreground">
              #{readableId}
            </span>
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
            )}
          </button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 pl-2 pr-3 h-11">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground hidden sm:inline">
                {user?.email || "Max Hufeisen"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-card border-border">
            <DropdownMenuLabel className="text-foreground">Mein Konto</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem onClick={() => navigate("/management")} className="h-11 cursor-pointer">
              <User className="mr-2 h-5 w-5" />
              Profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/management")} className="h-11 cursor-pointer">
              <Settings className="mr-2 h-5 w-5" />
              Einstellungen
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem className="text-destructive h-11 cursor-pointer" onClick={handleLogout}>
              <LogOut className="mr-2 h-5 w-5" />
              Abmelden
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      </header>
    </>
  );
}
