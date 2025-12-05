import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut, FileText, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { UnconfirmedAppointmentsBanner } from "@/components/UnconfirmedAppointmentsBanner";

interface Horse {
  id: string;
  name: string;
  breed: string | null;
  photo_url: string | null;
  color: string | null;
}

interface Profile {
  full_name: string | null;
}

export default function ClientHome() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [horses, setHorses] = useState<Horse[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      
      setProfile(profileData);

      // Fetch horses
      const { data: horsesData, error } = await supabase
        .from("horses")
        .select("id, name, breed, photo_url, color")
        .eq("owner_id", user.id)
        .order("name");

      if (!error && horsesData) {
        setHorses(horsesData);
      }
      
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const firstName = profile?.full_name?.split(" ")[0] || "Kunde";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">HM</span>
            </div>
            <span className="font-semibold text-foreground">HufManager</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Unconfirmed Appointments Banner */}
        <UnconfirmedAppointmentsBanner />

        {/* Greeting */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">
            Hallo {firstName}! 👋
          </h1>
          <p className="text-muted-foreground">
            Hier sind deine Pferde
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="h-16 flex-col gap-1"
            onClick={() => navigate("/client-invoices")}
          >
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-sm">Rechnungen</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-16 flex-col gap-1 opacity-50"
            disabled
          >
            <span className="text-lg">📅</span>
            <span className="text-sm">Termine</span>
          </Button>
        </div>

        {/* Horses List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Meine Pferde ({horses.length})
          </h2>
          
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : horses.length === 0 ? (
            <Card className="overflow-hidden">
              <CardContent className="p-8 text-center">
                <div className="text-4xl mb-3">🐴</div>
                <p className="text-muted-foreground">
                  Noch keine Pferde vorhanden
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ihr Hufbearbeiter wird Ihre Pferde hier hinzufügen
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {horses.map((horse) => (
                <Card 
                  key={horse.id} 
                  className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
                  onClick={() => navigate(`/client-horse/${horse.id}`)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                      {horse.photo_url ? (
                        <img 
                          src={horse.photo_url} 
                          alt={horse.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl">🐴</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">
                        {horse.name}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {[horse.breed, horse.color].filter(Boolean).join(" • ") || "Keine Details"}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
