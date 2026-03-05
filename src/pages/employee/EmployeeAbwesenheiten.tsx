import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmployeeProfile } from "@/hooks/useEmployees";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarOff, Plus, X } from "lucide-react";
import { HelpTip } from "@/components/ui/HelpTip";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const typeLabels: Record<string, string> = {
  vacation: "Urlaub",
  sick: "Krankheit",
  personal: "Persönlich",
  training: "Weiterbildung",
  other: "Sonstiges",
};

const statusLabels: Record<string, string> = {
  pending: "Ausstehend",
  approved: "Genehmigt",
  rejected: "Abgelehnt",
  cancelled: "Storniert",
};

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
  cancelled: "outline",
};

const EmployeeAbwesenheiten = () => {
  const { data: profile } = useEmployeeProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [type, setType] = useState("vacation");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  const { data: requests = [] } = useQuery({
    queryKey: ["employee-absences", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("employee_absence_requests")
        .select("*")
        .eq("employee_id", profile.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const createRequest = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("No profile");
      const { error } = await supabase.from("employee_absence_requests").insert({
        employee_id: profile.id,
        provider_id: profile.provider_id,
        type,
        start_date: startDate,
        end_date: endDate,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-absences"] });
      toast({ title: "Antrag eingereicht", description: "Dein Provider wird benachrichtigt." });
      setShowNew(false);
      setType("vacation");
      setStartDate("");
      setEndDate("");
      setNotes("");
    },
    onError: (err: Error) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });

  const cancelRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("employee_absence_requests")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-absences"] });
      toast({ title: "Antrag storniert" });
    },
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CalendarOff className="h-5 w-5 text-primary" />
            Abwesenheiten
            <HelpTip id="mitarbeiter.abwesenheiten" />
          </h1>
          <p className="text-sm text-muted-foreground">Urlaub, Krankheit und freie Tage</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4" />
          Antrag
        </Button>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CalendarOff className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Keine Anträge</p>
            <p className="text-sm">Du hast noch keine Abwesenheitsanträge gestellt.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <Badge variant="secondary" className="text-xs mb-1">
                      {typeLabels[req.type] || req.type}
                    </Badge>
                    <p className="text-sm font-medium">
                      {format(new Date(req.start_date), "dd.MM.yyyy", { locale: de })} –{" "}
                      {format(new Date(req.end_date), "dd.MM.yyyy", { locale: de })}
                    </p>
                  </div>
                  <Badge variant={statusColors[req.status]}>{statusLabels[req.status]}</Badge>
                </div>
                {req.notes && <p className="text-xs text-muted-foreground mt-1">{req.notes}</p>}
                {req.review_notes && (
                  <p className="text-xs text-muted-foreground mt-1 italic">Antwort: {req.review_notes}</p>
                )}
                {req.status === "pending" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-destructive"
                    onClick={() => cancelRequest.mutate(req.id)}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Stornieren
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Request Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abwesenheit beantragen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Art</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Von</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Bis</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Anmerkung (optional)</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Abbrechen</Button>
            <Button
              onClick={() => createRequest.mutate()}
              disabled={!startDate || !endDate || createRequest.isPending}
            >
              Einreichen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeAbwesenheiten;
