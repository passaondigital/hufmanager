import { useState, useCallback } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { OnMyWayButton } from "./OnMyWayButton";
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
import { addToSyncQueue } from "@/lib/offline/syncQueue";

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
  scheduled: { icon: Clock, label: "Geplant", color: "text-amber-500", bg: "bg-amber-500/10" },
  confirmed: { icon: CheckCircle2, label: "Bestätigt", color: "text-blue-500", bg: "bg-blue-500/10" },
  in_progress: { icon: Car, label: "Unterwegs", color: "text-primary", bg: "bg-primary/10" },
  completed: { icon: CheckCircle2, label: "Fertig", color: "text-green-500", bg: "bg-green-500/10" },
  cancelled: { icon: AlertTriangle, label: "Abgesagt", color: "text-destructive", bg: "bg-destructive/10" },
};

// Swipe threshold in pixels
const SWIPE_THRESHOLD = 80;

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
  const [swipeAction, setSwipeAction] = useState<"none" | "complete" | "navigate">("none");
  
  const x = useMotionValue(0);
  const rightBgOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const leftBgOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  
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

  const handleNavigate = useCallback(() => {
    if (!hasCoordinates) {
      toast.error("Keine Koordinaten verfügbar");
      return;
    }
    
    // In-app navigation – no external maps
    toast.info("Route wird auf der Karte angezeigt");
  }, [hasCoordinates]);

  const handleSendEta = async () => {
    if (!appointment.client?.id) {
      toast.error("Kein Kunde verknüpft");
      return;
    }
    
    setIsSendingEta(true);
    
    try {
      const eta = estimatedArrival || "wenigen Minuten";
      const message = `🚗 Bin in ca. ${eta} bei dir!`;
      
      // Check if online, otherwise queue
      if (!navigator.onLine) {
        await addToSyncQueue({
          type: "create",
          table: "messages",
          data: {
            sender_id: userId,
            content: message,
            _meta_client_id: appointment.client.id,
            _meta_provider_id: userId,
          },
        });
        toast.success("ETA wird gesendet, sobald du online bist");
        setIsSendingEta(false);
        return;
      }
      
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

  const handleMarkComplete = useCallback(async () => {
    setIsMarkingComplete(true);
    
    try {
      if (!navigator.onLine) {
        await addToSyncQueue({
          type: "update",
          table: "appointments",
          data: { id: appointment.id, status: "completed" },
        });
        toast.success("Wird synchronisiert, sobald du online bist");
        onStatusChange?.();
        return;
      }
      
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
  }, [appointment.id, onStatusChange]);

  const handleOpenChat = () => {
    if (appointment.client?.id && onOpenChat) {
      onOpenChat(appointment.client.id);
    }
  };

  // Handle swipe end
  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const xOffset = info.offset.x;
    
    if (xOffset > SWIPE_THRESHOLD && !isCompleted) {
      // Swipe right → Mark complete
      handleMarkComplete();
    } else if (xOffset < -SWIPE_THRESHOLD && hasCoordinates) {
      // Swipe left → Navigate
      handleNavigate();
    }
    
    setSwipeAction("none");
  }, [isCompleted, hasCoordinates, handleMarkComplete, handleNavigate]);

  const handleDrag = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD / 2 && !isCompleted) {
      setSwipeAction("complete");
    } else if (info.offset.x < -SWIPE_THRESHOLD / 2 && hasCoordinates) {
      setSwipeAction("navigate");
    } else {
      setSwipeAction("none");
    }
  }, [isCompleted, hasCoordinates]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative"
    >
      {/* Swipe backgrounds */}
      <motion.div
        className="absolute inset-0 rounded-xl bg-green-600 flex items-center justify-start pl-4"
        style={{ opacity: rightBgOpacity }}
      >
        <Check className="h-6 w-6 text-white" />
        <span className="text-white text-sm font-semibold ml-2">Fertig</span>
      </motion.div>
      <motion.div
        className="absolute inset-0 rounded-xl bg-blue-600 flex items-center justify-end pr-4"
        style={{ opacity: leftBgOpacity }}
      >
        <span className="text-white text-sm font-semibold mr-2">Navigation</span>
        <Navigation className="h-6 w-6 text-white" />
      </motion.div>

      {/* Main Card - swipeable */}
      <motion.div
        style={{ x }}
        drag={!isDragging ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.3}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
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
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
        
        <div className="relative p-3 space-y-2">
          {/* Header Row */}
          <div className="flex items-center gap-2">
            <button
              {...attributes}
              {...listeners}
              className={cn(
                "p-1.5 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center",
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
          <div className="pl-2">
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
          <div className="pl-2 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">
              {hasCoordinates ? (address || "GPS-Standort") : "Keine Adresse"}
            </span>
          </div>

          {/* Action Buttons - 48px min touch targets */}
          <div className="flex items-center gap-2 pl-2 pt-1">
            {isCompleted ? (
              <Button
                variant="secondary"
                size="sm"
                className="h-11 gap-1.5 flex-1 bg-green-600/10 text-green-600 hover:bg-green-600/20 min-h-[44px]"
                disabled
              >
                <CheckCircle2 className="h-4 w-4" />
                Abgeschlossen
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                className="h-11 gap-1.5 flex-1 min-h-[44px]"
                onClick={handleMarkComplete}
                disabled={isMarkingComplete}
              >
                {isMarkingComplete ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Fertig
              </Button>
            )}
            
             <Button
              variant="secondary"
              size="sm"
              className="h-11 gap-1.5 min-h-[44px] min-w-[44px]"
              onClick={handleNavigate}
              disabled={!hasCoordinates}
              title="Route anzeigen"
            >
              <MapPin className="h-4 w-4" />
            </Button>
            
            <Button
              variant="secondary"
              size="sm"
              className="h-11 w-11 p-0 min-h-[44px] min-w-[44px]"
              onClick={handleOpenChat}
              disabled={!appointment.client?.id}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
            
            {!isCompleted && (
              <OnMyWayButton
                appointment={appointment}
                userLocation={null}
                routeDurationMinutes={null}
              />
            )}
          </div>
          
          {/* Swipe hint - only shown on first use */}
          {!isCompleted && index === 0 && (
            <div className="text-center text-[10px] text-muted-foreground/50 pt-1">
              ← Navigation starten  |  Fertig melden →
            </div>
          )}
        </div>

        {/* Order Number Badge */}
        <div className={cn(
          "absolute -left-2 -top-2 w-7 h-7 rounded-full flex items-center justify-center",
          "text-xs font-bold text-primary-foreground shadow-lg min-h-[28px]",
          isCompleted ? "bg-green-600" : "bg-primary"
        )}>
          {isCompleted ? <Check className="h-3 w-3" /> : index + 1}
        </div>
      </motion.div>
    </div>
  );
}
