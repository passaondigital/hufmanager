import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Search, User, LogOut, Settings, Sun, Moon } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "@/hooks/use-toast";

const mockNotifications = [
  { id: 1, title: "Neuer Termin", message: "Anna Schmidt hat einen Termin angefragt", time: "vor 5 Min." },
  { id: 2, title: "Zahlung erhalten", message: "€65 von Thomas Müller", time: "vor 1 Std." },
  { id: 3, title: "Erinnerung", message: "Termin morgen: Maria Weber", time: "vor 2 Std." },
];

export function AppHeader() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

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

        <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-11 w-11">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-primary rounded-full text-xs text-primary-foreground font-bold flex items-center justify-center">
                {mockNotifications.length}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 bg-card border-border">
            <div className="p-4 border-b border-border">
              <h4 className="font-semibold text-foreground">Benachrichtigungen</h4>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {mockNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer"
                >
                  <p className="font-medium text-foreground text-sm">{notification.title}</p>
                  <p className="text-muted-foreground text-sm">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                </div>
              ))}
            </div>
            <div className="p-2 border-t border-border">
              <Button variant="ghost" className="w-full text-sm h-10" onClick={() => setNotificationsOpen(false)}>
                Alle ansehen
              </Button>
            </div>
          </PopoverContent>
        </Popover>

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
