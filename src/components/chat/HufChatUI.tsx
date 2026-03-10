import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Send, Paperclip, Mic, X, User, ArrowLeft, Reply,
  Copy, Trash2, Smile, FileText, Square, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ChatAttachment, getFileType, getFileEmoji } from "@/components/chat/ChatAttachment";
import type { ChatMessage, ChatReaction, ReplyTarget } from "@/hooks/useHufChat";

// ── Quick Emojis ───────────────────────────────
const QUICK_EMOJIS = ["❤️", "👍", "😂", "😮", "👏", "🙏"];

// ── Props ──────────────────────────────────────
interface HufChatUIProps {
  messages: ChatMessage[];
  reactions: ChatReaction[];
  isLoading: boolean;
  isSending: boolean;
  replyTo: ReplyTarget | null;
  typingUsers: string[];
  typingUserNames?: Record<string, string>;
  otherUserName?: string;
  otherUserAvatar?: string | null;
  onSendMessage: (content: string, options?: { file?: File; voiceBlob?: Blob; voiceDuration?: number }) => void;
  onDeleteMessage: (messageId: string, forAll: boolean) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  onSetReplyTo: (target: ReplyTarget | null) => void;
  onTyping: () => void;
  onBack?: () => void;
  showBackButton?: boolean;
}

export function HufChatUI({
  messages,
  reactions,
  isLoading,
  isSending,
  replyTo,
  typingUsers,
  typingUserNames = {},
  otherUserName,
  otherUserAvatar,
  onSendMessage,
  onDeleteMessage,
  onAddReaction,
  onSetReplyTo,
  onTyping,
  onBack,
  showBackButton = false,
}: HufChatUIProps) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [contextMenuMsg, setContextMenuMsg] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, []);

  // ── File handling ────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const allowed = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "video/mp4", "video/mov", "video/quicktime", "video/webm",
      "application/pdf",
    ];
    if (!allowed.includes(file.type)) {
      toast({ title: "Nicht unterstützt", description: "Erlaubt: Bilder, Videos, PDFs", variant: "destructive" });
      return;
    }
    const maxMB = file.type.startsWith("video/") ? 20 : 10;
    if (file.size > maxMB * 1024 * 1024) {
      toast({ title: "Zu groß", description: `Max ${maxMB}MB`, variant: "destructive" });
      return;
    }
    
    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      setFilePreview(URL.createObjectURL(file));
    } else {
      setFilePreview(null);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Voice recording ──────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        onSendMessage("🎙️ Sprachnachricht", { voiceBlob: blob, voiceDuration: recordingTime });
        setIsRecording(false);
        setRecordingTime(0);
      };

      recorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch {
      toast({ title: "Mikrofon-Zugriff verweigert", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  };

  const cancelRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingTime(0);
  };

  // ── Send ─────────────────────────────────────
  const handleSend = () => {
    if ((!text.trim() && !selectedFile) || isSending) return;
    onSendMessage(text.trim(), selectedFile ? { file: selectedFile } : undefined);
    setText("");
    clearFile();
  };

  // ── Helpers ──────────────────────────────────
  const getReactionsForMessage = (msgId: string) => {
    const msgReactions = reactions.filter(r => r.message_id === msgId);
    const grouped: Record<string, string[]> = {};
    msgReactions.forEach(r => {
      if (!grouped[r.emoji]) grouped[r.emoji] = [];
      grouped[r.emoji].push(r.user_id);
    });
    return grouped;
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // ── Read receipt icon ────────────────────────
  const ReadReceipt = ({ msg }: { msg: ChatMessage }) => {
    if (msg.sender_id !== user?.id) return null;
    if (msg.read_at) {
      return <span className="text-[#F5970A]">✓✓</span>;
    }
    if (msg.is_read) {
      return <span className="text-muted-foreground">✓✓</span>;
    }
    return <span className="text-muted-foreground">✓</span>;
  };

  // ── Date separator ───────────────────────────
  const getDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (d.toDateString() === today.toDateString()) return "Heute";
    if (d.toDateString() === yesterday.toDateString()) return "Gestern";
    return format(d, "dd. MMMM yyyy", { locale: de });
  };

  const shouldShowDate = (msg: ChatMessage, idx: number) => {
    if (idx === 0) return true;
    const prev = messages[idx - 1];
    return new Date(msg.created_at).toDateString() !== new Date(prev.created_at).toDateString();
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur-sm">
        {showBackButton && (
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <Avatar className="h-10 w-10">
          {otherUserAvatar && <AvatarImage src={otherUserAvatar} />}
          <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{otherUserName || "Chat"}</p>
          {typingUsers.length > 0 && (
            <p className="text-xs text-[#F5970A] animate-pulse">schreibt…</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4" ref={scrollRef}>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-sm">Starte die Unterhaltung!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg, idx) => {
              const isMine = msg.sender_id === user?.id;
              const isDeleted = msg.deleted_for_all;
              const msgReactions = getReactionsForMessage(msg.id);
              const showDate = shouldShowDate(msg, idx);

              return (
                <div key={msg.id}>
                  {/* Date separator */}
                  {showDate && (
                    <div className="flex justify-center my-4">
                      <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        {getDateLabel(msg.created_at)}
                      </span>
                    </div>
                  )}

                  {/* Message bubble */}
                  <div className={cn("flex mb-1", isMine ? "justify-end" : "justify-start")}>
                    <div className="max-w-[80%] sm:max-w-[70%] group relative">
                      {/* Context menu trigger (long press / right click) */}
                      {!isDeleted && (
                        <DropdownMenu
                          open={contextMenuMsg === msg.id}
                          onOpenChange={(open) => setContextMenuMsg(open ? msg.id : null)}
                        >
                          <DropdownMenuTrigger asChild>
                            <div
                              className={cn(
                                "rounded-2xl px-3.5 py-2 cursor-pointer select-none",
                                isMine
                                  ? "bg-primary text-primary-foreground rounded-br-md"
                                  : "bg-muted rounded-bl-md"
                              )}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setContextMenuMsg(msg.id);
                              }}
                            >
                              {/* Reply quote */}
                              {msg.reply_to_content && (
                                <div className={cn(
                                  "border-l-2 pl-2 mb-1.5 text-xs opacity-80",
                                  isMine ? "border-primary-foreground/40" : "border-primary/40"
                                )}>
                                  <p className="font-medium truncate">{msg.reply_to_content}</p>
                                </div>
                              )}

                              {/* Attachment */}
                              {msg.image_url && (
                                <ChatAttachment
                                  filePath={msg.image_url}
                                  fileType={getFileType(msg.image_url)}
                                  fileName={msg.image_url.split("/").pop()}
                                />
                              )}

                              {/* Voice message */}
                              {msg.voice_url && (
                                <VoicePlayer voiceUrl={msg.voice_url} duration={msg.voice_duration_seconds} />
                              )}

                              {/* Text content */}
                              {msg.content && !msg.content.match(/^(📷|🎥|📄|🎙️)\s/) && (
                                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                              )}

                              {/* Time + read receipt */}
                              <div className={cn(
                                "flex items-center gap-1 mt-0.5",
                                isMine ? "justify-end" : "justify-start"
                              )}>
                                <span className="text-[10px] opacity-60">
                                  {format(new Date(msg.created_at), "HH:mm")}
                                </span>
                                <span className="text-[10px]"><ReadReceipt msg={msg} /></span>
                              </div>
                            </div>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent side={isMine ? "left" : "right"} className="bg-popover min-w-[160px]">
                            <DropdownMenuItem onClick={() => {
                              onSetReplyTo({ id: msg.id, content: msg.content, senderName: isMine ? "Du" : (otherUserName || "") });
                              setContextMenuMsg(null);
                              inputRef.current?.focus();
                            }}>
                              <Reply className="h-4 w-4 mr-2" /> Antworten
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setContextMenuMsg(null);
                              // Show emoji picker inline
                              const emoji = QUICK_EMOJIS[Math.floor(Math.random() * QUICK_EMOJIS.length)];
                              onAddReaction(msg.id, emoji);
                            }}>
                              <Smile className="h-4 w-4 mr-2" /> Reagieren
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              navigator.clipboard.writeText(msg.content);
                              toast({ title: "Kopiert" });
                              setContextMenuMsg(null);
                            }}>
                              <Copy className="h-4 w-4 mr-2" /> Kopieren
                            </DropdownMenuItem>
                            {isMine && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  onDeleteMessage(msg.id, true);
                                  setContextMenuMsg(null);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Löschen
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}

                      {/* Deleted message */}
                      {isDeleted && (
                        <div className={cn(
                          "rounded-2xl px-3.5 py-2 italic text-muted-foreground text-sm",
                          isMine ? "bg-muted/50 rounded-br-md" : "bg-muted/30 rounded-bl-md"
                        )}>
                          🚫 Diese Nachricht wurde gelöscht.
                        </div>
                      )}

                      {/* Reactions */}
                      {Object.keys(msgReactions).length > 0 && (
                        <div className={cn("flex flex-wrap gap-1 mt-1", isMine ? "justify-end" : "justify-start")}>
                          {Object.entries(msgReactions).map(([emoji, users]) => (
                            <button
                              key={emoji}
                              onClick={() => onAddReaction(msg.id, emoji)}
                              className={cn(
                                "text-xs px-1.5 py-0.5 rounded-full border transition-colors",
                                users.includes(user?.id || "")
                                  ? "bg-primary/10 border-primary/30"
                                  : "bg-muted border-transparent hover:border-border"
                              )}
                            >
                              {emoji} {users.length}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Quick emoji on hover (desktop) */}
                      {!isDeleted && (
                        <div className={cn(
                          "absolute top-0 hidden group-hover:flex gap-0.5 bg-popover border rounded-lg shadow-md p-0.5",
                          isMine ? "right-full mr-1" : "left-full ml-1"
                        )}>
                          {QUICK_EMOJIS.map(emoji => (
                            <button
                              key={emoji}
                              className="h-7 w-7 flex items-center justify-center text-sm hover:bg-muted rounded transition-colors"
                              onClick={() => onAddReaction(msg.id, emoji)}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="flex justify-start mb-1">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reply bar */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 border-t bg-muted/30">
          <div className="flex-1 min-w-0 border-l-2 border-primary pl-2">
            <p className="text-xs font-medium text-primary truncate">Antwort auf {replyTo.senderName}</p>
            <p className="text-xs text-muted-foreground truncate">{replyTo.content}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onSetReplyTo(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* File preview */}
      {selectedFile && (
        <div className="px-4 py-2 border-t">
          <div className="relative inline-block">
            {filePreview ? (
              <img src={filePreview} alt="Vorschau" className="max-h-20 rounded-lg object-cover" />
            ) : (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
                <span className="text-xs font-medium truncate max-w-[200px]">{selectedFile.name}</span>
              </div>
            )}
            <Button
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-5 w-5"
              onClick={clearFile}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="px-3 py-2 border-t bg-background">
        {isRecording ? (
          <div className="flex items-center gap-3 h-12">
            <div className="flex-1 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm font-medium text-destructive">Aufnahme… {formatTime(recordingTime)}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={cancelRecording}>
              <X className="h-5 w-5" />
            </Button>
            <Button size="icon" className="bg-primary" onClick={stopRecording}>
              <Square className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-1.5"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending}
              type="button"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            
            <Input
              ref={inputRef}
              placeholder="Nachricht schreiben…"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                onTyping();
              }}
              className="flex-1 h-10 text-base"
              disabled={isSending}
            />

            {text.trim() || selectedFile ? (
              <Button
                type="submit"
                size="icon"
                className="h-10 w-10 shrink-0 bg-primary"
                disabled={isSending}
              >
                {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0"
                onPointerDown={startRecording}
              >
                <Mic className="h-5 w-5" />
              </Button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

// ── Voice Player sub-component ─────────────────
function VoicePlayer({ voiceUrl, duration }: { voiceUrl: string; duration: number | null }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fetchUrl = async () => {
      const { data } = await (await import("@/integrations/supabase/client")).supabase.storage
        .from("chat-images")
        .createSignedUrl(voiceUrl, 3600);
      if (data) setSignedUrl(data.signedUrl);
    };
    fetchUrl();
  }, [voiceUrl]);

  const toggle = () => {
    if (!audioRef.current || !signedUrl) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      audioRef.current.src = signedUrl;
      audioRef.current.play();
      setPlaying(true);
      intervalRef.current = setInterval(() => {
        if (audioRef.current) {
          setProgress(audioRef.current.currentTime / (audioRef.current.duration || 1));
        }
      }, 100);
      audioRef.current.onended = () => {
        setPlaying(false);
        setProgress(0);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <audio ref={audioRef} className="hidden" />
      <button onClick={toggle} className="h-8 w-8 flex items-center justify-center rounded-full bg-primary/20 text-primary shrink-0">
        {playing ? <Square className="h-3 w-3" /> : <span className="text-xs">▶</span>}
      </button>
      <div className="flex-1 h-1 bg-muted-foreground/20 rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground/70 w-8 text-right">{fmt(duration || 0)}</span>
    </div>
  );
}
