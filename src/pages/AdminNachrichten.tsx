import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Mail, ArrowLeft, Send, AlertTriangle, Info, FileText, Gift, ShieldAlert } from "lucide-react";
import {
  useAdminMessages,
  useAdminMessageDetail,
  useMarkMessageRead,
  useMessageAction,
  useSendReply,
  type AdminMessage,
} from "@/hooks/useAdminMessages";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const TYPE_ICONS: Record<string, typeof Mail> = {
  info: Info,
  offer: Gift,
  warning: AlertTriangle,
  request: FileText,
  document: FileText,
};

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "border-l-4 border-l-destructive",
  important: "border-l-4 border-l-orange-500",
  normal: "",
};

export default function AdminNachrichten() {
  const { data: messages = [], isLoading } = useAdminMessages();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (selectedId) {
    return <MessageDetail messageId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Mail className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Nachrichten</h1>
          <p className="text-sm text-muted-foreground">Nachrichten vom HufManager Team</p>
        </div>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Laden...</CardContent></Card>
      ) : messages.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Keine Nachrichten vorhanden.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {messages.map((msg) => (
            <MessageListItem key={msg.id} message={msg} onClick={() => setSelectedId(msg.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function MessageListItem({ message: msg, onClick }: { message: AdminMessage; onClick: () => void }) {
  const isUnread = !msg.read_at;
  const needsAction = msg.requires_action && !msg.action_taken;
  const Icon = TYPE_ICONS[msg.message_type] || Mail;

  return (
    <Card
      className={cn(
        "cursor-pointer hover:bg-accent/50 transition-colors",
        PRIORITY_STYLES[msg.priority],
        isUnread && "bg-accent/30"
      )}
      onClick={onClick}
    >
      <CardContent className="py-3 px-4 flex items-center gap-3">
        <Icon className={cn("h-5 w-5 shrink-0", isUnread ? "text-primary" : "text-muted-foreground")} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("text-sm truncate", isUnread ? "font-bold text-foreground" : "text-foreground/80")}>
              {msg.subject}
            </span>
            {msg.priority === "urgent" && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">WICHTIG</Badge>}
            {msg.priority === "important" && <Badge className="bg-orange-500 text-white text-[10px] px-1.5 py-0">Wichtig</Badge>}
            {needsAction && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Aktion nötig</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(msg.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
            {msg.action_taken && <span className="ml-2">• Aktion: {msg.action_taken}</span>}
          </p>
        </div>
        {isUnread && <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />}
      </CardContent>
    </Card>
  );
}

function MessageDetail({ messageId, onBack }: { messageId: string; onBack: () => void }) {
  const { message: msg, replies, isLoading } = useAdminMessageDetail(messageId);
  const markRead = useMarkMessageRead();
  const takeAction = useMessageAction();
  const sendReply = useSendReply();
  const [replyText, setReplyText] = useState("");

  // Mark as read on open
  useState(() => {
    if (msg && !msg.read_at) markRead.mutate(messageId);
  });

  // Also mark read when msg loads
  if (msg && !msg.read_at) {
    markRead.mutate(messageId);
  }

  const handleAction = (action: string) => {
    takeAction.mutate({ messageId, action });
  };

  const handleReply = () => {
    if (!replyText.trim()) return;
    sendReply.mutate({ messageId, body: replyText.trim() });
    setReplyText("");
  };

  if (isLoading || !msg) {
    return <div className="py-8 text-center text-muted-foreground">Laden...</div>;
  }

  const priorityHeader: Record<string, string> = {
    urgent: "bg-destructive text-destructive-foreground",
    important: "bg-orange-500 text-white",
    normal: "bg-primary text-primary-foreground",
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
        <ArrowLeft className="h-4 w-4" /> Zurück
      </Button>

      <Card className="overflow-hidden">
        <div className={cn("px-5 py-3", priorityHeader[msg.priority] || priorityHeader.normal)}>
          <h2 className="font-semibold">{msg.subject}</h2>
          <p className="text-xs opacity-80 mt-0.5">
            {format(new Date(msg.created_at), "dd. MMMM yyyy, HH:mm", { locale: de })} Uhr
          </p>
        </div>

        <CardContent className="py-4 space-y-4">
          <p className="text-sm text-foreground whitespace-pre-wrap">{msg.body}</p>

          {/* Actions */}
          {msg.requires_action && msg.action_options && !msg.action_taken && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
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
            <div className="pt-2 border-t border-border">
              <Badge variant="secondary">
                Aktion: {msg.action_taken}
                {msg.action_taken_at && (
                  <span className="ml-1 font-normal">
                    ({format(new Date(msg.action_taken_at), "dd.MM.yyyy HH:mm")})
                  </span>
                )}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Replies */}
      {replies.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Antworten ({replies.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {replies.map((r) => (
              <div key={r.id} className={cn(
                "p-3 rounded-lg text-sm",
                r.sender_type === "admin" ? "bg-primary/10" : "bg-muted"
              )}>
                <p className="whitespace-pre-wrap">{r.body}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {r.sender_type === "admin" ? "HufManager Team" : "Du"} •{" "}
                  {format(new Date(r.created_at), "dd.MM.yyyy HH:mm")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Reply input */}
      <Card>
        <CardContent className="py-3 space-y-2">
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Antwort schreiben..."
            rows={3}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleReply} disabled={!replyText.trim() || sendReply.isPending} className="gap-1.5">
              <Send className="h-3.5 w-3.5" /> Antworten
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
