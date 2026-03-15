import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Clock, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BookingWaitlistProps {
  providerId: string;
  horseId: string;
  horseName: string;
  onSuccess?: () => void;
}

export function BookingWaitlist({ providerId, horseId, horseName, onSuccess }: BookingWaitlistProps) {
  const { user } = useAuth();
  const [preference, setPreference] = useState<"next_available" | "specific_week">("next_available");
  const [preferredWeek, setPreferredWeek] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("booking_waitlist").insert({
        provider_id: providerId,
        client_id: user!.id,
        horse_id: horseId,
        preference,
        preferred_week: preference === "specific_week" ? preferredWeek : null,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Du bist auf der Warteliste!");
      onSuccess?.();
    },
    onError: () => toast.error("Fehler beim Eintragen"),
  });

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="text-center">
          <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Kein Termin verfügbar?</p>
          <p className="text-xs text-muted-foreground">Trage dich auf die Warteliste ein – wir benachrichtigen dich sobald ein Slot frei wird.</p>
        </div>

        <div>
          <Label className="text-xs mb-2 block">Präferenz</Label>
          <div className="flex gap-2">
            {[
              { value: "next_available" as const, label: "Nächstmöglich", icon: Clock },
              { value: "specific_week" as const, label: "Bestimmte Woche", icon: CalendarDays },
            ].map(({ value, label, icon: Icon }) => (
              <Badge
                key={value}
                variant={preference === value ? "default" : "outline"}
                className={cn("cursor-pointer flex items-center gap-1 px-3 py-1.5", preference === value && "bg-primary text-primary-foreground")}
                onClick={() => setPreference(value)}
              >
                <Icon className="h-3 w-3" />{label}
              </Badge>
            ))}
          </div>
        </div>

        {preference === "specific_week" && (
          <div>
            <Label className="text-xs">Gewünschte Woche (Start-Datum)</Label>
            <Input type="date" value={preferredWeek} onChange={(e) => setPreferredWeek(e.target.value)} />
          </div>
        )}

        <div>
          <Label className="text-xs">Anmerkungen (optional)</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="z.B. Nur vormittags möglich..." />
        </div>

        <Button className="w-full" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? "Wird eingetragen..." : `${horseName} auf Warteliste setzen`}
        </Button>
      </CardContent>
    </Card>
  );
}
