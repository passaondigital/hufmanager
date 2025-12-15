import { useNavigate } from "react-router-dom";
import { Search, User, LogOut, Settings, Sun, Moon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function AppHeader() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { canInstall, isInstalled, promptInstall } = usePWAInstall();

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
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6">
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Suchen..."
            className="pl-12 h-11"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
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
  );
}
