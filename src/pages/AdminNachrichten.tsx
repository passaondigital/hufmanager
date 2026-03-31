import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  Mail, ArrowLeft, Send, Paperclip, FileText, Image as ImageIcon,
  AlertTriangle, X, Check,
} from "lucide-react";
import {
  useAdminMessages,
  useAdminMessageDetail,
  useMarkMessageRead,
  useMessageAction,
  useSendReply,
  uploadMessageAttachment,
  type AdminMessage,
} from "@/hooks/useAdminMessages";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "border-l-4 border-l-destructive",
  important: "border-l-4 border-l-orange-500",
  normal: "",
};

export default function AdminNachrichten() {
  const { data: messages = [], isLoading } = useAdminMessages();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (selectedId) {
    return <UserThread messageId={selectedId} onBack={() => setSelectedId(null)} />;
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
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <Mail className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <p className="text-muted-foreground">Keine Nachrichten vorhanden.</p>
          </CardContent>
        </Card>
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
        <Mail className={cn("h-5 w-5 shrink-0", isUnread ? "text-primary" : "text-muted-foreground")} />
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
            {msg.action_taken && <span className="ml-2">• {msg.action_taken}</span>}
          </p>
        </div>
        {isUnread && <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />}
      </CardContent>
    </Card>
  );
}

// ─── User Chat Thread ─────────────────────────────────

function UserThread({ messageId, onBack }: { messageId: string; onBack: () => void }) {
  const { user } = useAuth();
  const { message: msg, replies, isLoading } = useAdminMessageDetail(messageId);
  const markRead = useMarkMessageRead();
  const takeAction = useMessageAction();
  const sendReply = useSendReply();
  const [replyText, setReplyText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mark as read
  useEffect(() => {
    if (msg && !msg.read_at) markRead.mutate(messageId);
  }, [msg?.id, msg?.read_at]);

  // Real-time for replies
  useEffect(() => {
    if (!messageId) return;
    const channel = supabase
      .channel(`user-thread-${messageId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_message_replies", filter: `message_id=eq.${messageId}` }, () => {
        // Will be handled by query invalidation
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [messageId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [replies.length]);

  const handleAction = (action: string) => {
    setConfirmAction(action);
  };

  const confirmActionHandler = () => {
    if (confirmAction) {
      takeAction.mutate({ messageId, action: confirmAction });
      setConfirmAction(null);
    }
  };

  const handleSend = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      let attachments: any[] = [];
      for (const file of files) {
        const result = await uploadMessageAttachment(file, user!.id, messageId);
        if (result) attachments.push(result);
      }
      await sendReply.mutateAsync({ messageId, body: replyText.trim(), senderType: "user", attachments });
      setReplyText("");
      setFiles([]);
    } catch {
      toast.error("Fehler beim Senden");
    } finally {
      setSending(false);
    }
  };

  if (isLoading || !msg) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Laden...</div>;
  }

  const priorityColor: Record<string, string> = {
    urgent: "bg-destructive text-destructive-foreground",
    important: "bg-orange-500 text-white",
    normal: "bg-primary text-primary-foreground",
  };

  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
        <ArrowLeft className="h-4 w-4" /> Zurück
      </Button>

      {/* Header */}
      <Card className="overflow-hidden">
        <div className={cn("px-4 py-3", priorityColor[msg.priority] || priorityColor.normal)}>
          <h3 className="font-semibold">{msg.subject}</h3>
          <p className="text-xs opacity-80 mt-0.5">
            HufManager Team • {format(new Date(msg.created_at), "dd. MMMM yyyy, HH:mm", { locale: de })} Uhr
          </p>
        </div>

        {/* Online indicator */}
        <div className="px-4 py-1.5 bg-muted/30 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          HufManager Team verfügbar
        </div>
      </Card>

      {/* Action Buttons (prominent if required) */}
      {msg.requires_action && msg.action_options && !msg.action_taken && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardContent className="py-3 px-4">
            <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-orange-500" /> Aktion erforderlich
            </p>
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
          </CardContent>
        </Card>
      )}

      {msg.action_taken && (
        <div className="flex items-center gap-2 px-1">
          <Badge variant="secondary" className="text-xs">
            <Check className="h-3 w-3 mr-1" />
            {msg.action_taken}
            {msg.action_taken_at && ` — ${format(new Date(msg.action_taken_at), "dd.MM.yy HH:mm")}`}
          </Badge>
        </div>
      )}

      {/* Chat Thread */}
      <Card>
        <ScrollArea className="h-[350px]" ref={scrollRef}>
          <div className="p-4 space-y-3">
            {/* Original message — admin is left side for user view */}
            <ChatBubble body={msg.body} time={msg.created_at} isAdmin attachments={msg.attachments} />

            {replies.map((r) => (
              <ChatBubble
                key={r.id}
                body={r.body}
                time={r.created_at}
                isAdmin={r.sender_type === "admin"}
                attachments={r.attachments}
              />
            ))}
          </div>
        </ScrollArea>

        {/* Reply input */}
        <div className="border-t border-border p-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Antwort schreiben..."
                rows={2}
                className="text-sm"
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend(); }}
              />
              {files.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {files.map((f, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] gap-1">
                      {f.name.slice(0, 15)}{f.name.length > 15 && "..."}
                      <button onClick={() => setFiles(files.filter((_, j) => j !== i))}><X className="h-2.5 w-2.5" /></button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <input ref={fileRef} type="file" className="hidden" accept="image/*,application/pdf" multiple
                onChange={(e) => setFiles([...files, ...Array.from(e.target.files || [])])} />
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => fileRef.current?.click()}>
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button size="icon" className="h-9 w-9" onClick={handleSend} disabled={!replyText.trim() || sending}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(v) => !v && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aktion bestätigen</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du wirklich „{confirmAction}" wählen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmActionHandler}>Bestätigen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Chat Bubble ─────────────────────────────────

function ChatBubble({ body, time, isAdmin, attachments }: { body: string; time: string; isAdmin: boolean; attachments?: any }) {
  return (
    <div className={cn("flex", isAdmin ? "justify-start" : "justify-end")}>
      <div className={cn(
        "max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm",
        isAdmin ? "bg-orange-500/15 text-foreground rounded-tl-sm" : "bg-primary/10 text-foreground rounded-tr-sm"
      )}>
        <p className="whitespace-pre-wrap">{body}</p>
        {attachments && Array.isArray(attachments) && attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {attachments.map((att: any, i: number) => (
              <a
                key={i}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 rounded bg-background/50 hover:bg-background text-xs"
              >
                {att.type?.startsWith("image/") ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                {att.name?.slice(0, 20) || "Datei"}
              </a>
            ))}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">
          {isAdmin ? "HufManager Team" : "Du"} • {format(new Date(time), "dd.MM. HH:mm")}
        </p>
      </div>
    </div>
  );
}
