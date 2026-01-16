import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Send, Loader2, Users, Building2, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type TargetAudience = "all" | "clients" | "providers";

interface AdminBroadcastCardProps {
  onSent?: () => void;
}

export default function AdminBroadcastCard({ onSent }: AdminBroadcastCardProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<TargetAudience>("all");
  const [notificationType, setNotificationType] = useState("system");
  const [link, setLink] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  const fetchRecipientCount = async (audience: TargetAudience) => {
    try {
      let query = supabase.from("user_roles").select("user_id", { count: "exact" });
      
      if (audience === "clients") {
        query = query.eq("role", "client");
      } else if (audience === "providers") {
        query = query.eq("role", "provider");
      }
      // For "all", we get both
      
      const { count } = await query;
      setPreviewCount(count || 0);
    } catch (error) {
      console.error("Error fetching recipient count:", error);
    }
  };

  const handleTargetChange = (value: TargetAudience) => {
    setTarget(value);
    fetchRecipientCount(value);
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Titel und Nachricht sind erforderlich");
      return;
    }

    setIsSending(true);

    try {
      // Get user IDs based on target audience
      let query = supabase.from("user_roles").select("user_id");
      
      if (target === "clients") {
        query = query.eq("role", "client");
      } else if (target === "providers") {
        query = query.eq("role", "provider");
      }
      
      const { data: userRoles, error: rolesError } = await query;
      
      if (rolesError) throw rolesError;
      
      if (!userRoles || userRoles.length === 0) {
        toast.warning("Keine Empfänger gefunden");
        setIsSending(false);
        return;
      }

      // Create notifications for all recipients
      const notifications = userRoles.map(ur => ({
        user_id: ur.user_id,
        title: title.trim(),
        message: message.trim(),
        type: notificationType,
        link: link.trim() || null,
        is_read: false
      }));

      // Insert in batches of 100 to avoid timeout
      const batchSize = 100;
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from("notifications")
          .insert(batch);
        
        if (insertError) throw insertError;
      }

      toast.success(`Benachrichtigung an ${notifications.length} Nutzer gesendet!`);
      
      // Reset form
      setTitle("");
      setMessage("");
      setLink("");
      setPreviewCount(null);
      
      onSent?.();
    } catch (error) {
      console.error("Error sending broadcast:", error);
      toast.error("Fehler beim Senden der Benachrichtigung");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          Broadcast-Nachricht
        </CardTitle>
        <CardDescription>
          Sende eine Benachrichtigung an alle oder ausgewählte Nutzergruppen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Target Audience */}
        <div className="space-y-3">
          <Label>Zielgruppe</Label>
          <RadioGroup
            value={target}
            onValueChange={(v) => handleTargetChange(v as TargetAudience)}
            className="flex flex-wrap gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="target-all" />
              <Label htmlFor="target-all" className="flex items-center gap-1.5 cursor-pointer">
                <Users className="h-4 w-4" />
                Alle
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="clients" id="target-clients" />
              <Label htmlFor="target-clients" className="flex items-center gap-1.5 cursor-pointer">
                <UserCheck className="h-4 w-4" />
                Nur Clients
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="providers" id="target-providers" />
              <Label htmlFor="target-providers" className="flex items-center gap-1.5 cursor-pointer">
                <Building2 className="h-4 w-4" />
                Nur Provider
              </Label>
            </div>
          </RadioGroup>
          {previewCount !== null && (
            <p className="text-sm text-muted-foreground">
              {previewCount} Empfänger werden benachrichtigt
            </p>
          )}
        </div>

        {/* Notification Type */}
        <div className="space-y-2">
          <Label>Typ</Label>
          <Select value={notificationType} onValueChange={setNotificationType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">🔔 System</SelectItem>
              <SelectItem value="info">ℹ️ Info</SelectItem>
              <SelectItem value="warning">⚠️ Warnung</SelectItem>
              <SelectItem value="success">✅ Erfolg</SelectItem>
              <SelectItem value="update">🚀 Update</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="broadcast-title">Titel *</Label>
          <Input
            id="broadcast-title"
            placeholder="z.B. Wichtiges Update"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <Label htmlFor="broadcast-message">Nachricht *</Label>
          <Textarea
            id="broadcast-message"
            placeholder="Die Nachricht, die alle Nutzer sehen werden..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
        </div>

        {/* Link (optional) */}
        <div className="space-y-2">
          <Label htmlFor="broadcast-link">Link (optional)</Label>
          <Input
            id="broadcast-link"
            placeholder="/dashboard oder https://..."
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Nutzer können auf die Benachrichtigung klicken, um zum Link zu gelangen
          </p>
        </div>

        {/* Send Button */}
        <Button 
          onClick={handleSend} 
          disabled={isSending || !title.trim() || !message.trim()}
          className="w-full gap-2"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Nachricht senden
        </Button>
      </CardContent>
    </Card>
  );
}
