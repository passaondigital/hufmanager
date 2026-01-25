import { useState } from "react";
import { motion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { 
  GripVertical, 
  Navigation, 
  MessageCircle, 
  Clock, 
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Send,
  Car,
  Check,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface TourAppointment {
  id: string;
  date: string;
  time: string | null;
  status: string | null;
  service_type: string | null;
  is_emergency?: boolean;
  horses: { 
    id: string;
    name: string;
    owner_id?: string;
  }[] | null;
  client: {
    id: string;
    readable_id?: string;
    full_name: string;
    geo_lat: number | null;
    geo_lng: number | null;
    street?: string | null;
    zip?: string | null;
    city?: string | null;
  } | null;
  horse_count?: number;
}

interface TourCardProps {
  appointment: TourAppointment;
  index: number;
  userId: string;
  onOpenChat?: (clientId: string) => void;
  onStatusChange?: () => void;
  estimatedArrival?: string;
}

const statusConfig = {
  scheduled: { 
    icon: Clock, 
    label: "Geplant", 
    color: "text-amber-500",
    bg: "bg-amber-500/10"
  },
  confirmed: { 
    icon: CheckCircle2, 
    label: "Bestätigt", 
    color: "text-blue-500",
    bg: "bg-blue-500/10"
  },
  in_progress: { 
    icon: Car, 
    label: "Unterwegs", 
    color: "text-primary",
    bg: "bg-primary/10"
  },
  completed: { 
    icon: CheckCircle2, 
    label: "Fertig", 
    color: "text-green-500",
    bg: "bg-green-500/10"
  },
  cancelled: { 
    icon: AlertTriangle, 
    label: "Abgesagt", 
    color: "text-destructive",
    bg: "bg-destructive/10"
  },
};

export function TourCard({ 
  appointment, 
  index, 
  userId,
  onOpenChat,
  onStatusChange,
  estimatedArrival
}: TourCardProps) {
  const [isSendingEta, setIsSendingEta] = useState(false);
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: appointment.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const status = statusConfig[appointment.status as keyof typeof statusConfig] || statusConfig.scheduled;
  const StatusIcon = status.icon;
  const isCompleted = appointment.status === "completed";
  
  const horseCount = appointment.horse_count || appointment.horses?.length || 0;
  const clientName = appointment.client?.full_name || "Unbekannt";
  const clientId = appointment.client?.readable_id || "";
  
  const hasCoordinates = appointment.client?.geo_lat && appointment.client?.geo_lng;
  const address = [
    appointment.client?.street,
    [appointment.client?.zip, appointment.client?.city].filter(Boolean).join(" ")
  ].filter(Boolean).join(", ");

  // Open navigation to coordinates
  const handleNavigate = () => {
    if (!hasCoordinates) {
      toast.error("Keine Koordinaten verfügbar");
      return;
    }
    
    const lat = appointment.client!.geo_lat;
    const lng = appointment.client!.geo_lng;
    
    // Detect platform and open appropriate maps app
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const url = isIOS 
      ? `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    
    window.open(url, "_blank");
  };

  // Send ETA message
  const handleSendEta = async () => {
    if (!appointment.client?.id) {
      toast.error("Kein Kunde verknüpft");
      return;
    }
    
    setIsSendingEta(true);
    
    try {
      const eta = estimatedArrival || "wenigen Minuten";
      const message = `🚗 Bin in ca. ${eta} bei dir!`;
      
      // Find or create conversation
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("provider_id", userId)
        .eq("client_id", appointment.client.id)
        .maybeSingle();
      
      let conversationId = existingConv?.id;
      
      if (!conversationId) {
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({
            provider_id: userId,
            client_id: appointment.client.id,
          })
          .select("id")
          .single();
        
        if (convError) throw convError;
        conversationId = newConv.id;
      }
      
      // Send message
      const { error: msgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          content: message,
        });
      
      if (msgError) throw msgError;
      
      toast.success("ETA gesendet!");
    } catch (error) {
      console.error("Error sending ETA:", error);
      toast.error("Nachricht konnte nicht gesendet werden");
    } finally {
      setIsSendingEta(false);
    }
  };

  // Mark appointment as completed
  const handleMarkComplete = async () => {
    setIsMarkingComplete(true);
    
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "completed" })
        .eq("id", appointment.id);
      
      if (error) throw error;
      
      toast.success("Termin abgeschlossen!");
      onStatusChange?.();
    } catch (error) {
      console.error("Error marking complete:", error);
      toast.error("Status konnte nicht geändert werden");
    } finally {
      setIsMarkingComplete(false);
    }
  };

  // Open chat with client
  const handleOpenChat = () => {
    if (appointment.client?.id && onOpenChat) {
      onOpenChat(appointment.client.id);
    }
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className={cn(
        "relative rounded-xl border backdrop-blur-xl transition-all duration-300",
        "bg-background/70 dark:bg-background/50",
        "shadow-lg shadow-black/5 dark:shadow-black/20",
        isDragging && "opacity-90 shadow-2xl scale-[1.02]",
        isCompleted && "opacity-60",
        appointment.is_emergency && "border-destructive/50 bg-destructive/5"
      )}
    >
      {/* Glass overlay effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      
      <div className="relative p-3 space-y-2">
        {/* Header Row: Drag Handle + Time + Status */}
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              "hover:bg-muted/50 cursor-grab active:cursor-grabbing",
              "touch-none"
            )}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          
          <div className="flex items-center gap-2 flex-1">
            <Badge variant="secondary" className="font-mono text-xs tabular-nums">
              {appointment.time || "--:--"}
            </Badge>
            
            {appointment.is_emergency && (
              <Badge variant="destructive" className="text-xs gap-1 bg-destructive text-destructive-foreground">
                <AlertTriangle className="h-3 w-3" />
                <span className="font-semibold">Notfall</span>
              </Badge>
            )}
          </div>
          
          <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-xs", status.bg)}>
            <StatusIcon className={cn("h-3 w-3", status.color)} />
            <span className={status.color}>{status.label}</span>
          </div>
        </div>

        {/* Client & Horses Info */}
        <div className="pl-8">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-sm">{clientName}</span>
            {clientId && (
              <span className="text-xs text-muted-foreground font-mono">#{clientId}</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <span>🐴 {horseCount} Pferd{horseCount !== 1 ? "e" : ""}</span>
            {appointment.service_type && (
              <>
                <span>•</span>
                <span>{appointment.service_type}</span>
              </>
            )}
          </div>
        </div>

        {/* Location */}
        <div className="pl-8 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">
            {hasCoordinates ? (address || "GPS-Standort") : "Keine Adresse"}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pl-8 pt-1">
          {isCompleted ? (
            <Button
              variant="secondary"
              size="sm"
              className="h-8 gap-1.5 flex-1 bg-green-600/10 text-green-600 hover:bg-green-600/20"
              disabled
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Abgeschlossen
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="h-8 gap-1.5 flex-1"
              onClick={handleMarkComplete}
              disabled={isMarkingComplete}
            >
              {isMarkingComplete ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Fertig
            </Button>
          )}
          
          <Button
            variant="secondary"
            size="sm"
            className="h-8 gap-1.5"
            onClick={handleNavigate}
            disabled={!hasCoordinates}
          >
            <Navigation className="h-3.5 w-3.5" />
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleOpenChat}
            disabled={!appointment.client?.id}
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={handleSendEta}
            disabled={isSendingEta || !appointment.client?.id || isCompleted}
          >
            <Send className="h-3.5 w-3.5" />
            ETA
          </Button>
        </div>
      </div>

      {/* Order Number Badge (Floating) */}
      <div className={cn(
        "absolute -left-2 -top-2 w-6 h-6 rounded-full flex items-center justify-center",
        "text-xs font-bold text-primary-foreground shadow-lg",
        isCompleted ? "bg-green-600" : "bg-primary"
      )}>
        {isCompleted ? <Check className="h-3 w-3" /> : index + 1}
      </div>
    </motion.div>
  );
}
