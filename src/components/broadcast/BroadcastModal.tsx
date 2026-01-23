import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Send, Users, Calendar, AlertTriangle, Plane, Bell } from "lucide-react";
import { toast } from "sonner";
import { startOfWeek, endOfWeek, format } from "date-fns";

interface BroadcastModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TargetAudience = "all" | "this_week" | "overdue";

const TEMPLATES = [
  {
    id: "sick",
    icon: AlertTriangle,
    label: "Krankheit",
    title: "Terminverschiebung",
    message: "Leider bin ich erkrankt und muss alle Termine diese Woche verschieben. Ich melde mich, sobald ich wieder einsatzbereit bin. Vielen Dank für euer Verständnis!",
  },
  {
    id: "vacation",
    icon: Plane,
    label: "Urlaub",
    title: "Urlaubsankündigung",
    message: "Ich bin vom [DATUM] bis [DATUM] im Urlaub. Bitte plant eure Termine entsprechend. Bei dringenden Notfällen erreicht ihr mich unter [NOTFALLNUMMER].",
  },
];

export function BroadcastModal({ open, onOpenChange }: BroadcastModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<TargetAudience>("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sendPushNotification, setSendPushNotification] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Fetch recipient counts
  const { data: recipientCounts } = useQuery({
    queryKey: ["broadcast-recipients", user?.id],
    queryFn: async () => {
      if (!user) return { all: 0, thisWeek: 0, overdue: 0 };

      // Get all active clients
      const { data: grants } = await supabase
        .from("access_grants")
        .select("client_id")
        .eq("provider_id", user.id)
        .eq("status", "active")
        .eq("is_active", true);

      const allClients = grants?.length || 0;

      // Get clients with appointments this week
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

      const { data: weekAppointments } = await supabase
        .from("appointments")
        .select("horse_id, horses!inner(owner_id)")
        .eq("provider_id", user.id)
        .gte("date", format(weekStart, "yyyy-MM-dd"))
        .lte("date", format(weekEnd, "yyyy-MM-dd"))
        .neq("status", "cancelled");

      // Count unique owners
      const uniqueOwners = new Set(
        weekAppointments?.map((a: any) => a.horses?.owner_id).filter(Boolean)
      );

      // Get overdue appointments (past due, not completed)
      const { data: overdueAppointments } = await supabase
        .from("appointments")
        .select("horse_id, horses!inner(owner_id)")
        .eq("provider_id", user.id)
        .lt("date", format(new Date(), "yyyy-MM-dd"))
        .is("completed_at", null)
        .neq("status", "cancelled");

      const uniqueOverdue = new Set(
        overdueAppointments?.map((a: any) => a.horses?.owner_id).filter(Boolean)
      );

      return {
        all: allClients,
        thisWeek: uniqueOwners.size,
        overdue: uniqueOverdue.size,
      };
    },
    enabled: !!user && open,
  });

  const sendBroadcast = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (!title.trim() || !message.trim()) throw new Error("Titel und Nachricht erforderlich");

      setIsSending(true);

      // Get target client IDs
      let clientIds: string[] = [];

      if (target === "all") {
        const { data: grants } = await supabase
          .from("access_grants")
          .select("client_id")
          .eq("provider_id", user.id)
          .eq("status", "active")
          .eq("is_active", true);

        clientIds = grants?.map((g) => g.client_id) || [];
      } else if (target === "this_week") {
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

        const { data: appointments } = await supabase
          .from("appointments")
          .select("horse_id, horses!inner(owner_id)")
          .eq("provider_id", user.id)
          .gte("date", format(weekStart, "yyyy-MM-dd"))
          .lte("date", format(weekEnd, "yyyy-MM-dd"))
          .neq("status", "cancelled");

        clientIds = [...new Set(
          appointments?.map((a: any) => a.horses?.owner_id).filter(Boolean)
        )] as string[];
      } else if (target === "overdue") {
        const { data: appointments } = await supabase
          .from("appointments")
          .select("horse_id, horses!inner(owner_id)")
          .eq("provider_id", user.id)
          .lt("date", format(new Date(), "yyyy-MM-dd"))
          .is("completed_at", null)
          .neq("status", "cancelled");

        clientIds = [...new Set(
          appointments?.map((a: any) => a.horses?.owner_id).filter(Boolean)
        )] as string[];
      }

      if (clientIds.length === 0) {
        throw new Error("Keine Empfänger gefunden");
      }

      // Create notifications for each client
      const notifications = clientIds.map((clientId) => ({
        user_id: clientId,
        title: title,
        message: message,
        type: "broadcast",
        link: null,
      }));

      // Insert in batches of 100
      for (let i = 0; i < notifications.length; i += 100) {
        const batch = notifications.slice(i, i + 100);
        const { error } = await supabase.from("notifications").insert(batch);
        if (error) throw error;
      }

      // Send push notifications if enabled
      if (sendPushNotification) {
        console.log("Sending push notifications to", clientIds.length, "clients...");
        
        // Send push notifications in parallel (max 10 concurrent)
        const batchSize = 10;
        for (let i = 0; i < clientIds.length; i += batchSize) {
          const batch = clientIds.slice(i, i + batchSize);
          await Promise.allSettled(
            batch.map((clientId) =>
              supabase.functions.invoke("send-push-notification", {
                body: {
                  user_id: clientId,
                  title: title,
                  body: message,
                  url: "/client-home",
                },
              })
            )
          );
        }
      }

      return clientIds.length;
    },
    onSuccess: (count) => {
      const pushText = sendPushNotification ? " (inkl. Push)" : "";
      toast.success(`Rundmail an ${count} Kunden gesendet${pushText}`);
      queryClient.invalidateQueries({ queryKey: ["broadcast-recipients"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Fehler beim Senden");
    },
    onSettled: () => {
      setIsSending(false);
    },
  });

  const resetForm = () => {
    setTarget("all");
    setTitle("");
    setMessage("");
    setSendPushNotification(true);
  };

  const applyTemplate = (template: typeof TEMPLATES[0]) => {
    setTitle(template.title);
    setMessage(template.message);
  };

  const getRecipientCount = () => {
    switch (target) {
      case "all":
        return recipientCounts?.all || 0;
      case "this_week":
        return recipientCounts?.thisWeek || 0;
      case "overdue":
        return recipientCounts?.overdue || 0;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Rundmail senden
          </DialogTitle>
          <DialogDescription>
            Sende eine Nachricht an mehrere Kunden gleichzeitig
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Templates */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Schnellvorlagen</Label>
            <div className="flex gap-2">
              {TEMPLATES.map((template) => (
                <Button
                  key={template.id}
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate(template)}
                  className="gap-2"
                >
                  <template.icon className="h-4 w-4" />
                  {template.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Target Audience */}
          <div className="space-y-3">
            <Label>Empfänger</Label>
            <RadioGroup
              value={target}
              onValueChange={(v) => setTarget(v as TargetAudience)}
              className="space-y-2"
            >
              <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="flex items-center gap-2 cursor-pointer">
                    <Users className="h-4 w-4 text-primary" />
                    Alle Kunden
                  </Label>
                </div>
                <Badge variant="secondary">{recipientCounts?.all || 0}</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="this_week" id="this_week" />
                  <Label htmlFor="this_week" className="flex items-center gap-2 cursor-pointer">
                    <Calendar className="h-4 w-4 text-accent" />
                    Termine diese Woche
                  </Label>
                </div>
                <Badge variant="secondary">{recipientCounts?.thisWeek || 0}</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="overdue" id="overdue" />
                  <Label htmlFor="overdue" className="flex items-center gap-2 cursor-pointer">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Überfällige Termine
                  </Label>
                </div>
                <Badge variant="secondary">{recipientCounts?.overdue || 0}</Badge>
              </div>
            </RadioGroup>
          </div>

          {/* Message Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Betreff</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Wichtige Mitteilung"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Nachricht</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Deine Nachricht an die Kunden..."
                rows={5}
              />
            </div>

            {/* Push Notification Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-primary" />
                <div>
                  <Label htmlFor="push-toggle" className="cursor-pointer font-medium">
                    Push-Benachrichtigung
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Kunden erhalten eine Benachrichtigung auf dem Handy
                  </p>
                </div>
              </div>
              <Switch
                id="push-toggle"
                checked={sendPushNotification}
                onCheckedChange={setSendPushNotification}
              />
            </div>
          </div>

          {/* Send Button */}
          <Button
            className="w-full"
            onClick={() => sendBroadcast.mutate()}
            disabled={isSending || !title.trim() || !message.trim() || getRecipientCount() === 0}
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Wird gesendet...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                An {getRecipientCount()} Kunden senden
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
