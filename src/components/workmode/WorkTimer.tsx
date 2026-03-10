import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Timer, 
  Play, 
  Pause, 
  Square, 
  Coffee, 
  Loader2,
  Clock,
  Calendar
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, differenceInMinutes } from "date-fns";

interface WorkSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  break_duration_minutes: number;
  status: string;
  notes: string | null;
}

export function WorkTimer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [elapsed, setElapsed] = useState(0);
  const [isOnBreak, setIsOnBreak] = useState(false);

  // Get active session
  const { data: activeSession, isLoading } = useQuery({
    queryKey: ["active-work-session", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_sessions")
        .select("*")
        .eq("provider_id", user!.id)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data as WorkSession | null;
    },
    enabled: !!user?.id,
  });

  // Get recent sessions
  const { data: recentSessions = [] } = useQuery({
    queryKey: ["recent-work-sessions", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("work_sessions")
        .select("*")
        .eq("provider_id", user!.id)
        .eq("status", "completed")
        .order("started_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Update elapsed time
  useEffect(() => {
    if (activeSession && activeSession.status === "active" && !isOnBreak) {
      const updateElapsed = () => {
        const startTime = new Date(activeSession.started_at).getTime();
        const now = Date.now();
        const breaks = (activeSession.break_duration_minutes || 0) * 60 * 1000;
        setElapsed(now - startTime - breaks);
      };
      
      updateElapsed();
      timerRef.current = setInterval(updateElapsed, 1000);
      
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [activeSession, isOnBreak]);

  const startSessionMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("work_sessions").insert({
        provider_id: user!.id,
        started_at: new Date().toISOString(),
        status: "active",
        break_duration_minutes: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-work-session"] });
      toast({ title: "Arbeitstag gestartet! ⏱️" });
    },
    onError: (error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const stopSessionMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession) return;
      
      const { error } = await supabase
        .from("work_sessions")
        .update({
          ended_at: new Date().toISOString(),
          status: "completed",
        })
        .eq("id", activeSession.id);
      if (error) throw error;
      
      return elapsed;
    },
    onSuccess: (totalMs) => {
      queryClient.invalidateQueries({ queryKey: ["active-work-session"] });
      queryClient.invalidateQueries({ queryKey: ["recent-work-sessions"] });
      
      const hours = Math.floor((totalMs || 0) / (1000 * 60 * 60));
      const minutes = Math.floor(((totalMs || 0) % (1000 * 60 * 60)) / (1000 * 60));
      
      toast({ 
        title: "Feierabend! 🎉", 
        description: `Arbeitszeit: ${hours}h ${minutes}m` 
      });
      setElapsed(0);
    },
    onError: (error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const toggleBreakMutation = useMutation({
    mutationFn: async (isBreakStart: boolean) => {
      if (!activeSession) return;
      
      if (isBreakStart) {
        // Starting break - store break start time in localStorage
        localStorage.setItem(`break_start_${activeSession.id}`, Date.now().toString());
        setIsOnBreak(true);
      } else {
        // Ending break - calculate and add to total
        const breakStart = localStorage.getItem(`break_start_${activeSession.id}`);
        if (breakStart) {
          const breakDuration = Math.floor((Date.now() - parseInt(breakStart)) / 60000);
          const newTotal = (activeSession.break_duration_minutes || 0) + breakDuration;
          
          const { error } = await supabase
            .from("work_sessions")
            .update({ break_duration_minutes: newTotal })
            .eq("id", activeSession.id);
          if (error) throw error;
          
          localStorage.removeItem(`break_start_${activeSession.id}`);
        }
        setIsOnBreak(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-work-session"] });
      toast({ title: isOnBreak ? "Pause beendet" : "Pause gestartet ☕" });
    },
  });

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Active Session View
  if (activeSession) {
    return (
      <Card className={isOnBreak ? "border-amber-500" : "border-green-500"}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-primary" />
              Arbeitstag
            </CardTitle>
            <Badge 
              variant="outline" 
              className={isOnBreak 
                ? "bg-amber-500/10 text-amber-500 border-amber-500/30" 
                : "bg-green-500/10 text-green-500 border-green-500/30"
              }
            >
              {isOnBreak ? "Pause" : "Aktiv"}
            </Badge>
          </div>
          <CardDescription>
            Gestartet: {format(new Date(activeSession.started_at), "HH:mm")} Uhr
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timer Display */}
          <div className="text-center py-6">
            <p className={`text-5xl font-mono font-bold ${isOnBreak ? "text-amber-500" : "text-primary"}`}>
              {formatTime(elapsed)}
            </p>
            {activeSession.break_duration_minutes > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                <Coffee className="h-3 w-3 inline mr-1" />
                {activeSession.break_duration_minutes} Min. Pause heute
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => toggleBreakMutation.mutate(!isOnBreak)}
              disabled={toggleBreakMutation.isPending}
            >
              {isOnBreak ? (
                <>
                  <Play className="h-4 w-4" />
                  Weiterarbeiten
                </>
              ) : (
                <>
                  <Coffee className="h-4 w-4" />
                  Pause
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              className="flex-1 gap-2"
              onClick={() => stopSessionMutation.mutate()}
              disabled={stopSessionMutation.isPending}
            >
              {stopSessionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              Feierabend
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default View
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-primary" />
          Zeiterfassung
        </CardTitle>
        <CardDescription>
          Erfasse deine Arbeitszeit mit Pausen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          className="w-full gap-2"
          size="lg"
          onClick={() => startSessionMutation.mutate()}
          disabled={startSessionMutation.isPending}
        >
          {startSessionMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Play className="h-5 w-5" />
          )}
          Arbeitstag starten
        </Button>

        {recentSessions.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium text-muted-foreground mb-3">Letzte Arbeitstage</p>
            <div className="space-y-2">
              {recentSessions.map((session: WorkSession) => {
                const start = new Date(session.started_at);
                const end = session.ended_at ? new Date(session.ended_at) : null;
                const totalMins = end 
                  ? differenceInMinutes(end, start) - (session.break_duration_minutes || 0)
                  : 0;
                const hours = Math.floor(totalMins / 60);
                const mins = totalMins % 60;

                return (
                  <div key={session.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{format(start, "dd.MM.yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="secondary">{hours}h {mins}m</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
