import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { AlertTriangle, Info, Mail, ArrowRight } from "lucide-react";
import { usePendingAdminMessages, useMarkMessageRead, useMessageAction, type AdminMessage } from "@/hooks/useAdminMessages";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export function AdminMessagePopup() {
  const { data: pending = [], isLoading } = usePendingAdminMessages();
  const markRead = useMarkMessageRead();
  const takeAction = useMessageAction();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Filter messages that haven't been dismissed in this session
  const actionable = pending.filter(m => !dismissedIds.has(m.id));

  useEffect(() => {
    if (actionable.length > 0 && !isLoading) {
      setOpen(true);
      setCurrentIndex(0);
    }
  }, [actionable.length, isLoading]);

  if (isLoading || actionable.length === 0) return null;

  const msg = actionable[Math.min(currentIndex, actionable.length - 1)];
  if (!msg) return null;

  const canDismiss = !(msg.requires_action && !msg.action_taken);

  const handleClose = () => {
    if (canDismiss) {
      // Mark as read if not yet
      if (!msg.read_at) markRead.mutate(msg.id);
      setDismissedIds(prev => new Set(prev).add(msg.id));
      if (currentIndex < actionable.length - 1) {
        setCurrentIndex(i => i + 1);
      } else {
        setOpen(false);
      }
    }
  };

  const handleAction = (action: string) => {
    takeAction.mutate({ messageId: msg.id, action });
    if (action === "Später") {
      setDismissedIds(prev => new Set(prev).add(msg.id));
      if (currentIndex < actionable.length - 1) {
        setCurrentIndex(i => i + 1);
      } else {
        setOpen(false);
      }
    }
  };

  const handleGoToMessages = () => {
    if (!msg.read_at) markRead.mutate(msg.id);
    setOpen(false);
    navigate("/admin-nachrichten");
  };

  const priorityConfig = {
    urgent: { color: "bg-destructive text-destructive-foreground", badge: "WICHTIG!!!", icon: AlertTriangle },
    important: { color: "bg-orange-500 text-white", badge: "Wichtig", icon: AlertTriangle },
    normal: { color: "bg-primary text-primary-foreground", badge: null, icon: Info },
  };

  const config = priorityConfig[msg.priority as keyof typeof priorityConfig] || priorityConfig.normal;
  const Icon = config.icon;

  const bodyPreview = msg.body.split("\n").slice(0, 3).join("\n");
  const hasMore = msg.body.split("\n").length > 3 || msg.body.length > 200;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden" onPointerDownOutside={(e) => { if (!canDismiss) e.preventDefault(); }}>
        {/* Header */}
        <div className={cn("px-5 py-4 flex items-center gap-3", config.color)}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Mail className="h-5 w-5 shrink-0" />
            <DialogTitle className="text-base font-semibold truncate">
              📬 Nachricht vom Hufi Team
            </DialogTitle>
          </div>
          {config.badge && (
            <Badge variant="outline" className="border-white/50 text-inherit text-xs shrink-0">
              {config.badge}
            </Badge>
          )}
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Subject */}
          <div>
            <h3 className="font-semibold text-foreground">{msg.subject}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(msg.created_at), "dd. MMM yyyy, HH:mm", { locale: de })} Uhr
            </p>
          </div>

          {/* Body Preview */}
          <ScrollArea className="max-h-40">
            <p className="text-sm text-foreground/90 whitespace-pre-wrap">
              {bodyPreview.slice(0, 200)}
              {hasMore && (
                <button onClick={handleGoToMessages} className="text-primary font-medium ml-1 hover:underline">
                  Mehr lesen...
                </button>
              )}
            </p>
          </ScrollArea>

          {/* Action buttons */}
          {msg.requires_action && msg.action_options && !msg.action_taken && (
            <div className="flex flex-wrap gap-2">
              {(msg.action_options as string[]).map((opt) => (
                <Button
                  key={opt}
                  variant={opt === "Annehmen" ? "default" : opt === "Ablehnen" ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => handleAction(opt)}
                  disabled={takeAction.isPending}
                >
                  {opt}
                </Button>
              ))}
            </div>
          )}

          {msg.action_taken && (
            <Badge variant="secondary" className="text-xs">
              Aktion: {msg.action_taken}
            </Badge>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <Button variant="ghost" size="sm" onClick={handleGoToMessages} className="text-xs gap-1.5">
              Zur vollständigen Nachricht
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            {actionable.length > 1 && (
              <span className="text-xs text-muted-foreground">
                {Math.min(currentIndex + 1, actionable.length)} / {actionable.length}
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
