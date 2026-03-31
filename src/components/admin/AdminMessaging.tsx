import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Mail, Plus, Search, Send, Paperclip, ArrowLeft, FileText, Image as ImageIcon,
  Download, AlertTriangle, Info, Gift, ShieldAlert, Clock, Eye, X, Check,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import {
  useAdminAllMessages,
  useAdminMessageThread,
  useAdminSendMessage,
  useSendReply,
  useProfileSearch,
  uploadMessageAttachment,
  type AdminMessage,
} from "@/hooks/useAdminMessages";
import { supabase } from "@/integrations/supabase/client";

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "border-l-4 border-l-destructive",
  important: "border-l-4 border-l-orange-500",
  normal: "",
};

export default function AdminMessaging() {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const { data: messages = [], isLoading } = useAdminAllMessages(filter === "all" ? undefined : filter);

  // Enrich messages with recipient info
  const [recipientMap, setRecipientMap] = useState<Record<string, any>>({});

  useEffect(() => {
    const ids = [...new Set(messages.map(m => m.recipient_id))];
    if (ids.length === 0) return;
    supabase.from("profiles").select("id, full_name, email, readable_id").in("id", ids)
      .then(({ data }) => {
        const map: Record<string, any> = {};
        data?.forEach(p => { map[p.id] = p; });
        setRecipientMap(map);
      });
  }, [messages]);

  const filtered = messages.filter(m => {
    if (!search) return true;
    const r = recipientMap[m.recipient_id];
    const s = search.toLowerCase();
    return (
      m.subject.toLowerCase().includes(s) ||
      r?.full_name?.toLowerCase().includes(s) ||
      r?.email?.toLowerCase().includes(s) ||
      r?.readable_id?.toLowerCase().includes(s)
    );
  });

  if (selectedId) {
    return <AdminThread messageId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Nachrichten / Posteingang</h2>
          <Badge variant="secondary" className="text-xs">{messages.length}</Badge>
        </div>
        <Button size="sm" onClick={() => setComposeOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Neue Nachricht
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Tabs value={filter} onValueChange={setFilter} className="flex-1">
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-xs">Alle</TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">Ungelesen</TabsTrigger>
            <TabsTrigger value="waiting" className="text-xs">Wartet</TabsTrigger>
            <TabsTrigger value="offers" className="text-xs">Angebote</TabsTrigger>
            <TabsTrigger value="expired" className="text-xs">Abgelaufen</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Name / PID / E-Mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Laden...</div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Keine Nachrichten.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Empfänger</TableHead>
                  <TableHead>PID</TableHead>
                  <TableHead>Betreff</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((msg) => {
                  const r = recipientMap[msg.recipient_id];
                  const isUnread = !msg.read_at;
                  return (
                    <TableRow
                      key={msg.id}
                      className={cn("cursor-pointer hover:bg-accent/50", PRIORITY_STYLES[msg.priority])}
                      onClick={() => setSelectedId(msg.id)}
                    >
                      <TableCell>
                        {isUnread && <div className="h-2 w-2 rounded-full bg-primary mx-auto" />}
                      </TableCell>
                      <TableCell className={cn("text-sm", isUnread && "font-bold")}>
                        {r?.full_name || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {r?.readable_id || "—"}
                      </TableCell>
                      <TableCell className={cn("text-sm max-w-xs truncate", isUnread && "font-semibold")}>
                        {msg.subject}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(msg.created_at), "dd.MM.yy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <MessageStatusBadge msg={msg} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Compose Modal */}
      <ComposeModal open={composeOpen} onClose={() => setComposeOpen(false)} />
    </div>
  );
}

function MessageStatusBadge({ msg }: { msg: AdminMessage }) {
  if (msg.action_taken) {
    return <Badge variant={msg.action_taken === "Annehmen" ? "default" : "destructive"} className="text-[10px]">{msg.action_taken}</Badge>;
  }
  if (msg.requires_action && !msg.action_taken) {
    return <Badge variant="outline" className="text-[10px] border-orange-500 text-orange-600">Aktion offen</Badge>;
  }
  if (msg.read_at) {
    return <Badge variant="secondary" className="text-[10px]">Gelesen</Badge>;
  }
  return <Badge variant="outline" className="text-[10px]">Gesendet</Badge>;
}

// ─── Compose Modal ─────────────────────────────────────

function ComposeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [recipientSearch, setRecipientSearch] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("normal");
  const [messageType, setMessageType] = useState("info");
  const [requiresAction, setRequiresAction] = useState(false);
  const [actionButtons, setActionButtons] = useState(["Annehmen", "Ablehnen", "Später"]);
  const [customButton, setCustomButton] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: searchResults = [] } = useProfileSearch(recipientSearch);
  const sendMessage = useAdminSendMessage();

  const handleSend = async () => {
    if (!selectedRecipient || !subject.trim() || !body.trim()) {
      toast.error("Empfänger, Betreff und Nachricht sind Pflichtfelder.");
      return;
    }
    setSending(true);
    try {
      // Upload attachments
      let attachments: any[] = [];
      for (const file of files) {
        const result = await uploadMessageAttachment(file, selectedRecipient.id);
        if (result) attachments.push(result);
      }

      await sendMessage.mutateAsync({
        recipient_id: selectedRecipient.id,
        recipient_type: selectedRecipient.role || "provider",
        subject,
        body,
        message_type: messageType,
        priority,
        requires_action: requiresAction,
        action_options: requiresAction ? actionButtons : undefined,
        attachments: attachments.length ? attachments : undefined,
        expires_at: expiresAt || undefined,
      });
      toast.success("Nachricht gesendet!");
      onClose();
      // Reset
      setSelectedRecipient(null);
      setSubject("");
      setBody("");
      setFiles([]);
      setRequiresAction(false);
      setExpiresAt("");
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Senden");
    } finally {
      setSending(false);
    }
  };

  const addCustomButton = () => {
    if (customButton.trim() && !actionButtons.includes(customButton.trim())) {
      setActionButtons([...actionButtons, customButton.trim()]);
      setCustomButton("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> Neue Nachricht
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient */}
          <div>
            <Label className="text-xs">Empfänger</Label>
            {selectedRecipient ? (
              <div className="flex items-center gap-2 mt-1 p-2 rounded-md bg-muted">
                <span className="text-sm font-medium">{selectedRecipient.full_name}</span>
                <span className="text-xs text-muted-foreground">{selectedRecipient.readable_id}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => setSelectedRecipient(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  placeholder="Name, PID oder E-Mail..."
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  className="mt-1"
                />
                {searchResults.length > 0 && recipientSearch.length >= 2 && (
                  <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {searchResults.map((p: any) => (
                      <button
                        key={p.id}
                        className="w-full px-3 py-2 text-left hover:bg-accent text-sm flex items-center gap-2"
                        onClick={() => { setSelectedRecipient(p); setRecipientSearch(""); }}
                      >
                        <span className="font-medium">{p.full_name || p.email}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{p.readable_id}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Type + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Typ</Label>
              <Select value={messageType} onValueChange={setMessageType}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="offer">Angebot</SelectItem>
                  <SelectItem value="warning">Warnung</SelectItem>
                  <SelectItem value="request">Anfrage</SelectItem>
                  <SelectItem value="document">Dokument</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Priorität</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="important">Wichtig</SelectItem>
                  <SelectItem value="urgent">Dringend</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subject */}
          <div>
            <Label className="text-xs">Betreff</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" placeholder="Betreff..." />
          </div>

          {/* Body */}
          <div>
            <Label className="text-xs">Nachricht</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="mt-1 min-h-[120px]" placeholder="Nachricht schreiben..." />
          </div>

          {/* Requires Action */}
          <div className="flex items-center gap-3">
            <Switch checked={requiresAction} onCheckedChange={setRequiresAction} />
            <Label className="text-sm">Aktion erforderlich</Label>
          </div>
          {requiresAction && (
            <div className="space-y-2 pl-4 border-l-2 border-primary/20">
              <div className="flex flex-wrap gap-1.5">
                {actionButtons.map((b, i) => (
                  <Badge key={i} variant="outline" className="gap-1">
                    {b}
                    <button onClick={() => setActionButtons(actionButtons.filter((_, j) => j !== i))} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={customButton}
                  onChange={(e) => setCustomButton(e.target.value)}
                  placeholder="Custom Button..."
                  className="h-8 text-xs flex-1"
                  onKeyDown={(e) => e.key === "Enter" && addCustomButton()}
                />
                <Button variant="outline" size="sm" onClick={addCustomButton} className="h-8">+</Button>
              </div>
            </div>
          )}

          {/* Expires */}
          <div>
            <Label className="text-xs">Ablaufdatum (optional)</Label>
            <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="mt-1" />
          </div>

          {/* Attachments */}
          <div>
            <Label className="text-xs">Anhänge</Label>
            <input ref={fileRef} type="file" className="hidden" accept="image/*,application/pdf" multiple
              onChange={(e) => setFiles([...files, ...Array.from(e.target.files || [])])} />
            <div className="flex items-center gap-2 mt-1">
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5">
                <Paperclip className="h-3.5 w-3.5" /> Datei anhängen
              </Button>
              <span className="text-xs text-muted-foreground">Max. 10MB, Bilder & PDF</span>
            </div>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {files.map((f, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 text-xs">
                    {f.name.length > 20 ? f.name.slice(0, 20) + "..." : f.name}
                    <button onClick={() => setFiles(files.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button onClick={handleSend} disabled={sending || !selectedRecipient || !subject.trim()} className="gap-1.5">
            <Send className="h-4 w-4" /> {sending ? "Sende..." : "Senden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Admin Thread View ─────────────────────────────────

function AdminThread({ messageId, onBack }: { messageId: string; onBack: () => void }) {
  const { message: msg, replies, isLoading } = useAdminMessageThread(messageId);
  const sendReply = useSendReply();
  const [replyText, setReplyText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Recipient info
  const [recipient, setRecipient] = useState<any>(null);
  useEffect(() => {
    if (!msg?.recipient_id) return;
    supabase.from("profiles").select("id, full_name, email, readable_id").eq("id", msg.recipient_id).single()
      .then(({ data }) => setRecipient(data));
  }, [msg?.recipient_id]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [replies.length]);

  const handleSend = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      let attachments: any[] = [];
      for (const file of files) {
        const result = await uploadMessageAttachment(file, msg!.recipient_id, messageId);
        if (result) attachments.push(result);
      }
      await sendReply.mutateAsync({ messageId, body: replyText.trim(), senderType: "admin", attachments });
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
    <div className="space-y-3">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
        <ArrowLeft className="h-4 w-4" /> Zurück
      </Button>

      {/* Header */}
      <Card className="overflow-hidden">
        <div className={cn("px-4 py-3 flex items-center justify-between", priorityColor[msg.priority] || priorityColor.normal)}>
          <div>
            <h3 className="font-semibold text-sm">{msg.subject}</h3>
            <p className="text-xs opacity-80">
              An: {recipient?.full_name || "..."} ({recipient?.readable_id}) • {format(new Date(msg.created_at), "dd.MM.yyyy HH:mm")}
            </p>
          </div>
          <MessageStatusBadge msg={msg} />
        </div>

        {/* Status info */}
        <div className="px-4 py-2 bg-muted/30 text-xs text-muted-foreground flex flex-wrap gap-3">
          {msg.read_at && (
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> Gelesen: {format(new Date(msg.read_at), "dd.MM.yy HH:mm")}</span>
          )}
          {msg.action_taken && (
            <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Aktion: {msg.action_taken} ({format(new Date(msg.action_taken_at!), "dd.MM.yy HH:mm")})</span>
          )}
          {msg.requires_action && !msg.action_taken && (
            <span className="flex items-center gap-1 text-orange-600"><Clock className="h-3 w-3" /> Wartet auf Aktion</span>
          )}
        </div>
      </Card>

      {/* Chat Thread */}
      <Card>
        <div className="h-[400px] overflow-y-auto" ref={scrollRef}>
          <div className="p-4 space-y-3">
            {/* Original message */}
            <ChatBubble
              body={msg.body}
              time={msg.created_at}
              isAdmin
              attachments={msg.attachments}
            />

            {/* Replies */}
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
        </div>

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
    </div>
  );
}

// ─── Chat Bubble ─────────────────────────────────────

function ChatBubble({ body, time, isAdmin, attachments }: { body: string; time: string; isAdmin: boolean; attachments?: any }) {
  return (
    <div className={cn("flex", isAdmin ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm",
        isAdmin ? "bg-orange-500/15 text-foreground" : "bg-muted text-foreground"
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
        <p className="text-[10px] text-muted-foreground mt-1 text-right">
          {isAdmin ? "Admin" : "Nutzer"} • {format(new Date(time), "dd.MM. HH:mm")}
        </p>
      </div>
    </div>
  );
}
